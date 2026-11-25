const multer = require('multer');
const { StatusCodes } = require('http-status-codes');
const { CustomAPIError } = require('../errors');
const env = require('../config/env.js');
const { safeUnlink } = require('../utils/gridfsHelpers.js');

const errorHandlerMiddleware = async (err, req, res, _next) => {
    // Cleanup any temporary multer files on error
    const cleanupFiles = [];
    if (req.file?.path) cleanupFiles.push(req.file.path);
    if (Array.isArray(req.files)) {
        req.files.forEach((f) => {
            if (f?.path) cleanupFiles.push(f.path);
        });
    }
    if (cleanupFiles.length > 0) {
        await Promise.all(cleanupFiles.map((p) => safeUnlink(p)));
    }

    if (res.headersSent) {
        return;
    }

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            const limitMb = Math.round(env.maxFileSizeBytes / (1024 * 1024));
            return res.status(StatusCodes.REQUEST_TOO_LONG).json({
                msg: `File size exceeds the maximum limit of ${limitMb} MB.`,
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(StatusCodes.BAD_REQUEST).json({
                msg: `Too many files uploaded at once (max ${env.maxUploadBatchCount} files).`,
            });
        }
        return res.status(StatusCodes.BAD_REQUEST).json({ msg: err.message });
    }

    if (err instanceof CustomAPIError) {
        return res.status(err.statusCode || StatusCodes.BAD_REQUEST).json({ msg: err.message });
    }

    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors || {})
            .map((e) => e.message)
            .join(', ');
        return res.status(StatusCodes.BAD_REQUEST).json({ msg: message || 'Validation failed.' });
    }

    if (err.name === 'CastError') {
        return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Invalid identifier format.' });
    }

    console.error('[Server Error]', err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        msg: env.nodeEnv === 'production' ? 'Internal server error.' : err.message || 'Internal server error.',
    });
};

module.exports = errorHandlerMiddleware;
