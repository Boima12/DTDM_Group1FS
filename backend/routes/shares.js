const express = require('express');
const router = express.Router();
const { attachUser } = require('../middleware/auth.js');
const { validateObjectIdParam } = require('../middleware/validateObjectId.js');
const {
    createShare,
    listShares,
    revokeShare,
    getPublicShareInfo,
    unlockPublicShare,
    streamPublicShare,
} = require('../controllers/shareController.js');

// Public share endpoints (no auth required)
const publicRouter = express.Router();
publicRouter.get('/:token', getPublicShareInfo);
publicRouter.post('/:token/unlock', unlockPublicShare);
publicRouter.get('/:token/stream', streamPublicShare);

// Authenticated share management endpoints
router.use(attachUser);
router.get('/', listShares);
router.post('/', createShare);
router.delete('/:id', validateObjectIdParam('id'), revokeShare);

module.exports = {
    shareRoutes: router,
    publicShareRoutes: publicRouter,
};
