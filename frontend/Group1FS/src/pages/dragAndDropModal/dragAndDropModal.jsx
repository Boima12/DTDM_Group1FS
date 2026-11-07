import { useRef, useState } from 'react';
import {
    CheckCircle2,
    Cloud,
    FileArchive,
    FileAudio,
    FileImage,
    FileText,
    FileVideo,
    LoaderCircle,
    Trash2,
    UploadCloud,
    X,
} from 'lucide-react';
import api from '../../utils/axios.js';
import styles from './dragAndDropModal.module.css';

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return FileImage;
    if (file.type.startsWith('video/')) return FileVideo;
    if (file.type.startsWith('audio/')) return FileAudio;
    if (file.type.includes('zip') || file.name.match(/\.(rar|7z|tar|gz)$/i)) return FileArchive;
    return FileText;
};

function Co_dragAndDropModal({
    visible,
    onClose,
    onUploadStart,
    onUploadProgress,
    onUploadComplete,
}) {
    const [files, setFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef(null);

    if (!visible) return null;

    const addFiles = (incoming) => {
        const accepted = [];
        const rejected = [];

        Array.from(incoming).forEach((file) => {
            if (file.size > MAX_FILE_SIZE) {
                rejected.push(`${file.name} vượt quá giới hạn 100 MB`);
            } else if (!files.some((item) => item.file.name === file.name && item.file.size === file.size)) {
                accepted.push({
                    id: `${file.name}-${file.lastModified}-${Math.random()}`,
                    file,
                });
            }
        });

        setFiles((current) => [...current, ...accepted]);
        setError(rejected.join('. '));
    };

    const onDrop = (event) => {
        event.preventDefault();
        setIsDragging(false);
        addFiles(event.dataTransfer.files);
    };

    const onBrowse = (event) => {
        addFiles(event.target.files);
        event.target.value = '';
    };

    const handleUploadItems = async () => {
        if (files.length === 0 || uploading) return;

        const validFiles = files.filter(({ file }) => file.size <= MAX_FILE_SIZE);
        if (validFiles.length === 0) {
            setError('Không có tệp hợp lệ để tải lên.');
            return;
        }

        const formData = new FormData();
        validFiles.forEach(({ file }) => formData.append('files', file));

        try {
            setUploading(true);
            setError('');
            onUploadStart(validFiles.map(({ file }) => ({
                name: file.name,
                size: file.size,
                type: file.type,
            })));
            const response = await api.post('/fsfiles/upload/multiple', formData, {
                onUploadProgress: (event) => {
                    if (event.total) {
                        onUploadProgress(Math.round((event.loaded / event.total) * 100));
                    }
                },
            });
            onUploadComplete(response.data.files || []);
            setFiles([]);
            onClose();
        } catch (err) {
            setError(`Tải lên thất bại: ${err.response?.data?.msg || err.message}`);
        } finally {
            setUploading(false);
        }
    };

    const close = () => {
        if (!uploading) onClose();
    };

    return (
        <div
            className={styles['modal-overlay']}
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) close();
            }}
        >
            <section className={styles['upload-modal']} role="dialog" aria-modal="true" aria-labelledby="upload-title">
                <div className={styles['accent-bar']} />
                <header className={styles['modal-header']}>
                    <div className={styles['modal-heading']}>
                        <span className={styles['cloud-icon']}><Cloud size={22} /></span>
                        <h1 id="upload-title">Tải tệp lên</h1>
                    </div>
                    <button className={`${styles['icon-button']} ${styles.close}`} type="button" aria-label="Đóng" onClick={close}>
                        <X size={18} />
                    </button>
                </header>

                <div className={styles['modal-body']}>
                    <div
                        className={`${styles['drop-zone']}${isDragging ? ` ${styles['is-dragging']}` : ''}`}
                        onDragEnter={(event) => {
                            event.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={onDrop}
                    >
                        <span className={styles['upload-icon']}><UploadCloud size={30} /></span>
                        <p className={styles['drop-title']}>
                            Kéo và thả tệp vào đây hoặc{' '}
                            <button type="button" onClick={() => inputRef.current?.click()}>Duyệt từ máy tính</button>
                        </p>
                        <p className={styles['drop-note']}>Giới hạn dung lượng tối đa hiện tại là 100 MB cho mỗi file</p>
                        <input ref={inputRef} type="file" multiple hidden onChange={onBrowse} />
                    </div>

                    {error && <p className={styles['upload-error']} role="alert">{error}</p>}

                    <section className={styles.queue} aria-label="Hàng đợi tải lên">
                        <div className={styles['queue-header']}>
                            <div className={styles['queue-title']}>
                                <span>Hàng đợi tải lên</span>
                                <span className={styles.count}>{files.length} tệp</span>
                            </div>
                            <div className={styles['queue-summary']}>
                                <span>Dung lượng dự kiến: {formatSize(files.reduce((sum, item) => sum + item.file.size, 0))}</span>
                                <button type="button" onClick={() => setFiles([])}>Xóa tất cả</button>
                            </div>
                        </div>
                        <div className={styles['queue-list']}>
                            {files.map(({ id, file }) => {
                                const FileIcon = getFileIcon(file);
                                return (
                                    <article className={styles['upload-item']} key={id}>
                                        <div className={styles['file-main']}>
                                            <div className={styles['file-icon']}><FileIcon size={20} /></div>
                                            <div className={styles['file-copy']}>
                                                <div className={styles['file-title-row']}>
                                                    <span className={styles['file-name']}>{file.name}</span>
                                                    <span className={styles['file-size']}>{formatSize(file.size)}</span>
                                                </div>
                                                <div className={styles['file-meta']}>
                                                    <span className={styles.status}><span className={styles['status-dot']} /> Sẵn sàng tải lên</span>
                                                    <span className={styles.separator}>•</span>
                                                    <span className={styles.chunks}>Chunks sẽ được xử lý bởi GridFS</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={styles['file-actions']}>
                                            <span className={styles.approved}><CheckCircle2 size={14} /> Đã duyệt</span>
                                            <button className={`${styles['icon-button']} ${styles.small}`} type="button" aria-label={`Xóa ${file.name}`} onClick={() => setFiles((current) => current.filter((item) => item.id !== id))}>
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                            {files.length === 0 && <div className={styles['empty-queue']}>Chưa có tệp nào trong hàng đợi</div>}
                        </div>
                    </section>
                </div>

                <footer className={styles['modal-footer']}>
                    <button className={styles['cancel-button']} type="button" onClick={close}>Hủy bỏ</button>
                    <button className={styles['stream-button']} type="button" disabled={files.length === 0 || uploading} onClick={handleUploadItems}>
                        {uploading ? <LoaderCircle className={styles.spinner} size={15} /> : <UploadCloud size={15} />}
                        {uploading ? 'Đang tải lên...' : `Tải lên ${files.length} tệp`}
                    </button>
                </footer>
            </section>
        </div>
    );
}

export default Co_dragAndDropModal;
