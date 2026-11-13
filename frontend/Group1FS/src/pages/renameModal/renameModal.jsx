import { useEffect, useRef, useState } from "react";
import { Check, Info, PencilLine, X } from "lucide-react";
import styles from "./renameModal.module.css";
import api from '../../utils/axios.js';

const MAX_NAME_LENGTH = 255;
const FORBIDDEN_CHARACTERS = /[\\:*?"<>|\x2F]/;
const DEFAULT_HELP_TEXT = "Tên tệp không được chứa các ký tự đặc biệt và tối đa 255 ký tự.";

function Co_renameModal({
    visible,
    file,
    fileId,
    onRefresh,
    onNotification,
    onClose,
    onSuccess,
}) {
    const activeFileId = file?._id || fileId;
    const initialName = file?.filename || file?.metadata?.originalName || "";

    const [name, setName] = useState(initialName);
    const [validationMessage, setValidationMessage] = useState(DEFAULT_HELP_TEXT);
    const [isValid, setIsValid] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (visible) {
            setName(initialName);
            setIsValid(true);
            setValidationMessage(DEFAULT_HELP_TEXT);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [visible, initialName]);

    useEffect(() => {
        const handleEscape = (event) => {
            if (visible && event.key === 'Escape') onClose?.();
        };

        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [visible, onClose]);

    if (!visible) return null;

    const handleNameChange = (event) => {
        const nextValue = event.target.value;
        setName(nextValue);

        if (!nextValue.trim()) {
            setValidationMessage("Tên tệp không được để trống.");
            setIsValid(false);
        } else if (FORBIDDEN_CHARACTERS.test(nextValue)) {
            setValidationMessage("Tên tệp đang chứa ký tự đặc biệt không hợp lệ.");
            setIsValid(false);
        } else if (nextValue.length > MAX_NAME_LENGTH) {
            setValidationMessage(`Tên tệp vượt quá giới hạn ${MAX_NAME_LENGTH} ký tự.`);
            setIsValid(false);
        } else {
            setValidationMessage(DEFAULT_HELP_TEXT);
            setIsValid(true);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const trimmedName = name.trim();

        if (!trimmedName) {
            setValidationMessage("Tên tệp không được để trống.");
            setIsValid(false);
            return;
        }

        if (FORBIDDEN_CHARACTERS.test(name)) {
            setValidationMessage("Tên tệp đang chứa ký tự đặc biệt không hợp lệ.");
            setIsValid(false);
            return;
        }

        if (name.length > MAX_NAME_LENGTH) {
            setValidationMessage(`Tên tệp vượt quá giới hạn ${MAX_NAME_LENGTH} ký tự.`);
            setIsValid(false);
            return;
        }

        if (!activeFileId) {
            setValidationMessage("Lỗi: Không tìm thấy ID tệp.");
            setIsValid(false);
            return;
        }

        try {
            setSubmitting(true);
            await api.put(`/fsfiles/update/rename/${String(activeFileId).trim()}`, {
                filename: trimmedName
            });

            setIsValid(true);
            onSuccess?.(trimmedName);
            onClose?.();
        } catch (err) {
            setValidationMessage(`Lỗi: ${err.response?.data?.msg || err.message}`);
            setIsValid(false);
        } finally {
            setSubmitting(false);
            onRefresh?.(true);
            onNotification?.(`Đổi tên tệp ${trimmedName} ${isValid ? "success" : "error"}`);
        }
    };

    return (
        <div
            className={styles["overlay"]}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose?.();
            }}
        >
            <form
                className={styles["rename-dialog"]}
                role="dialog"
                aria-modal="true"
                aria-labelledby="rename-title"
                aria-describedby="filename-help"
                onSubmit={handleSubmit}
            >
                <header className={styles["dialog-header"]}>
                    <div className={styles["dialog-title-group"]}>
                        <span className={styles["title-icon-wrap"]} aria-hidden="true">
                            <PencilLine size={18} />
                        </span>
                        <h1 id="rename-title">Đổi tên tệp</h1>
                    </div>
                    <button className={styles["icon-button"]} type="button" aria-label="Đóng" onClick={onClose}>
                        <X size={16} />
                    </button>
                </header>

                <div className={styles["dialog-body"]}>
                    <div className={styles["label-row"]}>
                        <label htmlFor="file-name">Tên tệp mới</label>
                        <output aria-live="polite">{name.length}/255 ký tự</output>
                    </div>
                    <input
                        ref={inputRef}
                        id="file-name"
                        name="file-name"
                        className={styles["file-input"]}
                        value={name}
                        maxLength={MAX_NAME_LENGTH + 1}
                        aria-invalid={!isValid}
                        aria-describedby="filename-help"
                        onChange={handleNameChange}
                    />
                    <div
                        id="filename-help"
                        className={`${styles["helper-note"]}${isValid ? "" : ` ${styles["helper-note-error"]}`}`}
                        role="status"
                        aria-live="polite"
                    >
                        <Info size={16} />
                        {isValid ? (
                            <p>
                                Tên tệp không được chứa các ký tự đặc biệt: <code>{'/ \\ : * ? " < > |'}</code> và
                                tối đa 255 ký tự.
                            </p>
                        ) : (
                            <p>{validationMessage}</p>
                        )}
                    </div>
                </div>

                <footer className={styles["dialog-footer"]}>
                    <button className={`${styles.button} ${styles["button-secondary"]}`} type="button" onClick={onClose} disabled={submitting}>
                        Hủy bỏ
                    </button>
                    <button className={`${styles.button} ${styles["button-primary"]}`} type="submit" disabled={!isValid || submitting}>
                        <Check size={15} />
                        {submitting ? "Đang lưu..." : "Lưu thay đổi"}
                    </button>
                </footer>
            </form>
        </div>
    );
}

export default Co_renameModal;