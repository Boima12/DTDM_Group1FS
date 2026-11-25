const mongoose = require('mongoose');
const env = require('../config/env.js');
const { getGridBucket } = require('../db/connect.js');
const { getFilesCollection } = require('../utils/gridfsHelpers.js');
const Folder = require('../models/Folder.js');
const ShareLink = require('../models/ShareLink.js');
const { logAudit } = require('../utils/auditLogger.js');

const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000; // Every 6 hours

const workerState = {
    running: false,
    retentionDays: env.trashRetentionDays,
    intervalMs: SWEEP_INTERVAL_MS,
    lastRunAt: null,
    nextRunAt: null,
    lastPurgedFiles: 0,
    lastPurgedFolders: 0,
    lastFreedBytes: 0,
    totalPurgedFiles: 0,
    totalFreedBytes: 0,
    lastError: null,
};

let timerHandle = null;

const runTrashPurgeSweep = async () => {
    if (workerState.running || mongoose.connection.readyState !== 1) {
        return getWorkerStatus();
    }

    workerState.running = true;
    workerState.lastError = null;
    const cutoffDate = new Date(Date.now() - env.trashRetentionDays * 24 * 60 * 60 * 1000);

    try {
        const filesCol = getFilesCollection();
        const bucket = getGridBucket();

        const expiredFiles = await filesCol
            .find({
                'metadata.markAsTrash': true,
                'metadata.markAsTrashDate': { $ne: null, $lte: cutoffDate },
            })
            .project({ _id: 1, length: 1, filename: 1 })
            .toArray();

        let purgedFiles = 0;
        let freedBytes = 0;

        for (const file of expiredFiles) {
            try {
                await bucket.delete(file._id);
                await ShareLink.deleteMany({ fileId: file._id });
                purgedFiles += 1;
                freedBytes += file.length || 0;
            } catch (err) {
                console.warn(`[TrashPurgeWorker] Failed deleting ${file._id}:`, err.message);
            }
        }

        const folderResult = await Folder.deleteMany({
            isTrash: true,
            trashDate: { $ne: null, $lte: cutoffDate },
        });

        // Clean up expired share links marked inactive
        await ShareLink.updateMany(
            { active: true, expiresAt: { $ne: null, $lte: new Date() } },
            { $set: { active: false } }
        );

        workerState.lastRunAt = new Date().toISOString();
        workerState.nextRunAt = new Date(Date.now() + SWEEP_INTERVAL_MS).toISOString();
        workerState.lastPurgedFiles = purgedFiles;
        workerState.lastPurgedFolders = folderResult.deletedCount || 0;
        workerState.lastFreedBytes = freedBytes;
        workerState.totalPurgedFiles += purgedFiles;
        workerState.totalFreedBytes += freedBytes;

        if (purgedFiles > 0 || (folderResult.deletedCount || 0) > 0) {
            await logAudit({
                action: 'AUTO_PURGE',
                targetType: 'system',
                targetName: `${purgedFiles} files, ${folderResult.deletedCount || 0} folders`,
                details: { purgedFiles, purgedFolders: folderResult.deletedCount || 0, freedBytes },
                user: { id: null, name: 'Trash Auto-Purge Worker' },
            });
        }
    } catch (err) {
        workerState.lastError = err.message;
        console.error('[TrashPurgeWorker] Sweep error:', err.message);
    } finally {
        workerState.running = false;
    }

    return getWorkerStatus();
};

const startTrashPurgeWorker = () => {
    if (timerHandle) return;
    // Initial sweep 10 seconds after boot
    const bootTimer = setTimeout(() => {
        runTrashPurgeSweep().catch(() => {});
    }, 10_000);
    if (bootTimer.unref) bootTimer.unref();

    timerHandle = setInterval(() => {
        runTrashPurgeSweep().catch(() => {});
    }, SWEEP_INTERVAL_MS);
    if (timerHandle.unref) timerHandle.unref();

    workerState.nextRunAt = new Date(Date.now() + SWEEP_INTERVAL_MS).toISOString();
};

const stopTrashPurgeWorker = () => {
    if (timerHandle) {
        clearInterval(timerHandle);
        timerHandle = null;
    }
};

const getWorkerStatus = () => ({ ...workerState });

module.exports = {
    startTrashPurgeWorker,
    stopTrashPurgeWorker,
    runTrashPurgeSweep,
    getWorkerStatus,
};
