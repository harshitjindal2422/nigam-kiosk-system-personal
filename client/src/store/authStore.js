import { create } from 'zustand';
import axiosInstance from '../api/axiosInstance.js';

// Pre-seeded default counter operators
const DEFAULT_OPERATORS = [
  {
    id: 'OPR-1001',
    full_name: 'Suresh Kumar',
    email: 'suresh@nagarnigam.gov.in',
    password: 'Operator@123',
    role: 'COUNTER_OPERATOR',
    assignedCounter: 'Counter 1'
  },
  {
    id: 'OPR-1002',
    full_name: 'Anjali Sharma',
    email: 'anjali@nagarnigam.gov.in',
    password: 'Operator@123',
    role: 'COUNTER_OPERATOR',
    assignedCounter: 'Counter 2'
  },
  {
    id: 'OPR-1003',
    full_name: 'Vikram Singh',
    email: 'vikram@nagarnigam.gov.in',
    password: 'Operator@123',
    role: 'COUNTER_OPERATOR',
    assignedCounter: 'Counter 3'
  }
];

export const useAuthStore = create((set, get) => ({
  // ==========================================
  // 📊 Store States
  // ==========================================
  token: localStorage.getItem('kiosk_admin_token') || null,
  user: JSON.parse(localStorage.getItem('kiosk_admin_profile') || 'null'),
  isAuthenticated: !!localStorage.getItem('kiosk_admin_token'),
  loading: false,
  error: null,
  
  // Local list of counter operators (Super Admin can append to this)
  operators: JSON.parse(localStorage.getItem('kiosk_operators')) || DEFAULT_OPERATORS,

  // ==========================================
  // ⚙️ Auth Actions
  // ==========================================
  
  // 1. Unified Login Action (authenticates Kiosk Admins, Operators on the backend)
  login: async (email, password) => {
    set({ loading: true, error: null });
    
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      const { user, token } = response.data;

      localStorage.setItem('kiosk_admin_token', token);
      localStorage.setItem('kiosk_admin_profile', JSON.stringify(user));

      set({ token, user, isAuthenticated: true, loading: false });
      return { success: true, role: user.role };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Login failed. Please check credentials.';
      set({ error: errMsg, loading: false });
      return { success: false, message: errMsg };
    }
  },

  // 2. Register New Operator (Super Admin calls this)
  registerOperator: (operatorData) => {
    const nextId = `OPR-${1000 + get().operators.length + 1}`;
    const newOperator = {
      id: nextId,
      full_name: operatorData.fullName,
      email: operatorData.email,
      password: operatorData.password,
      role: 'COUNTER_OPERATOR',
      assignedCounter: operatorData.assignedCounter || 'Counter 1'
    };
    
    const updatedOperators = [...get().operators, newOperator];
    localStorage.setItem('kiosk_operators', JSON.stringify(updatedOperators));
    set({ operators: updatedOperators });
    return newOperator;
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
      localStorage.removeItem('kiosk_admin_token');
      localStorage.removeItem('kiosk_admin_profile');
      const isSessionExpired = err.status === 401;
      const errMsg = isSessionExpired ? null : (err.message || 'Server connection failed.');
      set({ token: null, user: null, isAuthenticated: false, loading: false, error: errMsg });
    }
  }
}));
