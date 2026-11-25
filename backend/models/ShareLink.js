const mongoose = require('mongoose');

const shareLinkSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        fileId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },
        permission: {
            type: String,
            enum: ['view', 'download'],
            default: 'download',
        },
        passwordHash: {
            type: String,
            default: null,
        },
        expiresAt: {
            type: Date,
            default: null,
            index: true,
        },
        maxDownloads: {
            type: Number,
            default: null,
        },
        accessCount: {
            type: Number,
            default: 0,
        },
        downloadCount: {
            type: Number,
            default: 0,
        },
        active: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('ShareLink', shareLinkSchema);
