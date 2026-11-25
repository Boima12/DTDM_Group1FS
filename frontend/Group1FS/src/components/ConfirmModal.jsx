import { useEffect } from 'react';
import { AlertCircle, AlertTriangle, LoaderCircle, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';

export default function ConfirmModal({
    visible,
    title,
    subtitle,
    warningText = 'THIS ACTION CANNOT BE UNDONE AND WILL PERMANENTLY REMOVE DATA FROM MONGODB GRIDFS.',
    confirmLabel,
    loading = false,
    onClose,
    onConfirm,
}) {
    const { t } = useApp();

    useEffect(() => {
        if (!visible) return undefined;
        const onEsc = (e) => {
            if (e.key === 'Escape' && !loading) onClose?.();
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [visible, loading, onClose]);

    if (!visible) return null;

    return (
        <div
            className="g1-modal-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !loading) onClose?.();
            }}
        >
            <section className="g1-modal-box" style={{ maxWidth: 460 }} role="dialog" aria-modal="true">
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
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                background: 'var(--danger-soft)',
                                color: 'var(--danger)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <AlertTriangle size={20} />
                        </span>
                        <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>{title}</h2>
                    </div>
                    <button type="button" className="g1-icon-btn" onClick={onClose} disabled={loading}>
                        <X size={17} />
                    </button>
                </header>

                <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                    {subtitle && (
                        <div
                            style={{
                                padding: 12,
                                borderRadius: 10,
                                background: 'var(--bg-app)',
                                border: '1px solid var(--border-subtle)',
                                fontSize: 13,
                                fontWeight: 600,
                                wordBreak: 'break-word',
                            }}
                        >
                            {subtitle}
                        </div>
                    )}

                    <div
                        style={{
                            display: 'flex',
                            gap: 9,
                            padding: 12,
                            borderRadius: 10,
                            background: 'var(--danger-soft)',
                            color: 'var(--danger)',
                            fontSize: 12,
                            fontWeight: 600,
                            lineHeight: 1.45,
                        }}
                    >
                        <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>{warningText}</span>
                    </div>
                </div>

                <footer
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 8,
                        padding: '13px 20px',
                        borderTop: '1px solid var(--border-subtle)',
                        background: 'var(--bg-subtle)',
                    }}
                >
                    <button type="button" className="g1-btn g1-btn-secondary" onClick={onClose} disabled={loading}>
                        {t('cancel')}
                    </button>
                    <button type="button" className="g1-btn g1-btn-danger" onClick={onConfirm} disabled={loading}>
                        {loading ? <LoaderCircle size={14} className="g1-spin" /> : <Trash2 size={14} />}
                        {confirmLabel || t('permanentlyDelete')}
                    </button>
                </footer>
            </section>
        </div>
    );
}
