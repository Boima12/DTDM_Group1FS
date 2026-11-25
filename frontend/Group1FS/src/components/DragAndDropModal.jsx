import { useEffect, useRef, useState } from 'react';
import {
    CheckCircle2,
    Cloud,
    File,
    Folder,
    Trash2,
    UploadCloud,
    X,
} from 'lucide-react';
import api from '../utils/axios.js';
import { useApp } from '../context/AppContext.jsx';
import { formatSize } from '../utils/format.js';

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export default function DragAndDropModal({
    visible,
    currentFolderId = null,
    onClose,
}) {
    const { t, enqueueUploads } = useApp();
    const [files, setFiles] = useState([]);
    const [folders, setFolders] = useState([]);
    const [targetFolderId, setTargetFolderId] = useState(currentFolderId || '');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (!visible) return;
        setTargetFolderId(currentFolderId || '');
        setError('');
        api.get('/folders', { params: { all: 'true' } })
            .then((res) => setFolders(res.data?.folders || []))
            .catch(() => setFolders([]));
    }, [visible, currentFolderId]);

    useEffect(() => {
        if (!visible) return undefined;
        const onEsc = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [visible, onClose]);

    if (!visible) return null;

    const addFiles = (incoming) => {
        const accepted = [];
        const rejected = [];

        Array.from(incoming || []).forEach((file) => {
            if (file.size > MAX_FILE_SIZE) {
                rejected.push(`${file.name} (> 100 MB)`);
            } else if (!files.some((item) => item.file.name === file.name && item.file.size === file.size)) {
                accepted.push({
                    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
                    file,
                });
            }
        });

        setFiles((curr) => [...curr, ...accepted]);
        setError(rejected.length > 0 ? `Files exceeding 100 MB limit: ${rejected.join(', ')}` : '');
    };

    const handleStartUpload = () => {
        if (files.length === 0) return;
        const rawFiles = files.map((item) => item.file);
        enqueueUploads(rawFiles, {
            folderId: targetFolderId || null,
            description: description.trim(),
            tags: tags.trim(),
        });
        setFiles([]);
        setDescription('');
        setTags('');
        onClose?.();
    };

    const totalSize = files.reduce((sum, item) => sum + (item.file.size || 0), 0);

    return (
        <div
            className="g1-modal-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <section className="g1-modal-box" style={{ maxWidth: 620 }} role="dialog" aria-modal="true">
                <div style={{ height: 4, background: 'linear-gradient(90deg, #007a5c, #10b981, #3b82f6)' }} />

                <header
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border-subtle)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                background: 'var(--accent-soft)',
                                color: 'var(--accent)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Cloud size={19} />
                        </span>
                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t('uploadFiles')}</h2>
                    </div>
                    <button type="button" className="g1-icon-btn" onClick={onClose} aria-label={t('close')}>
                        <X size={18} />
                    </button>
                </header>

                <div style={{ padding: 20, overflowY: 'auto', display: 'grid', gap: 14 }}>
                    {/* Dropzone */}
                    <div
                        onDragEnter={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDragLeave={(e) => {
                            if (e.currentTarget === e.target) setIsDragging(false);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            addFiles(e.dataTransfer.files);
                        }}
                        style={{
                            border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border-strong)'}`,
                            borderRadius: 14,
                            padding: '28px 18px',
                            textAlign: 'center',
                            background: isDragging ? 'var(--accent-soft)' : 'var(--bg-app)',
                            transition: 'all 150ms ease',
                        }}
                    >
                        <div
                            style={{
                                width: 48,
                                height: 48,
                                margin: '0 auto 10px',
                                borderRadius: 14,
                                background: 'var(--accent-soft)',
                                color: 'var(--accent)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <UploadCloud size={26} />
                        </div>
                        <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600 }}>
                            {t('dropZoneTitle')}{' '}
                            <button
                                type="button"
                                onClick={() => inputRef.current?.click()}
                                style={{
                                    border: 0,
                                    background: 'transparent',
                                    color: 'var(--accent)',
                                    fontWeight: 700,
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    padding: 0,
                                }}
                            >
                                {t('browseComputer')}
                            </button>
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                            {t('maxFileNote')}
                        </p>
                        <input
                            ref={inputRef}
                            type="file"
                            multiple
                            hidden
                            onChange={(e) => {
                                addFiles(e.target.files);
                                e.target.value = '';
                            }}
                        />
                    </div>

                    {error && (
                        <div
                            role="alert"
                            style={{
                                padding: '9px 12px',
                                borderRadius: 9,
                                background: 'var(--danger-soft)',
                                color: 'var(--danger)',
                                fontSize: 12.5,
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Optional Metadata & Destination Folder */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                                <Folder size={13} /> {t('destinationFolder')}
                            </label>
                            <select
                                className="g1-input"
                                value={targetFolderId}
                                onChange={(e) => setTargetFolderId(e.target.value)}
                            >
                                <option value="">My Drive (Root)</option>
                                {folders.map((f) => (
                                    <option key={f._id} value={f._id}>
                                        {f.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                                {t('tagsOptional')}
                            </label>
                            <input
                                className="g1-input"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                placeholder="report, cloud, final"
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                            {t('descriptionOptional')}
                        </label>
                        <input
                            className="g1-input"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief note about these files..."
                        />
                    </div>

                    {/* Queue Preview */}
                    <div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 8,
                                fontSize: 12.5,
                            }}
                        >
                            <span style={{ fontWeight: 700 }}>
                                {t('uploadQueue')} ({files.length})
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)' }}>
                                <span className="mono">{formatSize(totalSize)}</span>
                                {files.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setFiles([])}
                                        style={{
                                            border: 0,
                                            background: 'transparent',
                                            color: 'var(--danger)',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {t('clearAll')}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div
                            style={{
                                maxHeight: 190,
                                overflowY: 'auto',
                                display: 'grid',
                                gap: 7,
                            }}
                        >
                            {files.length === 0 ? (
                                <div
                                    style={{
                                        padding: 16,
                                        borderRadius: 10,
                                        textAlign: 'center',
                                        fontSize: 12.5,
                                        color: 'var(--text-muted)',
                                        background: 'var(--bg-app)',
                                        border: '1px solid var(--border-subtle)',
                                    }}
                                >
                                    No files queued yet
                                </div>
                            ) : (
                                files.map(({ id, file }) => (
                                    <div
                                        key={id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '8px 10px',
                                            borderRadius: 10,
                                            background: 'var(--bg-app)',
                                            border: '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        <File size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {file.name}
                                            </div>
                                            <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {formatSize(file.size)} · ~{Math.max(1, Math.ceil(file.size / 261120))} GridFS chunk(s)
                                            </div>
                                        </div>
                                        <span
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: 'var(--accent-text)',
                                            }}
                                        >
                                            <CheckCircle2 size={13} /> Ready
                                        </span>
                                        <button
                                            type="button"
                                            className="g1-icon-btn"
                                            style={{ width: 28, height: 28 }}
                                            onClick={() => setFiles((curr) => curr.filter((i) => i.id !== id))}
                                            aria-label={`Remove ${file.name}`}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <footer
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 8,
                        padding: '14px 20px',
                        borderTop: '1px solid var(--border-subtle)',
                        background: 'var(--bg-subtle)',
                    }}
                >
                    <button type="button" className="g1-btn g1-btn-secondary" onClick={onClose}>
                        {t('cancel')}
                    </button>
                    <button
                        type="button"
                        className="g1-btn g1-btn-primary"
                        disabled={files.length === 0}
                        onClick={handleStartUpload}
                    >
                        <UploadCloud size={15} />
                        {t('startUpload')} ({files.length})
                    </button>
                </footer>
            </section>
        </div>
    );
}
