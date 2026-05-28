import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QrCode, Printer, ArrowRight, Users, Calendar, PenLine, Heart, UserCircle, Home, MapPin } from 'lucide-react';
import { useKioskStore } from '../store/kioskStore.js';
import axiosInstance from '../api/axiosInstance.js';
import { createPortal } from 'react-dom';

const BIRTH_PARTICULARS = [
  { id: 1, label: 'Gender' },
  { id: 2, label: 'Date Of Birth' },
  { id: 3, label: 'Child Name Hindi' },
  { id: 4, label: 'Child Name English' },
  { id: 5, label: 'Mother Name Hindi' },
  { id: 6, label: 'Mother Name English' },
  { id: 7, label: 'Father Name Hindi' },
  { id: 8, label: 'Father Name English' },
  { id: 9, label: 'Permanent Address Hindi' },
  { id: 10, label: 'Permanent Address English' },
  { id: 11, label: 'Present Address Hindi' },
  { id: 12, label: 'Present Address English' }
];

// Lucide icon mapping for GRID step
const FIELD_ICONS = {
  1: Users,
  2: Calendar,
  3: PenLine,
  4: PenLine,
  5: Heart,
  6: Heart,
  7: UserCircle,
  8: UserCircle,
  9: Home,
  10: Home,
  11: MapPin,
  12: MapPin,
};

const FIELD_LABELS_HI = {
  1: 'लिंग',
  2: 'जन्म तिथि',
  3: 'बच्चे का नाम (हिंदी)',
  4: 'बच्चे का नाम (अंग्रेज़ी)',
  5: 'माता का नाम (हिंदी)',
  6: 'माता का नाम (अंग्रेज़ी)',
  7: 'पिता का नाम (हिंदी)',
  8: 'पिता का नाम (अंग्रेज़ी)',
  9: 'स्थायी पता (हिंदी)',
  10: 'स्थायी पता (अंग्रेज़ी)',
  11: 'वर्तमान पता (हिंदी)',
  12: 'वर्तमान पता (अंग्रेज़ी)',
};

