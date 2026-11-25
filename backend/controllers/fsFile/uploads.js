const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');
const env = require('../../config/env.js');
const {
    getFilesCollection,
    buildFileOwnerFilter,
    streamFileToGridFS,
    safeUnlink,
} = require('../../utils/gridfsHelpers.js');
const { logAudit } = require('../../utils/auditLogger.js');

const checkUserQuota = async (user, incomingBytes) => {
    const quota = user?.storageQuotaBytes || env.storageQuotaBytes;
    const filesCol = getFilesCollection();
    const [usage] = await filesCol
        .aggregate([
            { $match: buildFileOwnerFilter(user) },
            { $group: { _id: null, totalBytes: { $sum: '$length' } } },
        ])
        .toArray();
    const usedBytes = usage?.totalBytes || 0;
    return {
        allowed: usedBytes + incomingBytes <= quota,
        usedBytes,
        quota,
    };
};

const parseTags = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            return raw.split(',').map((s) => s.trim()).filter(Boolean);
        }
    }
    return [];
};

// 1. UPLOAD SINGLE FILE TO GRIDFS (Zero-RAM disk stream)
const uploadFile = async (req, res, next) => {
    if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'No file uploaded.' });
    }

    try {
        const quotaCheck = await checkUserQuota(req.user, req.file.size);
        if (!quotaCheck.allowed) {
            await safeUnlink(req.file.path);
            return res.status(StatusCodes.INSUFFICIENT_STORAGE || 507).json({
                msg: 'Storage quota exceeded. Please delete unused files or empty Trash.',
            });
        }

        const result = await streamFileToGridFS(req.file, {
            description: req.body.description || req.body.FSfileDescription || '',
            tags: parseTags(req.body.tags),
            folderId: req.body.folderId || null,
            ownerId: req.user?.id || null,
        });

        await logAudit({
            action: 'UPLOAD',
            targetType: 'file',
            targetId: result.fileId,
            targetName: result.filename,
            details: {
                size: result.size,
                category: result.category,
                sha256: result.sha256,
                duplicateOf: result.duplicateOf,
            },
            req,
        });

        return res.status(StatusCodes.CREATED).json({
            msg: 'File uploaded successfully to GridFS.',
            ...result,
        });
    } catch (err) {
        await safeUnlink(req.file?.path);
        return next(err);
    }
};

// 2. UPLOAD MULTIPLE FILES TO GRIDFS (Sequential/Controlled streaming for 512MB RAM safety)
const uploadMultipleFiles = async (req, res, next) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'No files uploaded.' });
    }

    try {
        const totalIncoming = req.files.reduce((sum, f) => sum + (f.size || 0), 0);
        const quotaCheck = await checkUserQuota(req.user, totalIncoming);
        if (!quotaCheck.allowed) {
            await Promise.all(req.files.map((f) => safeUnlink(f.path)));
            return res.status(507).json({
                msg: 'Storage quota exceeded. Please free up space before uploading.',
            });
        }

        const uploadedFiles = [];
        const failedFiles = [];

        for (const file of req.files) {
            try {
                const uploaded = await streamFileToGridFS(file, {
                    description: req.body.description || req.body.FSfileDescription || '',
                    tags: parseTags(req.body.tags),
                    folderId: req.body.folderId || null,
                    ownerId: req.user?.id || null,
                });
                uploadedFiles.push(uploaded);
                await logAudit({
                    action: 'UPLOAD',
                    targetType: 'file',
                    targetId: uploaded.fileId,
                    targetName: uploaded.filename,
                    details: { size: uploaded.size, category: uploaded.category, sha256: uploaded.sha256 },
                    req,
                });
            } catch (fileErr) {
                await safeUnlink(file.path);
                failedFiles.push({ filename: file.originalname, error: fileErr.message });
            }
        }

        if (uploadedFiles.length === 0) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                msg: failedFiles[0]?.error || 'Failed to upload files.',
                failedFiles,
            });
        }

        return res.status(StatusCodes.CREATED).json({
            msg: `${uploadedFiles.length} file${uploadedFiles.length === 1 ? '' : 's'} uploaded successfully to GridFS.`,
            files: uploadedFiles,
            failedFiles,
        });
    } catch (err) {
        await Promise.all((req.files || []).map((f) => safeUnlink(f.path)));
        return next(err);
    }
};

// 3. UPLOAD NEW VERSION FOR AN EXISTING FILE (v2, v3, ...)
const uploadNewVersion = async (req, res, next) => {
    if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'No file provided for new version.' });
    }

    try {
        const { id } = req.params;
        const _id = mongoose.Types.ObjectId.createFromHexString(id);
        const filesCol = getFilesCollection();

        const currentFile = await filesCol.findOne({
            _id,
            ...buildFileOwnerFilter(req.user),
            'metadata.markAsTrash': false,
        });

        if (!currentFile) {
            await safeUnlink(req.file.path);
            return res.status(StatusCodes.NOT_FOUND).json({ msg: 'Target file not found.' });
        }

        const quotaCheck = await checkUserQuota(req.user, req.file.size);
        if (!quotaCheck.allowed) {
            await safeUnlink(req.file.path);
            return res.status(507).json({ msg: 'Storage quota exceeded.' });
        }

        const versionGroupId = currentFile.metadata?.versionGroupId || currentFile._id;
        const latestInGroup = await filesCol
            .find({
                $or: [{ 'metadata.versionGroupId': versionGroupId }, { _id: versionGroupId }],
            })
            .sort({ 'metadata.version': -1 })
            .limit(1)
            .toArray();

        const nextVersion = (latestInGroup[0]?.metadata?.version || currentFile.metadata?.version || 1) + 1;

        // Mark all previous versions in the group as non-latest
        await filesCol.updateMany(
            { $or: [{ 'metadata.versionGroupId': versionGroupId }, { _id: currentFile._id }] },
            {
                $set: {
                    'metadata.versionGroupId': versionGroupId,
                    'metadata.isLatestVersion': false,
                },
            }
        );

        const result = await streamFileToGridFS(req.file, {
            filenameOverride: req.body.keepName === 'false' ? req.file.originalname : currentFile.filename,
            initialOriginalName: currentFile.metadata?.initialOriginalName || currentFile.filename,
            description: req.body.description ?? currentFile.metadata?.description ?? '',
            tags: currentFile.metadata?.tags || [],
            starred: Boolean(currentFile.metadata?.starred),
            folderId: currentFile.metadata?.folderId ? currentFile.metadata.folderId.toString() : null,
            ownerId: req.user?.id || (currentFile.metadata?.ownerId ? currentFile.metadata.ownerId.toString() : null),
            version: nextVersion,
            versionGroupId: versionGroupId.toString(),
            skipDuplicateCheck: true,
        });

        await logAudit({
            action: 'VERSION_UPLOAD',
            targetType: 'file',
            targetId: result.fileId,
            targetName: result.filename,
            details: { version: nextVersion, previousFileId: id, size: result.size },
            req,
        });

        return res.status(StatusCodes.CREATED).json({
            msg: `Uploaded version v${nextVersion} of "${result.filename}".`,
            version: nextVersion,
            ...result,
        });
    } catch (err) {
        await safeUnlink(req.file?.path);
        return next(err);
    }
};

module.exports = {
    uploadFile,
    uploadMultipleFiles,
    uploadNewVersion,
};
