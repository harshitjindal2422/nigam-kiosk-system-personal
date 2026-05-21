import { create } from 'zustand';
import axiosInstance from '../api/axiosInstance.js';

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('kiosk_admin_token') || null,
  user: JSON.parse(localStorage.getItem('kiosk_admin_profile') || 'null'),
  isAuthenticated: !!localStorage.getItem('kiosk_admin_token'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      // The custom response interceptor returns response.data directly
      const { user, token } = response.data;

      localStorage.setItem('kiosk_admin_token', token);
      localStorage.setItem('kiosk_admin_profile', JSON.stringify(user));

      set({ token, user, isAuthenticated: true, loading: false });
      return { success: true };
    } catch (err) {
      const errMsg = err.message || 'Login failed. Please check credentials.';
      set({ error: errMsg, loading: false });
      return { success: false, message: errMsg };
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await axiosInstance.post('/auth/logout');
    } catch (err) {
      console.error('API logout notification failed:', err);
    } finally {
      localStorage.removeItem('kiosk_admin_token');
      localStorage.removeItem('kiosk_admin_profile');
      set({ token: null, user: null, isAuthenticated: false, loading: false, error: null });
    }
  },

  checkAuth: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get('/auth/me');
      const { user } = response.data;
      set({ user, isAuthenticated: true, loading: false });
    } catch (err) {
      // Wiping tokens if token has expired on backend
      localStorage.removeItem('kiosk_admin_token');
      localStorage.removeItem('kiosk_admin_profile');
      
      // Capturing critical server or network errors instead of silently hiding them
      const isSessionExpired = err.status === 401;
      const errMsg = isSessionExpired ? null : (err.message || 'Server connection failed.');
      
      set({ token: null, user: null, isAuthenticated: false, loading: false, error: errMsg });
    }
  }
}));
