import React, { useEffect } from 'react';
import { useKioskStore } from '../store/kioskStore.js';
import ServiceCard from '../components/kiosk/ServiceCard.jsx';

import { useSearchParams } from 'react-router-dom';

export default function PrintSelection() {
  const { language, setKioskState, speak, voiceAssist } = useKioskStore();
  const [searchParams] = useSearchParams();
  const block = searchParams.get('block') || 'birth';

  useEffect(() => {
    if (voiceAssist) {
      speak(language === 'hi' 
        ? 'कृपया प्रमाण-पत्र प्रिंट या पंजीकरण खोज का विकल्प चुनें।' 
        : 'Please select Print Documents or Search Registration option.');
    }
    setKioskState('ACTIVE');
  }, [language, voiceAssist, speak, setKioskState]);

  // Block 1: Pehchan Certificate Download & Print (exact original handler)
  const handlePrintDocuments = () => {
    setKioskState('PAUSE', 'BLOCK_1');
    localStorage.setItem('kiosk_active_block', block);
    window.open(
      'https://pehchan.rajasthan.gov.in/ECertificate.aspx',
      '_blank'
    );
  };

  // Block 2: Registration Search on Pehchan Portal (exact original handler)
  const handleSearchPortal = () => {
    setKioskState('PAUSE', 'BLOCK_2');
    localStorage.setItem('kiosk_active_block', block);
    window.open(
      'https://pehchan.rajasthan.gov.in/VerifyRegisNum.aspx?PehRed=MmRkYzZkZWY=OGRlYjRmY2NlZWQwOTcwZGJmOGZjMWE=',
      '_blank'
    );
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto flex flex-col items-center justify-center">
      <h2 className="font-hindi text-4xl text-navy font-bold mb-10 text-center drop-shadow-sm">
        {language === 'hi' ? 'प्रमाण-पत्र सेवा चुनें' : 'Select Certificate Service'}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full px-10">
        {/* Option 1 — Print Documents */}
        <ServiceCard
          title={language === 'hi' ? 'दस्तावेज़ प्रिंट करें' : 'Print Documents'}
          description={language === 'hi' ? 'पहचान पोर्टल से डाउनलोड कर यहाँ प्रिंट करें' : 'Download from Pehchan Portal and Print here'}
          color="saffron"
          svgPath="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM12 17l-4-4 1.41-1.41L12 14.17l6.59-6.58L20 9l-8 8z"
          onClick={handlePrintDocuments}
        />

        {/* Option 2 — Search in Pehchan Portal */}
        <ServiceCard
          title={language === 'hi' ? 'पहचान पोर्टल में खोजें और प्रिंट करें..' : 'Search in Pehchan Portal and Print..'}
          description={language === 'hi' ? 'पहचान पोर्टल से खोज व डाउनलोड कर यहाँ प्रिंट करें' : 'Search and download from Pehchan Portal and Print here'}
          color="purple"
          svgPath="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
          onClick={handleSearchPortal}
        />
      </div>
    </div>
  );
}
