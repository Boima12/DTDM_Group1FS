const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');
const env = require('../../config/env.js');
const { getConnectionMeta } = require('../../db/connect.js');
const { getRenderRuntimeInfo } = require('../systemController.js');
const ShareLink = require('../../models/ShareLink.js');
const Folder = require('../../models/Folder.js');
const {
    getFilesCollection,
    getChunksCollection,
    buildFileOwnerFilter,
    buildFolderOwnerFilter,
    normalizeFileDoc,
    getFileChunksXRay,
    verifyFileIntegrity,
} = require('../../utils/gridfsHelpers.js');
const { logAudit } = require('../../utils/auditLogger.js');

const escapeRegex = (str = '') => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildSortSpec = (sortParam = 'uploadDate:desc') => {
    const [field = 'uploadDate', dir = 'desc'] = String(sortParam).split(':');
    const direction = dir === 'asc' ? 1 : -1;
    const allowedFields = {
        uploadDate: 'uploadDate',
        filename: 'filename',
        length: 'length',
        trashDate: 'metadata.markAsTrashDate',
    };
    const mongoField = allowedFields[field] || 'uploadDate';
    return { [mongoField]: direction, _id: direction };
};

// 0. UNIFIED SERVER-SIDE SEARCH, FILTER, SORT & PAGINATION ENDPOINT
const listFiles = async (req, res, next) => {
    try {
        const {
            search = '',
            category = 'all',
            folderId = '',
            starred = '',
            trash = 'false',
            sort = 'uploadDate:desc',
            page = 1,
            limit = 24,
        } = req.query;

        const isTrash = trash === 'true';
        const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
        const limitNum = Math.min(200, Math.max(1, Number.parseInt(limit, 10) || 24));

        const andConditions = [
            buildFileOwnerFilter(req.user),
            { 'metadata.markAsTrash': isTrash },
        ];

        if (!isTrash) {
            andConditions.push({ 'metadata.isLatestVersion': { $ne: false } });
        }

        // Folder filtering (skip folder scoping when searching globally or viewing starred or trash)
        const trimmedSearch = String(search || '').trim();
        if (!isTrash && starred !== 'true' && !trimmedSearch && folderId !== 'all') {
            if (!folderId || folderId === 'root' || folderId === 'null') {
                andConditions.push({
                    $or: [{ 'metadata.folderId': null }, { 'metadata.folderId': { $exists: false } }],
                });
            } else if (mongoose.Types.ObjectId.isValid(folderId)) {
                andConditions.push({
                    'metadata.folderId': mongoose.Types.ObjectId.createFromHexString(folderId),
                });
            }
        }

        if (starred === 'true') {
            andConditions.push({ 'metadata.starred': true });
        }

        // Category filter (transparently includes legacy 'music' under 'audio')
        if (category && category !== 'all') {
            if (category === 'audio') {
                andConditions.push({ 'metadata.category': { $in: ['audio', 'music'] } });
            } else {
                andConditions.push({ 'metadata.category': category });
            }
        }

        if (trimmedSearch) {
            const regex = new RegExp(escapeRegex(trimmedSearch), 'i');
            andConditions.push({
                $or: [
                    { filename: regex },
                    { 'metadata.originalName': regex },
                    { 'metadata.contentType': regex },
                    { 'metadata.extension': regex },
                    { 'metadata.description': regex },
                    { 'metadata.tags': regex },
                ],
            });
        }

        const query = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];
        const filesCol = getFilesCollection();

        // Also compute per-category counts for current scope (without category filter)
        const countConditions = andConditions.filter((c) => !Object.prototype.hasOwnProperty.call(c, 'metadata.category'));
        const countQuery = countConditions.length > 1 ? { $and: countConditions } : countConditions[0];

        const [rawFiles, total, catCounts] = await Promise.all([
            filesCol
                .find(query)
                .sort(buildSortSpec(sort))
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .toArray(),
            filesCol.countDocuments(query),
            filesCol
                .aggregate([
                    { $match: countQuery },
                    {
                        $group: {
                            _id: {
                                $cond: [
                                    { $eq: ['$metadata.category', 'music'] },
                                    'audio',
                                    { $ifNull: ['$metadata.category', 'other'] },
                                ],
                            },
                            count: { $sum: 1 },
                        },
                    },
                ])
                .toArray(),
        ]);

        const categoryCounts = { all: 0, document: 0, image: 0, video: 0, audio: 0, archive: 0, other: 0 };
        catCounts.forEach((c) => {
            const key = c._id || 'other';
            categoryCounts[key] = (categoryCounts[key] || 0) + c.count;
            categoryCounts.all += c.count;
        });

        // Attach active share count flags
        const fileIds = rawFiles.map((f) => f._id);
        const shareCounts =
            fileIds.length > 0
                ? await ShareLink.aggregate([
                      {
                          $match: {
                              fileId: { $in: fileIds },
                              active: true,
                              $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
                          },
                      },
                      { $group: { _id: '$fileId', count: { $sum: 1 } } },
                  ])
                : [];
        const shareMap = new Map(shareCounts.map((s) => [String(s._id), s.count]));

        const files = rawFiles.map((f) => {
            const normalized = normalizeFileDoc(f);
            return {
                ...normalized,
                activeShareCount: shareMap.get(String(f._id)) || 0,
            };
        });

        return res.status(StatusCodes.OK).json({
            files,
            categoryCounts,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.max(1, Math.ceil(total / limitNum)),
            },
        });
    } catch (err) {
        return next(err);
    }
};

