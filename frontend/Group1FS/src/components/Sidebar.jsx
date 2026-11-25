import { NavLink } from 'react-router-dom';
import {
    Activity,
    Cloud,
    FilePlus2,
    Folder,
    FolderPlus,
    HardDrive,
    Server,
    Star,
    Trash2,
    X,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { CATEGORY_STYLE, formatSize } from '../utils/format.js';

export default function Sidebar({
    mobileOpen,
    onCloseMobile,
    onUploadClick,
    onNewFolderClick,
}) {
    const { t, stats } = useApp();

    const navItems = [
        { to: '/', label: t('myDrive'), icon: Folder, count: stats.counts?.active ?? 0, end: true },
        { to: '/starred', label: t('starred'), icon: Star, count: stats.counts?.starred ?? 0 },
        { to: '/activity', label: t('activityLog'), icon: Activity, count: null },
        { to: '/telemetry', label: t('cloudTelemetry'), icon: Server, count: null },
        { to: '/trash', label: t('trash'), icon: Trash2, count: stats.counts?.trash ?? 0, danger: true },
    ];

    const quotaBytes = stats.quotaBytes || 1;
    const segments = ['document', 'image', 'video', 'audio', 'archive', 'other', 'trash']
        .map((key) => ({
            key,
            bytes: stats.breakdown?.[key] || 0,
            pct: Math.min(100, ((stats.breakdown?.[key] || 0) / quotaBytes) * 100),
            color: CATEGORY_STYLE[key]?.bar || '#64748b',
        }))
        .filter((s) => s.bytes > 0);

    const sidebarContent = (
        <aside
            style={{
                width: 268,
                minWidth: 268,
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                padding: '18px 16px',
                background: 'var(--bg-surface)',
                borderRight: '1px solid var(--border-subtle)',
                overflowY: 'auto',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 20,
                    padding: '0 4px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                            boxShadow: '0 4px 12px rgba(0, 122, 92, 0.28)',
                        }}
                    >
                        <Cloud size={19} />
                    </span>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.15 }}>
                            {t('appName')}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            v2.0 · GridFS Cloud
                        </div>
                    </div>
                </div>
                {mobileOpen && (
                    <button type="button" className="g1-icon-btn" onClick={onCloseMobile} aria-label="Close menu">
                        <X size={18} />
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
                <button
                    type="button"
                    className="g1-btn g1-btn-primary"
                    style={{ height: 40, width: '100%' }}
                    onClick={() => {
                        onCloseMobile?.();
                        onUploadClick?.();
                    }}
                >
                    <FilePlus2 size={17} />
                    <span>{t('uploadFiles')}</span>
                </button>
                <button
                    type="button"
                    className="g1-btn g1-btn-secondary"
                    style={{ height: 36, width: '100%' }}
                    onClick={() => {
                        onCloseMobile?.();
                        onNewFolderClick?.();
                    }}
                >
                    <FolderPlus size={16} />
                    <span>{t('newFolder')}</span>
                </button>
            </div>

            <nav aria-label="Main Navigation" style={{ display: 'grid', gap: 4 }}>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={onCloseMobile}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '9px 12px',
                                borderRadius: 10,
                                textDecoration: 'none',
                                fontSize: 13,
                                fontWeight: isActive ? 600 : 500,
                                color: isActive
                                    ? item.danger
                                        ? '#ffffff'
                                        : 'var(--accent-text)'
                                    : 'var(--text-secondary)',
                                background: isActive
                                    ? item.danger
                                        ? 'var(--danger)'
                                        : 'var(--accent-soft)'
                                    : 'transparent',
                                transition: 'all 150ms ease',
                            })}
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon size={17} />
                                    <span style={{ flex: 1 }}>{item.label}</span>
                                    {item.count !== null && (
                                        <span
                                            className="mono"
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                padding: '1px 7px',
                                                borderRadius: 999,
                                                background: isActive
                                                    ? item.danger
                                                        ? 'rgba(255,255,255,0.22)'
                                                        : 'var(--bg-surface)'
                                                    : item.danger && item.count > 0
                                                    ? 'var(--danger-soft)'
                                                    : 'var(--bg-subtle)',
                                                color: isActive
                                                    ? item.danger
                                                        ? '#fff'
                                                        : 'var(--accent-text)'
                                                    : item.danger && item.count > 0
                                                    ? 'var(--danger)'
                                                    : 'var(--text-muted)',
                                            }}
                                        >
                                            {item.count}
                                        </span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Real Segmented Cloud Storage Quota Card */}
            <div
                style={{
                    marginTop: 'auto',
                    padding: 14,
                    borderRadius: 12,
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12,
                        marginBottom: 8,
                    }}
                >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                        <HardDrive size={14} style={{ color: 'var(--accent)' }} />
                        {t('storageCapacity')}
                    </span>
                    <strong className="mono" style={{ color: 'var(--accent-text)', fontSize: 12 }}>
                        {stats.usagePercent ?? 0}%
                    </strong>
                </div>

                {/* Segmented category bar */}
                <div
                    style={{
                        height: 7,
                        borderRadius: 999,
                        overflow: 'hidden',
                        background: 'var(--border-subtle)',
                        display: 'flex',
                        gap: 1,
                        marginBottom: 9,
                    }}
                >
                    {segments.map((seg) => (
                        <span
                            key={seg.key}
                            title={`${t(seg.key)}: ${formatSize(seg.bytes)}`}
                            style={{
                                width: `${Math.max(seg.pct, 1.5)}%`,
                                background: seg.color,
                                height: '100%',
                            }}
                        />
                    ))}
                </div>

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 11,
                        color: 'var(--text-muted)',
                    }}
                >
                    <span className="mono">
                        {formatSize(stats.totalUsedBytes)} / {formatSize(stats.quotaBytes)}
                    </span>
                    <span className="mono">GridFS</span>
                </div>
            </div>
        </aside>
    );

    return (
        <>
            {/* Desktop fixed sidebar */}
            <div className="g1-sidebar-desktop">{sidebarContent}</div>

            {/* Mobile drawer overlay */}
            {mobileOpen && (
                <div
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) onCloseMobile?.();
                    }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1300,
                        background: 'var(--bg-overlay)',
                        display: 'flex',
                    }}
                >
                    {sidebarContent}
                </div>
            )}

            <style>{`
                .g1-sidebar-desktop { display: block; }
                @media (max-width: 900px) {
                    .g1-sidebar-desktop { display: none; }
                }
            `}</style>
        </>
    );
}
