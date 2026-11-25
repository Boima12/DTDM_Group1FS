import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Download,
    Eye,
    FolderInput,
    History,
    Info,
    Pencil,
    QrCode,
    Star,
    Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';

export default function MoreMenuPopover({
    file,
    anchorRect,
    onClose,
    onPreview,
    onDownload,
    onShare,
    onToggleStar,
    onRename,
    onMove,
    onUploadVersion,
    onDetails,
    onTrash,
}) {
    const { t } = useApp();
    const menuRef = useRef(null);
    const [pos, setPos] = useState({ top: 0, left: 0, ready: false });

    useLayoutEffect(() => {
        if (!file || !anchorRect) return;
        const menuW = 228;
        const menuH = 350;
        let left = anchorRect.right - menuW;
        let top = anchorRect.bottom + 6;

        if (left < 12) left = Math.min(anchorRect.left, window.innerWidth - menuW - 12);
        if (top + menuH > window.innerHeight - 12) {
            top = Math.max(12, anchorRect.top - menuH - 6);
        }
        setPos({ top, left, ready: true });
    }, [file, anchorRect]);

    useEffect(() => {
        if (!file) return undefined;
        const onEsc = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        const onScrollOrResize = () => onClose?.();
        window.addEventListener('keydown', onEsc);
        window.addEventListener('resize', onScrollOrResize);
        return () => {
            window.removeEventListener('keydown', onEsc);
            window.removeEventListener('resize', onScrollOrResize);
        };
    }, [file, onClose]);

    if (!file || !anchorRect) return null;

    const isStarred = Boolean(file.metadata?.starred);

    const items = [
        { label: t('preview'), icon: Eye, action: () => onPreview?.(file) },
        { label: t('download'), icon: Download, action: () => onDownload?.(file) },
        { label: t('shareQr'), icon: QrCode, action: () => onShare?.(file) },
        { label: isStarred ? t('unstar') : t('star'), icon: Star, action: () => onToggleStar?.(file) },
        { divider: true },
        { label: t('rename'), icon: Pencil, action: () => onRename?.(file) },
        { label: t('moveToFolder'), icon: FolderInput, action: () => onMove?.(file) },
        { label: t('uploadNewVersion'), icon: History, action: () => onUploadVersion?.(file) },
        { label: t('detailsXray'), icon: Info, action: () => onDetails?.(file) },
        { divider: true },
        { label: t('moveToTrash'), icon: Trash2, action: () => onTrash?.(file), danger: true },
    ];

    return createPortal(
        <div
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose?.();
            }}
            style={{ position: 'fixed', inset: 0, zIndex: 1450 }}
        >
            <div
                ref={menuRef}
                role="menu"
                style={{
                    position: 'fixed',
                    top: pos.top,
                    left: pos.left,
                    width: 228,
                    padding: 6,
                    borderRadius: 12,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-lg)',
                    opacity: pos.ready ? 1 : 0,
                    animation: 'g1PopIn 120ms ease-out',
                }}
            >
                {items.map((item, idx) => {
                    if (item.divider) {
                        return (
                            <div
                                key={`div-${idx}`}
                                style={{ height: 1, margin: '4px 6px', background: 'var(--border-subtle)' }}
                            />
                        );
                    }
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.label}
                            type="button"
                            role="menuitem"
                            className="g1-btn g1-btn-ghost"
                            style={{
                                width: '100%',
                                justifyContent: 'flex-start',
                                padding: '8px 10px',
                                fontWeight: 500,
                                fontSize: 13,
                                color: item.danger ? 'var(--danger)' : 'var(--text-primary)',
                            }}
                            onClick={() => {
                                onClose?.();
                                item.action();
                            }}
                        >
                            <Icon size={15} style={{ color: item.danger ? 'var(--danger)' : 'var(--text-secondary)' }} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>,
        document.body
    );
}
