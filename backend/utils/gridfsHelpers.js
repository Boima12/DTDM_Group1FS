const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { getGridBucket } = require('../db/connect.js');
const { classifyFile, normalizeCategory, sanitizeFilename } = require('./fileHelpers.js');

const DEFAULT_CHUNK_SIZE = 261120; // 255 KiB GridFS default

const getFilesCollection = () => {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        throw new Error('MongoDB is not connected.');
    }
    return mongoose.connection.db.collection('fs.files');
};

const getChunksCollection = () => {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
        throw new Error('MongoDB is not connected.');
    }
    return mongoose.connection.db.collection('fs.chunks');
};

/**
 * Build MongoDB owner filter:
 * - Standard registered users ('user') strictly see ONLY their own files/folders.
 * - Demo/Admin accounts see their own files PLUS legacy/unowned files (ownerId: null / missing)
 *   so existing Atlas data stays visible immediately during demos!
 */
const buildFileOwnerFilter = (user) => {
    if (!user) return {};
    const ownerObjectId = mongoose.Types.ObjectId.createFromHexString(user.id);
    if (user.role === 'demo' || user.role === 'admin') {
        return {
            $or: [
                { 'metadata.ownerId': ownerObjectId },
                { 'metadata.ownerId': null },
                { 'metadata.ownerId': { $exists: false } },
            ],
        };
    }
    return { 'metadata.ownerId': ownerObjectId };
};

const buildFolderOwnerFilter = (user) => {
    if (!user) return {};
    const ownerObjectId = mongoose.Types.ObjectId.createFromHexString(user.id);
    if (user.role === 'demo' || user.role === 'admin') {
        return {
            $or: [{ ownerId: ownerObjectId }, { ownerId: null }, { ownerId: { $exists: false } }],
        };
    }
    return { ownerId: ownerObjectId };
};

const normalizeFileDoc = (fileDoc) => {
    if (!fileDoc) return null;
    const meta = fileDoc.metadata || {};
    const normalizedCategory = normalizeCategory(meta.category);
    const chunkSize = fileDoc.chunkSize || DEFAULT_CHUNK_SIZE;
    const estimatedChunks = Math.max(1, Math.ceil((fileDoc.length || 0) / chunkSize));

    return {
        ...fileDoc,
        metadata: {
            ...meta,
            category: normalizedCategory,
            originalName: meta.originalName || fileDoc.filename,
            initialOriginalName: meta.initialOriginalName || meta.originalName || fileDoc.filename,
            starred: Boolean(meta.starred),
            tags: Array.isArray(meta.tags) ? meta.tags : [],
            description: meta.description || '',
            folderId: meta.folderId ? meta.folderId.toString() : null,
            ownerId: meta.ownerId ? meta.ownerId.toString() : null,
            version: meta.version || 1,
            versionGroupId: meta.versionGroupId ? meta.versionGroupId.toString() : fileDoc._id.toString(),
            isLatestVersion: meta.isLatestVersion !== false,
            sha256: meta.sha256 || null,
            markAsTrash: Boolean(meta.markAsTrash),
            markAsTrashDate: meta.markAsTrashDate || null,
            estimatedChunks,
        },
    };
};

/**
 * Safely clean up temporary disk file if present.
 */
const safeUnlink = async (filePath) => {
    if (!filePath) return;
    try {
        await fs.promises.unlink(filePath);
    } catch {
        // Ignore already removed
    }
};

/**
 * Zero-RAM streaming upload from temp file (or Buffer) directly into GridFS
 * while simultaneously computing a cryptographic SHA-256 checksum.
 */
