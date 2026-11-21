import { AlertTriangle, AlertCircle, Trash2, X } from "lucide-react";
import styles from "./confirmDeleteModal.module.css";

function Co_confirmDeleteSelectedModal({
    visible = false,
    // count = 0,
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
                aria-labelledby="confirm-delete-selected-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                {/* Header: warning icon + title + close button */}
                <div className={styles.header}>
                    <span className={styles.icon} aria-hidden="true">
                        <AlertTriangle size={24} />
                    </span>
                    <h2 className={styles.title} id="confirm-delete-selected-title">
                        Permanently delete the selected items?
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

export default Co_confirmDeleteSelectedModal;
