const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
            enum: [
                'UPLOAD',
                'VERSION_UPLOAD',
                'DOWNLOAD',
                'BULK_DOWNLOAD',
                'RENAME',
                'UPDATE_DETAILS',
                'MOVE',
                'STAR',
                'TRASH',
                'RESTORE',
                'DELETE',
                'EMPTY_TRASH',
                'AUTO_PURGE',
                'FOLDER_CREATE',
                'FOLDER_RENAME',
                'FOLDER_TRASH',
                'FOLDER_DELETE',
                'SHARE_CREATE',
                'SHARE_REVOKE',
                'SHARE_ACCESS',
                'VERIFY_INTEGRITY',
                'AUTH_LOGIN',
                'AUTH_REGISTER',
            ],
            index: true,
        },
        targetType: {
            type: String,
            enum: ['file', 'folder', 'share', 'auth', 'system'],
            default: 'file',
        },
        targetId: {
            type: String,
            default: null,
        },
        targetName: {
            type: String,
            default: '',
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },
        userName: {
            type: String,
            default: 'Demo Workspace',
        },
        ip: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
