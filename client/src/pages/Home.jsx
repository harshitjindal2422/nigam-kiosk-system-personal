import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKioskStore } from '../store/kioskStore.js';
import { dictionary } from '../translations/dictionary.js';
import ServiceCard from '../components/kiosk/ServiceCard.jsx';

export default function Home() {
  const { language, setKioskState, speak, voiceAssist } = useKioskStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Announce home navigation in voice assistant
    if (voiceAssist) {
      speak(dictionary[language].welcome_msg);
    }
    setKioskState('ACTIVE');
  }, [language, voiceAssist, speak, setKioskState]);

  const handleSelectBlock = (blockName) => {
    navigate(`/services?block=${blockName}`);
  };

  return (
    <div className="w-full flex-1 max-w-[1200px] mx-auto flex flex-col items-center justify-center p-4 gap-8">
      
      {/* Page Header Header */}
      <div className="text-center flex flex-col gap-2 mb-4">
        <h2 className="font-hindi text-4xl text-navy font-bold m-0 drop-shadow-sm">
          {language === 'hi' ? 'कियोस्क नागरिक सेवा चयन' : 'Kiosk Citizen Services'}
        </h2>
        <span className="font-bebas text-2xl tracking-widest text-saffron-dark uppercase">
          Select Department Block
        </span>
      </div>

      {/* 🧩 3 Service Blocks Grid Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 w-full px-4 md:px-8">
        
        {/* Block 1 — Birth Certificate */}
        <ServiceCard
          title={dictionary[language].block_birth_title}
          description={dictionary[language].block_birth_desc}
          color="saffron"
          // Footprints / Cradle SVG
          svgPath="M12 6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm10 5h-4.2l-2.4-4.8C15.12 5.44 14.34 5 13.5 5H6v2h6.75l2 4H5c-1.66 0-3 1.34-3 3v2h20v-2c0-1.66-1.34-3-3-3z"
          onClick={() => handleSelectBlock('birth')}
        />

        {/* Block 2 — Death Certificate */}
        <ServiceCard
          title={dictionary[language].block_death_title}
          description={dictionary[language].block_death_desc}
          color="blue"
          // Candle SVG
          svgPath="M12 2c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1s1-.45 1-1V3c0-.55-.45-1-1-1zm6 8H6c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2zm-6 10c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"
          onClick={() => handleSelectBlock('death')}
        />

        {/* Block 3 — Marriage Certificate */}
        <ServiceCard
          title={dictionary[language].block_marriage_title}
          description={dictionary[language].block_marriage_desc}
          color="purple"
          // Heart SVG
          svgPath="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          onClick={() => handleSelectBlock('marriage')}
        />

      </div>

    </div>
  );
}
