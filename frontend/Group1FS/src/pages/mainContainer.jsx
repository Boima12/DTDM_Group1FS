// import { useState } from 'react';
import Co_myDrive from './myDrive/myDrive.jsx';
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

function Co_mainContainer() {
    return(
        <div>
            {/* modals/widget that appear on top of the main content */}
            <Co_fileDetailModal />
            <Co_previewModal />
            <Co_renameModal />
            <Co_dragAndDropModal />
            <Co_progressWidget />
            <Co_confirmDeleteModal />
            <Co_confirmDeleteSelectedModal />

            {/* main content, only 1 can be displayed at a time */}
            <Co_myDrive />
            <Co_searchNormal />
            <Co_trashBin />
            <Co_searchTrashBin />
        </div>
    );
}

export default Co_mainContainer