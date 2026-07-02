import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAdminStore } from '../../store/adminStore.js';
import { useKioskStore } from '../../store/kioskStore.js';
import axiosInstance from '../../api/axiosInstance.js';
import { 
  Camera, Check, FileText, CreditCard, Printer, Search, 
  Users, AlertCircle, ArrowRight, ShieldCheck, 
  RotateCcw, RefreshCw, Eye
} from 'lucide-react';

export default function MarriageOperations() {
  const { 
    activeTokenProcess, 
    setProcessingToken, 
    submitApplication, 
    callNextToken,
    clearActiveTokenProcess,
    queue,
    tokens,
    searchObjectionApplication
  } = useAdminStore();
  const { language } = useKioskStore();

  // Wizard state
  const [tokenInput, setTokenInput] = useState('');
  const [step, setStep] = useState('VERIFICATION'); // VERIFICATION, DETAILS, SCANNING, PAYMENT, COMPLETE
  
  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [scanCameraActive, setScanCameraActive] = useState(false);
  const [selfieSrc, setSelfieSrc] = useState(null); // Used for combined photo
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanPollIntervalRef = useRef(null);

  useEffect(() => {
    let activeStream = null;
    const initCam = async () => {
      if (cameraActive) {
        try {
          activeStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
          if (videoRef.current) {
            videoRef.current.srcObject = activeStream;
          }
        } catch (err) {
          console.warn("No webcam connected, activating camera simulator fallback.", err);
        }
      }
    };
    initCam();
    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraActive]);

  useEffect(() => {
    return () => {
      if (scanPollIntervalRef.current) {
        clearInterval(scanPollIntervalRef.current);
      }
    };
  }, []);

  // Form Details
  const [formData, setFormData] = useState({
    applicantName: '',
    mobileNumber: '',
    relationWithApplicant: 'Self',
    dob: ''
  });

  // Custom Marriage Details
  const [marriageData, setMarriageData] = useState({
    groomName: '',
    groomDob: '',
    groomFather: '',
    brideName: '',
    brideDob: '',
    brideFather: '',
    placeOfMarriage: '',
    dom: '' // Date of Marriage
  });

  // Scanning state
  const [scanning, setScanning] = useState(false);
  const [scannedFiles, setScannedFiles] = useState({});

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, UPI_QR
  const [paying, setPaying] = useState(false);
  const [enrollmentResult, setEnrollmentResult] = useState(null);
  const [cashCollected, setCashCollected] = useState(false);

  // Auto-fill joint photo scan if camera photo taken
  useEffect(() => {
    if (selfieSrc) {
      setScannedFiles(prev => ({
        ...prev,
        "Joint photograph of Bride & Groom (वर-वधू का संयुक्त चित्र)": "Captured_Combined_Photo.jpg"
      }));
    }
  }, [selfieSrc]);

  // Reset states on active token change
  useEffect(() => {
    if (activeTokenProcess) {
      setStep('VERIFICATION');
      setSelfieSrc(null);
      setFormData({
        applicantName: '',
        mobileNumber: '',
        relationWithApplicant: 'Self',
        dob: ''
      });
      setMarriageData({
        groomName: '',
        groomDob: '',
        groomFather: '',
        brideName: '',
        brideDob: '',
        brideFather: '',
        placeOfMarriage: '',
        dom: ''
      });
      setScannedFiles({});
      setEnrollmentResult(null);
      setCashCollected(false);
    }
  }, [activeTokenProcess]);

  const handleStartNewRegistration = () => {
    const mockToken = {
      tokenNumber: 'GENERATE_MARRIAGE_TOKEN',
      block: 'marriage',
      serviceType: 'new_registration',
      createdAt: new Date().toISOString(),
      isReSubmission: false
    };
    useAdminStore.setState({ activeTokenProcess: mockToken });
    setStep('VERIFICATION');
  };

  const handleSearchObjectionApp = () => {
    if (!tokenInput.trim()) return;
    searchObjectionApplication(tokenInput.toUpperCase().trim())
      .then(app => {
        const mockToken = {
          tokenNumber: app.token_number,
          block: app.department_block.toLowerCase(),
          serviceType: app.service_type.toLowerCase(),
          createdAt: app.created_at,
          isReSubmission: true,
          originalApp: app
        };

        setFormData({
          applicantName: app.applicant_name,
          mobileNumber: app.mobile_number,
          relationWithApplicant: app.relation_with_applicant || 'Self',
          dob: app.dob || ''
        });

        const savedDocs = app.uploaded_documents || [];
        const docList = {};
        savedDocs.forEach((doc) => {
          docList[doc] = doc;
        });
        setScannedFiles(docList);

        const details = app.correction_details || [];
        const getValue = (name) => {
          const found = details.find(d => d.fieldName === name);
          return found ? found.newValue : '';
        };

        setMarriageData({
          groomName: getValue("Groom's Full Name") || getValue("Groom Name") || app.applicant_name,
          groomDob: getValue("Groom Date of Birth") || getValue("Groom DOB") || '',
          groomFather: getValue("Groom Father") || getValue("Father's Name") || app.father_name || '',
          brideName: getValue("Bride's Full Name") || getValue("Bride Name") || '',
          brideDob: getValue("Bride Date of Birth") || getValue("Bride DOB") || '',
          brideFather: getValue("Bride Father") || '',
          placeOfMarriage: getValue("Place of Solemnization") || getValue("Place of Marriage") || '',
          dom: getValue("Date of Marriage") || getValue("Date of Birth") || app.dob || ''
        });

        setSelfieSrc(app.selfie_url);

        useAdminStore.setState({ activeTokenProcess: mockToken });
        setStep('VERIFICATION');
      })
      .catch(err => {
        alert(err.message || 'No application under objection found');
      });
  };

  const startCamera = () => {
    setSelfieSrc(null);
    setCameraActive(true);
  };

  const captureCamera = async () => {
    let dataUrl = "";
    if (videoRef.current && videoRef.current.srcObject) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg');
        
        // Stop stream
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
        setCameraActive(false);
      }
    } else {
      // Create a simulated photo on canvas
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      // Create a gradient background
      const grad = ctx.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, '#4f46e5');
      grad.addColorStop(1, '#06b6d4');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);
      
      // Draw simulated frame and text
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 600, 440);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MUNICIPAL KIOSK CAMERA FEED', 320, 200);
      ctx.font = '22px sans-serif';
      ctx.fillText('Captured Joint Photo of Groom & Bride', 320, 250);
      ctx.fillText('Simulation Successful', 320, 290);
      
      dataUrl = canvas.toDataURL('image/jpeg');
      setCameraActive(false);
    }
    
    if (dataUrl) {
      setSelfieSrc(dataUrl);
      try {
        const base64Data = dataUrl.split(',')[1];
        await axiosInstance.post('/applications/upload-scan', {
          fileName: "Captured_Combined_Photo.jpg",
          base64Data
        });
      } catch (err) {
        console.error("Failed to upload captured camera photo to scans directory:", err);
      }
    }
  };

  // Required documents
  const getRequiredDocumentsList = () => {
    return [
      "Joint photograph of Bride & Groom (वर-वधू का संयुक्त चित्र)",
      "Marriage Application Form - Front Side (विवाह आवेदन पत्र - मुख्य पृष्ठ)",
      "Marriage Application Form - Back Side (विवाह आवेदन पत्र - अंतिम पृष्ठ)"
    ];
  };

  // Fee calculation according to marriage slabs
  const calculateWizardFee = () => {
    const items = [];
    const dom = marriageData.dom || '';
    const marriageDate = dom ? new Date(dom) : null;
    const cutoffDate2006 = new Date('2006-05-22');
    const daysSinceMarriage = marriageDate ? Math.floor((new Date() - marriageDate) / (1000 * 60 * 60 * 24)) : 0;

    const match = activeTokenProcess?.correction_record?.remarks?.match(/COPIES:\s*(\d+)/);
    const copies = match ? parseInt(match[1]) : 1;

    if (marriageDate && marriageDate < cutoffDate2006) {
      items.push({ label: 'Marriage Registration Fee (Before 22.05.2006) (विवाह पंजीकरण शुल्क)', amount: 120 });
    } else if (daysSinceMarriage <= 30) {
      items.push({ label: 'Marriage Registration Fee (Within 1 Month) (विवाह पंजीकरण शुल्क)', amount: 110 });
    } else {
      items.push({ label: 'Marriage Registration Fee (After 1 Month) (विवाह पंजीकरण शुल्क)', amount: 200 });
    }

    const total = items.reduce((sum, item) => sum + item.amount, 0);
    return { items, total };
  };

  const getOfficialDocFileName = (docName) => {
    let englishName = docName.split('(')[0].trim();
    let cleanName = englishName
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .trim()
      .replace(/\s+/g, '_');
    return `${cleanName}.pdf`;
  };

  const triggerScanFile = async (docName) => {
    if (scanPollIntervalRef.current) {
      clearInterval(scanPollIntervalRef.current);
      scanPollIntervalRef.current = null;
    }
    
    setScanning(docName);
    const targetFileName = getOfficialDocFileName(docName);
    
    try {
      // 1. Try to trigger the physical scanner directly
      const res = await axiosInstance.post('/applications/trigger-physical-scan', {
        targetFileName
      });
      
      if (res.data && res.data.success) {
        setScannedFiles(prev => ({
          ...prev,
          [docName]: targetFileName
        }));
        setScanning(false);
        return;
      }
    } catch (err) {
      console.warn("Physical scan failed, falling back to folder polling: ", err);
      const errMsg = err.response?.data?.message || err.message || "Scanner offline";
      alert(`PHYSICAL SCANNER ERROR:\n${errMsg}\n\nFalling back to folder monitoring mode. Please scan document using Epson Scan 2 and save it to temp/scans, or click "Bypass & Use Demo Mock File".`);
    }
    
    // 2. Fallback to folder-polling loop
    const startTime = Date.now();
    const pollTimeout = 60000; // Timeout after 60 seconds
    
    const intervalId = setInterval(async () => {
      if (Date.now() - startTime > pollTimeout) {
        clearInterval(intervalId);
        scanPollIntervalRef.current = null;
        
        console.warn("Scan polling timed out. Falling back to mock file.");
        const officialName = getOfficialDocFileName(docName);
        setScannedFiles(prev => ({
          ...prev,
          [docName]: officialName
        }));
        setScanning(false);
        return;
      }
      
      try {
        const res = await axiosInstance.get('/applications/detect-scan');
        const data = res.data;
        if (data && data.detected) {
          clearInterval(intervalId);
          scanPollIntervalRef.current = null;
          
          const tempFileName = data.fileName;
          const targetFileName = getOfficialDocFileName(docName);
          
          await axiosInstance.post('/applications/save-scan', {
            tempFileName,
            targetFileName
          });
          
          setScannedFiles(prev => ({
            ...prev,
            [docName]: targetFileName
          }));
          setScanning(false);
        }
      } catch (err) {
        console.error("Failed to poll detect-scan endpoint: ", err);
      }
    }, 2000);
    
    scanPollIntervalRef.current = intervalId;
  };

  const handleChecklistScanClick = (doc) => {
    if (doc === "Joint photograph of Bride & Groom (वर-वधू का संयुक्त चित्र)") {
      setScanCameraActive(true);
      startCamera();
    } else {
      triggerScanFile(doc);
    }
  };

  const handleBypassScan = () => {
    if (scanPollIntervalRef.current) {
      clearInterval(scanPollIntervalRef.current);
      scanPollIntervalRef.current = null;
    }
    if (scanning) {
      const docName = scanning;
      const officialName = getOfficialDocFileName(docName);
      setScannedFiles(prev => ({
        ...prev,
        [docName]: officialName
      }));
      setScanning(false);
    }
  };

  // Submission handler
  const handleSubmission = () => {
    const requiredDocs = getRequiredDocumentsList();
    const missingDocs = requiredDocs.filter(d => !scannedFiles[d]);
    if (missingDocs.length > 0) {
      alert(`Missing documents: ${missingDocs.join(', ')}`);
      return;
    }

    setPaying(true);
    const feeBreakdown = calculateWizardFee();

    const applicationPayload = {
      tokenNumber: activeTokenProcess.tokenNumber,
      departmentBlock: 'MARRIAGE',
      serviceType: 'NEW_REGISTRATION',
      selfieUrl: selfieSrc || "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=150",
      commonDetails: {
        applicantName: marriageData.groomName,
        mobileNumber: formData.mobileNumber || "9829XXXXXX",
        registrationNumber: 'NEW-REGISTRATION',
        fatherName: marriageData.groomFather,
        motherName: formData.motherName || '---',
        dob: marriageData.dom,
      },
      // Save details for checker/approver.
      // Combined photo MUST be injected here as fieldName: 'combinedPhoto' so Checker/Approval dashboards extract it!
      correctionFields: [
        { fieldName: 'Registration Category', oldValue: '---', newValue: 'NEW_REGISTRATION' },
        { fieldName: "Groom's Full Name", oldValue: '---', newValue: marriageData.groomName },
        { fieldName: 'Groom DOB', oldValue: '---', newValue: marriageData.groomDob },
        { fieldName: 'Groom Father', oldValue: '---', newValue: marriageData.groomFather },
        { fieldName: "Bride's Full Name", oldValue: '---', newValue: marriageData.brideName },
        { fieldName: 'Bride DOB', oldValue: '---', newValue: marriageData.brideDob },
        { fieldName: 'Bride Father', oldValue: '---', newValue: marriageData.brideFather },
        { fieldName: 'Date of Marriage', oldValue: '---', newValue: marriageData.dom },
        { fieldName: 'Place of Solemnization', oldValue: '---', newValue: marriageData.placeOfMarriage },
        { fieldName: 'combinedPhoto', oldValue: '---', newValue: selfieSrc || "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=150" }
      ],
      correctionType: 'NEW_REGISTRATION',
      uploadedDocuments: Object.values(scannedFiles),
      paymentDetails: {
        method: paymentMethod,
        amount: feeBreakdown.total,
        status: 'SUCCESS', // Offline cash/UPI payments processed immediately at the counter
        transactionId: `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`
      }
    };

    submitApplication(applicationPayload)
      .then((result) => {
        setEnrollmentResult({
          ...result,
          enrollmentId: result.enrollment_id,
          tokenNumber: activeTokenProcess.tokenNumber,
          departmentBlock: 'MARRIAGE',
          serviceType: 'NEW_REGISTRATION',
          commonDetails: applicationPayload.commonDetails,
          uploadedDocuments: applicationPayload.uploadedDocuments,
          paymentDetails: applicationPayload.paymentDetails,
          correctionFields: applicationPayload.correctionFields,
          feeItems: feeBreakdown.items
        });
        setPaying(false);
        setStep('COMPLETE');
      })
      .catch((err) => {
        setPaying(false);
        alert(`Error submitting application: ${err.message}`);
      });
  };

  const handleCloseProcess = () => {
    setStep('VERIFICATION');
    setSelfieSrc(null);
    setFormData({
      applicantName: '',
      mobileNumber: '',
      relationWithApplicant: 'Self',
      dob: ''
    });
    setMarriageData({
      groomName: '',
      groomAge: '',
      groomFather: '',
      brideName: '',
      brideAge: '',
      brideFather: '',
      placeOfMarriage: '',
      dom: ''
    });
    setScannedFiles({});
    setEnrollmentResult(null);
    clearActiveTokenProcess();
  };

  const handlePrintEnrollmentSlip = () => {
    window.print();
  };

  const requiredDocuments = getRequiredDocumentsList();
  const feeInfo = calculateWizardFee();

  const renderPrintVoucher = (copyTitle) => {
    if (!enrollmentResult) return null;
    return (
      <div className="w-full p-10 flex flex-col justify-between" style={{ minHeight: '297mm', boxSizing: 'border-box' }}>
        <div>
          <div className="flex items-center justify-between border-b-4 border-black pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 border border-black flex items-center justify-center font-bold text-2xl">NN</div>
              <div>
                <h2 className="text-2xl font-bold uppercase m-0 leading-none">nagar nigam jaipur (greater)</h2>
                <span className="text-xs uppercase font-bold tracking-wider text-slate-500 mt-1 block">marriage registry center</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm uppercase block font-bold">{copyTitle}</span>
              <span className="text-xs uppercase block font-medium mt-1">enrollment voucher</span>
              <span className="text-lg font-bold font-mono block mt-1">{enrollmentResult.enrollmentId}</span>
            </div>
          </div>

          <h3 className="text-center font-bold uppercase text-lg border-b pb-2 mb-6">Marriage Registration Enrollment Acknowledgement</h3>

          <div className="grid grid-cols-2 gap-6 text-sm mb-6 pb-6 border-b">
            <div>
              <p className="my-1.5"><strong>Enrollment Number:</strong> {enrollmentResult.enrollmentId}</p>
              <p className="my-1.5"><strong>Counter Token Number:</strong> {enrollmentResult.tokenNumber}</p>
              <p className="my-1.5"><strong>Issued Date:</strong> {new Date(enrollmentResult.submittedAt || Date.now()).toLocaleString('en-IN')}</p>
              <p className="my-1.5"><strong>Department Block:</strong> MARRIAGE</p>
              <p className="my-1.5"><strong>Application Type:</strong> NEW REGISTRATION</p>
            </div>
            <div>
              <p className="my-1.5"><strong>Groom's Name:</strong> {marriageData.groomName.toUpperCase()}</p>
              <p className="my-1.5"><strong>Bride's Name:</strong> {marriageData.brideName.toUpperCase()}</p>
              <p className="my-1.5"><strong>Date of Marriage:</strong> {marriageData.dom}</p>
              <p className="my-1.5"><strong>Place of Solemnization:</strong> {marriageData.placeOfMarriage.toUpperCase()}</p>
              <p className="my-1.5"><strong>Applicant Contact:</strong> {formData.mobileNumber || enrollmentResult.commonDetails.mobileNumber}</p>
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className="mb-6">
            <h4 className="font-bold uppercase text-sm border-b pb-1.5 mb-3 font-sans">Fee Breakdown (शुल्क विवरण)</h4>
            <table className="w-full text-sm border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 p-2 text-left">Particular Description</th>
                  <th className="border border-slate-300 p-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {enrollmentResult.feeItems && enrollmentResult.feeItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-slate-300 p-2 font-bold">{item.label}</td>
                    <td className="border border-slate-300 p-2 text-right font-mono font-bold">₹{item.amount.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-extrabold">
                  <td className="border border-slate-300 p-2 text-right uppercase">Total Paid Fee:</td>
                  <td className="border border-slate-300 p-2 text-right font-mono" style={{ color: '#059669' }}>
                    ₹{enrollmentResult.paymentDetails.amount?.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          {enrollmentResult.paymentDetails.method === 'CASH' ? (
            <div className="mt-12 flex justify-between text-xs font-semibold pt-12 border-t border-dashed">
              <div className="text-center">
                <div className="w-32 border-b border-black mb-2 mx-auto" />
                <span>Husband & Wife Signature</span>
              </div>
              <div className="text-center">
                <div className="w-32 border-b border-black mb-2 mx-auto" />
                <span>Registrar Signature & Stamp</span>
              </div>
            </div>
          ) : (
            <div className="mt-8 text-center text-xs font-semibold pt-4 border-t border-dashed text-slate-500 italic">
              * This is a digitally generated acknowledgement. No signature or stamp is required.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-5 md:p-8 flex flex-col font-rajdhani text-left min-h-[500px]">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-navy m-0 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-purple-600" />
            Marriage Registration Counter (विवाह पंजीकरण पटल)
          </h2>
          <p className="text-sm font-semibold text-slate-400 m-0 mt-1 uppercase tracking-widest leading-none">
            Dedicated Marriage Registration Processing Terminal
          </p>
        </div>

        {activeTokenProcess && (
          <div className="px-4 py-2 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2 font-bold text-purple-700 text-lg animate-pulse">
            <span className="w-2.5 h-2.5 bg-purple-600 rounded-full" />
            <span>Serving: {activeTokenProcess.tokenNumber}</span>
          </div>
        )}
      </div>

      {/* STEP 1: VERIFICATION & PORTRAIT CAPTURE */}
      {step === 'VERIFICATION' && (
        <div className="flex flex-col gap-6">
          {!activeTokenProcess ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              
              {/* Option A: Start New Registration */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 p-8 rounded-3xl flex flex-col justify-between gap-5 shadow-sm">
                <div className="flex flex-col gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 mb-2">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="m-0 text-purple-800 font-bold text-xl">Start New Registration</h3>
                  <p className="text-sm text-slate-500 font-semibold leading-relaxed m-0">
                    Process a new marriage registration directly at the counter. The token number will be generated automatically upon successful submission.
                  </p>
                </div>
                
                <button
                  onClick={handleStartNewRegistration}
                  className="py-3.5 bg-purple-600 hover:bg-purple-700 text-white text-md font-bold rounded-xl active:scale-95 transition-transform cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <span>Begin Registration Desk</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Option B: Retrieve Objection Application */}
              <div className="bg-slate-50 border border-slate-200 p-8 rounded-3xl flex flex-col justify-between gap-5 shadow-sm">
                <div className="flex flex-col gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-600 mb-2">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="m-0 text-navy font-bold text-xl">Retrieve Objection File</h3>
                  <p className="text-sm text-slate-500 font-semibold leading-relaxed m-0">
                    Search and reload an application previously flagged with an objection by the Checker to modify details or scan documents.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Token or Enrollment ID"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl text-md font-bold text-navy focus:border-navy uppercase outline-none"
                  />
                  <button
                    onClick={handleSearchObjectionApp}
                    className="px-6 bg-navy text-white hover:bg-slate-800 text-md font-bold rounded-xl active:scale-95 transition-transform cursor-pointer shadow-md flex items-center gap-2"
                  >
                    <span>Retrieve</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch mt-2">
              {/* Token Specs */}
              <div className="flex flex-col gap-6 bg-white p-7 border border-slate-200 shadow-sm rounded-2xl justify-between">
                <div>
                  <h3 className="m-0 text-navy font-bold text-xl uppercase">Verify Identity & Token</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 m-0">
                    Review active marriage token details
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 text-sm font-semibold border-y py-5 my-1 leading-relaxed">
                  <div>
                    <span className="text-slate-400 block uppercase text-xs font-bold tracking-wider">Token Number</span>
                    <span className="text-xl font-extrabold text-navy mt-1 block">
                      {activeTokenProcess.tokenNumber === 'GENERATE_MARRIAGE_TOKEN' 
                        ? 'TKN-MAR-REG-XXXX-XXX (to be generated)' 
                        : activeTokenProcess.tokenNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase text-xs font-bold tracking-wider">Department Block</span>
                    <span className="text-2xl font-extrabold text-navy uppercase mt-1 block">MARRIAGE</span>
                  </div>
                  <div className="mt-4">
                    <span className="text-slate-400 block uppercase text-xs font-bold tracking-wider">Service Type</span>
                    <span className="text-2xl font-extrabold text-purple-600 uppercase mt-1 block">NEW REGISTRATION</span>
                  </div>
                  <div className="mt-4">
                    <span className="text-slate-400 block uppercase text-xs font-bold tracking-wider">Issued Time</span>
                    <span className="text-lg font-bold text-slate-500 font-mono mt-1 block">
                      {activeTokenProcess.tokenNumber === 'GENERATE_MARRIAGE_TOKEN'
                        ? 'Pending generation'
                        : new Date(activeTokenProcess.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex gap-3 text-sm font-semibold">
                  <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-extrabold block uppercase text-[11px] tracking-wider leading-none mb-1 text-emerald-700">Token Verified</span>
                    {activeTokenProcess.tokenNumber === 'GENERATE_MARRIAGE_TOKEN'
                      ? 'New counter registration session active. Please take a joint photograph of the Groom and Bride to proceed.'
                      : 'Active marriage ticket successfully loaded. Please take a joint photograph of the Groom and Bride to proceed.'}
                  </div>
                </div>
              </div>

              {/* Joint Photo Capture */}
              <div className="flex flex-col gap-6 bg-white p-7 border border-slate-200 shadow-sm rounded-2xl justify-between min-h-[400px]">
                <div>
                  <h3 className="m-0 text-navy font-bold text-xl uppercase">Combined Marriage Photo</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 m-0">
                    Capture a joint photograph of both Groom and Bride at this counter
                  </p>
                </div>

                <div className="flex flex-col items-center gap-5 my-2">
                  <div className="w-72 h-52 bg-slate-950 border-2 border-slate-800 rounded-2xl relative flex items-center justify-center overflow-hidden shadow-inner">
                    {selfieSrc ? (
                      <img src={selfieSrc} alt="Groom & Bride" className="w-full h-full object-cover" />
                    ) : cameraActive ? (
                      <video ref={videoRef} autoPlay className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-600 gap-2">
                        <Camera className="w-12 h-12 animate-pulse" />
                        <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">Integrated Camera Offline</span>
                      </div>
                    )}
                    
                    <canvas ref={canvasRef} className="hidden" />

                    {cameraActive && (
                      <div className="absolute inset-0 border-2 border-purple-400 rounded-2xl pointer-events-none flex flex-col justify-between p-3.5">
                        <div className="flex justify-between">
                          <span className="w-4 h-4 border-t-2 border-l-2 border-purple-400" />
                          <span className="w-4 h-4 border-t-2 border-r-2 border-purple-400" />
                        </div>
                        <div className="w-full text-center text-[10px] text-purple-400 font-extrabold uppercase tracking-widest bg-slate-950/60 py-0.5 animate-pulse rounded-md">
                          CAPTURE BOTH GROOM & BRIDE
                        </div>
                        <div className="flex justify-between">
                          <span className="w-4 h-4 border-b-2 border-l-2 border-purple-400" />
                          <span className="w-4 h-4 border-b-2 border-r-2 border-purple-400" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {!cameraActive && !selfieSrc ? (
                      <button 
                        onClick={startCamera}
                        className="px-6 py-3 bg-purple-600 text-white text-md font-bold rounded-xl active:scale-95 transition-transform flex items-center gap-2 cursor-pointer border border-purple-700 shadow-md hover:bg-purple-700"
                      >
                        <Camera className="w-4 h-4 text-white" />
                        <span>Launch Camera</span>
                      </button>
                    ) : cameraActive ? (
                      <button 
                        onClick={captureCamera}
                        className="px-6 py-3 bg-emerald-600 text-white text-md font-bold rounded-xl active:scale-95 transition-transform flex items-center gap-2 cursor-pointer shadow-md border border-emerald-400 hover:bg-emerald-700"
                      >
                        <Check className="w-4 h-4" />
                        <span>Capture Photo</span>
                      </button>
                    ) : (
                      <button 
                        onClick={startCamera}
                        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-md font-bold rounded-xl active:scale-95 transition-transform flex items-center gap-2 cursor-pointer border border-slate-200"
                      >
                        <RotateCcw className="w-4 h-4 text-slate-500" />
                        <span>Retake Joint Photo</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 text-center font-semibold m-0 leading-normal border-t pt-3">
                  This photo is required as joint proof of physical presence of both bride and groom at counter.
                </p>
              </div>
            </div>
          )}

          {activeTokenProcess && (
            <div className="flex gap-4 justify-end mt-4 border-t pt-4">
              <button 
                onClick={handleCloseProcess}
                className="px-8 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl active:scale-95 transition-transform cursor-pointer"
              >
                Cancel Session
              </button>
              <button 
                disabled={!selfieSrc}
                onClick={() => setStep('DETAILS')}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <span>Proceed to Form Details</span>
                <ArrowRight className="w-5 h-5 text-white" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: DYNAMIC DETAILS INPUT FORM */}
      {step === 'DETAILS' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="m-0 text-navy font-bold text-xl uppercase tracking-tight">Step 2 — Marriage Information Form</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 m-0">
                Complete Bride and Groom details for municipal records
              </p>
            </div>
            
            <button
              onClick={() => setStep('VERIFICATION')}
              className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-600 font-bold text-sm cursor-pointer"
            >
              Back
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* Groom Section */}
            <div className="flex flex-col gap-4 bg-white border border-slate-200 shadow-sm p-6 rounded-2xl w-full">
              <h4 className="m-0 text-purple-700 font-bold border-b pb-2 text-md flex items-center gap-1.5 uppercase">
                <Users className="w-5 h-5 text-purple-600" />
                Groom Details (वर का विवरण)
              </h4>

              <div className="grid grid-cols-1 gap-3.5 text-sm font-semibold font-rajdhani mt-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-600">Groom's Full Name (वर का नाम)</label>
                  <input
                    type="text"
                    required
                    placeholder="Groom Name in English"
                    value={marriageData.groomName}
                    onChange={(e) => setMarriageData({ ...marriageData, groomName: e.target.value.toUpperCase() })}
                    className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-purple-600 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-600">Groom's Date of Birth (वर की जन्म तिथि)</label>
                    <input
                      type="date"
                      required
                      value={marriageData.groomDob}
                      onChange={(e) => setMarriageData({ ...marriageData, groomDob: e.target.value })}
                      className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-purple-600 outline-none font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-600">Groom's Father's Name (वर के पिता का नाम)</label>
                    <input
                      type="text"
                      required
                      placeholder="Father's name"
                      value={marriageData.groomFather}
                      onChange={(e) => setMarriageData({ ...marriageData, groomFather: e.target.value.toUpperCase() })}
                      className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-purple-600 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bride Section */}
            <div className="flex flex-col gap-4 bg-white border border-slate-200 shadow-sm p-6 rounded-2xl w-full">
              <h4 className="m-0 text-purple-700 font-bold border-b pb-2 text-md flex items-center gap-1.5 uppercase">
                <Users className="w-5 h-5 text-purple-600" />
                Bride Details (वधू का विवरण)
              </h4>

              <div className="grid grid-cols-1 gap-3.5 text-sm font-semibold font-rajdhani mt-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-600">Bride's Full Name (वधू का नाम)</label>
                  <input
                    type="text"
                    required
                    placeholder="Bride Name in English"
                    value={marriageData.brideName}
                    onChange={(e) => setMarriageData({ ...marriageData, brideName: e.target.value.toUpperCase() })}
                    className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-purple-600 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-600">Bride's Date of Birth (वधू की जन्म तिथि)</label>
                    <input
                      type="date"
                      required
                      value={marriageData.brideDob}
                      onChange={(e) => setMarriageData({ ...marriageData, brideDob: e.target.value })}
                      className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-purple-600 outline-none font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-600">Bride's Father's Name (वधू के पिता का नाम)</label>
                    <input
                      type="text"
                      required
                      placeholder="Father's name"
                      value={marriageData.brideFather}
                      onChange={(e) => setMarriageData({ ...marriageData, brideFather: e.target.value.toUpperCase() })}
                      className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-purple-600 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Wedding Event Info */}
          <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl flex flex-col gap-4">
            <h4 className="m-0 text-navy font-bold border-b pb-2 text-md flex items-center gap-1.5 uppercase">
              <FileText className="w-5 h-5 text-purple-600" />
              Marriage Event Details (विवाह कार्यक्रम विवरण)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-slate-600 font-bold">Date of Marriage (विवाह की दिनांक)</label>
                <input
                  type="date"
                  required
                  value={marriageData.dom}
                  onChange={(e) => setMarriageData({ ...marriageData, dom: e.target.value })}
                  className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-purple-600 outline-none font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-600 font-bold">Place of Marriage/Solemnization (विवाह स्थल का नाम व पता)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Radisson Palace, Jaipur"
                  value={marriageData.placeOfMarriage}
                  onChange={(e) => setMarriageData({ ...marriageData, placeOfMarriage: e.target.value })}
                  className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-purple-600 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-600">Applicant Mobile (आवेदक का मोबाइल नंबर)</label>
                <input
                  type="tel"
                  maxLength={10}
                  required
                  placeholder="Enter contact mobile number"
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value.replace(/[^0-9]/g, '') })}
                  className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-purple-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 justify-end mt-4 border-t pt-4">
            <button
              onClick={() => setStep('VERIFICATION')}
              className="px-8 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl active:scale-95 transition-transform cursor-pointer"
            >
              Previous Step
            </button>
            <button
              disabled={!marriageData.groomName || !marriageData.brideName || !marriageData.dom || !marriageData.placeOfMarriage || !formData.mobileNumber}
              onClick={() => setStep('SCANNING')}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <span>Scan Required Documents</span>
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DOCUMENT CHECKLIST & SCANNER SIMULATION */}
      {step === 'SCANNING' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="m-0 text-navy font-bold text-xl uppercase tracking-tight">Step 3 — Documents Verification & Scans</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 m-0">
                Scan and upload physical records prepared by the couple
              </p>
            </div>
            
            <button
              onClick={() => setStep('DETAILS')}
              className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-600 font-bold text-sm cursor-pointer"
            >
              Back
            </button>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl flex flex-col gap-4">
            <h4 className="m-0 text-navy font-bold text-md flex items-center gap-1.5 uppercase">
              <FileText className="w-5 h-5 text-purple-600" />
              Government Mandated Documents Checklist
            </h4>
            <p className="text-xs text-slate-400 font-bold m-0 mt-1 uppercase tracking-widest leading-none">
              Place documents on Flatbed Scanner and trigger scan simulation
            </p>

            <div className="flex flex-col gap-3.5 font-bold border-y py-4">
              {requiredDocuments.map((doc, idx) => {
                const isUploaded = !!scannedFiles[doc];
                return (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50/50 border rounded-xl shadow-inner text-sm">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-navy/5 flex items-center justify-center font-extrabold text-navy">
                        {idx + 1}
                      </span>
                      <span className="text-slate-700 font-semibold">{doc}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {isUploaded ? (
                        <>
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-extrabold rounded-md border border-emerald-200 uppercase tracking-wide">
                            Successfully Scanned
                          </span>
                          <a
                            href={`http://localhost:5000/temp/scans/${scannedFiles[doc]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-600 hover:text-emerald-700 underline font-mono font-bold max-w-[120px] truncate cursor-pointer"
                            title="Click to view scanned document"
                          >
                            {scannedFiles[doc]}
                          </a>
                        </>
                      ) : (
                        <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-extrabold rounded-md border border-amber-200 uppercase tracking-wide">
                          Awaiting Scan
                        </span>
                      )}

                      <button
                        onClick={() => handleChecklistScanClick(doc)}
                        disabled={scanning !== false}
                        className={`px-4.5 py-2 text-xs font-bold rounded-lg cursor-pointer active:scale-95 transition-transform flex items-center gap-1.5 ${
                          isUploaded 
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300' 
                            : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                        }`}
                      >
                        {scanning === doc ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Scanning...</span>
                          </>
                        ) : (
                          <span>{isUploaded ? 'Re-scan' : 'Scan Document'}</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {scanning && (
              <div className="border border-purple-200 rounded-xl p-4 bg-purple-50/50 flex flex-col md:flex-row items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-purple-600 animate-spin" />
                  <div className="text-left font-semibold text-sm font-rajdhani">
                    <span className="text-navy font-bold block">Scanning: {scanning}</span>
                    <span className="text-xs text-slate-500 leading-normal">
                      Waiting for physical scanner... Place document on the flatbed scanner and execute scan in Epson Scan 2 (saving output to temp/scans).
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleBypassScan}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg active:scale-95 transition-transform cursor-pointer border shadow-sm shrink-0 font-rajdhani"
                >
                  Bypass & Use Demo Mock File
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-4 justify-end mt-4 border-t pt-4">
              <button
                onClick={() => setStep('DETAILS')}
                className="px-8 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl active:scale-95 transition-transform cursor-pointer"
              >
                Previous Step
              </button>
              <button
                disabled={requiredDocuments.some(doc => !scannedFiles[doc])}
                onClick={() => setStep('PAYMENT')}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <span>Proceed to Payment</span>
                <ArrowRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: PAYMENT OPTIONS & SUBMISSION */}
      {step === 'PAYMENT' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="m-0 text-navy font-bold text-xl uppercase tracking-tight">Step 4 — Fee Collection Counter</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 m-0">
                Collect marriage registration fee based on government guidelines
              </p>
            </div>
            
            <button
              onClick={() => setStep('SCANNING')}
              className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-600 font-bold text-sm cursor-pointer"
            >
              Back
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch font-rajdhani">
            
            {/* Slab Calculation Breakdown */}
            <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h4 className="m-0 text-navy font-bold border-b pb-2 text-md flex items-center gap-1.5 uppercase">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Government Fee Slab Calculation
                </h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-5">
                  Calculated automatically based on Date of Marriage: {marriageData.dom}
                </p>

                <div className="flex flex-col gap-3">
                  {feeInfo.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-md font-bold text-slate-600 border-b pb-2 border-slate-100">
                      <span>{item.label}</span>
                      <span className="font-mono text-navy text-lg">₹{item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 border-t-2 border-dashed border-slate-200 pt-5 flex justify-between items-center bg-purple-50/20 p-4 rounded-xl">
                <span className="text-lg font-bold text-navy uppercase">Total Fees Collected</span>
                <span className="text-3xl font-extrabold font-mono text-purple-700">₹{feeInfo.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h4 className="m-0 text-navy font-bold border-b pb-2 text-md flex items-center gap-1.5 uppercase">
                  <CreditCard className="w-5 h-5 text-saffron" />
                  Select Mode of Payment
                </h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-5">
                  Collect cash at counter or show dynamic kiosk UPI QR code
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-6 border-2 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                      paymentMethod === 'CASH'
                        ? 'border-purple-600 bg-purple-50/10 text-purple-700 shadow-sm font-extrabold'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600 font-bold'
                    }`}
                  >
                    <span className="text-2xl font-bold uppercase font-sans">Cash</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider text-center">Collect physical cash and submit file</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('UPI_QR')}
                    className={`p-6 border-2 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                      paymentMethod === 'UPI_QR'
                        ? 'border-purple-600 bg-purple-50/10 text-purple-700 shadow-sm font-extrabold'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600 font-bold'
                    }`}
                  >
                    <span className="text-2xl font-bold uppercase font-sans">UPI QR</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider text-center">Spawn scan-to-pay kiosk QR code</span>
                  </button>
                </div>

                {paymentMethod === 'UPI_QR' && (
                  <div className="flex flex-col gap-4 mt-5">
                    <div className="flex items-center gap-4 bg-slate-50 border p-3 rounded-xl">
                      <div className="w-20 h-20 bg-white border border-slate-300 rounded-lg p-1.5 flex items-center justify-center shrink-0">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=nagarnigam.kiosk@sbi%26am=${feeInfo.total.toFixed(2)}%26tn=Marriage-Bill-${activeTokenProcess.tokenNumber}`}
                          alt="Mock QR" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="text-left text-xs leading-snug">
                        <span className="font-bold text-purple-700 uppercase block">dynamic upi qr generated</span>
                        <span className="text-slate-500 block mt-0.5">Show this terminal display to citizen, wait for payment confirmation, then click submit.</span>
                      </div>
                    </div>
                    <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-xl flex items-center gap-3 text-xs text-emerald-800 font-bold">
                      <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>UPI QR generated on customer kiosk. Once paid successfully, click submit to complete enrollment.</span>
                    </div>
                  </div>
                )}

                {paymentMethod === 'CASH' && (
                  <div className="flex flex-col gap-3 mt-5">
                    <div className="p-4 border border-amber-200 bg-amber-50 rounded-xl flex items-center gap-3 text-xs text-amber-900 font-bold">
                      <AlertCircle className="w-5 h-5 text-saffron shrink-0" />
                      <span>Admin verifies cash received of flat ₹{feeInfo.total.toFixed(2)} from the citizen before completing registry.</span>
                    </div>
                    <label className="flex items-center gap-2.5 p-3.5 border border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50/30 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cashCollected}
                        onChange={(e) => setCashCollected(e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-700">
                        Cash Collected (₹{feeInfo.total.toFixed(2)} received in hand)
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex gap-4 justify-end mt-4 border-t pt-4">
                <button
                  onClick={() => setStep('SCANNING')}
                  className="px-8 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl active:scale-95 transition-transform cursor-pointer"
                >
                  Previous Step
                </button>
                <button
                  onClick={handleSubmission}
                  disabled={paying || (paymentMethod === 'CASH' && !cashCollected)}
                  className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {paying ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Submitting File...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit & Print Enrollment Slip</span>
                      <Check className="w-5 h-5 text-white" />
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* STEP 5: SUBMISSION COMPLETE / ENROLLMENT SLIP */}
      {step === 'COMPLETE' && enrollmentResult && (
        <div className="flex flex-col gap-6">
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              #root {
                display: none !important;
              }
              body {
                background: white !important;
                color: black !important;
              }
              @page {
                size: A4 portrait !important;
                margin: 15mm !important;
              }
            }
          `}} />

          {/* Enhanced Premium Success Banner */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-3xl p-8 flex items-center gap-6 shadow-lg animate-fade-in border-b-4 border-emerald-700 text-left">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/50 shrink-0 animate-bounce">
              <Check className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="m-0 text-white font-extrabold text-2xl uppercase tracking-tight">Marriage Registry Spooled Successfully!</h3>
              <p className="text-sm font-medium text-emerald-100 mt-2 m-0 leading-relaxed">
                The application for <strong className="text-white uppercase">{marriageData.groomName} & {marriageData.brideName}</strong> has been registered and spooled to the municipal verification queue. Please print the official A4 acknowledgement receipt slip below and hand it to the couple.
              </p>
            </div>
          </div>

          {/* On-screen Printable Enrollment Slip Box */}
          <div className="border border-slate-300 bg-white p-8 rounded-3xl shadow-lg relative flex flex-col gap-6 font-rajdhani text-left border-dashed border-2 select-all print:border-none print:shadow-none max-w-2xl mx-auto w-full">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-saffron via-white to-green-custom" />
            
            <div className="flex items-center gap-3 border-b pb-4">
              <img src="/assets/nigam-logo.png" alt="Emblem" className="w-12 h-12 object-contain" />
              <div>
                <h3 className="text-lg font-bold text-navy m-0 leading-none">नगर निगम जयपुर (ग्रेटर) — विवाह प्रमाण-पत्र</h3>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mt-1.5 block">
                  Municipal Marriage Registration Enrollment Slip
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 text-xs font-semibold leading-relaxed border-b pb-5">
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Enrollment Number</span>
                <span className="text-base font-extrabold font-mono text-navy block mt-0.5">{enrollmentResult.enrollmentId}</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Kiosk Token Number</span>
                <span className="text-base font-extrabold font-mono text-navy block mt-0.5">{enrollmentResult.tokenNumber}</span>
              </div>
              <div className="mt-2">
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Groom's Name</span>
                <span className="text-base font-extrabold text-slate-800 block mt-0.5">{marriageData.groomName}</span>
              </div>
              <div className="mt-2">
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Bride's Name</span>
                <span className="text-base font-extrabold text-slate-800 block mt-0.5">{marriageData.brideName}</span>
              </div>
              <div className="mt-2">
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Date of Marriage</span>
                <span className="text-base font-extrabold text-slate-800 block mt-0.5">{marriageData.dom}</span>
              </div>
              <div className="mt-2">
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Place of Solemnization</span>
                <span className="text-base font-extrabold text-slate-800 block mt-0.5">{marriageData.placeOfMarriage}</span>
              </div>
            </div>

            {/* Fee Breakdown (शुल्क विवरण) */}
            <div className="border-b pb-4">
              <span className="text-slate-400 block uppercase font-bold text-[10px] mb-2">Fee Breakdown (शुल्क विवरण)</span>
              <div className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
                {enrollmentResult.feeItems && enrollmentResult.feeItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between border-b border-dashed border-slate-100 pb-1">
                    <span>{item.label}</span>
                    <span className="font-bold text-navy">₹{item.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-semibold bg-slate-50 border p-4 rounded-xl leading-relaxed">
              <div>
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Fees Deposited</span>
                <span className="text-lg font-extrabold text-slate-800 block mt-0.5">₹{enrollmentResult.paymentDetails.amount.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Payment Status</span>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200 text-[10px] font-extrabold uppercase mt-1 block">
                  {enrollmentResult.paymentDetails.method === 'CASH' ? 'PAID via CASH' : enrollmentResult.paymentDetails.method === 'UPI_QR' ? 'PAID via UPI' : enrollmentResult.paymentDetails.status}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-center m-0 leading-normal italic border-t pt-3">
              This slip confirms enrollment submission. File has been queued for SI/CSI verification at Jaipur Municipal Office. Keep this slip safe for certificate delivery.
            </p>
          </div>

          {/* Wizard final actions */}
          <div className="flex gap-4 justify-center mt-4 border-t pt-4">
            <button
              onClick={handlePrintEnrollmentSlip}
              className="px-8 py-3 bg-navy hover:bg-slate-800 text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Printer className="w-5 h-5 text-saffron" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={handleCloseProcess}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl active:scale-95 transition-transform cursor-pointer shadow-md"
            >
              <span>Process Another Citizen</span>
            </button>
          </div>

          {/* 🖨️ A4 MARRIAGE ENROLLMENT PRINT SLIP BODY (HIDDEN BY DEFAULT, RENDERED IN PRINT MEDIA ONLY) */}
          {enrollmentResult && createPortal(
            <div className="hidden print:block w-full text-black font-sans leading-relaxed text-left" style={{ fontFamily: 'sans-serif' }}>
              {renderPrintVoucher('Applicant Copy / आवेदक प्रति')}
              <div style={{ pageBreakAfter: 'always' }} />
              {renderPrintVoucher('Office Copy / कार्यालय प्रति')}
            </div>,
            document.body
          )}
        </div>
      )}

      {scanCameraActive && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md w-full flex flex-col items-center gap-5 text-center font-rajdhani">
            <div className="w-full border-b pb-3 flex justify-between items-center">
              <h4 className="text-navy font-bold text-lg uppercase m-0">Recapture Couple Photo</h4>
              <button 
                onClick={() => {
                  setCameraActive(false);
                  setScanCameraActive(false);
                }} 
                className="text-slate-400 hover:text-navy font-extrabold text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="w-80 h-60 bg-slate-950 border-2 border-slate-800 rounded-2xl relative flex items-center justify-center overflow-hidden shadow-inner">
              {cameraActive ? (
                <video ref={videoRef} autoPlay className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-slate-600 gap-2">
                  <Camera className="w-12 h-12 animate-pulse" />
                  <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">Camera Offline</span>
                </div>
              )}
              
              {cameraActive && (
                <div className="absolute inset-0 border-2 border-purple-400 rounded-2xl pointer-events-none flex flex-col justify-between p-3.5">
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-t-2 border-l-2 border-purple-400" />
                    <span className="w-4 h-4 border-t-2 border-r-2 border-purple-400" />
                  </div>
                  <div className="w-full text-center text-[10px] text-purple-400 font-extrabold uppercase tracking-widest bg-slate-950/60 py-0.5 animate-pulse rounded-md">
                    ALIGN GROOM & BRIDE
                  </div>
                  <div className="flex justify-between">
                    <span className="w-4 h-4 border-b-2 border-l-2 border-purple-400" />
                    <span className="w-4 h-4 border-b-2 border-r-2 border-purple-400" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={async () => {
                  await captureCamera();
                  setScanCameraActive(false);
                  // Mark doc as uploaded on screen
                  setScannedFiles(prev => ({
                    ...prev,
                    "Joint photograph of Bride & Groom (वर-वधू का संयुक्त चित्र)": "Captured_Combined_Photo.jpg"
                  }));
                }}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Capture Photo</span>
              </button>
              <button
                onClick={() => {
                  setCameraActive(false);
                  setScanCameraActive(false);
                }}
                className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl active:scale-95 transition-transform"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
