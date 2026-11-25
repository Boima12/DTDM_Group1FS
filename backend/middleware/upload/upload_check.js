const env = require('../../config/env.js');
const { safeUnlink } = require('../../utils/gridfsHelpers.js');

const checkFileSize = async (req, res, next) => {
    const incomingFiles = [];
    if (req.file) incomingFiles.push(req.file);
    if (Array.isArray(req.files)) incomingFiles.push(...req.files);

    const oversized = incomingFiles.find((file) => file.size > env.maxFileSizeBytes);
    if (oversized) {
        await Promise.all(incomingFiles.map((file) => safeUnlink(file.path)));
        const limitMb = Math.round(env.maxFileSizeBytes / (1024 * 1024));
        return res.status(413).json({
            msg: `File "${oversized.originalname}" exceeds the ${limitMb} MB size limit.`,
        });
    }

    return next();
};

module.exports = checkFileSize;
