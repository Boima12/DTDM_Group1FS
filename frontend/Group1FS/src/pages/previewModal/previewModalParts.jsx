import { useState } from "react";
import {
    Check,
    ChevronRight,
    Copy,
    Info,
    Image,
    RotateCcw,
    Trash2,
} from "lucide-react";
import styles from "./previewModal.module.css";

export function CopyButton({ value, label }) {
    const [copied, setCopied] = useState(false);

    async function copyValue() {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
        } catch {
            setCopied(false);
        }
    }

    return (
        <button
            className={`${styles["icon-button"]} ${styles["icon-button--light"]}`}
            type="button"
            aria-label={copied ? "Đã sao chép" : label}
            title={copied ? "Đã sao chép" : label}
            onClick={copyValue}
        >
            {copied ? <Check className={styles["icon-asset"]} size={15} /> : <Copy className={styles["icon-asset"]} size={15} />}
        </button>
    );
}

export function MetadataItem({ label, children, mono = false }) {
    return (
        <div className={styles["metadata-item"]}>
            <span className={styles["metadata-label"]}>{label}</span>
            <div className={mono ? `${styles["metadata-value"]} ${styles.mono}` : styles["metadata-value"]}>
                {children}
            </div>
        </div>
    );
}

export function FileInspector({ 
    file, 
    onClose, 
    isTrashed, 
    onTrash 
}) {
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
        <aside
            className={styles.inspector}
            id="file-information"
            aria-label="Thông tin tệp tin"
        >
            <header className={styles["inspector-header"]}>
                <div className={styles["inspector-title"]}>
                    <span className={styles["inspector-title-icon"]}>
                        <Info className={`${styles["icon-asset"]} ${styles["icon-white"]}`} size={16} />
                    </span>
                    <h2>File details</h2>
                </div>
                <button
                    className={`${styles["icon-button"]} ${styles["icon-button--light"]}`}
                    type="button"
                    aria-label="Thu gọn thông tin tệp"
                    title="Thu gọn"
                    onClick={onClose}
                >
                    <ChevronRight className={styles["icon-asset"]} size={16} />
                </button>
            </header>

            <div className={styles["inspector-scroll"]}>
                <section className={styles["file-card"]} aria-label="Tệp đang xem">
                    <span className={styles["file-card-thumb"]}>
                        <Image className={styles["icon-asset"]} size={20} />
                    </span>
                    <div className={styles["file-card-copy"]}>
                        <strong title={file.filename}>
                            {file.filename}
                        </strong>
                        <span>{formatFileSize1(file.length)}</span>
                    </div>
                </section>

                <section className={styles["metadata-section"]}>
                    <h3>FILE DETAILS</h3>

                    <MetadataItem label="Original name">
                        <div className={styles["value-with-action"]}>
                            <span title={file.metadata.originalName}>
                                {file.metadata.originalName}
                            </span>
                            <CopyButton
                                value={file.metadata.originalName}
                                label="Sao chép tên tệp"
                            />
                        </div>
                    </MetadataItem>

                    <MetadataItem label="MIME Type" mono>
                        {file.metadata.contentType || "application/octet-stream"}
                    </MetadataItem>

                    <MetadataItem label="File storage size" mono>
                        <span className={styles["inline-detail"]}>
                            {formatFileSize2(file.length)}
                        </span>
                    </MetadataItem>

                    <MetadataItem label="Upload timestamp" mono>
                        {formatUploadDate(file.uploadDate)}
                    </MetadataItem>

                    <MetadataItem label="ID Document">
                        <div className={styles["id-label-row"]}>
                            <span />
                            <small>ObjectId</small>
                        </div>
                        <div className={styles["code-copy"]}>
                            <code>{file._id}</code>
                            <CopyButton
                                value={file._id}
                                label="Sao chép Document ID"
                            />
                        </div>
                    </MetadataItem>

                    <MetadataItem label="Physical storage coordinates">
                        <div className={`${styles["storage-card"]} ${styles.mono}`}>
                            <div>
                                <span>Bucket:</span>
                                <strong>fs (Default Bucket)</strong>
                            </div>
                            <div>
                                <span>Cluster:</span>
                                <strong className={styles["cluster-value"]}>
                                    ac-dpxwozp-shard-00-01.ct2vxsl.mongodb.net
                                </strong>
                            </div>
                            <div>
                                <span>Render Node:</span>
                                <strong>srv-cnp79gl6l47c73fa9900</strong>
                            </div>
                        </div>
                    </MetadataItem>
                </section>

                <section className={styles["file-actions"]}>
                    {/* <h3>THAO TÁC TỆP</h3> */}
                    <button
                        className={`${styles["action-button"]} ${styles["action-button--danger"]} ${isTrashed ? styles["restoreButton"] : ""}`}
                        type="button"
                        aria-pressed={isTrashed}
                        onClick={onTrash}
                    >
                        {isTrashed ? (
                            <RotateCcw className={styles["icon-asset"]} size={15} />
                        ) : (
                            <Trash2 className={styles["icon-asset"]} size={15} />
                        )}
                        {isTrashed ? "Restore file" : "Move to trash"}
                    </button>
                </section>
            </div>
        </aside>
    );
}