// 1. BACKWARDS-COMPATIBLE: GET LIST OF ALL FILES METADATA
const getFilesInfo = async (req, res, next) => {
    try {
        const filesCol = getFilesCollection();
        const rawFiles = await filesCol
            .find(buildFileOwnerFilter(req.user))
            .sort({ uploadDate: -1 })
            .toArray();
        return res.status(StatusCodes.OK).json({ files: rawFiles.map(normalizeFileDoc) });
    } catch (err) {
        return next(err);
    }
};

// 2. GET SPECIFIC FILE INFO (REAL clusterInfo, renderInfo, chunk count, versions, shares!)
const getSpecificFileInfo = async (req, res, next) => {
    try {
        const { id } = req.params;
        const _id = mongoose.Types.ObjectId.createFromHexString(id);
        const filesCol = getFilesCollection();
        const chunksCol = getChunksCollection();

        const fileDoc = await filesCol.findOne({ _id, ...buildFileOwnerFilter(req.user) });
        if (!fileDoc) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: 'File not found.' });
        }

        const versionGroupId = fileDoc.metadata?.versionGroupId || fileDoc._id;

        const [actualChunkCount, versionsRaw, activeShares, folderDoc] = await Promise.all([
            chunksCol.countDocuments({ files_id: _id }),
            filesCol
                .find({
                    $or: [{ 'metadata.versionGroupId': versionGroupId }, { _id: versionGroupId }],
                })
                .sort({ 'metadata.version': -1, uploadDate: -1 })
                .toArray(),
            ShareLink.find({
                fileId: _id,
                active: true,
                $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
            })
                .sort({ createdAt: -1 })
                .lean(),
            fileDoc.metadata?.folderId
                ? Folder.findById(fileDoc.metadata.folderId).select('name color').lean()
                : null,
        ]);

        const normalized = normalizeFileDoc(fileDoc);

        return res.status(StatusCodes.OK).json({
            file: normalized,
            actualChunkCount,
            folder: folderDoc ? { id: folderDoc._id.toString(), name: folderDoc.name, color: folderDoc.color } : null,
            versions: versionsRaw.map((v) => ({
                id: v._id.toString(),
                filename: v.filename,
                length: v.length,
                version: v.metadata?.version || 1,
                isLatest: v.metadata?.isLatestVersion !== false,
                sha256: v.metadata?.sha256 || null,
                uploadDate: v.uploadDate,
            })),
            activeShares: activeShares.map((s) => ({
                id: s._id.toString(),
                token: s.token,
                permission: s.permission,
                passwordProtected: Boolean(s.passwordHash),
                expiresAt: s.expiresAt,
                accessCount: s.accessCount,
                downloadCount: s.downloadCount,
            })),
            clusterInfo: getConnectionMeta(),
            renderInfo: getRenderRuntimeInfo(),
        });
    } catch (err) {
        return next(err);
    }
};

// 3. BACKWARDS-COMPATIBLE: GET LIST OF ALL ACTIVE FILES
const getAllValidFiles = async (req, res, next) => {
    try {
        const filesCol = getFilesCollection();
        const rawFiles = await filesCol
            .find({
                ...buildFileOwnerFilter(req.user),
                'metadata.markAsTrash': false,
                'metadata.isLatestVersion': { $ne: false },
            })
            .sort({ uploadDate: -1 })
            .toArray();
        return res.status(StatusCodes.OK).json({ files: rawFiles.map(normalizeFileDoc) });
    } catch (err) {
        return next(err);
    }
};

// 4. BACKWARDS-COMPATIBLE: GET LIST OF ALL TRASH FILES
const getAllTrashFiles = async (req, res, next) => {
    try {
        const filesCol = getFilesCollection();
        const rawFiles = await filesCol
            .find({
                ...buildFileOwnerFilter(req.user),
                'metadata.markAsTrash': true,
            })
            .sort({ 'metadata.markAsTrashDate': -1 })
            .toArray();
        return res.status(StatusCodes.OK).json({ files: rawFiles.map(normalizeFileDoc) });
    } catch (err) {
        return next(err);
    }
};

