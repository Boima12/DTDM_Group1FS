const mongoose = require('mongoose');
const env = require('../config/env.js');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['user', 'demo', 'admin'],
            default: 'user',
        },
        avatarColor: {
            type: String,
            default: '#007a5c',
        },
        storageQuotaBytes: {
            type: Number,
            default: () => env.storageQuotaBytes,
        },
    },
    { timestamps: true }
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
    return {
        id: this._id.toString(),
        name: this.name,
        email: this.email,
        role: this.role,
        avatarColor: this.avatarColor,
        storageQuotaBytes: this.storageQuotaBytes,
        createdAt: this.createdAt,
    };
};

module.exports = mongoose.model('User', userSchema);
