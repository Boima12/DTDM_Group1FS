// middleware/upload.js
const multer = require('multer');

// Store file in memory temporary buffer before sending to GridFS
const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = upload;