// 5. REAL STORAGE QUOTA & SIDEBAR BADGE STATS
const getStorageStats = async (req, res, next) => {
    try {
        const filesCol = getFilesCollection();
        const ownerFilter = buildFileOwnerFilter(req.user);

        const [activeAgg, trashAgg, starredCount, folderCount] = await Promise.all([
            filesCol
                .aggregate([
                    {
                        $match: {
                            ...ownerFilter,
                            'metadata.markAsTrash': false,
                        },
                    },
                    {
                        $group: {
                            _id: {
                                $cond: [
                                    { $eq: ['$metadata.category', 'music'] },
                                    'audio',
                                    { $ifNull: ['$metadata.category', 'other'] },
                                ],
                            },
                            bytes: { $sum: '$length' },
                            count: {
                                $sum: {
                                    $cond: [{ $ne: ['$metadata.isLatestVersion', false] }, 1, 0],
                                },
                            },
                            versionBytes: {
                                $sum: {
                                    $cond: [{ $eq: ['$metadata.isLatestVersion', false] }, '$length', 0],
                                },
                            },
                        },
                    },
                ])
                .toArray(),
            filesCol
                .aggregate([
                    { $match: { ...ownerFilter, 'metadata.markAsTrash': true } },
                    { $group: { _id: null, bytes: { $sum: '$length' }, count: { $sum: 1 } } },
                ])
                .toArray(),
            filesCol.countDocuments({
                ...ownerFilter,
                'metadata.markAsTrash': false,
                'metadata.isLatestVersion': { $ne: false },
                'metadata.starred': true,
            }),
            Folder.countDocuments({
                ...buildFolderOwnerFilter(req.user),
                isTrash: false,
            }),
        ]);

        const breakdown = { document: 0, image: 0, video: 0, audio: 0, archive: 0, other: 0 };
        let activeBytes = 0;
        let activeCount = 0;

        activeAgg.forEach((row) => {
            const cat = row._id || 'other';
            if (Object.prototype.hasOwnProperty.call(breakdown, cat)) {
                breakdown[cat] += row.bytes;
            } else {
                breakdown.other += row.bytes;
            }
            activeBytes += row.bytes;
            activeCount += row.count;
        });

        const trashBytes = trashAgg[0]?.bytes || 0;
        const trashCount = trashAgg[0]?.count || 0;
        const totalUsedBytes = activeBytes + trashBytes;
        const quotaBytes = req.user?.storageQuotaBytes || env.storageQuotaBytes;
        const usagePercent = Math.min(100, Number(((totalUsedBytes / quotaBytes) * 100).toFixed(2)));

        return res.status(StatusCodes.OK).json({
            quotaBytes,
            totalUsedBytes,
            activeBytes,
            trashBytes,
            usagePercent,
            counts: {
                active: activeCount,
                trash: trashCount,
                starred: starredCount,
                folders: folderCount,
            },
            breakdown: {
                ...breakdown,
                trash: trashBytes,
            },
        });
    } catch (err) {
        return next(err);
    }
};

// 6. GRIDFS CHUNK X-RAY INSPECTOR
const getFileChunks = async (req, res, next) => {
    try {
        const { id } = req.params;
        const _id = mongoose.Types.ObjectId.createFromHexString(id);
        const filesCol = getFilesCollection();

        const fileDoc = await filesCol.findOne({ _id, ...buildFileOwnerFilter(req.user) });
        if (!fileDoc) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: 'File not found.' });
        }

        const chunks = await getFileChunksXRay(_id);
        return res.status(StatusCodes.OK).json({
            fileId: _id.toString(),
            filename: fileDoc.filename,
            totalLength: fileDoc.length,
            chunkSize: fileDoc.chunkSize || 261120,
            chunkCount: chunks.length,
            sha256: fileDoc.metadata?.sha256 || null,
            bucketName: 'fs',
            chunks,
        });
    } catch (err) {
        return next(err);
    }
};

// 7. LIVE SHA-256 INTEGRITY VERIFICATION
const verifyFileChecksum = async (req, res, next) => {
    try {
        const { id } = req.params;
        const _id = mongoose.Types.ObjectId.createFromHexString(id);
        const filesCol = getFilesCollection();

        const fileDoc = await filesCol.findOne({ _id, ...buildFileOwnerFilter(req.user) });
        if (!fileDoc) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: 'File not found.' });
        }

        const report = await verifyFileIntegrity(_id);

        await logAudit({
            action: 'VERIFY_INTEGRITY',
            targetType: 'file',
            targetId: _id,
            targetName: fileDoc.filename,
            details: {
                valid: report.valid,
                chunksVerified: report.chunksVerified,
                durationMs: report.durationMs,
            },
            req,
        });

        return res.status(StatusCodes.OK).json({
            msg: report.valid
                ? `Integrity verified (${report.chunksVerified} chunks matched SHA-256 in ${report.durationMs}ms).`
                : 'Integrity mismatch detected!',
            report,
        });
    } catch (err) {
        return next(err);
    }
};

module.exports = {
    listFiles,
    getFilesInfo,
    getSpecificFileInfo,
    getAllValidFiles,
    getAllTrashFiles,
    getStorageStats,
    getFileChunks,
    verifyFileChecksum,
};
