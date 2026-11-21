import { AlertTriangle, AlertCircle, Trash2, X, FileText } from "lucide-react";
import styles from "./confirmDeleteModal.module.css";

function Co_confirmDeleteModal({
    visible = false,
    fileName = "",
    fileSize = "",
    fileId = "",
    loading = false,
    onClose,
    onConfirm,
}) {
    if (!visible) return null;

    return (
        <div className={styles.overlay} role="presentation" onMouseDown={onClose}>
            <section
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-delete-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                {/* Header: warning icon + title + close button */}
                <div className={styles.header}>
                    <span className={styles.icon} aria-hidden="true">
                        <AlertTriangle size={24} />
                    </span>
                    <h2 className={styles.title} id="confirm-delete-title">
                        Permanently delete the file?
                    </h2>
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onClose}
                        disabled={loading}
                        aria-label="Đóng"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* File info card */}
                {fileName && (
                    <div className={styles.fileInfoCard}>
                        <div className={styles.fileInfoRow}>
                            <span className={styles.fileIconWrap} aria-hidden="true">
                                <FileText size={18} />
                            </span>
                            <div className={styles.fileDetails}>
                                <span className={styles.fileName}>{fileName}</span>
                                {fileSize && (
                                    <span className={styles.fileSize}>
                                        Size: {fileSize}
                                    </span>
                                )}
                            </div>
                        </div>
                        {fileId && (
                            <div className={styles.fileIdRow}>
                                <span className={styles.fileIdLabel}>ID:</span>
                                <span className={styles.fileIdValue}>{fileId}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Warning banner */}
                <div className={styles.warningBanner}>
                    <span className={styles.warningIcon} aria-hidden="true">
                        <AlertCircle size={18} />
                    </span>
                    <p className={styles.warningText}>
                        THIS ACTION CANNOT BE UNDONE, AND THE DATA CANNOT BE RECOVERED.
                    </p>
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    <button type="button" className={styles.cancel} onClick={onClose} disabled={loading}>
                        Cancel
                    </button>
                    <button type="button" className={styles.confirm} onClick={onConfirm} disabled={loading}>
                        <Trash2 size={14} />
                        {loading ? "Deleting..." : "Permanently delete"}
                    </button>
                </div>
            </section>
        </div>
    );
}

export default Co_confirmDeleteModal;
