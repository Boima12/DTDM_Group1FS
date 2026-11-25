import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Cloud,
    CloudOff,
    Command,
    Globe,
    LogOut,
    Menu,
    Moon,
    RefreshCw,
    Search,
    Sun,
    UserCheck,
    Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { formatSize } from '../utils/format.js';

export default function Topbar({
    searchQuery,
    onSearchChange,
    onOpenMobileMenu,
    onOpenCommandPalette,
    refreshing = false,
    onRefresh,
}) {
    const navigate = useNavigate();
    const {
        t,
        lang,
        toggleLang,
        theme,
        toggleTheme,
        health,
        user,
        stats,
        setAuthModalOpen,
        signOutUser,
    } = useApp();

    const searchRef = useRef(null);
    const profileMenuRef = useRef(null);
    const [profileOpen, setProfileOpen] = useState(false);

    // Keyboard shortcuts: `/` focuses search, `Ctrl+K` / `Cmd+K` opens Command Palette
    useEffect(() => {
        const onKeyDown = (e) => {
            const tag = document.activeElement?.tagName;
            const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                onOpenCommandPalette?.();
                return;
            }
            if (e.key === '/' && !isTyping) {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onOpenCommandPalette]);

    useEffect(() => {
        if (!profileOpen) return undefined;
        const onDocClick = (e) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [profileOpen]);

    const statusColor =
        health.status === 'ok'
            ? { fg: 'var(--accent-text)', bg: 'var(--accent-soft)', dot: 'var(--accent)' }
            : health.status === 'offline'
            ? { fg: 'var(--danger)', bg: 'var(--danger-soft)', dot: 'var(--danger)' }
            : { fg: 'var(--warning)', bg: 'var(--warning-soft)', dot: 'var(--warning)' };

    const statusLabel =
        health.status === 'ok'
            ? `${health.environment === 'render' ? t('renderConnected') : t('localConnected')}${
                  health.pingMs !== null ? ` · ${health.pingMs}ms` : ''
              }`
            : t('reconnecting');

    const initials = (user?.name || 'G1')
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <header
            style={{
                height: 62,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 20px',
                background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border-subtle)',
            }}
        >
            <button
                type="button"
                className="g1-icon-btn g1-mobile-menu-btn"
                onClick={onOpenMobileMenu}
                aria-label="Open navigation"
            >
                <Menu size={19} />
            </button>

            {/* Live Clickable Cloud Status Pill -> Opens Telemetry Dashboard */}
            <button
                type="button"
                onClick={() => navigate('/telemetry')}
                title="Open Live Cloud Telemetry"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '6px 11px',
                    borderRadius: 999,
                    border: '1px solid transparent',
                    background: statusColor.bg,
                    color: statusColor.fg,
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                }}
                className="g1-status-pill"
            >
                <span className="g1-pulse-dot" style={{ background: statusColor.dot }} />
                {health.status === 'offline' ? <CloudOff size={13} /> : <Cloud size={13} />}
                <span>{statusLabel}</span>
            </button>

            {/* Search Input */}
            <label
                style={{
                    flex: 1,
                    maxWidth: 520,
                    margin: '0 auto',
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0 12px',
                    borderRadius: 10,
                    border: '1px solid var(--border-strong)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-muted)',
                }}
            >
                <Search size={15} />
                <input
                    ref={searchRef}
                    type="search"
                    value={searchQuery}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    aria-label={t('searchPlaceholder')}
                    style={{
                        flex: 1,
                        minWidth: 0,
                        border: 0,
                        outline: 0,
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        fontSize: 13,
                    }}
                />
                <button
                    type="button"
                    onClick={onOpenCommandPalette}
                    title="Command Palette (Ctrl+K)"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        padding: '2px 6px',
                        borderRadius: 5,
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-muted)',
                        fontSize: 11,
                        cursor: 'pointer',
                    }}
                    className="mono g1-kbd-hint"
                >
                    <Command size={11} />K
                </button>
            </label>

            {/* Quick Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                    type="button"
                    className="g1-icon-btn"
                    onClick={onRefresh}
                    title={t('refresh')}
                    aria-label={t('refresh')}
                >
                    <RefreshCw size={16} className={refreshing ? 'g1-spin' : ''} />
                </button>

                <button
                    type="button"
                    className="g1-btn g1-btn-ghost"
                    style={{ padding: '5px 8px', fontSize: 11.5 }}
                    onClick={toggleLang}
                    title="Switch Language (EN / VI)"
                >
                    <Globe size={14} />
                    <span className="mono">{lang.toUpperCase()}</span>
                </button>

                <button
                    type="button"
                    className="g1-icon-btn"
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                </button>

                {/* Interactive Profile & Workspace Switcher */}
                <div ref={profileMenuRef} style={{ position: 'relative', marginLeft: 4 }}>
                    <button
                        type="button"
                        onClick={() => setProfileOpen((v) => !v)}
                        aria-label="Account menu"
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            border: '2px solid var(--accent-soft)',
                            background: user?.avatarColor || 'var(--accent)',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {initials}
                    </button>

                    {profileOpen && (
                        <div
                            style={{
                                position: 'absolute',
                                right: 0,
                                top: 44,
                                width: 268,
                                zIndex: 1350,
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 14,
                                boxShadow: 'var(--shadow-lg)',
                                padding: 12,
                                animation: 'g1PopIn 140ms ease-out',
                            }}
                        >
                            <div
                                style={{
                                    padding: '6px 8px 12px',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    marginBottom: 8,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <strong style={{ fontSize: 14 }}>{user?.name || 'Guest'}</strong>
                                    {user?.role === 'demo' && (
                                        <span
                                            style={{
                                                fontSize: 10,
                                                fontWeight: 700,
                                                padding: '2px 6px',
                                                borderRadius: 999,
                                                background: 'var(--accent-soft)',
                                                color: 'var(--accent-text)',
                                            }}
                                        >
                                            DEMO
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                    {user?.email}
                                </div>
                                <div
                                    className="mono"
                                    style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}
                                >
                                    {formatSize(stats.totalUsedBytes)} / {formatSize(stats.quotaBytes)}
                                </div>
                            </div>

                            <button
                                type="button"
                                className="g1-btn g1-btn-ghost"
                                style={{ width: '100%', justifyContent: 'flex-start' }}
                                onClick={() => {
                                    setProfileOpen(false);
                                    setAuthModalOpen(true);
                                }}
                            >
                                <Users size={15} />
                                {t('switchAccount')}
                            </button>

                            <button
                                type="button"
                                className="g1-btn g1-btn-ghost"
                                style={{ width: '100%', justifyContent: 'flex-start' }}
                                onClick={() => {
                                    setProfileOpen(false);
                                    navigate('/telemetry');
                                }}
                            >
                                <UserCheck size={15} />
                                {t('cloudTelemetry')}
                            </button>

                            <button
                                type="button"
                                className="g1-btn g1-btn-ghost"
                                style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)' }}
                                onClick={() => {
                                    setProfileOpen(false);
                                    signOutUser();
                                }}
                            >
                                <LogOut size={15} />
                                {t('signOut')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .g1-mobile-menu-btn { display: none; }
                @media (max-width: 900px) {
                    .g1-mobile-menu-btn { display: inline-flex; }
                }
                @media (max-width: 680px) {
                    .g1-status-pill, .g1-kbd-hint { display: none !important; }
                }
            `}</style>
        </header>
    );
}
