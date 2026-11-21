import { AlertTriangle } from "lucide-react";
import styles from "./confirmDeleteModal.module.css";

function Co_confirmDeleteSelectedModal({
    visible = false,
    count = 0,
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
                <span className={styles.icon} aria-hidden="true">
                    <AlertTriangle size={21} />
                </span>
                <h2 className={styles.title} id="confirm-delete-selected-title">
                    Xóa vĩnh viễn các tệp đã chọn?
                </h2>
                <p className={styles.message}>
                    Bạn đang xóa vĩnh viễn <strong>{count}</strong> tệp. Hành động này không thể hoàn tác.
                </p>
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

export default Co_confirmDeleteSelectedModal;