import { useEffect, useRef, useState } from "react";
import {
    Archive,
    Download,
    FileAudio,
    FileCode2,
    FileImage,
    FileText,
    FileVideo,
    Info,
    Maximize2,
    Mouse,
    RotateCw,
    X,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import styles from "./previewModal.module.css";
import api from '../../utils/axios.js';
import { FileInspector } from "./previewModalParts.jsx";


function Co_previewModal({
    file,
    visible,
    onClose,
}) {
    const [inspectorOpen, setInspectorOpen] = useState(true);
    const [zoom, setZoom] = useState(100);
    const [rotation, setRotation] = useState(0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isTrashed, setIsTrashed] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");
    const [textContent, setTextContent] = useState("");
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState("");
    const dragOrigin = useRef(null);

    const getCategory = (targetFile) => targetFile.metadata?.category || "other";
    const contentType = file?.metadata?.contentType?.toLowerCase() || "";
    const extension = file?.metadata?.extension?.toLowerCase() || "";
    const isTextPreview = contentType.startsWith("text/")
        || ["json", "md"].includes(extension)
        || contentType === "application/json";
    const isImagePreview = contentType.startsWith("image/");
    const isVideoPreview = contentType.startsWith("video/");
    const isAudioPreview = contentType.startsWith("audio/");
    const isPdfPreview = contentType === "application/pdf" || extension === "pdf";
    const isPreviewable = file?.metadata?.previewable
        && (isImagePreview || isVideoPreview || isAudioPreview || isPdfPreview || isTextPreview);

    useEffect(() => {
        let cancelled = false;
        let objectUrl = "";

        const loadPreview = async () => {
            if (!visible || !file || !isPreviewable) {
                setPreviewUrl("");
                setTextContent("");
                setPreviewError("");
                setPreviewLoading(false);
                return;
            }

            setPreviewLoading(true);
            setPreviewError("");
            setTextContent("");

            try {
                const response = await api.get(`/fsfiles/download/${file._id}`, {
                    responseType: "blob",
                });
                const blob = new Blob([response.data], {
                    type: response.headers["content-type"] || contentType,
                });

                if (isTextPreview) {
                    const text = await blob.text();
                    if (!cancelled) setTextContent(text);
                } else {
                    objectUrl = window.URL.createObjectURL(blob);
                    if (!cancelled) setPreviewUrl(objectUrl);
                }
            } catch (error) {
                if (!cancelled) {
                    setPreviewError(error.response?.data?.msg || error.message);
                }
            } finally {
                if (!cancelled) setPreviewLoading(false);
            }
        };

        loadPreview();

        return () => {
            cancelled = true;
            if (objectUrl) window.URL.revokeObjectURL(objectUrl);
        };
    }, [contentType, file, isPreviewable, isTextPreview, visible]);

    if (!visible || !file) return null;

    const fileIcon = (targetFile, size = 20) => {
        const categoryIcons = {
            image: FileImage,
            video: FileVideo,
            audio: FileAudio,
            document: FileText,
            other: FileCode2,
        };
        const Icon = categoryIcons[getCategory(targetFile)] || Archive;
        return <Icon size={size} />;
    };

    const clampZoom = (value) => Math.min(180, Math.max(50, value));

    function changeZoom(delta) {
        setZoom((current) => clampZoom(current + delta));
    }

    function fitPage() {
        setZoom(100);
        setRotation(0);
        setOffset({ x: 0, y: 0 });
    }

    function startDrag(event) {
        dragOrigin.current = {
            pointerX: event.clientX,
            pointerY: event.clientY,
            offsetX: offset.x,
            offsetY: offset.y,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    }

    function dragPage(event) {
        if (!dragOrigin.current) return;
        setOffset({
            x:
                dragOrigin.current.offsetX +
                event.clientX -
                dragOrigin.current.pointerX,
            y:
                dragOrigin.current.offsetY +
                event.clientY -
                dragOrigin.current.pointerY,
        });
    }

    function stopDrag() {
        dragOrigin.current = null;
    }
    
    const formatFileSize3 = (bytes = 0, dateInput) => {
        const formattedBytes = new Intl.NumberFormat("en-US").format(bytes);

        if (!dateInput) return "";
        const date = new Date(dateInput);

        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Ho_Chi_Minh",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        }).formatToParts(date);


        const map = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
        return ` ${formattedBytes} bytes · Uploaded ${map.hour}:${map.minute}:${map.second} (GMT+7)`;
    };

    const handleDownload = async (fileIdToDownload) => {
        const targetId = fileIdToDownload;
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

    return (
        <main className={styles["viewer-shell"]}>
            <section className={styles["preview-pane"]} aria-label="Xem trước tệp">
                <header className={styles.topbar}>
                    <div className={styles["file-identity"]}>
                        <span className={styles["pdf-icon"]}>
                            {fileIcon(file, 18)}
                        </span>
                        <div className={styles["file-identity-copy"]}>
                            <h1>{file.filename}</h1>
                            <span>{formatFileSize3(file.length, file.uploadDate)}</span>
                        </div>
                    </div>

                    <div
                        className={styles["viewport-controls"]}
                        aria-label="Điều khiển khung xem"
                    >
                        <button
                            type="button"
                            aria-label="Thu nhỏ"
                            title="Thu nhỏ"
                            onClick={() => changeZoom(-10)}
                        >
                            <ZoomOut className={`${styles["icon-asset"]} ${styles["icon-white"]}`} size={16} />
                        </button>
                        <output aria-live="polite">{zoom}%</output>
                        <button
                            type="button"
                            aria-label="Phóng to"
                            title="Phóng to"
                            onClick={() => changeZoom(10)}
                        >
                            <ZoomIn className={`${styles["icon-asset"]} ${styles["icon-white"]}`} size={16} />
                        </button>
                        <span className={styles["control-divider"]} />
                        <button
                            type="button"
                            aria-label="Vừa khung xem"
                            title="Vừa khung xem"
                            onClick={fitPage}
                        >
                            <Maximize2 className={`${styles["icon-asset"]} ${styles["icon-white"]}`} size={15} />
                        </button>
                        <button
                            type="button"
                            aria-label="Xoay trang"
                            title="Xoay trang"
                            onClick={() =>
                                setRotation((current) => (current + 90) % 360)
                            }
                        >
                            <RotateCw className={`${styles["icon-asset"]} ${styles["icon-white"]}`} size={15} />
                        </button>
                    </div>

                    <div
                        className={styles["window-actions"]}
                        aria-label="Action Controls & Window Buttons"
                    >
                        <a
                            className={styles["top-download"]}
                            onClick={() => handleDownload(file?._id)}
                        >
                            <Download className={styles["icon-asset"]} size={15} />
                            <span>Tải xuống</span>
                        </a>
                        <button
                            className={`${styles["info-toggle"]}${inspectorOpen ? ` ${styles["is-active"]}` : ""}`}
                            type="button"
                            aria-label={
                                inspectorOpen
                                    ? "Ẩn thông tin tệp"
                                    : "Hiện thông tin tệp"
                            }
                            aria-expanded={inspectorOpen}
                            aria-controls="file-information"
                            title={
                                inspectorOpen
                                    ? "Ẩn thông tin tệp"
                                    : "Hiện thông tin tệp"
                            }
                            onClick={() => setInspectorOpen((open) => !open)}
                        >
                            <Info className={styles["icon-asset"]} size={16} />
                        </button>
                        <button
                            className={styles["close-viewer"]}
                            type="button"
                            aria-label="Đóng trình xem"
                            title="Đóng trình xem"
                            onClick={onClose}
                        >
                            <X className={`${styles["icon-asset"]}`} size={16} />
                        </button>
                    </div>
                </header>

                <div
                    className={styles.canvas}
                    onWheel={(event) => {
                        event.preventDefault();
                        changeZoom(event.deltaY > 0 ? -5 : 5);
                    }}
                >
                    <div
                        className={styles["page-transform"]}
                        onPointerDown={startDrag}
                        onPointerMove={dragPage}
                        onPointerUp={stopDrag}
                        onPointerCancel={stopDrag}
                        style={{
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom / 100}) rotate(${rotation}deg)`,
                        }}
                    >
                        {previewLoading && <div className={styles["preview-status"]}>Đang tải bản xem trước...</div>}
                        {!previewLoading && previewError && (
                            <div className={styles["preview-status"]}>Không thể xem trước: {previewError}</div>
                        )}
                        {!previewLoading && !previewError && !isPreviewable && (
                            <div className={styles["preview-status"]}>
                                Định dạng tệp này không hỗ trợ xem trước.
                            </div>
                        )}
                        {!previewLoading && !previewError && isImagePreview && previewUrl && (
                            <img
                                className={styles["preview-page"]}
                                src={previewUrl}
                                alt={file.metadata?.originalName || file.filename}
                                draggable="false"
                            />
                        )}
                        {!previewLoading && !previewError && isPdfPreview && previewUrl && (
                            <iframe
                                className={styles["document-preview"]}
                                src={previewUrl}
                                title={`Xem trước ${file.filename}`}
                            />
                        )}
                        {!previewLoading && !previewError && isVideoPreview && previewUrl && (
                            <video className={styles["media-preview"]} controls src={previewUrl}>
                                Trình duyệt không hỗ trợ phát video này.
                            </video>
                        )}
                        {!previewLoading && !previewError && isAudioPreview && previewUrl && (
                            <audio className={styles["audio-preview"]} controls src={previewUrl}>
                                Trình duyệt không hỗ trợ phát âm thanh này.
                            </audio>
                        )}
                        {!previewLoading && !previewError && isTextPreview && (
                            <pre className={styles["text-preview"]}>{textContent}</pre>
                        )}
                    </div>

                    <div className={styles["helper-pill"]}>
                        <Mouse className={styles["icon-asset"]} size={14} />
                        <span>Cuộn chuột để thu phóng · Kéo để di chuyển vị trí xem</span>
                    </div>
                </div>
            </section>

            {inspectorOpen && (
                <FileInspector
                    file={file}
                    onClose={() => setInspectorOpen(false)}
                    isTrashed={isTrashed}
                    onTrash={() => setIsTrashed((trashed) => !trashed)}
                />
            )}
        </main>
    );
}

export default Co_previewModal;