const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const env = require('./config/env.js');
const { connectDB } = require('./db/connect.js');
const { startTrashPurgeWorker, stopTrashPurgeWorker } = require('./workers/trashPurgeWorker.js');
const notFoundMiddleware = require('./middleware/not_found.js');
const errorHandlerMiddleware = require('./middleware/error_handler.js');

const authRoutes = require('./routes/auth.js');
const folderRoutes = require('./routes/folders.js');
const { shareRoutes, publicShareRoutes } = require('./routes/shares.js');
const systemRoutes = require('./routes/system.js');
const fsFileRoutes = require('./routes/fsFile.js');

const createApp = () => {
    const app = express();

    app.set('trust proxy', 1);

    // Security headers (allow cross-origin media streaming & inline PDF iframe)
    app.use(
        helmet({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false,
            crossOriginResourcePolicy: { policy: 'cross-origin' },
            frameguard: { action: 'sameorigin' },
        })
    );

    // Gzip compression for JSON & static assets (never buffer binary download streams)
    app.use(
        compression({
            filter: (req, res) => {
                if (req.path.includes('/download/') || req.path.includes('/stream')) {
                    return false;
                }
                return compression.filter(req, res);
            },
        })
    );

    // CORS configuration
    const allowedOrigins = env.frontendUrl
        ? env.frontendUrl.split(',').map((o) => o.trim()).filter(Boolean)
        : [];
    app.use(
        cors({
            origin: allowedOrigins.length > 0 ? allowedOrigins : true,
            credentials: true,
            exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Range', 'ETag'],
        })
    );

    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ extended: true, limit: '2mb' }));

    // Gentle rate limiting on auth & public share endpoints
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 120,
        standardHeaders: true,
        legacyHeaders: false,
        message: { msg: 'Too many requests. Please try again in a few minutes.' },
    });

    // Static frontend bundle (when served as monolith on Render/Docker)
    const publicDir = path.join(__dirname, 'public');
    app.use(express.static(publicDir, { maxAge: '1h' }));

    // API routes
    app.use('/api/v1', systemRoutes);
    app.use('/api/v1/auth', authLimiter, authRoutes);
    app.use('/api/v1/folders', folderRoutes);
    app.use('/api/v1/shares', shareRoutes);
    app.use('/api/v1/public/share', authLimiter, publicShareRoutes);
    app.use('/api/v1/fsfiles', fsFileRoutes);

    // SPA fallback for frontend client-side routes (never hijacks /api/*)
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api/')) {
            const indexPath = path.join(publicDir, 'index.html');
            if (fs.existsSync(indexPath)) {
                return res.sendFile(indexPath);
            }
        }
        return next();
    });

    // Error handling
    app.use(notFoundMiddleware);
    app.use(errorHandlerMiddleware);

    return app;
};

let serverInstance = null;

const start = async () => {
    try {
        await connectDB(env.mongoUri, env.mongoDbName);
        const app = createApp();

        serverInstance = app.listen(env.port, '0.0.0.0', () => {
            console.log(`[Group1FS] Server listening on http://0.0.0.0:${env.port} (${env.nodeEnv})`);
        });

        startTrashPurgeWorker();
    } catch (error) {
        console.error('[Group1FS] Fatal startup error:', error.message);
        process.exit(1);
    }
};

const gracefulShutdown = (signal) => {
    console.log(`[Group1FS] Received ${signal}. Shutting down gracefully...`);
    stopTrashPurgeWorker();

    if (serverInstance) {
        serverInstance.close(async () => {
            try {
                await mongoose.connection.close();
            } catch {
                // ignore
            }
            console.log('[Group1FS] Clean shutdown complete.');
            process.exit(0);
        });

        setTimeout(() => {
            console.error('[Group1FS] Forced shutdown after timeout.');
            process.exit(1);
        }, 15_000).unref();
    } else {
        process.exit(0);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (require.main === module) {
    start();
}

module.exports = { createApp, start };
