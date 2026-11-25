const bcrypt = require('bcryptjs');
const { StatusCodes } = require('http-status-codes');
const User = require('../models/User.js');
const { ensureDemoUser, signUserToken } = require('../middleware/auth.js');
const { logAudit } = require('../utils/auditLogger.js');

const AVATAR_COLORS = ['#007a5c', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#0891b2'];

const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body || {};

        if (!name || !String(name).trim()) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Full name is required.' });
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Please provide a valid email address.' });
        }
        if (!password || String(password).length < 6) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Password must be at least 6 characters.' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(StatusCodes.CONFLICT).json({ msg: 'An account with this email already exists.' });
        }

        const passwordHash = await bcrypt.hash(String(password), 10);
        const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

        const user = await User.create({
            name: String(name).trim().slice(0, 80),
            email: normalizedEmail,
            passwordHash,
            role: 'user',
            avatarColor,
        });

        const token = signUserToken(user);
        const safeUser = user.toSafeJSON();

        await logAudit({
            action: 'AUTH_REGISTER',
            targetType: 'auth',
            targetId: safeUser.id,
            targetName: safeUser.email,
            req,
            user: safeUser,
        });

        return res.status(StatusCodes.CREATED).json({
            msg: 'Account created successfully.',
            token,
            user: safeUser,
        });
    } catch (err) {
        return next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(StatusCodes.BAD_REQUEST).json({ msg: 'Email and password are required.' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ msg: 'Invalid email or password.' });
        }

        const isMatch = await bcrypt.compare(String(password), user.passwordHash);
        if (!isMatch) {
            return res.status(StatusCodes.UNAUTHORIZED).json({ msg: 'Invalid email or password.' });
        }

        const token = signUserToken(user);
        const safeUser = user.toSafeJSON();

        await logAudit({
            action: 'AUTH_LOGIN',
            targetType: 'auth',
            targetId: safeUser.id,
            targetName: safeUser.email,
            req,
            user: safeUser,
        });

        return res.status(StatusCodes.OK).json({
            msg: 'Signed in successfully.',
            token,
            user: safeUser,
        });
    } catch (err) {
        return next(err);
    }
};

const demoLogin = async (req, res, next) => {
    try {
        const demoUser = await ensureDemoUser();
        const token = signUserToken(demoUser);
        const safeUser = demoUser.toSafeJSON();

        await logAudit({
            action: 'AUTH_LOGIN',
            targetType: 'auth',
            targetId: safeUser.id,
            targetName: `${safeUser.email} (Quick Demo)`,
            req,
            user: safeUser,
        });

        return res.status(StatusCodes.OK).json({
            msg: 'Entered Demo Workspace.',
            token,
            user: safeUser,
        });
    } catch (err) {
        return next(err);
    }
};

const getMe = async (req, res) => {
    return res.status(StatusCodes.OK).json({ user: req.user });
};

const updateProfile = async (req, res, next) => {
    try {
        const { name, avatarColor } = req.body || {};
        const updates = {};
        if (name && String(name).trim()) {
            updates.name = String(name).trim().slice(0, 80);
        }
        if (avatarColor && /^#[0-9a-fA-F]{6}$/.test(avatarColor)) {
            updates.avatarColor = avatarColor;
        }
        const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true });
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({ msg: 'User not found.' });
        }
        return res.status(StatusCodes.OK).json({
            msg: 'Profile updated.',
            user: user.toSafeJSON(),
        });
    } catch (err) {
        return next(err);
    }
};

module.exports = {
    register,
    login,
    demoLogin,
    getMe,
    updateProfile,
};
