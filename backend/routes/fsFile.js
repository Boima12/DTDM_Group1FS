// routes/fsFile.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.js');
const checkFileSize = require('../middleware/upload/upload_check.js');
const { uploadFile } = require('../controllers/fsFile/uploads.js');
const { getFilesInfo, getSpecificFileInfo } = require('../controllers/fsFile/lists.js');
const { downloadFile } = require('../controllers/fsFile/downloads.js');
const { renameFile, deleteFile } = require('../controllers/fsFile/updates.js');


// UPLOAD
router.post('/upload', upload.single('file'), checkFileSize, uploadFile);

// LIST
router.get('/list/allFiles', getFilesInfo);
router.get('/list/specificFile/:id', getSpecificFileInfo);

// DOWNLOAD
router.get('/download/:id', downloadFile);

// UPDATE
router.put('/update/rename/:id', renameFile);
router.delete('/update/delete/:id', deleteFile);


module.exports = router;