const streamFileToGridFS = async (file, options = {}) => {
    const bucket = getGridBucket();
    const cleanFilename = sanitizeFilename(options.filenameOverride || file.originalname);
    const { extension, contentType, category, previewable } = classifyFile(cleanFilename, file.mimetype);

    const ownerObjectId = options.ownerId
        ? mongoose.Types.ObjectId.createFromHexString(String(options.ownerId))
        : null;
    const folderObjectId = options.folderId && mongoose.Types.ObjectId.isValid(options.folderId)
        ? mongoose.Types.ObjectId.createFromHexString(String(options.folderId))
        : null;
    const versionGroupObjectId = options.versionGroupId && mongoose.Types.ObjectId.isValid(options.versionGroupId)
        ? mongoose.Types.ObjectId.createFromHexString(String(options.versionGroupId))
        : new mongoose.Types.ObjectId();

    const tags = Array.isArray(options.tags)
        ? options.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10)
        : [];

    const metadata = {
        contentType,
        extension,
        originalName: cleanFilename,
        initialOriginalName: options.initialOriginalName || cleanFilename,
        description: String(options.description || '').trim().slice(0, 1000),
        tags,
        category,
        previewable,
        starred: Boolean(options.starred),
        folderId: folderObjectId,
        ownerId: ownerObjectId,
        version: options.version || 1,
        versionGroupId: versionGroupObjectId,
        isLatestVersion: true,
        sha256: null,
        markAsTrash: false,
        markAsTrashDate: null,
    };

    const hash = crypto.createHash('sha256');

    try {
        const fileId = await new Promise((resolve, reject) => {
            const uploadStream = bucket.openUploadStream(cleanFilename, {
                contentType,
                metadata,
            });

            uploadStream.on('error', reject);
            uploadStream.on('finish', () => resolve(uploadStream.id));

            if (file.path) {
                const readStream = fs.createReadStream(file.path);
                readStream.on('data', (chunk) => hash.update(chunk));
                readStream.on('error', (err) => {
                    uploadStream.destroy(err);
                    reject(err);
                });
                readStream.pipe(uploadStream);
            } else if (file.buffer) {
                hash.update(file.buffer);
                uploadStream.end(file.buffer);
            } else {
                reject(new Error('No readable stream or buffer found for uploaded file.'));
            }
        });

        const sha256 = hash.digest('hex');

        // Store computed SHA-256 hash on fs.files metadata
        const filesCol = getFilesCollection();
        await filesCol.updateOne(
            { _id: fileId },
            { $set: { 'metadata.sha256': sha256 } }
        );

        // Check for duplicate file (same SHA-256, different _id, active in same workspace)
        let duplicateOf = null;
        if (!options.skipDuplicateCheck) {
            const dupQuery = {
                _id: { $ne: fileId },
                'metadata.sha256': sha256,
                'metadata.markAsTrash': false,
                'metadata.isLatestVersion': { $ne: false },
            };
            if (ownerObjectId) {
                dupQuery['metadata.ownerId'] = ownerObjectId;
            }
            const existing = await filesCol.findOne(dupQuery, { projection: { _id: 1, filename: 1 } });
            if (existing) {
                duplicateOf = { id: existing._id.toString(), filename: existing.filename };
            }
        }

        const savedDoc = await filesCol.findOne({ _id: fileId });
        return {
            file: normalizeFileDoc(savedDoc),
            fileId: fileId.toString(),
            filename: cleanFilename,
            size: file.size,
            mimetype: contentType,
            category,
            sha256,
            duplicateOf,
        };
    } finally {
        await safeUnlink(file.path);
    }
};

/**
 * Inspect REAL GridFS chunks from `fs.chunks` for the Chunk X-Ray Visualizer.
 */
const getFileChunksXRay = async (fileObjectId) => {
    const chunksCol = getChunksCollection();
    const pipeline = [
        { $match: { files_id: fileObjectId } },
        { $sort: { n: 1 } },
        {
            $project: {
                _id: 1,
                n: 1,
                size: { $binarySize: '$data' },
            },
        },
    ];
    const chunks = await chunksCol.aggregate(pipeline).toArray();
    return chunks.map((chunk) => ({
        id: chunk._id.toString(),
        index: chunk.n,
        size: chunk.size,
    }));
};

/**
 * Stream all chunks of a GridFS file and recompute SHA-256 live to verify data integrity.
 */
const verifyFileIntegrity = async (fileObjectId) => {
    const startedAt = Date.now();
    const filesCol = getFilesCollection();
    const fileDoc = await filesCol.findOne({ _id: fileObjectId });
    if (!fileDoc) return null;

    const bucket = getGridBucket();
    const hash = crypto.createHash('sha256');
    let bytesRead = 0;

    await new Promise((resolve, reject) => {
        const stream = bucket.openDownloadStream(fileObjectId);
        stream.on('data', (chunk) => {
            bytesRead += chunk.length;
            hash.update(chunk);
        });
        stream.on('error', reject);
        stream.on('end', resolve);
    });

    const computedSha256 = hash.digest('hex');
    const storedSha256 = fileDoc.metadata?.sha256 || null;

    // If legacy file had no stored sha256 yet, backfill it on first verification!
    if (!storedSha256) {
        await filesCol.updateOne(
            { _id: fileObjectId },
            { $set: { 'metadata.sha256': computedSha256 } }
        );
    }

    const durationMs = Date.now() - startedAt;
    const chunksCount = await getChunksCollection().countDocuments({ files_id: fileObjectId });

    return {
        fileId: fileObjectId.toString(),
        filename: fileDoc.filename,
        expectedBytes: fileDoc.length,
        verifiedBytes: bytesRead,
        chunksVerified: chunksCount,
        storedSha256: storedSha256 || computedSha256,
        computedSha256,
        backfilled: !storedSha256,
        valid: bytesRead === fileDoc.length && (!storedSha256 || storedSha256 === computedSha256),
        durationMs,
        verifiedAt: new Date().toISOString(),
    };
};

module.exports = {
    DEFAULT_CHUNK_SIZE,
    getFilesCollection,
    getChunksCollection,
    buildFileOwnerFilter,
    buildFolderOwnerFilter,
    normalizeFileDoc,
    safeUnlink,
    streamFileToGridFS,
    getFileChunksXRay,
    verifyFileIntegrity,
};
