// controllers/fsFile.js
const { StatusCodes } = require('http-status-codes');
const { getGridBucket } = require('../db/connect.js');
const mongoose = require('mongoose');

// 1. UPLOAD FILE TO GRIDFS
const uploadFile = async (req, res) => {
    if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({ msg: "No file uploaded" });
    }

    const bucket = getGridBucket();

    // Create an upload stream to GridFS
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
        metadata: {
            contentType: req.file.mimetype,
            description: req.body.FSfileDescription || ''
        }
    });

    // Write file buffer to stream
    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', () => {
        res.status(StatusCodes.CREATED).json({
            msg: "File uploaded successfully to GridFS",
            fileId: uploadStream.id,
            filename: req.file.originalname
        });
    });

    uploadStream.on('error', (err) => {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
    });
};

// 2. GET LIST OF ALL FILES METADATA
const getFilesInfo = async (req, res) => {
    try {
        const bucket = getGridBucket();
        const files = await bucket.find().toArray();
        res.status(StatusCodes.OK).json({ files });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
    }
};

// 3. DOWNLOAD / STREAM FILE BY ID
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
        res.set('Content-Disposition', `inline; filename="${file.filename}"`);

        // Pipe GridFS download stream directly to Express HTTP response
        const downloadStream = bucket.openDownloadStream(_id);
        downloadStream.pipe(res);

        // *Verification:* Requesting this endpoint streams the complete file back to the browser.
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
    }
};

// 4. RENAME FILE BY ID
const renameFile = async (req, res) => {
    try {
        const { id } = req.params;
        const { filename } = req.body;

        if (!filename) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: "New filename is required" });
        }

        const _id = mongoose.Types.ObjectId.createFromHexString(id);
        const bucket = getGridBucket();

        const files = await bucket.find({ _id }).toArray();
        if (!files || files.length === 0) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: "File not found" });
        }

        await bucket.rename(_id, filename);
        res.status(StatusCodes.OK).json({ msg: "File renamed successfully", newFilename: filename });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
    }
};

// 5. DELETE FILE BY ID
const deleteFile = async (req, res) => {
    try {
        const { id } = req.params;
        const _id = mongoose.Types.ObjectId.createFromHexString(id);
        const bucket = getGridBucket();

        await bucket.delete(_id);
        res.status(StatusCodes.OK).json({ msg: "File deleted successfully" });

        // *Verification:* Querying bucket.find({ _id }) returns an empty array after execution.
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
    }
};

module.exports = {
    uploadFile,
    getFilesInfo,
    downloadFile,
    renameFile,
    deleteFile
};