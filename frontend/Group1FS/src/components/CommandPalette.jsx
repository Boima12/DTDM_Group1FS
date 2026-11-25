import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    FilePlus2,
    Folder,
    FolderPlus,
    Globe,
    Moon,
    Search,
    Server,
    Star,
    Sun,
    Trash2,
} from 'lucide-react';
import api from '../utils/axios.js';
import { useApp } from '../context/AppContext.jsx';
import { formatSize } from '../utils/format.js';
import FileTypeBadge from './FileIcon.jsx';

export default function CommandPalette({
    visible,
    onClose,
    onUploadClick,
    onNewFolderClick,
    onSelectFile,
}) {
    const navigate = useNavigate();
    const { t, theme, toggleTheme, toggleLang } = useApp();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!visible) return;
        setQuery('');
        setResults([]);
        const id = window.setTimeout(() => inputRef.current?.focus(), 20);
        return () => window.clearTimeout(id);
    }, [visible]);

    useEffect(() => {
        if (!visible) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [visible, onClose]);

    useEffect(() => {
        if (!visible) return undefined;
        const timer = window.setTimeout(async () => {
            try {
                const res = await api.get('/fsfiles', {
                    params: { search: query.trim(), folderId: 'all', limit: 6 },
                });
                setResults(res.data?.files || []);
            } catch {
                setResults([]);
            }
        }, 180);
        return () => window.clearTimeout(timer);
    }, [query, visible]);

    if (!visible) return null;

    const actions = [
        { id: 'upload', label: t('uploadFiles'), icon: FilePlus2, run: () => onUploadClick?.() },
        { id: 'folder', label: t('newFolder'), icon: FolderPlus, run: () => onNewFolderClick?.() },
        { id: 'drive', label: t('myDrive'), icon: Folder, run: () => navigate('/') },
        { id: 'starred', label: t('starred'), icon: Star, run: () => navigate('/starred') },
        { id: 'telemetry', label: t('cloudTelemetry'), icon: Server, run: () => navigate('/telemetry') },
        { id: 'activity', label: t('activityLog'), icon: Activity, run: () => navigate('/activity') },
        { id: 'trash', label: t('trash'), icon: Trash2, run: () => navigate('/trash') },
        {
            id: 'theme',
            label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
            icon: theme === 'dark' ? Sun : Moon,
            run: toggleTheme,
        },
        { id: 'lang', label: 'Toggle EN / VI Language', icon: Globe, run: toggleLang },
    ].filter((a) => !query.trim() || a.label.toLowerCase().includes(query.trim().toLowerCase()));

    return (
        <div
            className="g1-modal-overlay"
            style={{ alignItems: 'flex-start', paddingTop: '11vh' }}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
        >
            <div className="g1-modal-box" style={{ maxWidth: 560 }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '13px 16px',
                        borderBottom: '1px solid var(--border-subtle)',
                    }}
                >
                    <Search size={17} style={{ color: 'var(--accent)' }} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('commandPlaceholder')}
                        style={{
                            flex: 1,
                            border: 0,
                            outline: 0,
                            background: 'transparent',
                            color: 'var(--text-primary)',
                            fontSize: 14,
                        }}
                    />
                    <kbd
                        className="mono"
                        style={{
                            fontSize: 11,
                            padding: '2px 6px',
                            borderRadius: 5,
                            background: 'var(--bg-subtle)',
                            color: 'var(--text-muted)',
                        }}
                    >
                        ESC
                    </kbd>
                </div>

                <div style={{ maxHeight: 420, overflowY: 'auto', padding: 10 }}>
                    {results.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    color: 'var(--text-muted)',
                                    padding: '4px 8px 6px',
                                }}
                            >
                                {t('matchingFiles')}
                            </div>
                            {results.map((file) => (
                                <button
                                    key={file._id}
                                    type="button"
                                    className="g1-btn g1-btn-ghost"
                                    style={{
                                        width: '100%',
                                        justifyContent: 'flex-start',
                                        padding: '8px 10px',
                                        fontWeight: 500,
                                    }}
                                    onClick={() => {
                                        onClose?.();
                                        onSelectFile?.(file);
                                    }}
                                >
                                    <FileTypeBadge file={file} size={15} boxSize={28} />
                                    <span
                                        style={{
                                            flex: 1,
                                            textAlign: 'left',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {file.filename}
                                    </span>
                                    <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                                        {formatSize(file.length)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {actions.length > 0 && (
                        <div>
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    color: 'var(--text-muted)',
                                    padding: '4px 8px 6px',
                                }}
                            >
                                {t('quickActions')}
                            </div>
                            {actions.map((action) => {
                                const Icon = action.icon;
                                return (
                                    <button
                                        key={action.id}
                                        type="button"
                                        className="g1-btn g1-btn-ghost"
                                        style={{
                                            width: '100%',
                                            justifyContent: 'flex-start',
                                            padding: '8px 10px',
                                            fontWeight: 500,
                                        }}
                                        onClick={() => {
                                            onClose?.();
                                            action.run();
                                        }}
                                    >
                                        <Icon size={15} style={{ color: 'var(--accent)' }} />
                                        <span>{action.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
