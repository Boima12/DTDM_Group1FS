const { StatusCodes } = require('http-status-codes');
const { getGridBucket } = require('../../db/connect.js');
const { getFileMetadata } = require('../../utils/fileHelpers.js');
const mongoose = require('mongoose');

// 1. UPLOAD FILE TO GRIDFS
const uploadFile = async (req, res) => {
    if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({ msg: "No file uploaded" });
    }

    const bucket = getGridBucket();

    // Determine category and previewability
    const { category, previewable } = getFileMetadata(req.file);

    // Create an upload stream to GridFS
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
        metadata: {
            contentType: req.file.mimetype,
            extension: req.file.originalname.split('.').pop(),
            originalName: req.file.originalname,
            description: req.body.FSfileDescription || '',
            category: category,
            previewable: previewable,
            markAsTrash: false,
            markAsTrashDate: null,
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

module.exports = {
    uploadFile,
};