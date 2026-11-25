const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.js');
const checkFileSize = require('../middleware/upload/upload_check.js');
const { attachUser } = require('../middleware/auth.js');
const { validateObjectIdParam } = require('../middleware/validateObjectId.js');
const {
    uploadFile,
    uploadMultipleFiles,
    uploadNewVersion,
} = require('../controllers/fsFile/uploads.js');
const {
    listFiles,
    getFilesInfo,
    getSpecificFileInfo,
    getAllValidFiles,
    getAllTrashFiles,
    getStorageStats,
    getFileChunks,
    verifyFileChecksum,
} = require('../controllers/fsFile/lists.js');
const { downloadFile, downloadSelectedFiles } = require('../controllers/fsFile/downloads.js');
const {
    renameFile,
    updateFileDetails,
    moveFiles,
    markFilesAsTrash,
    restoreFiles,
    deleteFile,
    deleteFiles,
    emptyTrash,
    restoreVersion,
} = require('../controllers/fsFile/updates.js');

router.use(attachUser);

// UPLOAD & VERSIONING
router.post('/upload', upload.single('file'), checkFileSize, uploadFile);
router.post('/upload/multiple', upload.array('files'), checkFileSize, uploadMultipleFiles);
router.post('/:id/versions', validateObjectIdParam('id'), upload.single('file'), checkFileSize, uploadNewVersion);

// LIST, SEARCH, STATS, CHUNK X-RAY & INTEGRITY
router.get('/', listFiles);
router.get('/stats', getStorageStats);
router.get('/list/allFiles', getFilesInfo);
router.get('/list/specificFile/:id', validateObjectIdParam('id'), getSpecificFileInfo);
router.get('/list/allValidFiles', getAllValidFiles);
router.get('/list/allTrashFiles', getAllTrashFiles);
router.get('/:id/chunks', validateObjectIdParam('id'), getFileChunks);
router.post('/:id/verify', validateObjectIdParam('id'), verifyFileChecksum);

// DOWNLOAD & HTTP 206 STREAMING
router.get('/download/:id', validateObjectIdParam('id'), downloadFile);
router.post('/download/selected', downloadSelectedFiles);

// UPDATE, MOVE, TRASH, RESTORE, VERSION RESTORE & DELETE
router.put('/update/rename/:id', validateObjectIdParam('id'), renameFile);
router.patch('/:id/details', validateObjectIdParam('id'), updateFileDetails);
router.put('/move', moveFiles);
router.put('/update/markFilesAsTrash/:ids', markFilesAsTrash);
router.put('/update/markFilesAsTrash', markFilesAsTrash);
router.put('/update/restore/:ids', restoreFiles);
router.put('/:id/versions/restore', validateObjectIdParam('id'), restoreVersion);
router.delete('/trash/empty', emptyTrash);
router.delete('/update/deleteMultiple/:ids', deleteFiles);
router.delete('/update/delete/:id', validateObjectIdParam('id'), deleteFile);

module.exports = router;
