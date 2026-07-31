import { useEffect, useState } from 'react';
import { useKioskStore } from '../store/kioskStore.js';
import ServiceCard from '../components/kiosk/ServiceCard.jsx';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PrintSelection() {
  const { language, kioskState, setKioskState, speak, voiceAssist } = useKioskStore();
  const [searchParams] = useSearchParams();
  const block = searchParams.get('block') || 'birth';

  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    if (!showDisclaimer && kioskState !== 'PAUSE' && kioskState !== 'HOLD') {
      if (voiceAssist) {
        speak(language === 'hi' 
          ? 'कृपया प्रमाण-पत्र प्रिंट या पंजीकरण खोज का विकल्प चुनें।' 
          : 'Please select Print Documents or Search Registration option.');
      }
      setKioskState('ACTIVE');
    }
  }, [language, voiceAssist, speak, setKioskState, showDisclaimer, kioskState]);

  // Trigger disclaimer before print download
  const handlePrintDocumentsClick = () => {
    setShowDisclaimer(true);
    if (voiceAssist) {
      speak(language === 'hi'
        ? 'घोषणा: हमारे कियोस्क सिस्टम के माध्यम से नगर निगम जयपुर के बाहर के प्रमाण पत्र प्रिंट करना अवैध है। आगे बढ़ने के लिए मैं घोषणा करता हूँ पर क्लिक करें।'
        : 'Disclaimer: It is illegal to print certificates outside of Jaipur Municipal Corporation through our kiosk system. Please click I declare to proceed.');
    }
  };

  // Block 1: Pehchan Certificate Download & Print (confirmed after disclaimer)
  const confirmPrintDocuments = () => {
    setShowDisclaimer(false);
    setKioskState('PAUSE', 'BLOCK_1');
    localStorage.setItem('kiosk_active_block', block);
    window.open(
      'https://pehchan.rajasthan.gov.in/ECertificate.aspx',
      '_blank'
    );
  };

  // Block 2: Registration Search on Pehchan Portal (Payment is collected AFTER download)
  const handleSearchPortalClick = () => {
    setKioskState('PAUSE', 'BLOCK_2');
    localStorage.setItem('kiosk_active_block', block);
    window.open(
      'https://pehchan.rajasthan.gov.in/VerifyRegisNum.aspx?PehRed=MmRkYzZkZWY=OGRlYjRmY2NlZWQwOTcwZGJmOGZjMWE=',
      '_blank'
    );
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto flex flex-col items-center justify-center min-h-[400px] relative">
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
          onClick={handlePrintDocumentsClick}
        />

        {/* Option 2 — Search in Pehchan Portal */}
        <ServiceCard
          title={language === 'hi' ? 'पहचान पोर्टल में खोजें और प्रिंट करें..' : 'Search in Pehchan Portal and Print..'}
          description={language === 'hi' ? 'पहचान पोर्टल पर जाकर अपना प्रमाण-पत्र खोजें और डाउनलोड करें' : 'Go to Pehchan Portal to search and download your certificate'}
          color="purple"
          svgPath="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
          onClick={handleSearchPortalClick}
        />
      </div>

      {/* 📜 DISCLAIMER LEGALITY OVERLAY MODAL */}
      <AnimatePresence>
        {showDisclaimer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white border border-slate-150 max-w-xl w-full rounded-3xl shadow-2xl overflow-hidden font-rajdhani border-t-8 border-t-saffron flex flex-col items-center p-8 text-center gap-6 relative"
            >
              {/* Inner Pulsing Warning Circle */}
              <div className="relative w-20 h-20 flex items-center justify-center">
                <motion.div 
                  animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute inset-0 bg-amber-500 rounded-full filter blur-md"
                />
                <div className="relative w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center shadow-inner border border-amber-200">
                  <AlertTriangle className="w-9 h-9 text-saffron" />
                </div>
              </div>

              {/* Header Title */}
              <div className="flex flex-col gap-1.5">
                <h3 className="font-hindi text-3xl font-extrabold text-navy m-0 leading-tight">
                  {language === 'hi' ? 'महत्वपूर्ण घोषणा' : 'Important Legal Declaration'}
                </h3>
                <span className="font-bebas text-lg tracking-widest text-saffron-dark uppercase font-bold">
                  {language === 'hi' ? 'कानूनी चेतावनी / Legal Warning' : 'Legal Disclaimer Warning'}
                </span>
              </div>

              {/* Main Bilingual Warning Cards Box */}
              <div className="w-full bg-gradient-to-br from-amber-50/80 to-orange-50/60 border border-amber-200/80 rounded-2xl p-5 text-left flex flex-col gap-4">
                {/* Hindi warning */}
                <div className="flex gap-3 items-start">
                  <span className="text-xl mt-0.5 select-none">⚠️</span>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-amber-600 uppercase tracking-wider font-rajdhani font-semibold">सूचना (Notice)</span>
                    <p className="m-0 text-navy font-bold font-hindi text-[18px] leading-relaxed mt-0.5">
                      "हमारे कियोस्क सिस्टम के माध्यम से नगर निगम जयपुर के बाहर के प्रमाण पत्र प्रिंट करना अवैध है।"
                    </p>
                  </div>
                </div>
                
                <div className="h-px bg-amber-200/50 w-full" />

                {/* English warning */}
                <div className="flex gap-3 items-start">
                  <span className="text-xl mt-0.5 select-none">ℹ️</span>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wider font-rajdhani font-semibold">English Advisory</span>
                    <p className="m-0 text-slate-700 font-semibold font-rajdhani text-[16px] leading-relaxed mt-0.5">
                      "It is illegal to print certificates outside of Jaipur Municipal Corporation through our kiosk system."
                    </p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <p className="text-sm font-semibold text-slate-500 leading-snug m-0 max-w-md">
                {language === 'hi'
                  ? 'कियोस्क पर प्रिंट जारी रखने के लिए, घोषणा स्वीकार करने हेतु "मैं घोषणा करता हूँ" पर टैप करें।'
                  : 'To proceed with printing, please tap "I Declare" to acknowledge this warning.'}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-4 w-full mt-2">
                <button
                  onClick={confirmPrintDocuments}
                  className="flex-1 py-4 px-6 bg-gradient-to-r from-saffron to-amber-500 hover:from-saffron-dark hover:to-saffron text-white font-bold text-xl rounded-2xl cursor-pointer active:scale-95 transition-all shadow-md hover:shadow-lg border border-amber-400 font-rajdhani flex items-center justify-center gap-2"
                >
                  <span>{language === 'hi' ? 'मैं घोषणा करता हूँ (I Declare)' : 'I Declare'}</span>
                </button>
                
                <button
                  onClick={() => setShowDisclaimer(false)}
                  className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg rounded-2xl cursor-pointer active:scale-95 transition-all border border-slate-200 font-rajdhani"
                >
                  {language === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
