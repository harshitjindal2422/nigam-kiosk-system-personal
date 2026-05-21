import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useKioskStore } from '../../store/kioskStore.js';

export default function ModalOverlay({ isOpen, onClose, title, children, maxWidth = 'max-w-xl' }) {
  const { highContrast } = useKioskStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center select-none">
          {/* 1. Backdrop blur click reset */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-[4px] z-10"
          />

          {/* 2. Slide-up Modal Panel Container */}
          <motion.div
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className={`relative w-[90%] ${maxWidth} bg-white rounded-3xl p-8 shadow-[0_20px_40px_rgba(0,0,0,0.25)] border border-slate-100 z-20 flex flex-col gap-6 high-contrast:border-3 high-contrast:border-yellow-400`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 high-contrast:border-yellow-400">
              <h2 className="font-hindi text-2xl font-bold text-navy m-0">
                {title}
              </h2>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 active:bg-slate-100 cursor-pointer active:scale-95 transition-transform"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Modal content body */}
            <div className="flex-1 overflow-y-auto max-h-[70vh] pr-2">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
