import { useState } from 'react';
import Co_myDrive from './myDrive/myDrive.jsx';
import Co_moreMenuModal from './moreMenuModal/moreMenuModal.jsx';
import Co_fileDetailModal from './fileDetailModal/fileDetailModal.jsx';
import Co_previewModal from './previewModal/previewModal.jsx';
import Co_renameModal from './renameModal/renameModal.jsx';
import Co_dragAndDropModal from './dragAndDropModal/dragAndDropModal.jsx';
import Co_progressWidget from './progressWidget/progressWidget.jsx';
import Co_searchNormal from './searchNormal/searchNormal.jsx';
import Co_trashBin from './trashBin/trashBin.jsx';
import Co_searchTrashBin from './trashBin/searchTrashBin.jsx';
import Co_confirmDeleteModal from './trashBin/confirmDeleteModal.jsx';
import Co_confirmDeleteSelectedModal from './trashBin/confirmDeleteSelectedModal.jsx';

function Co_mainContainer({ uploadVisible, onCloseUpload }) {
    const [moreMenuVisible, setMoreMenuVisible] = useState(false);
    const [moreMenuFileId, setMoreMenuFileId] = useState(null);
    const [uploadProgress, setUploadProgress] = useState({
        visible: false,
        items: [],
        percent: 0,
        completed: false,
    });

    const handleOpenMoreMenu = (fileId) => {
        setMoreMenuFileId(fileId);
        setMoreMenuVisible(true);
    };

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
            <Co_moreMenuModal
                visible={moreMenuVisible}
                fileId={moreMenuFileId}
                onClose={() => setMoreMenuVisible(false)}
            />
            <Co_fileDetailModal />
            <Co_previewModal />
            <Co_renameModal />
            <Co_dragAndDropModal
                visible={uploadVisible}
                onClose={onCloseUpload}
                onUploadStart={handleUploadStart}
                onUploadProgress={handleUploadProgress}
                onUploadComplete={handleUploadComplete}
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
            <Co_myDrive onOpenMoreMenu={handleOpenMoreMenu} />
            <Co_searchNormal />
            <Co_trashBin />
            <Co_searchTrashBin />
        </main>
    );
}

export default Co_mainContainer