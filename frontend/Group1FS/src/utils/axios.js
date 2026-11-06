import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_MODE === "development"
    ? import.meta.env.VITE_BACKEND_DEVELOPMENT_URL
    // line below is outdated, but kept for reference
    : import.meta.env.VITE_BACKEND_PRODUCTION_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
});

export default api;