export default function BirthCorrection() {
  const { language, setKioskState, speak, voiceAssist, triggerError } = useKioskStore();
  const navigate = useNavigate();

  // Workflow Steps: FORM -> PAYMENT -> SUCCESS
  // Workflow Steps: GRID -> FORM -> PAYMENT -> SUCCESS
  const [step, setStep] = useState('GRID');

  // Form States
  const [headerDetails, setHeaderDetails] = useState({
    registrationNo: '',
    applicantName: '',
    mobileNo: ''
  });

  const [rows, setRows] = useState(
    BIRTH_PARTICULARS.reduce((acc, curr) => {
      acc[curr.id] = { checked: false, oldValue: '', newValue: '' };
      return acc;
    }, {})
  );

  // Payment & Token States
  const [paymentSession, setPaymentSession] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [tokenRecord, setTokenRecord] = useState(null);

  // 🔄 Real-time Payment Status Polling & Auto-Printing Effect
  useEffect(() => {
    let pollInterval = null;

    if (step === 'PAYMENT' && paymentSession) {
      pollInterval = setInterval(async () => {
        try {
          const res = await axiosInstance.get(`/payment/verify/${paymentSession.transactionId}`);
          if (res.status === 'SUCCESS' || res.data?.status === 'SUCCESS' || res.status === 200 && res.data?.status === 'SUCCESS') {
            clearInterval(pollInterval);
            
            // Generate token directly on real success confirmation
            setPaymentLoading(true);
            const response = await axiosInstance.post('/counter-correction/generate-token', {
              applicantName: headerDetails.applicantName,
              mobileNumber: headerDetails.mobileNo,
              registrationNumber: headerDetails.registrationNo,
              certificateType: 'BIRTH',
              correctionType: 'MULTI',
              correctionDetails: getSelectedCorrections(),
              amount: paymentSession.amount,
              transactionId: paymentSession.transactionId
            });

            setTokenRecord(response.data.token);
            setStep('SUCCESS');

            if (voiceAssist) speak(language === 'hi' ? 'आपका टोकन प्रिंट हो गया है। कृपया काउंटर पर जाएं।' : 'Your token is successfully printed. Please proceed to the counter.');
          }
        } catch (err) {
          console.error("Payment status poll failed:", err);
        } finally {
          setPaymentLoading(false);
        }
      }, 2500);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [step, paymentSession, headerDetails, rows]);

  // 🖨️ Physical Browser Printing Trigger Effect & Auto-Close
  useEffect(() => {
    if (step === 'SUCCESS' && tokenRecord) {
      const handleAfterPrint = () => {
        setKioskState('SLEEP');
        navigate('/');
      };

      window.addEventListener('afterprint', handleAfterPrint, { once: true });

      const printTimer = setTimeout(() => {
        window.print();
      }, 1000);

      return () => {
        clearTimeout(printTimer);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
    }
  }, [step, tokenRecord, navigate, setKioskState]);

  // ⏳ Auto-redirect fallback after SUCCESS
  useEffect(() => {
    if (step === 'SUCCESS') {
      const redirectTimer = setTimeout(() => {
        setKioskState('SLEEP');
        navigate('/');
      }, 8000);
      return () => clearTimeout(redirectTimer);
    }
  }, [step, navigate, setKioskState]);

  const handleCheckboxChange = (id) => {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], checked: !prev[id].checked } }));
  };

  const handleInputChange = (id, field, value) => {
    setRows(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  // GRID step: pre-check selected field and transition to FORM
  const handleFieldSelect = (id) => {
    setRows(prev => {
      const reset = {};
      Object.keys(prev).forEach(key => {
        reset[key] = { ...prev[key], checked: false, oldValue: '', newValue: '' };
      });
      reset[id] = { ...reset[id], checked: true };
      return reset;
    });
    setStep('FORM');
  };

  const getSelectedCorrections = () => {
    return Object.keys(rows)
      .map(id => parseInt(id))
      .filter(id => rows[id].checked)
      .map(id => ({
        particular: BIRTH_PARTICULARS.find(p => p.id === id).label,
        oldValue: rows[id].oldValue,
        newValue: rows[id].newValue
      }));
  };

  const handleSave = async () => {
    const selectedCorrections = getSelectedCorrections();

    if (!headerDetails.registrationNo || !headerDetails.applicantName || !headerDetails.mobileNo) {
      triggerError(language === 'hi' ? 'कृपया ऊपर की सभी जानकारी भरें' : 'Please fill all required top details.');
      return;
    }

    if (selectedCorrections.length === 0) {
      triggerError(language === 'hi' ? 'कृपया सुधार के लिए कम से कम एक पंक्ति चुनें' : 'Please select at least one row for correction.');
      return;
    }

    try {
      setPaymentLoading(true);
      const res = await axiosInstance.post('/payment/qr', {
        amount: 50,
        registrationNumber: headerDetails.registrationNo
      });
      setPaymentSession(res.data);
      setStep('PAYMENT');
      setKioskState('ACTIVE');

      if (voiceAssist) speak(language === 'hi' ? 'कृपया टोकन शुल्क का भुगतान करने के लिए क्यू आर कोड स्कैन करें।' : 'Please scan the QR code to pay your token fee.');
    } catch (err) {
      console.error(err);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSimulatePayment = async () => {
    try {
      setPaymentLoading(true);
      await axiosInstance.get(`/payment/verify/${paymentSession.transactionId}`);

      const response = await axiosInstance.post('/counter-correction/generate-token', {
        applicantName: headerDetails.applicantName,
        mobileNumber: headerDetails.mobileNo,
        registrationNumber: headerDetails.registrationNo,
        certificateType: 'BIRTH',
        correctionType: 'MULTI',
        correctionDetails: getSelectedCorrections(),
        amount: paymentSession.amount,
        transactionId: paymentSession.transactionId
      });

      setTokenRecord(response.data.token);
      setStep('SUCCESS');

      if (voiceAssist) speak(language === 'hi' ? 'आपका टोकन प्रिंट हो गया है। कृपया काउंटर पर जाएं।' : 'Your token is successfully printed. Please proceed to the counter.');

      setTimeout(() => {
        setKioskState('SLEEP');
        navigate('/');
      }, 8000);

    } catch (err) {
      console.error("Token generation failed:", err);
      setStep('FORM');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white select-none relative">
      {/* DYNAMIC NEXT BUTTON PORTAL TO HEADER */}
      {step === 'FORM' && document.getElementById('header-action-portal') && createPortal(
        <button onClick={handleSave} disabled={paymentLoading} className="px-6 py-3 bg-[#0a6bb5] hover:bg-sky-800 text-white font-bold font-rajdhani rounded-2xl shadow-[0_4px_6px_rgba(0,0,0,0.1)] active:scale-95 cursor-pointer transition-all disabled:opacity-50 flex items-center gap-2">
          <span className="text-xl tracking-wider uppercase">{language === 'hi' ? 'अगला' : 'Next'}</span>
          <ArrowRight className="w-6 h-6" />
        </button>,
        document.getElementById('header-action-portal')
      )}

      {/* STEP 0: FIELD SELECTION GRID */}
      {step === 'GRID' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col overflow-hidden relative">
          <div className="bg-[#b53d34] px-10 py-5 text-white shrink-0">
            <h2 className="font-hindi text-3xl font-bold text-center m-0">
              {language === 'hi' ? 'सुधार के लिए विवरण चुनें' : 'Select Field to Correct'}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            <div className="grid grid-cols-3 gap-5 max-w-[1000px] mx-auto">
              {BIRTH_PARTICULARS.map((item) => {
                const IconComp = FIELD_ICONS[item.id];
                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleFieldSelect(item.id)}
                    className="flex flex-col items-center justify-center gap-3 p-5 bg-white rounded-3xl border-2 border-slate-200 shadow-md hover:border-[#b53d34] hover:shadow-lg cursor-pointer transition-all min-h-[130px]"
                  >
                    <div className="w-14 h-14 rounded-full bg-[#b53d34]/10 flex items-center justify-center shrink-0">
                      <IconComp className="w-7 h-7 text-[#b53d34]" />
                    </div>
                    <span className="font-rajdhani font-bold text-base text-navy text-center leading-tight">
                      {language === 'hi' ? FIELD_LABELS_HI[item.id] : item.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 1: TABLE FORM */}
      {step === 'FORM' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* DETAILS HEADER (Rust Red/Brown - #b53d34) */}
          <div className="bg-[#b53d34] px-10 py-6 flex justify-between gap-10 text-white shrink-0">
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-sm font-bold pl-1 uppercase tracking-wider">Registration No.</label>
              <input type="text" className="w-full px-2 py-1 bg-transparent border-b-2 border-white/30 text-white text-lg font-bold outline-none placeholder-white/30 focus:border-white transition-colors" placeholder="Enter No." value={headerDetails.registrationNo} onChange={(e) => setHeaderDetails({...headerDetails, registrationNo: e.target.value.toUpperCase()})} />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-sm font-bold pl-1 uppercase tracking-wider">Applicant Name</label>
              <input type="text" className="w-full px-2 py-1 bg-transparent border-b-2 border-white/30 text-white text-lg font-bold outline-none placeholder-white/30 focus:border-white transition-colors" placeholder="Enter Name" value={headerDetails.applicantName} onChange={(e) => setHeaderDetails({...headerDetails, applicantName: e.target.value})} />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-sm font-bold pl-1 uppercase tracking-wider">Mobile No.</label>
              <input type="tel" maxLength={10} className="w-full px-2 py-1 bg-transparent border-b-2 border-white/30 text-white text-lg font-bold outline-none placeholder-white/30 focus:border-white transition-colors" placeholder="Enter Mobile" value={headerDetails.mobileNo} onChange={(e) => setHeaderDetails({...headerDetails, mobileNo: e.target.value.replace(/[^0-9]/g, '')})} />
            </div>
          </div>

          {/* TABLE SECTION */}
          <div className="flex flex-col flex-1 bg-[#c24136] overflow-hidden">
            <div className="grid grid-cols-[80px_80px_1fr_1.2fr_1.2fr] bg-[#8c1b11] text-white font-bold py-3 text-sm text-center shrink-0 shadow-[0_4px_10px_rgba(0,0,0,0.1)] z-10">
              <div></div><div>Sr.No.</div><div className="text-left pl-4">Particular</div><div>Old Value</div><div>New Value</div>
            </div>

            <div className="flex flex-col overflow-y-auto flex-1 p-4 gap-3">
              {BIRTH_PARTICULARS.filter(item => rows[item.id].checked).map((item) => (
                <div key={item.id} className="grid grid-cols-[80px_80px_1fr_1.2fr_1.2fr] items-center text-white py-1">
                  <div className="flex justify-center items-center">
                    <input type="checkbox" className="w-6 h-6 accent-white" disabled={true} checked={rows[item.id].checked} onChange={() => handleCheckboxChange(item.id)} />
                  </div>
                  <div className="text-center font-bold text-lg">{item.id}</div>
                  <div className="font-bold text-[15px] pl-4 pr-4 tracking-wide">{item.label}</div>
                  <div className="px-3"><input type="text" className="w-full px-4 py-2.5 rounded-xl font-semibold outline-none transition-all disabled:bg-white/30 disabled:border-none disabled:text-transparent bg-white text-black focus:ring-2 focus:ring-white shadow-inner" disabled={!rows[item.id].checked} value={rows[item.id].oldValue} onChange={(e) => handleInputChange(item.id, 'oldValue', e.target.value)} /></div>
                  <div className="px-3"><input type="text" className="w-full px-4 py-2.5 rounded-xl font-semibold outline-none transition-all disabled:bg-white/30 disabled:border-none disabled:text-transparent bg-white text-black focus:ring-2 focus:ring-white shadow-inner" disabled={!rows[item.id].checked} value={rows[item.id].newValue} onChange={(e) => handleInputChange(item.id, 'newValue', e.target.value)} /></div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 2: PAYMENT QR */}
      {step === 'PAYMENT' && paymentSession && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center gap-4 text-center bg-slate-50 overflow-y-auto py-6">
          <div className="flex flex-col items-center gap-1">
            <QrCode className="w-14 h-14 text-sky-700" />
            <h3 className="font-hindi text-3xl font-bold text-navy m-0">{language === 'hi' ? 'टोकन शुल्क का भुगतान करें' : 'Pay Token Fee'}</h3>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-xl border-4 border-slate-200 flex flex-col items-center gap-3">
            <div className="w-56 h-56 border-2 border-slate-200 rounded-2xl overflow-hidden p-2"><img src={paymentSession.qrCodeUrl} alt="UPI QR Code" className="w-full h-full object-contain" /></div>
            <div className="flex flex-col items-center"><span className="text-slate-500 font-bold text-base uppercase tracking-wider">Amount to Pay</span><span className="text-4xl font-bold text-sky-700">₹{paymentSession.amount}</span></div>
          </div>
          <button onClick={handleSimulatePayment} disabled={paymentLoading} className="px-8 py-3 mt-2 bg-green-custom text-white text-xl font-bold rounded-2xl shadow-lg disabled:opacity-50">{language === 'hi' ? 'भुगतान सिमुलेट करें' : 'Simulate Payment Success'}</button>
        </motion.div>
      )}

      {/* STEP 3: SUCCESS TOKEN */}
      {step === 'SUCCESS' && tokenRecord && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center gap-6 bg-slate-50 overflow-y-auto py-6">
          <div className="relative w-32 h-32 flex items-center justify-center"><motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute inset-0 bg-green-100 rounded-full" /><div className="w-24 h-24 bg-green-custom rounded-full flex items-center justify-center shadow-lg z-10"><Printer className="w-12 h-12 text-white" /></div></div>
          <div className="flex flex-col items-center gap-2 text-center">
            <h3 className="font-hindi text-4xl font-bold text-navy">{language === 'hi' ? 'टोकन प्रिंट हो गया है' : 'Token Printed Successfully'}</h3>
            <p className="text-xl text-slate-600 font-semibold mb-4">{language === 'hi' ? 'कृपया काउंटर पर प्रतीक्षा करें।' : 'Please wait at the counter.'}</p>
            <div className="bg-white p-6 rounded-3xl border-4 border-slate-200 shadow-xl min-w-[300px]"><span className="text-slate-500 font-bold text-base uppercase tracking-wider block mb-1">Your Token Number</span><span className="text-6xl font-bold text-sky-700 tracking-wider block">{tokenRecord.token_number}</span><span className="text-navy font-bold text-xl block mt-3">{tokenRecord.counter_number}</span></div>
          </div>
        </motion.div>
      )}

      {/* 🖨️ PHYSICAL THERMAL RECEIPT PRINT AREA */}
      {tokenRecord && createPortal(
        <div className="hidden print:block w-[80mm] p-[10px] text-black font-mono text-[12px] leading-relaxed">
          <div className="text-center border-b border-dashed border-black pb-2 mb-2">
            <h3 className="font-bold text-[16px] uppercase m-0">NAGAR NIGAM KIOSK</h3>
            <p className="text-[10px] m-0 uppercase mt-0.5">CITIZEN SERVICE CENTER</p>
          </div>
          <div className="flex flex-col gap-1 border-b border-dashed border-black pb-2 mb-2">
            <div><strong>DATE:</strong> {new Date().toLocaleString()}</div>
            <div><strong>SERVICE:</strong> BIRTH CORRECTION</div>
            <div><strong>REG NO:</strong> {headerDetails.registrationNo.toUpperCase()}</div>
            <div><strong>APPLICANT:</strong> {headerDetails.applicantName.toUpperCase()}</div>
            <div><strong>MOBILE:</strong> {headerDetails.mobileNo}</div>
          </div>
          <div className="text-center py-4 border-b border-dashed border-black mb-2">
            <span className="text-[10px] block uppercase font-bold text-slate-500 mb-1">Your Token Number</span>
            <span className="text-[36px] font-bold tracking-wider block leading-none">{tokenRecord.token_number}</span>
            <span className="text-[16px] font-bold block mt-2">{tokenRecord.counter_number}</span>
          </div>
          <div className="text-center text-[10px] uppercase font-bold pt-2">
            Please wait at the counter.<br/>Thank you for using civic services!
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
