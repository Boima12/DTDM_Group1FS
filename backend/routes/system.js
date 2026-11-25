const express = require('express');
const router = express.Router();
const { attachUser } = require('../middleware/auth.js');
const {
    getHealth,
    getTelemetry,
    triggerTrashPurge,
    getAuditLogs,
} = require('../controllers/systemController.js');

router.get('/health', getHealth);
router.get('/system/telemetry', attachUser, getTelemetry);
router.post('/system/purge-trash', attachUser, triggerTrashPurge);
router.get('/activity', attachUser, getAuditLogs);

module.exports = router;
