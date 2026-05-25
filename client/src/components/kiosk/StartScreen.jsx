import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useKioskStore } from '../../store/kioskStore.js';
import { dictionary } from '../../translations/dictionary.js';

export default function StartScreen() {
  const { language, setKioskState, kioskState } = useKioskStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (kioskState !== 'SLEEP') return null;

  const handleStart = () => {
    // Transition to active HOME screen state
    setKioskState('HOME');
    // Always reset to Language Selection for fresh citizen session
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleStart}
      className="fixed inset-0 bg-black/85 z-[9999] flex flex-col justify-center items-center text-white cursor-pointer select-none backdrop-blur-md"
    >
      <div className="flex flex-col items-center max-w-2xl px-6 text-center gap-6">
        
        {/* Tri-color Pulse Badge */}
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-navy"
        >
          <span className="text-3xl">🏛️</span>
        </motion.div>

        {/* Hindi Tap instruction */}
        <h1 className="font-hindi text-4xl font-bold tracking-normal leading-relaxed m-0 text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
          {dictionary[language].tap_to_start_hi}
        </h1>

        {/* English Tap instruction */}
        <h2 className="font-bebas text-3xl font-bold tracking-[0.1em] text-saffron m-0 leading-none">
          {dictionary[language].tap_to_start_en}
        </h2>
        
        {/* Subtle tapping pulse hint */}
        <motion.p 
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="text-sm font-semibold tracking-widest text-slate-400 uppercase mt-4"
        >
          {language === 'hi' ? "टैप करें / Tap Here" : "Touch anywhere to begin"}
        </motion.p>
      </div>
    </motion.div>
  );
}
