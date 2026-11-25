const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');
const { getGridBucket } = require('../../db/connect.js');
const { getMetadataFromFilename, isValidFilename } = require('../../utils/fileHelpers.js');
const {
    getFilesCollection,
    buildFileOwnerFilter,
    normalizeFileDoc,
} = require('../../utils/gridfsHelpers.js');
const Folder = require('../../models/Folder.js');
const ShareLink = require('../../models/ShareLink.js');
const { logAudit } = require('../../utils/auditLogger.js');

const extractValidObjectIds = (req) => {
    const rawIds = Array.isArray(req.body?.ids)
        ? req.body.ids
        : typeof req.params?.ids === 'string'
        ? req.params.ids.split(',').filter(Boolean)
        : [];
    const cleaned = rawIds.map((id) => String(id).trim()).filter(Boolean);
    if (cleaned.length === 0 || cleaned.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
        return null;
    }
    return cleaned.map((id) => mongoose.Types.ObjectId.createFromHexString(id));
};

// 1. RENAME FILE BY ID (Preserves initialOriginalName & keeps audio category consistent!)
const renameFile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { filename } = req.body || {};

        if (!isValidFilename(filename)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                msg: 'New filename is required, max 255 chars, and cannot contain special characters.',
            });
        }

        const trimmedName = filename.trim();
        const _id = mongoose.Types.ObjectId.createFromHexString(id);
        const filesCol = getFilesCollection();
        const existing = await filesCol.findOne({ _id, ...buildFileOwnerFilter(req.user) });

        if (!existing) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: 'File not found.' });
        }

        const bucket = getGridBucket();
        await bucket.rename(_id, trimmedName);

        const { extension, contentType, category, previewable } = getMetadataFromFilename(
            trimmedName,
            existing.metadata?.contentType || 'application/octet-stream'
        );

        const initialOriginalName =
            existing.metadata?.initialOriginalName || existing.metadata?.originalName || existing.filename;

        await filesCol.updateOne(
            { _id },
            {
                $set: {
                    'metadata.originalName': trimmedName,
                    'metadata.initialOriginalName': initialOriginalName,
                    'metadata.extension': extension,
                    'metadata.contentType': contentType,
                    'metadata.category': category,
                    'metadata.previewable': previewable,
                },
            }
        );

        const updated = await filesCol.findOne({ _id });

        await logAudit({
            action: 'RENAME',
            targetType: 'file',
            targetId: _id,
            targetName: trimmedName,
            details: { previousName: existing.filename, newName: trimmedName },
            req,
        });

        return res.status(StatusCodes.OK).json({
            msg: 'File renamed successfully.',
            newFilename: trimmedName,
            file: normalizeFileDoc(updated),
            metadata: {
                originalName: trimmedName,
                initialOriginalName,
                extension,
                contentType,
                category,
                previewable,
            },
        });
    } catch (err) {
        return next(err);
    }
};

// 2. UPDATE FILE DETAILS (Description, Tags, Starred, Folder Move)
const updateFileDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const _id = mongoose.Types.ObjectId.createFromHexString(id);
        const filesCol = getFilesCollection();

        const existing = await filesCol.findOne({ _id, ...buildFileOwnerFilter(req.user) });
        if (!existing) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: 'File not found.' });
        }

        const updates = {};
        const { description, tags, starred, folderId } = req.body || {};

        if (typeof description === 'string') {
            updates['metadata.description'] = description.trim().slice(0, 1000);
        }
        if (Array.isArray(tags)) {
            updates['metadata.tags'] = [...new Set(tags.map((t) => String(t).trim()).filter(Boolean))].slice(0, 10);
        }
        if (typeof starred === 'boolean') {
            updates['metadata.starred'] = starred;
        }
        if (folderId !== undefined) {
            if (folderId === null || folderId === '' || folderId === 'root') {
                updates['metadata.folderId'] = null;
            } else if (mongoose.Types.ObjectId.isValid(folderId)) {
                const targetFolder = await Folder.findOne({ _id: folderId, isTrash: false });
                if (!targetFolder) {
                    return res.status(StatusCodes.NOT_FOUND).json({ msg: 'Target folder not found.' });
                }
                updates['metadata.folderId'] = targetFolder._id;
            } else {
                return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Invalid folderId.' });
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'No valid update fields provided.' });
        }

        await filesCol.updateOne({ _id }, { $set: updates });
        const updated = await filesCol.findOne({ _id });

        await logAudit({
            action: typeof starred === 'boolean' && Object.keys(updates).length === 1 ? 'STAR' : 'UPDATE_DETAILS',
            targetType: 'file',
            targetId: _id,
            targetName: existing.filename,
            details: updates,
            req,
        });

        return res.status(StatusCodes.OK).json({
            msg: 'File updated successfully.',
            file: normalizeFileDoc(updated),
        });
    } catch (err) {
        return next(err);
    }
};

