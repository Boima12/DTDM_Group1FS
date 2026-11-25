import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Check,
    CheckCircle2,
    Copy,
    Download,
    History,
    Info,
    Layers,
    LoaderCircle,
    RotateCcw,
    Save,
    ShieldAlert,
    ShieldCheck,
    UploadCloud,
    X,
} from 'lucide-react';
import api, { buildFileStreamUrl } from '../utils/axios.js';
import { useApp } from '../context/AppContext.jsx';
import {
    copyToClipboard,
    formatExactBytes,
    formatSize,
    formatTimestampFull,
} from '../utils/format.js';
import FileTypeBadge from './FileIcon.jsx';

export default function FileDetailModal({
    file,
    visible,
    initialTab = 'overview',
    onClose,
}) {
    const { t, showToast, triggerRefresh } = useApp();
    const [tab, setTab] = useState(initialTab);
    const [details, setDetails] = useState(null);
    const [chunksData, setChunksData] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [loadingChunks, setLoadingChunks] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verifyReport, setVerifyReport] = useState(null);
    const [description, setDescription] = useState('');
    const [tagsText, setTagsText] = useState('');
    const [savingMeta, setSavingMeta] = useState(false);
    const [uploadingVer, setUploadingVer] = useState(false);
    const [copiedKey, setCopiedKey] = useState('');
    const versionInputRef = useRef(null);

    const loadDetails = useCallback(async (fileId) => {
        setLoadingDetails(true);
        try {
            const res = await api.get(`/fsfiles/list/specificFile/${fileId}`);
            setDetails(res.data);
            setDescription(res.data.file?.metadata?.description || '');
            setTagsText((res.data.file?.metadata?.tags || []).join(', '));
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        } finally {
            setLoadingDetails(false);
        }
    }, [showToast]);

    const loadChunks = useCallback(async (fileId) => {
        setLoadingChunks(true);
        try {
            const res = await api.get(`/fsfiles/${fileId}/chunks`);
            setChunksData(res.data);
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        } finally {
            setLoadingChunks(false);
        }
    }, [showToast]);

    useEffect(() => {
        if (!visible || !file) return;
        setTab(initialTab || 'overview');
        setVerifyReport(null);
        setChunksData(null);
        loadDetails(file._id);
    }, [visible, file, initialTab, loadDetails]);

    useEffect(() => {
        if (visible && file && tab === 'chunks' && !chunksData && !loadingChunks) {
            loadChunks(file._id);
        }
    }, [visible, file, tab, chunksData, loadingChunks, loadChunks]);

    useEffect(() => {
        if (!visible) return undefined;
        const onEsc = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [visible, onClose]);

    if (!visible || !file) return null;

    const liveFile = details?.file || file;

    const handleCopy = async (key, value) => {
        if (await copyToClipboard(value)) {
            setCopiedKey(key);
            window.setTimeout(() => setCopiedKey(''), 1400);
        }
    };

    const handleSaveMeta = async () => {
        setSavingMeta(true);
        try {
            const tags = tagsText.split(',').map((s) => s.trim()).filter(Boolean);
            await api.patch(`/fsfiles/${liveFile._id}/details`, { description, tags });
            showToast('Metadata updated successfully.', { type: 'success' });
            triggerRefresh();
            await loadDetails(liveFile._id);
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        } finally {
            setSavingMeta(false);
        }
    };

    const handleVerifyIntegrity = async () => {
        setVerifying(true);
        try {
            const res = await api.post(`/fsfiles/${liveFile._id}/verify`);
            setVerifyReport(res.data.report);
            showToast(res.data.msg, { type: res.data.report?.valid ? 'success' : 'error' });
            loadDetails(liveFile._id);
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        } finally {
            setVerifying(false);
        }
    };

    const handleUploadNewVersion = async (event) => {
        const nextFile = event.target.files?.[0];
        event.target.value = '';
        if (!nextFile) return;

        setUploadingVer(true);
        try {
            const fd = new FormData();
            fd.append('file', nextFile);
            const res = await api.post(`/fsfiles/${liveFile._id}/versions`, fd);
            showToast(res.data.msg, { type: 'success' });
            triggerRefresh();
            await loadDetails(res.data.fileId);
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        } finally {
            setUploadingVer(false);
        }
    };

    const handleRestoreVersion = async (versionId) => {
        try {
            const res = await api.put(`/fsfiles/${versionId}/versions/restore`);
            showToast(res.data.msg, { type: 'success' });
            triggerRefresh();
            await loadDetails(versionId);
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        }
    };

    const tabs = [
        { id: 'overview', label: t('overviewTab'), icon: Info },
        { id: 'chunks', label: t('chunksTab'), icon: Layers },
        { id: 'versions', label: `${t('versionsTab')} (${details?.versions?.length || 1})`, icon: History },
    ];

    return (
        <div
            className="g1-modal-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <section className="g1-modal-box" style={{ maxWidth: 680 }} role="dialog" aria-modal="true">
                <header
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border-subtle)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <FileTypeBadge file={liveFile} size={18} boxSize={36} />
                        <div style={{ minWidth: 0 }}>
                            <h2
                                style={{
                                    margin: 0,
                                    fontSize: 15.5,
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {liveFile.filename}
                            </h2>
                            <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                                {formatSize(liveFile.length)} · v{liveFile.metadata?.version || 1}
                            </div>
                        </div>
                    </div>
                    <button type="button" className="g1-icon-btn" onClick={onClose} aria-label={t('close')}>
                        <X size={18} />
                    </button>
                </header>

                {/* Tab bar */}
                <div
                    style={{
                        display: 'flex',
                        gap: 6,
                        padding: '10px 20px',
                        borderBottom: '1px solid var(--border-subtle)',
                        background: 'var(--bg-subtle)',
                    }}
                >
                    {tabs.map((item) => {
                        const Icon = item.icon;
                        const active = tab === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setTab(item.id)}
                                className="g1-btn"
                                style={{
                                    padding: '6px 12px',
                                    fontSize: 12.5,
                                    background: active ? 'var(--accent)' : 'transparent',
                                    color: active ? '#fff' : 'var(--text-secondary)',
                                }}
                            >
                                <Icon size={14} />
                                {item.label}
                            </button>
                        );
                    })}
                </div>

                <div style={{ padding: 20, overflowY: 'auto', display: 'grid', gap: 14 }}>
                    {loadingDetails && !details && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                            <LoaderCircle size={16} className="g1-spin" /> Loading live metadata...
                        </div>
                    )}

                    {/* TAB 1: OVERVIEW */}
                    {tab === 'overview' && (
                        <>
                            <div
                                style={{
                                    display: 'grid',
                                    gap: 8,
                                    padding: 14,
                                    borderRadius: 12,
                                    background: 'var(--bg-app)',
                                    border: '1px solid var(--border-subtle)',
                                    fontSize: 12.5,
                                }}
                            >
                                {[
                                    ['Initial Original Name', liveFile.metadata?.initialOriginalName || liveFile.filename, 'init'],
                                    ['MIME Type', liveFile.metadata?.contentType || 'application/octet-stream', null],
                                    ['Exact Size', `${formatSize(liveFile.length)} (${formatExactBytes(liveFile.length)})`, null],
                                    ['GridFS Chunks', `${details?.actualChunkCount ?? liveFile.metadata?.estimatedChunks ?? 1} chunks (255 KiB/chunk)`, null],
                                    ['Upload Timestamp', formatTimestampFull(liveFile.uploadDate), null],
                                    ['Document ObjectId', liveFile._id, 'oid'],
                                    ['SHA-256 Digest', liveFile.metadata?.sha256 || 'Not verified yet (click Chunk X-Ray)', liveFile.metadata?.sha256 ? 'sha' : null],
                                ].map(([label, val, cKey]) => (
                                    <div
                                        key={label}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: 12,
                                            paddingBottom: 6,
                                            borderBottom: '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                            <code
                                                style={{
                                                    fontSize: 12,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    maxWidth: 340,
                                                    whiteSpace: 'nowrap',
                                                }}
                                                title={String(val)}
                                            >
                                                {val}
                                            </code>
                                            {cKey && (
                                                <button
                                                    type="button"
                                                    className="g1-icon-btn"
                                                    style={{ width: 24, height: 24 }}
                                                    onClick={() => handleCopy(cKey, String(val))}
                                                >
                                                    {copiedKey === cKey ? <Check size={12} /> : <Copy size={12} />}
                                                </button>
                                            )}
                                        </span>
                                    </div>
                                ))}

                                {/* Real Cloud Coordinates */}
                                <div style={{ paddingTop: 4, display: 'grid', gap: 4 }} className="mono">
                                    <div style={{ fontWeight: 700, color: 'var(--accent-text)', fontFamily: 'var(--font-sans)', fontSize: 12 }}>
                                        Live Physical Cloud Coordinates
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                                        <span style={{ color: 'var(--text-muted)' }}>MongoDB Cluster:</span>
                                        <strong>{details?.clusterInfo?.host || '—'} ({details?.clusterInfo?.databaseName || 'GROUP1FS'})</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Runtime Node:</span>
                                        <strong>{details?.renderInfo?.instanceId || '—'} ({details?.renderInfo?.region || 'local'})</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Editable Description & Tags */}
                            <div style={{ display: 'grid', gap: 10 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                                        {t('descriptionOptional')}
                                    </label>
                                    <textarea
                                        className="g1-input"
                                        rows={2}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add notes or context for this file..."
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                                        {t('tagsOptional')}
                                    </label>
                                    <input
                                        className="g1-input"
                                        value={tagsText}
                                        onChange={(e) => setTagsText(e.target.value)}
                                        placeholder="cloud, gridfs, capstone"
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        className="g1-btn g1-btn-primary"
                                        disabled={savingMeta}
                                        onClick={handleSaveMeta}
                                    >
                                        <Save size={14} />
                                        {savingMeta ? 'Saving...' : t('save')}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* TAB 2: GRIDFS CHUNK X-RAY VISUALIZER */}
                    {tab === 'chunks' && (
                        <div style={{ display: 'grid', gap: 14 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    padding: 14,
                                    borderRadius: 12,
                                    background: 'var(--bg-app)',
                                    border: '1px solid var(--border-subtle)',
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t('chunkXrayTitle')}</div>
                                    <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                                        Collection: fs.chunks · Chunk size: 255 KiB (261,120 B) · Total:{' '}
                                        <strong>{chunksData?.chunkCount ?? '—'}</strong> chunks
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="g1-btn g1-btn-primary"
                                    disabled={verifying}
                                    onClick={handleVerifyIntegrity}
                                >
                                    {verifying ? <LoaderCircle size={15} className="g1-spin" /> : <ShieldCheck size={15} />}
                                    {verifying ? t('verifying') : t('verifyIntegrity')}
                                </button>
                            </div>

                            {verifyReport && (
                                <div
                                    style={{
                                        padding: 13,
                                        borderRadius: 12,
                                        background: verifyReport.valid ? 'var(--accent-soft)' : 'var(--danger-soft)',
                                        color: verifyReport.valid ? 'var(--accent-text)' : 'var(--danger)',
                                        fontSize: 12.5,
                                        display: 'grid',
                                        gap: 4,
                                    }}
                                >
                                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {verifyReport.valid ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                                        {verifyReport.valid
                                            ? `100% Integrity Verified — ${verifyReport.chunksVerified} chunks (${formatExactBytes(verifyReport.verifiedBytes)}) in ${verifyReport.durationMs}ms`
                                            : 'Integrity Mismatch Detected!'}
                                    </div>
                                    <code style={{ fontSize: 11, wordBreak: 'break-all' }}>
                                        SHA-256: {verifyReport.computedSha256}
                                    </code>
                                </div>
                            )}

                            {loadingChunks ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                                    <LoaderCircle size={16} className="g1-spin" /> Querying fs.chunks from MongoDB...
                                </div>
                            ) : (
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
                                        gap: 8,
                                        maxHeight: 280,
                                        overflowY: 'auto',
                                        padding: 4,
                                    }}
                                >
                                    {(chunksData?.chunks || []).map((chunk) => {
                                        const pct = Math.min(100, Math.round((chunk.size / (chunksData?.chunkSize || 261120)) * 100));
                                        return (
                                            <div
                                                key={chunk.id}
                                                title={`Chunk #${chunk.index} — ${formatExactBytes(chunk.size)} — ObjectId: ${chunk.id}`}
                                                style={{
                                                    padding: '9px 10px',
                                                    borderRadius: 10,
                                                    background: 'var(--bg-app)',
                                                    border: '1px solid var(--border-subtle)',
                                                    display: 'grid',
                                                    gap: 5,
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-text)' }}>
                                                        n = {chunk.index}
                                                    </span>
                                                    <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                        {pct}%
                                                    </span>
                                                </div>
                                                <div style={{ height: 4, borderRadius: 999, background: 'var(--border-subtle)', overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)' }} />
                                                </div>
                                                <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>
                                                    {formatSize(chunk.size)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: VERSION HISTORY */}
                    {tab === 'versions' && (
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                    Every version is stored immutably in MongoDB GridFS.
                                </span>
                                <div>
                                    <button
                                        type="button"
                                        className="g1-btn g1-btn-primary"
                                        disabled={uploadingVer}
                                        onClick={() => versionInputRef.current?.click()}
                                    >
                                        {uploadingVer ? <LoaderCircle size={14} className="g1-spin" /> : <UploadCloud size={14} />}
                                        {t('uploadNewVersion')}
                                    </button>
                                    <input ref={versionInputRef} type="file" hidden onChange={handleUploadNewVersion} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: 8 }}>
                                {(details?.versions || []).map((v) => (
                                    <div
                                        key={v.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 10,
                                            padding: '10px 12px',
                                            borderRadius: 11,
                                            background: v.isLatest ? 'var(--accent-soft)' : 'var(--bg-app)',
                                            border: `1px solid ${v.isLatest ? 'var(--accent)' : 'var(--border-subtle)'}`,
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <strong className="mono" style={{ fontSize: 13 }}>
                                                    v{v.version}
                                                </strong>
                                                {v.isLatest && (
                                                    <span
                                                        style={{
                                                            fontSize: 10.5,
                                                            fontWeight: 700,
                                                            padding: '2px 7px',
                                                            borderRadius: 999,
                                                            background: 'var(--accent)',
                                                            color: '#fff',
                                                        }}
                                                    >
                                                        ACTIVE
                                                    </span>
                                                )}
                                                <span style={{ fontSize: 12.5 }}>{v.filename}</span>
                                            </div>
                                            <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                                                {formatSize(v.length)} · {formatTimestampFull(v.uploadDate)}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <a
                                                href={buildFileStreamUrl(v.id, 'download')}
                                                download={v.filename}
                                                className="g1-btn g1-btn-secondary"
                                                style={{ padding: '5px 9px', fontSize: 12, textDecoration: 'none' }}
                                            >
                                                <Download size={13} />
                                            </a>
                                            {!v.isLatest && (
                                                <button
                                                    type="button"
                                                    className="g1-btn g1-btn-primary"
                                                    style={{ padding: '5px 10px', fontSize: 12 }}
                                                    onClick={() => handleRestoreVersion(v.id)}
                                                >
                                                    <RotateCcw size={13} />
                                                    {t('restore')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <footer
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        padding: '12px 20px',
                        borderTop: '1px solid var(--border-subtle)',
                        background: 'var(--bg-subtle)',
                    }}
                >
                    <button type="button" className="g1-btn g1-btn-secondary" onClick={onClose}>
                        {t('close')}
                    </button>
                </footer>
            </section>
        </div>
    );
}
