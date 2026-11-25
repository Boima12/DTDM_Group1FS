const mongoose = require('mongoose');
const dns = require('dns');
const env = require('../config/env.js');

let gridBucket = null;
let connectedAt = null;

const ensureIndexes = async (db) => {
    try {
        const filesCol = db.collection('fs.files');
        await Promise.all([
            filesCol.createIndex({ 'metadata.markAsTrash': 1, uploadDate: -1 }),
            filesCol.createIndex({ 'metadata.ownerId': 1, 'metadata.markAsTrash': 1, 'metadata.folderId': 1 }),
            filesCol.createIndex({ 'metadata.markAsTrash': 1, 'metadata.markAsTrashDate': 1 }),
            filesCol.createIndex({ 'metadata.sha256': 1 }),
            filesCol.createIndex({ 'metadata.versionGroupId': 1, 'metadata.version': -1 }),
            filesCol.createIndex({ filename: 1 }),
        ]);
    } catch (err) {
        console.warn('[DB] Index creation warning:', err.message);
    }
};

const connectWithOptions = async (url, dbName) => {
    return mongoose.connect(url, {
        dbName,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 20,
    });
};

const connectDB = async (url = env.mongoUri, dbName = env.mongoDbName) => {
    if (!url) {
        throw new Error('MONGO_URI is not configured. Please set MONGO_URI in backend/.env');
    }

    let conn;
    try {
        conn = await connectWithOptions(url, dbName);
    } catch (firstErr) {
        // Only apply public DNS fallback if SRV lookup failed (common on some local ISPs)
        const isSrvError = /querySrv|ESERVFAIL|ECONNREFUSED|ENOTFOUND/i.test(firstErr.message || '');
        if (url.startsWith('mongodb+srv://') && isSrvError) {
            console.warn('[DB] Primary DNS SRV lookup failed, retrying with public DNS (8.8.8.8 / 1.1.1.1)...');
            try {
                dns.setServers(['8.8.8.8', '1.1.1.1']);
                conn = await connectWithOptions(url, dbName);
            } catch (retryErr) {
                throw retryErr;
            }
        } else {
            throw firstErr;
        }
    }

    gridBucket = new mongoose.mongo.GridFSBucket(conn.connection.db, {
        bucketName: 'fs',
    });
    connectedAt = new Date();

    await ensureIndexes(conn.connection.db);
    console.log(`[DB] Connected to MongoDB (${conn.connection.host} / ${conn.connection.name}) & initialized GridFSBucket`);
    return conn;
};

const getGridBucket = () => {
    if (!gridBucket || mongoose.connection.readyState !== 1) {
        throw new Error('GridFSBucket is not initialized or MongoDB is disconnected.');
    }
    return gridBucket;
};

const resetGridBucket = () => {
    gridBucket = null;
    connectedAt = null;
};

const getConnectionMeta = () => ({
    databaseName: mongoose.connection.name || env.mongoDbName,
    host: mongoose.connection.host || 'unknown',
    port: mongoose.connection.port || 27017,
    readyState: mongoose.connection.readyState,
    connectedAt,
});

module.exports = {
    connectDB,
    getGridBucket,
    resetGridBucket,
    getConnectionMeta,
};
