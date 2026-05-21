import React from 'react';
import { motion } from 'framer-motion';
import { useKioskStore } from '../../store/kioskStore.js';

export default function ServiceCard({ title, description, color, svgPath, onClick }) {
  const { voiceAssist, speak } = useKioskStore();

  // 1. Establish color palettes matching municipal themes
  const colorSchemes = {
    saffron: 'bg-gradient-to-br from-saffron to-saffron-dark shadow-orange-500/10 active:shadow-orange-500/30 hover:shadow-[0_15px_35px_rgba(211,84,0,0.3)]',
    blue: 'bg-gradient-to-br from-blue-custom to-blue-custom-dark shadow-blue-500/10 active:shadow-blue-500/30 hover:shadow-[0_15px_35px_rgba(31,97,141,0.3)]',
    green: 'bg-gradient-to-br from-green-custom to-green-custom-dark shadow-green-500/10 active:shadow-green-500/30 hover:shadow-[0_15px_35px_rgba(30,132,73,0.3)]',
    purple: 'bg-gradient-to-br from-purple-custom to-purple-custom-dark shadow-purple-500/10 active:shadow-purple-500/30 hover:shadow-[0_15px_35px_rgba(142,68,173,0.3)]',
    red: 'bg-gradient-to-br from-red-600 to-red-800 shadow-red-500/10 active:shadow-red-500/30 hover:shadow-[0_15px_35px_rgba(220,38,38,0.3)]',
    black: 'bg-gradient-to-br from-slate-700 to-slate-900 shadow-slate-500/10 active:shadow-slate-500/30 hover:shadow-[0_15px_35px_rgba(15,23,42,0.3)]',
  };

  // 2. Play speech description on touch hover / keyboard focus
  const handleTTS = () => {
    if (voiceAssist) {
      // Strip HTML br tags for clean speech synthesis reading
      const cleanTitle = title.replace(/<br\s*\/?>/gi, ' ');
      speak(`${cleanTitle}. ${description}`);
    }
  };

  return (
    <motion.button
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.97, y: 2 }}
      onMouseEnter={handleTTS}
      onFocus={handleTTS}
      onClick={onClick}
      className={`relative flex-1 min-w-[280px] max-w-full min-h-[180px] rounded-[20px] border-none cursor-pointer flex flex-col items-center justify-center py-4 px-5 text-white overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)] transition-all outline-none z-10 ${colorSchemes[color] || colorSchemes.saffron}`}
    >
      {/* Glossy radial overlay glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent -rotate-12 scale-150 pointer-events-none" />

      {/* Floating circular icon housing */}
      <div className="w-[50px] h-[50px] rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center backdrop-blur-md mb-2 shrink-0">
        <svg 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-7 h-7 fill-white"
        >
          <path d={svgPath} />
        </svg>
      </div>

      {/* Card title and description */}
      <h3 
        className="font-bebas text-[1.5rem] tracking-[0.1em] text-center m-0 leading-[1.1] drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)] uppercase"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      
      <p className="text-[0.85rem] tracking-[0.05em] text-white/90 text-center mt-2 leading-[1.3] max-w-[220px] font-medium">
        {description}
      </p>
    </motion.button>
  );
}
