import axios from 'axios';
import { useAuthStore } from '../store/authStore.js';

// Base URL points to the modular local backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  withCredentials: true, // share session cookies
});

// 1. Request Interceptor: Attach JWT Authorization headers automatically
axiosInstance.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 2. Response Interceptor: Capture global API response states
axiosInstance.interceptors.response.use(
  (response) => {
    return response.data; // direct return of standard api success body
  },
  (error) => {
    const fallbackMessage = 'Server connection failed. Please try again.';
    let errorMessage = fallbackMessage;

    if (error.response) {
      // API error response (ApiError structure)
      errorMessage = error.response.data?.message || fallbackMessage;
      
      // Auto-logout expired admin authorization tokens
      if (error.response.status === 401 && useAuthStore.getState().isAuthenticated) {
        useAuthStore.getState().logout();
        window.location.href = '/admin/login';
      }
    }

    const compiledError = new Error(errorMessage);
    compiledError.status = error.response?.status || 500;
    compiledError.errors = error.response?.data?.errors || [];
    
    return Promise.reject(compiledError);
  }
);

export default axiosInstance;
