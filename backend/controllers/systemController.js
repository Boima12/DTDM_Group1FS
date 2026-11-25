const os = require('os');
const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');
const env = require('../config/env.js');
const { getConnectionMeta } = require('../db/connect.js');
const { getFilesCollection, getChunksCollection } = require('../utils/gridfsHelpers.js');
const { getWorkerStatus, runTrashPurgeSweep } = require('../workers/trashPurgeWorker.js');
const ShareLink = require('../models/ShareLink.js');
const Folder = require('../models/Folder.js');
const AuditLog = require('../models/AuditLog.js');

const getRenderRuntimeInfo = () => ({
    environment: process.env.RENDER ? 'render-cloud' : 'local-node',
    instanceId: process.env.RENDER_INSTANCE_ID || os.hostname(),
    serviceId: process.env.RENDER_SERVICE_ID || 'local-dev-service',
    serviceName: process.env.RENDER_SERVICE_NAME || 'Group1FS-Local',
    region: process.env.RENDER_REGION || 'local-host',
    nodeVersion: process.version,
    platform: `${process.platform}/${process.arch}`,
    uptimeSeconds: Math.floor(process.uptime()),
});

const getHealth = async (_req, res) => {
    const dbReady = mongoose.connection.readyState === 1;
    let dbPingMs = null;

    if (dbReady && mongoose.connection.db) {
        const start = Date.now();
        try {
            await mongoose.connection.db.admin().ping();
            dbPingMs = Date.now() - start;
        } catch {
            dbPingMs = null;
        }
    }

    const healthy = dbReady && dbPingMs !== null;
    return res.status(healthy ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE).json({
        status: healthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        db: {
            connected: dbReady,
            pingMs: dbPingMs,
            databaseName: mongoose.connection.name || env.mongoDbName,
        },
        runtime: {
            environment: process.env.RENDER ? 'render' : 'local',
            region: process.env.RENDER_REGION || 'local',
            uptimeSeconds: Math.floor(process.uptime()),
        },
    });
};

const getTelemetry = async (_req, res, next) => {
    try {
        const dbStart = Date.now();
        await mongoose.connection.db.admin().ping();
        const dbPingMs = Date.now() - dbStart;

        const filesCol = getFilesCollection();
        const chunksCol = getChunksCollection();

        const [
            dbStats,
            totalFiles,
            activeFiles,
            trashedFiles,
            totalChunks,
            activeShares,
            totalFolders,
            categoryAgg,
        ] = await Promise.all([
            mongoose.connection.db.stats().catch(() => null),
            filesCol.countDocuments({}),
            filesCol.countDocuments({ 'metadata.markAsTrash': false, 'metadata.isLatestVersion': { $ne: false } }),
            filesCol.countDocuments({ 'metadata.markAsTrash': true }),
            chunksCol.estimatedDocumentCount(),
            ShareLink.countDocuments({ active: true }),
            Folder.countDocuments({ isTrash: false }),
            filesCol
                .aggregate([
                    { $match: { 'metadata.markAsTrash': false, 'metadata.isLatestVersion': { $ne: false } } },
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
                            bytes: { $sum: '$length' },
                        },
                    },
                    { $sort: { bytes: -1 } },
                ])
                .toArray(),
        ]);

        const mem = process.memoryUsage();
        const limitBytes = env.renderContainerMemoryLimitBytes;

        return res.status(StatusCodes.OK).json({
            timestamp: new Date().toISOString(),
            dbPingMs,
            cluster: {
                ...getConnectionMeta(),
                dataSizeBytes: dbStats?.dataSize || 0,
                storageSizeBytes: dbStats?.storageSize || 0,
                indexSizeBytes: dbStats?.indexSize || 0,
                collections: dbStats?.collections || 0,
            },
            render: getRenderRuntimeInfo(),
            memory: {
                rssBytes: mem.rss,
                heapUsedBytes: mem.heapUsed,
                heapTotalBytes: mem.heapTotal,
                externalBytes: mem.external,
                containerLimitBytes: limitBytes,
                usagePercent: Math.min(100, Number(((mem.rss / limitBytes) * 100).toFixed(1))),
            },
            gridfs: {
                bucketName: 'fs',
                chunkSizeBytes: 261120,
                totalFiles,
                activeFiles,
                trashedFiles,
                totalChunks,
                totalFolders,
                activeShares,
                categories: categoryAgg.map((c) => ({
                    category: c._id || 'other',
                    count: c.count,
                    bytes: c.bytes,
                })),
            },
            trashPurgeWorker: getWorkerStatus(),
        });
    } catch (err) {
        return next(err);
    }
};

const triggerTrashPurge = async (_req, res, next) => {
    try {
        const status = await runTrashPurgeSweep();
        return res.status(StatusCodes.OK).json({
            msg: `Trash sweep completed (${status.lastPurgedFiles} expired file(s) purged).`,
            worker: status,
        });
    } catch (err) {
        return next(err);
    }
};

const getAuditLogs = async (req, res, next) => {
    try {
        const { action, page = 1, limit = 30 } = req.query;
        const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 30));

        const filter = {};
        if (action && action !== 'ALL') {
            filter.action = action;
        }
        if (req.user && req.user.role === 'user') {
            filter.userId = mongoose.Types.ObjectId.createFromHexString(req.user.id);
        }

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            AuditLog.countDocuments(filter),
        ]);

        return res.status(StatusCodes.OK).json({
            logs: logs.map((l) => ({ ...l, id: l._id.toString() })),
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

module.exports = {
    getRenderRuntimeInfo,
    getHealth,
    getTelemetry,
    triggerTrashPurge,
    getAuditLogs,
};
