const AuditLog = require('../models/AuditLog.js');

const extractClientIp = (req) => {
    if (!req) return '';
    const forwarded = req.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || '';
};

const logAudit = async ({
    action,
    targetType = 'file',
    targetId = null,
    targetName = '',
    details = {},
    req = null,
    user = null,
}) => {
    try {
        const actor = user || req?.user || null;
        await AuditLog.create({
            action,
            targetType,
            targetId: targetId ? String(targetId) : null,
            targetName: String(targetName || '').slice(0, 255),
            details,
            userId: actor?.id || null,
            userName: actor?.name || 'Demo Workspace',
            ip: extractClientIp(req),
        });
    } catch (err) {
        // Audit logging must never crash user operations
        console.warn('[AuditLog] Failed to record entry:', err.message);
    }
};

module.exports = { logAudit };
