import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
    Check,
    Copy,
    ExternalLink,
    Link2,
    LoaderCircle,
    Lock,
    QrCode,
    Trash2,
    X,
} from 'lucide-react';
import api from '../utils/axios.js';
import { useApp } from '../context/AppContext.jsx';
import { copyToClipboard, formatDate } from '../utils/format.js';

export default function ShareModal({ file, visible, onClose }) {
    const { t, lang, showToast, triggerRefresh } = useApp();
    const [permission, setPermission] = useState('download');
    const [expiresIn, setExpiresIn] = useState('24h');
    const [password, setPassword] = useState('');
    const [creating, setCreating] = useState(false);
    const [shares, setShares] = useState([]);
    const [selectedShare, setSelectedShare] = useState(null);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [copied, setCopied] = useState(false);

    const buildPublicUrl = (token) => `${window.location.origin}/share/${token}`;

    const loadShares = useCallback(async (fileId) => {
        try {
            const res = await api.get('/shares', { params: { fileId } });
            const list = res.data?.shares || [];
            setShares(list);
            setSelectedShare((prev) => prev || list[0] || null);
        } catch {
            setShares([]);
        }
    }, []);

    useEffect(() => {
        if (!visible || !file) return;
        setSelectedShare(null);
        setQrDataUrl('');
        setPassword('');
        loadShares(file._id);
    }, [visible, file, loadShares]);

    useEffect(() => {
        if (!selectedShare) {
            setQrDataUrl('');
            return;
        }
        const url = buildPublicUrl(selectedShare.token);
        QRCode.toDataURL(url, {
            width: 220,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' },
        })
            .then(setQrDataUrl)
            .catch(() => setQrDataUrl(''));
    }, [selectedShare]);

    useEffect(() => {
        if (!visible) return undefined;
        const onEsc = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [visible, onClose]);

    if (!visible || !file) return null;

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await api.post('/shares', {
                fileId: file._id,
                permission,
                expiresIn,
                password: password.trim(),
            });
            const created = res.data.share;
            setShares((curr) => [created, ...curr]);
            setSelectedShare(created);
            setPassword('');
            triggerRefresh();
            showToast('Public share link & QR code generated!', { type: 'success' });
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        } finally {
            setCreating(false);
        }
    };

    const handleRevoke = async (shareId) => {
        try {
            await api.delete(`/shares/${shareId}`);
            setShares((curr) => curr.filter((s) => s.id !== shareId));
            if (selectedShare?.id === shareId) setSelectedShare(null);
            triggerRefresh();
            showToast('Share link revoked.', { type: 'info' });
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        }
    };

    const handleCopyLink = async () => {
        if (!selectedShare) return;
        const ok = await copyToClipboard(buildPublicUrl(selectedShare.token));
        if (ok) {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
        }
    };

    return (
        <div
            className="g1-modal-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <section className="g1-modal-box" style={{ maxWidth: 640 }} role="dialog" aria-modal="true">
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
                            <QrCode size={18} />
                        </span>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>{t('shareTitle')}</h2>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{file.filename}</div>
                        </div>
                    </div>
                    <button type="button" className="g1-icon-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </header>

                <div style={{ padding: 20, overflowY: 'auto', display: 'grid', gap: 16 }}>
                    {/* Generator Form */}
                    <form
                        onSubmit={handleCreate}
                        style={{
                            display: 'grid',
                            gap: 10,
                            padding: 14,
                            borderRadius: 12,
                            background: 'var(--bg-app)',
                            border: '1px solid var(--border-subtle)',
                        }}
                    >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                                    {t('permission')}
                                </label>
                                <select
                                    className="g1-input"
                                    value={permission}
                                    onChange={(e) => setPermission(e.target.value)}
                                >
                                    <option value="download">{t('allowDownload')}</option>
                                    <option value="view">{t('viewOnly')}</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                                    {t('expiry')}
                                </label>
                                <select
                                    className="g1-input"
                                    value={expiresIn}
                                    onChange={(e) => setExpiresIn(e.target.value)}
                                >
                                    <option value="1h">1 Hour</option>
                                    <option value="24h">24 Hours</option>
                                    <option value="7d">7 Days</option>
                                    <option value="30d">30 Days</option>
                                    <option value="never">No Expiration</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                                    <Lock size={12} /> {t('passwordOptional')}
                                </label>
                                <input
                                    className="g1-input"
                                    type="text"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Leave blank for open access"
                                />
                            </div>
                            <button type="submit" className="g1-btn g1-btn-primary" disabled={creating} style={{ height: 38 }}>
                                {creating ? <LoaderCircle size={15} className="g1-spin" /> : <Link2 size={15} />}
                                {t('generateLink')}
                            </button>
                        </div>
                    </form>

                    {/* Live QR Code Preview Card */}
                    {selectedShare && (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '170px 1fr',
                                gap: 16,
                                alignItems: 'center',
                                padding: 16,
                                borderRadius: 14,
                                background: 'var(--accent-soft)',
                                border: '1px solid var(--accent)',
                            }}
                        >
                            <div
                                style={{
                                    background: '#ffffff',
                                    padding: 8,
                                    borderRadius: 12,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    boxShadow: 'var(--shadow-sm)',
                                }}
                            >
                                {qrDataUrl && <img src={qrDataUrl} alt="QR Code" style={{ width: 150, height: 150 }} />}
                            </div>
                            <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent-text)' }}>
                                    Scan QR on phone to open live from Cloud!
                                </div>
                                <input
                                    className="g1-input mono"
                                    readOnly
                                    value={buildPublicUrl(selectedShare.token)}
                                    style={{ fontSize: 11.5 }}
                                    onFocus={(e) => e.target.select()}
                                />
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    <button type="button" className="g1-btn g1-btn-primary" onClick={handleCopyLink}>
                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                        {copied ? t('copied') : t('copyLink')}
                                    </button>
                                    <a
                                        href={buildPublicUrl(selectedShare.token)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="g1-btn g1-btn-secondary"
                                        style={{ textDecoration: 'none' }}
                                    >
                                        <ExternalLink size={14} /> Open Page
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Active Shares List */}
                    {shares.length > 0 && (
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
                                {t('activeLinks')} ({shares.length})
                            </div>
                            <div style={{ display: 'grid', gap: 7, maxHeight: 160, overflowY: 'auto' }}>
                                {shares.map((s) => (
                                    <div
                                        key={s.id}
                                        onClick={() => setSelectedShare(s)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                            padding: '8px 10px',
                                            borderRadius: 10,
                                            cursor: 'pointer',
                                            background: selectedShare?.id === s.id ? 'var(--bg-selected)' : 'var(--bg-app)',
                                            border: '1px solid var(--border-subtle)',
                                            fontSize: 12,
                                        }}
                                    >
                                        <div style={{ minWidth: 0 }}>
                                            <div className="mono" style={{ fontWeight: 600 }}>
                                                /share/{s.token.slice(0, 12)}...
                                                {s.passwordProtected && ' 🔒'}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {s.permission} · {s.accessCount} views · {s.downloadCount} downloads ·{' '}
                                                {s.expiresAt ? `Expires ${formatDate(s.expiresAt, lang)}` : 'Never expires'}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="g1-btn g1-btn-danger-soft"
                                            style={{ padding: '4px 9px', fontSize: 11.5 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRevoke(s.id);
                                            }}
                                        >
                                            <Trash2 size={12} /> {t('revoke')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
