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
            setValidationMessage("File name cannot be empty.");
            setIsValid(false);
        } else if (FORBIDDEN_CHARACTERS.test(nextValue)) {
            setValidationMessage("File name contains invalid special characters.");
            setIsValid(false);
        } else if (nextValue.length > MAX_NAME_LENGTH) {
            setValidationMessage(`File name exceeds the limit of ${MAX_NAME_LENGTH} characters.`);
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
            setValidationMessage("File name cannot be empty.");
            setIsValid(false);
            return;
        }

        if (FORBIDDEN_CHARACTERS.test(name)) {
            setValidationMessage("File name contains invalid special characters.");
            setIsValid(false);
            return;
        }

        if (name.length > MAX_NAME_LENGTH) {
            setValidationMessage(`File name exceeds the limit of ${MAX_NAME_LENGTH} characters.`);
            setIsValid(false);
            return;
        }

        if (!activeFileId) {
            setValidationMessage("Error: Found no file ID to rename.");
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
            setValidationMessage(`Error: ${err.response?.data?.msg || err.message}`);
            setIsValid(false);
        } finally {
            setSubmitting(false);
            onRefresh?.(true);
            onNotification?.(`Rename ${trimmedName} ${isValid ? "success" : "error"}`);
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
                        <h1 id="rename-title">Rename</h1>
                    </div>
                    <button className={styles["icon-button"]} type="button" aria-label="Đóng" onClick={onClose}>
                        <X size={16} />
                    </button>
                </header>

                <div className={styles["dialog-body"]}>
                    <div className={styles["label-row"]}>
                        <label htmlFor="file-name">New file name</label>
                        <output aria-live="polite">{name.length}/255 characters</output>
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
                                File name cannot contain special characters: <code>{'/ \\ : * ? " < > |'}</code> and
                                maximum 255 characters.
                            </p>
                        ) : (
                            <p>{validationMessage}</p>
                        )}
                    </div>
                </div>

                <footer className={styles["dialog-footer"]}>
                    <button className={`${styles.button} ${styles["button-secondary"]}`} type="button" onClick={onClose} disabled={submitting}>
                        Cancel
                    </button>
                    <button className={`${styles.button} ${styles["button-primary"]}`} type="submit" disabled={!isValid || submitting}>
                        <Check size={15} />
                        {submitting ? "Saving..." : "Save changes"}
                    </button>
                </footer>
            </form>
        </div>
    );
}

export default Co_renameModal;