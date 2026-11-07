import { useState } from 'react';
import {
    CheckCircle2,
    ChevronDown,
    FileArchive,
    FileAudio,
    FileImage,
    FileText,
    FileVideo,
    X,
    XCircle,
} from 'lucide-react';
import styles from './progressWidget.module.css';

const formatSize = (bytes = 0) => {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const getFileIcon = (item) => {
    if (item.type?.startsWith('image/')) return FileImage;
    if (item.type?.startsWith('video/')) return FileVideo;
    if (item.type?.startsWith('audio/')) return FileAudio;
    if (item.name?.match(/\.(rar|7z|tar|gz|zip)$/i)) return FileArchive;
    return FileText;
};

function Co_progressWidget({
    visible,
    items = [],
    percent = 0,
    completed = false,
    onClose,
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    if (!visible) return null;

    return (
        <aside
            aria-label="Tiến trình tệp"
            className={styles.widget}
        >
            <header className={styles.header}>
                <div className={styles.headerTitle}>
                    <span aria-hidden="true" className={styles.liveDot} />
                    <div className={styles.titleGroup}>
                        <h1 className={styles.title}>
                            Tiến trình tệp
                        </h1>
                        <p className={styles.processingCount}>
                            ({completed ? 0 : items.length} đang xử lý)
                        </p>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button
                        aria-expanded={!isCollapsed}
                        aria-label={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
                        className={styles['widget-icon-button']}
                        onClick={() => setIsCollapsed((value) => !value)}
                        type="button"
                    >
                        <ChevronDown size={16} className={isCollapsed ? styles.rotated : ''} />
                    </button>
                    <button
                        aria-label="Đóng"
                        className={styles['widget-icon-button']}
                        onClick={onClose}
                        type="button"
                    >
                        <X size={16} />
                    </button>
                </div>
            </header>

            {!isCollapsed && (
                <div className={styles.body}>
                    <div className={styles.summary}>
                        <span className={styles.summaryLabel}>Tiến trình:</span>
                        <strong className={styles.summaryValue}>{percent}%</strong>
                    </div>
                    {items.map((item) => {
                        const IconComponent = getFileIcon(item);
                        return (
                            <section aria-label={item.name} className={styles.item} key={`${item.name}-${item.size}`}>
                                <div className={styles.itemHeader}>
                                    <div className={styles.itemIdentity}>
                                        <div className={styles.itemIcon}>
                                            <IconComponent size={18} />
                                        </div>
                                        <div className={styles.itemCopy}>
                                            <p className={styles.itemName}>{item.name}</p>
                                            <p className={styles.itemStatus}>
                                                {item.completed ? (
                                                    <span className={styles.completed}>
                                                        <CheckCircle2 size={13} /> Hoàn tất
                                                    </span>
                                                ) : (
                                                    `${formatSize((item.size * percent) / 100)} / ${formatSize(item.size)} · ${percent}%`
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    {!item.completed && <XCircle size={16} className={styles.cancelIcon} />}
                                </div>
                                <div
                                    aria-valuemax={100}
                                    aria-valuemin={0}
                                    aria-valuenow={item.completed ? 100 : percent}
                                    className={styles.progressTrack}
                                    role="progressbar"
                                >
                                    <div
                                        className={styles.progressValue}
                                        style={{ width: `${item.completed ? 100 : percent}%` }}
                                    />
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </aside>
    );
}

export default Co_progressWidget;