import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useKioskStore } from '../store/kioskStore.js';
import { dictionary } from '../translations/dictionary.js';
import ServiceCard from '../components/kiosk/ServiceCard.jsx';

export default function Home() {
  const { language, openModal, setKioskState } = useKioskStore();
  const navigate = useNavigate();

  // 1. Block 1: Mock Pehchan Certificate Download & Print Modal
  const handlePrintCert = () => {
    setKioskState('PAUSE', 'BLOCK_1');
    // Open portal in new tab for manual download
    window.open(
      'https://pehchan.rajasthan.gov.in/ECertificate.aspx',
      '_blank'
    );
  };

  // 2. Block 2: Redirection to Search Registration portal
  const handleSearchReg = () => {
    setKioskState('PAUSE', 'BLOCK_2');
    // Open registry verify search in new tab
    window.open(
      'https://pehchan.rajasthan.gov.in/VerifyRegisNum.aspx?PehRed=MmRkYzZkZWY=OGRlYjRmY2NlZWQwOTcwZGJmOGZjMWE=',
      '_blank'
    );
  };

  // 3. Block 3: Generate Token for Counter Correction
  const handleCorrectionToken = () => {
    navigate('/correction');
  };

  // 4. Block 4: Pehchan Online Correction Redirection
  const handleOnlineCorrection = () => {
    setKioskState('PAUSE', 'BLOCK_4');
    // Open correction edit portal in new tab
    window.open(
      'https://pehchan.rajasthan.gov.in/ECertificate.aspx?Event=&RegistrationNumber=&Year=&MobileNumber=&WABOT=1',
      '_blank'
    );
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto flex flex-col items-center justify-center">

      {/* 🧩 4 Service Blocks Grid Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full px-10">
        {/* Block 1 — Print Certificate */}
        <ServiceCard
          title={dictionary[language].btn1_title}
          description={dictionary[language].btn1_desc}
          color="saffron"
          svgPath="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM12 17l-4-4 1.41-1.41L12 14.17l6.59-6.58L20 9l-8 8z"
          onClick={handlePrintCert}
        />

        {/* Block 2 — Search Registration */}
        <ServiceCard
          title={dictionary[language].btn4_title}
          description={dictionary[language].btn4_desc}
          color="purple"
          svgPath="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
          onClick={handleSearchReg}
        />

        {/* Block 3 — Counter Correction Token */}
        <ServiceCard
          title={dictionary[language].btn3_title}
          description={dictionary[language].btn3_desc}
          color="green"
          svgPath="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z"
          onClick={handleCorrectionToken}
        />

        {/* Block 4 — Certificate Correction */}
        <ServiceCard
          title={dictionary[language].btn2_title}
          description={dictionary[language].btn2_desc}
          color="blue"
          svgPath="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
          onClick={handleOnlineCorrection}
        />
      </div>

    </div>
  );
}
