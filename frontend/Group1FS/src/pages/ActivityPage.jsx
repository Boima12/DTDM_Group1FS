import { useCallback, useEffect, useState } from 'react';
import {
    Activity,
    ChevronLeft,
    ChevronRight,
    Clock,
    LoaderCircle,
} from 'lucide-react';
import api from '../utils/axios.js';
import { useApp } from '../context/AppContext.jsx';
import { formatDate, formatRelativeTime } from '../utils/format.js';

const ACTION_FILTERS = [
    'ALL',
    'UPLOAD',
    'VERSION_UPLOAD',
    'DOWNLOAD',
    'RENAME',
    'SHARE_CREATE',
    'FOLDER_CREATE',
    'TRASH',
    'RESTORE',
    'DELETE',
    'VERIFY_INTEGRITY',
    'AUTH_LOGIN',
];

const ACTION_TONE = {
    UPLOAD: '#10b981',
    VERSION_UPLOAD: '#059669',
    DOWNLOAD: '#3b82f6',
    BULK_DOWNLOAD: '#2563eb',
    RENAME: '#8b5cf6',
    SHARE_CREATE: '#0891b2',
    FOLDER_CREATE: '#007a5c',
    TRASH: '#f59e0b',
    RESTORE: '#10b981',
    DELETE: '#ef4444',
    EMPTY_TRASH: '#dc2626',
    VERIFY_INTEGRITY: '#16a34a',
    AUTH_LOGIN: '#6366f1',
    AUTH_REGISTER: '#4f46e5',
};

export default function ActivityPage() {
    const { t, lang, refreshTick, showToast } = useApp();
    const [actionFilter, setActionFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [loading, setLoading] = useState(true);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/activity', {
                params: { action: actionFilter, page, limit: 25 },
            });
            setLogs(res.data?.logs || []);
            setPagination(res.data?.pagination || { page: 1, totalPages: 1, total: 0 });
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [actionFilter, page, showToast]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs, refreshTick]);

    return (
        <div className="g1-content-scroll">
            <div style={{ marginBottom: 16 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Activity size={22} style={{ color: 'var(--accent)' }} />
                    {t('activityLog')}
                </h1>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                    Real-time audit trail of uploads, downloads, shares, integrity verifications & workspace actions
                </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {ACTION_FILTERS.map((act) => {
                    const active = actionFilter === act;
                    return (
                        <button
                            key={act}
                            type="button"
                            onClick={() => {
                                setActionFilter(act);
                                setPage(1);
                            }}
                            className="mono"
                            style={{
                                padding: '5px 10px',
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 700,
                                border: `1px solid ${active ? 'var(--accent)' : 'var(--border-subtle)'}`,
                                background: active ? 'var(--accent)' : 'var(--bg-surface)',
                                color: active ? '#fff' : 'var(--text-secondary)',
                                cursor: 'pointer',
                            }}
                        >
                            {act}
                        </button>
                    );
                })}
            </div>

            <div className="g1-card" style={{ overflow: 'hidden' }}>
                {loading && logs.length === 0 ? (
                    <div style={{ padding: 28, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <LoaderCircle size={16} className="g1-spin" /> Loading audit trail...
                    </div>
                ) : logs.length === 0 ? (
                    <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        No audit events recorded for this filter yet.
                    </div>
                ) : (
                    <div>
                        {logs.map((log) => {
                            const tone = ACTION_TONE[log.action] || '#64748b';
                            return (
                                <div
                                    key={log.id}
                                    style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 10,
                                        padding: '12px 16px',
                                        borderBottom: '1px solid var(--border-subtle)',
                                        fontSize: 13,
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                        <span
                                            className="mono"
                                            style={{
                                                fontSize: 10.5,
                                                fontWeight: 700,
                                                padding: '3px 8px',
                                                borderRadius: 6,
                                                background: `${tone}1f`,
                                                color: tone,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {log.action}
                                        </span>
                                        <div style={{ minWidth: 0 }}>
                                            <strong style={{ wordBreak: 'break-word' }}>{log.targetName || log.targetType}</strong>
                                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                                                by {log.userName || 'Demo Workspace'}
                                                {log.ip ? ` · ${log.ip}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        className="mono"
                                        title={formatDate(log.createdAt, lang)}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--text-muted)' }}
                                    >
                                        <Clock size={12} /> {formatRelativeTime(log.createdAt, lang)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

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
                    <span>Total: {pagination.total} events</span>
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
        </div>
    );
}
