import axios from 'axios';

const resolveBaseUrl = () => {
    const mode = import.meta.env.VITE_MODE || (import.meta.env.DEV ? 'development' : 'production');
    if (mode === 'development' && import.meta.env.VITE_BACKEND_DEVELOPMENT_URL) {
        return import.meta.env.VITE_BACKEND_DEVELOPMENT_URL;
    }
    if (import.meta.env.VITE_BACKEND_PRODUCTION_URL) {
        return import.meta.env.VITE_BACKEND_PRODUCTION_URL;
    }
    return '/api/v1';
};

export const API_BASE_URL = resolveBaseUrl().replace(/\/$/, '');
export const AUTH_TOKEN_KEY = 'g1fs_auth_token';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60_000,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/**
 * Build direct streaming URL (for <img src>, <video src>, <audio src>, <iframe src>)
 * appending JWT token if present so private user accounts stream smoothly too!
 */
export const buildFileStreamUrl = (fileId, mode = 'preview') => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const params = new URLSearchParams();
    if (mode) params.set('mode', mode);
    if (token) params.set('token', token);
    return `${API_BASE_URL}/fsfiles/download/${fileId}?${params.toString()}`;
};

export const buildPublicShareStreamUrl = (shareToken, mode = 'preview', accessToken = '') => {
    const params = new URLSearchParams();
    if (mode) params.set('mode', mode);
    if (accessToken) params.set('accessToken', accessToken);
    return `${API_BASE_URL}/public/share/${shareToken}/stream?${params.toString()}`;
};

export default api;
