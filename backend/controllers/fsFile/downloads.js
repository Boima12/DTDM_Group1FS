const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');
const { getGridBucket } = require('../../db/connect.js');
const { isDangerousInlineMime } = require('../../utils/fileHelpers.js');
const { getFilesCollection, buildFileOwnerFilter } = require('../../utils/gridfsHelpers.js');
const { logAudit } = require('../../utils/auditLogger.js');

// 1. DOWNLOAD / HTTP 206 RANGE STREAM FILE BY ID
const downloadFile = async (req, res, next) => {
    try {
        const { id } = req.params;
        const mode = req.query.mode === 'download' ? 'download' : 'preview';
        const _id = mongoose.Types.ObjectId.createFromHexString(id);
        const filesCol = getFilesCollection();

        const file = await filesCol.findOne({ _id, ...buildFileOwnerFilter(req.user) });
        if (!file) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: 'File not found.' });
        }

        const bucket = getGridBucket();
        const fileSize = file.length || 0;
        const contentType = file.metadata?.contentType || 'application/octet-stream';
        const dangerous = isDangerousInlineMime(contentType, file.metadata?.extension);
        const dispositionType = mode === 'download' || dangerous ? 'attachment' : 'inline';
        const encodedName = encodeURIComponent(file.filename);
        const asciiFallback = file.filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '') || 'file';

        const etag = `"${file.metadata?.sha256 || `${file._id}-${fileSize}`}"`;
        res.setHeader('ETag', etag);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Type', contentType);
        res.setHeader(
            'Content-Disposition',
            `${dispositionType}; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`
        );
        res.setHeader('Cache-Control', 'private, max-age=300');
        if (dangerous) {
            res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
        }

        if (req.headers['if-none-match'] === etag && !req.headers.range && mode !== 'download') {
            return res.status(StatusCodes.NOT_MODIFIED).end();
        }

        if (mode === 'download') {
            logAudit({
                action: 'DOWNLOAD',
                targetType: 'file',
                targetId: file._id,
                targetName: file.filename,
                details: { size: fileSize },
                req,
            });
        }

        const rangeHeader = req.headers.range;
        if (rangeHeader && fileSize > 0) {
            const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
            if (!match) {
                res.setHeader('Content-Range', `bytes */${fileSize}`);
                return res.status(StatusCodes.REQUESTED_RANGE_NOT_SATISFIABLE).end();
            }

            let start = match[1] ? Number.parseInt(match[1], 10) : 0;
            let end = match[2] ? Number.parseInt(match[2], 10) : fileSize - 1;

            if (!match[1] && match[2]) {
                // Suffix byte range: bytes=-500
                const suffixLen = Number.parseInt(match[2], 10);
                start = Math.max(0, fileSize - suffixLen);
                end = fileSize - 1;
            } else {
                end = Math.min(end, fileSize - 1);
            }

            if (start >= fileSize || end < start) {
                res.setHeader('Content-Range', `bytes */${fileSize}`);
                return res.status(StatusCodes.REQUESTED_RANGE_NOT_SATISFIABLE).end();
            }

            const chunkLength = end - start + 1;
            res.status(StatusCodes.PARTIAL_CONTENT);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Content-Length', chunkLength);

            const downloadStream = bucket.openDownloadStream(_id, { start, end: end + 1 });
            downloadStream.on('error', (err) => {
                console.error('[Download Range Stream Error]', err.message);
                if (!res.headersSent) {
                    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: 'Failed to stream file.' });
                } else {
                    res.end();
                }
            });
            req.on('close', () => {
                downloadStream.destroy();
            });
            return downloadStream.pipe(res);
        }

        res.setHeader('Content-Length', fileSize);
        if (fileSize === 0) {
            return res.status(StatusCodes.OK).end();
        }

        const downloadStream = bucket.openDownloadStream(_id);
        downloadStream.on('error', (err) => {
            console.error('[Download Stream Error]', err.message);
            if (!res.headersSent) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: 'Failed to stream file.' });
            } else {
                res.end();
            }
        });
        req.on('close', () => {
            downloadStream.destroy();
        });
        return downloadStream.pipe(res);
    } catch (err) {
        return next(err);
    }
};

// 2. DOWNLOAD SELECTED FILES BY IDS, STREAMED AS ZIP ARCHIVE
const downloadSelectedFiles = async (req, res, next) => {
    try {
        const { ids } = req.body || {};

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Please provide an array of file IDs.' });
        }

        const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
        if (validIds.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'No valid ObjectIds provided.' });
        }

        const objectIds = validIds.map((id) => mongoose.Types.ObjectId.createFromHexString(id));
        const filesCol = getFilesCollection();
        const files = await filesCol
            .find({ _id: { $in: objectIds }, ...buildFileOwnerFilter(req.user) })
            .toArray();

        if (!files || files.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: 'No matching files found.' });
        }

        const zipFileName = `Group1FS_Archive_${Date.now()}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

        const archiver = require('archiver');
        const archive = archiver('zip', { zlib: { level: 6 } });

        archive.on('error', (err) => {
            console.error('[ZIP Archive Error]', err.message);
            if (!res.headersSent) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
            } else {
                res.end();
            }
        });

        req.on('close', () => {
            if (!res.writableEnded) {
                archive.abort();
            }
        });

        archive.pipe(res);

        const bucket = getGridBucket();
        const usedNames = new Map();

        for (const file of files) {
            let baseName = file.filename || file.metadata?.originalName || `file_${file._id}`;

            if (usedNames.has(baseName)) {
                const count = usedNames.get(baseName) + 1;
                usedNames.set(baseName, count);
                const parts = baseName.split('.');
                if (parts.length > 1) {
                    const ext = parts.pop();
                    baseName = `${parts.join('.')}_(${count}).${ext}`;
                } else {
                    baseName = `${baseName}_(${count})`;
                }
            } else {
                usedNames.set(baseName, 0);
            }

            const fileStream = bucket.openDownloadStream(file._id);
            fileStream.on('error', (err) => {
                console.error(`[ZIP File Stream Error] ${file._id}:`, err.message);
            });
            archive.append(fileStream, { name: baseName });
        }

        logAudit({
            action: 'BULK_DOWNLOAD',
            targetType: 'file',
            targetName: `${files.length} files (${zipFileName})`,
            details: { fileIds: files.map((f) => f._id.toString()), count: files.length },
            req,
        });

        await archive.finalize();
    } catch (err) {
        return next(err);
    }
};

module.exports = {
    downloadFile,
    downloadSelectedFiles,
};
