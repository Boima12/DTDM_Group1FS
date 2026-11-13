import { useEffect } from "react";
import { Info, X } from "lucide-react";
import styles from "./NotificationPopup.module.css";

function NotificationItem({ notification, onClose }) {
    useEffect(() => {
        const timerId = window.setTimeout(
            () => onClose(notification.id),
            notification.duration,
        );

        return () => window.clearTimeout(timerId);
    }, [notification.duration, notification.id, onClose]);

    return (
        <article className={styles.notification} role="status">
            <div className={styles.content}>
                <span className={styles.iconBackground} aria-hidden="true">
                    <Info className={styles.infoIcon} size={18} />
                </span>
                <p className={styles.message}>{notification.message}</p>
            </div>

            <button
                className={styles.closeButton}
                type="button"
                onClick={() => onClose(notification.id)}
                aria-label={`Close notification: ${notification.message}`}
            >
                <X className={styles.closeIcon} size={16} />
            </button>
        </article>
    );
}

export default NotificationItem;