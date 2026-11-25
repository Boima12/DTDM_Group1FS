/**
 * Demo Seed Script for Group1FS v2.0
 * Usage: npm run seed:demo
 * Populates Demo Workspace with structured folders & realistic demo files
 * (including PDF, PNG, MOV video, OGG audio, JSON, CSV, Markdown, and JS code).
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { connectDB } = require('../db/connect.js');
const { ensureDemoUser } = require('../middleware/auth.js');
const Folder = require('../models/Folder.js');
const { streamFileToGridFS, getFilesCollection } = require('../utils/gridfsHelpers.js');
const { logAudit } = require('../utils/auditLogger.js');

const createMinimalPdfBuffer = (title, bodyLines) => {
    const escaped = (str) => str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const textCommands = [
        'BT',
        '/F1 18 Tf',
        '50 760 Td',
        `(${escaped(title)}) Tj`,
        '/F1 11 Tf',
        '0 -28 Td',
        ...bodyLines.flatMap((line) => [`(${escaped(line)}) Tj`, '0 -18 Td']),
        'ET',
    ].join('\n');

    const objects = [
        '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
        '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
        '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
        `4 0 obj << /Length ${Buffer.byteLength(textCommands, 'utf8')} >> stream\n${textCommands}\nendstream endobj`,
        '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    for (const obj of objects) {
        offsets.push(Buffer.byteLength(pdf, 'utf8'));
        pdf += `${obj}\n`;
    }
    const xrefPos = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i < offsets.length; i += 1) {
        pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
    return Buffer.from(pdf, 'utf8');
};

const runSeed = async () => {
    await connectDB();
    const demoUser = await ensureDemoUser();
    const ownerId = demoUser._id.toString();

    console.log(`[Seed] Using Demo Workspace user: ${demoUser.email} (${ownerId})`);

    const ensureFolder = async (name, color, parentId = null) => {
        let folder = await Folder.findOne({ name, parentId, isTrash: false });
        if (!folder) {
            folder = await Folder.create({
                name,
                color,
                parentId,
                ownerId: demoUser._id,
            });
            console.log(`[Seed] Created folder: ${name}`);
        }
        return folder;
    };

    const reportFolder = await ensureFolder('Cloud Computing Project', '#007a5c');
    const mediaFolder = await ensureFolder('Media & Streaming Showcase', '#7c3aed');
    const dataFolder = await ensureFolder('Datasets & Config', '#2563eb');

    const filesCol = getFilesCollection();
    const seedFileIfMissing = async (filename, buffer, mimetype, options = {}) => {
        const exists = await filesCol.findOne({
            filename,
            'metadata.markAsTrash': false,
        });
        if (exists) {
            console.log(`[Seed] Skipped existing file: ${filename}`);
            return;
        }
        const res = await streamFileToGridFS(
            { originalname: filename, buffer, size: buffer.length, mimetype },
            {
                ownerId,
                folderId: options.folderId || null,
                description: options.description || '',
                tags: options.tags || [],
                starred: Boolean(options.starred),
                skipDuplicateCheck: true,
            }
        );
        console.log(`[Seed] Uploaded: ${res.filename} (${res.size} bytes, SHA-256: ${res.sha256.slice(0, 12)}...)`);
    };

    // 1. Sample PDF Report in root
    const pdfBuf = createMinimalPdfBuffer('Group1FS v2.0 - Cloud Computing Capstone Report', [
        'Course: Cloud Computing (Dien Toan Dam May) - Group 1',
        'Architecture: React 19 SPA + Node.js Express 5 + MongoDB Atlas GridFS',
        'Key Engineering Highlights:',
        '  1. Zero-RAM Disk-to-GridFS Streaming Upload with live SHA-256 checksum',
        '  2. HTTP 206 Partial Content Range Streaming for instant Video/Audio playback',
        '  3. Real-time GridFS Chunk X-Ray Visualizer (255 KiB chunk inspection)',
        '  4. Hierarchical Folders, File Versioning, Public QR Share Links & Audit Log',
        '  5. Multi-stage Docker + Render Blueprint + Offline Docker Compose Fallback',
    ]);
    await seedFileIfMissing('Bao_cao_Do_an_DTDM_Group1FS.pdf', pdfBuf, 'application/pdf', {
        description: 'Official capstone architecture report for Group1FS v2.0.',
        tags: ['report', 'cloud', 'gridfs'],
        starred: true,
    });

    // 2. Sample JSON Architecture Config in root
    const jsonContent = JSON.stringify(
        {
            project: 'Group1FS v2.0',
            course: 'Dien Toan Dam May (Cloud Computing)',
            storageEngine: 'MongoDB GridFS',
            chunkSizeBytes: 261120,
            features: [
                'Zero-RAM Streaming Upload',
                'HTTP 206 Range Streaming',
                'GridFS Chunk X-Ray Visualizer',
                'SHA-256 Integrity Verification',
                'Public Share Links + QR Code',
                'Hierarchical Folders & Versioning',
                'Live Cloud Telemetry Monitor',
            ],
            deployment: {
                cloud: 'Render Web Service',
                database: 'MongoDB Atlas Cluster',
                fallback: 'Docker Compose Local Stack',
            },
        },
        null,
        2
    );
    await seedFileIfMissing('cloud_architecture_config.json', Buffer.from(jsonContent, 'utf8'), 'application/json', {
        folderId: dataFolder._id.toString(),
        description: 'System deployment and GridFS bucket configuration.',
        tags: ['json', 'config', 'render'],
        starred: true,
    });

    // 3. Sample CSV Telemetry Dataset
    const csvContent = [
        'Region,Service,AvgLatencyMs,GridFSChunks,UptimePercent,Status',
        'Singapore,Group1FS-Web,34,1284,99.98,Healthy',
        'Oregon,Group1FS-Backup,78,1284,99.95,Standby',
        'Frankfurt,Atlas-Shard-00,41,1284,99.99,Primary',
        'Tokyo,CDN-Edge-Cache,19,0,99.99,Active',
    ].join('\n');
    await seedFileIfMissing('cloud_benchmark_metrics.csv', Buffer.from(csvContent, 'utf8'), 'text/csv', {
        folderId: dataFolder._id.toString(),
        description: 'Benchmark dataset showcasing CSV table preview inside Group1FS.',
        tags: ['csv', 'metrics', 'benchmark'],
    });

    // 4. Sample Markdown Documentation
    const mdContent = [
        '# Group1FS v2.0 — Demo Runbook',
        '',
        '## Highlights for Live Presentation',
        '- **Zero-RAM Streaming**: Handles 100MB uploads cleanly inside 512MB Render containers.',
        '- **HTTP 206 Streaming**: Instant seeking for `.mp4`, `.mov`, `.mp3`, `.ogg` media.',
        '- **GridFS Chunk X-Ray**: Inspect every 255 KiB chunk stored inside `fs.chunks`.',
        '- **QR Cloud Share**: Let reviewers scan and preview files live on mobile.',
    ].join('\n');
    await seedFileIfMissing('Huong_dan_Demo_Thuyet_trinh.md', Buffer.from(mdContent, 'utf8'), 'text/markdown', {
        folderId: reportFolder._id.toString(),
        description: 'Quick 5-minute demo script for the presentation panel.',
        tags: ['markdown', 'demo', 'runbook'],
        starred: true,
    });

    // 5. Real test media files from documents/testFiles (if available)
    const testFilesDir = path.join(__dirname, '..', '..', 'documents', 'testFiles');
    const mediaSeeds = [
        { file: 'Bloompiercer.png', mime: 'image/png', folder: null, starred: true, desc: 'Sample high-resolution artwork for image zoom/rotate preview.' },
        { file: 'funnyFrog.mov', mime: 'video/quicktime', folder: mediaFolder._id.toString(), starred: false, desc: 'Sample video for HTTP 206 Range streaming & GridFS multi-chunk X-Ray.' },
        { file: 'how.ogg', mime: 'audio/ogg', folder: mediaFolder._id.toString(), starred: false, desc: 'Sample OGG audio file verifying unified Audio category classification.' },
    ];

    for (const item of mediaSeeds) {
        const fullPath = path.join(testFilesDir, item.file);
        if (fs.existsSync(fullPath)) {
            const buf = await fs.promises.readFile(fullPath);
            await seedFileIfMissing(item.file, buf, item.mime, {
                folderId: item.folder,
                description: item.desc,
                tags: ['demo', 'media'],
                starred: item.starred,
            });
        }
    }

    await logAudit({
        action: 'UPLOAD',
        targetType: 'system',
        targetName: 'Demo Seed Completed',
        details: { workspace: demoUser.email },
        user: demoUser.toSafeJSON(),
    });

    console.log('[Seed] Done! Group1FS demo workspace is ready.');
    await mongoose.connection.close();
};

runSeed().catch((err) => {
    console.error('[Seed] Failed:', err);
    process.exit(1);
});
