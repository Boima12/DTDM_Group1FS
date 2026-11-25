import {
    Archive,
    FileAudio,
    FileCode2,
    FileImage,
    FileSpreadsheet,
    FileText,
    FileVideo,
    File,
} from 'lucide-react';
import { CATEGORY_STYLE, normalizeCategory } from '../utils/format.js';

const CODE_EXTS = new Set(['json', 'js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'sql', 'yaml', 'yml', 'sh', 'xml']);

export function FileTypeBadge({ file, size = 18, boxSize = 36 }) {
    const category = normalizeCategory(file?.metadata?.category);
    const ext = (file?.metadata?.extension || '').toLowerCase();
    const style = CATEGORY_STYLE[category] || CATEGORY_STYLE.other;

    let Icon = File;
    let color = style.color;
    let bg = style.bg;

    if (category === 'image') Icon = FileImage;
    else if (category === 'video') Icon = FileVideo;
    else if (category === 'audio') Icon = FileAudio;
    else if (category === 'archive') Icon = Archive;
    else if (ext === 'csv' || ext === 'xls' || ext === 'xlsx') {
        Icon = FileSpreadsheet;
        color = '#059669';
        bg = 'rgba(5, 150, 105, 0.14)';
    } else if (CODE_EXTS.has(ext)) {
        Icon = FileCode2;
        color = '#4f46e5';
        bg = 'rgba(79, 70, 229, 0.14)';
    } else if (category === 'document') {
        Icon = FileText;
    }

    return (
        <span
            style={{
                width: boxSize,
                height: boxSize,
                borderRadius: Math.max(6, Math.round(boxSize * 0.24)),
                background: bg,
                color,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}
        >
            <Icon size={size} />
        </span>
    );
}

export default FileTypeBadge;
