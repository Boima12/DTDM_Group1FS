const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User.js');
const env = require('../config/env.js');

const DEMO_EMAIL = 'demo@group1fs.cloud';
let cachedDemoUserId = null;

const ensureDemoUser = async () => {
    if (cachedDemoUserId) {
        const existing = await User.findById(cachedDemoUserId);
        if (existing) return existing;
    }

    let demoUser = await User.findOne({ email: DEMO_EMAIL });
    if (!demoUser) {
        const passwordHash = await bcrypt.hash('Demo@2026', 10);
        demoUser = await User.create({
            name: 'Group 1 Demo',
            email: DEMO_EMAIL,
            passwordHash,
            role: 'demo',
            avatarColor: '#007a5c',
            storageQuotaBytes: env.storageQuotaBytes,
        });
    }
    cachedDemoUserId = demoUser._id.toString();
    return demoUser;
};

const signUserToken = (user) => {
    return jwt.sign(
        {
            sub: user._id.toString(),
            email: user.email,
            role: user.role,
        },
        env.jwtSecret,
        { expiresIn: env.jwtExpiresIn }
    );
};

const extractToken = (req) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7).trim();
    }
    if (req.query && typeof req.query.token === 'string' && req.query.token.trim()) {
        return req.query.token.trim();
    }
    return null;
};

/**
 * Attaches authenticated user to req.user.
 * Falls back transparently to the Demo Workspace user if no token is sent
 * and ENABLE_DEMO_AUTO_LOGIN is enabled (so first-visit demo never hits a friction wall).
 */
const attachUser = async (req, res, next) => {
    try {
        const token = extractToken(req);

        if (token) {
            try {
                const payload = jwt.verify(token, env.jwtSecret);
                const user = await User.findById(payload.sub);
                if (!user) {
                    return res.status(401).json({ msg: 'Account no longer exists. Please sign in again.' });
                }
                req.user = user.toSafeJSON();
                return next();
            } catch {
                return res.status(401).json({ msg: 'Session expired or invalid token. Please sign in again.' });
            }
        }

        if (env.enableDemoAutoLogin) {
            const demoUser = await ensureDemoUser();
            req.user = demoUser.toSafeJSON();
            return next();
        }

        return res.status(401).json({ msg: 'Authentication required.' });
    } catch (err) {
        return next(err);
    }
};

module.exports = {
    DEMO_EMAIL,
    ensureDemoUser,
    signUserToken,
    extractToken,
    attachUser,
};
