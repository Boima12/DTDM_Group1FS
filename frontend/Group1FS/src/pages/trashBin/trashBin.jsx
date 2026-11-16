import { useEffect, useRef, useState } from "react";
import api from '../../utils/axios.js';
import styles from "./trashBin.module.css";

import {
    Archive,
    ChevronLeft,
    ChevronRight,
    Cloud,
    Copy,
    FileAudio,
    FileCode2,
    FileImage,
    FileText,
    FileVideo,
    Info,
    RefreshCw,
    RotateCcw,
    Search,
    Trash2,
} from 'lucide-react';

function Co_trashBin({
    onNotification,
}) {
    const [error, setError] = useState('');
    const [files, setFiles] = useState([]);
    const [category] = useState('all');
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    
    const [query, setQuery] = useState("");
    const searchInput = useRef(null);

    const handleListTrashFiles = async () => {
        setLoading(true);
        try {
            const res = await api.get('/fsfiles/list/allTrashFiles');
            setFiles(Array.isArray(res.data.files) ? res.data.files : []);
            setError('');
        } catch (err) {
            setError(`Error: ${err.response?.data?.msg || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        handleListTrashFiles();
    }, []);

    const handleRefresh = () => {
        try {
            handleListTrashFiles();
        } catch (err) {
            onNotification?.(`Error refreshing files: ${err.response?.data?.msg || err.message}`);
        } finally {
            onNotification?.('Refresh completed');
        }
    };

    const getCategory = (file) => file.metadata?.category || 'other';
    const normalizedQuery = query.trim().toLowerCase();
    const filteredFiles = (category === 'all'
        ? files
        : files.filter((file) => getCategory(file) === category)
    ).filter((file) => {
        if (!normalizedQuery) return true;

        const searchableValues = [
            file.filename,
            file.metadata?.originalName,
            file.metadata?.contentType,
            file.metadata?.extension,
            file.metadata?.category,
            file.metadata?.description,
        ];

        return searchableValues.some((value) =>
            String(value || '').toLowerCase().includes(normalizedQuery)
        );
    });

    const fileIcon = (file, size = 18) => {
        const categoryIcons = {
            image: FileImage,
            video: FileVideo,
            audio: FileAudio,
            document: FileText,
            other: FileCode2,
        };
        const Icon = categoryIcons[getCategory(file)] || Archive;
        return <Icon size={size} />;
    };

    // const uploadInput = useRef(null);

    useEffect(() => {
        const focusSearch = (event) => {
            if (
                event.key === "/" &&
                document.activeElement !== searchInput.current
            ) {
                event.preventDefault();
                searchInput.current?.focus();
            }
        };
        window.addEventListener("keydown", focusSearch);
        return () => window.removeEventListener("keydown", focusSearch);
    }, []);

    const visibleIds = filteredFiles.map((file) => file._id);
    const allVisibleSelected =
        visibleIds.length > 0 &&
        visibleIds.every((id) => selected.includes(id));

    const toggleSelected = (id) => {
        setSelected((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id],
        );
    };

    const toggleAll = () => {
        setSelected((current) =>
            allVisibleSelected
                ? current.filter((id) => !visibleIds.includes(id))
                : [...new Set([...current, ...visibleIds])],
        );
    };

    const formatSize = (bytes = 0) => {
        if (bytes < 1024) return `${bytes} B`;
        const units = ['KB', 'MB', 'GB'];
        let value = bytes / 1024;
        let unit = 0;
        while (value >= 1024 && unit < units.length - 1) {
            value /= 1024;
            unit += 1;
        }
        return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unit]}`;
    };

    const formatDate = (date) => {
        if (!date) return "—";
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) return "—";
        return new Intl.DateTimeFormat('vi-VN', {
            dateStyle: 'short',
            timeStyle: 'short',
        }).format(parsed);
    };

    const formatTemporaryStorage = () => {
        const totalTemporarySize = files.reduce((acc, file) => acc + (file.length || 0), 0); 
        return formatSize(totalTemporarySize);
    }

    const restoreFiles = async (ids) => {
        if (!ids.length) return;
        try {
            setActionLoading(true);
            const response = await api.put(`/fsfiles/update/restore/${ids.join(',')}`);
            setFiles((current) => current.filter((file) => !ids.includes(file._id)));
            setSelected((current) => current.filter((id) => !ids.includes(id)));
            onNotification?.(response.data.msg || `${ids.length} file${ids.length > 1 ? "s" : ""} restored`);
        } catch (err) {
            setError(`Restore failed: ${err.response?.data?.msg || err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const deleteFiles = async (ids) => {
        if (!ids.length) return;
        try {
            setActionLoading(true);
            const endpoint = ids.length === 1
                ? `/fsfiles/update/delete/${ids[0]}`
                : `/fsfiles/update/deleteMultiple/${ids.join(',')}`;
            const response = await api.delete(endpoint);
            setFiles((current) => current.filter((file) => !ids.includes(file._id)));
            setSelected((current) => current.filter((id) => !ids.includes(id)));
            onNotification?.(response.data.msg || `${ids.length} file${ids.length > 1 ? "s" : ""} permanently deleted`);
        } catch (err) {
            setError(`Delete failed: ${err.response?.data?.msg || err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    const copyDocumentId = async (id) => {
        try {
            await navigator.clipboard.writeText(id);
            onNotification?.("Document ID copied");
        } catch {
            onNotification?.(`Document ID: ${id}`);
        }
    };

    return (
        <div className={styles.appShell}>
            <header className={styles.topbar}>
                <span className={styles.status}><Cloud size={14} /> Render Connected</span>
                <label className={styles.search}>
                    <Search size={16} />
                    <input
                        ref={searchInput}
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Tìm kiếm tệp, thư mục, định dạng..."
                    />
                    <kbd>/</kbd>
                </label>
                <button className={styles.iconButtonHeader} type="button" onClick={handleRefresh} title="Làm mới" aria-label="Làm mới danh sách">
                    <RefreshCw size={18} className={loading ? styles.spinning : ''} />
                </button>
                <button className={styles.profile} type="button" aria-label="Tài khoản">T</button>
            </header>

            <main className={styles.main}>
                <h1>Trash Bin</h1>

                <section className={styles.infoBanner}>
                    <span className={styles.infoIcon}>
                        <Info size={20} />
                    </span>
                    <div>
                        <strong>
                            Files in the trash will be automatically and
                            permanently deleted after 30 days.
                        </strong>
                        <p>
                            Files in the trash are stored temporarily for 30
                            days before a cron worker automatically deletes them
                            to free up space on MongoDB GridFS. Total temporary
                            storage occupied: {formatTemporaryStorage()}
                        </p>
                    </div>
                </section>

                <section className={styles.bulkBar}>
                    <p>
                        Selected: <strong>{selected.length}</strong> /{" "}
                        {files.length}
                    </p>
                    <div>
                        <button
                            className={styles.restoreSelected}
                            type="button"
                            disabled={!selected.length || actionLoading}
                            onClick={() => restoreFiles(selected)}
                        >
                            <RotateCcw size={14} />
                            Restore selected
                        </button>
                        <button
                            className={styles.deleteSelected}
                            type="button"
                            disabled={!selected.length || actionLoading}
                            onClick={() => deleteFiles(selected)}
                        >
                            <Trash2 size={14} />
                            Permanently delete selected
                        </button>
                    </div>
                </section>

                {error && <div className={styles.error}>{error}</div>}
                {loading && files.length === 0 && <div className={styles.empty}>Đang tải tệp...</div>}
                {!loading && filteredFiles.length === 0 && <div className={styles.empty}>Chưa có tệp nào.</div>}

                <section className={styles.tableWrap} aria-label="Trash files">
                    <div className={styles.tableScroll}>
                        <div
                            className={`${styles.tableRow} ${styles.tableHeader}`}
                        >
                            <button
                                className={`${styles.checkbox} ${allVisibleSelected ? styles.checkboxChecked : ""}`}
                                type="button"
                                onClick={toggleAll}
                                aria-label={
                                    allVisibleSelected
                                        ? "Deselect all files"
                                        : "Select all files"
                                }
                            >
                                {allVisibleSelected && <span>✓</span>}
                            </button>
                            <span>File name</span>
                            <span>Size</span>
                            <span>Delete date</span>
                            <span>ID Document</span>
                            <span aria-hidden="true" />
                        </div>

                        {filteredFiles.map((file) => {
                            const isSelected = selected.includes(file._id);
                            return (
                                <div
                                    className={`${styles.tableRow} ${isSelected ? styles.selectedRow : ""}`}
                                    key={file._id}
                                >
                                    <button
                                        className={`${styles.checkbox} ${isSelected ? styles.checkboxChecked : ""}`}
                                        type="button"
                                        onClick={() => toggleSelected(file._id)}
                                        aria-label={`Select ${file.filename}`}
                                    >
                                        {isSelected && <span>✓</span>}
                                    </button>
                                    <span className={styles.fileName}>
                                        <span className={styles.fileIcon}>
                                            {fileIcon(file)}
                                        </span>
                                        <span>
                                            <strong>{file.filename}</strong>
                                            <small>Root directory</small>  {/* TODO: nếu có cập nhật thêm tính năng folder thì cập nhập chỗ này - Boima 15/11/2026 */}
                                        </span>
                                    </span>
                                    <code>{formatSize(file.length)}</code>
                                    <code>{formatDate(file.metadata?.markAsTrashDate)}</code>
                                    <span className={styles.documentId}>
                                        <code>{file._id}</code>
                                        <button
                                            type="button"
                                            aria-label={`Copy document ID ${file._id}`}
                                            onClick={() =>
                                                copyDocumentId(file._id)
                                            }
                                        >
                                            <Copy size={13} />
                                        </button>
                                    </span>
                                    <div className={styles.rowActions}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                restoreFiles([file._id])
                                            }
                                            disabled={actionLoading}
                                        >
                                            <RotateCcw size={12} />
                                            Restore
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                deleteFiles([file._id])
                                            }
                                            disabled={actionLoading}
                                        >
                                            <Trash2 size={12} />
                                            Permanently delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {!filteredFiles.length && (
                            <div className={styles.emptyState}>
                                No files match "{query}".
                            </div>
                        )}
                    </div>
                    <footer className={styles.tableFooter}>
                        <span>
                            Showing {filteredFiles.length} out of {files.length}{" "}
                            items
                        </span>
                        <span className={styles.pagination}>
                            Page 1 / 1
                            <button
                                type="button"
                                disabled
                                aria-label="Previous page"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                type="button"
                                disabled
                                aria-label="Next page"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </span>
                    </footer>
                </section>
            </main>
        </div>
    );
}

export default Co_trashBin;