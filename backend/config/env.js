const crypto = require('crypto');

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parsePositiveInt(process.env.PORT, 5000),
    mongoUri: process.env.MONGO_URI || '',
    mongoDbName: process.env.MONGO_DB_NAME || 'GROUP1FS',
    frontendUrl: process.env.FRONTEND_URL || '',
    jwtSecret:
        process.env.JWT_SECRET ||
        crypto.createHash('sha256').update(`group1fs-dev-${process.env.MONGO_URI || 'local'}`).digest('hex'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    storageQuotaBytes: parsePositiveInt(process.env.STORAGE_QUOTA_BYTES, 5 * 1024 * 1024 * 1024), // 5 GB default
    maxFileSizeBytes: parsePositiveInt(process.env.MAX_FILE_SIZE_BYTES, 100 * 1024 * 1024), // 100 MB default
    maxUploadBatchCount: parsePositiveInt(process.env.MAX_UPLOAD_BATCH_COUNT, 20),
    trashRetentionDays: parsePositiveInt(process.env.TRASH_RETENTION_DAYS, 30),
    enableDemoAutoLogin: process.env.ENABLE_DEMO_AUTO_LOGIN !== 'false',
    renderContainerMemoryLimitBytes: parsePositiveInt(process.env.CONTAINER_MEMORY_LIMIT_MB, 512) * 1024 * 1024,
};

module.exports = env;
