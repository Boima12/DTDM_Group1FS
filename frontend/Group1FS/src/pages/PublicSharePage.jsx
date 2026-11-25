import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    AlertTriangle,
    Cloud,
    Download,
    Eye,
    LoaderCircle,
    Lock,
    ShieldCheck,
} from 'lucide-react';
import api, { buildPublicShareStreamUrl } from '../utils/axios.js';
import { formatDate, formatSize } from '../utils/format.js';
import FileTypeBadge from '../components/FileIcon.jsx';

export default function PublicSharePage() {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [share, setShare] = useState(null);
    const [file, setFile] = useState(null);
    const [locked, setLocked] = useState(false);
    const [password, setPassword] = useState('');
    const [unlockError, setUnlockError] = useState('');
    const [unlocking, setUnlocking] = useState(false);
    const [accessToken, setAccessToken] = useState('');
    const [textPreview, setTextPreview] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');
        api.get(`/public/share/${token}`)
            .then((res) => {
                if (cancelled) return;
                setShare(res.data.share);
                setFile(res.data.file);
                setLocked(Boolean(res.data.share?.passwordProtected));
            })
            .catch((err) => {
                if (!cancelled) setError(err.response?.data?.msg || err.message || 'Share link unavailable.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [token]);

    const contentType = (file?.metadata?.contentType || '').toLowerCase();
    const ext = (file?.metadata?.extension || '').toLowerCase();
    const isImage = contentType.startsWith('image/') && ext !== 'svg';
    const isVideo = contentType.startsWith('video/');
    const isAudio = contentType.startsWith('audio/');
    const isPdf = contentType === 'application/pdf' || ext === 'pdf';
    const isText = contentType.startsWith('text/') || contentType === 'application/json' || ['md', 'csv', 'txt', 'json'].includes(ext);

    useEffect(() => {
        if (locked || !file || !isText) return;
        api.get(`/public/share/${token}/stream`, {
            params: { mode: 'preview', accessToken: accessToken || undefined },
            responseType: 'text',
            transformResponse: [(d) => d],
        })
            .then((res) => setTextPreview(String(res.data || '').slice(0, 150_000)))
            .catch(() => setTextPreview(''));
    }, [locked, file, isText, token, accessToken]);

    const handleUnlock = async (e) => {
        e.preventDefault();
        setUnlocking(true);
        setUnlockError('');
        try {
            const res = await api.post(`/public/share/${token}/unlock`, { password });
            setAccessToken(res.data.accessToken || '');
            setFile(res.data.file);
            setLocked(false);
        } catch (err) {
            setUnlockError(err.response?.data?.msg || 'Incorrect password.');
        } finally {
            setUnlocking(false);
        }
    };

    const previewUrl = buildPublicShareStreamUrl(token, 'preview', accessToken);
    const downloadUrl = buildPublicShareStreamUrl(token, 'download', accessToken);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
            <header
                style={{
                    height: 62,
                    padding: '0 24px',
                    background: 'var(--bg-surface)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
                    <span
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            background: 'linear-gradient(135deg, #007a5c, #10b981)',
                            color: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Cloud size={18} />
                    </span>
                    <strong style={{ fontSize: 16 }}>Group1FS Public Share</strong>
                </Link>
                {share && !locked && share.permission === 'download' && (
                    <a href={downloadUrl} download={file?.filename} className="g1-btn g1-btn-primary" style={{ textDecoration: 'none' }}>
                        <Download size={15} /> Download File
                    </a>
                )}
            </header>

            <main style={{ flex: 1, maxWidth: 960, width: '100%', margin: '0 auto', padding: 24 }}>
                {loading && (
                    <div className="g1-card" style={{ padding: 36, display: 'flex', justifyContent: 'center', gap: 10 }}>
                        <LoaderCircle size={18} className="g1-spin" /> Loading shared file from MongoDB GridFS...
                    </div>
                )}

                {!loading && error && (
                    <div className="g1-card" style={{ padding: 36, textAlign: 'center' }}>
                        <AlertTriangle size={34} style={{ color: 'var(--danger)', marginBottom: 10 }} />
                        <h2 style={{ margin: '0 0 8px' }}>Link Unavailable</h2>
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>{error}</p>
                    </div>
                )}

                {!loading && !error && locked && (
                    <form onSubmit={handleUnlock} className="g1-card" style={{ maxWidth: 420, margin: '48px auto', padding: 26, display: 'grid', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    background: 'var(--accent-soft)',
                                    color: 'var(--accent)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Lock size={20} />
                            </span>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 17 }}>Password Protected File</h2>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{file?.filename}</div>
                            </div>
                        </div>
                        <input
                            className="g1-input"
                            type="password"
                            autoFocus
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter PIN / Password..."
                            required
                        />
                        {unlockError && (
                            <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 12.5 }}>
                                {unlockError}
                            </div>
                        )}
                        <button type="submit" className="g1-btn g1-btn-primary" disabled={unlocking}>
                            {unlocking ? <LoaderCircle size={15} className="g1-spin" /> : null}
                            Unlock File
                        </button>
                    </form>
                )}

                {!loading && !error && !locked && file && (
                    <div style={{ display: 'grid', gap: 16 }}>
                        <div className="g1-card" style={{ padding: 18, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <FileTypeBadge file={file} size={22} boxSize={44} />
                                <div>
                                    <h1 style={{ margin: 0, fontSize: 18 }}>{file.filename}</h1>
                                    <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                                        {formatSize(file.length)} · {file.metadata?.contentType} · {share.accessCount} views
                                        {share.expiresAt ? ` · Expires ${formatDate(share.expiresAt)}` : ''}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {file.metadata?.sha256 && (
                                    <span
                                        className="mono"
                                        title={file.metadata.sha256}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5,
                                            fontSize: 11.5,
                                            padding: '5px 10px',
                                            borderRadius: 999,
                                            background: 'var(--accent-soft)',
                                            color: 'var(--accent-text)',
                                            fontWeight: 600,
                                        }}
                                    >
                                        <ShieldCheck size={14} /> SHA-256 Verified
                                    </span>
                                )}
                                {share.permission === 'view' && (
                                    <span
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5,
                                            fontSize: 11.5,
                                            padding: '5px 10px',
                                            borderRadius: 999,
                                            background: 'var(--warning-soft)',
                                            color: 'var(--warning)',
                                            fontWeight: 600,
                                        }}
                                    >
                                        <Eye size={14} /> View Only
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="g1-card" style={{ padding: 20, minHeight: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isImage && (
                                <img
                                    src={previewUrl}
                                    alt={file.filename}
                                    style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 10 }}
                                />
                            )}
                            {isVideo && (
                                <video src={previewUrl} controls playsInline style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 10 }} />
                            )}
                            {isAudio && <audio src={previewUrl} controls style={{ width: '100%', maxWidth: 500 }} />}
                            {isPdf && (
                                <iframe src={previewUrl} title={file.filename} style={{ width: '100%', height: '72vh', border: 0, borderRadius: 8 }} />
                            )}
                            {isText && (
                                <pre
                                    className="mono"
                                    style={{
                                        width: '100%',
                                        maxHeight: '70vh',
                                        overflow: 'auto',
                                        margin: 0,
                                        padding: 14,
                                        borderRadius: 10,
                                        background: 'var(--bg-app)',
                                        fontSize: 12.5,
                                        whiteSpace: 'pre-wrap',
                                    }}
                                >
                                    {textPreview || 'Loading text...'}
                                </pre>
                            )}
                            {!isImage && !isVideo && !isAudio && !isPdf && !isText && (
                                <div style={{ textAlign: 'center', padding: 24 }}>
                                    <p style={{ color: 'var(--text-muted)' }}>Direct preview is not available for this binary format.</p>
                                    {share.permission === 'download' && (
                                        <a href={downloadUrl} download={file.filename} className="g1-btn g1-btn-primary" style={{ textDecoration: 'none' }}>
                                            <Download size={15} /> Download ({formatSize(file.length)})
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
