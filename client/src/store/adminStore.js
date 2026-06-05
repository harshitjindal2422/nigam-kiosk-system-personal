import { create } from 'zustand';
import axiosInstance from '../api/axiosInstance.js';

export const useAdminStore = create((set, get) => ({
  // ==========================================
  // 📊 Store States
  // ==========================================
  tokens: [],
  queue: [], // List of tokenNumbers in WAITING status
  currentServing: '---',
  activeTokenProcess: null, // Token object currently being processed
  loading: false,
  error: null,

  // ==========================================
  // ⚙️ Admin Actions
  // ==========================================
  
  // 0. Generate Kiosk Token on Backend
  generateToken: async (block, serviceType) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.post('/counter-correction/kiosk-token', { block, serviceType });
      const rawToken = response.data.token;
      const mappedToken = {
        tokenNumber: rawToken.token_number,
        block: block,
        serviceType: serviceType,
        createdAt: rawToken.issued_at,
        status: rawToken.queue_status,
        counter_number: rawToken.counter_number
      };
      set({ loading: false });
      return mappedToken;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // 1. Fetch active queue tokens from backend
  fetchActiveQueue: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get('/applications/active-tokens');
      const tokens = response.data || [];
      const waitingTokens = tokens.filter(t => t.queue_status === 'WAITING').map(t => t.token_number);
      const servingToken = tokens.find(t => t.queue_status === 'SERVING')?.token_number || '---';

      set({
        tokens,
        queue: waitingTokens,
        currentServing: servingToken,
        loading: false
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },
  
  // 2. Call Next Token in Queue
  callNextToken: () => {
    const tokens = get().tokens;
    const waiting = tokens.filter(t => t.queue_status === 'WAITING');
    if (waiting.length === 0) {
      set({ currentServing: '---', activeTokenProcess: null });
      return '---';
    }
    
    const nextToken = waiting[0];
    const updatedTokens = tokens.map(t => 
      t.token_number === nextToken.token_number ? { ...t, queue_status: 'SERVING' } : t
    );
    
    // Map backend token layout
    const activeTokenObj = {
      tokenNumber: nextToken.token_number,
      // Parse block and serviceType from tokenNumber or defaults
      block: nextToken.token_number.includes('BIR') ? 'birth' : nextToken.token_number.includes('DEA') ? 'death' : 'marriage',
      serviceType: nextToken.token_number.includes('CORR') ? 'correction' : 'new_registration',
      createdAt: nextToken.issued_at,
      ...nextToken
    };

    const waitingTokens = updatedTokens.filter(t => t.queue_status === 'WAITING').map(t => t.token_number);

    set({
      tokens: updatedTokens,
      queue: waitingTokens,
      currentServing: nextToken.token_number,
      activeTokenProcess: activeTokenObj
    });
    
    return nextToken.token_number;
  },
  
  // 3. Initiate Manual Token Processing
  setProcessingToken: (tokenNumber) => {
    const tokens = get().tokens;
    const matchedToken = tokens.find(t => t.token_number === tokenNumber);
    if (matchedToken) {
      const updatedTokens = tokens.map(t => 
        t.token_number === tokenNumber ? { ...t, queue_status: 'SERVING' } : t
      );
      
      const activeTokenObj = {
        tokenNumber: matchedToken.token_number,
        block: matchedToken.token_number.includes('BIR') ? 'birth' : matchedToken.token_number.includes('DEA') ? 'death' : 'marriage',
        serviceType: matchedToken.token_number.includes('CORR') ? 'correction' : 'new_registration',
        createdAt: matchedToken.issued_at,
        ...matchedToken
      };

      const waitingTokens = updatedTokens.filter(t => t.queue_status === 'WAITING').map(t => t.token_number);

      set({
        tokens: updatedTokens,
        queue: waitingTokens,
        currentServing: tokenNumber,
        activeTokenProcess: activeTokenObj
      });
      return true;
    }
    return false;
  },
  
  // 4. Complete Application Submission (Counter Operator to backend)
  submitApplication: async (applicationPayload) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.post('/applications/submit', applicationPayload);
      
      // Refresh active queue after submission
      await get().fetchActiveQueue();
      
      set({
        loading: false
      });
      return response.data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },
  
  // 5. Search existing objection application
  searchObjectionApplication: async (searchQuery) => {
    set({ loading: true, error: null });
    try {
      const response = await axiosInstance.get(`/applications/search?query=${searchQuery}`);
      set({ loading: false });
      return response.data;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  // Helper action to clear active token process
  clearActiveTokenProcess: () => {
    set({ activeTokenProcess: null });
  },
  
  // 6. Reset System (removes active tokens on backend if needed, or simply resets client)
  resetStore: () => {
    set({
      tokens: [],
      queue: [],
      currentServing: '---',
      activeTokenProcess: null,
      error: null
    });
  }
}));
