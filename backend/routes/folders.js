const express = require('express');
const router = express.Router();
const { attachUser } = require('../middleware/auth.js');
const { validateObjectIdParam } = require('../middleware/validateObjectId.js');
const {
    listFolders,
    getBreadcrumb,
    createFolder,
    renameFolder,
    deleteFolder,
} = require('../controllers/folderController.js');

router.use(attachUser);

router.get('/', listFolders);
router.get('/:id/breadcrumb', getBreadcrumb);
router.post('/', createFolder);
router.put('/:id', validateObjectIdParam('id'), renameFolder);
router.delete('/:id', validateObjectIdParam('id'), deleteFolder);

module.exports = router;