// 3. BULK MOVE FILES TO FOLDER
const moveFiles = async (req, res, next) => {
    try {
        const { ids, folderId = null } = req.body || {};
        if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Valid array of file IDs is required.' });
        }

        let targetFolderObjId = null;
        let targetFolderName = 'My Drive (Root)';
        if (folderId && folderId !== 'root') {
            if (!mongoose.Types.ObjectId.isValid(folderId)) {
                return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Invalid target folderId.' });
            }
            const folder = await Folder.findOne({ _id: folderId, isTrash: false });
            if (!folder) {
                return res.status(StatusCodes.NOT_FOUND).json({ msg: 'Destination folder not found.' });
            }
            targetFolderObjId = folder._id;
            targetFolderName = folder.name;
        }

        const objectIds = ids.map((id) => mongoose.Types.ObjectId.createFromHexString(id));
        const filesCol = getFilesCollection();
        const result = await filesCol.updateMany(
            {
                _id: { $in: objectIds },
                ...buildFileOwnerFilter(req.user),
                'metadata.markAsTrash': false,
            },
            { $set: { 'metadata.folderId': targetFolderObjId } }
        );

        await logAudit({
            action: 'MOVE',
            targetType: 'file',
            targetName: `${result.modifiedCount} file(s) -> ${targetFolderName}`,
            details: { fileIds: ids, folderId: targetFolderObjId ? targetFolderObjId.toString() : null },
            req,
        });

        return res.status(StatusCodes.OK).json({
            msg: `Moved ${result.modifiedCount} file${result.modifiedCount === 1 ? '' : 's'} to "${targetFolderName}".`,
            movedCount: result.modifiedCount,
        });
    } catch (err) {
        return next(err);
    }
};

// 4. MARK FILES AS TRASH (Supports BOTH req.body.ids AND req.params.ids!)
const markFilesAsTrash = async (req, res, next) => {
    try {
        const _ids = extractValidObjectIds(req);
        if (!_ids) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Valid file IDs are required.' });
        }

        const filesCol = getFilesCollection();
        const result = await filesCol.updateMany(
            { _id: { $in: _ids }, ...buildFileOwnerFilter(req.user) },
            {
                $set: {
                    'metadata.markAsTrash': true,
                    'metadata.markAsTrashDate': new Date(),
                },
            }
        );

        await logAudit({
            action: 'TRASH',
            targetType: 'file',
            targetName: `${result.modifiedCount} file(s)`,
            details: { ids: _ids.map((id) => id.toString()) },
            req,
        });

        return res.status(StatusCodes.OK).json({
            msg: `${result.modifiedCount} file${result.modifiedCount === 1 ? '' : 's'} moved to Trash.`,
            trashedCount: result.modifiedCount,
            ids: _ids.map((id) => id.toString()),
        });
    } catch (err) {
        return next(err);
    }
};

// 5. RESTORE FILES FROM TRASH BY ID(S)
const restoreFiles = async (req, res, next) => {
    try {
        const _ids = extractValidObjectIds(req);
        if (!_ids) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Invalid file ID.' });
        }

        const filesCol = getFilesCollection();
        const result = await filesCol.updateMany(
            {
                _id: { $in: _ids },
                ...buildFileOwnerFilter(req.user),
                'metadata.markAsTrash': true,
            },
            {
                $set: {
                    'metadata.markAsTrash': false,
                    'metadata.markAsTrashDate': null,
                },
            }
        );

        if (result.matchedCount === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: 'No trashed files found.' });
        }

        await logAudit({
            action: 'RESTORE',
            targetType: 'file',
            targetName: `${result.modifiedCount} file(s)`,
            details: { ids: _ids.map((id) => id.toString()) },
            req,
        });

        return res.status(StatusCodes.OK).json({
            msg: `${result.modifiedCount} file${result.modifiedCount === 1 ? '' : 's'} restored successfully.`,
            restoredCount: result.modifiedCount,
        });
    } catch (err) {
        return next(err);
    }
};

