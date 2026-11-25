import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Archive,
    ArrowUpDown,
    Check,
    ChevronLeft,
    ChevronRight,
    Cloud,
    Copy,
    Download,
    FileAudio,
    FileCode2,
    FileImage,
    FileText,
    FileVideo,
    Folder,
    FolderInput,
    FolderPlus,
    Grid2X2,
    History,
    List,
    MoreVertical,
    Pencil,
    QrCode,
    Star,
    Trash2,
    UploadCloud,
} from 'lucide-react';
import api, { buildFileStreamUrl } from '../utils/axios.js';
import { useApp } from '../context/AppContext.jsx';
import {
    copyToClipboard,
    formatDate,
    formatSize,
    normalizeCategory,
    triggerBlobDownload,
} from '../utils/format.js';
import FileTypeBadge from '../components/FileIcon.jsx';
import MoreMenuPopover from '../components/MoreMenuPopover.jsx';
import PreviewModal from '../components/PreviewModal.jsx';
import FileDetailModal from '../components/FileDetailModal.jsx';
import ShareModal from '../components/ShareModal.jsx';
import RenameModal from '../components/RenameModal.jsx';
import { FolderCreateEditModal, MoveToFolderModal } from '../components/FolderModal.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const CATEGORIES = [
    { id: 'all', key: 'all', icon: Grid2X2 },
    { id: 'document', key: 'document', icon: FileText },
    { id: 'image', key: 'image', icon: FileImage },
    { id: 'video', key: 'video', icon: FileVideo },
    { id: 'audio', key: 'audio', icon: FileAudio },
    { id: 'archive', key: 'archive', icon: Archive },
    { id: 'other', key: 'other', icon: FileCode2 },
];

