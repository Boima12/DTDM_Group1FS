import { useEffect, useState } from 'react';
import { Check, Folder, FolderInput, FolderPlus, LoaderCircle, X } from 'lucide-react';
import api from '../utils/axios.js';
import { useApp } from '../context/AppContext.jsx';

const FOLDER_COLORS = ['#007a5c', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#0891b2'];

export function FolderCreateEditModal({
    visible,
    folder = null,
    parentId = null,
    onClose,
}) {
    const { t, showToast, triggerRefresh } = useApp();
    const [name, setName] = useState('');
    const [color, setColor] = useState(FOLDER_COLORS[0]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!visible) return;
        setName(folder?.name || '');
        setColor(folder?.color || FOLDER_COLORS[0]);
        setError('');
    }, [visible, folder]);

    if (!visible) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Folder name is required.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            if (folder) {
                await api.put(`/folders/${folder._id}`, { name: name.trim(), color });
                showToast(`Updated folder "${name.trim()}"`, { type: 'success' });
            } else {
                await api.post('/folders', { name: name.trim(), parentId, color });
                showToast(`Created folder "${name.trim()}"`, { type: 'success' });
            }
            triggerRefresh();
            onClose?.();
        } catch (err) {
            setError(err.response?.data?.msg || err.message);
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
            <form className="g1-modal-box" style={{ maxWidth: 420 }} onSubmit={handleSubmit} role="dialog" aria-modal="true">
                <header
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '15px 18px',
                        borderBottom: '1px solid var(--border-subtle)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <FolderPlus size={18} style={{ color }} />
                        <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>
                            {folder ? 'Edit Folder' : t('newFolder')}
                        </h2>
                    </div>
                    <button type="button" className="g1-icon-btn" onClick={onClose} disabled={submitting}>
                        <X size={17} />
                    </button>
                </header>

                <div style={{ padding: 18, display: 'grid', gap: 14 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                            Folder Name
                        </label>
                        <input
                            className="g1-input"
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Cloud Computing Slides"
                            maxLength={120}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 7 }}>
                            Accent Color
                        </label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            {FOLDER_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        background: c,
                                        border: color === c ? '3px solid var(--text-primary)' : '2px solid transparent',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                    }}
                                >
                                    {color === c && <Check size={13} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 12.5 }}>
                            {error}
                        </div>
                    )}
                </div>

                <footer
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 8,
                        padding: '12px 18px',
                        borderTop: '1px solid var(--border-subtle)',
                        background: 'var(--bg-subtle)',
                    }}
                >
                    <button type="button" className="g1-btn g1-btn-secondary" onClick={onClose} disabled={submitting}>
                        {t('cancel')}
                    </button>
                    <button type="submit" className="g1-btn g1-btn-primary" disabled={submitting || !name.trim()}>
                        {submitting ? <LoaderCircle size={14} className="g1-spin" /> : <Check size={14} />}
                        {folder ? t('save') : t('create')}
                    </button>
                </footer>
            </form>
        </div>
    );
}

export function MoveToFolderModal({ visible, fileIds = [], onClose, onMoved }) {
    const { t, showToast, triggerRefresh } = useApp();
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState('root');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setSelectedFolder('root');
        api.get('/folders', { params: { all: 'true' } })
            .then((res) => setFolders(res.data?.folders || []))
            .catch(() => setFolders([]));
    }, [visible]);

    if (!visible || fileIds.length === 0) return null;

    const handleMove = async () => {
        setSubmitting(true);
        try {
            const res = await api.put('/fsfiles/move', {
                ids: fileIds,
                folderId: selectedFolder === 'root' ? null : selectedFolder,
            });
            showToast(res.data.msg, { type: 'success' });
            triggerRefresh();
            onMoved?.();
            onClose?.();
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
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
            <section className="g1-modal-box" style={{ maxWidth: 440 }} role="dialog" aria-modal="true">
                <header
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '15px 18px',
                        borderBottom: '1px solid var(--border-subtle)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <FolderInput size={18} style={{ color: 'var(--accent)' }} />
                        <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>
                            {t('moveToFolder')} ({fileIds.length})
                        </h2>
                    </div>
                    <button type="button" className="g1-icon-btn" onClick={onClose}>
                        <X size={17} />
                    </button>
                </header>

                <div style={{ padding: 14, maxHeight: 300, overflowY: 'auto', display: 'grid', gap: 6 }}>
                    <button
                        type="button"
                        onClick={() => setSelectedFolder('root')}
                        className="g1-btn"
                        style={{
                            justifyContent: 'flex-start',
                            background: selectedFolder === 'root' ? 'var(--accent-soft)' : 'var(--bg-app)',
                            color: selectedFolder === 'root' ? 'var(--accent-text)' : 'var(--text-primary)',
                            borderColor: selectedFolder === 'root' ? 'var(--accent)' : 'var(--border-subtle)',
                        }}
                    >
                        <Folder size={16} /> My Drive (Root)
                    </button>
                    {folders.map((folder) => (
                        <button
                            key={folder._id}
                            type="button"
                            onClick={() => setSelectedFolder(folder._id)}
                            className="g1-btn"
                            style={{
                                justifyContent: 'flex-start',
                                background: selectedFolder === folder._id ? 'var(--accent-soft)' : 'var(--bg-app)',
                                color: selectedFolder === folder._id ? 'var(--accent-text)' : 'var(--text-primary)',
                                borderColor: selectedFolder === folder._id ? 'var(--accent)' : 'var(--border-subtle)',
                            }}
                        >
                            <Folder size={16} style={{ color: folder.color }} /> {folder.name}
                        </button>
                    ))}
                </div>

                <footer
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 8,
                        padding: '12px 18px',
                        borderTop: '1px solid var(--border-subtle)',
                        background: 'var(--bg-subtle)',
                    }}
                >
                    <button type="button" className="g1-btn g1-btn-secondary" onClick={onClose} disabled={submitting}>
                        {t('cancel')}
                    </button>
                    <button type="button" className="g1-btn g1-btn-primary" onClick={handleMove} disabled={submitting}>
                        {submitting ? <LoaderCircle size={14} className="g1-spin" /> : <Check size={14} />}
                        Move Here
                    </button>
                </footer>
            </section>
        </div>
    );
}
