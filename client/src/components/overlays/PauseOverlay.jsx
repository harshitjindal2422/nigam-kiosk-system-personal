import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ExternalLink, ArrowLeft, AlertCircle } from 'lucide-react';
import { useKioskStore } from '../../store/kioskStore.js';
import { dictionary } from '../../translations/dictionary.js';

export default function PauseOverlay() {
  const { 
    language, 
    kioskState, 
    setKioskState, 
    pauseContext,
    voiceAssist, 
    speak 
  } = useKioskStore();

  const isPaused = kioskState === 'PAUSE';

  // 120-second countdown for PAUSE state inactivity reset
  const [secondsLeft, setSecondsLeft] = useState(120);

  // Trigger TTS voice guide once when pause mode initializes
  useEffect(() => {
    if (isPaused) {
      setSecondsLeft(120); // reset countdown
      if (voiceAssist) {
        const msg = language === 'hi'
          ? (pauseContext === 'BLOCK_1' 
              ? 'प्रमाणपत्र डाउनलोड पोर्टल एक नई विंडो में खोल दिया गया है। अपना प्रमाणपत्र डाउनलोड करने के बाद कृपया इस स्क्रीन पर वापस आएं और प्रिंट के लिए आगे बढ़ें।' 
              : 'पंजीकरण खोज व डाउनलोड पोर्टल एक नई विंडो में खोल दिया गया है। अपना प्रमाणपत्र खोजने और डाउनलोड करने के बाद कृपया इस स्क्रीन पर वापस आएं और प्रिंट के लिए आगे बढ़ें।')
          : (pauseContext === 'BLOCK_1' 
              ? 'The certificate download portal has been opened in a new window. Please download your certificate and return to this screen to proceed with printing.' 
              : 'The registration search and download portal has been opened in a new window. Please find and download your certificate, then return to this screen to proceed with printing.');
        speak(msg);
      }
    }
  }, [isPaused, language, voiceAssist, pauseContext]);

  // Inactivity countdown handler
  useEffect(() => {
    if (!isPaused) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.speechSynthesis.cancel();
          // Safe privacy reset to Sleep mode when countdown expires
          setKioskState('SLEEP');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, setKioskState]);

  const handleReturn = () => {
    window.speechSynthesis.cancel();
    if (pauseContext === 'BLOCK_1' || pauseContext === 'BLOCK_2') {
      setKioskState('ACTIVE', pauseContext);
      useKioskStore.getState().openModal('print');
    } else {
      setKioskState('HOME');
    }
  };

  return (
    <AnimatePresence>
      {isPaused && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/98 z-[999] flex flex-col items-center justify-center p-8 select-none backdrop-blur-md"
        >
          {/* Top Tricolor Brand Accent Line */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-saffron via-white to-green-custom" />

          <div className="max-w-2xl w-full flex flex-col items-center gap-8 text-center text-white">
            
            {/* Soft Glowing Portal Radar Animation */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <motion.div 
                animate={{ scale: [1, 1.4, 1], opacity: [0.15, 0.4, 0.15] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute inset-0 bg-saffron rounded-full filter blur-xl"
              />
              <motion.div 
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="w-24 h-24 bg-navy rounded-full flex items-center justify-center border-4 border-saffron shadow-lg"
              >
                <Search className="w-10 h-10 text-saffron" />
              </motion.div>
            </div>

            {/* Title Details */}
            <div className="flex flex-col gap-2">
              <h2 className="font-hindi text-4xl font-bold leading-tight text-white m-0">
                {language === 'hi' 
                  ? (pauseContext === 'BLOCK_1' ? 'प्रमाणपत्र डाउनलोड पोर्टल सक्रिय है' : 'खोज व प्रिंट पोर्टल सक्रिय है')
                  : (pauseContext === 'BLOCK_1' ? 'Download Portal Window Active' : 'Search & Print Portal Active')}
              </h2>
              <span className="font-bebas text-2xl tracking-widest text-saffron mt-1">
                {pauseContext === 'BLOCK_1' ? 'pehchan certificate download' : 'pehchan certificate search & print'}
              </span>
            </div>

            {/* Instruction description card */}
            <p className="text-xl text-slate-300 font-semibold font-rajdhani leading-snug m-0 px-4">
              {language === 'hi'
                ? (pauseContext === 'BLOCK_1'
                    ? 'कियोस्क ब्राउज़र में राजस्थान पहचान प्रमाणपत्र डाउनलोड पोर्टल खोल दिया गया है। कृपया अपना प्रमाणपत्र डाउनलोड करें और प्रिंट करने के लिए कियोस्क पर लौटने के लिए नीचे दिए गए बटन पर टैप करें।'
                    : 'कियोस्क ब्राउज़र में राजस्थान पहचान पंजीकरण खोज व डाउनलोड पोर्टल खोल दिया गया है। कृपया वहां अपना प्रमाणपत्र खोजकर डाउनलोड करें, फिर मुख्य कियोस्क पर लौटने और प्रिंट करने के लिए नीचे दिए गए बटन पर टैप करें।')
                : (pauseContext === 'BLOCK_1'
                    ? 'The Rajasthan Pehchan Certificate Download portal is currently active in another window. Please download your certificate there, then close the tab and tap the button below to resume the kiosk and print.'
                    : 'The Rajasthan Pehchan Registration Search and Download portal is currently active in another window. Please search and download your certificate there, then close the tab and tap the button below to resume the kiosk and print.')}
            </p>

            {/* Visual Time Progress Indicator */}
            <div className="w-full max-w-md bg-slate-800 border border-slate-700/50 rounded-2xl p-5 flex flex-col gap-3 items-center">
              <div className="flex items-center gap-2 text-slate-400 font-bold font-rajdhani text-sm uppercase">
                <AlertCircle className="w-5 h-5 text-saffron" />
                <span>
                  {language === 'hi' 
                    ? `निष्क्रियता रीसेट: ${secondsLeft} सेकंड में` 
                    : `Inactivity auto-reset in: ${secondsLeft}s`}
                </span>
              </div>
              
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: '100%' }}
                  animate={{ width: `${(secondsLeft / 120) * 100}%` }}
                  transition={{ duration: 1, ease: 'linear' }}
                  className="h-full bg-gradient-to-r from-saffron to-emerald-500"
                />
              </div>
            </div>

            {/* Return Kiosk Button CTA */}
            <button
              onClick={handleReturn}
              className="mt-4 px-12 py-5 bg-green-custom hover:bg-emerald-600 text-white text-2xl font-bold font-rajdhani rounded-2xl flex items-center justify-center gap-3 border-2 border-emerald-400 cursor-pointer active:scale-95 transition-all shadow-lg"
            >
              <ArrowLeft className="w-6 h-6" />
              <span>
                {language === 'hi' 
                  ? (pauseContext === 'BLOCK_1' || pauseContext === 'BLOCK_2' ? 'प्रिंट करने के लिए आगे बढ़ें' : 'कियोस्क पर वापस लौटें') 
                  : (pauseContext === 'BLOCK_1' || pauseContext === 'BLOCK_2' ? 'Proceed to Print Document' : 'Resume Kiosk System')}
              </span>
            </button>
            
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
