import React from 'react';
import { useKioskStore } from '../../store/kioskStore.js';
import { dictionary } from '../../translations/dictionary.js';

export default function Footer() {
  const { language, idleSeconds, maxIdleSeconds, kioskState } = useKioskStore();

  // 1. Calculate progress percentage
  const pct = Math.max(0, 100 - (idleSeconds / maxIdleSeconds) * 100);

  // 2. Determine progress bar color based on remaining time
  let barColor = 'bg-green-custom';
  if (pct < 25) {
    barColor = 'bg-saffron-dark';
  } else if (pct < 50) {
    barColor = 'bg-saffron';
  }

  // 3. Hide inactivity countdown when in pause/hold/sleep states
  const showCountdown = kioskState !== 'SLEEP' && kioskState !== 'PAUSE' && kioskState !== 'HOLD';

  return (
    <footer className="w-full py-4 px-10 flex items-center justify-between bg-navy text-white shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-40 select-none">
      {/* Help Desk number */}
      <span className="text-sm font-semibold tracking-wider font-rajdhani">
        {dictionary[language].help_support}
      </span>

      {/* Inactivity Auto Reset Countdown Progress Bar */}
      {showCountdown && (
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-bold tracking-[0.1em] text-slate-300 uppercase">
            {dictionary[language].auto_reset}
          </span>
          <div className="w-[120px] h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div 
              className={`h-full ${barColor} rounded-full transition-all duration-1000 ease-linear`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </footer>
  );
}
