import { useEffect, useRef, useState } from 'react';
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Copy,
    Download,
    Info,
    Layers,
    LoaderCircle,
    Maximize2,
    QrCode,
    RotateCcw,
    RotateCw,
    ShieldCheck,
    Trash2,
    X,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import api, { buildFileStreamUrl } from '../utils/axios.js';
import { useApp } from '../context/AppContext.jsx';
import {
    copyToClipboard,
    formatExactBytes,
    formatSize,
    formatTimestampFull,
    parseCsvPreview,
} from '../utils/format.js';
import FileTypeBadge from './FileIcon.jsx';

const TEXT_EXTS = new Set([
    'txt', 'md', 'csv', 'json', 'xml', 'html', 'htm', 'css',
    'js', 'mjs', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'sql', 'yaml', 'yml', 'sh', 'log',
]);

export default function PreviewModal({
    file,
    files = [],
    visible,
    onClose,
    onNavigate,
    onShare,
    onOpenDetails,
    onTrashChanged,
}) {
    const { t, showToast, triggerRefresh } = useApp();
    const [inspectorOpen, setInspectorOpen] = useState(true);
    const [zoom, setZoom] = useState(100);
    const [rotation, setRotation] = useState(0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [textContent, setTextContent] = useState('');
    const [textLoading, setTextLoading] = useState(false);
    const [textError, setTextError] = useState('');
    const [details, setDetails] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [isTrashed, setIsTrashed] = useState(false);
    const [copiedKey, setCopiedKey] = useState('');
    const dragOrigin = useRef(null);
    const canvasRef = useRef(null);

    const contentType = (file?.metadata?.contentType || '').toLowerCase();
    const ext = (file?.metadata?.extension || '').toLowerCase();
    const isImage = contentType.startsWith('image/') && ext !== 'svg';
    const isVideo = contentType.startsWith('video/');
    const isAudio = contentType.startsWith('audio/');
    const isPdf = contentType === 'application/pdf' || ext === 'pdf';
    const isCsv = ext === 'csv' || contentType === 'text/csv';
    const isText =
        !isPdf &&
        !isImage &&
        !isVideo &&
        !isAudio &&
        (contentType.startsWith('text/') || contentType === 'application/json' || TEXT_EXTS.has(ext));

    const streamUrl = file ? buildFileStreamUrl(file._id, 'preview') : '';
    const downloadUrl = file ? buildFileStreamUrl(file._id, 'download') : '';

    const currentIndex = file ? files.findIndex((f) => f._id === file._id) : -1;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex >= 0 && currentIndex < files.length - 1;

    // Reset viewport & load live metadata when file changes
    useEffect(() => {
        if (!visible || !file) return;
        setZoom(100);
        setRotation(0);
        setOffset({ x: 0, y: 0 });
        setIsTrashed(Boolean(file.metadata?.markAsTrash));
        setDetails(null);

        let cancelled = false;
        api.get(`/fsfiles/list/specificFile/${file._id}`)
            .then((res) => {
                if (!cancelled) setDetails(res.data);
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [visible, file]);

    // Load text/JSON/CSV content safely
    useEffect(() => {
        if (!visible || !file || !isText) {
            setTextContent('');
            setTextError('');
            setTextLoading(false);
            return;
        }
        let cancelled = false;
        setTextLoading(true);
        setTextError('');
        api.get(`/fsfiles/download/${file._id}`, { responseType: 'text', transformResponse: [(d) => d] })
            .then((res) => {
                if (cancelled) return;
                let txt = String(res.data || '');
                if (ext === 'json') {
                    try {
                        txt = JSON.stringify(JSON.parse(txt), null, 2);
                    } catch {
                        // keep raw
                    }
                }
                setTextContent(txt.slice(0, 300_000));
            })
            .catch((err) => {
                if (!cancelled) setTextError(err.response?.data?.msg || err.message);
            })
            .finally(() => {
                if (!cancelled) setTextLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [visible, file, isText, ext]);

    // Keyboard navigation: Esc, ArrowLeft, ArrowRight
    useEffect(() => {
        if (!visible) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
            else if (e.key === 'ArrowLeft' && hasPrev) onNavigate?.(files[currentIndex - 1]);
            else if (e.key === 'ArrowRight' && hasNext) onNavigate?.(files[currentIndex + 1]);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [visible, hasPrev, hasNext, currentIndex, files, onClose, onNavigate]);

    // Non-passive wheel zoom STRICTLY for images (never breaks text/PDF scrolling!)
    useEffect(() => {
        const el = canvasRef.current;
        if (!visible || !el || !isImage) return undefined;
        const onWheel = (e) => {
            e.preventDefault();
            setZoom((z) => Math.min(250, Math.max(40, z + (e.deltaY > 0 ? -10 : 10))));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [visible, isImage]);

    if (!visible || !file) return null;

    const handleCopy = async (key, val) => {
        const ok = await copyToClipboard(val);
        if (ok) {
            setCopiedKey(key);
            window.setTimeout(() => setCopiedKey(''), 1500);
        }
    };

    // REAL Move to Trash / Restore API inside Preview!
    const handleToggleTrash = async () => {
        if (actionLoading) return;
        setActionLoading(true);
        try {
            if (!isTrashed) {
                await api.put(`/fsfiles/update/markFilesAsTrash/${file._id}`, { ids: [file._id] });
                setIsTrashed(true);
                showToast(`Moved "${file.filename}" to Trash`, { type: 'info' });
            } else {
                await api.put(`/fsfiles/update/restore/${file._id}`);
                setIsTrashed(false);
                showToast(`Restored "${file.filename}" from Trash`, { type: 'success' });
            }
            triggerRefresh();
            onTrashChanged?.();
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    const csvRows = isCsv && textContent ? parseCsvPreview(textContent, 80) : [];
    const chunkCount = details?.actualChunkCount ?? file.metadata?.estimatedChunks ?? 1;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1500,
                display: 'flex',
                background: '#0f172a',
                color: '#f8fafc',
            }}
            role="dialog"
            aria-modal="true"
        >
            {/* Main Preview Stage */}
            <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <header
                    style={{
                        height: 60,
                        padding: '0 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        background: '#111c2d',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <FileTypeBadge file={file} size={17} boxSize={34} />
                        <div style={{ minWidth: 0 }}>
                            <div
                                title={file.filename}
                                style={{
                                    fontWeight: 700,
                                    fontSize: 14,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '34vw',
                                }}
                            >
                                {file.filename}
                            </div>
                            <div className="mono" style={{ fontSize: 11, color: '#94a3b8' }}>
                                {formatSize(file.length)} · {chunkCount} chunk{chunkCount === 1 ? '' : 's'} · v{file.metadata?.version || 1}
                            </div>
                        </div>
                    </div>

                    {/* Image viewport controls */}
                    {isImage && (
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 8px',
                                borderRadius: 10,
                                background: 'rgba(255,255,255,0.08)',
                            }}
                        >
                            <button
                                type="button"
                                className="g1-icon-btn"
                                style={{ color: '#e2e8f0', width: 30, height: 30 }}
                                onClick={() => setZoom((z) => Math.max(40, z - 15))}
                            >
                                <ZoomOut size={15} />
                            </button>
                            <span className="mono" style={{ fontSize: 12, minWidth: 44, textAlign: 'center' }}>
                                {zoom}%
                            </span>
                            <button
                                type="button"
                                className="g1-icon-btn"
                                style={{ color: '#e2e8f0', width: 30, height: 30 }}
                                onClick={() => setZoom((z) => Math.min(250, z + 15))}
                            >
                                <ZoomIn size={15} />
                            </button>
                            <button
                                type="button"
                                className="g1-icon-btn"
                                style={{ color: '#e2e8f0', width: 30, height: 30 }}
                                onClick={() => {
                                    setZoom(100);
                                    setRotation(0);
                                    setOffset({ x: 0, y: 0 });
                                }}
                                title="Reset view"
                            >
                                <Maximize2 size={14} />
                            </button>
                            <button
                                type="button"
                                className="g1-icon-btn"
                                style={{ color: '#e2e8f0', width: 30, height: 30 }}
                                onClick={() => setRotation((r) => (r + 90) % 360)}
                                title="Rotate 90°"
                            >
                                <RotateCw size={14} />
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <a
                            href={downloadUrl}
                            download={file.filename}
                            className="g1-btn g1-btn-primary"
                            style={{ textDecoration: 'none', padding: '7px 12px' }}
                        >
                            <Download size={14} />
                            <span>{t('download')}</span>
                        </a>
                        {onShare && (
                            <button
                                type="button"
                                className="g1-icon-btn"
                                style={{ color: '#e2e8f0', background: 'rgba(255,255,255,0.08)' }}
                                title={t('shareQr')}
                                onClick={() => onShare(file)}
                            >
                                <QrCode size={16} />
                            </button>
                        )}
                        <button
                            type="button"
                            className="g1-icon-btn"
                            style={{
                                color: inspectorOpen ? '#10b981' : '#e2e8f0',
                                background: inspectorOpen ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.08)',
                            }}
                            title="Toggle Inspector"
                            onClick={() => setInspectorOpen((v) => !v)}
                        >
                            <Info size={16} />
                        </button>
                        <button
                            type="button"
                            className="g1-icon-btn"
                            style={{ color: '#e2e8f0', background: 'rgba(255,255,255,0.08)' }}
                            onClick={onClose}
                            aria-label={t('close')}
                        >
                            <X size={17} />
                        </button>
                    </div>
                </header>

                {/* Canvas */}
                <div
                    ref={canvasRef}
                    style={{
                        flex: 1,
                        minHeight: 0,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        padding: 24,
                    }}
                >
                    {/* Prev / Next Navigation */}
                    {hasPrev && (
                        <button
                            type="button"
                            onClick={() => onNavigate?.(files[currentIndex - 1])}
                            aria-label="Previous file"
                            style={{
                                position: 'absolute',
                                left: 16,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                zIndex: 10,
                                width: 42,
                                height: 42,
                                borderRadius: '50%',
                                border: '1px solid rgba(255,255,255,0.16)',
                                background: 'rgba(15,23,42,0.75)',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    {hasNext && (
                        <button
                            type="button"
                            onClick={() => onNavigate?.(files[currentIndex + 1])}
                            aria-label="Next file"
                            style={{
                                position: 'absolute',
                                right: 16,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                zIndex: 10,
                                width: 42,
                                height: 42,
                                borderRadius: '50%',
                                border: '1px solid rgba(255,255,255,0.16)',
                                background: 'rgba(15,23,42,0.75)',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <ChevronRight size={20} />
                        </button>
                    )}

                    {/* IMAGE with smooth pan/zoom/rotate */}
                    {isImage && (
                        <div
                            onPointerDown={(e) => {
                                dragOrigin.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
                                e.currentTarget.setPointerCapture(e.pointerId);
                            }}
                            onPointerMove={(e) => {
                                if (!dragOrigin.current) return;
                                setOffset({
                                    x: dragOrigin.current.ox + e.clientX - dragOrigin.current.x,
                                    y: dragOrigin.current.oy + e.clientY - dragOrigin.current.y,
                                });
                            }}
                            onPointerUp={() => {
                                dragOrigin.current = null;
                            }}
                            style={{
                                cursor: 'grab',
                                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom / 100}) rotate(${rotation}deg)`,
                                transition: dragOrigin.current ? 'none' : 'transform 120ms ease-out',
                            }}
                        >
                            <img
                                src={streamUrl}
                                alt={file.filename}
                                draggable="false"
                                style={{
                                    maxWidth: '78vw',
                                    maxHeight: '78vh',
                                    borderRadius: 10,
                                    boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
                                }}
                            />
                        </div>
                    )}

                    {/* VIDEO — Direct HTTP 206 Range Streaming (pointer-safe controls!) */}
                    {isVideo && (
                        <video
                            key={file._id}
                            src={streamUrl}
                            controls
                            playsInline
                            preload="metadata"
                            style={{
                                maxWidth: '82%',
                                maxHeight: '80vh',
                                borderRadius: 12,
                                background: '#000',
                                boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
                            }}
                        />
                    )}

                    {/* AUDIO — Direct HTTP 206 Range Streaming */}
                    {isAudio && (
                        <div
                            style={{
                                width: 'min(480px, 90%)',
                                padding: 28,
                                borderRadius: 16,
                                background: '#1e293b',
                                border: '1px solid rgba(255,255,255,0.1)',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                <FileTypeBadge file={file} size={30} boxSize={62} />
                            </div>
                            <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>{file.filename}</h3>
                            <p className="mono" style={{ margin: '0 0 18px', fontSize: 12, color: '#94a3b8' }}>
                                HTTP 206 Range Stream · {formatSize(file.length)}
                            </p>
                            <audio key={file._id} src={streamUrl} controls style={{ width: '100%' }} />
                        </div>
                    )}

                    {/* PDF */}
                    {isPdf && (
                        <iframe
                            key={file._id}
                            src={streamUrl}
                            title={file.filename}
                            style={{
                                width: '90%',
                                height: '84vh',
                                border: 0,
                                borderRadius: 10,
                                background: '#fff',
                            }}
                        />
                    )}

                    {/* CSV TABLE OR CODE/TEXT */}
                    {isText && (
                        <div
                            style={{
                                width: 'min(920px, 92%)',
                                maxHeight: '82vh',
                                overflow: 'auto',
                                borderRadius: 12,
                                background: '#111827',
                                border: '1px solid rgba(255,255,255,0.12)',
                                padding: 18,
                            }}
                        >
                            {textLoading && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8' }}>
                                    <LoaderCircle size={16} className="g1-spin" /> Loading content...
                                </div>
                            )}
                            {textError && <div style={{ color: '#f87171' }}>{textError}</div>}
                            {!textLoading && !textError && isCsv && csvRows.length > 0 && (
                                <table
                                    style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontSize: 12.5,
                                        color: '#e2e8f0',
                                    }}
                                >
                                    <thead>
                                        <tr>
                                            {csvRows[0].map((col, idx) => (
                                                <th
                                                    key={idx}
                                                    style={{
                                                        textAlign: 'left',
                                                        padding: '8px 10px',
                                                        borderBottom: '1px solid #334155',
                                                        background: '#1e293b',
                                                        color: '#34d399',
                                                    }}
                                                >
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {csvRows.slice(1).map((row, rIdx) => (
                                            <tr key={rIdx}>
                                                {row.map((cell, cIdx) => (
                                                    <td
                                                        key={cIdx}
                                                        className="mono"
                                                        style={{
                                                            padding: '7px 10px',
                                                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                        }}
                                                    >
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {!textLoading && !textError && !isCsv && (
                                <pre
                                    className="mono"
                                    style={{
                                        margin: 0,
                                        fontSize: 12.5,
                                        lineHeight: 1.6,
                                        color: '#e2e8f0',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {textContent}
                                </pre>
                            )}
                        </div>
                    )}

                    {/* UNSUPPORTED FORMAT FALLBACK */}
                    {!isImage && !isVideo && !isAudio && !isPdf && !isText && (
                        <div
                            style={{
                                padding: 32,
                                borderRadius: 16,
                                background: '#1e293b',
                                textAlign: 'center',
                                maxWidth: 420,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                <FileTypeBadge file={file} size={28} boxSize={60} />
                            </div>
                            <h3 style={{ margin: '0 0 8px' }}>Preview not available for .{ext || 'binary'}</h3>
                            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#94a3b8' }}>
                                Download the file to open it locally on your computer.
                            </p>
                            <a
                                href={downloadUrl}
                                download={file.filename}
                                className="g1-btn g1-btn-primary"
                                style={{ textDecoration: 'none' }}
                            >
                                <Download size={15} /> {t('download')}
                            </a>
                        </div>
                    )}
                </div>
            </section>

            {/* Right Inspector Sidebar (LIVE MongoDB Cluster + Render Node + Real Actions!) */}
            {inspectorOpen && (
                <aside
                    style={{
                        width: 340,
                        minWidth: 320,
                        background: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        borderLeft: '1px solid var(--border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflowY: 'auto',
                    }}
                >
                    <header
                        style={{
                            height: 60,
                            padding: '0 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid var(--border-subtle)',
                        }}
                    >
                        <strong style={{ fontSize: 14 }}>File Inspector</strong>
                        <button type="button" className="g1-icon-btn" onClick={() => setInspectorOpen(false)}>
                            <ChevronRight size={17} />
                        </button>
                    </header>

                    <div style={{ padding: 16, display: 'grid', gap: 14, flex: 1 }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: 12,
                                borderRadius: 12,
                                background: 'var(--bg-subtle)',
                            }}
                        >
                            <FileTypeBadge file={file} size={20} boxSize={40} />
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, wordBreak: 'break-word' }}>{file.filename}</div>
                                <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    {formatSize(file.length)} ({formatExactBytes(file.length)})
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: 10, fontSize: 12.5 }}>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>MIME Type</div>
                                <code style={{ fontSize: 12 }}>{file.metadata?.contentType || 'application/octet-stream'}</code>
                            </div>

                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>GridFS Allocation</div>
                                <code style={{ fontSize: 12 }}>
                                    {formatSize(file.length)} ({chunkCount} × 255 KiB chunk{chunkCount === 1 ? '' : 's'})
                                </code>
                            </div>

                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Upload Timestamp</div>
                                <code style={{ fontSize: 12 }}>{formatTimestampFull(file.uploadDate)}</code>
                            </div>

                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Document ObjectId</div>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '6px 8px',
                                        borderRadius: 8,
                                        background: 'var(--bg-subtle)',
                                    }}
                                >
                                    <code style={{ fontSize: 11.5 }}>{file._id}</code>
                                    <button
                                        type="button"
                                        className="g1-icon-btn"
                                        style={{ width: 26, height: 26 }}
                                        onClick={() => handleCopy('id', file._id)}
                                    >
                                        {copiedKey === 'id' ? <Check size={13} /> : <Copy size={13} />}
                                    </button>
                                </div>
                            </div>

                            {file.metadata?.sha256 && (
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <ShieldCheck size={12} style={{ color: 'var(--accent)' }} /> SHA-256 Checksum
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '6px 8px',
                                            borderRadius: 8,
                                            background: 'var(--bg-subtle)',
                                        }}
                                    >
                                        <code style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {file.metadata.sha256.slice(0, 22)}...
                                        </code>
                                        <button
                                            type="button"
                                            className="g1-icon-btn"
                                            style={{ width: 26, height: 26 }}
                                            onClick={() => handleCopy('sha', file.metadata.sha256)}
                                        >
                                            {copiedKey === 'sha' ? <Check size={13} /> : <Copy size={13} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* LIVE Physical Storage Coordinates from Backend */}
                            <div
                                style={{
                                    padding: 11,
                                    borderRadius: 10,
                                    background: 'var(--bg-app)',
                                    border: '1px solid var(--border-subtle)',
                                    display: 'grid',
                                    gap: 6,
                                    fontSize: 11.5,
                                }}
                                className="mono"
                            >
                                <div style={{ fontWeight: 700, color: 'var(--accent-text)', fontFamily: 'var(--font-sans)' }}>
                                    Live Cloud Coordinates
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Bucket:</span>
                                    <strong>fs ({details?.clusterInfo?.databaseName || 'GROUP1FS'})</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Cluster:</span>
                                    <strong style={{ textAlign: 'right', wordBreak: 'break-all' }}>
                                        {details?.clusterInfo?.host || 'Loading...'}
                                    </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Node:</span>
                                    <strong style={{ textAlign: 'right', wordBreak: 'break-all' }}>
                                        {details?.renderInfo?.instanceId || 'Loading...'}
                                    </strong>
                                </div>
                            </div>

                            {onOpenDetails && (
                                <button
                                    type="button"
                                    className="g1-btn g1-btn-secondary"
                                    style={{ width: '100%' }}
                                    onClick={() => {
                                        onClose?.();
                                        onOpenDetails(file, 'chunks');
                                    }}
                                >
                                    <Layers size={15} />
                                    {t('chunkXrayTitle')}
                                </button>
                            )}
                        </div>

                        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                            <button
                                type="button"
                                disabled={actionLoading}
                                onClick={handleToggleTrash}
                                className={`g1-btn ${isTrashed ? 'g1-btn-primary' : 'g1-btn-danger-soft'}`}
                                style={{ width: '100%' }}
                            >
                                {isTrashed ? <RotateCcw size={15} /> : <Trash2 size={15} />}
                                {isTrashed ? t('restore') : t('moveToTrash')}
                            </button>
                        </div>
                    </div>
                </aside>
            )}
        </div>
    );
}
