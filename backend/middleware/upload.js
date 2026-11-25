const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env.js');

const TEMP_UPLOAD_DIR = path.join(os.tmpdir(), 'group1fs-uploads');
fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        fs.mkdir(TEMP_UPLOAD_DIR, { recursive: true }, (err) => cb(err, TEMP_UPLOAD_DIR));
    },
    filename: (_req, _file, cb) => {
        const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.tmp`;
        cb(null, unique);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: env.maxFileSizeBytes,
        files: env.maxUploadBatchCount,
    },
});

module.exports = upload;
