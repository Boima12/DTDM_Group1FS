import { useCallback, useEffect, useRef, useState } from "react";
import NotificationItem from "./notificationItem.jsx";
import styles from "./NotificationPopup.module.css";

const DEFAULT_NOTIFICATION_DURATION_MS = 20_000;

function Co_notificationPopup({
    message = "",
    messageKey,
    duration = DEFAULT_NOTIFICATION_DURATION_MS,
    initialMessages = [],
}) {
    const nextId = useRef(initialMessages.length);
    const [notifications, setNotifications] = useState(() =>
        initialMessages
            .filter((initialMessage) => initialMessage.trim())
            .map((initialMessage, index) => ({
                id: index + 1,
                message: initialMessage.trim(),
                duration,
            })),
    );
    const lastMessageToken = useRef(null);

    useEffect(() => {
        const trimmedMessage = message.trim();
        const messageToken = messageKey ?? trimmedMessage;

        if (!trimmedMessage || messageToken === lastMessageToken.current) {
            return;
        }

        lastMessageToken.current = messageToken;
        nextId.current += 1;

        setNotifications((currentNotifications) => [
            ...currentNotifications,
            {
                id: nextId.current,
                message: trimmedMessage,
                duration,
            },
        ]);
    }, [duration, message, messageKey]);

    const closeNotification = useCallback((notificationId) => {
        setNotifications((currentNotifications) =>
            currentNotifications.filter(
                (notification) => notification.id !== notificationId,
            ),
        );
    }, []);

    return (
        <div className={styles.notificationContainer} aria-live="polite" aria-atomic="false">
            {notifications.map((notification) => (
                <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClose={closeNotification}
                />
            ))}
        </div>
    );
}

export default Co_notificationPopup;