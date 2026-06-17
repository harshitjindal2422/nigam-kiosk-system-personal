import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useKioskStore } from '../store/kioskStore.js';

export default function LanguageSelection() {
  const { setLanguage } = useKioskStore();
  const navigate = useNavigate();
  
  const handleLanguageSelect = (lang) => {
    setLanguage(lang); // Persist to store + localStorage via existing action
    navigate('/home');
  };

  return (
    <div className="w-full max-w-[800px] mx-auto flex flex-col items-center justify-center gap-10">
      
      <div className="flex flex-col items-center text-center gap-4">
        <h1 className="font-hindi text-5xl font-bold text-navy drop-shadow-sm m-0">
          भाषा चुनें
        </h1>
        <h2 className="font-bebas text-4xl tracking-widest text-saffron-dark m-0">
          CHOOSE LANGUAGE
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full px-10">
        <button 
          onClick={() => handleLanguageSelect('hi')}
          className="flex flex-col items-center justify-center p-8 rounded-3xl border-4 border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all duration-300 shadow-lg cursor-pointer active:scale-95"
        >
          <span className="font-hindi text-6xl font-bold text-navy mb-2">हिंदी</span>
          <span className="font-bebas text-2xl text-slate-500 tracking-wider">HINDI</span>
        </button>

        <button 
          onClick={() => handleLanguageSelect('en')}
          className="flex flex-col items-center justify-center p-8 rounded-3xl border-4 border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 transition-all duration-300 shadow-lg cursor-pointer active:scale-95"
        >
          <span className="font-bebas text-6xl font-bold text-navy mb-2 tracking-widest">ENGLISH</span>
          <span className="font-hindi text-2xl text-slate-500">अंग्रेज़ी</span>
        </button>
      </div>

    </div>
  );
}
