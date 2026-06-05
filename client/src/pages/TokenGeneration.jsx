import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useKioskStore } from '../store/kioskStore.js';
import { useAdminStore } from '../store/adminStore.js';
import { dictionary } from '../translations/dictionary.js';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Printer, CheckCircle, ArrowRight, RefreshCw, Landmark, ArrowLeft, Ticket } from 'lucide-react';

export default function TokenGeneration() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'correction'; // correction, new_registration
  const block = searchParams.get('block') || 'birth'; // birth, death, marriage

  const { language, setKioskState, speak, voiceAssist, triggerError } = useKioskStore();
  const adminStoreState = useAdminStore();
  console.log("useAdminStore returned state:", adminStoreState);
  const { generateToken } = adminStoreState;
  const navigate = useNavigate();

  const [tokenObj, setTokenObj] = useState(null);
  const [printInitiated, setPrintInitiated] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);

  // Theme styling based on selected block
  const themes = {
    birth: {
      gradient: 'from-orange-50/90 to-amber-50/60',
      border: 'border-saffron',
      borderT: 'border-t-saffron',
      bgGlow: 'bg-saffron/10',
      text: 'text-saffron-dark',
      btnBg: 'bg-gradient-to-r from-saffron to-amber-500 hover:from-saffron-dark hover:to-amber-600 border-orange-300',
      iconColor: 'text-saffron-dark'
    },
    death: {
      gradient: 'from-blue-50/90 to-sky-50/60',
      border: 'border-blue-custom',
      borderT: 'border-t-blue-custom',
      bgGlow: 'bg-blue-custom/10',
      text: 'text-blue-custom-dark',
      btnBg: 'bg-gradient-to-r from-blue-custom to-sky-500 hover:from-blue-custom-dark hover:to-sky-600 border-blue-300',
      iconColor: 'text-blue-custom-dark'
    },
    marriage: {
      gradient: 'from-purple-50/90 to-fuchsia-50/60',
      border: 'border-purple-custom',
      borderT: 'border-t-purple-custom',
      bgGlow: 'bg-purple-custom/10',
      text: 'text-purple-custom-dark',
      btnBg: 'bg-gradient-to-r from-purple-custom to-fuchsia-500 hover:from-purple-custom-dark hover:to-fuchsia-600 border-purple-300',
      iconColor: 'text-purple-custom-dark'
    }
  };
  const theme = themes[block] || themes.birth;

  // 1. Mount effect: Set kiosk state & speak initial manual guidance
  useEffect(() => {
    setKioskState('ACTIVE');
    
    if (voiceAssist && !hasGreeted && !tokenObj) {
      const initialMsg = language === 'hi'
        ? 'अपना टोकन नंबर जनरेट करने के लिए, कृपया स्क्रीन पर दिए गए टोकन जनरेट करें बटन पर क्लिक करें।'
        : 'To generate your token number, please click the Generate Token button on the screen.';
      speak(initialMsg);
      setHasGreeted(true);
    }
  }, [setKioskState, speak, voiceAssist, language, hasGreeted, tokenObj]);

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

  const handleGenerateToken = () => {
    setLocalLoading(true);
    generateToken(block, type)
      .then((spawnedToken) => {
        setTokenObj(spawnedToken);

        // Speak token announcement
        if (voiceAssist && spawnedToken) {
          const cleanToken = spawnedToken.tokenNumber.replace(/-/g, ' ');
          const msg = language === 'hi'
            ? `आपका टोकन जनरेट हो गया है। टोकन नंबर ${cleanToken} है। कृपया रसीद प्रिंट करें और एडमिन काउंटर पर जाएँ।`
            : `Your token has been generated. Token number is ${cleanToken}. Please print your receipt and proceed to the admin counter.`;
          speak(msg);
        }
      })
      .catch((err) => {
        console.error("Failed to generate token on backend:", err);
        const errorMsg = language === 'hi'
          ? 'टोकन बनाने में विफल। कृपया पुन: प्रयास करें या काउंटर से संपर्क करें।'
          : 'Failed to generate token. Please try again or contact support.';
        triggerError(errorMsg);
      })
      .finally(() => {
        setLocalLoading(false);
      });
  };

  const handlePrint = () => {
    setPrintInitiated(true);
  };

  const handleSkipPrint = () => {
    setKioskState('SLEEP');
    navigate('/');
  };

  const handleCancel = () => {
    navigate(`/services?block=${block}`);
  };

  // Formatting strings for screen display
  const blockNameDisplay = language === 'hi'
    ? (block === 'birth' ? 'जन्म प्रमाण-पत्र विभाग' : block === 'death' ? 'मृत्यु प्रमाण-पत्र विभाग' : 'विवाह प्रमाण-पत्र विभाग')
    : `${block.toUpperCase()} CERTIFICATE DEPT`;

  const serviceNameDisplay = language === 'hi'
    ? (type === 'correction' ? 'संशोधन अनुरोध (Correction)' : 'नवीन पंजीकरण (New Registration)')
    : (type === 'correction' ? 'CORRECTION REQUEST' : 'NEW REGISTRATION APPLICATION');

  if (localLoading) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-slate-50 gap-4">
        <RefreshCw className="w-12 h-12 text-saffron animate-spin" />
        <p className="font-bebas text-2xl text-navy">
          {language === 'hi' ? 'टोकन जनरेट किया जा रहा है...' : 'Generating Ticket...'}
        </p>
      </div>
    );
  }

  if (!tokenObj) {
    return (
      <div className="w-full flex-1 max-w-[800px] mx-auto flex flex-col items-center justify-center py-4 px-4 gap-4 select-none font-rajdhani max-h-full overflow-y-auto scrollbar-none">
        
        {/* Header Info */}
        <div className="text-center flex flex-col items-center gap-1">
          <h2 className="font-hindi text-3xl font-bold text-navy m-0 drop-shadow-sm leading-none">
            {language === 'hi' ? 'टोकन पुष्टीकरण' : 'Token Confirmation'}
          </h2>
          <p className="text-slate-500 font-semibold text-sm m-0 mt-1.5">
            {language === 'hi' 
              ? 'टोकन जनरेट करने से पहले कृपया अपने सेवा विवरण की पुष्टि करें।' 
              : 'Please review and confirm your service details before generating the token.'}
          </p>
        </div>

        {/* 📑 Premium Confirmation Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={`w-full max-w-md bg-white border-2 border-slate-200 rounded-3xl py-6 px-6 shadow-xl flex flex-col gap-5 border-t-8 ${theme.borderT} relative overflow-hidden`}
        >
          {/* Subtle Back Watermark */}
          <Landmark className="absolute right-[-20px] bottom-[-20px] w-40 h-40 text-slate-100/50 pointer-events-none rotate-12" />

          {/* Icon Badge */}
          <div className="flex justify-center mb-1">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${theme.bgGlow} border border-slate-100 relative`}>
              <Ticket className={`w-8 h-8 ${theme.iconColor}`} />
              <div className={`absolute inset-0 rounded-full border border-current ${theme.iconColor} animate-ping opacity-25`} />
            </div>
          </div>

          {/* Details Box */}
          <div className="flex flex-col gap-3.5 bg-slate-50/80 border border-slate-100 rounded-2xl p-4 z-10">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">
                {language === 'hi' ? 'विभाग (Department)' : 'Department'}
              </span>
              <span className="text-navy uppercase font-extrabold text-sm text-right">
                {blockNameDisplay}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">
                {language === 'hi' ? 'सेवा प्रकार (Service Type)' : 'Service Type'}
              </span>
              <span className="text-navy uppercase font-extrabold text-sm text-right">
                {serviceNameDisplay}
              </span>
            </div>
          </div>

          {/* Advisory Notice */}
          <div className="text-xs font-semibold text-slate-500 leading-relaxed text-center px-2">
            {language === 'hi' 
              ? 'नोट: एक बार जनरेट होने के बाद, आपका टोकन कतार में जुड़ जाएगा। कृपया पर्ची प्रिंट करें और अपने नंबर की प्रतीक्षा करें।'
              : 'Note: Once generated, your token will be added to the queue. Please print the slip and wait for your turn.'}
          </div>
        </motion.div>

        {/* Action Controls */}
        <div className="flex flex-col gap-3 w-full max-w-md mt-2 z-10">
          <motion.button
            onClick={handleGenerateToken}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className={`w-full py-4 px-6 ${theme.btnBg} text-white font-bold text-xl rounded-2xl flex items-center justify-center gap-3 border-2 shadow-lg cursor-pointer active:scale-95 transition-all`}
          >
            <Printer className="w-6 h-6 text-white" />
            <span>
              {language === 'hi' ? 'कियोस्क टोकन जनरेट करें' : 'Generate Kiosk Token'}
            </span>
          </motion.button>

          <button
            onClick={handleCancel}
            className="w-full py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-lg rounded-2xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
            <span>{language === 'hi' ? 'वापस जाएं' : 'Go Back'}</span>
          </button>
        </div>

      </div>
    );
  }

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
