import React, { useState, useEffect, useRef } from 'react';
import { useKioskStore } from '../../store/kioskStore.js';
import { dictionary } from '../../translations/dictionary.js';

export default function Accessibility() {
  const { 
    language, 
    voiceAssist, 
    highContrast, 
    largeText, 
    toggleA11y, 
    resetIdle, 
    speak 
  } = useKioskStore();

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // 1. Reset idle timer whenever user opens the menu
  const toggleMenu = () => {
    resetIdle();
    setIsOpen(!isOpen);
    
    if (voiceAssist && !isOpen) {
      speak(dictionary[language].a11y_title);
    }
  };

  // 2. Clear settings menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isOpen && menuRef.current && !menuRef.current.contains(e.target) && !e.target.closest('.a11y-fab')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isOpen]);

  // 3. Inject high-contrast / large-text classes on the HTML body element
  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  useEffect(() => {
    if (largeText) {
      document.body.classList.add('large-text');
    } else {
      document.body.classList.remove('large-text');
    }
  }, [largeText]);

  return (
    <div className="relative select-none z-50">
      
      {/* 🚀 1. Accessibility FAB Overlay Button */}
      <button
        onClick={toggleMenu}
        className="a11y-fab fixed bottom-[80px] right-[30px] w-[60px] h-[60px] rounded-full bg-blue-custom text-white text-3xl font-bold flex items-center justify-center cursor-pointer shadow-[0_4px_15px_rgba(0,0,0,0.3)] border-3 border-white active:scale-90 transition-transform active:bg-blue-custom-dark z-50"
        title="दिव्यांगजन सुविधा (Accessibility)"
      >
        ♿
      </button>

      {/* 📋 2. Accessibility Options panel */}
      {isOpen && (
        <div
          ref={menuRef}
          className="fixed bottom-[150px] right-[30px] bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.2)] p-5 w-[280px] flex flex-col gap-4 border-2 border-navy animate-fade-in z-50"
        >
          <h3 className="text-xl font-bold font-hindi text-navy text-center border-b pb-2 mb-1">
            {dictionary[language].a11y_title}
          </h3>

          {/* Voice Assistant Toggle */}
          <div className="flex items-center justify-between font-bold text-lg text-slate-700">
            <span>{dictionary[language].a11y_voice}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={voiceAssist} 
                onChange={() => toggleA11y('voiceAssist')}
                className="sr-only peer" 
              />
              <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-custom" />
            </label>
          </div>

          {/* High Contrast Toggle */}
          <div className="flex items-center justify-between font-bold text-lg text-slate-700">
            <span>{dictionary[language].a11y_contrast}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={highContrast} 
                onChange={() => toggleA11y('highContrast')}
                className="sr-only peer" 
              />
              <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-custom" />
            </label>
          </div>

          {/* Large Text Toggle */}
          <div className="flex items-center justify-between font-bold text-lg text-slate-700">
            <span>{dictionary[language].a11y_text}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={largeText} 
                onChange={() => toggleA11y('largeText')}
                className="sr-only peer" 
              />
              <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-custom" />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
