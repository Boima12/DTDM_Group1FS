import { useState, useEffect } from 'react';
import {
    Archive,
    Check,
    ChevronDown,
    Cloud,
    FileAudio,
    FileCode2,
    FileImage,
    FileText,
    FileVideo,
    Grid2X2,
    List,
    MoreVertical,
    RefreshCw,
    Search,
    Upload,
    X,
} from 'lucide-react';
import api from '../../utils/axios.js';
import styles from './myDrive.module.css';

function Co_myDrive({ onOpenMoreMenu }) {
    const [files, setFiles] = useState([]);
    const [error, setError] = useState('');
    const [view, setView] = useState('list');
    const [category, setCategory] = useState('all');
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleListAllFiles = async () => {
        setLoading(true);
        try {
            const res = await api.get('/fsfiles/list/allFiles');
            setFiles(Array.isArray(res.data.files) ? res.data.files : []);
            setError('');
        } catch (err) {
            setError(`Error: ${err.response?.data?.msg || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        handleListAllFiles();
    }, []);

    const getCategory = (file) => file.metadata?.category || 'other';
    const filteredFiles = category === 'all'
        ? files
        : files.filter((file) => getCategory(file) === category);
    const categories = [
        { id: 'all', label: 'Tất cả', icon: Grid2X2 },
        { id: 'document', label: 'Tài liệu', icon: FileText },
        { id: 'image', label: 'Hình ảnh', icon: FileImage },
        { id: 'video', label: 'Video', icon: FileVideo },
        { id: 'audio', label: 'Âm thanh', icon: FileAudio },
        { id: 'other', label: 'Khác', icon: FileCode2 },
    ];

    const toggleSelected = (id) => {
        setSelected((current) => current.includes(id)
            ? current.filter((fileId) => fileId !== id)
            : [...current, id]);
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

    const formatDate = (date) => new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(new Date(date));

    const fileIcon = (file, size = 20) => {
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

    const fileUrl = (file) => {
        const baseUrl = api.defaults.baseURL || '';
        return `${baseUrl.replace(/\/$/, '')}/fsfiles/download/${file._id}`;
    };

    const handleDownloadSelected = async () => {
        if (selected.length === 0) return;

        try {
            setLoading(true);
            const res = await api.post('/fsfiles/download/selected', { ids: selected }, {
                responseType: 'blob'
            });

            // Parse filename header or set fallback
            const contentDisposition = res.headers['content-disposition'];
            let filename = `Group1FS_Selected_${Date.now()}.zip`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^";]+)"?/);
                if (match && match[1]) {
                    filename = decodeURIComponent(match[1]);
                }
            }

            // Trigger browser download
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();

            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(`Download failed: ${err.response?.data?.msg || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <header className={styles.topbar}>
                <span className={styles.status}><Cloud size={14} /> Render Connected</span>
                <label className={styles.search}>
                    <Search size={16} />
                    <input type="search" placeholder="Tìm kiếm tệp, thư mục, định dạng..." />
                    <kbd>/</kbd>
                </label>
                <button className={styles.iconButton} type="button" onClick={handleListAllFiles} title="Làm mới" aria-label="Làm mới danh sách">
                    <RefreshCw size={18} className={loading ? styles.spinning : ''} />
                </button>
                <button className={styles.profile} type="button" aria-label="Tài khoản">T</button>
            </header>

            <section className={styles.content}>
                <div className={styles.breadcrumb}><Cloud size={17} /> My Drive <span>›</span> <strong>Tất cả tệp</strong></div>
                <div className={styles.headingRow}>
                    <div className={styles.categoryTabs}>
                        {categories.map((item) => {
                            const IconComponent = item.icon;
                            return (
                                <button
                                    type="button"
                                    key={item.id}
                                    className={category === item.id ? styles.categoryActive : ''}
                                    onClick={() => setCategory(item.id)}
                                >
                                    <IconComponent size={14} /> {item.label} ({item.id === 'all' ? files.length : files.filter((file) => getCategory(file) === item.id).length})
                                </button>
                            );
                        })}
                    </div>
                    <div className={styles.viewToggle}>
                        <button type="button" className={view === 'list' ? styles.viewActive : ''} onClick={() => setView('list')} aria-label="Dạng danh sách"><List size={18} /></button>
                        <button type="button" className={view === 'grid' ? styles.viewActive : ''} onClick={() => setView('grid')} aria-label="Dạng lưới"><Grid2X2 size={17} /></button>
                    </div>
                </div>

                <div className={styles.toolbar}>
                    <span>Sắp xếp theo: <strong>Độ liên quan</strong> <ChevronDown size={14} /></span>
                    <span>Đã chọn: <strong>{selected.length}</strong> / {files.length}</span>
                    <div className={styles.toolbarActions}>
                        <button type="button"
                            onClick={handleDownloadSelected}
                            disabled={selected.length === 0}
                        >
                            <Upload size={14} /> Tải mục đã chọn
                        </button>
                        <button type="button"
                            disabled={selected.length === 0}
                        >
                            <X size={14} /> Xóa mục đã chọn
                        </button>
                    </div>
                </div>

                {error && <div className={styles.error}>{error}</div>}
                {loading && files.length === 0 && <div className={styles.empty}>Đang tải tệp...</div>}
                {!loading && filteredFiles.length === 0 && <div className={styles.empty}>Chưa có tệp nào.</div>}

                {view === 'list' && filteredFiles.length > 0 && (
                    <div className={styles.tableWrap}>
                        <div className={`${styles.tableRow} ${styles.tableHeader}`}>
                            <span />
                            <span>TÊN TỆP</span><span>KÍCH THƯỚC</span><span>NGÀY TẢI LÊN</span><span>ID DOCUMENT</span><span>THAO TÁC</span>
                        </div>
                        {filteredFiles.map((file) => (
                            <div className={`${styles.tableRow} ${selected.includes(file._id) ? styles.selectedRow : ''}`} key={file._id}>
                                <button className={styles.checkbox} type="button" onClick={() => toggleSelected(file._id)} aria-label={`Chọn ${file.filename}`}>
                                    {selected.includes(file._id) && <Check size={14} />}
                                </button>
                                <span className={styles.fileName}><span className={styles.fileIcon}>{fileIcon(file)}</span><span><strong>{file.metadata?.originalName || file.filename}</strong><small>{file.metadata?.contentType || 'application/octet-stream'}</small></span></span>
                                <span>{formatSize(file.length)}</span><span>{formatDate(file.uploadDate)}</span><span className={styles.documentId}>{file._id}</span>
                                <div className={styles.moreWrapper}>
                                    <button
                                        className={styles.moreButton}
                                        type="button"
                                        aria-label={`Tùy chọn ${file.filename}`}
                                        onClick={() => onOpenMoreMenu(file._id)}
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className={styles.tableFooter}>Hiển thị {filteredFiles.length} trên tổng số {files.length} mục</div>
                    </div>
                )}
                
                {view === 'grid' && filteredFiles.length > 0 && (
                    <div className={styles.gridWrap}>
                        <div className={styles.grid}>
                            {filteredFiles.map((file) => (
                                <article className={`${styles.card} ${selected.includes(file._id) ? styles.selectedCard : ''}`} key={file._id}>
                                    <div className={styles.cardPreview}>
                                        {getCategory(file) === 'image' ? <img src={fileUrl(file)} alt="" /> : <span>{fileIcon(file, 42)}</span>}
                                        <button
                                            className={styles.cardMenu}
                                            type="button"
                                            aria-label={`Tùy chọn ${file.filename}`}
                                            onClick={() => onOpenMoreMenu(file._id)}
                                        >
                                            <MoreVertical size={18} />
                                        </button>
                                    </div>
                                    <div className={styles.cardInfo}>
                                        <button className={styles.cardSelect} type="button" onClick={() => toggleSelected(file._id)} aria-label={`Chọn ${file.filename}`}>
                                            {selected.includes(file._id) ? <Check size={14} /> : null}
                                        </button>
                                        <strong>{file.metadata?.originalName || file.filename}</strong>
                                        <small>{formatSize(file.length)} · {formatDate(file.uploadDate)}</small>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

export default Co_myDrive;