// routes/fsFile.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.js');
const checkFileSize = require('../middleware/upload/upload_check.js');
const { uploadFile, uploadMultipleFiles } = require('../controllers/fsFile/uploads.js');
const { getFilesInfo, getSpecificFileInfo } = require('../controllers/fsFile/lists.js');
const { downloadFile, downloadSelectedFiles } = require('../controllers/fsFile/downloads.js');
const { renameFile, deleteFile } = require('../controllers/fsFile/updates.js');


// UPLOAD
router.post('/upload', upload.single('file'), checkFileSize, uploadFile);
router.post('/upload/multiple', upload.array('files'), checkFileSize, uploadMultipleFiles);

// LIST
router.get('/list/allFiles', getFilesInfo);
router.get('/list/specificFile/:id', getSpecificFileInfo);

// DOWNLOAD
router.get('/download/:id', downloadFile);
router.post('/download/selected', downloadSelectedFiles);

// UPDATE
router.put('/update/rename/:id', renameFile);
router.delete('/update/delete/:id', deleteFile);


module.exports = router;