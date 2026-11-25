import { useEffect, useRef, useState } from 'react';
import { Check, Info, LoaderCircle, PencilLine, X } from 'lucide-react';
import api from '../utils/axios.js';
import { useApp } from '../context/AppContext.jsx';

const FORBIDDEN = /[\\:*?"<>|/]/;
const MAX_LEN = 255;

export default function RenameModal({ file, visible, onClose }) {
    const { t, showToast, triggerRefresh } = useApp();
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!visible || !file) return;
        const initial = file.filename || '';
        setName(initial);
        setError('');
        window.setTimeout(() => {
            if (!inputRef.current) return;
            inputRef.current.focus();
            const dotIndex = initial.lastIndexOf('.');
            inputRef.current.setSelectionRange(0, dotIndex > 0 ? dotIndex : initial.length);
        }, 20);
    }, [visible, file]);

    useEffect(() => {
        if (!visible) return undefined;
        const onEsc = (e) => {
            if (e.key === 'Escape' && !submitting) onClose?.();
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [visible, submitting, onClose]);

    if (!visible || !file) return null;

    const validate = (val) => {
        const trimmed = val.trim();
        if (!trimmed) return 'File name cannot be empty.';
        if (FORBIDDEN.test(trimmed)) return 'Cannot contain special characters: / \\ : * ? " < > |';
        if (trimmed.length > MAX_LEN) return `Maximum ${MAX_LEN} characters allowed.`;
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errMsg = validate(name);
        if (errMsg) {
            setError(errMsg);
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const trimmed = name.trim();
            await api.put(`/fsfiles/update/rename/${file._id}`, { filename: trimmed });
            showToast(`Renamed to "${trimmed}"`, { type: 'success' });
            triggerRefresh();
            onClose?.();
        } catch (err) {
            const msg = err.response?.data?.msg || err.message || 'Rename failed.';
            setError(msg);
            showToast(msg, { type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="g1-modal-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !submitting) onClose?.();
            }}
        >
            <form className="g1-modal-box" style={{ maxWidth: 460 }} onSubmit={handleSubmit} role="dialog" aria-modal="true">
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
                            <PencilLine size={17} />
                        </span>
                        <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>{t('rename')}</h2>
                    </div>
                    <button type="button" className="g1-icon-btn" onClick={onClose} disabled={submitting}>
                        <X size={17} />
                    </button>
                </header>

                <div style={{ padding: 20, display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <label htmlFor="g1-rename-input" style={{ fontWeight: 600 }}>
                            New file name
                        </label>
                        <span className="mono" style={{ color: 'var(--text-muted)' }}>
                            {name.length}/{MAX_LEN}
                        </span>
                    </div>

                    <input
                        ref={inputRef}
                        id="g1-rename-input"
                        className="g1-input"
                        value={name}
                        maxLength={MAX_LEN}
                        onChange={(e) => {
                            setName(e.target.value);
                            setError(validate(e.target.value));
                        }}
                    />

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 7,
                            padding: '9px 11px',
                            borderRadius: 9,
                            fontSize: 12,
                            background: error ? 'var(--danger-soft)' : 'var(--bg-subtle)',
                            color: error ? 'var(--danger)' : 'var(--text-secondary)',
                        }}
                    >
                        <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span>
                            {error || 'File name cannot contain / \\ : * ? " < > | and max 255 characters.'}
                        </span>
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
                    <button type="button" className="g1-btn g1-btn-secondary" onClick={onClose} disabled={submitting}>
                        {t('cancel')}
                    </button>
                    <button type="submit" className="g1-btn g1-btn-primary" disabled={Boolean(error) || submitting}>
                        {submitting ? <LoaderCircle size={14} className="g1-spin" /> : <Check size={14} />}
                        {t('save')}
                    </button>
                </footer>
            </form>
        </div>
    );
}
