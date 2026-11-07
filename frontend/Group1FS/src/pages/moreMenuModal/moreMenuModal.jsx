import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Download,
    Eye,
    Info,
    Pencil,
    Trash2,
} from 'lucide-react';
import api from '../../utils/axios.js';
import styles from './moreMenuModal.module.css';

function Co_moreMenuModal({ 
    visible, 
    file, 
    fileId, 
    onClose, 
    onDownload, 
    onRename, 
    onDelete, 
    onInfo, 
    onPreview 
}) {
    const activeFileId = file?._id || fileId;

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

    const handleDownload = async (fileIdToDownload) => {
        const targetId = fileIdToDownload || activeFileId;
        if (!targetId) return;

        try {
            const res = await api.get(`/fsfiles/download/${targetId}`, {
                responseType: 'blob',
            });

            // Extract filename from Content-Disposition header
            const contentDisposition = res.headers['content-disposition'];
            let filename = file?.metadata?.originalName || file?.filename || `file_${targetId}`;

            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^";]+)"?/);
                if (match && match[1]) {
                    filename = decodeURIComponent(match[1]);
                }
            }

            // Trigger browser download
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();

            // Cleanup
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed:', err.response?.data?.msg || err.message);
        }
    };

    // Use custom handler passed from parent, or fallback to internal handleDownload
    const executeDownload = (selectedFile) => {
        if (onDownload) {
            onDownload(selectedFile || file || activeFileId);
        } else {
            handleDownload(selectedFile?._id || activeFileId);
        }
    };

    const menuOptions = [
        { label: 'Xem trước', icon: Eye, action: onPreview },
        { label: 'Tải xuống', icon: Download, action: executeDownload },
        { label: 'Đổi tên', icon: Pencil, action: onRename },
        { label: 'Thông tin tệp tin', icon: Info, action: onInfo },
        { label: 'Chuyển vào thùng rác', icon: Trash2, action: onDelete, destructive: true },
    ];

    return createPortal(
        <div 
            className={styles.overlay} 
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose?.();
            }}
        >
            <div className={styles.menu} role="menu" aria-label="Tùy chọn tệp tin" data-file-id={activeFileId}>
                {menuOptions.map((item) => {
                    const IconComponent = item.icon;
                    return (
                        <button
                            key={item.label}
                            className={item.destructive ? styles.destructive : ''}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                                if (item.action) item.action(file);
                                onClose?.();
                            }}
                        >
                            <IconComponent size={16} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>,
        document.body
    );
}

export default Co_moreMenuModal;