export default function MyDrivePage({
    starredOnly = false,
    searchQuery = '',
    currentFolderId = null,
    onFolderChange,
    onOpenUpload,
    onOpenNewFolder,
    externalPreviewFile = null,
    onClearExternalPreview,
}) {
    const { t, lang, refreshTick, triggerRefresh, showToast, enqueueUploads } = useApp();

    const [files, setFiles] = useState([]);
    const [folders, setFolders] = useState([]);
    const [breadcrumb, setBreadcrumb] = useState([]);
    const [categoryCounts, setCategoryCounts] = useState({ all: 0 });
    const [pagination, setPagination] = useState({ page: 1, limit: 24, total: 0, totalPages: 1 });

    const [category, setCategory] = useState('all');
    const [sort, setSort] = useState('uploadDate:desc');
    const [view, setView] = useState(() => localStorage.getItem('g1fs_view') || 'list');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [bulkBusy, setBulkBusy] = useState(false);

    // Modals & Popovers
    const [menuState, setMenuState] = useState({ file: null, rect: null });
    const [previewFile, setPreviewFile] = useState(null);
    const [detailState, setDetailState] = useState({ file: null, tab: 'overview' });
    const [shareFile, setShareFile] = useState(null);
    const [renameFile, setRenameFile] = useState(null);
    const [moveIds, setMoveIds] = useState([]);
    const [editFolder, setEditFolder] = useState(null);
    const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);
    const [deletingFolder, setDeletingFolder] = useState(false);

    // Drag & Drop over folder + Global Window Drop Overlay
    const [dragOverFolderId, setDragOverFolderId] = useState(null);
    const [windowDragging, setWindowDragging] = useState(false);
    const dragDepthRef = useRef(0);
    const versionUploadRef = useRef(null);
    const [versionTargetFile, setVersionTargetFile] = useState(null);

    // Debounced search query
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(searchQuery.trim());
            setPage(1);
        }, 260);
        return () => window.clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        localStorage.setItem('g1fs_view', view);
    }, [view]);

    useEffect(() => {
        if (externalPreviewFile) {
            setPreviewFile(externalPreviewFile);
            onClearExternalPreview?.();
        }
    }, [externalPreviewFile, onClearExternalPreview]);

    const fetchWorkspace = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = {
                search: debouncedSearch,
                category,
                sort,
                page,
                limit: 24,
                trash: 'false',
            };
            if (starredOnly) {
                params.starred = 'true';
            } else if (!debouncedSearch) {
                params.folderId = currentFolderId || 'root';
            } else {
                params.folderId = 'all';
            }

            const requests = [api.get('/fsfiles', { params })];

            if (!starredOnly && !debouncedSearch) {
                requests.push(api.get('/folders', { params: { parentId: currentFolderId || 'root' } }));
                if (currentFolderId) {
                    requests.push(api.get(`/folders/${currentFolderId}/breadcrumb`));
                }
            }

            const [filesRes, foldersRes, bcRes] = await Promise.all(requests);
            setFiles(filesRes.data?.files || []);
            setCategoryCounts(filesRes.data?.categoryCounts || { all: 0 });
            setPagination(filesRes.data?.pagination || { page: 1, limit: 24, total: 0, totalPages: 1 });
            setFolders(foldersRes?.data?.folders || []);
            setBreadcrumb(bcRes?.data?.path || []);
            setSelected((curr) =>
                curr.filter((id) => (filesRes.data?.files || []).some((f) => f._id === id))
            );
        } catch (err) {
            setError(err.response?.data?.msg || err.message || 'Failed to load files.');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, category, sort, page, starredOnly, currentFolderId]);

    useEffect(() => {
        fetchWorkspace();
    }, [fetchWorkspace, refreshTick]);

    // Global Window Drag-and-Drop to Upload Anywhere!
    useEffect(() => {
        const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');

        const onDragEnter = (e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            dragDepthRef.current += 1;
            setWindowDragging(true);
        };
        const onDragOver = (e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
        };
        const onDragLeave = (e) => {
            if (!hasFiles(e)) return;
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
            if (dragDepthRef.current === 0) setWindowDragging(false);
        };
        const onDrop = (e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            dragDepthRef.current = 0;
            setWindowDragging(false);
            if (e.dataTransfer?.files?.length) {
                enqueueUploads(e.dataTransfer.files, { folderId: currentFolderId || null });
            }
        };

        window.addEventListener('dragenter', onDragEnter);
        window.addEventListener('dragover', onDragOver);
        window.addEventListener('dragleave', onDragLeave);
        window.addEventListener('drop', onDrop);
        return () => {
            window.removeEventListener('dragenter', onDragEnter);
            window.removeEventListener('dragover', onDragOver);
            window.removeEventListener('dragleave', onDragLeave);
            window.removeEventListener('drop', onDrop);
        };
    }, [currentFolderId, enqueueUploads]);

    // Ctrl+V Paste Image from Clipboard directly to Cloud!
    useEffect(() => {
        const onPaste = (e) => {
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            const items = Array.from(e.clipboardData?.items || []);
            const pastedFiles = items
                .filter((i) => i.kind === 'file')
                .map((i) => i.getAsFile())
                .filter(Boolean);
            if (pastedFiles.length > 0) {
                const renamed = pastedFiles.map((f, idx) => {
                    const ext = f.type.split('/')[1] || 'png';
                    const name = f.name && f.name !== 'image.png' ? f.name : `Clipboard_${Date.now()}_${idx + 1}.${ext}`;
                    return new File([f], name, { type: f.type });
                });
                enqueueUploads(renamed, { folderId: currentFolderId || null });
            }
        };
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, [currentFolderId, enqueueUploads]);

    const visibleIds = files.map((f) => f._id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

    const toggleSelect = (id) => {
        setSelected((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]));
    };

    const toggleSelectAll = () => {
        setSelected(allSelected ? [] : visibleIds);
    };

    const handleDownloadSingle = (file) => {
        const link = document.createElement('a');
        link.href = buildFileStreamUrl(file._id, 'download');
        link.setAttribute('download', file.filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast(`Downloading "${file.filename}"...`, { type: 'info' });
    };

    const handleBulkDownloadZip = async () => {
        if (selected.length === 0 || bulkBusy) return;
        setBulkBusy(true);
        try {
            const res = await api.post('/fsfiles/download/selected', { ids: selected }, { responseType: 'blob' });
            const cd = res.headers['content-disposition'] || '';
            const match = cd.match(/filename="?([^";]+)"?/);
            const zipName = match?.[1] ? decodeURIComponent(match[1]) : `Group1FS_Archive_${Date.now()}.zip`;
            triggerBlobDownload(new Blob([res.data], { type: 'application/zip' }), zipName);
            showToast(`Downloaded ${selected.length} file(s) as ZIP.`, { type: 'success' });
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        } finally {
            setBulkBusy(false);
        }
    };

    const handleTrashFiles = async (ids, label = '') => {
        if (!ids.length) return;
        try {
            setBulkBusy(true);
            await api.put(`/fsfiles/update/markFilesAsTrash/${ids.join(',')}`, { ids });
            setSelected((curr) => curr.filter((id) => !ids.includes(id)));
            triggerRefresh();
            showToast(
                label ? `Moved "${label}" to Trash` : `Moved ${ids.length} file(s) to Trash`,
                {
                    type: 'info',
                    duration: 7000,
                    actionLabel: t('undo'),
                    onAction: async () => {
                        try {
                            await api.put(`/fsfiles/update/restore/${ids.join(',')}`);
                            triggerRefresh();
                            showToast('Restored from Trash!', { type: 'success' });
                        } catch (e) {
                            showToast(e.response?.data?.msg || e.message, { type: 'error' });
                        }
                    },
                }
            );
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        } finally {
            setBulkBusy(false);
        }
    };

    const handleToggleStar = async (file) => {
        const nextStarred = !file.metadata?.starred;
        try {
            await api.patch(`/fsfiles/${file._id}/details`, { starred: nextStarred });
            triggerRefresh();
            showToast(nextStarred ? `Starred "${file.filename}"` : `Removed star from "${file.filename}"`, {
                type: 'success',
                duration: 2600,
            });
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        }
    };

    const handleMoveSingleToFolder = async (fileId, folderId, folderName) => {
        try {
            await api.put('/fsfiles/move', { ids: [fileId], folderId });
            triggerRefresh();
            showToast(`Moved file into "${folderName}"`, { type: 'success' });
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        }
    };

    const handleDeleteFolderConfirm = async () => {
        if (!deleteFolderTarget) return;
        setDeletingFolder(true);
        try {
            const res = await api.delete(`/folders/${deleteFolderTarget._id}`);
            showToast(res.data.msg, { type: 'info' });
            setDeleteFolderTarget(null);
            triggerRefresh();
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        } finally {
            setDeletingFolder(false);
        }
    };

    const handleVersionFilePicked = async (e) => {
        const picked = e.target.files?.[0];
        e.target.value = '';
        if (!picked || !versionTargetFile) return;
        try {
            const fd = new FormData();
            fd.append('file', picked);
            const res = await api.post(`/fsfiles/${versionTargetFile._id}/versions`, fd);
            showToast(res.data.msg, { type: 'success' });
            triggerRefresh();
        } catch (err) {
            showToast(err.response?.data?.msg || err.message, { type: 'error' });
        } finally {
            setVersionTargetFile(null);
        }
    };

    return (
        <div className="g1-content-scroll">
            <input ref={versionUploadRef} type="file" hidden onChange={handleVersionFilePicked} />

            {/* Global Window Drop Overlay */}
            {windowDragging && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 14,
                        zIndex: 1550,
                        borderRadius: 20,
                        border: '3px dashed var(--accent)',
                        background: 'var(--bg-overlay)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        color: '#ffffff',
                        pointerEvents: 'none',
                    }}
                >
                    <UploadCloud size={56} style={{ color: '#34d399' }} />
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{t('dropAnywhereTitle')}</div>
                    <div style={{ fontSize: 14, opacity: 0.85 }}>{t('dropAnywhereSub')}</div>
                </div>
            )}

            {/* Breadcrumb Header */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginBottom: 16,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, fontSize: 15 }}>
                    <button
                        type="button"
                        onClick={() => {
                            setPage(1);
                            onFolderChange?.(null);
                        }}
                        style={{
                            border: 0,
                            background: 'transparent',
                            color: currentFolderId ? 'var(--text-muted)' : 'var(--text-primary)',
                            fontWeight: currentFolderId ? 600 : 800,
                            fontSize: 17,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                            padding: 0,
                        }}
                    >
                        {starredOnly ? <Star size={18} style={{ color: '#f59e0b' }} /> : <Cloud size={18} style={{ color: 'var(--accent)' }} />}
                        {starredOnly ? t('starred') : t('myDrive')}
                    </button>

                    {!starredOnly &&
                        breadcrumb.map((crumb, idx) => (
                            <span key={crumb._id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPage(1);
                                        onFolderChange?.(crumb._id);
                                    }}
                                    style={{
                                        border: 0,
                                        background: 'transparent',
                                        color: idx === breadcrumb.length - 1 ? 'var(--text-primary)' : 'var(--text-muted)',
                                        fontWeight: idx === breadcrumb.length - 1 ? 800 : 600,
                                        fontSize: 16,
                                        cursor: 'pointer',
                                        padding: 0,
                                    }}
                                >
                                    {crumb.name}
                                </button>
                            </span>
                        ))}

                    {debouncedSearch && (
                        <span style={{ fontSize: 13, color: 'var(--accent-text)', marginLeft: 8 }}>
                            · Search: &ldquo;{debouncedSearch}&rdquo;
                        </span>
                    )}
                </div>

                {/* View Mode Toggle */}
                <div
                    style={{
                        display: 'inline-flex',
                        padding: 3,
                        borderRadius: 10,
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setView('list')}
                        aria-label="List view"
                        className="g1-icon-btn"
                        style={{
                            width: 32,
                            height: 30,
                            background: view === 'list' ? 'var(--accent)' : 'transparent',
                            color: view === 'list' ? '#fff' : 'var(--text-secondary)',
                        }}
                    >
                        <List size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setView('grid')}
                        aria-label="Grid view"
                        className="g1-icon-btn"
                        style={{
                            width: 32,
                            height: 30,
                            background: view === 'grid' ? 'var(--accent)' : 'transparent',
                            color: view === 'grid' ? '#fff' : 'var(--text-secondary)',
                        }}
                    >
                        <Grid2X2 size={16} />
                    </button>
                </div>
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const active = category === cat.id;
                    const count = categoryCounts[cat.id] || 0;
                    return (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                                setCategory(cat.id);
                                setPage(1);
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: 999,
                                border: `1px solid ${active ? 'var(--accent)' : 'var(--border-subtle)'}`,
                                background: active ? 'var(--accent)' : 'var(--bg-surface)',
                                color: active ? '#ffffff' : 'var(--text-secondary)',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 140ms ease',
                            }}
                        >
                            <Icon size={13} />
                            <span>{t(cat.key)}</span>
                            <span
                                className="mono"
                                style={{
                                    fontSize: 11,
                                    opacity: active ? 0.9 : 0.7,
                                }}
                            >
                                ({count})
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Folders Section (Interactive Drag Target!) */}
            {!starredOnly && !debouncedSearch && folders.length > 0 && (
                <section style={{ marginBottom: 20 }}>
                    <div
                        style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--text-muted)',
                            marginBottom: 9,
                        }}
                    >
                        {t('folders')} ({folders.length})
                    </div>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: 10,
                        }}
                    >
                        {folders.map((folder) => {
                            const isDropTarget = dragOverFolderId === folder._id;
                            return (
                                <div
                                    key={folder._id}
                                    onClick={() => {
                                        setPage(1);
                                        onFolderChange?.(folder._id);
                                    }}
                                    onDragOver={(e) => {
                                        if (e.dataTransfer.types.includes('application/x-g1fs-file-id')) {
                                            e.preventDefault();
                                            setDragOverFolderId(folder._id);
                                        }
                                    }}
                                    onDragLeave={() => setDragOverFolderId(null)}
                                    onDrop={(e) => {
                                        const draggedFileId = e.dataTransfer.getData('application/x-g1fs-file-id');
                                        setDragOverFolderId(null);
                                        if (draggedFileId) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleMoveSingleToFolder(draggedFileId, folder._id, folder.name);
                                        }
                                    }}
                                    className="g1-card"
                                    style={{
                                        padding: '12px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 11,
                                        cursor: 'pointer',
                                        borderColor: isDropTarget ? 'var(--accent)' : 'var(--border-subtle)',
                                        background: isDropTarget ? 'var(--accent-soft)' : 'var(--bg-surface)',
                                        transition: 'all 150ms ease',
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: 10,
                                            background: `${folder.color || '#007a5c'}20`,
                                            color: folder.color || '#007a5c',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Folder size={20} fill="currentColor" fillOpacity={0.22} />
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            title={folder.name}
                                            style={{
                                                fontWeight: 700,
                                                fontSize: 13.5,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}
                                        >
                                            {folder.name}
                                        </div>
                                        <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            {folder.fileCount} files · {formatSize(folder.totalSize)}
                                        </div>
                                    </div>
                                    <div
                                        style={{ display: 'flex', gap: 2 }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            type="button"
                                            className="g1-icon-btn"
                                            style={{ width: 28, height: 28 }}
                                            title="Edit folder"
                                            onClick={() => setEditFolder(folder)}
                                        >
                                            <Pencil size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            className="g1-icon-btn"
                                            style={{ width: 28, height: 28, color: 'var(--danger)' }}
                                            title="Delete folder"
                                            onClick={() => setDeleteFolderTarget(folder)}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Toolbar: Sort + Bulk Selection Actions */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    marginBottom: 14,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <ArrowUpDown size={14} style={{ color: 'var(--accent)' }} />
                        <span>{t('sortBy')}:</span>
                        <select
                            value={sort}
                            onChange={(e) => {
                                setSort(e.target.value);
                                setPage(1);
                            }}
                            style={{
                                padding: '5px 8px',
                                borderRadius: 8,
                                border: '1px solid var(--border-strong)',
                                background: 'var(--bg-surface)',
                                color: 'var(--text-primary)',
                                fontSize: 12.5,
                                fontWeight: 600,
                            }}
                        >
                            <option value="uploadDate:desc">{t('sortNewest')}</option>
                            <option value="uploadDate:asc">{t('sortOldest')}</option>
                            <option value="filename:asc">{t('sortNameAsc')}</option>
                            <option value="filename:desc">{t('sortNameDesc')}</option>
                            <option value="length:desc">{t('sortSizeDesc')}</option>
                            <option value="length:asc">{t('sortSizeAsc')}</option>
                        </select>
                    </label>

                    <span>
                        {t('selectedCount')}: <strong className="mono">{selected.length}</strong> / {files.length}
                    </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <button
                        type="button"
                        className="g1-btn g1-btn-secondary"
                        style={{ padding: '6px 11px', fontSize: 12 }}
                        disabled={selected.length === 0 || bulkBusy}
                        onClick={handleBulkDownloadZip}
                    >
                        <Download size={14} /> {t('downloadSelected')}
                    </button>
                    <button
                        type="button"
                        className="g1-btn g1-btn-secondary"
                        style={{ padding: '6px 11px', fontSize: 12 }}
                        disabled={selected.length === 0 || bulkBusy}
                        onClick={() => setMoveIds(selected)}
                    >
                        <FolderInput size={14} /> {t('moveSelected')}
                    </button>
                    <button
                        type="button"
                        className="g1-btn g1-btn-danger-soft"
                        style={{ padding: '6px 11px', fontSize: 12 }}
                        disabled={selected.length === 0 || bulkBusy}
                        onClick={() => handleTrashFiles(selected)}
                    >
                        <Trash2 size={14} /> {t('trashSelected')}
                    </button>
                </div>
            </div>

            {error && (
                <div
                    role="alert"
                    style={{
                        padding: 16,
                        borderRadius: 12,
                        background: 'var(--danger-soft)',
                        color: 'var(--danger)',
                        marginBottom: 14,
                        fontSize: 13,
                        fontWeight: 600,
                    }}
                >
                    {error}
                </div>
            )}

            {/* Skeleton Loading State */}
            {loading && files.length === 0 && (
                <div className="g1-card" style={{ padding: 16, display: 'grid', gap: 12 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="g1-skeleton" style={{ width: 34, height: 34, borderRadius: 8 }} />
                            <div style={{ flex: 1, display: 'grid', gap: 6 }}>
                                <div className="g1-skeleton" style={{ height: 14, width: `${45 + n * 7}%` }} />
                                <div className="g1-skeleton" style={{ height: 10, width: '25%' }} />
                            </div>
                            <div className="g1-skeleton" style={{ height: 14, width: 70 }} />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && files.length === 0 && (
                <div className="g1-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div
                        style={{
                            width: 60,
                            height: 60,
                            margin: '0 auto 14px',
                            borderRadius: 16,
                            background: 'var(--accent-soft)',
                            color: 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <UploadCloud size={28} />
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700 }}>
                        {debouncedSearch ? t('noSearchTitle') : t('noFilesTitle')}
                    </h3>
                    <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text-muted)' }}>
                        {t('noFilesHint')}
                    </p>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button type="button" className="g1-btn g1-btn-primary" onClick={onOpenUpload}>
                            <UploadCloud size={15} /> {t('uploadFiles')}
                        </button>
                        {!starredOnly && (
                            <button type="button" className="g1-btn g1-btn-secondary" onClick={onOpenNewFolder}>
                                <FolderPlus size={15} /> {t('newFolder')}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* LIST VIEW */}
            {view === 'list' && files.length > 0 && (
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
                                        letterSpacing: '0.04em',
                                    }}
                                >
                                    <th style={{ width: 42, padding: '10px 12px', textAlign: 'center' }}>
                                        <button
                                            type="button"
                                            onClick={toggleSelectAll}
                                            aria-label="Select all"
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
                                    <th style={{ padding: '10px 10px', textAlign: 'left', width: 110 }}>{t('size')}</th>
                                    <th style={{ padding: '10px 10px', textAlign: 'left', width: 155 }}>{t('uploadDate')}</th>
                                    <th style={{ padding: '10px 10px', textAlign: 'left', width: 195 }}>{t('documentId')}</th>
                                    <th style={{ width: 92, padding: '10px 10px' }} />
                                </tr>
                            </thead>
                            <tbody>
                                {files.map((file) => {
                                    const isSel = selected.includes(file._id);
                                    const isStarred = Boolean(file.metadata?.starred);
                                    return (
                                        <tr
                                            key={file._id}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('application/x-g1fs-file-id', file._id);
                                            }}
                                            onDoubleClick={() => setPreviewFile(file)}
                                            style={{
                                                borderBottom: '1px solid var(--border-subtle)',
                                                background: isSel ? 'var(--bg-selected)' : 'transparent',
                                                transition: 'background 120ms ease',
                                            }}
                                        >
                                            <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSelect(file._id)}
                                                    aria-label={`Select ${file.filename}`}
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
                                            <td style={{ padding: '11px 10px', maxWidth: 360 }}>
                                                <div
                                                    onClick={() => setPreviewFile(file)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 10,
                                                        cursor: 'pointer',
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    <FileTypeBadge file={file} size={17} boxSize={34} />
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <strong
                                                                title={file.filename}
                                                                style={{
                                                                    fontWeight: 600,
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    maxWidth: 260,
                                                                }}
                                                            >
                                                                {file.filename}
                                                            </strong>
                                                            {(file.metadata?.version || 1) > 1 && (
                                                                <span
                                                                    className="mono"
                                                                    style={{
                                                                        fontSize: 10,
                                                                        fontWeight: 700,
                                                                        padding: '1px 5px',
                                                                        borderRadius: 999,
                                                                        background: 'var(--info-soft)',
                                                                        color: 'var(--info)',
                                                                    }}
                                                                >
                                                                    v{file.metadata.version}
                                                                </span>
                                                            )}
                                                            {file.activeShareCount > 0 && (
                                                                <span
                                                                    title="Shared publicly"
                                                                    style={{ color: 'var(--accent)', display: 'inline-flex' }}
                                                                >
                                                                    <QrCode size={13} />
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                                                            {file.metadata?.contentType || 'application/octet-stream'}
                                                            {file.metadata?.tags?.length > 0 &&
                                                                ` · #${file.metadata.tags.slice(0, 2).join(' #')}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="mono" style={{ padding: '11px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {formatSize(file.length)}
                                            </td>
                                            <td className="mono" style={{ padding: '11px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {formatDate(file.uploadDate, lang)}
                                            </td>
                                            <td style={{ padding: '11px 10px' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    <code style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                                                        {file._id.slice(0, 12)}...
                                                    </code>
                                                    <button
                                                        type="button"
                                                        className="g1-icon-btn"
                                                        style={{ width: 24, height: 24 }}
                                                        title="Copy Document ID"
                                                        onClick={async () => {
                                                            await copyToClipboard(file._id);
                                                            showToast('Document ID copied!', { type: 'info', duration: 2000 });
                                                        }}
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td style={{ padding: '11px 10px', textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                                    <button
                                                        type="button"
                                                        className="g1-icon-btn"
                                                        style={{ width: 30, height: 30, color: isStarred ? '#f59e0b' : 'var(--text-muted)' }}
                                                        title={isStarred ? t('unstar') : t('star')}
                                                        onClick={() => handleToggleStar(file)}
                                                    >
                                                        <Star size={15} fill={isStarred ? '#f59e0b' : 'none'} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="g1-icon-btn"
                                                        style={{ width: 30, height: 30 }}
                                                        aria-label={`Actions for ${file.filename}`}
                                                        onClick={(e) => {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setMenuState({ file, rect });
                                                        }}
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Real Pagination Footer */}
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

            {/* GRID VIEW */}
            {view === 'grid' && files.length > 0 && (
                <>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(225px, 1fr))',
                            gap: 14,
                        }}
                    >
                        {files.map((file) => {
                            const isSel = selected.includes(file._id);
                            const isImg = normalizeCategory(file.metadata?.category) === 'image';
                            const isStarred = Boolean(file.metadata?.starred);
                            return (
                                <article
                                    key={file._id}
                                    draggable
                                    onDragStart={(e) => e.dataTransfer.setData('application/x-g1fs-file-id', file._id)}
                                    className="g1-card"
                                    style={{
                                        overflow: 'hidden',
                                        borderColor: isSel ? 'var(--accent)' : 'var(--border-subtle)',
                                        background: isSel ? 'var(--bg-selected)' : 'var(--bg-surface)',
                                    }}
                                >
                                    <div
                                        onClick={() => setPreviewFile(file)}
                                        style={{
                                            height: 144,
                                            position: 'relative',
                                            background: 'var(--bg-subtle)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {isImg ? (
                                            <img
                                                src={buildFileStreamUrl(file._id, 'preview')}
                                                alt={file.filename}
                                                loading="lazy"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <FileTypeBadge file={file} size={32} boxSize={62} />
                                        )}

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleStar(file);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: 8,
                                                left: 8,
                                                width: 30,
                                                height: 30,
                                                borderRadius: 8,
                                                border: 0,
                                                background: 'var(--bg-surface)',
                                                color: isStarred ? '#f59e0b' : 'var(--text-muted)',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: 'var(--shadow-sm)',
                                            }}
                                        >
                                            <Star size={14} fill={isStarred ? '#f59e0b' : 'none'} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMenuState({ file, rect: e.currentTarget.getBoundingClientRect() });
                                            }}
                                            style={{
                                                position: 'absolute',
                                                top: 8,
                                                right: 8,
                                                width: 30,
                                                height: 30,
                                                borderRadius: 8,
                                                border: 0,
                                                background: 'var(--bg-surface)',
                                                color: 'var(--text-primary)',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: 'var(--shadow-sm)',
                                            }}
                                        >
                                            <MoreVertical size={15} />
                                        </button>
                                    </div>

                                    <div style={{ padding: 11, display: 'flex', alignItems: 'center', gap: 9 }}>
                                        <button
                                            type="button"
                                            onClick={() => toggleSelect(file._id)}
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
                                                flexShrink: 0,
                                                padding: 0,
                                            }}
                                        >
                                            {isSel && <Check size={12} />}
                                        </button>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div
                                                title={file.filename}
                                                onClick={() => setPreviewFile(file)}
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {file.filename}
                                            </div>
                                            <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {formatSize(file.length)} · {formatDate(file.uploadDate, lang)}
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {pagination.totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 18 }}>
                            <button
                                type="button"
                                className="g1-btn g1-btn-secondary"
                                disabled={pagination.page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                <ChevronLeft size={14} /> Prev
                            </button>
                            <span className="mono" style={{ fontSize: 12.5 }}>
                                {pagination.page} / {pagination.totalPages}
                            </span>
                            <button
                                type="button"
                                className="g1-btn g1-btn-secondary"
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                            >
                                Next <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Floating Contextual More Menu Popover */}
            <MoreMenuPopover
                file={menuState.file}
                anchorRect={menuState.rect}
                onClose={() => setMenuState({ file: null, rect: null })}
                onPreview={(f) => setPreviewFile(f)}
                onDownload={handleDownloadSingle}
                onShare={(f) => setShareFile(f)}
                onToggleStar={handleToggleStar}
                onRename={(f) => setRenameFile(f)}
                onMove={(f) => setMoveIds([f._id])}
                onUploadVersion={(f) => {
                    setVersionTargetFile(f);
                    versionUploadRef.current?.click();
                }}
                onDetails={(f) => setDetailState({ file: f, tab: 'overview' })}
                onTrash={(f) => handleTrashFiles([f._id], f.filename)}
            />

            {/* Fullscreen Previewer */}
            <PreviewModal
                file={previewFile}
                files={files}
                visible={Boolean(previewFile)}
                onClose={() => setPreviewFile(null)}
                onNavigate={(nextFile) => setPreviewFile(nextFile)}
                onShare={(f) => {
                    setPreviewFile(null);
                    setShareFile(f);
                }}
                onOpenDetails={(f, tab) => setDetailState({ file: f, tab })}
            />

            {/* Tabbed File Details + GridFS Chunk X-Ray + Versions Modal */}
            <FileDetailModal
                file={detailState.file}
                initialTab={detailState.tab}
                visible={Boolean(detailState.file)}
                onClose={() => setDetailState({ file: null, tab: 'overview' })}
            />

            {/* Public Share + QR Modal */}
            <ShareModal
                file={shareFile}
                visible={Boolean(shareFile)}
                onClose={() => setShareFile(null)}
            />

            {/* Rename File Modal */}
            <RenameModal
                file={renameFile}
                visible={Boolean(renameFile)}
                onClose={() => setRenameFile(null)}
            />

            {/* Move Files to Folder Modal */}
            <MoveToFolderModal
                visible={moveIds.length > 0}
                fileIds={moveIds}
                onClose={() => setMoveIds([])}
                onMoved={() => setSelected([])}
            />

            {/* Edit Folder Modal */}
            <FolderCreateEditModal
                visible={Boolean(editFolder)}
                folder={editFolder}
                onClose={() => setEditFolder(null)}
            />

            {/* Delete Folder Confirm Modal */}
            <ConfirmModal
                visible={Boolean(deleteFolderTarget)}
                title="Delete folder?"
                subtitle={deleteFolderTarget?.name}
                warningText="Deleting this folder will remove the folder structure and safely move all files inside it to the Trash Bin."
                confirmLabel="Delete folder"
                loading={deletingFolder}
                onClose={() => setDeleteFolderTarget(null)}
                onConfirm={handleDeleteFolderConfirm}
            />
        </div>
    );
}
