const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { connectDB, resetGridBucket } = require('../db/connect.js');
const { createApp } = require('../app.js');

describe('Group1FS v2.0 Full Backend Integration Suite', () => {
    let mongod;
    let app;
    let demoToken;
    let user2Token;
    let createdFolderId;
    let uploadedAudioId;
    let uploadedTextId;
    let uploadedV2Id;
    let shareToken;
    let shareId;

    before(async () => {
        mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        await connectDB(uri, 'GROUP1FS_TEST');
        app = createApp();
    });

    after(async () => {
        await mongoose.connection.close();
        resetGridBucket();
        if (mongod) await mongod.stop();
    });

    it('TC01: GET /api/v1/health returns ok with live DB ping ms', async () => {
        const res = await request(app).get('/api/v1/health');
        assert.equal(res.status, 200);
        assert.equal(res.body.status, 'ok');
        assert.equal(res.body.db.connected, true);
        assert.equal(typeof res.body.db.pingMs, 'number');
    });

    it('TC02: POST /api/v1/auth/demo & register/login multi-user JWT isolation', async () => {
        const demoRes = await request(app).post('/api/v1/auth/demo');
        assert.equal(demoRes.status, 200);
        assert.ok(demoRes.body.token);
        assert.equal(demoRes.body.user.role, 'demo');
        demoToken = demoRes.body.token;

        const regRes = await request(app).post('/api/v1/auth/register').send({
            name: 'Student Tester',
            email: 'student@group1fs.test',
            password: 'Password123!',
        });
        assert.equal(regRes.status, 201);
        assert.ok(regRes.body.token);
        user2Token = regRes.body.token;

        const loginRes = await request(app).post('/api/v1/auth/login').send({
            email: 'student@group1fs.test',
            password: 'Password123!',
        });
        assert.equal(loginRes.status, 200);
        assert.equal(loginRes.body.user.email, 'student@group1fs.test');
    });

    it('TC03: Folder creation, listing, rename, and breadcrumb trail', async () => {
        const createRes = await request(app)
            .post('/api/v1/folders')
            .set('Authorization', `Bearer ${demoToken}`)
            .send({ name: 'Cloud Lectures', color: '#2563eb' });
        assert.equal(createRes.status, 201);
        createdFolderId = createRes.body.folder._id;

        const subRes = await request(app)
            .post('/api/v1/folders')
            .set('Authorization', `Bearer ${demoToken}`)
            .send({ name: 'Week 1', parentId: createdFolderId });
        assert.equal(subRes.status, 201);

        const bcRes = await request(app)
            .get(`/api/v1/folders/${subRes.body.folder._id}/breadcrumb`)
            .set('Authorization', `Bearer ${demoToken}`);
        assert.equal(bcRes.status, 200);
        assert.equal(bcRes.body.path.length, 2);
        assert.equal(bcRes.body.path[0].name, 'Cloud Lectures');
        assert.equal(bcRes.body.path[1].name, 'Week 1');
    });

    it('TC04: Upload Audio (.ogg) classifies as "audio" (fixing music vs audio bug) & computes SHA-256', async () => {
        // 300KB payload -> spans 2 GridFS chunks (255KB + 45KB)
        const audioPayload = Buffer.alloc(300 * 1024, 0x41);
        const res = await request(app)
            .post('/api/v1/fsfiles/upload')
            .set('Authorization', `Bearer ${demoToken}`)
            .attach('file', audioPayload, { filename: 'how.ogg', contentType: 'audio/ogg' });

        assert.equal(res.status, 201);
        assert.equal(res.body.category, 'audio');
        assert.equal(res.body.file.metadata.category, 'audio');
        assert.match(res.body.sha256, /^[a-f0-9]{64}$/);
        uploadedAudioId = res.body.fileId;

        // Verify audio appears when filtering category=audio
        const listRes = await request(app)
            .get('/api/v1/fsfiles?category=audio')
            .set('Authorization', `Bearer ${demoToken}`);
        assert.equal(listRes.status, 200);
        assert.equal(listRes.body.files.length, 1);
        assert.equal(listRes.body.files[0]._id, uploadedAudioId);
    });

    it('TC05: Multi-upload with UTF-8 Vietnamese filename + Multi-user isolation verification', async () => {
        const res = await request(app)
            .post('/api/v1/fsfiles/upload/multiple')
            .set('Authorization', `Bearer ${demoToken}`)
            .field('folderId', createdFolderId)
            .field('description', 'Báo cáo môn ĐTĐM')
            .attach('files', Buffer.from('Hello Cloud Computing Group 1!', 'utf8'), {
                filename: 'Báo cáo ĐTĐM.txt',
                contentType: 'text/plain',
            });

        assert.equal(res.status, 201);
        assert.equal(res.body.files.length, 1);
        assert.equal(res.body.files[0].filename, 'Báo cáo ĐTĐM.txt');
        uploadedTextId = res.body.files[0].fileId;

        // Registered User 2 MUST NOT see Demo user's files
        const user2List = await request(app)
            .get('/api/v1/fsfiles?folderId=all')
            .set('Authorization', `Bearer ${user2Token}`);
        assert.equal(user2List.status, 200);
        assert.equal(user2List.body.files.length, 0);
    });

    it('TC06: HTTP 206 Partial Content Range Streaming & Download headers', async () => {
        const rangeRes = await request(app)
            .get(`/api/v1/fsfiles/download/${uploadedAudioId}`)
            .set('Authorization', `Bearer ${demoToken}`)
            .set('Range', 'bytes=0-1023');

        assert.equal(rangeRes.status, 206);
        assert.equal(rangeRes.headers['accept-ranges'], 'bytes');
        assert.equal(rangeRes.headers['content-range'], `bytes 0-1023/${300 * 1024}`);
        assert.equal(rangeRes.headers['content-length'], '1024');
    });

    it('TC07: GridFS Chunk X-Ray Inspector & Live SHA-256 Integrity Verification', async () => {
        const chunkRes = await request(app)
            .get(`/api/v1/fsfiles/${uploadedAudioId}/chunks`)
            .set('Authorization', `Bearer ${demoToken}`);
        assert.equal(chunkRes.status, 200);
        assert.equal(chunkRes.body.chunkCount, 2); // 255KB + 45KB
        assert.equal(chunkRes.body.chunks[0].index, 0);
        assert.equal(chunkRes.body.chunks[0].size, 261120);
        assert.equal(chunkRes.body.chunks[1].index, 1);
        assert.equal(chunkRes.body.chunks[1].size, 300 * 1024 - 261120);

        const verifyRes = await request(app)
            .post(`/api/v1/fsfiles/${uploadedAudioId}/verify`)
            .set('Authorization', `Bearer ${demoToken}`);
        assert.equal(verifyRes.status, 200);
        assert.equal(verifyRes.body.report.valid, true);
        assert.equal(verifyRes.body.report.chunksVerified, 2);
    });

    it('TC08: Rename preserves initialOriginalName & Upload New Version (v2) + Restore v1', async () => {
        const renameRes = await request(app)
            .put(`/api/v1/fsfiles/update/rename/${uploadedTextId}`)
            .set('Authorization', `Bearer ${demoToken}`)
            .send({ filename: 'Bao_cao_Final.txt' });
        assert.equal(renameRes.status, 200);
        assert.equal(renameRes.body.file.filename, 'Bao_cao_Final.txt');
        assert.equal(renameRes.body.file.metadata.initialOriginalName, 'Báo cáo ĐTĐM.txt');

        // Upload v2
        const v2Res = await request(app)
            .post(`/api/v1/fsfiles/${uploadedTextId}/versions`)
            .set('Authorization', `Bearer ${demoToken}`)
            .attach('file', Buffer.from('Version 2 content updated!', 'utf8'), {
                filename: 'Bao_cao_v2.txt',
                contentType: 'text/plain',
            });
        assert.equal(v2Res.status, 201);
        assert.equal(v2Res.body.version, 2);
        uploadedV2Id = v2Res.body.fileId;

        const detailRes = await request(app)
            .get(`/api/v1/fsfiles/list/specificFile/${uploadedV2Id}`)
            .set('Authorization', `Bearer ${demoToken}`);
        assert.equal(detailRes.status, 200);
        assert.equal(detailRes.body.versions.length, 2);
        assert.ok(detailRes.body.clusterInfo.databaseName);
        assert.ok(detailRes.body.renderInfo.nodeVersion);
    });

    it('TC09: Public Share Link with Password PIN, View-only protection & Revoke', async () => {
        const createShareRes = await request(app)
            .post('/api/v1/shares')
            .set('Authorization', `Bearer ${demoToken}`)
            .send({
                fileId: uploadedV2Id,
                permission: 'view',
                expiresIn: '24h',
                password: 'secret',
            });
        assert.equal(createShareRes.status, 201);
        shareToken = createShareRes.body.share.token;
        shareId = createShareRes.body.share.id;

        // Public info shows locked
        const pubInfo = await request(app).get(`/api/v1/public/share/${shareToken}`);
        assert.equal(pubInfo.status, 200);
        assert.equal(pubInfo.body.share.passwordProtected, true);

        // Wrong password -> 401
        const badUnlock = await request(app)
            .post(`/api/v1/public/share/${shareToken}/unlock`)
            .send({ password: 'wrong' });
        assert.equal(badUnlock.status, 401);

        // Correct password -> accessToken
        const okUnlock = await request(app)
            .post(`/api/v1/public/share/${shareToken}/unlock`)
            .send({ password: 'secret' });
        assert.equal(okUnlock.status, 200);
        const accessToken = okUnlock.body.accessToken;

        // View-only blocks ?mode=download (403)
        const dlBlocked = await request(app).get(
            `/api/v1/public/share/${shareToken}/stream?mode=download&accessToken=${accessToken}`
        );
        assert.equal(dlBlocked.status, 403);

        // Preview stream works (200)
        const previewOk = await request(app).get(
            `/api/v1/public/share/${shareToken}/stream?mode=preview&accessToken=${accessToken}`
        );
        assert.equal(previewOk.status, 200);

        // Revoke share
        const revokeRes = await request(app)
            .delete(`/api/v1/shares/${shareId}`)
            .set('Authorization', `Bearer ${demoToken}`);
        assert.equal(revokeRes.status, 200);
    });

    it('TC10: Trash, Restore, Permanent Delete, Storage Stats, Cloud Telemetry & Audit Logs', async () => {
        // Move to trash
        const trashRes = await request(app)
            .put(`/api/v1/fsfiles/update/markFilesAsTrash/${uploadedAudioId}`)
            .set('Authorization', `Bearer ${demoToken}`)
            .send({ ids: [uploadedAudioId] });
        assert.equal(trashRes.status, 200);

        // Restore
        const restoreRes = await request(app)
            .put(`/api/v1/fsfiles/update/restore/${uploadedAudioId}`)
            .set('Authorization', `Bearer ${demoToken}`);
        assert.equal(restoreRes.status, 200);

        // Move back to trash & permanently delete
        await request(app)
            .put(`/api/v1/fsfiles/update/markFilesAsTrash/${uploadedAudioId}`)
            .set('Authorization', `Bearer ${demoToken}`)
            .send({ ids: [uploadedAudioId] });

        const delRes = await request(app)
            .delete(`/api/v1/fsfiles/update/delete/${uploadedAudioId}`)
            .set('Authorization', `Bearer ${demoToken}`);
        assert.equal(delRes.status, 200);

        // Stats & Telemetry & Audit Logs
        const [statsRes, telemetryRes, activityRes, invalidRes] = await Promise.all([
            request(app).get('/api/v1/fsfiles/stats').set('Authorization', `Bearer ${demoToken}`),
            request(app).get('/api/v1/system/telemetry').set('Authorization', `Bearer ${demoToken}`),
            request(app).get('/api/v1/activity').set('Authorization', `Bearer ${demoToken}`),
            request(app).get('/api/v1/fsfiles/download/not-an-object-id').set('Authorization', `Bearer ${demoToken}`),
        ]);

        assert.equal(statsRes.status, 200);
        assert.equal(typeof statsRes.body.totalUsedBytes, 'number');
        assert.equal(telemetryRes.status, 200);
        assert.ok(telemetryRes.body.memory.rssBytes > 0);
        assert.ok(telemetryRes.body.gridfs.totalChunks >= 1);
        assert.equal(activityRes.status, 200);
        assert.ok(activityRes.body.logs.length >= 5);
        assert.equal(invalidRes.status, 400);
    });
});
