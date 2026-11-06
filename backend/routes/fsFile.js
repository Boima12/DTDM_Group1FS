// routes/fsFile.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.js');
const { 
    uploadFile, 
    getFilesInfo, 
    downloadFile, 
    renameFile,
    deleteFile 
} = require('../controllers/fsFile.js');

// POST /api/v1/fsfiles (upload multi-part file key "file")
router.post('/', upload.single('file'), uploadFile);

// GET /api/v1/fsfiles (list metadata)
router.get('/', getFilesInfo);

// GET /api/v1/fsfiles/:id (download / view file stream)
router.get('/:id', downloadFile);

// PUT /api/v1/fsfiles/:id (rename file)
router.put('/:id', renameFile);

// DELETE /api/v1/fsfiles/:id (delete from GridFS)
router.delete('/:id', deleteFile);


module.exports = router;