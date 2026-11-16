export interface NotificationModalProps {
  message?: string;
  messageKey?: string | number;
  duration?: number;
  initialMessages?: string[];
}

export default function NotificationModal(props: NotificationModalProps): JSX.Element;
