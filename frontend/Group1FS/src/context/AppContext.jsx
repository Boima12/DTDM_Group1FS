/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api, { AUTH_TOKEN_KEY } from '../utils/axios.js';
import { translate } from '../utils/i18n.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [theme, setTheme] = useState(() => localStorage.getItem('g1fs_theme') || 'light');
    const [lang, setLang] = useState(() => localStorage.getItem('g1fs_lang') || 'en');

    // Auth state
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [signedOutGate, setSignedOutGate] = useState(false);

    // Live Cloud Health state
    const [health, setHealth] = useState({
        status: 'checking',
        pingMs: null,
        environment: 'local',
        region: 'local',
        dbName: 'GROUP1FS',
    });

    // Live Storage Quota & Sidebar Counts
    const [stats, setStats] = useState({
        quotaBytes: 5 * 1024 * 1024 * 1024,
        totalUsedBytes: 0,
        activeBytes: 0,
        trashBytes: 0,
        usagePercent: 0,
        counts: { active: 0, trash: 0, starred: 0, folders: 0 },
        breakdown: { document: 0, image: 0, video: 0, audio: 0, archive: 0, other: 0, trash: 0 },
    });

    // Global refresh counter to synchronize Drive / Trash / Sidebar after mutations
    const [refreshTick, setRefreshTick] = useState(0);
    const triggerRefresh = useCallback(() => {
        setRefreshTick((t) => t + 1);
    }, []);

    // Semantic Toast queue (with optional Undo action button!)
    const [toasts, setToasts] = useState([]);
    const toastIdRef = useRef(0);

    const dismissToast = useCallback((id) => {
        setToasts((curr) => curr.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback(
        (message, options = {}) => {
            const { type = 'info', duration = 4500, actionLabel = null, onAction = null } = options;
            toastIdRef.current += 1;
            const id = toastIdRef.current;
            setToasts((curr) => [...curr.slice(-4), { id, message, type, actionLabel, onAction }]);
            if (duration > 0) {
                window.setTimeout(() => {
                    setToasts((curr) => curr.filter((t) => t.id !== id));
                }, duration);
            }
            return id;
        },
        []
    );

    // Global Upload Transfer Queue with per-file AbortController, speed (B/s) & ETA!
    const [uploadQueue, setUploadQueue] = useState([]);
    const [progressVisible, setProgressVisible] = useState(false);
    const abortControllersRef = useRef(new Map());

    const t = useCallback((key) => translate(lang, key), [lang]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('g1fs_theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('g1fs_lang', lang);
    }, [lang]);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    }, []);

    const toggleLang = useCallback(() => {
        setLang((prev) => (prev === 'en' ? 'vi' : 'en'));
    }, []);

    // Fetch live storage stats
    const refreshStats = useCallback(async () => {
        if (signedOutGate) return;
        try {
            const res = await api.get('/fsfiles/stats');
            if (res.data) setStats(res.data);
        } catch {
            // Silently ignore if offline
        }
    }, [signedOutGate]);

    // Bootstrap Auth Session
    useEffect(() => {
        let mounted = true;
        const initAuth = async () => {
            try {
                const token = localStorage.getItem(AUTH_TOKEN_KEY);
                if (token) {
                    const res = await api.get('/auth/me');
                    if (mounted && res.data?.user) {
                        setUser(res.data.user);
                        setSignedOutGate(false);
                        setAuthReady(true);
                        return;
                    }
                }
                // Seamless 1-click Demo Workspace bootstrap on first visit
                const demoRes = await api.post('/auth/demo');
                if (mounted && demoRes.data?.token) {
                    localStorage.setItem(AUTH_TOKEN_KEY, demoRes.data.token);
                    setUser(demoRes.data.user);
                    setSignedOutGate(false);
                }
            } catch {
                localStorage.removeItem(AUTH_TOKEN_KEY);
            } finally {
                if (mounted) setAuthReady(true);
            }
        };
        initAuth();
        return () => {
            mounted = false;
        };
    }, []);

    // Refresh stats whenever user or refreshTick changes
    useEffect(() => {
        if (authReady && user && !signedOutGate) {
            refreshStats();
        }
    }, [authReady, user, signedOutGate, refreshTick, refreshStats]);

    // Live Cloud Health Polling (every 15 seconds)
    const checkHealth = useCallback(async () => {
        try {
            const start = performance.now();
            const res = await api.get('/health', { timeout: 6000 });
            const rtt = Math.round(performance.now() - start);
            setHealth({
                status: res.data?.status === 'ok' ? 'ok' : 'degraded',
                pingMs: res.data?.db?.pingMs ?? rtt,
                rttMs: rtt,
                environment: res.data?.runtime?.environment || 'local',
                region: res.data?.runtime?.region || 'local',
                dbName: res.data?.db?.databaseName || 'GROUP1FS',
            });
        } catch {
            setHealth((prev) => ({ ...prev, status: 'offline', pingMs: null }));
        }
    }, []);

    useEffect(() => {
        checkHealth();
        const interval = window.setInterval(checkHealth, 15_000);
        return () => window.clearInterval(interval);
    }, [checkHealth]);

    // Auth actions
    const loginUser = useCallback(
        async (email, password) => {
            const res = await api.post('/auth/login', { email, password });
            localStorage.setItem(AUTH_TOKEN_KEY, res.data.token);
            setUser(res.data.user);
            setSignedOutGate(false);
            setAuthModalOpen(false);
            triggerRefresh();
            showToast(lang === 'vi' ? `Chào mừng ${res.data.user.name}!` : `Welcome back, ${res.data.user.name}!`, {
                type: 'success',
            });
            return res.data.user;
        },
        [lang, showToast, triggerRefresh]
    );

    const registerUser = useCallback(
        async (name, email, password) => {
            const res = await api.post('/auth/register', { name, email, password });
            localStorage.setItem(AUTH_TOKEN_KEY, res.data.token);
            setUser(res.data.user);
            setSignedOutGate(false);
            setAuthModalOpen(false);
            triggerRefresh();
            showToast(lang === 'vi' ? `Đã tạo tài khoản ${res.data.user.name}` : `Account created for ${res.data.user.name}`, {
                type: 'success',
            });
            return res.data.user;
        },
        [lang, showToast, triggerRefresh]
    );

    const enterDemoWorkspace = useCallback(async () => {
        const res = await api.post('/auth/demo');
        localStorage.setItem(AUTH_TOKEN_KEY, res.data.token);
        setUser(res.data.user);
        setSignedOutGate(false);
        setAuthModalOpen(false);
        triggerRefresh();
        showToast(lang === 'vi' ? 'Đã vào Không gian Demo Group1FS' : 'Entered Group1FS Demo Workspace', {
            type: 'success',
        });
        return res.data.user;
    }, [lang, showToast, triggerRefresh]);

    const signOutUser = useCallback(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setUser(null);
        setSignedOutGate(true);
        showToast(lang === 'vi' ? 'Đã đăng xuất tài khoản' : 'Signed out successfully', { type: 'info' });
    }, [lang, showToast]);

    // Per-file Concurrent Streaming Upload Engine (Concurrency = 3, AbortController, Speed & ETA!)
    const uploadSingleQueuedTask = useCallback(
        async (task) => {
            const controller = new AbortController();
            abortControllersRef.current.set(task.id, controller);
            const startTime = Date.now();

            const formData = new FormData();
            formData.append('file', task.file);
            if (task.folderId) formData.append('folderId', task.folderId);
            if (task.description) formData.append('description', task.description);
            if (task.tags) formData.append('tags', task.tags);

            setUploadQueue((curr) =>
                curr.map((item) =>
                    item.id === task.id
                        ? { ...item, status: 'uploading', percent: 0, loaded: 0, speed: 0, eta: 0, error: '' }
                        : item
                )
            );

            try {
                const res = await api.post('/fsfiles/upload', formData, {
                    signal: controller.signal,
                    timeout: 0,
                    onUploadProgress: (evt) => {
                        const total = evt.total || task.file.size || 1;
                        const loaded = evt.loaded || 0;
                        const percent = Math.min(99, Math.round((loaded / total) * 100));
                        const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
                        const speed = loaded / elapsedSec;
                        const eta = speed > 0 ? (total - loaded) / speed : 0;
                        setUploadQueue((curr) =>
                            curr.map((item) =>
                                item.id === task.id ? { ...item, percent, loaded, speed, eta } : item
                            )
                        );
                    },
                });

                const duplicateOf = res.data?.duplicateOf || null;
                setUploadQueue((curr) =>
                    curr.map((item) =>
                        item.id === task.id
                            ? {
                                  ...item,
                                  status: 'completed',
                                  percent: 100,
                                  loaded: task.file.size,
                                  speed: 0,
                                  eta: 0,
                                  duplicateOf,
                                  sha256: res.data?.sha256,
                              }
                            : item
                    )
                );

                if (duplicateOf) {
                    showToast(
                        lang === 'vi'
                            ? `Tải xong "${task.file.name}" (Trùng SHA-256 với "${duplicateOf.filename}")`
                            : `Uploaded "${task.file.name}" (Duplicate content of "${duplicateOf.filename}")`,
                        { type: 'warning', duration: 6000 }
                    );
                }
                return { ok: true };
            } catch (err) {
                const isCancelled = err.code === 'ERR_CANCELED' || err.name === 'CanceledError';
                const errMsg = isCancelled
                    ? lang === 'vi'
                        ? 'Đã hủy bởi người dùng'
                        : 'Cancelled by user'
                    : err.response?.data?.msg || err.message || 'Upload failed';

                setUploadQueue((curr) =>
                    curr.map((item) =>
                        item.id === task.id
                            ? { ...item, status: isCancelled ? 'cancelled' : 'error', error: errMsg, speed: 0, eta: 0 }
                            : item
                    )
                );
                return { ok: false, cancelled: isCancelled, error: errMsg };
            } finally {
                abortControllersRef.current.delete(task.id);
            }
        },
        [lang, showToast]
    );

    const enqueueUploads = useCallback(
        async (fileList, options = {}) => {
            const filesArray = Array.from(fileList || []);
            if (filesArray.length === 0) return;

            const MAX_SIZE = 100 * 1024 * 1024;
            const validTasks = [];
            const rejectedNames = [];

            filesArray.forEach((file) => {
                if (file.size > MAX_SIZE) {
                    rejectedNames.push(file.name);
                } else {
                    validTasks.push({
                        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                        file,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        folderId: options.folderId || null,
                        description: options.description || '',
                        tags: options.tags || '',
                        status: 'queued',
                        percent: 0,
                        loaded: 0,
                        speed: 0,
                        eta: 0,
                        error: '',
                    });
                }
            });

            if (rejectedNames.length > 0) {
                showToast(
                    lang === 'vi'
                        ? `Bỏ qua ${rejectedNames.length} tệp vượt giới hạn 100 MB: ${rejectedNames.join(', ')}`
                        : `Skipped ${rejectedNames.length} file(s) over 100 MB limit: ${rejectedNames.join(', ')}`,
                    { type: 'error', duration: 6000 }
                );
            }

            if (validTasks.length === 0) return;

            setUploadQueue((curr) => [...validTasks, ...curr].slice(0, 30));
            setProgressVisible(true);

            // Controlled concurrency pool (max 3 simultaneous uploads)
            const CONCURRENCY = 3;
            let cursor = 0;
            let successCount = 0;
            let failCount = 0;

            const worker = async () => {
                while (cursor < validTasks.length) {
                    const task = validTasks[cursor];
                    cursor += 1;
                    const res = await uploadSingleQueuedTask(task);
                    if (res.ok) successCount += 1;
                    else if (!res.cancelled) failCount += 1;
                }
            };

            await Promise.all(Array.from({ length: Math.min(CONCURRENCY, validTasks.length) }, worker));

            if (successCount > 0) {
                triggerRefresh();
                showToast(
                    lang === 'vi'
                        ? `Đã tải lên thành công ${successCount} tệp vào GridFS!`
                        : `Successfully uploaded ${successCount} file${successCount === 1 ? '' : 's'} to GridFS!`,
                    { type: 'success' }
                );
            }
            if (failCount > 0) {
                showToast(
                    lang === 'vi'
                        ? `${failCount} tệp tải lên thất bại. Bạn có thể bấm Thử lại trong tiến trình.`
                        : `${failCount} file${failCount === 1 ? '' : 's'} failed to upload. Use Retry in the queue.`,
                    { type: 'error' }
                );
            }
        },
        [lang, showToast, triggerRefresh, uploadSingleQueuedTask]
    );

    const cancelUploadTask = useCallback((taskId) => {
        const ctrl = abortControllersRef.current.get(taskId);
        if (ctrl) ctrl.abort();
    }, []);

    const retryUploadTask = useCallback(
        async (taskId) => {
            const target = uploadQueue.find((item) => item.id === taskId);
            if (!target) return;
            const res = await uploadSingleQueuedTask(target);
            if (res.ok) {
                triggerRefresh();
                showToast(
                    lang === 'vi' ? `Đã tải lại "${target.name}" thành công!` : `Retried "${target.name}" successfully!`,
                    { type: 'success' }
                );
            }
        },
        [lang, showToast, triggerRefresh, uploadQueue, uploadSingleQueuedTask]
    );

    const clearCompletedUploads = useCallback(() => {
        setUploadQueue((curr) => curr.filter((i) => i.status === 'uploading' || i.status === 'queued'));
    }, []);

    return (
        <AppContext.Provider
            value={{
                theme,
                toggleTheme,
                lang,
                toggleLang,
                t,
                user,
                authReady,
                authModalOpen,
                setAuthModalOpen,
                signedOutGate,
                loginUser,
                registerUser,
                enterDemoWorkspace,
                signOutUser,
                health,
                checkHealth,
                stats,
                refreshStats,
                refreshTick,
                triggerRefresh,
                toasts,
                showToast,
                dismissToast,
                uploadQueue,
                progressVisible,
                setProgressVisible,
                enqueueUploads,
                cancelUploadTask,
                retryUploadTask,
                clearCompletedUploads,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export const useApp = () => {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used inside AppProvider');
    return ctx;
};
