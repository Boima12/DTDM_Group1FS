import { useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useApp } from './context/AppContext.jsx';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import ProgressWidget from './components/ProgressWidget.jsx';
import AuthModal from './components/AuthModal.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import DragAndDropModal from './components/DragAndDropModal.jsx';
import { FolderCreateEditModal } from './components/FolderModal.jsx';
import MyDrivePage from './pages/MyDrivePage.jsx';
import TrashPage from './pages/TrashPage.jsx';
import TelemetryPage from './pages/TelemetryPage.jsx';
import ActivityPage from './pages/ActivityPage.jsx';
import PublicSharePage from './pages/PublicSharePage.jsx';

function WorkspaceShell() {
    const navigate = useNavigate();
    const {
        authReady,
        signedOutGate,
        authModalOpen,
        setAuthModalOpen,
        triggerRefresh,
        checkHealth,
        showToast,
        lang,
    } = useApp();

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [externalPreviewFile, setExternalPreviewFile] = useState(null);

    if (!authReady) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                }}
            >
                <LoaderCircle size={20} className="g1-spin" style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 600 }}>Connecting to Group1FS Cloud...</span>
            </div>
        );
    }

    if (signedOutGate) {
        return (
            <>
                <AuthModal fullPage />
                <ToastContainer />
            </>
        );
    }

    const handleManualRefresh = async () => {
        setRefreshing(true);
        triggerRefresh();
        await checkHealth();
        window.setTimeout(() => {
            setRefreshing(false);
            showToast(lang === 'vi' ? 'Đã đồng bộ dữ liệu mới nhất từ Cloud' : 'Synced latest data from Cloud', {
                type: 'success',
                duration: 2200,
            });
        }, 350);
    };

    return (
        <div className="g1-shell">
            <Sidebar
                mobileOpen={mobileMenuOpen}
                onCloseMobile={() => setMobileMenuOpen(false)}
                onUploadClick={() => setUploadModalOpen(true)}
                onNewFolderClick={() => {
                    navigate('/');
                    setNewFolderModalOpen(true);
                }}
            />

            <div className="g1-main-col">
                <Topbar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onOpenMobileMenu={() => setMobileMenuOpen(true)}
                    onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                    refreshing={refreshing}
                    onRefresh={handleManualRefresh}
                />

                <Routes>
                    <Route
                        path="/"
                        element={
                            <MyDrivePage
                                searchQuery={searchQuery}
                                currentFolderId={currentFolderId}
                                onFolderChange={setCurrentFolderId}
                                onOpenUpload={() => setUploadModalOpen(true)}
                                onOpenNewFolder={() => setNewFolderModalOpen(true)}
                                externalPreviewFile={externalPreviewFile}
                                onClearExternalPreview={() => setExternalPreviewFile(null)}
                            />
                        }
                    />
                    <Route
                        path="/starred"
                        element={
                            <MyDrivePage
                                starredOnly
                                searchQuery={searchQuery}
                                onOpenUpload={() => setUploadModalOpen(true)}
                                externalPreviewFile={externalPreviewFile}
                                onClearExternalPreview={() => setExternalPreviewFile(null)}
                            />
                        }
                    />
                    <Route path="/trash" element={<TrashPage searchQuery={searchQuery} />} />
                    <Route path="/telemetry" element={<TelemetryPage />} />
                    <Route path="/activity" element={<ActivityPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>

            {/* Global Overlays */}
            <DragAndDropModal
                visible={uploadModalOpen}
                currentFolderId={currentFolderId}
                onClose={() => setUploadModalOpen(false)}
            />

            <FolderCreateEditModal
                visible={newFolderModalOpen}
                parentId={currentFolderId}
                onClose={() => setNewFolderModalOpen(false)}
            />

            <CommandPalette
                visible={commandPaletteOpen}
                onClose={() => setCommandPaletteOpen(false)}
                onUploadClick={() => setUploadModalOpen(true)}
                onNewFolderClick={() => {
                    navigate('/');
                    setNewFolderModalOpen(true);
                }}
                onSelectFile={(file) => {
                    navigate('/');
                    setExternalPreviewFile(file);
                }}
            />

            {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}

            <ProgressWidget />
            <ToastContainer />
        </div>
    );
}

export default function App() {
    const location = useLocation();
    if (location.pathname.startsWith('/share/')) {
        return (
            <>
                <Routes>
                    <Route path="/share/:token" element={<PublicSharePage />} />
                </Routes>
                <ToastContainer />
            </>
        );
    }
    return <WorkspaceShell />;
}