// 6. PERMANENTLY DELETE ONE TRASHED FILE (Removes both fs.files + fs.chunks + shares)
const deleteFile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const _id = mongoose.Types.ObjectId.createFromHexString(id);
        const filesCol = getFilesCollection();
        const file = await filesCol.findOne({ _id, ...buildFileOwnerFilter(req.user) });

        if (!file) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: 'File not found.' });
        }
        if (file.metadata?.markAsTrash !== true) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Only trashed files can be permanently deleted.' });
        }

        const bucket = getGridBucket();
        await bucket.delete(_id);
        await ShareLink.deleteMany({ fileId: _id });

        await logAudit({
            action: 'DELETE',
            targetType: 'file',
            targetId: _id,
            targetName: file.filename,
            details: { freedBytes: file.length },
            req,
        });

        return res.status(StatusCodes.OK).json({ msg: `"${file.filename}" permanently deleted.` });
    } catch (err) {
        return next(err);
    }
};

// 7. PERMANENTLY DELETE MULTIPLE TRASHED FILES
const deleteFiles = async (req, res, next) => {
    try {
        const _ids = extractValidObjectIds(req);
        if (!_ids) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Invalid file ID.' });
        }

        const filesCol = getFilesCollection();
        const files = await filesCol
            .find({
                _id: { $in: _ids },
                ...buildFileOwnerFilter(req.user),
                'metadata.markAsTrash': true,
            })
            .toArray();

        if (files.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: 'No trashed files found.' });
        }

        const bucket = getGridBucket();
        let freedBytes = 0;
        for (const file of files) {
            await bucket.delete(file._id);
            freedBytes += file.length || 0;
        }
        await ShareLink.deleteMany({ fileId: { $in: files.map((f) => f._id) } });

        await logAudit({
            action: 'DELETE',
            targetType: 'file',
            targetName: `${files.length} file(s)`,
            details: { deletedCount: files.length, freedBytes },
            req,
        });

        return res.status(StatusCodes.OK).json({
            msg: `${files.length} file${files.length === 1 ? '' : 's'} permanently deleted.`,
            deletedCount: files.length,
            freedBytes,
        });
    } catch (err) {
        return next(err);
    }
};

// 8. EMPTY ENTIRE TRASH BIN (1-Click clean!)
const emptyTrash = async (req, res, next) => {
    try {
        const filesCol = getFilesCollection();
        const files = await filesCol
            .find({
                ...buildFileOwnerFilter(req.user),
                'metadata.markAsTrash': true,
            })
            .project({ _id: 1, length: 1 })
            .toArray();

        const bucket = getGridBucket();
        let freedBytes = 0;
        for (const file of files) {
            await bucket.delete(file._id);
            freedBytes += file.length || 0;
        }
        if (files.length > 0) {
            await ShareLink.deleteMany({ fileId: { $in: files.map((f) => f._id) } });
        }

        await logAudit({
            action: 'EMPTY_TRASH',
            targetType: 'file',
            targetName: `${files.length} file(s)`,
            details: { deletedCount: files.length, freedBytes },
            req,
        });

        return res.status(StatusCodes.OK).json({
            msg: `Trash emptied (${files.length} file${files.length === 1 ? '' : 's'} deleted).`,
            deletedCount: files.length,
            freedBytes,
        });
    } catch (err) {
        return next(err);
    }
};

// 9. PROMOTE AN OLDER VERSION BACK TO LATEST
const restoreVersion = async (req, res, next) => {
    try {
        const { id } = req.params;
        const _id = mongoose.Types.ObjectId.createFromHexString(id);
        const filesCol = getFilesCollection();

        const targetVersion = await filesCol.findOne({ _id, ...buildFileOwnerFilter(req.user) });
        if (!targetVersion) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: 'File version not found.' });
        }

        const versionGroupId = targetVersion.metadata?.versionGroupId || targetVersion._id;

        await filesCol.updateMany(
            { $or: [{ 'metadata.versionGroupId': versionGroupId }, { _id: versionGroupId }] },
            { $set: { 'metadata.isLatestVersion': false } }
        );

        await filesCol.updateOne(
            { _id },
            {
                $set: {
                    'metadata.isLatestVersion': true,
                    'metadata.markAsTrash': false,
                    'metadata.markAsTrashDate': null,
                },
            }
        );

        const updated = await filesCol.findOne({ _id });

        await logAudit({
            action: 'RESTORE',
            targetType: 'file',
            targetId: _id,
            targetName: `${targetVersion.filename} (v${targetVersion.metadata?.version || 1})`,
            details: { restoredVersion: targetVersion.metadata?.version || 1 },
            req,
        });

        return res.status(StatusCodes.OK).json({
            msg: `Version v${targetVersion.metadata?.version || 1} is now the active version.`,
            file: normalizeFileDoc(updated),
        });
    } catch (err) {
        return next(err);
    }
};

module.exports = {
    renameFile,
    updateFileDetails,
    moveFiles,
    markFilesAsTrash,
    restoreFiles,
    deleteFile,
    deleteFiles,
    emptyTrash,
    restoreVersion,
};
