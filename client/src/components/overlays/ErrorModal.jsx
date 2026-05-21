import React from 'react';
import { useKioskStore } from '../../store/kioskStore.js';
import { dictionary } from '../../translations/dictionary.js';
import ModalOverlay from './ModalOverlay.jsx';

export default function ErrorModal() {
  const { activeModal, errorMessage, closeModal, language } = useKioskStore();

  const isOpen = activeModal === 'error';

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={closeModal}
      title={dictionary[language].error_title}
      maxWidth="max-w-md"
    >
      <div className="flex flex-col items-center text-center gap-6 py-4">
        {/* Pulsing warning badge */}
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-3xl font-bold border-2 border-red-500 animate-pulse">
          ⚠️
        </div>

        {/* Dynamic error explanation text */}
        <p className="text-xl font-bold text-slate-800 m-0 tracking-wide">
          {errorMessage}
        </p>

        {/* Close confirmation button */}
        <button
          onClick={closeModal}
          className="mt-2 w-full py-3 bg-slate-300 text-slate-800 hover:bg-slate-400 font-bold text-lg rounded-2xl active:scale-95 transition-transform font-rajdhani cursor-pointer"
        >
          {dictionary[language].close_btn}
        </button>
      </div>
    </ModalOverlay>
  );
}
