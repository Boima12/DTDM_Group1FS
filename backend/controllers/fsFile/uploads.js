const { StatusCodes } = require('http-status-codes');
const { getGridBucket } = require('../../db/connect.js');
const { getFileMetadata } = require('../../utils/fileHelpers.js');
const mongoose = require('mongoose');

// Helper function
const saveFileToGridFS = (file, description = '') => {
    return new Promise((resolve, reject) => {
        const bucket = getGridBucket();
        const { category, previewable } = getFileMetadata(file);

        const uploadStream = bucket.openUploadStream(file.originalname, {
            metadata: {
                contentType: file.mimetype,
                extension: file.originalname.split('.').pop(),
                originalName: file.originalname,
                description: description,
                category: category,
                previewable: previewable,
                markAsTrash: false,
                markAsTrashDate: null,
            }
        });

        uploadStream.end(file.buffer);

        uploadStream.on('finish', () => {
            resolve({
                fileId: uploadStream.id,
                filename: file.originalname,
                size: file.size,
                mimetype: file.mimetype
            });
        });

        uploadStream.on('error', (err) => {
            reject(err);
        });
    });
};

// 1. UPLOAD FILE TO GRIDFS
const uploadFile = async (req, res) => {
    if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({ msg: "No file uploaded" });
    }

    try {
        const uploadedFile = await saveFileToGridFS(req.file, req.body.FSfileDescription);
        res.status(StatusCodes.CREATED).json({
            msg: "File uploaded successfully to GridFS",
            ...uploadedFile
        });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
    }
};

// 2. UPLOAD MULTIPLE FILES TO GRIDFS
const uploadMultipleFiles = async (req, res) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({ msg: "No files uploaded" });
    }

    try {
        const uploadPromises = req.files.map((file) => 
            saveFileToGridFS(file, req.body.FSfileDescription)
        );

        const uploadedFiles = await Promise.all(uploadPromises);

        res.status(StatusCodes.CREATED).json({
            msg: `${uploadedFiles.length} files uploaded successfully to GridFS`,
            files: uploadedFiles
        });
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
    }
};

module.exports = {
    uploadFile,
    uploadMultipleFiles,
};