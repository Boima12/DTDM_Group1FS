import { useState } from 'react';
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    File,
    RotateCcw,
    X,
    XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { formatEta, formatSize, formatSpeed } from '../utils/format.js';

export default function ProgressWidget() {
    const {
        t,
        uploadQueue,
        progressVisible,
        setProgressVisible,
        cancelUploadTask,
        retryUploadTask,
        clearCompletedUploads,
    } = useApp();
    const [collapsed, setCollapsed] = useState(false);

    if (!progressVisible || uploadQueue.length === 0) return null;

    const activeCount = uploadQueue.filter((i) => i.status === 'uploading' || i.status === 'queued').length;
    const totalSpeed = uploadQueue
        .filter((i) => i.status === 'uploading')
        .reduce((sum, i) => sum + (i.speed || 0), 0);

    return (
        <aside
            aria-label={t('progressTitle')}
            style={{
                position: 'fixed',
                right: 20,
                bottom: 20,
                zIndex: 1400,
                width: 'min(390px, calc(100vw - 32px))',
                borderRadius: 14,
                overflow: 'hidden',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-lg)',
            }}
        >
            <header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 14px',
                    background: 'var(--bg-subtle)',
                    borderBottom: collapsed ? 'none' : '1px solid var(--border-subtle)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span
                        className="g1-pulse-dot"
                        style={{ background: activeCount > 0 ? 'var(--accent)' : 'var(--text-muted)' }}
                    />
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{t('progressTitle')}</div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {activeCount > 0
                                ? `${activeCount} ${t('inProgress')} · ${formatSpeed(totalSpeed)}`
                                : `${uploadQueue.length} ${t('items')}`}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button
                        type="button"
                        className="g1-icon-btn"
                        style={{ width: 28, height: 28 }}
                        onClick={() => setCollapsed((v) => !v)}
                        aria-label="Toggle collapse"
                    >
                        <ChevronDown
                            size={15}
                            style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}
                        />
                    </button>
                    <button
                        type="button"
                        className="g1-icon-btn"
                        style={{ width: 28, height: 28 }}
                        onClick={() => {
                            clearCompletedUploads();
                            setProgressVisible(false);
                        }}
                        aria-label="Close progress widget"
                    >
                        <X size={15} />
                    </button>
                </div>
            </header>

            {!collapsed && (
                <div style={{ maxHeight: 280, overflowY: 'auto', padding: 12, display: 'grid', gap: 10 }}>
                    {uploadQueue.map((item) => {
                        const isUploading = item.status === 'uploading' || item.status === 'queued';
                        const isDone = item.status === 'completed';
                        const isErr = item.status === 'error' || item.status === 'cancelled';

                        return (
                            <div
                                key={item.id}
                                style={{
                                    padding: 10,
                                    borderRadius: 10,
                                    background: 'var(--bg-app)',
                                    border: '1px solid var(--border-subtle)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <File size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            title={item.name}
                                            style={{
                                                fontSize: 12.5,
                                                fontWeight: 600,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {item.name}
                                        </div>
                                        <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            {isDone && (
                                                <span style={{ color: 'var(--accent-text)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    <CheckCircle2 size={12} /> {t('completed')} · {formatSize(item.size)}
                                                </span>
                                            )}
                                            {isUploading &&
                                                `${formatSize(item.loaded)} / ${formatSize(item.size)} · ${item.percent}%${
                                                    item.speed > 0 ? ` · ${formatSpeed(item.speed)} · ETA ${formatEta(item.eta)}` : ''
                                                }`}
                                            {isErr && (
                                                <span style={{ color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    <AlertCircle size={12} /> {item.error || t('failed')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {isUploading && (
                                        <button
                                            type="button"
                                            className="g1-icon-btn"
                                            style={{ width: 28, height: 28, color: 'var(--danger)' }}
                                            title={t('cancel')}
                                            onClick={() => cancelUploadTask(item.id)}
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    )}
                                    {isErr && (
                                        <button
                                            type="button"
                                            className="g1-btn g1-btn-secondary"
                                            style={{ padding: '4px 8px', fontSize: 11 }}
                                            onClick={() => retryUploadTask(item.id)}
                                        >
                                            <RotateCcw size={12} />
                                            {t('retry')}
                                        </button>
                                    )}
                                </div>

                                <div
                                    style={{
                                        height: 5,
                                        borderRadius: 999,
                                        background: 'var(--border-subtle)',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${isDone ? 100 : item.percent}%`,
                                            height: '100%',
                                            background: isErr ? 'var(--danger)' : 'var(--accent)',
                                            transition: 'width 150ms linear',
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </aside>
    );
}
