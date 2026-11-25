export const formatSize = (bytes = 0) => {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = n / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unit]}`;
};

export const formatExactBytes = (bytes = 0) => {
    return `${new Intl.NumberFormat('en-US').format(Number(bytes) || 0)} bytes`;
};

export const formatDate = (dateInput, lang = 'en') => {
    if (!dateInput) return '—';
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(d);
};

export const formatTimestampFull = (dateInput) => {
    if (!dateInput) return '—';
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(d) + ' (GMT+7)';
};

export const formatRelativeTime = (dateInput, lang = 'en') => {
    if (!dateInput) return '';
    const diffSec = Math.floor((Date.now() - new Date(dateInput).getTime()) / 1000);
    if (diffSec < 60) return lang === 'vi' ? 'Vừa xong' : 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return lang === 'vi' ? `${diffMin} phút trước` : `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return lang === 'vi' ? `${diffHr} giờ trước` : `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return lang === 'vi' ? `${diffDay} ngày trước` : `${diffDay}d ago`;
    return formatDate(dateInput, lang);
};

export const formatSpeed = (bytesPerSec = 0) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '—';
    return `${formatSize(bytesPerSec)}/s`;
};

export const formatEta = (seconds = 0) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${mins}m ${secs}s`;
};

export const formatUptime = (seconds = 0) => {
    const s = Math.max(0, Math.floor(seconds));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const rem = s % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${rem}s`;
    if (m > 0) return `${m}m ${rem}s`;
    return `${rem}s`;
};

export const getDaysRemainingInTrash = (trashDate, retentionDays = 30) => {
    if (!trashDate) return retentionDays;
    const elapsedDays = (Date.now() - new Date(trashDate).getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(retentionDays - elapsedDays));
};

export const normalizeCategory = (raw = 'other') => {
    const val = String(raw || 'other').toLowerCase();
    return val === 'music' ? 'audio' : val;
};

export const CATEGORY_STYLE = {
    document: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)', bar: '#ef4444' },
    image: { color: '#007a5c', bg: 'rgba(0, 122, 92, 0.14)', bar: '#10b981' },
    video: { color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.14)', bar: '#8b5cf6' },
    audio: { color: '#d97706', bg: 'rgba(217, 119, 6, 0.14)', bar: '#f59e0b' },
    archive: { color: '#2563eb', bg: 'rgba(37, 99, 235, 0.14)', bar: '#3b82f6' },
    other: { color: '#475569', bg: 'rgba(71, 85, 105, 0.14)', bar: '#64748b' },
    trash: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.14)', bar: '#f43f5e' },
};

export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            return true;
        } catch {
            return false;
        }
    }
};

export const parseCsvPreview = (text = '', maxRows = 100) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, maxRows + 1);
    return lines.map((line) => {
        const cells = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i += 1) {
            const ch = line[i];
            if (ch === '"' && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
                cells.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        cells.push(current.trim());
        return cells;
    });
};

export const triggerBlobDownload = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};
