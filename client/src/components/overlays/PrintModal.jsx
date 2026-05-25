import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Check, Printer, FileText, QrCode, CreditCard, RotateCcw, AlertTriangle } from 'lucide-react';
import { useKioskStore } from '../../store/kioskStore.js';
import { dictionary } from '../../translations/dictionary.js';
import axiosInstance from '../../api/axiosInstance.js';
import { createPortal } from 'react-dom';
import printJS from 'print-js';

export default function PrintModal() {
  const { 
    language, 
    activeModal, 
    closeModal, 
    setKioskState,
    voiceAssist,
    speak
  } = useKioskStore();

  // Guard against non-print modal triggers moved to bottom to comply with React Rules of Hooks

  // ==========================================
  // 📊 Local Wizard States
  // ==========================================
  const [step, setStep] = useState('FORM'); // FORM, HOLD, PAYMENT, PRINTING, SUCCESS
  const [form, setForm] = useState({
    applicantName: '',
    mobileNumber: '',
    registrationNumber: '',
    certificateType: 'BIRTH', // BIRTH, DEATH, MARRIAGE
    totalCopies: 1
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pollIntervalId, setPollIntervalId] = useState(null);
  
  // File detection cache
  const [detectedFile, setDetectedFile] = useState(null);

  // Payment states
  const [paymentSession, setPaymentSession] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Spooling states
  const [spooledRecord, setSpooledRecord] = useState(null);
  const [base64Pdf, setBase64Pdf] = useState(null);

  // 🔄 Real-time Payment Status Polling Effect
  useEffect(() => {
    let pollInterval = null;

    if (step === 'PAYMENT' && paymentSession) {
      pollInterval = setInterval(async () => {
        try {
          const res = await axiosInstance.get(`/payment/verify/${paymentSession.transactionId}`);
          if (res.status === 'SUCCESS' || res.data?.status === 'SUCCESS' || res.status === 200 && res.data?.status === 'SUCCESS') {
            clearInterval(pollInterval);
            
            // Advance to printing step
            setStep('PRINTING');

            // Speech trigger
            if (voiceAssist) {
              const msg = language === 'hi'
                ? 'भुगतान सफल रहा। कृपया प्रतीक्षा करें, हम आपका प्रमाण-पत्र प्रिंट कर रहे हैं।'
                : 'Payment successful. Please wait while we print your certificate.';
              speak(msg);
            }

            try {
              // Trigger spooled printer execution & privacy purge on server
              const response = await axiosInstance.post('/print/execute', {
                applicantName: form.applicantName,
                mobileNumber: form.mobileNumber,
                registrationNumber: form.registrationNumber,
                certificateType: form.certificateType,
                totalCopies: form.totalCopies,
                downloadedFileName: detectedFile?.fileName || 'certificate_download.pdf',
                amount: form.totalCopies * 20,
                transactionId: paymentSession.transactionId
              });

              setSpooledRecord(response.data);
              if (response.data.base64Pdf) {
                setBase64Pdf(response.data.base64Pdf);
              }
              setStep('SUCCESS');

              // Play final thank you synthesized cue
              if (voiceAssist) {
                const msg = language === 'hi'
                  ? 'आपका प्रमाण-पत्र प्रिंट हो गया है। नागर निगम सेवा का उपयोग करने के लिए धन्यवाद।'
                  : 'Your certificate is successfully printed. Thank you for using Nagar Nigam citizen services.';
                setTimeout(() => speak(msg), 1000);
              }
            } catch (printErr) {
              console.error("Print execution failed during real-time poll:", printErr);
              const errMsg = printErr.response?.data?.message || printErr.message || 'Printing execution failed.';
              setError(language === 'hi' 
                ? `भुगतान सफल रहा लेकिन प्रिंटिंग विफल: ${errMsg}` 
                : `Payment succeeded but printing failed: ${errMsg}`
              );
              setStep('FORM');
              
              if (voiceAssist) {
                const msg = language === 'hi'
                  ? 'भुगतान सफल रहा लेकिन प्रिंटिंग विफल हो गई है। कृपया सहायता डेस्क से संपर्क करें।'
                  : 'Payment was successful, but printing has failed. Please contact the support desk.';
                speak(msg);
              }
            }
          }
        } catch (err) {
          console.error("Payment status poll failed:", err);
        }
      }, 2500);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [step, paymentSession, form, detectedFile]);

  // 🖨️ Physical Browser Printing Trigger Effect & Auto-Close
  useEffect(() => {
    if (step === 'SUCCESS' && spooledRecord) {
      
      const handleAfterReceiptPrint = () => {
        setTimeout(() => {
          handleClose();
          setKioskState('SLEEP');
        }, 3000);
      };

      window.addEventListener('afterprint', handleAfterReceiptPrint, { once: true });

      if (base64Pdf) {
        const printTimer = setTimeout(() => {
          printJS({
            printable: base64Pdf,
            type: 'pdf',
            base64: true,
            onPrintDialogClose: () => {
              // Trigger receipt print right after PDF print dialog closes
              setTimeout(() => {
                window.print();
              }, 1000);
            }
          });
        }, 1000);
        
        return () => {
          clearTimeout(printTimer);
          window.removeEventListener('afterprint', handleAfterReceiptPrint);
        };
      } else {
        // If no PDF found, just print the receipt
        const printTimer = setTimeout(() => {
          window.print();
        }, 1000);

        return () => {
          clearTimeout(printTimer);
          window.removeEventListener('afterprint', handleAfterReceiptPrint);
        };
      }
    }
  }, [step, spooledRecord, base64Pdf]);

  // Clear states on close/unmount
  const handleClose = () => {
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
    }
    setStep('FORM');
    setForm({
      applicantName: '',
      mobileNumber: '',
      registrationNumber: '',
      certificateType: 'BIRTH',
      totalCopies: 1
    });
    setError('');
    setDetectedFile(null);
    setPaymentSession(null);
    setSpooledRecord(null);
    setBase64Pdf(null);
    closeModal();
    // Return the kiosk to a clean HOME state when exiting the print wizard
    const storeState = useKioskStore.getState().kioskState;
    if (storeState !== 'SLEEP') {
      setKioskState('HOME');
    }
  };

  // ==========================================
  // ⚙️ Wizard Workflows
  // ==========================================
  
  // 1. Submit Details & Trigger Hold Redirection
  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Input Validations
    if (!form.applicantName.trim()) {
      setError(language === 'hi' ? 'कृपया आवेदक का नाम दर्ज करें' : 'Please enter applicant name');
      return;
    }
    if (!form.mobileNumber.match(/^[0-9]{10}$/)) {
      setError(language === 'hi' ? 'कृपया 10-अंकीय मान्य मोबाइल नंबर दर्ज करें' : 'Please enter a valid 10-digit mobile number');
      return;
    }
    if (!form.registrationNumber.trim()) {
      setError(language === 'hi' ? 'कृपया पंजीकरण संख्या दर्ज करें' : 'Please enter registration number');
      return;
    }

    setStep('HOLD');
    setKioskState('HOLD'); // Pause the global inactivity timer while citizen downloads certificate
    
    // Speak Hold mode instructions
    if (voiceAssist) {
      const msg = language === 'hi' 
        ? 'कृपया प्रतीक्षा करें। हम डाउनलोड किए गए फ़ाइल की जांच कर रहे हैं।' 
        : 'Please wait. We are checking for the downloaded file.';
      speak(msg);
    }

    // Initialize 2.5s polling loop to scan sandbox folder for the PDF
    startPolling();
  };

  // 2. Sandboxed PDF File Polling Scanner Loop
  const startPolling = () => {
    if (pollIntervalId) clearInterval(pollIntervalId);

    const intervalId = setInterval(async () => {
      try {
        const response = await axiosInstance.get('/print/check-download');
        // Standard payload: response = { data: { success, data: { detected, fileName, sizeBytes } } }
        const payload = response.data;
        
        if (payload?.detected) {
          clearInterval(intervalId);
          setDetectedFile(payload);
          triggerPaymentTransition(payload.fileName);
        }
      } catch (err) {
        console.error('File polling check failed:', err);
      }
    }, 2500);

    setPollIntervalId(intervalId);
  };

  // Transition helper from HOLD to PAYMENT
  const triggerPaymentTransition = async (fileName) => {
    if (pollIntervalId) clearInterval(pollIntervalId);
    setStep('PAYMENT');
    setKioskState('ACTIVE'); // Resume global inactivity timeout for the checkout phase

    // Speech synthesis cue
    if (voiceAssist) {
      const msg = language === 'hi' 
        ? 'दस्तावेज़ मिल गया है। कृपया प्रिंटिंग शुल्क का भुगतान करने के लिए क्यू आर कोड स्कैन करें।' 
        : 'Document detected. Please scan the QR code to pay your printing fee.';
      speak(msg);
    }

    // Generate UPI QR Code session
    setPaymentLoading(true);
    try {
      const amount = form.totalCopies * 20; // Flat ₹20 per printed copy
      const response = await axiosInstance.post('/payment/qr', {
        amount,
        registrationNumber: form.registrationNumber
      });
      setPaymentSession(response.data);
    } catch (err) {
      setError(language === 'hi' ? 'क्यूआर कोड लोड करने में विफल।' : 'Failed to load QR code.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // 3. Simulated QR Scan Success Handler
  const handlePaymentSuccess = async () => {
    if (!paymentSession) return;
    setStep('PRINTING');

    // Speech trigger
    if (voiceAssist) {
      const msg = language === 'hi'
        ? 'भुगतान सफल रहा। कृपया प्रतीक्षा करें, हम आपका प्रमाण-पत्र प्रिंट कर रहे हैं।'
        : 'Payment successful. Please wait while we print your certificate.';
      speak(msg);
    }

    // Trigger spooled printer execution & privacy purge on server
    try {
      const response = await axiosInstance.post('/print/execute', {
        applicantName: form.applicantName,
        mobileNumber: form.mobileNumber,
        registrationNumber: form.registrationNumber,
        certificateType: form.certificateType,
        totalCopies: form.totalCopies,
        downloadedFileName: detectedFile?.fileName || 'certificate_download.pdf',
        amount: form.totalCopies * 20,
        transactionId: paymentSession.transactionId
      });

      setSpooledRecord(response.data);
      if (response.data.base64Pdf) {
        setBase64Pdf(response.data.base64Pdf);
      }
      setStep('SUCCESS');

      // Play final thank you synthesized cue
      if (voiceAssist) {
        const msg = language === 'hi'
          ? 'आपका प्रमाण-पत्र प्रिंट हो गया है। नागर निगम सेवा का उपयोग करने के लिए धन्यवाद।'
          : 'Your certificate is successfully printed. Thank you for using Nagar Nigam citizen services.';
        setTimeout(() => speak(msg), 1000);
      }

    } catch (err) {
      setStep('FORM');
      setError(err.message || 'Printing execution failed.');
    }
  };

  // Manual sandbox skip button for testing/debugging
  const triggerMockDownloadSuccess = () => {
    if (pollIntervalId) clearInterval(pollIntervalId);
    const mockFile = { fileName: `mock_download_${Date.now()}.pdf`, sizeBytes: 153020 };
    setDetectedFile(mockFile);
    triggerPaymentTransition(mockFile.fileName);
  };

  // ==========================================
  // 🎨 High Contrast Theme Helpers
  // ==========================================
  const textPrimary = "text-navy";
  const bgAccent = "bg-saffron";
  const borderAccent = "border-saffron";

  // Guard against non-print modal triggers
  if (activeModal !== 'print') return null;

  return (
    <div className="fixed inset-0 bg-black/75 z-[999] flex items-center justify-center p-6 backdrop-blur-md overflow-hidden select-none">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white w-full max-w-4xl h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between border-4 high-contrast:border-yellow-400"
      >
        {/* Header Ribbon */}
        <div className="bg-navy p-5 flex justify-between items-center text-white border-b-4 border-saffron high-contrast:border-yellow-400">
          <div className="flex items-center gap-3">
            <Printer className="w-8 h-8 text-saffron high-contrast:text-yellow-400" />
            <div>
              <h2 className="font-hindi text-2xl font-bold m-0 leading-tight">
                {dictionary[language].btn1_title.replace('<br>', ' ')}
              </h2>
              <p className="text-xs text-slate-300 font-rajdhani tracking-widest uppercase m-0 leading-none mt-1">
                Phase 4 — sandboxed secure printing
              </p>
            </div>
          </div>
          <button 
            onClick={handleClose} 
            className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-transform cursor-pointer"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        {/* Modal Scrollable Content Area */}
        <div className={`flex-1 overflow-y-auto p-8 relative flex flex-col ${step === 'FORM' ? 'justify-start pt-10' : 'justify-center'}`}>
          
          {/* STEP 1: CITIZEN REGISTRATION FORM */}
          {step === 'FORM' && (
            <motion.form 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              onSubmit={handleFormSubmit}
              className="max-w-2xl mx-auto w-full flex flex-col gap-5"
            >
              <h3 className="font-hindi text-3xl font-bold text-center text-navy mb-2 leading-none">
                {language === 'hi' ? 'कृपया मुद्रण जानकारी फ़ॉर्म भरें' : 'Please Fill Print Information Form'}
              </h3>

              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl flex items-center gap-3 text-red-700 font-bold font-rajdhani">
                  <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Grid Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Name */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600 font-rajdhani text-lg">
                    {language === 'hi' ? 'आवेदक का नाम (अंग्रेजी में)' : 'Applicant Name (in English)'}
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder={language === 'hi' ? 'उदा. Gaurav Sharma' : 'e.g. Gaurav Sharma'}
                    value={form.applicantName}
                    onChange={(e) => setForm({ ...form, applicantName: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                    className="p-4 border-2 border-slate-300 rounded-2xl text-xl font-bold text-navy bg-white focus:border-navy outline-none font-rajdhani uppercase"
                  />
                </div>

                {/* 2. Mobile */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600 font-rajdhani text-lg">
                    {language === 'hi' ? '10-अंकीय मोबाइल नंबर' : '10-Digit Mobile Number'}
                  </label>
                  <input 
                    type="tel"
                    maxLength={10}
                    required
                    placeholder="e.g. 98290XXXXX"
                    value={form.mobileNumber}
                    onChange={(e) => setForm({ ...form, mobileNumber: e.target.value.replace(/[^0-9]/g, '') })}
                    className="p-4 border-2 border-slate-300 rounded-2xl text-xl font-bold text-navy bg-white focus:border-navy outline-none font-rajdhani"
                  />
                </div>

                {/* 3. Registration Number */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600 font-rajdhani text-lg">
                    {language === 'hi' ? 'प्रमाण-पत्र पंजीकरण संख्या' : 'Certificate Registration Number'}
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. B-2026/89712"
                    value={form.registrationNumber}
                    onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                    className="p-4 border-2 border-slate-300 rounded-2xl text-xl font-bold text-navy bg-white focus:border-navy outline-none font-rajdhani uppercase"
                  />
                </div>

                {/* 4. Certificate Type Select */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600 font-rajdhani text-lg">
                    {language === 'hi' ? 'प्रमाण-पत्र का प्रकार' : 'Type of Certificate'}
                  </label>
                  <select 
                    value={form.certificateType}
                    onChange={(e) => setForm({ ...form, certificateType: e.target.value })}
                    className="p-4 border-2 border-slate-300 rounded-2xl text-xl font-bold text-navy bg-white focus:border-navy outline-none font-rajdhani"
                  >
                    <option value="BIRTH">{language === 'hi' ? 'जन्म प्रमाण-पत्र (Birth Certificate)' : 'Birth Certificate'}</option>
                    <option value="DEATH">{language === 'hi' ? 'मृत्यु प्रमाण-पत्र (Death Certificate)' : 'Death Certificate'}</option>
                    <option value="MARRIAGE">{language === 'hi' ? 'विवाह प्रमाण-पत्र (Marriage Certificate)' : 'Marriage Certificate'}</option>
                  </select>
                </div>
              </div>

              {/* copies selector bar */}
              <div className="flex flex-col gap-2 mt-2">
                <label className="font-semibold text-slate-600 font-rajdhani text-lg">
                  {language === 'hi' ? 'मुद्रण प्रतियों की संख्या (Copies Selection)' : 'Number of Printed Copies'}
                </label>
                <div className="flex gap-3 justify-between">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setForm({ ...form, totalCopies: num })}
                      className={`flex-1 p-4 rounded-2xl border-3 text-2xl font-bold font-rajdhani cursor-pointer transition-all active:scale-95 ${
                        form.totalCopies === num 
                          ? 'bg-navy border-saffron text-white shadow-md' 
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {num} {num === 1 ? (language === 'hi' ? 'प्रति' : 'Copy') : (language === 'hi' ? 'प्रतियां' : 'Copies')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit CTA button */}
              <button
                type="submit"
                className="mt-4 p-5 bg-navy text-white text-2xl font-bold font-rajdhani rounded-2xl flex items-center justify-center gap-3 border-2 border-saffron cursor-pointer active:scale-95 transition-all shadow-lg"
              >
                <span>{language === 'hi' ? 'विवरण सत्यापित करें और आगे बढ़ें' : 'Verify Details & Proceed'}</span>
                <ArrowRight className="w-6 h-6 text-saffron" />
              </button>
            </motion.form>
          )}

          {/* STEP 2: HOLD MODE PORTAL AUTO DETECTION */}
          {step === 'HOLD' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto w-full text-center flex flex-col items-center gap-6"
            >
              {/* Spinner */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                <div className="absolute inset-0 border-8 border-slate-200 rounded-full" />
                <div className="absolute inset-0 border-8 border-saffron border-t-transparent rounded-full animate-spin" />
                <FileText className="w-10 h-10 text-navy" />
              </div>

              <div>
                <h3 className="font-hindi text-3xl font-bold text-navy m-0 leading-tight">
                  {language === 'hi' ? 'पोर्टल विंडो सक्रिय है' : 'Pehchan Portal Window Opened'}
                </h3>
                <p className="text-xl text-slate-500 font-semibold font-rajdhani mt-2 leading-snug">
                  {language === 'hi' 
                    ? 'एक नया ब्राउज़र टैब खुल गया है। कृपया वहां जाकर अपना प्रमाण-पत्र डाउनलोड करें। मुद्रण फ़ाइल मिलने पर कियोस्क स्वतः आगे बढ़ेगा।' 
                    : 'A new browser tab has been opened. Please download your certificate there. The kiosk will auto-advance once the file is detected.'}
                </p>
              </div>

              {/* Warning/Privacy notice banner */}
              <div className="w-full bg-saffron/10 border-2 border-saffron/30 rounded-2xl p-4 flex gap-3 text-left items-start text-navy">
                <AlertTriangle className="w-6 h-6 text-saffron flex-shrink-0 mt-0.5" />
                <div className="text-sm font-semibold font-rajdhani">
                  <p className="font-bold m-0 leading-none">SECURITY WARNING / सुरक्षा चेतावनी</p>
                  <p className="m-0 leading-tight mt-1 text-slate-600">
                    To maintain absolute confidentiality, your downloaded document is processed within a secure local sandbox and is permanently deleted instantly after printing.
                  </p>
                </div>
              </div>

              {/* Testing / demonstration helper buttons */}
              <div className="flex gap-4 w-full mt-4 justify-between border-t border-slate-200 pt-6">
                <button
                  onClick={() => setStep('FORM')}
                  className="px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl active:scale-95 transition-transform flex items-center gap-2 cursor-pointer font-rajdhani"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>{language === 'hi' ? 'पीछे जाएं' : 'Go Back'}</span>
                </button>
                
                <button
                  onClick={triggerMockDownloadSuccess}
                  className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center gap-2 cursor-pointer font-rajdhani"
                >
                  <Check className="w-5 h-5" />
                  <span>{language === 'hi' ? 'अनुकरण: फ़ाइल डाउनलोड सफल (Simulate)' : 'Simulate Download Success'}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: DYNAMIC UPI PAYMENT SCREEN */}
          {step === 'PAYMENT' && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl mx-auto w-full flex flex-col md:flex-row gap-8 items-center bg-white p-8 rounded-3xl shadow-lg border border-slate-100"
            >
              {/* Left Column: QR Card */}
              <div className="flex-1 flex flex-col items-center gap-4 text-center">
                <div className="relative w-64 h-64 bg-slate-50 border-3 border-navy rounded-2xl flex items-center justify-center p-4">
                  {paymentLoading ? (
                    <div className="w-12 h-12 border-4 border-navy border-t-transparent rounded-full animate-spin" />
                  ) : paymentSession?.qrCodeUrl ? (
                    <img 
                      src={paymentSession.qrCodeUrl} 
                      alt="UPI QR Code" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <QrCode className="w-20 h-20 text-slate-300 animate-pulse" />
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-slate-500 font-semibold font-rajdhani text-sm">
                  <CreditCard className="w-4 h-4" />
                  <span>UPI ID: nagarnigam.kiosk@sbi</span>
                </div>
              </div>

              {/* Right Column: Statement Details */}
              <div className="flex-1 w-full flex flex-col justify-between gap-5 text-navy">
                <div>
                  <span className="font-bebas text-lg tracking-widest text-saffron uppercase">invoice summary</span>
                  <h3 className="font-hindi text-3xl font-bold leading-none mt-1">
                    {language === 'hi' ? 'भुगतान विवरण' : 'Payment Details'}
                  </h3>
                </div>

                <div className="flex flex-col gap-2 font-rajdhani border-y border-slate-100 py-4">
                  <div className="flex justify-between font-semibold text-slate-600 text-lg">
                    <span>{language === 'hi' ? 'सेवा का प्रकार' : 'Service Type'}:</span>
                    <span className="text-navy uppercase">{form.certificateType} PRINT</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-600 text-lg">
                    <span>{language === 'hi' ? 'मुद्रण प्रतियां' : 'Number of Copies'}:</span>
                    <span className="text-navy">{form.totalCopies}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-600 text-lg">
                    <span>{language === 'hi' ? 'शुल्क प्रति प्रति' : 'Rate per Copy'}:</span>
                    <span className="text-navy">₹20.00</span>
                  </div>
                </div>

                {/* Total amount due */}
                <div className="flex justify-between items-baseline font-rajdhani">
                  <span className="text-lg font-bold text-slate-500">{language === 'hi' ? 'कुल देय राशि' : 'Total Due'}:</span>
                  <span className="text-5xl font-extrabold text-navy leading-none">
                    ₹{form.totalCopies * 20}.00
                  </span>
                </div>

                {/* Simulated Success buttons */}
                <button
                  onClick={handlePaymentSuccess}
                  disabled={paymentLoading || !paymentSession}
                  className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xl rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-3 cursor-pointer shadow-md font-rajdhani disabled:opacity-50"
                >
                  <Check className="w-6 h-6" />
                  <span>{language === 'hi' ? 'अनुकरण: भुगतान सफल (Simulate)' : 'Simulate Payment Success'}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: PRINT SPOOL LOADER */}
          {step === 'PRINTING' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-md mx-auto w-full text-center flex flex-col items-center gap-6"
            >
              <div className="w-24 h-24 bg-navy text-white rounded-full flex items-center justify-center shadow-lg">
                <Printer className="w-12 h-12 text-saffron animate-bounce" />
              </div>
              
              <div>
                <h3 className="font-hindi text-3xl font-bold text-navy m-0 leading-tight">
                  {language === 'hi' ? 'दस्तावेज़ मुद्रित किया जा रहा है...' : 'Printing Document...'}
                </h3>
                <p className="text-xl text-slate-500 font-semibold font-rajdhani mt-2">
                  {language === 'hi' 
                    ? 'कृपया प्रतीक्षा करें। प्रिंटर spooled हो रहा है और आपकी प्रतियां तैयार कर रहा है।' 
                    : 'Please wait. Spooling hardware rolls and producing your copies.'}
                </p>
              </div>
              
              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2.5, ease: 'easeInOut' }}
                  className="h-full bg-gradient-to-r from-saffron to-green-custom"
                />
              </div>
            </motion.div>
          )}

          {/* STEP 5: VISUAL THERMAL RECEIPT SUCCESS */}
          {step === 'SUCCESS' && spooledRecord && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto w-full flex flex-col items-center gap-6"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-emerald-600" />
              </div>

              <div>
                <h3 className="font-hindi text-3xl font-bold text-emerald-600 m-0 leading-tight">
                  {language === 'hi' ? 'मुद्रण सफलतापूर्वक संपन्न!' : 'Printed Successfully!'}
                </h3>
                <p className="text-slate-500 font-semibold font-rajdhani text-lg mt-1 m-0">
                  Your printed copies are ready at the feed tray!
                </p>
              </div>

              {/* Glassmorphic Simulated thermal receipt */}
              <div className="w-full bg-white border-2 border-dashed border-slate-300 rounded-3xl p-6 shadow-md text-navy font-mono text-sm leading-relaxed text-left">
                <div className="text-center border-b-2 border-dashed border-slate-200 pb-3 mb-3">
                  <p className="font-bold text-base uppercase leading-none">nagar nigam jaipur</p>
                  <p className="text-xs uppercase text-slate-400 mt-1 leading-none">citizen service kiosk</p>
                </div>

                <div className="flex flex-col gap-1.5 font-rajdhani font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span>Tx Reference ID:</span>
                    <span className="text-navy font-bold font-mono">{paymentSession?.transactionId.substring(0, 15)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reg Number:</span>
                    <span className="text-navy font-bold font-mono">{form.registrationNumber.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Applicant Name:</span>
                    <span className="text-navy font-bold uppercase">{form.applicantName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Certificate Type:</span>
                    <span className="text-navy font-bold uppercase">{form.certificateType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Printed Copies:</span>
                    <span className="text-navy font-bold">{form.totalCopies}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-2 font-bold text-base text-navy">
                    <span>Total Amount Paid:</span>
                    <span>₹{form.totalCopies * 20}.00</span>
                  </div>
                </div>

                <div className="text-center border-t-2 border-dashed border-slate-200 pt-3 mt-4 text-xs text-emerald-600 font-bold uppercase font-rajdhani">
                  sandbox pdf purged successfully
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full mt-2 p-4 bg-navy text-white text-xl font-bold font-rajdhani rounded-2xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <RotateCcw className="w-5 h-5 text-saffron" />
                <span>{language === 'hi' ? 'मुख्य स्क्रीन पर लौटें' : 'Finish & Close'}</span>
              </button>
            </motion.div>
          )}

        </div>

        {/* Footer help ribbon */}
        <div className="bg-slate-100 p-4 text-center border-t border-slate-200 text-slate-500 font-rajdhani text-sm font-semibold flex justify-center gap-2">
          <span>{language === 'hi' ? 'मदद के लिए डायल करें: 1800-XXX-XXXX' : 'Need assistance? Dial helpline: 1800-XXX-XXXX'}</span>
        </div>
      {/* 🖨️ PHYSICAL THERMAL RECEIPT PRINT AREA */}
      {spooledRecord && createPortal(
        <div className="hidden print:block w-[80mm] p-[10px] text-black font-mono text-[12px] leading-relaxed">
          <div className="text-center border-b border-dashed border-black pb-2 mb-2">
            <h3 className="font-bold text-[16px] uppercase m-0">NAGAR NIGAM KIOSK</h3>
            <p className="text-[10px] m-0 uppercase mt-0.5">CITIZEN SERVICE CENTER</p>
          </div>
          <div className="flex flex-col gap-1 border-b border-dashed border-black pb-2 mb-2">
            <div><strong>DATE:</strong> {new Date().toLocaleString()}</div>
            <div><strong>SERVICE:</strong> CERTIFICATE PRINT</div>
            <div><strong>REG NO:</strong> {form.registrationNumber.toUpperCase()}</div>
            <div><strong>APPLICANT:</strong> {form.applicantName.toUpperCase()}</div>
            <div><strong>MOBILE:</strong> {form.mobileNumber}</div>
            <div><strong>CERT TYPE:</strong> {form.certificateType.toUpperCase()}</div>
            <div><strong>COPIES:</strong> {form.totalCopies}</div>
            <div><strong>AMOUNT:</strong> ₹{form.totalCopies * 20}.00</div>
            <div><strong>TXN ID:</strong> {paymentSession?.transactionId}</div>
          </div>
          <div className="text-center py-4 border-b border-dashed border-black mb-2">
            <span className="text-[12px] font-bold block uppercase font-bold">PAYMENT SUCCESSFUL</span>
            <span className="text-[10px] block mt-1 uppercase font-bold">SANDBOX FILE PURGED SECURELY</span>
          </div>
          <div className="text-center text-[10px] uppercase font-bold pt-2">
            Please collect your copies.<br/>Thank you for using civic services!
          </div>
        </div>,
        document.body
      )}
      </motion.div>
    </div>
  );
}
