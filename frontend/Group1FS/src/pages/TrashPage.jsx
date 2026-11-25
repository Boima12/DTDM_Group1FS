import { useCallback, useEffect, useState } from 'react';
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    Copy,
    Info,
    RotateCcw,
    Trash2,
} from 'lucide-react';
import api from '../utils/axios.js';
import { useApp } from '../context/AppContext.jsx';
import {
    copyToClipboard,
    formatDate,
    formatSize,
    getDaysRemainingInTrash,
} from '../utils/format.js';
import FileTypeBadge from '../components/FileIcon.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

export default function TrashPage({ searchQuery = '' }) {
    const { t, lang, refreshTick, triggerRefresh, showToast } = useApp();
    const [files, setFiles] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 24, total: 0, totalPages: 1 });
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [confirmTarget, setConfirmTarget] = useState(null);

    const fetchTrash = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/fsfiles', {
                params: {
                    trash: 'true',
                    search: searchQuery.trim(),
                    sort: 'trashDate:desc',
                    page,
                    limit: 24,
                },
            });
            setFiles(res.data?.files || []);
            setPagination(res.data?.pagination || { page: 1, limit: 24, total: 0, totalPages: 1 });
            setSelected((curr) => curr.filter((id) => (res.data?.files || []).some((f) => f._id === id)));
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [searchQuery, page, showToast]);

    useEffect(() => {
        fetchTrash();
    }, [fetchTrash, refreshTick]);

    const visibleIds = files.map((f) => f._id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

    const totalTempSize = files.reduce((sum, f) => sum + (f.length || 0), 0);

    const handleRestore = async (ids) => {
        if (!ids.length || busy) return;
        setBusy(true);
        try {
            const res = await api.put(`/fsfiles/update/restore/${ids.join(',')}`);
            setSelected((curr) => curr.filter((id) => !ids.includes(id)));
            triggerRefresh();
            showToast(res.data.msg || 'Restored successfully.', { type: 'success' });
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const executePermanentDelete = async () => {
        if (!confirmTarget) return;
        setBusy(true);
        try {
            if (confirmTarget.mode === 'empty') {
                const res = await api.delete('/fsfiles/trash/empty');
                showToast(res.data.msg, { type: 'success' });
                setSelected([]);
            } else if (confirmTarget.ids.length === 1) {
                const res = await api.delete(`/fsfiles/update/delete/${confirmTarget.ids[0]}`);
                showToast(res.data.msg, { type: 'success' });
            } else {
                const res = await api.delete(`/fsfiles/update/deleteMultiple/${confirmTarget.ids.join(',')}`);
                showToast(res.data.msg, { type: 'success' });
            }
            setSelected((curr) => curr.filter((id) => !(confirmTarget.ids || []).includes(id)));
            setConfirmTarget(null);
            triggerRefresh();
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="g1-content-scroll">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Trash2 size={22} style={{ color: 'var(--danger)' }} />
                    {t('trash')}
                </h1>

                <button
                    type="button"
                    className="g1-btn g1-btn-danger"
                    disabled={files.length === 0 || busy}
                    onClick={() =>
                        setConfirmTarget({
                            mode: 'empty',
                            title: `${t('emptyTrash')}?`,
                            subtitle: `${pagination.total} file(s) (${formatSize(totalTempSize)}) will be permanently removed from GridFS.`,
                        })
                    }
                >
                    <Trash2 size={14} /> {t('emptyTrash')}
                </button>
            </div>

            {/* Retention Info Banner */}
            <section
                className="g1-card"
                style={{
                    padding: 16,
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    borderLeft: '4px solid var(--warning)',
                }}
            >
                <span
                    style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: 'var(--warning-soft)',
                        color: 'var(--warning)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <Info size={18} />
                </span>
                <div style={{ fontSize: 13 }}>
                    <strong>{t('trashBannerTitle')}</strong>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {t('trashBannerBody')} {t('tempStorage')}: <strong className="mono">{formatSize(totalTempSize)}</strong>
                    </p>
                </div>
            </section>

            {/* Bulk Action Bar */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginBottom: 14,
                    fontSize: 13,
                }}
            >
                <span style={{ color: 'var(--text-secondary)' }}>
                    {t('selectedCount')}: <strong className="mono">{selected.length}</strong> / {files.length}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        type="button"
                        className="g1-btn g1-btn-primary"
                        style={{ padding: '6px 12px', fontSize: 12.5 }}
                        disabled={selected.length === 0 || busy}
                        onClick={() => handleRestore(selected)}
                    >
                        <RotateCcw size={14} /> {t('restore')} ({selected.length})
                    </button>
                    <button
                        type="button"
                        className="g1-btn g1-btn-danger-soft"
                        style={{ padding: '6px 12px', fontSize: 12.5 }}
                        disabled={selected.length === 0 || busy}
                        onClick={() =>
                            setConfirmTarget({
                                mode: 'bulk',
                                ids: selected,
                                title: `Permanently delete ${selected.length} selected file(s)?`,
                                subtitle: `${selected.length} items selected for permanent GridFS erasure.`,
                            })
                        }
                    >
                        <Trash2 size={14} /> {t('permanentlyDelete')}
                    </button>
                </div>
            </div>

            {!loading && files.length === 0 && (
                <div className="g1-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div
                        style={{
                            width: 56,
                            height: 56,
                            margin: '0 auto 12px',
                            borderRadius: 16,
                            background: 'var(--bg-subtle)',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Trash2 size={26} />
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>{t('noTrashTitle')}</h3>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{t('noTrashHint')}</p>
                </div>
            )}

            {files.length > 0 && (
                <div className="g1-card" style={{ overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr
                                    style={{
                                        background: 'var(--bg-subtle)',
                                        borderBottom: '1px solid var(--border-subtle)',
                                        color: 'var(--text-muted)',
                                        fontSize: 11,
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    <th style={{ width: 42, padding: '10px 12px', textAlign: 'center' }}>
                                        <button
                                            type="button"
                                            onClick={() => setSelected(allSelected ? [] : visibleIds)}
                                            style={{
                                                width: 17,
                                                height: 17,
                                                borderRadius: 4,
                                                border: `1.5px solid ${allSelected ? 'var(--accent)' : 'var(--border-strong)'}`,
                                                background: allSelected ? 'var(--accent)' : 'transparent',
                                                color: '#fff',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                padding: 0,
                                            }}
                                        >
                                            {allSelected && <Check size={12} />}
                                        </button>
                                    </th>
                                    <th style={{ padding: '10px 10px', textAlign: 'left' }}>{t('fileName')}</th>
                                    <th style={{ padding: '10px 10px', textAlign: 'left', width: 100 }}>{t('size')}</th>
                                    <th style={{ padding: '10px 10px', textAlign: 'left', width: 155 }}>{t('deleteDate')}</th>
                                    <th style={{ padding: '10px 10px', textAlign: 'left', width: 130 }}>TTL</th>
                                    <th style={{ padding: '10px 10px', textAlign: 'right', width: 225 }} />
                                </tr>
                            </thead>
                            <tbody>
                                {files.map((file) => {
                                    const isSel = selected.includes(file._id);
                                    const daysLeft = getDaysRemainingInTrash(file.metadata?.markAsTrashDate, 30);
                                    return (
                                        <tr
                                            key={file._id}
                                            style={{
                                                borderBottom: '1px solid var(--border-subtle)',
                                                background: isSel ? 'var(--bg-selected)' : 'transparent',
                                            }}
                                        >
                                            <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelected((curr) =>
                                                            curr.includes(file._id)
                                                                ? curr.filter((x) => x !== file._id)
                                                                : [...curr, file._id]
                                                        )
                                                    }
                                                    style={{
                                                        width: 17,
                                                        height: 17,
                                                        borderRadius: 4,
                                                        border: `1.5px solid ${isSel ? 'var(--accent)' : 'var(--border-strong)'}`,
                                                        background: isSel ? 'var(--accent)' : 'transparent',
                                                        color: '#fff',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        padding: 0,
                                                    }}
                                                >
                                                    {isSel && <Check size={12} />}
                                                </button>
                                            </td>
                                            <td style={{ padding: '11px 10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <FileTypeBadge file={file} size={17} boxSize={34} />
                                                    <div>
                                                        <strong style={{ fontWeight: 600 }}>{file.filename}</strong>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                                                            <code>{file._id}</code>
                                                            <button
                                                                type="button"
                                                                className="g1-icon-btn"
                                                                style={{ width: 22, height: 22 }}
                                                                onClick={async () => {
                                                                    await copyToClipboard(file._id);
                                                                    showToast('Document ID copied!', { type: 'info', duration: 2000 });
                                                                }}
                                                            >
                                                                <Copy size={11} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="mono" style={{ padding: '11px 10px', fontSize: 12 }}>
                                                {formatSize(file.length)}
                                            </td>
                                            <td className="mono" style={{ padding: '11px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {formatDate(file.metadata?.markAsTrashDate, lang)}
                                            </td>
                                            <td style={{ padding: '11px 10px' }}>
                                                <span
                                                    className="mono"
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        padding: '3px 8px',
                                                        borderRadius: 999,
                                                        background: daysLeft <= 5 ? 'var(--danger-soft)' : 'var(--warning-soft)',
                                                        color: daysLeft <= 5 ? 'var(--danger)' : 'var(--warning)',
                                                    }}
                                                >
                                                    <Clock size={11} /> {daysLeft} {t('daysLeft')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '11px 10px', textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', gap: 6 }}>
                                                    <button
                                                        type="button"
                                                        className="g1-btn g1-btn-secondary"
                                                        style={{ padding: '5px 10px', fontSize: 12 }}
                                                        disabled={busy}
                                                        onClick={() => handleRestore([file._id])}
                                                    >
                                                        <RotateCcw size={13} /> {t('restore')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="g1-btn g1-btn-danger-soft"
                                                        style={{ padding: '5px 10px', fontSize: 12 }}
                                                        disabled={busy}
                                                        onClick={() =>
                                                            setConfirmTarget({
                                                                mode: 'single',
                                                                ids: [file._id],
                                                                title: 'Permanently delete this file?',
                                                                subtitle: `${file.filename} (${formatSize(file.length)})`,
                                                            })
                                                        }
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <footer
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 16px',
                            background: 'var(--bg-subtle)',
                            fontSize: 12,
                            color: 'var(--text-muted)',
                        }}
                    >
                        <span>
                            {t('showing')} <strong>{files.length}</strong> {t('outOf')} <strong>{pagination.total}</strong> {t('items')}
                        </span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span className="mono">
                                {t('page')} {pagination.page} / {pagination.totalPages}
                            </span>
                            <button
                                type="button"
                                className="g1-icon-btn"
                                style={{ width: 28, height: 28, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                                disabled={pagination.page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                type="button"
                                className="g1-icon-btn"
                                style={{ width: 28, height: 28, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </footer>
                </div>
            )}

            <ConfirmModal
                visible={Boolean(confirmTarget)}
                title={confirmTarget?.title}
                subtitle={confirmTarget?.subtitle}
                loading={busy}
                onClose={() => setConfirmTarget(null)}
                onConfirm={executePermanentDelete}
            />
        </div>
    );
}
