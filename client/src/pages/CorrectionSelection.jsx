import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKioskStore } from '../store/kioskStore.js';
import ServiceCard from '../components/kiosk/ServiceCard.jsx';

export default function CorrectionSelection() {
  const { language, setKioskState, speak, voiceAssist } = useKioskStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (voiceAssist) {
      speak(language === 'hi' 
        ? 'सुधार के लिए कृपया जन्म या मृत्यु प्रमाण-पत्र चुनें।' 
        : 'Please select Birth or Death certificate for correction.');
    }
    setKioskState('ACTIVE');
  }, [language, voiceAssist, speak, setKioskState]);

  return (
    <div className="w-full max-w-[1000px] mx-auto flex flex-col items-center justify-center">
      <h2 className="font-hindi text-4xl text-navy font-bold mb-10 text-center drop-shadow-sm">
        {language === 'hi' ? 'सुधार के लिए प्रमाण-पत्र चुनें' : 'Select Certificate for Correction'}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full px-10">
        {/* Block 1 — Birth Certificate */}
        <ServiceCard
          title={language === 'hi' ? 'जन्म प्रमाण-पत्र' : 'Birth Certificate'}
          description={language === 'hi' ? 'जन्म प्रमाण-पत्र में सुधार हेतु आवेदन करें' : 'Apply for correction in Birth Certificate'}
          color="red"
          svgPath="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
          onClick={() => navigate('/correction/birth')}
        />

        {/* Block 2 — Death Certificate */}
        <ServiceCard
          title={language === 'hi' ? 'मृत्यु प्रमाण-पत्र' : 'Death Certificate'}
          description={language === 'hi' ? 'मृत्यु प्रमाण-पत्र में सुधार हेतु आवेदन करें' : 'Apply for correction in Death Certificate'}
          color="black"
          svgPath="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
          onClick={() => navigate('/correction/death')}
        />
      </div>
    </div>
  );
}
