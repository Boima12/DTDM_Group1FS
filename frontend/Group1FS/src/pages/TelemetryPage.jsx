import { useCallback, useEffect, useState } from 'react';
import {
    Activity,
    Cpu,
    Database,
    HardDrive,
    Layers,
    LoaderCircle,
    RefreshCw,
    Server,
    ShieldCheck,
    Trash2,
} from 'lucide-react';
import api from '../utils/axios.js';
import { useApp } from '../context/AppContext.jsx';
import { CATEGORY_STYLE, formatDate, formatSize, formatUptime } from '../utils/format.js';

export default function TelemetryPage() {
    const { t, lang, showToast, checkHealth } = useApp();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [purging, setPurging] = useState(false);

    const fetchTelemetry = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/system/telemetry');
            setData(res.data);
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchTelemetry();
    }, [fetchTelemetry]);

    useEffect(() => {
        if (!autoRefresh) return undefined;
        const id = window.setInterval(fetchTelemetry, 10_000);
        return () => window.clearInterval(id);
    }, [autoRefresh, fetchTelemetry]);

    const handleTriggerPurge = async () => {
        setPurging(true);
        try {
            const res = await api.post('/system/purge-trash');
            showToast(res.data.msg, { type: 'success' });
            await fetchTelemetry();
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        } finally {
            setPurging(false);
        }
    };

    const categories = data?.gridfs?.categories || [];
    const totalCatBytes = categories.reduce((s, c) => s + (c.bytes || 0), 0) || 1;
    const memPct = data?.memory?.usagePercent || 0;

    return (
        <div className="g1-content-scroll">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Server size={22} style={{ color: 'var(--accent)' }} />
                        {t('cloudTelemetry')}
                    </h1>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                        Live MongoDB GridFS Cluster, Render Cloud Runtime & Container Memory Monitor
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                        />
                        Auto-refresh (10s)
                    </label>
                    <button
                        type="button"
                        className="g1-btn g1-btn-secondary"
                        onClick={() => {
                            checkHealth();
                            fetchTelemetry();
                        }}
                    >
                        <RefreshCw size={14} className={loading ? 'g1-spin' : ''} /> {t('refresh')}
                    </button>
                </div>
            </div>

            {loading && !data ? (
                <div className="g1-card" style={{ padding: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <LoaderCircle size={18} className="g1-spin" /> Loading live cloud metrics...
                </div>
            ) : data ? (
                <div style={{ display: 'grid', gap: 16 }}>
                    {/* Top 4 Live KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))', gap: 12 }}>
                        {[
                            {
                                title: 'MongoDB Ping Latency',
                                value: `${data.dbPingMs} ms`,
                                sub: `${data.cluster.databaseName} · Connected`,
                                icon: Activity,
                                color: '#10b981',
                            },
                            {
                                title: 'Container RAM (Zero-RAM Stream)',
                                value: `${formatSize(data.memory.rssBytes)}`,
                                sub: `${memPct}% of ${formatSize(data.memory.containerLimitBytes)} limit`,
                                icon: Cpu,
                                color: memPct > 80 ? '#ef4444' : '#3b82f6',
                            },
                            {
                                title: 'GridFS Chunks Stored',
                                value: new Intl.NumberFormat('en-US').format(data.gridfs.totalChunks),
                                sub: `${data.gridfs.activeFiles} active · ${data.gridfs.trashedFiles} trashed`,
                                icon: Layers,
                                color: '#8b5cf6',
                            },
                            {
                                title: 'Node Runtime Uptime',
                                value: formatUptime(data.render.uptimeSeconds),
                                sub: `${data.render.nodeVersion} · ${data.render.region}`,
                                icon: ShieldCheck,
                                color: '#f59e0b',
                            },
                        ].map((kpi) => {
                            const Icon = kpi.icon;
                            return (
                                <div key={kpi.title} className="g1-card" style={{ padding: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                                            {kpi.title}
                                        </span>
                                        <span
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: 9,
                                                background: `${kpi.color}1c`,
                                                color: kpi.color,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Icon size={17} />
                                        </span>
                                    </div>
                                    <div className="mono" style={{ fontSize: 22, fontWeight: 800 }}>
                                        {kpi.value}
                                    </div>
                                    <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                                        {kpi.sub}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Memory Gauge + Category Storage Breakdown */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                        <section className="g1-card" style={{ padding: 18 }}>
                            <h3 style={{ margin: '0 0 12px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Database size={17} style={{ color: 'var(--accent)' }} />
                                MongoDB Atlas & Render Specs
                            </h3>
                            <div style={{ display: 'grid', gap: 9, fontSize: 12.5 }}>
                                {[
                                    ['MongoDB Host', data.cluster.host],
                                    ['Database Name', data.cluster.databaseName],
                                    ['DB Data Size', formatSize(data.cluster.dataSizeBytes)],
                                    ['DB Index Size', formatSize(data.cluster.indexSizeBytes)],
                                    ['Render Environment', data.render.environment],
                                    ['Instance / Hostname', data.render.instanceId],
                                    ['Heap Used / Total', `${formatSize(data.memory.heapUsedBytes)} / ${formatSize(data.memory.heapTotalBytes)}`],
                                    ['Folders / Active Shares', `${data.gridfs.totalFolders} folders · ${data.gridfs.activeShares} share links`],
                                ].map(([k, v]) => (
                                    <div
                                        key={k}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            gap: 12,
                                            paddingBottom: 6,
                                            borderBottom: '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                                        <code style={{ fontWeight: 600, textAlign: 'right', wordBreak: 'break-all' }}>{v}</code>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="g1-card" style={{ padding: 18 }}>
                            <h3 style={{ margin: '0 0 12px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <HardDrive size={17} style={{ color: 'var(--accent)' }} />
                                Storage Distribution by Category
                            </h3>
                            {categories.length === 0 ? (
                                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No active files stored yet.</p>
                            ) : (
                                <div style={{ display: 'grid', gap: 12 }}>
                                    {categories.map((cat) => {
                                        const pct = Math.max(2, Math.round((cat.bytes / totalCatBytes) * 100));
                                        const barColor = CATEGORY_STYLE[cat.category]?.bar || '#64748b';
                                        return (
                                            <div key={cat.category}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                                                    <strong style={{ textTransform: 'capitalize' }}>
                                                        {t(cat.category)} ({cat.count})
                                                    </strong>
                                                    <span className="mono" style={{ color: 'var(--text-secondary)' }}>
                                                        {formatSize(cat.bytes)} · {pct}%
                                                    </span>
                                                </div>
                                                <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                                                    <div
                                                        style={{
                                                            width: `${pct}%`,
                                                            height: '100%',
                                                            background: barColor,
                                                            borderRadius: 999,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* 30-Day Trash Auto-Purge Background Worker Card */}
                            <div
                                style={{
                                    marginTop: 20,
                                    padding: 14,
                                    borderRadius: 12,
                                    background: 'var(--bg-app)',
                                    border: '1px solid var(--border-subtle)',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 13 }}>
                                            30-Day Trash Auto-Purge Worker
                                        </div>
                                        <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                            Last sweep: {formatDate(data.trashPurgeWorker?.lastRunAt, lang)} · Purged:{' '}
                                            {data.trashPurgeWorker?.totalPurgedFiles || 0} file(s)
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="g1-btn g1-btn-secondary"
                                        style={{ padding: '6px 11px', fontSize: 12 }}
                                        disabled={purging}
                                        onClick={handleTriggerPurge}
                                    >
                                        {purging ? <LoaderCircle size={13} className="g1-spin" /> : <Trash2 size={13} />}
                                        {t('runPurgeNow')}
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
