import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useKioskStore } from '../store/kioskStore.js';
import { useAdminStore } from '../store/adminStore.js';
import { dictionary } from '../translations/dictionary.js';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Printer, CheckCircle, ArrowRight, RefreshCw, Landmark } from 'lucide-react';

export default function TokenGeneration() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'correction'; // correction, new_registration
  const block = searchParams.get('block') || 'birth'; // birth, death, marriage

  const { language, setKioskState, speak, voiceAssist } = useKioskStore();
  const { generateToken } = useAdminStore();
  const navigate = useNavigate();

  const [tokenObj, setTokenObj] = useState(null);
  const [printInitiated, setPrintInitiated] = useState(false);

  // 1. Immediately generate token on mount
  useEffect(() => {
    const spawnedToken = generateToken(block, type);
    setTokenObj(spawnedToken);

    // Speak token announcement
    if (voiceAssist && spawnedToken) {
      const cleanToken = spawnedToken.tokenNumber.replace(/-/g, ' ');
      const departmentStr = language === 'hi'
        ? (block === 'birth' ? 'जन्म विभाग' : block === 'death' ? 'मृत्यु विभाग' : 'विवाह विभाग')
        : `${block} department`;
        
      const serviceStr = language === 'hi'
        ? (type === 'correction' ? 'संशोधन' : 'नवीन पंजीकरण')
        : (type === 'correction' ? 'correction' : 'new registration');

      const msg = language === 'hi'
        ? `आपका टोकन जनरेट हो गया है। टोकन नंबर ${cleanToken} है। कृपया रसीद प्रिंट करें और एडमिन काउंटर पर जाएँ।`
        : `Your token has been generated. Token number is ${cleanToken}. Please print your receipt and proceed to the admin counter.`;
      speak(msg);
    }

    setKioskState('ACTIVE');
  }, [block, type, generateToken, setKioskState, speak, voiceAssist, language]);

  // 2. Browser physical printing spooler hook
  useEffect(() => {
    if (printInitiated && tokenObj) {
      const handleAfterPrint = () => {
        setPrintInitiated(false);
        // Direct safe reset of kiosk session to SLEEP state
        setKioskState('SLEEP');
        navigate('/');
      };

      window.addEventListener('afterprint', handleAfterPrint, { once: true });
      
      const printTimer = setTimeout(() => {
        window.print();
      }, 500);

      return () => {
        clearTimeout(printTimer);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
  }, [printInitiated, tokenObj, navigate, setKioskState]);

  const handlePrint = () => {
    setPrintInitiated(true);
  };

  const handleSkipPrint = () => {
    setKioskState('SLEEP');
    navigate('/');
  };

  if (!tokenObj) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-slate-50 gap-4">
        <RefreshCw className="w-12 h-12 text-saffron animate-spin" />
        <p className="font-bebas text-2xl text-navy">Generating Ticket...</p>
      </div>
    );
  }

  // Formatting strings for screen display
  const blockNameDisplay = language === 'hi'
    ? (block === 'birth' ? 'जन्म प्रमाण-पत्र विभाग' : block === 'death' ? 'मृत्यु प्रमाण-पत्र विभाग' : 'विवाह प्रमाण-पत्र विभाग')
    : `${block.toUpperCase()} CERTIFICATE DEPT`;

  const serviceNameDisplay = language === 'hi'
    ? (type === 'correction' ? 'संशोधन अनुरोध (Correction)' : 'नवीन पंजीकरण (New Registration)')
    : (type === 'correction' ? 'CORRECTION REQUEST' : 'NEW REGISTRATION APPLICATION');

  return (
    <div className="w-full flex-1 max-w-[800px] mx-auto flex flex-col items-center justify-center py-2 px-4 gap-2 select-none font-rajdhani max-h-full overflow-y-auto scrollbar-none">
      
      {/* Header Info with Unified Checkmark Icon */}
      <div className="text-center flex flex-col items-center gap-1.5 mt-2">
        <div className="flex items-center justify-center gap-2">
          <CheckCircle className="w-7 h-7 text-emerald-600 shrink-0" />
          <h2 className="font-hindi text-2xl font-bold text-navy m-0 drop-shadow-sm leading-none">
            {dictionary[language].token_gen_title}
          </h2>
        </div>
      </div>

      {/* 🧾 Digital Thermal Receipt card on Screen */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-white border-2 border-slate-200 rounded-2xl py-2 px-4 shadow-lg flex flex-col gap-2.5 border-t-8 border-t-saffron relative overflow-hidden"
      >
        {/* Soft back watermark */}
        <Landmark className="absolute right-[-20px] bottom-[-20px] w-40 h-40 text-slate-100/50 pointer-events-none rotate-12" />

        {/* Digital Header */}
        <div className="text-center border-b border-dashed border-slate-200 pb-2 flex flex-col gap-0.5">
          <span className="font-bebas text-md tracking-wider text-navy uppercase leading-none">NAGAR NIGAM JAIPUR</span>
          <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest leading-none">MUNICIPAL CITIZEN TICKET</span>
        </div>

        {/* Core Token Numbers */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl py-3 px-3 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {dictionary[language].token_number_label}
          </span>
          <h1 className="text-3xl font-extrabold text-saffron-dark tracking-tighter m-0 drop-shadow-sm font-mono leading-none mt-0.5">
            {tokenObj.tokenNumber}
          </h1>
        </div>

        {/* Ticket parameters */}
        <div className="flex flex-col gap-2 font-semibold text-slate-600 border-b border-dashed border-slate-200 pb-2 text-sm">
          <div className="flex justify-between items-center">
            <span>{dictionary[language].token_block_label}:</span>
            <span className="text-navy uppercase font-bold">{blockNameDisplay}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>{dictionary[language].token_service_label}:</span>
            <span className="text-navy uppercase font-bold text-right">{serviceNameDisplay}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Date & Time:</span>
            <span className="text-slate-500 font-mono text-[13px]">
              {new Date(tokenObj.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Visual Mock Barcode */}
        <div className="flex flex-col items-center gap-1 opacity-70">
          <div className="w-full h-5 bg-gradient-to-r from-slate-900 via-transparent to-slate-900 flex justify-between">
            {Array.from({ length: 48 }).map((_, i) => (
              <div 
                key={i} 
                className="h-full bg-slate-900" 
                style={{ width: `${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2)}px` }}
              />
            ))}
          </div>
          <span className="text-[9px] font-mono tracking-widest text-slate-400">
            {tokenObj.tokenNumber.replace(/-/g, '')}
          </span>
        </div>

        {/* Ticket Instructions */}
        <p className="text-xs font-semibold text-slate-500 leading-snug m-0 text-center px-1">
          {dictionary[language].token_instructions}
        </p>

      </motion.div>

      {/* Button CTAs Side-by-Side */}
      <div className="flex gap-4 w-full max-w-md mt-1 mb-2">
        <button
          onClick={handlePrint}
          className="flex-1 py-3 px-4 bg-[#0a6bb5] hover:bg-sky-800 text-white font-bold text-xl rounded-2xl flex items-center justify-center gap-2 border-2 border-sky-400 cursor-pointer active:scale-95 transition-all shadow-md"
        >
          <Printer className="w-5 h-5 text-saffron" />
          <span>{dictionary[language].token_print_receipt}</span>
        </button>

        <button
          onClick={handleSkipPrint}
          className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-lg rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-colors"
        >
          <span>{dictionary[language].token_back_home}</span>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* 🖨️ MOCK PHYSICAL THERMAL TICKET RECEIPT PRINT AREA */}
      {tokenObj && createPortal(
        <div className="hidden print:block w-[80mm] p-[10px] text-black font-mono text-[12px] leading-relaxed">
          <div className="text-center border-b border-dashed border-black pb-2 mb-2">
            <h3 className="font-bold text-[16px] uppercase m-0">NAGAR NIGAM JAIPUR</h3>
            <p className="text-[9px] m-0 uppercase mt-0.5">CITIZEN SERVICE CENTER</p>
          </div>
          
          <div className="text-center py-3 bg-slate-100 border border-black rounded mb-3">
            <span className="text-[10px] uppercase font-bold block">YOUR TICKET NUMBER</span>
            <span className="text-[20px] font-bold block tracking-tighter mt-1">{tokenObj.tokenNumber}</span>
          </div>

          <div className="flex flex-col gap-1 border-b border-dashed border-black pb-2 mb-2">
            <div><strong>DATE:</strong> {new Date(tokenObj.createdAt).toLocaleString()}</div>
            <div><strong>DEPARTMENT:</strong> {blockNameDisplay}</div>
            <div><strong>SERVICE:</strong> {serviceNameDisplay}</div>
            <div><strong>STATUS:</strong> QUEUED AT COUNTER</div>
          </div>

          <div className="text-center py-2 text-[10px] uppercase leading-snug border-b border-dashed border-black mb-2">
            Please present this slip at<br/><strong>ADMINISTRATIVE COUNTER NO. 1</strong>
          </div>

          <div className="text-center text-[9px] uppercase pt-2">
            Keep this ticket safely.<br/>Thank you for your patience!
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
