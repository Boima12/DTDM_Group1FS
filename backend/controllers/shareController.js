const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { StatusCodes } = require('http-status-codes');
const ShareLink = require('../models/ShareLink.js');
const env = require('../config/env.js');
const { getGridBucket } = require('../db/connect.js');
const { isDangerousInlineMime } = require('../utils/fileHelpers.js');
const {
    getFilesCollection,
    buildFileOwnerFilter,
    normalizeFileDoc,
} = require('../utils/gridfsHelpers.js');
const { logAudit } = require('../utils/auditLogger.js');

const EXPIRY_MAP_MS = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    never: null,
};

const createShare = async (req, res, next) => {
    try {
        const {
            fileId,
            permission = 'download',
            expiresIn = '24h',
            password = '',
            maxDownloads = null,
        } = req.body || {};

        if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Valid fileId is required.' });
        }

        const fileObjectId = mongoose.Types.ObjectId.createFromHexString(fileId);
        const filesCol = getFilesCollection();
        const fileDoc = await filesCol.findOne({
            _id: fileObjectId,
            ...buildFileOwnerFilter(req.user),
            'metadata.markAsTrash': false,
        });

        if (!fileDoc) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: 'File not found or is in Trash.' });
        }

        const safePermission = permission === 'view' ? 'view' : 'download';
        const durationMs = Object.prototype.hasOwnProperty.call(EXPIRY_MAP_MS, expiresIn)
            ? EXPIRY_MAP_MS[expiresIn]
            : EXPIRY_MAP_MS['24h'];
        const expiresAt = durationMs ? new Date(Date.now() + durationMs) : null;

        let passwordHash = null;
        if (password && String(password).trim()) {
            passwordHash = await bcrypt.hash(String(password).trim(), 10);
        }

        const parsedMaxDl = Number.parseInt(maxDownloads, 10);
        const safeMaxDownloads = Number.isFinite(parsedMaxDl) && parsedMaxDl > 0 ? parsedMaxDl : null;

        const token = crypto.randomBytes(18).toString('base64url');
        const share = await ShareLink.create({
            token,
            fileId: fileObjectId,
            ownerId: req.user?.id ? mongoose.Types.ObjectId.createFromHexString(req.user.id) : null,
            permission: safePermission,
            passwordHash,
            expiresAt,
            maxDownloads: safeMaxDownloads,
            active: true,
        });

        await logAudit({
            action: 'SHARE_CREATE',
            targetType: 'share',
            targetId: share._id,
            targetName: fileDoc.filename,
            details: {
                token: share.token,
                permission: safePermission,
                expiresIn,
                passwordProtected: Boolean(passwordHash),
            },
            req,
        });

        return res.status(StatusCodes.CREATED).json({
            msg: 'Share link generated.',
            share: {
                id: share._id.toString(),
                token: share.token,
                fileId: share.fileId.toString(),
                filename: fileDoc.filename,
                permission: share.permission,
                passwordProtected: Boolean(share.passwordHash),
                expiresAt: share.expiresAt,
                maxDownloads: share.maxDownloads,
                accessCount: share.accessCount,
                downloadCount: share.downloadCount,
                active: share.active,
                createdAt: share.createdAt,
            },
        });
    } catch (err) {
        return next(err);
    }
};

const listShares = async (req, res, next) => {
    try {
        const { fileId } = req.query;
        const filter = { active: true };
        if (req.user && req.user.role === 'user') {
            filter.ownerId = mongoose.Types.ObjectId.createFromHexString(req.user.id);
        }
        if (fileId && mongoose.Types.ObjectId.isValid(fileId)) {
            filter.fileId = mongoose.Types.ObjectId.createFromHexString(fileId);
        }

        const shares = await ShareLink.find(filter).sort({ createdAt: -1 }).limit(50).lean();
        return res.status(StatusCodes.OK).json({
            shares: shares.map((s) => ({
                id: s._id.toString(),
                token: s.token,
                fileId: s.fileId.toString(),
                permission: s.permission,
                passwordProtected: Boolean(s.passwordHash),
                expiresAt: s.expiresAt,
                maxDownloads: s.maxDownloads,
                accessCount: s.accessCount,
                downloadCount: s.downloadCount,
                active: s.active && (!s.expiresAt || new Date(s.expiresAt) > new Date()),
                createdAt: s.createdAt,
            })),
        });
    } catch (err) {
        return next(err);
    }
};

const revokeShare = async (req, res, next) => {
    try {
        const { id } = req.params;
        const filter = { _id: id };
        if (req.user && req.user.role === 'user') {
            filter.ownerId = mongoose.Types.ObjectId.createFromHexString(req.user.id);
        }

        const share = await ShareLink.findOneAndUpdate(filter, { $set: { active: false } }, { new: true });
        if (!share) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: 'Share link not found.' });
        }

        await logAudit({
            action: 'SHARE_REVOKE',
            targetType: 'share',
            targetId: share._id,
            targetName: share.token,
            req,
        });

        return res.status(StatusCodes.OK).json({ msg: 'Share link revoked.' });
    } catch (err) {
        return next(err);
    }
};

const loadValidShare = async (token) => {
    const share = await ShareLink.findOne({ token, active: true });
    if (!share) return { error: { status: StatusCodes.NOT_FOUND, msg: 'This share link does not exist or has been revoked.' } };
    if (share.expiresAt && new Date(share.expiresAt) <= new Date()) {
        return { error: { status: StatusCodes.GONE, msg: 'This share link has expired.' } };
    }
    const filesCol = getFilesCollection();
    const fileDoc = await filesCol.findOne({ _id: share.fileId, 'metadata.markAsTrash': false });
    if (!fileDoc) {
        return { error: { status: StatusCodes.NOT_FOUND, msg: 'The shared file is no longer available.' } };
    }
    return { share, file: normalizeFileDoc(fileDoc) };
};

