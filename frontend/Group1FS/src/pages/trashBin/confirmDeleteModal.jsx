import { AlertTriangle } from "lucide-react";
import styles from "./confirmDeleteModal.module.css";

function Co_confirmDeleteModal({
    visible = false,
    fileName = "",
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
                <span className={styles.icon} aria-hidden="true">
                    <AlertTriangle size={21} />
                </span>
                <h2 className={styles.title} id="confirm-delete-title">
                    Xóa vĩnh viễn tệp này?
                </h2>
                <p className={styles.message}>
                    Tệp sẽ bị xóa vĩnh viễn khỏi thùng rác và không thể khôi phục.
                </p>
                {fileName && <strong className={styles.fileName}>{fileName}</strong>}
                <div className={styles.actions}>
                    <button type="button" className={styles.cancel} onClick={onClose} disabled={loading}>
                        Hủy
                    </button>
                    <button type="button" className={styles.confirm} onClick={onConfirm} disabled={loading}>
                        {loading ? "Đang xóa..." : "Xóa vĩnh viễn"}
                    </button>
                </div>
            </section>
        </div>
    );
}

export default Co_confirmDeleteModal;