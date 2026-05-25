import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useKioskStore } from '../store/kioskStore.js';
import ServiceCard from '../components/kiosk/ServiceCard.jsx';

export default function Home() {
  const { language } = useKioskStore();
  const navigate = useNavigate();

  const handlePrintCert = () => {
    navigate('/print');
  };

  const handleCorrectionToken = () => {
    navigate('/correction');
  };

  return (
    <div className="w-full flex-1 max-w-[1000px] mx-auto flex flex-col items-center justify-center p-4">

      {/* 🧩 2 Service Blocks Grid Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 w-full px-6 md:px-12 h-[clamp(220px,35vh,320px)]">
        {/* Block 1 — Print Certificate */}
        <ServiceCard
          title={language === 'hi' ? 'प्रमाणपत्र प्रिंट करवाएं' : 'Print Certificate'}
          description={language === 'hi' ? 'पहचान पोर्टल से डाउनलोड कर यहाँ प्रिंट करें' : 'Download from Pehchan Portal and Print here'}
          color="saffron"
          svgPath="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM12 17l-4-4 1.41-1.41L12 14.17l6.59-6.58L20 9l-8 8z"
          onClick={handlePrintCert}
        />

        {/* Block 2 — Certificate Correction */}
        <ServiceCard
          title={language === 'hi' ? 'प्रमाणपत्र सुधारें' : 'Correct Certificate'}
          description={language === 'hi' ? 'नाम, पता या तिथि में संशोधन के लिए आवेदन करें' : 'Apply for correction in name, address, or date'}
          color="blue"
          svgPath="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"
          onClick={handleCorrectionToken}
        />
      </div>

    </div>
  );
}
