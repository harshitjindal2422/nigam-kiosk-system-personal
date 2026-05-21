import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useKioskStore } from '../store/kioskStore.js';

import Header from '../components/common/Header.jsx';
import Footer from '../components/common/Footer.jsx';
import Accessibility from '../components/common/Accessibility.jsx';
import StartScreen from '../components/kiosk/StartScreen.jsx';
import IdleOverlay from '../components/overlays/IdleOverlay.jsx';
import ErrorModal from '../components/overlays/ErrorModal.jsx';
import PauseOverlay from '../components/overlays/PauseOverlay.jsx';
import PrintModal from '../components/overlays/PrintModal.jsx';

export default function KioskLayout() {
  const { tickIdle, resetIdle, kioskState } = useKioskStore();

  // 1. Establish inactivity session tracking ticks
  useEffect(() => {
    // Tick inactivity timer every second
    const interval = setInterval(() => {
      tickIdle();
    }, 1000);

    return () => clearInterval(interval);
  }, [tickIdle]);

  // 2. Attach screen action listeners to auto-reset idle intervals
  useEffect(() => {
    const handleUserActivity = () => {
      // Only reset idle timer if the citizen is actively engaged
      if (kioskState !== 'SLEEP') {
        resetIdle();
      }
    };

    const events = ['touchstart', 'mousemove', 'mousedown', 'keydown'];
    
    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [resetIdle, kioskState]);

  return (
    <div className="relative w-screen h-screen flex flex-col justify-between overflow-hidden select-none bg-slate-50">
      {/* 🇨🇮 Visual Brand Bands */}
      <div className="header-top-band" />
      <div className="bg-pattern" />

      {/* 🏢 Global Header (Branding & Translation) */}
      <Header />

      {/* 📱 Central Touch Area */}
      <main className="relative flex-1 w-full flex items-center justify-center py-[10px] px-10 z-10 overflow-hidden">
        <Outlet />
      </main>

      {/* 📞 Global Footer (Helplines & Timer Track) */}
      <Footer />

      {/* ♿ Divyangjan Accessibility FAB Widgets */}
      <Accessibility />

      {/* 🛡️ Inactivity & Session Overlays */}
      <StartScreen />
      <IdleOverlay />
      <ErrorModal />
      <PauseOverlay />
      <PrintModal />
    </div>
  );
}
