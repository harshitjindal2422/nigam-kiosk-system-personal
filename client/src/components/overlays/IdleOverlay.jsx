import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKioskStore } from '../../store/kioskStore.js';
import { dictionary } from '../../translations/dictionary.js';

export default function IdleOverlay() {
  const { 
    language, 
    idleSeconds, 
    maxIdleSeconds, 
    warningSeconds, 
    resetIdle, 
    setKioskState, 
    voiceAssist,
    speak 
  } = useKioskStore();

  // 1. Calculate remaining seconds
  const remaining = maxIdleSeconds - idleSeconds;
  
  // 2. Check if warning threshold is active
  const showWarning = remaining > 0 && remaining <= warningSeconds;

  // 3. Play voice assistant alert once when countdown triggers
  useEffect(() => {
    if (showWarning && remaining === warningSeconds && voiceAssist) {
      const msg = language === 'hi' 
        ? 'निष्क्रियता के कारण सत्र समाप्त हो रहा है। स्क्रीन पर टैप करें।' 
        : 'Session is ending due to inactivity. Tap the screen to continue.';
      speak(msg);
    }
    
    // Automatically trigger page reload/reset when countdown hits 0
    if (idleSeconds >= maxIdleSeconds) {
      window.speechSynthesis.cancel();
      // Reload page to reset states securely
      window.location.reload();
    }
  }, [showWarning, remaining, idleSeconds]);

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={resetIdle}
          className="fixed inset-0 bg-white/95 z-[999] flex flex-col items-center justify-center gap-5 select-none backdrop-blur-sm cursor-pointer"
        >
          {/* Tri-color tricolor ring progress indicator */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-saffron via-white to-green-custom" />
          
          <h2 className="font-hindi text-4xl font-bold text-navy m-0">
            {dictionary[language].reset_msg_hi}
          </h2>
          
          <span className="font-bebas text-3xl tracking-widest text-saffron-dark leading-none">
            {dictionary[language].reset_msg_en}
          </span>
          
          {/* Pulsing countdown timer */}
          <motion.div
            key={remaining}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [1, 1.2, 1], opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="font-bebas text-9xl font-bold text-navy leading-none mt-2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.1)]"
          >
            {remaining}
          </motion.div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              resetIdle();
            }}
            className="mt-6 px-10 py-3 bg-green-custom text-white font-bold text-xl rounded-2xl shadow-lg active:scale-95 transition-transform font-rajdhani cursor-pointer"
          >
            {language === 'hi' ? "सत्र जारी रखें" : "Keep Session Active"}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
