const { StatusCodes } = require('http-status-codes');
const { getGridBucket } = require('../../db/connect.js');
const mongoose = require('mongoose');

// 1. DOWNLOAD / STREAM FILE BY ID
const downloadFile = async (req, res) => {
    try {
        const { id } = req.params;
        const _id = mongoose.Types.ObjectId.createFromHexString(id);
        const bucket = getGridBucket();

        const files = await bucket.find({ _id }).toArray();
        if (!files || files.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: "File not found" });
        }

        const file = files[0];
        res.set('Content-Type', file.metadata?.contentType || 'application/octet-stream');
        res.set('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename)}"`);

        const downloadStream = bucket.openDownloadStream(_id);
        downloadStream.pipe(res);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
    }
};

// 2. DOWNLOAD SELECTED FILES BY IDS, RETURN AS ZIP FILE
const downloadSelectedFiles = async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: "Please provide an array of file IDs" });
        }

        const objectIds = ids.map(id => mongoose.Types.ObjectId.createFromHexString(id));
        const bucket = getGridBucket();

        const files = await bucket.find({ _id: { $in: objectIds } }).toArray();
        if (!files || files.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: "No matching files found" });
        }

        const zipFileName = `Group1FS_Archive_${Date.now()}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

        // BULLETPROOF FIX: Dynamically import archiver to bypass CommonJS/ESM conflicts
        const archiverModule = await import('archiver');
        const initArchiver = archiverModule.default || archiverModule;
        
        // Initialize the archive safely
        const archive = typeof initArchiver === 'function' 
            ? initArchiver('zip', { zlib: { level: 6 } }) 
            : initArchiver.create('zip', { zlib: { level: 6 } });

        archive.on('error', (err) => {
            console.error('Archive error:', err);
            if (!res.headersSent) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
            }
        });

        archive.pipe(res);

        const usedNames = new Map();

        for (const file of files) {
            let baseName = file.metadata?.originalName || file.filename || `file_${file._id}`;

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
            archive.append(fileStream, { name: baseName });
        }

        await archive.finalize();
    } catch (err) {
        console.error('Download selected error:', err);
        if (!res.headersSent) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
        }
    }
};

module.exports = {
    downloadFile,
    downloadSelectedFiles
};