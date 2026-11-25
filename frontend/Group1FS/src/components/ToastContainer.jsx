import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';

const TONE_MAP = {
    success: { icon: CheckCircle2, color: 'var(--accent)', bg: 'var(--accent-soft)' },
    error: { icon: AlertCircle, color: 'var(--danger)', bg: 'var(--danger-soft)' },
    warning: { icon: AlertTriangle, color: 'var(--warning)', bg: 'var(--warning-soft)' },
    info: { icon: Info, color: 'var(--info)', bg: 'var(--info-soft)' },
};

export default function ToastContainer() {
    const { toasts, dismissToast } = useApp();
    if (!toasts.length) return null;

    return (
        <div
            aria-live="polite"
            style={{
                position: 'fixed',
                bottom: 18,
                left: 18,
                zIndex: 1600,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                width: 'min(420px, calc(100vw - 36px))',
                pointerEvents: 'none',
            }}
        >
            {toasts.map((toast) => {
                const tone = TONE_MAP[toast.type] || TONE_MAP.info;
                const Icon = tone.icon;
                return (
                    <div
                        key={toast.id}
                        role="status"
                        style={{
                            pointerEvents: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 12px',
                            borderRadius: 12,
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: 'var(--shadow-lg)',
                            animation: 'g1PopIn 180ms ease-out',
                        }}
                    >
                        <span
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                background: tone.bg,
                                color: tone.color,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <Icon size={16} />
                        </span>
                        <p
                            style={{
                                margin: 0,
                                flex: 1,
                                fontSize: 13,
                                lineHeight: 1.4,
                                color: 'var(--text-primary)',
                                wordBreak: 'break-word',
                            }}
                        >
                            {toast.message}
                        </p>
                        {toast.actionLabel && toast.onAction && (
                            <button
                                type="button"
                                className="g1-btn g1-btn-primary"
                                style={{ padding: '5px 10px', fontSize: 12 }}
                                onClick={() => {
                                    toast.onAction();
                                    dismissToast(toast.id);
                                }}
                            >
                                {toast.actionLabel}
                            </button>
                        )}
                        <button
                            type="button"
                            className="g1-icon-btn"
                            style={{ width: 28, height: 28 }}
                            onClick={() => dismissToast(toast.id)}
                            aria-label="Close"
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