const getPublicShareInfo = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { share, file, error } = await loadValidShare(token);
        if (error) return res.status(error.status).json({ msg: error.msg });

        await ShareLink.updateOne({ _id: share._id }, { $inc: { accessCount: 1 } });

        const passwordProtected = Boolean(share.passwordHash);

        return res.status(StatusCodes.OK).json({
            share: {
                token: share.token,
                permission: share.permission,
                passwordProtected,
                expiresAt: share.expiresAt,
                maxDownloads: share.maxDownloads,
                accessCount: share.accessCount + 1,
                downloadCount: share.downloadCount,
                createdAt: share.createdAt,
            },
            file: passwordProtected
                ? {
                      filename: file.filename,
                      length: file.length,
                      category: file.metadata.category,
                  }
                : file,
        });
    } catch (err) {
        return next(err);
    }
};

const unlockPublicShare = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { password } = req.body || {};
        const { share, file, error } = await loadValidShare(token);
        if (error) return res.status(error.status).json({ msg: error.msg });

        if (!share.passwordHash) {
            return res.status(StatusCodes.OK).json({ unlocked: true, file });
        }

        const isMatch = await bcrypt.compare(String(password || ''), share.passwordHash);
        if (!isMatch) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ msg: 'Incorrect password / PIN.' });
        }

        const accessToken = jwt.sign(
            { shareToken: share.token, fileId: file._id.toString() },
            env.jwtSecret,
            { expiresIn: '2h' }
        );

        await logAudit({
            action: 'SHARE_ACCESS',
            targetType: 'share',
            targetId: share._id,
            targetName: file.filename,
            details: { unlocked: true },
            req,
            user: { id: null, name: 'Public Share Guest' },
        });

        return res.status(StatusCodes.OK).json({
            unlocked: true,
            accessToken,
            file,
        });
    } catch (err) {
        return next(err);
    }
};

const streamPublicShare = async (req, res, next) => {
    try {
        const { token } = req.params;
        const mode = req.query.mode === 'download' ? 'download' : 'preview';
        const { share, file, error } = await loadValidShare(token);
        if (error) return res.status(error.status).json({ msg: error.msg });

        if (share.passwordHash) {
            const accessToken = req.query.accessToken || req.headers['x-share-token'];
            if (!accessToken) {
                return res.status(StatusCodes.UNAUTHORIZED).json({ msg: 'Password verification required.' });
            }
            try {
                const payload = jwt.verify(String(accessToken), env.jwtSecret);
                if (payload.shareToken !== share.token) {
                    return res.status(StatusCodes.FORBIDDEN).json({ msg: 'Invalid share access token.' });
                }
            } catch {
                return res.status(StatusCodes.UNAUTHORIZED).json({ msg: 'Share access token expired.' });
            }
        }

        if (mode === 'download') {
            if (share.permission !== 'download') {
                return res.status(StatusCodes.FORBIDDEN).json({ msg: 'This link is view-only and does not permit downloads.' });
            }
            if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
                return res.status(StatusCodes.GONE).json({ msg: 'Maximum download limit reached for this link.' });
            }
            await ShareLink.updateOne({ _id: share._id }, { $inc: { downloadCount: 1 } });
        }

        const bucket = getGridBucket();
        const fileId = mongoose.Types.ObjectId.createFromHexString(file._id.toString());
        const fileSize = file.length;
        const contentType = file.metadata?.contentType || 'application/octet-stream';
        const dangerous = isDangerousInlineMime(contentType, file.metadata?.extension);
        const dispositionType = mode === 'download' || dangerous ? 'attachment' : 'inline';
        const encodedName = encodeURIComponent(file.filename);
        const asciiFallback = file.filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');

        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Type', contentType);
        res.setHeader(
            'Content-Disposition',
            `${dispositionType}; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`
        );
        if (dangerous) {
            res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
        }

        const rangeHeader = req.headers.range;
        if (rangeHeader && fileSize > 0) {
            const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
            if (!match) {
                res.setHeader('Content-Range', `bytes */${fileSize}`);
                return res.status(StatusCodes.REQUESTED_RANGE_NOT_SATISFIABLE).end();
            }
            const start = match[1] ? Number.parseInt(match[1], 10) : 0;
            const end = match[2] ? Math.min(Number.parseInt(match[2], 10), fileSize - 1) : fileSize - 1;
            if (start >= fileSize || end < start) {
                res.setHeader('Content-Range', `bytes */${fileSize}`);
                return res.status(StatusCodes.REQUESTED_RANGE_NOT_SATISFIABLE).end();
            }

            res.status(StatusCodes.PARTIAL_CONTENT);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Content-Length', end - start + 1);

            const stream = bucket.openDownloadStream(fileId, { start, end: end + 1 });
            stream.on('error', (err) => {
                if (!res.headersSent) res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
                else res.end();
            });
            req.on('close', () => stream.destroy());
            return stream.pipe(res);
        }

        res.setHeader('Content-Length', fileSize);
        const stream = bucket.openDownloadStream(fileId);
        stream.on('error', (err) => {
            if (!res.headersSent) res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ msg: err.message });
            else res.end();
        });
        req.on('close', () => stream.destroy());
        return stream.pipe(res);
    } catch (err) {
        return next(err);
    }
};

module.exports = {
    createShare,
    listShares,
    revokeShare,
    getPublicShareInfo,
    unlockPublicShare,
    streamPublicShare,
};
