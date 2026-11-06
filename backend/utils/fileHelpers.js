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

module.exports = { getFileMetadata };