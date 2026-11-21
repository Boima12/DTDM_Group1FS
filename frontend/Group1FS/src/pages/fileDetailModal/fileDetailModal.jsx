import { useEffect } from "react";
import styles from "./fileDetailModal.module.css";
import {
    Archive,
    FileAudio,
    FileCode2,
    FileImage,
    FileText,
    FileVideo,
    Info,
    X,
} from "lucide-react";
import { DetailRow } from "./fileDetailParts.jsx";

function Co_fileDetailModal({
    file,
    visible,
    onClose,
}) {
    useEffect(() => {
        if (!visible) return undefined;

        const closeOnEscape = (event) => {
            if (event.key === "Escape") onClose?.();
        };

        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [visible, onClose]);

    if (!visible || !file) return null;

    const closeFromBackdrop = (event) => {
        if (event.target === event.currentTarget) onClose?.();
    };

    const getCategory = (targetFile) => targetFile.metadata?.category || "other";

    const fileIcon = (targetFile, size = 20) => {
        const categoryIcons = {
            image: FileImage,
            video: FileVideo,
            audio: FileAudio,
            document: FileText,
            other: FileCode2,
        };
        const Icon = categoryIcons[getCategory(targetFile)] || Archive;
        return <Icon size={size} />;
    };

    const formatFileSize1 = (bytes = 0) => {
        const formattedBytes = new Intl.NumberFormat("en-US").format(bytes);

        if (bytes < 1024) {
            return `${bytes} B (${formattedBytes} bytes)`;
        }

        const units = ["KB", "MB", "GB", "TB"];
        let value = bytes / 1024;
        let unitIndex = 0;

        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex += 1;
        }

        const truncated = Math.floor(value * 10) / 10;
        return `${truncated.toFixed(1)} ${units[unitIndex]} (${formattedBytes} bytes)`;
    };

    const formatFileSize2 = (bytes = 0) => {
        if (bytes < 1024) {
            return `${bytes} B (1 chunk)`;
        }

        const units = ["KB", "MB", "GB", "TB"];
        let value = bytes / 1024;
        let unitIndex = 0;

        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex += 1;
        }

        const truncated = Math.floor(value * 10) / 10;
        const formattedChunks = Math.max(1, Math.ceil(bytes / 261120));

        return `${truncated.toFixed(1)} ${units[unitIndex]} (${formattedChunks} Chunks)`;
    };

    const formatUploadDate = (dateInput) => {
        if (!dateInput) return "";
        const date = new Date(dateInput);

        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Ho_Chi_Minh",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        }).formatToParts(date);

        const map = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
        return `${map.day}/${map.month}/${map.year}, ${map.hour}:${map.minute}:${map.second} (GMT+7)`;
    };

    return (
        <div className={styles.overlay} onMouseDown={closeFromBackdrop}>
            <section
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="file-detail-title"
            >
                <header className={styles.header}>
                    <div className={styles.heading}>
                        <span className={styles.infoIcon}>
                            <Info size={18} />
                        </span>
                        <h2 id="file-detail-title">File details</h2>
                    </div>
                    <button
                        className={styles.closeIconButton}
                        type="button"
                        onClick={onClose}
                        aria-label="Đóng"
                    >
                        <X size={18} />
                    </button>
                </header>

                <div className={styles.content}>
                    <div className={styles.fileSummary}>
                        <span className={styles.fileIcon}>
                            {fileIcon(file)}
                        </span>
                        <div className={styles.fileText}>
                            <strong title={file.filename}>{file.filename}</strong>
                            <span>{formatFileSize1(file.length)}</span>
                        </div>
                    </div>

                    <div className={styles.information}>
                        <h3>FILE DETAILS</h3>
                        <div className={styles.detailCard}>
                            <DetailRow
                                label="Original name"
                                value={file.filename}
                                alternate
                                copyable
                            />
                            <DetailRow
                                label="MIME Type"
                                value={file.metadata?.contentType || "application/octet-stream"}
                            />
                            <DetailRow
                                label="File storage size"
                                value={formatFileSize2(file.length)}
                                alternate
                            />
                            <DetailRow
                                label="Upload timestamp"
                                value={formatUploadDate(file.uploadDate)}
                            />
                            <DetailRow
                                label="ID Document"
                                value={file._id}
                                alternate
                                copyable
                                accent
                            />

                            <div className={styles.locationBlock}>
                                <h4>Physical storage coordinates</h4>
                                <dl>
                                    <div>
                                        <dt>Bucket:</dt>
                                        <dd>fs (Default Bucket)</dd>
                                    </div>
                                    <div>
                                        <dt>Cluster:</dt>
                                        <dd title="ac-dpxwozp-shard-00-01.ct2vxsl.mongodb.net">
                                            ac-dpxwozp-shard-00-01.ct2vxsl.mongodb.net
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>Render Node:</dt>
                                        <dd>srv-cnp79gl6l47c73fa9900</dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <footer className={styles.footer}>
                    <button
                        className={styles.closeButton}
                        type="button"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </footer>
            </section>
        </div>
    );
}

export default Co_fileDetailModal;