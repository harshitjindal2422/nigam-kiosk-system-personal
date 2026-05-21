import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useKioskStore } from '../../store/kioskStore.js';
import { dictionary } from '../../translations/dictionary.js';

export default function Header() {
  const { language, setLanguage, kioskState } = useKioskStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLangToggle = () => {
    setLanguage(language === 'hi' ? 'en' : 'hi');
  };

  return (
    <header className="relative w-full py-4 px-10 flex items-center justify-center bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] z-40 select-none">
      
      {/* 0. Global Back Button (Floating Top-Left) */}
      {location.pathname !== '/' && (
        <div className="absolute left-10 top-1/2 -translate-y-1/2">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold font-rajdhani rounded-2xl shadow-[0_4px_6px_rgba(0,0,0,0.1)] active:scale-95 cursor-pointer transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-6 h-6" />
            <span className="text-xl tracking-wider uppercase">{language === 'hi' ? 'वापस जाएं' : 'Back'}</span>
          </button>
        </div>
      )}
      
      {/* Top Right Actions Container */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-4 z-50">
        <button
          onClick={handleLangToggle}
          className="px-6 py-2 bg-navy text-white text-lg font-bold font-rajdhani rounded-full shadow-[0_4px_6px_rgba(0,0,0,0.1)] active:scale-95 cursor-pointer transition-transform shrink-0"
        >
          {dictionary[language].lang_btn_text}
        </button>
        <div id="header-action-portal"></div>
      </div>

      {/* 2. Brand Identity & Emblem */}
      <div className="flex flex-col items-center gap-1">
        {/* Emblem Image */}
        <div className="w-16 h-16 mb-1 flex items-center justify-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
          <img 
            src="/assets/nigam-logo.png" 
            alt="Nagar Nigam Logo" 
            className="w-full h-full object-contain filter invert-0 high-contrast:invert-[1]"
          />
        </div>

        {/* Bilingual Titles */}
        <h1 className="font-hindi font-bold text-2xl text-navy tracking-normal m-0 leading-none">
          {dictionary[language].org_name_hi}
        </h1>
        
        <h2 className="font-bebas text-3xl tracking-[0.15em] text-saffron-dark m-0 mt-0.5 leading-none">
          {dictionary[language].org_name_en}
        </h2>
        
        <p className="text-sm font-semibold tracking-wider text-slate-500 uppercase m-0 leading-none mt-1">
          {dictionary[language].org_subtitle}
        </p>
      </div>
      
    </header>
  );
}
