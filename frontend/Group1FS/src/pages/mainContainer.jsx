import { useState } from 'react';
import Co_myDrive from './myDrive/myDrive.jsx';
import Co_moreMenuModal from './moreMenuModal/moreMenuModal.jsx';
import Co_fileDetailModal from './fileDetailModal/fileDetailModal.jsx';
import Co_previewModal from './previewModal/previewModal.jsx';
import Co_renameModal from './renameModal/renameModal.jsx';
import Co_dragAndDropModal from './dragAndDropModal/dragAndDropModal.jsx';
import Co_progressWidget from './progressWidget/progressWidget.jsx';
import Co_trashBin from './trashBin/trashBin.jsx';
import Co_confirmDeleteModal from './trashBin/confirmDeleteModal.jsx';
import Co_confirmDeleteSelectedModal from './trashBin/confirmDeleteSelectedModal.jsx';
import Co_notificationPopup from './notificationPopup/notificationPopup.jsx';

function Co_mainContainer({ 
    uploadVisible, 
    onCloseUpload, 
    activeMainContainer,
}) {

    const [activeMessage, setActiveMessage] = useState("");
    const [messageKey, setMessageKey] = useState(0);

    const [requestMyDriveRefresh, setRequestMyDriveRefresh] = useState(false);
    const [moreMenuVisible, setMoreMenuVisible] = useState(false);
    const [moreMenuFile, setMoreMenuFile] = useState(null);
    const [moreMenuFileId, setMoreMenuFileId] = useState(null);
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [renameModalFileId, setRenameModalFileId] = useState(null);
    const [fileDetailModalVisible, setFileDetailModalVisible] = useState(false);
    const [previewModalVisible, setPreviewModalVisible] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({
        visible: false,
        items: [],
        percent: 0,
        completed: false,
    });

    const showNotification = (message) => {
        setActiveMessage(message);
        setMessageKey((currentKey) => currentKey + 1);
    };

    const handleRequestMyDriveRefresh = (toggle) => {
        setRequestMyDriveRefresh(toggle);
    }

    const handleOpenMoreMenu = (file) => {
        setMoreMenuFile(file);
        setMoreMenuFileId(file._id);
        setMoreMenuVisible(true);
    };

    const handleOpenPreviewModal = () => {
        setPreviewModalVisible(true);
    }

    const handleOpenRenameModal = (fileId) => {
        setRenameModalFileId(fileId);
        setRenameModalVisible(true);
    }

    const handleOpenFileDetailModal = () => {
        setFileDetailModalVisible(true);
    }

    const handleUploadStart = (items) => {
        setUploadProgress({
            visible: true,
            items,
            percent: 0,
            completed: false,
        });
    };

    const handleUploadProgress = (percent) => {
        setUploadProgress((current) => ({ ...current, percent }));
    };

    const handleUploadComplete = (uploadedFiles) => {
        setUploadProgress((current) => ({
            ...current,
            items: current.items.map((item) => ({
                ...item,
                completed: true,
                uploaded: uploadedFiles.find((uploaded) => uploaded.filename === item.name),
            })),
            percent: 100,
            completed: true,
        }));
    };

    return(
        <main style={{ flex: 1, minWidth: 0 }}>
            {/* modals/widget that appear on top of the main content */}
            <Co_notificationPopup
                message={activeMessage}
                messageKey={messageKey}
            />

            <Co_moreMenuModal
                visible={moreMenuVisible}
                fileId={moreMenuFileId}
                onClose={() => setMoreMenuVisible(false)}
                onRename={handleOpenRenameModal}
                onInfo={handleOpenFileDetailModal}
                onPreview={handleOpenPreviewModal}
                onRefresh={handleRequestMyDriveRefresh}
                onNotification={showNotification}
            />

            <Co_previewModal 
                file={moreMenuFile}
                visible={previewModalVisible}
                onClose={() => setPreviewModalVisible(false)}
                onNotification={showNotification}
            />

            <Co_renameModal 
                visible={renameModalVisible}
                file={moreMenuFile}
                fileId={renameModalFileId}
                onClose={() => setRenameModalVisible(false)}
                onRefresh={handleRequestMyDriveRefresh}
                onNotification={showNotification}
            />

            <Co_fileDetailModal 
                file={moreMenuFile}
                visible={fileDetailModalVisible}
                onClose={() => setFileDetailModalVisible(false)}
            />

            <Co_dragAndDropModal
                visible={uploadVisible}
                onClose={onCloseUpload}
                onUploadStart={handleUploadStart}
                onUploadProgress={handleUploadProgress}
                onUploadComplete={handleUploadComplete}
                onNotification={showNotification}
                onRefresh={handleRequestMyDriveRefresh}
            />
            <Co_progressWidget
                visible={uploadProgress.visible}
                items={uploadProgress.items}
                percent={uploadProgress.percent}
                completed={uploadProgress.completed}
                onClose={() => setUploadProgress((current) => ({ ...current, visible: false }))}
            />
            <Co_confirmDeleteModal />
            <Co_confirmDeleteSelectedModal />

            {/* main content, only 1 can be displayed at a time */}
            {activeMainContainer === "myDrive" && (
                <Co_myDrive 
                    onRequestRefresh={requestMyDriveRefresh}
                    onRefresh={handleRequestMyDriveRefresh}
                    onOpenMoreMenu={handleOpenMoreMenu} 
                    onNotification={showNotification}
                />
            )}

            {activeMainContainer === "trashBin" && (
                <Co_trashBin />
            )}
        </main>
    );
}

export default Co_mainContainer