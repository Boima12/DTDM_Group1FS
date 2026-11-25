const path = require('path');

const MIME_MAP = {
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    avif: 'image/avif',
    // Videos
    mp4: 'video/mp4',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    m4v: 'video/x-m4v',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    flac: 'audio/flac',
    // Documents & Code/Text
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    json: 'application/json',
    xml: 'application/xml',
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    mjs: 'text/javascript',
    jsx: 'text/javascript',
    ts: 'text/typescript',
    tsx: 'text/typescript',
    py: 'text/x-python',
    java: 'text/x-java-source',
    c: 'text/x-c',
    cpp: 'text/x-c++',
    sql: 'application/sql',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    sh: 'text/x-shellscript',
    log: 'text/plain',
    env: 'text/plain',
    // Archives
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
};

const PREVIEWABLE_VIDEO_EXTS = new Set(['mp4', 'webm', 'ogg', 'mov', 'm4v']);
const PREVIEWABLE_AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac']);
const PREVIEWABLE_TEXT_EXTS = new Set([
    'txt', 'md', 'csv', 'json', 'xml', 'html', 'htm', 'css',
    'js', 'mjs', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp',
    'sql', 'yaml', 'yml', 'sh', 'log', 'env',
]);
const DOCUMENT_EXTS = new Set([
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    ...PREVIEWABLE_TEXT_EXTS,
]);
const ARCHIVE_EXTS = new Set(['zip', 'rar', '7z', 'tar', 'gz']);

const FORBIDDEN_FILENAME_CHARS = /[\\:*?"<>|/\x00-\x1f]/;

/**
 * Fix Multer/Busboy Latin-1 mojibake on UTF-8 filenames (especially Vietnamese).
 */
const decodeFilename = (rawName = '') => {
    if (!rawName || typeof rawName !== 'string') return 'untitled';
    try {
        if (/[\x80-\xff]/.test(rawName) && !/[^\x00-\xff]/.test(rawName)) {
            const decoded = Buffer.from(rawName, 'latin1').toString('utf8');
            if (decoded && !decoded.includes('\uFFFD')) {
                return decoded.normalize('NFC').trim() || 'untitled';
            }
        }
        return rawName.normalize('NFC').trim() || 'untitled';
    } catch {
        return rawName.trim() || 'untitled';
    }
};

const sanitizeFilename = (name = '') => {
    const base = path.basename(decodeFilename(name)).trim();
    const cleaned = base.replace(/[\\:*?"<>|/\x00-\x1f]+/g, '_').slice(0, 255);
    return cleaned || 'untitled';
};

const isValidFilename = (name = '') => {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 255) return false;
    if (trimmed === '.' || trimmed === '..') return false;
    return !FORBIDDEN_FILENAME_CHARS.test(trimmed);
};

const getExtension = (filename = '') => {
    const ext = path.extname(filename || '').replace(/^\./, '').toLowerCase();
    return ext;
};

/**
 * Normalize legacy category values (e.g. 'music' -> 'audio').
 */
const normalizeCategory = (category = 'other') => {
    const normalized = String(category || 'other').toLowerCase();
    if (normalized === 'music') return 'audio';
    if (['document', 'image', 'video', 'audio', 'archive', 'other'].includes(normalized)) {
        return normalized;
    }
    return 'other';
};

const classifyFile = (filename = '', inputMime = '') => {
    const extension = getExtension(filename);
    const mimeFromExt = MIME_MAP[extension];
    let contentType = (inputMime || '').toLowerCase().trim();

    if (!contentType || contentType === 'application/octet-stream') {
        contentType = mimeFromExt || 'application/octet-stream';
    } else if (extension === 'ogg' && contentType === 'application/ogg') {
        contentType = 'audio/ogg';
    } else if (extension === 'mov' && !contentType.startsWith('video/')) {
        contentType = 'video/quicktime';
    }

    if (contentType.startsWith('image/')) {
        return {
            extension,
            contentType,
            category: 'image',
            previewable: true,
        };
    }

    if (contentType.startsWith('video/')) {
        return {
            extension,
            contentType,
            category: 'video',
            previewable:
                PREVIEWABLE_VIDEO_EXTS.has(extension) ||
                contentType.includes('mp4') ||
                contentType.includes('webm') ||
                contentType.includes('quicktime'),
        };
    }

    if (contentType.startsWith('audio/')) {
        return {
            extension,
            contentType,
            category: 'audio',
            previewable:
                PREVIEWABLE_AUDIO_EXTS.has(extension) ||
                contentType.includes('mpeg') ||
                contentType.includes('wav') ||
                contentType.includes('ogg'),
        };
    }

    if (ARCHIVE_EXTS.has(extension) || contentType.includes('zip') || contentType.includes('tar') || contentType.includes('compressed')) {
        return {
            extension,
            contentType,
            category: 'archive',
            previewable: false,
        };
    }

    if (
        contentType === 'application/pdf' ||
        contentType.startsWith('text/') ||
        contentType === 'application/json' ||
        contentType === 'application/xml' ||
        contentType === 'application/sql' ||
        contentType.includes('document') ||
        contentType.includes('sheet') ||
        contentType.includes('presentation') ||
        contentType.includes('msword') ||
        contentType.includes('ms-excel') ||
        contentType.includes('ms-powerpoint') ||
        DOCUMENT_EXTS.has(extension)
    ) {
        const previewable =
            contentType === 'application/pdf' ||
            contentType.startsWith('text/') ||
            contentType === 'application/json' ||
            contentType === 'application/xml' ||
            contentType === 'application/sql' ||
            extension === 'pdf' ||
            PREVIEWABLE_TEXT_EXTS.has(extension);

        return {
            extension,
            contentType,
            category: 'document',
            previewable,
        };
    }

    return {
        extension,
        contentType,
        category: 'other',
        previewable: false,
    };
};

const getFileMetadata = (file) => classifyFile(file?.originalname || '', file?.mimetype || '');

const getMetadataFromFilename = (filename, fallbackContentType = 'application/octet-stream') => {
    const ext = getExtension(filename);
    return classifyFile(filename, MIME_MAP[ext] || fallbackContentType);
};

const isDangerousInlineMime = (contentType = '', extension = '') => {
    const ct = contentType.toLowerCase();
    const ext = extension.toLowerCase();
    return ct === 'text/html' || ct === 'image/svg+xml' || ext === 'html' || ext === 'htm' || ext === 'svg';
};

module.exports = {
    MIME_MAP,
    decodeFilename,
    sanitizeFilename,
    isValidFilename,
    getExtension,
    normalizeCategory,
    classifyFile,
    getFileMetadata,
    getMetadataFromFilename,
    isDangerousInlineMime,
};
