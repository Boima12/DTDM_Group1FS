const path = require('path');

const MIME_MAP = {
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    // Videos
    mp4: 'video/mp4',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    // Archives
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
};


/**
 * Categorize file and check previewability based on MIME type and extension
 * @param {Object} file - req.file object from Multer
 * @returns {Object} { category, previewable }
 */
const getFileMetadata = (file) => {
    const mimeType = file.mimetype.toLowerCase();
    const extension = file.originalname.split('.').pop().toLowerCase();

    // 1. Image
    if (mimeType.startsWith('image/')) {
        return {
            category: 'image',
            previewable: true // Most image formats (png, jpg, webp, gif, svg) preview natively in browsers
        };
    }

    // 2. Video
    if (mimeType.startsWith('video/')) {
        // Formats like mp4, webm, ogg are natively previewable in browsers
        const previewableVideoTypes = ['mp4', 'webm', 'ogg', 'mov'];
        return {
            category: 'video',
            previewable: previewableVideoTypes.includes(extension) || mimeType.includes('mp4') || mimeType.includes('webm')
        };
    }

    // 3. Audio / Music
    if (mimeType.startsWith('audio/')) {
        // Formats like mp3, wav, ogg are natively previewable
        const previewableAudioTypes = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];
        return {
            category: 'music',
            previewable: previewableAudioTypes.includes(extension) || mimeType.includes('mpeg') || mimeType.includes('wav')
        };
    }

    // 4. Document
    const documentMimes = [
        'application/pdf',
        'text/plain',
        'text/html',
        'text/markdown',
        'application/json'
    ];
    const documentExtensions = ['pdf', 'txt', 'html', 'md', 'json', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

    if (documentMimes.includes(mimeType) || documentExtensions.includes(extension)) {
        // PDF, plain text, HTML, and JSON preview natively in modern browsers
        const previewableDocMimes = ['application/pdf', 'text/plain', 'text/html', 'application/json'];
        const previewableDocExts = ['pdf', 'txt', 'html', 'json', 'md'];

        return {
            category: 'document',
            previewable: previewableDocMimes.includes(mimeType) || previewableDocExts.includes(extension)
        };
    }

    // 5. Other
    return {
        category: 'other',
        previewable: false
    };
};


const getMetadataFromFilename = (filename, fallbackContentType = 'application/octet-stream') => {
    const ext = path.extname(filename).replace('.', '').toLowerCase();
    const contentType = MIME_MAP[ext] || fallbackContentType;

    let category = 'other';
    let previewable = false;

    const previewableVideoTypes = ['mp4', 'webm', 'ogg', 'mov'];
    const previewableAudioTypes = ['mp3', 'wav', 'ogg', 'aac', 'm4a'];

    if (contentType.startsWith('image/')) {
        category = 'image';
        previewable = true;
    } else if (contentType.startsWith('video/')) {
        category = 'video';
        previewable = previewableVideoTypes.includes(ext) || contentType.includes('mp4') || contentType.includes('webm');
    } else if (contentType.startsWith('audio/')) {
        category = 'audio';
        previewable = previewableAudioTypes.includes(ext) || contentType.includes('mpeg') || contentType.includes('wav');
    } else if (
        contentType === 'application/pdf' ||
        contentType.startsWith('text/') ||
        contentType.includes('document') ||
        contentType.includes('sheet') ||
        contentType.includes('presentation') ||
        contentType.includes('msword') ||
        contentType.includes('ms-excel') ||
        contentType.includes('ms-powerpoint')
    ) {
        category = 'document';
        previewable = contentType === 'application/pdf' || contentType.startsWith('text/');
    }

    return {
        extension: ext,
        contentType,
        category,
        previewable,
    };
};


module.exports = { 
    getFileMetadata, 
    getMetadataFromFilename 
};