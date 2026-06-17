import { create } from 'zustand';
import { dictionary } from '../translations/dictionary.js';

export const useKioskStore = create((set, get) => ({
  // ==========================================
  // 📊 Store States
  // ==========================================
  language: localStorage.getItem('kiosk_lang') || 'hi',
  voiceAssist: localStorage.getItem('kiosk_voice') === 'true',
  highContrast: localStorage.getItem('kiosk_contrast') === 'true',
  largeText: localStorage.getItem('kiosk_text') === 'true',
  
  kioskState: 'SLEEP', // SLEEP, HOME, PAUSE, HOLD, ACTIVE
  pauseContext: null,  // 'BLOCK_1', 'BLOCK_2', 'BLOCK_4', etc.
  activeModal: null,   // print, receipt, pehchanOnline, error, null
  errorMessage: '',
  
  idleSeconds: 0,
  maxIdleSeconds: 120, // 2 minutes inactivity timeout
  warningSeconds: 5,   // show warning overlay 5s before reset
  
  // ==========================================
  // ⚙️ Core Store Actions
  // ==========================================
  
  // 1. Language Toggle
  setLanguage: (lang) => {
    localStorage.setItem('kiosk_lang', lang);
    set({ language: lang });
    
    // Play transition voice assistant cue
    if (get().voiceAssist) {
      const msg = lang === 'hi' ? 'भाषा हिंदी में बदली गई है।' : 'Language changed to English.';
      get().speak(msg);
    }
  },

  // 2. Accessibility Options Toggle
  toggleA11y: (key) => {
    const nextVal = !get()[key];
    localStorage.setItem(`kiosk_${key.replace('voiceAssist', 'voice').replace('highContrast', 'contrast').replace('largeText', 'text')}`, nextVal);
    
    set({ [key]: nextVal });

    if (key === 'voiceAssist') {
      if (nextVal) {
        const text = get().language === 'hi' ? 'वॉइस असिस्टेंट चालू किया गया है।' : 'Voice assistant is turned on.';
        get().speak(text);
      } else {
        window.speechSynthesis.cancel();
      }
    }
  },

  // 3. Kiosk Session Lifecycle States
  setKioskState: (state, context = null) => {
    let nextContext = context;
    if ((state === 'ACTIVE' || state === 'HOLD' || state === 'PAUSE') && context === null) {
      nextContext = get().pauseContext;
    }
    set({ kioskState: state, pauseContext: nextContext });
    get().resetIdle();
    
    if (state === 'HOME' && get().voiceAssist) {
      get().speak(dictionary[get().language].welcome_msg);
    }
  },

  // 4. Modal Overlay Actions
  openModal: (modalName) => {
    set({ activeModal: modalName });
    get().resetIdle();

    if (get().voiceAssist) {
      // Speak corresponding modal header instructions
      setTimeout(() => {
        let textToRead = "";
        const lang = get().language;
        if (modalName === 'print') {
          textToRead = dictionary[lang].print_modal_title + ". " + dictionary[lang].upload_file_desc;
        } else if (modalName === 'receipt') {
          textToRead = dictionary[lang].receipt_modal_title + ". कृपया प्रमाण-पत्र विवरण दर्ज करें।";
        }
        if (textToRead) get().speak(textToRead);
      }, 300);
    }
  },

  closeModal: () => {
    set({ activeModal: null, errorMessage: '' });
    window.speechSynthesis.cancel();
    get().resetIdle();
  },

  triggerError: (msg) => {
    set({ activeModal: 'error', errorMessage: msg });
    get().resetIdle();
    
    if (get().voiceAssist) {
      get().speak(msg);
    }
  },

  // 5. Inactivity Idle Sessions Manager
  tickIdle: () => {
    // Only increment inactivity counters when NOT in SLEEP, PAUSE, or HOLD mode
    const state = get().kioskState;
    if (state === 'SLEEP' || state === 'PAUSE' || state === 'HOLD') {
      return;
    }

    const currentIdle = get().idleSeconds;
    set({ idleSeconds: currentIdle + 1 });
  },

  resetIdle: () => {
    set({ idleSeconds: 0 });
  },

  // 6. Speech Synthesis Voice Assistant Helper
  speak: (text) => {
    if (!get().voiceAssist || !text) return;
    
    window.speechSynthesis.cancel(); // Abort previous speech ticks
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = get().language === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 0.95; // Slightly slower pacing for accessibility
    window.speechSynthesis.speak(utterance);
  }
}));
