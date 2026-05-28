import { create } from 'zustand';

// Custom helper to generate enrollment IDs
const generateEnrollmentId = () => {
  return `ENR-${Math.floor(100000 + Math.random() * 900000)}`;
};

export const useAdminStore = create((set, get) => ({
  // ==========================================
  // 📊 Store States
  // ==========================================
  
  // Persistent queues stored in localStorage
  tokens: JSON.parse(localStorage.getItem('kiosk_all_tokens')) || [],
  queue: JSON.parse(localStorage.getItem('kiosk_active_queue')) || [],
  currentServing: localStorage.getItem('kiosk_current_serving') || '---',
  
  // Database of submitted correction/registration applications
  applications: JSON.parse(localStorage.getItem('kiosk_applications')) || [],
  
  // Active Counter Process Session State
  activeTokenProcess: null, // Token object currently being processed in Phase 2
  
  // ==========================================
  // ⚙️ Admin Actions
  // ==========================================
  
  // 1. Generate Token (Phase 1 Kiosk side triggers this)
  generateToken: (block, serviceType) => {
    const allTokens = get().tokens;
    const activeQueue = get().queue;
    
    // Prefix based on details
    const blockPrefix = block.substring(0, 3).toUpperCase(); // BIR, DEA, MAR
    const typePrefix = serviceType === 'correction' ? 'CORR' : 'REG';
    const serviceNum = allTokens.length + 1001;
    const tokenNumber = `TKN-${blockPrefix}-${typePrefix}-${serviceNum}`;
    
    const newToken = {
      tokenNumber,
      block, // birth, death, marriage
      serviceType, // correction, new_registration
      createdAt: new Date().toISOString(),
      status: 'WAITING' // WAITING, SERVING, COMPLETED, NO_SHOW
    };
    
    const updatedTokens = [...allTokens, newToken];
    const updatedQueue = [...activeQueue, tokenNumber];
    
    localStorage.setItem('kiosk_all_tokens', JSON.stringify(updatedTokens));
    localStorage.setItem('kiosk_active_queue', JSON.stringify(updatedQueue));
    
    set({
      tokens: updatedTokens,
      queue: updatedQueue
    });
    
    return newToken;
  },
  
  // 2. Queue Management Interface Actions
  callNextToken: () => {
    const activeQueue = get().queue;
    if (activeQueue.length === 0) {
      set({ currentServing: '---' });
      localStorage.setItem('kiosk_current_serving', '---');
      return '---';
    }
    
    const nextTokenNum = activeQueue[0];
    const updatedQueue = activeQueue.slice(1);
    
    // Update token status in the all-tokens list
    const updatedTokens = get().tokens.map(t => 
      t.tokenNumber === nextTokenNum ? { ...t, status: 'SERVING' } : t
    );
    
    localStorage.setItem('kiosk_active_queue', JSON.stringify(updatedQueue));
    localStorage.setItem('kiosk_all_tokens', JSON.stringify(updatedTokens));
    localStorage.setItem('kiosk_current_serving', nextTokenNum);
    
    set({
      queue: updatedQueue,
      tokens: updatedTokens,
      currentServing: nextTokenNum
    });
    
    // Set active process token if we call it from queue
    const tokenObj = updatedTokens.find(t => t.tokenNumber === nextTokenNum);
    if (tokenObj) {
      set({ activeTokenProcess: tokenObj });
    }
    
    return nextTokenNum;
  },
  
  // 3. Initiate Manual Token Processing
  setProcessingToken: (tokenNumber) => {
    const tokenObj = get().tokens.find(t => t.tokenNumber === tokenNumber);
    if (tokenObj) {
      // If the token is still in the queue, remove it
      const updatedQueue = get().queue.filter(t => t !== tokenNumber);
      const updatedTokens = get().tokens.map(t => 
        t.tokenNumber === tokenNumber ? { ...t, status: 'SERVING' } : t
      );
      
      localStorage.setItem('kiosk_active_queue', JSON.stringify(updatedQueue));
      localStorage.setItem('kiosk_all_tokens', JSON.stringify(updatedTokens));
      localStorage.setItem('kiosk_current_serving', tokenNumber);
      
      set({
        queue: updatedQueue,
        tokens: updatedTokens,
        currentServing: tokenNumber,
        activeTokenProcess: tokenObj
      });
      return true;
    }
    return false;
  },
  
  // 4. Complete Application Submission (Phase 2 Counter)
  submitApplication: (applicationData) => {
    const enrollmentId = generateEnrollmentId();
    const newApp = {
      ...applicationData,
      enrollmentId,
      submittedAt: new Date().toISOString(),
      registrarStatus: 'PENDING_APPROVAL' // PENDING_APPROVAL, APPROVED, OBJECTION
    };
    
    const updatedApps = [newApp, ...get().applications];
    localStorage.setItem('kiosk_applications', JSON.stringify(updatedApps));
    
    // Set token as COMPLETED
    const currentToken = get().activeTokenProcess;
    if (currentToken) {
      const updatedTokens = get().tokens.map(t => 
        t.tokenNumber === currentToken.tokenNumber ? { ...t, status: 'COMPLETED' } : t
      );
      localStorage.setItem('kiosk_all_tokens', JSON.stringify(updatedTokens));
      set({ tokens: updatedTokens });
    }
    
    // Reset current serving if it was this token
    if (get().currentServing === currentToken?.tokenNumber) {
      set({ currentServing: '---' });
      localStorage.setItem('kiosk_current_serving', '---');
    }
    
    set({
      applications: updatedApps,
      activeTokenProcess: null
    });
    
    return newApp;
  },
  
  // 5. Update Application Registrar Status (Approve / Object)
  updateApplicationStatus: (enrollmentId, status) => {
    const updatedApps = get().applications.map(app => 
      app.enrollmentId === enrollmentId ? { ...app, registrarStatus: status } : app
    );
    localStorage.setItem('kiosk_applications', JSON.stringify(updatedApps));
    set({ applications: updatedApps });
  },
  
  // 6. Reset System
  resetStore: () => {
    localStorage.removeItem('kiosk_all_tokens');
    localStorage.removeItem('kiosk_active_queue');
    localStorage.removeItem('kiosk_current_serving');
    localStorage.removeItem('kiosk_applications');
    set({
      tokens: [],
      queue: [],
      currentServing: '---',
      applications: [],
      activeTokenProcess: null
    });
  }
}));
