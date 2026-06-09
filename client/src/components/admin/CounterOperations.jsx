import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAdminStore } from '../../store/adminStore.js';
import { useKioskStore } from '../../store/kioskStore.js';
import { 
  Camera, Check, FileText, CreditCard, Printer, Search, 
  Users, Smartphone, AlertCircle, ArrowRight, ShieldCheck, 
  RotateCcw, Sparkles, RefreshCw, Eye
} from 'lucide-react';

export default function CounterOperations() {
  const { 
    currentServing, 
    activeTokenProcess, 
    setProcessingToken, 
    submitApplication, 
    callNextToken,
    clearActiveTokenProcess,
    queue
  } = useAdminStore();
  const { language } = useKioskStore();

  // Local Wizard Wizard State
  const [tokenInput, setTokenInput] = useState('');
  const [step, setStep] = useState('VERIFICATION'); // VERIFICATION, CORRECTION_FIELDS, DETAILS, SCANNING, PAYMENT, COMPLETE
  
  const getStepNumber = (currentStepName) => {
    const isCorrection = activeTokenProcess?.serviceType === 'correction';
    const stepsList = isCorrection 
      ? ['VERIFICATION', 'CORRECTION_FIELDS', 'DETAILS', 'SCANNING', 'PAYMENT', 'COMPLETE']
      : ['VERIFICATION', 'DETAILS', 'SCANNING', 'PAYMENT', 'COMPLETE'];
    
    const index = stepsList.indexOf(currentStepName);
    return index !== -1 ? index + 1 : 1;
  };
  
  // Verification states
  const [cameraActive, setCameraActive] = useState(false);
  const [selfieSrc, setSelfieSrc] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [selectedFields, setSelectedFields] = useState({});
  const [isMajorCorrection, setIsMajorCorrection] = useState(false);
  const [objectionSearchInput, setObjectionSearchInput] = useState('');
  const [objectionError, setObjectionError] = useState('');
  const { searchObjectionApplication } = useAdminStore();

  // Form Details
  const [formData, setFormData] = useState({
    applicantName: '',
    mobileNumber: '',
    registrationNumber: '',
    fatherName: '',
    motherName: '',
    dob: '',
    relationWithApplicant: 'Self', // Self, Father, Mother, Other
    // Field old/new mappings
    fieldValues: {}
  });

  // Custom Form Details for New Registrations
  const [newRegData, setNewRegData] = useState({
    // Birth
    childName: '',
    gender: 'MALE',
    placeOfBirth: 'HOSPITAL',
    hospitalName: '',
    permanentAddress: '',
    
    // Death
    deceasedName: '',
    ageAtDeath: '',
    causeOfDeath: '',
    placeOfDeath: '',
    placeOfDeathCategory: 'HOSPITAL',
    
    // Marriage
    groomName: '',
    groomAge: '',
    groomFather: '',
    brideName: '',
    brideAge: '',
    brideFather: '',
    placeOfMarriage: ''
  });

  // Scanning states
  const [scanning, setScanning] = useState(false);
  const [scannedFiles, setScannedFiles] = useState({});

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, UPI_QR
  const [paying, setPaying] = useState(false);

  // Success enrollment state
  const [enrollmentResult, setEnrollmentResult] = useState(null);

  // Predefined Fields dynamic selector with Minor/Major tag (34 Birth Certificate Fields)
  const getPredefinedFields = () => {
    const block = activeTokenProcess?.block || 'birth';
    if (block === 'death') {
      return [
        { id: 'deceasedNameHi', label: "मृतक का नाम हिंदी में (Deceased Name in Hindi)", isMajor: true },
        { id: 'deceasedNameEn', label: "मृतक का नाम अंग्रेजी में (Deceased Name in English)", isMajor: true },
        { id: 'motherNameHi', label: "मृतक की माता का नाम हिंदी में (Mother's Name in Hindi)", isMajor: true },
        { id: 'motherNameEn', label: "मृतक की माता का नाम अंग्रेजी में (Mother's Name in English)", isMajor: true },
        { id: 'fatherNameHi', label: "मृतक के पिता का नाम हिंदी में (Father's Name in Hindi)", isMajor: true },
        { id: 'fatherNameEn', label: "मृतक के पिता का नाम अंग्रेजी में (Father's Name in English)", isMajor: true },
        { id: 'spouseNameHi', label: "मृतक के पति/पत्नी का नाम हिंदी में (Spouse Name in Hindi)", isMajor: true },
        { id: 'spouseNameEn', label: "मृतक के पति/पत्नी का नाम अंग्रेजी में (Spouse Name in English)", isMajor: true },
        { id: 'dod', label: "मृत्यु की दिनांक (Date of Death)", isMajor: true },
        { id: 'hospitalName', label: "अस्पताल का नाम / मृत्यु स्थान (Hospital / Place of Death)", isMajor: true },
        
        // Minor Fields
        { id: 'permanentAddressHi', label: "मृतक का स्थायी पता हिंदी में (Deceased Permanent Address in Hindi)", isMajor: false },
        { id: 'permanentAddressEn', label: "मृतक का स्थायी पता अंग्रेजी में (Deceased Permanent Address in English)", isMajor: false },
        { id: 'deathAddressHi', label: "मृतक का मृत्यु के समय पता हिंदी में (Address at Time of Death in Hindi)", isMajor: false },
        { id: 'deathAddressEn', label: "मृतक का मृत्यु के समय पता अंग्रेजी में (Address at Time of Death in English)", isMajor: false },
        { id: 'deceasedAge', label: "मृतक की आयु (Deceased Age)", isMajor: false },
        { id: 'janAadhaar', label: "जन-आधार (Jan-Aadhaar)", isMajor: false },
        { id: 'dateOfInformation', label: "सूचना की दिनांक (Date of Information)", isMajor: false },
        { id: 'dateOfRegistration', label: "पंजीकरण की दिनांक (Date of Registration)", isMajor: false },
        { id: 'informantMobile', label: "इत्तिला देने वाले का मोबाइल नंबर (Informant's Mobile Number)", isMajor: false },
        { id: 'pincode', label: "पिन कोड (Pin Code)", isMajor: false },
        { id: 'informantEmail', label: "इत्तिला देने वाले का ईमेल (Informant's Email)", isMajor: false },
        { id: 'fatherAadhaar', label: "पिता का आधार नंबर (Father's Aadhaar Number)", isMajor: false },
        { id: 'motherAadhaar', label: "माता का आधार नंबर (Mother's Aadhaar Number)", isMajor: false },
        { id: 'deceasedAadhaar', label: "मृतक का आधार नंबर (Deceased's Aadhaar Number)", isMajor: false },
        { id: 'spouseAadhaar', label: "मृतक के पति/पत्नी का आधार (Deceased's Spouse's Aadhaar)", isMajor: false },
        { id: 'informantNameHi', label: "इत्तिला देने वाले का नाम (Informant's Name)", isMajor: false },
        { id: 'informantNameEn', label: "इत्तिला देने वाले का नाम अंग्रेजी में (Informant's Name in English)", isMajor: false },
        { id: 'informantAddress', label: "इत्तिला देने वाले का पता (Informant's Address)", isMajor: false },
        { id: 'informantAadhaar', label: "इत्तिला देने वाले का आधार नंबर (Informant's Aadhaar Number)", isMajor: false },
        { id: 'gender', label: "लिंग (Gender)", isMajor: false },
        { id: 'remarksHi', label: "टिप्पणी हिंदी में (Remarks in Hindi)", isMajor: false },
        { id: 'remarksEn', label: "टिप्पणी अंग्रेजी में (Remarks in English)", isMajor: false },
        { id: 'eSign', label: "ई-साइन (E-Sign)", isMajor: false },
        { id: 'deceasedDob', label: "मृतक की जन्म दिनांक (Deceased Date of Birth)", isMajor: false },
        { id: 'motherMobile', label: "माता का मोबाइल नंबर (Mother's Mobile Number)", isMajor: false },
        { id: 'motherEmail', label: "माता का ईमेल (Mother's Email)", isMajor: false },
        { id: 'fatherMobile', label: "पिता का मोबाइल नंबर (Father's Mobile Number)", isMajor: false },
        { id: 'fatherEmail', label: "पिता का ईमेल (Father's Email)", isMajor: false },
        { id: 'spouseDob', label: "मृतक के पति / पत्नी की जन्म दिनांक (Spouse's Date of Birth)", isMajor: false },
        { id: 'spouseEmail', label: "मृतक के पति / पत्नी का ईमेल (Spouse's Email)", isMajor: false },
        { id: 'spouseAge', label: "मृतक के पति / पत्नी की आयु (Spouse's Age)", isMajor: false },
        { id: 'spouseMobile', label: "मृतक के पति / पत्नी का मोबाइल नंबर (Spouse's Mobile Number)", isMajor: false },
        { id: 'affidavitCorrection', label: "एफिडेविट में संशोधन (Affidavit Amendment)", isMajor: false }
      ];
    } else if (block === 'marriage') {
      return [
        { id: 'groomName', label: "Groom's Name (वर का नाम)", isMajor: true },
        { id: 'brideName', label: "Bride's Name (वधू का नाम)", isMajor: true },
        { id: 'dom', label: "Date of Marriage (विवाह तिथि)", isMajor: true },
        { id: 'placeOfMarriage', label: "Place of Solemnization (विवाह स्थल)", isMajor: true },
        { id: 'groomFather', label: "Groom's Father's Name (वर के पिता का नाम)", isMajor: false },
        { id: 'brideFather', label: "Bride's Father's Name (वधू के पिता का नाम)", isMajor: false }
      ];
    }
    
    // Default / Birth Certificate (34 Fields - 9 Major, 25 Minor)
    return [
      { id: 'childNameHi', label: "शिशु का नाम हिंदी में (Child Name in Hindi)", isMajor: true },
      { id: 'childNameEn', label: "शिशु का नाम अंग्रेजी में (Child Name in English)", isMajor: true },
      { id: 'motherNameHi', label: "शिशु की माता का नाम हिंदी में (Mother's Name in Hindi)", isMajor: true },
      { id: 'motherNameEn', label: "शिशु की माता का नाम अंग्रेजी में (Mother's Name in English)", isMajor: true },
      { id: 'fatherNameHi', label: "शिशु के पिता का नाम हिंदी में (Father's Name in Hindi)", isMajor: true },
      { id: 'fatherNameEn', label: "शिशु के पिता का नाम अंग्रेजी में (Father's Name in English)", isMajor: true },
      { id: 'gender', label: "लिंग (Gender)", isMajor: true },
      { id: 'dob', label: "जन्म दिनांक (Date of Birth)", isMajor: true },
      { id: 'hospitalName', label: "अस्पताल का नाम / जन्म स्थान (Hospital / Place of Birth)", isMajor: true },
      
      // Minor Fields (25)
      { id: 'permanentAddressHi', label: "माता पिता का स्थाई पता हिंदी में (Parents' Permanent Address in Hindi)", isMajor: false },
      { id: 'permanentAddressEn', label: "माता पिता का स्थाई पता अंग्रेजी में (Parents' Permanent Address in English)", isMajor: false },
      { id: 'birthAddressHi', label: "बच्चे के जन्म के समय माता पिता का पता हिंदी में (Address of Parents at Child's Birth in Hindi)", isMajor: false },
      { id: 'birthAddressEn', label: "बच्चे के जन्म के समय माता पिता का पता अंग्रेजी में (Address of Parents at Child's Birth in English)", isMajor: false },
      { id: 'dateOfInformation', label: "सूचना की दिनांक (Date of Information)", isMajor: false },
      { id: 'dateOfRegistration', label: "पंजीकरण की दिनांक (Date of Registration)", isMajor: false },
      { id: 'janAadhaar', label: "जन-आधार (Jan-Aadhaar)", isMajor: false },
      { id: 'informantMobile', label: "इत्तिला देने वाले का मोबाइल नंबर (Informant's Mobile Number)", isMajor: false },
      { id: 'pincode', label: "पिन कोड (Pin Code)", isMajor: false },
      { id: 'informantEmail', label: "इत्तिला देने वाले का ईमेल (Informant's Email)", isMajor: false },
      { id: 'fatherAadhaar', label: "पिता का आधार नंबर (Father's Aadhaar Number)", isMajor: false },
      { id: 'motherAadhaar', label: "माता का आधार नंबर (Mother's Aadhaar Number)", isMajor: false },
      { id: 'informantNameHi', label: "इत्तिला देने वाले का नाम (Informant's Name)", isMajor: false },
      { id: 'informantNameEn', label: "इत्तिला देने वाले का नाम अंग्रेजी में (Informant's Name in English)", isMajor: false },
      { id: 'informantAddress', label: "इत्तिला देने वाले का पता (Informant's Address)", isMajor: false },
      { id: 'informantAadhaar', label: "इत्तिला देने वाले का आधार नंबर (Informant's Aadhaar Number)", isMajor: false },
      { id: 'remarksHi', label: "टिप्पणी हिंदी में (Remarks in Hindi)", isMajor: false },
      { id: 'remarksEn', label: "टिप्पणी अंग्रेजी में (Remarks in English)", isMajor: false },
      { id: 'eSign', label: "ई-साइन (E-Sign)", isMajor: false },
      { id: 'childAadhaar', label: "शिशु का आधार नंबर (Child's Aadhaar Number)", isMajor: false },
      { id: 'fatherMobile', label: "पिता का मोबाइल नंबर (Father's Mobile Number)", isMajor: false },
      { id: 'fatherEmail', label: "पिता का ईमेल (Father's Email)", isMajor: false },
      { id: 'motherMobile', label: "माता का मोबाइल नंबर (Mother's Mobile Number)", isMajor: false },
      { id: 'motherEmail', label: "माता का ईमेल (Mother's Email)", isMajor: false },
      { id: 'affidavitCorrection', label: "एफिडेविट में संशोधन (Affidavit Amendment)", isMajor: false }
    ];
  };

  const PREDEFINED_FIELDS = getPredefinedFields();

  // Recalculate major correction type on field changes
  useEffect(() => {
    const hasMajor = Object.keys(selectedFields).some(fieldId => {
      if (!selectedFields[fieldId]) return false;
      const meta = PREDEFINED_FIELDS.find(f => f.id === fieldId);
      return meta?.isMajor || false;
    });
    setIsMajorCorrection(hasMajor);
  }, [selectedFields, PREDEFINED_FIELDS]);

  // Reset state when active token changes (to load clean data)
  useEffect(() => {
    if (activeTokenProcess && !activeTokenProcess.isReSubmission) {
      setStep('VERIFICATION');
      setSelfieSrc(null);
      setSelectedFields({});
      setFormData({
        applicantName: '',
        mobileNumber: '',
        registrationNumber: '',
        fatherName: '',
        motherName: '',
        dob: '',
        relationWithApplicant: 'Self',
        fieldValues: {}
      });
      setNewRegData({
        childName: '',
        gender: 'MALE',
        placeOfBirth: 'HOSPITAL',
        hospitalName: '',
        permanentAddress: '',
        deceasedName: '',
        ageAtDeath: '',
        causeOfDeath: '',
        placeOfDeath: '',
        placeOfDeathCategory: 'HOSPITAL',
        groomName: '',
        groomAge: '',
        groomFather: '',
        brideName: '',
        brideAge: '',
        brideFather: '',
        placeOfMarriage: ''
      });
      setScannedFiles({});
      setEnrollmentResult(null);
    }
  }, [activeTokenProcess]);

  // Handle manual token search
  const handleVerifyManualToken = () => {
    if (!tokenInput.trim()) return;
    const success = setProcessingToken(tokenInput.toUpperCase().trim());
    if (!success) {
      alert("Token number not found! Please check queue or try again.");
    }
  };

  const handleCallNext = () => {
    const nextToken = callNextToken();
    if (nextToken === '---') {
      alert("Active waiting queue is empty!");
    }
  };

  const handleSearchObjectionApp = () => {
    if (!objectionSearchInput.trim()) return;
    setObjectionError('');
    searchObjectionApplication(objectionSearchInput.toUpperCase().trim())
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
          registrationNumber: app.registration_number || '',
          fatherName: app.father_name || '',
          motherName: app.mother_name || '',
          dob: app.dob || '',
          relationWithApplicant: app.relation_with_applicant || 'Self',
          fieldValues: {}
        });

        const savedDocs = app.uploaded_documents || [];
        const docList = {};
        savedDocs.forEach((doc) => {
          docList[doc] = doc;
        });
        setScannedFiles(docList);

        if (app.service_type.toLowerCase() === 'correction') {
          const selected = {};
          const fieldVals = {};
          const savedDetails = app.correction_details || [];
          savedDetails.forEach(detail => {
            const matchedField = PREDEFINED_FIELDS.find(f => f.label === detail.fieldName);
            if (matchedField) {
              selected[matchedField.id] = true;
              fieldVals[matchedField.id] = {
                old: detail.oldValue,
                new: detail.newValue
              };
            }
          });
          setSelectedFields(selected);
          setFormData(prev => ({
            ...prev,
            fieldValues: fieldVals
          }));
        }

        setSelfieSrc(app.selfie_url);

        if (app.service_type.toLowerCase() === 'new_registration') {
          setNewRegData({
            childName: app.applicant_name,
            gender: 'MALE',
            placeOfBirth: 'HOSPITAL',
            hospitalName: '',
            permanentAddress: '',
            deceasedName: app.applicant_name,
            ageAtDeath: '',
            causeOfDeath: '',
            placeOfDeath: '',
            placeOfDeathCategory: 'HOSPITAL',
            groomName: app.applicant_name,
            groomAge: '',
            groomFather: app.father_name || '',
            brideName: '',
            brideAge: '',
            brideFather: '',
            placeOfMarriage: ''
          });
        }

        useAdminStore.setState({ activeTokenProcess: mockToken });
        setStep('VERIFICATION');
      })
      .catch(err => {
        setObjectionError(err.message || 'No application under objection found');
      });
  };

  // Live Camera handlers
  const startCamera = async () => {
    setCameraActive(true);
    setSelfieSrc(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("No webcam connected, activating camera simulator fallback.", err);
    }
  };

  const captureCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/png');
        setSelfieSrc(dataUrl);
        
        // Stop stream
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
        setCameraActive(false);
      }
    } else {
      // Simulator Fallback capture
      const mockPhotos = [
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150", // male
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150", // female
        "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150"  // generic
      ];
      const randomPhoto = mockPhotos[Math.floor(Math.random() * mockPhotos.length)];
      setSelfieSrc(randomPhoto);
      setCameraActive(false);
    }
  };

  // Dynamic document checklists
  const getRequiredDocumentsList = () => {
    if (!activeTokenProcess) return [];

    if (activeTokenProcess.serviceType === 'correction') {
      const block = activeTokenProcess.block;
      const docs = [];
      const selectedIds = Object.keys(selectedFields).filter(id => selectedFields[id]);
      
      if (block === 'death') {
        // Name Corrections (Deceased, spouse, parents)
        if (
          selectedIds.includes('deceasedNameHi') || selectedIds.includes('deceasedNameEn') ||
          selectedIds.includes('spouseNameHi') || selectedIds.includes('spouseNameEn') ||
          selectedIds.includes('fatherNameHi') || selectedIds.includes('fatherNameEn') ||
          selectedIds.includes('motherNameHi') || selectedIds.includes('motherNameEn')
        ) {
          docs.push("Two Identity Cards other than Aadhaar/JanAadhaar (आधार व जन आधार के अतिरिक्त कोई दो पहचान पत्र ID)");
          docs.push("Magistrate-certified name change affidavit (नाम संशोधन हेतु मजिस्ट्रेट शपथ पत्र)");
          if (selectedIds.includes('spouseNameHi') || selectedIds.includes('spouseNameEn')) {
            docs.push("Deceased Identity Proof (मृतक की आईडी)");
            docs.push("Spouse Aadhaar Card (पति/पत्नी का आधार कार्ड)");
            docs.push("Two Identity Cards other than JanAadhaar e.g. Voter ID, Ration Card (जन आधार के अतिरिक्त दो आईडी जैसे वोटर आईडी, राशन कार्ड)");
          }
        }
        // Date of Death Corrections
        if (selectedIds.includes('dod')) {
          docs.push("Hospital death verification records (अस्पताल के मृत्यु संबंधी दस्तावेज व रिकॉर्ड)");
        }
        // Place of Death Corrections
        if (selectedIds.includes('hospitalName')) {
          docs.push("Hospital death registration discharge summary (अस्पताल मृत्यु रिकॉर्ड व प्रपत्र)");
        }
        // Address Corrections
        if (
          selectedIds.includes('permanentAddressHi') || selectedIds.includes('permanentAddressEn') ||
          selectedIds.includes('deathAddressHi') || selectedIds.includes('deathAddressEn')
        ) {
          docs.push("Deceased Address Proof Document (मृतक के पते के सत्यापन हेतु दस्तावेज)");
        }
        // Aadhaar corrections
        if (
          selectedIds.includes('deceasedAadhaar') || selectedIds.includes('spouseAadhaar') ||
          selectedIds.includes('fatherAadhaar') || selectedIds.includes('motherAadhaar') ||
          selectedIds.includes('informantAadhaar')
        ) {
          docs.push("Copy of Aadhaar Card matching registry (आधार कार्ड की प्रति)");
        }
        
        if (docs.length === 0) {
          docs.push("Self-Declaration Form verified by Municipal councilor (पार्षद द्वारा सत्यापित स्व-घोषणा पत्र)");
        }
        return [...new Set(docs)];
      }

      // Default / Birth block correction documents
      if (
        selectedIds.includes('childName') || 
        selectedIds.includes('childNameHi') || 
        selectedIds.includes('childNameEn') || 
        selectedIds.includes('fatherName') || 
        selectedIds.includes('fatherNameHi') || 
        selectedIds.includes('fatherNameEn') || 
        selectedIds.includes('motherName') ||
        selectedIds.includes('motherNameHi') ||
        selectedIds.includes('motherNameEn')
      ) {
        docs.push("Aadhaar Card copy of Parents (माता-पिता का आधार)");
        docs.push("Magistrate-certified Affidavit for name change (नाम सुधार हेतु मजिस्ट्रेट शपथ पत्र)");
      }
      if (selectedIds.includes('dob')) {
        docs.push("Hospital Birth Discharge Summary / Record (अस्पताल जन्म रिकॉर्ड)");
        docs.push("School Transfer Certificate or Age proof (स्कूल टीसी / आयु प्रमाण)");
      }
      if (
        selectedIds.includes('permanentAddress') || 
        selectedIds.includes('permanentAddressHi') || 
        selectedIds.includes('permanentAddressEn') || 
        selectedIds.includes('presentAddress') ||
        selectedIds.includes('birthAddressHi') ||
        selectedIds.includes('birthAddressEn')
      ) {
        docs.push("Water Bill / Electricity Bill or Land registry copy (बिजली/पानी बिल या रजिस्ट्री)");
        docs.push("Voter ID / UID copy (मतदाता पहचान पत्र)");
      }
      if (docs.length === 0) {
        docs.push("Self-Declaration Form verified by Municipal councilor (पार्षद द्वारा सत्यापित स्व-घोषणा पत्र)");
      }
      return docs;
    } else {
      // New Registrations
      const blockType = activeTokenProcess.block;
      if (blockType === 'birth') {
        return [
          "Hospital Birth discharge report (अस्पताल प्रसव रिपोर्ट)",
          "Aadhaar Cards of both parents (माता-पिता के आधार कार्ड)",
          "Self-declaration address verification (स्व-घोषणा पता प्रमाण)"
        ];
      } else if (blockType === 'death') {
        const placeCat = newRegData.placeOfDeathCategory || 'HOSPITAL';
        if (placeCat === 'HOSPITAL') {
          return [
            "Hospital death report Propatra-2 (अस्पताल प्रपत्र-2 एवं प्रमाणित रिपोर्ट फोरम)",
            "Aadhaar/JanAadhaar copy of Deceased, Spouse & Parents (मृतक, मृतक के पति/पत्नी, माता-पिता के आधार, जन आधार की प्रति)"
          ];
        } else if (placeCat === 'HOME') {
          return [
            "Affidavit & Report Form-2 (शपथ पत्र, रिपोर्ट फोरम प्रपत्र-2)",
            "Government employee certified Report Propatra-2 or verification document (राजकीय कार्मिक से प्रमाणित रिपोर्ट फोरम प्रपत्र-2 अथवा मृत्यु प्रमाणीकरण दस्तावेज)",
            "Deceased, spouse & parents identity/Aadhaar proof (मृतक, मृतक के पति/पत्नी, माता-पिता के पहचान दस्तावेज/आधार आईडी)"
          ];
        } else {
          // BROUGHT_DEAD
          return [
            "Letter of Brought Dead from hospital (अस्पताल Brought Dead पत्र)",
            "Report Form-2 certified by Hospital (अस्पताल से प्रमाणित रिपोर्ट फोरम प्रपत्र-2)"
          ];
        }
      } else {
        // Marriage
        return [
          "Age proof of Groom (marksheet/passport) (वर का आयु प्रमाण पत्र)",
          "Age proof of Bride (marksheet/passport) (वधू का आयु प्रमाण पत्र)",
          "Joint photograph of Bride & Groom (वर-वधू का संयुक्त चित्र)",
          "Wedding Invitation card copy (विवाह निमंत्रण पत्र)",
          "Identities of 2 Wedding Witnesses (2 गवाहों के पहचान पत्र)"
        ];
      }
    }
  };

  // Scanning simulation trigger
  const triggerScanFile = (docName) => {
    setScanning(docName);
    setTimeout(() => {
      setScannedFiles(prev => ({
        ...prev,
        [docName]: `Scanned_Doc_${Date.now().toString().slice(-4)}.pdf`
      }));
      setScanning(false);
    }, 2500);
  };

  // Complete application submit
  const handleSubmission = () => {
    const docKeys = getRequiredDocumentsList();
    const incompleteDocs = docKeys.filter(doc => !scannedFiles[doc]);
    
    if (incompleteDocs.length > 0) {
      alert(`WARNING: Please scan/upload all required documents first! \nMissing: ${incompleteDocs.join(", ")}`);
      return;
    }

    setPaying(true);

    const isCorrection = activeTokenProcess.serviceType === 'correction';
    const applicationPayload = {
      tokenNumber: activeTokenProcess.tokenNumber,
      departmentBlock: activeTokenProcess.block,
      serviceType: activeTokenProcess.serviceType,
      selfieUrl: selfieSrc || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      commonDetails: isCorrection ? formData : {
        applicantName: activeTokenProcess.block === 'marriage' ? newRegData.groomName : newRegData.childName || newRegData.deceasedName,
        mobileNumber: formData.mobileNumber || "9829XXXXXX",
        registrationNumber: isCorrection ? formData.registrationNumber : 'NEW-REGISTRATION',
        fatherName: newRegData.groomFather || newRegData.fatherName || formData.fatherName,
        motherName: newRegData.motherName || formData.motherName,
        dob: newRegData.dob || formData.dob,
      },
      correctionFields: isCorrection ? Object.keys(selectedFields).filter(k => selectedFields[k]).map(key => ({
        fieldName: PREDEFINED_FIELDS.find(f => f.id === key)?.label || key,
        oldValue: formData.fieldValues[key]?.old || '---',
        newValue: formData.fieldValues[key]?.new || '---'
      })) : [],
      correctionType: isCorrection ? (isMajorCorrection ? 'MAJOR' : 'MINOR') : 'NEW_REGISTRATION',
      uploadedDocuments: Object.values(scannedFiles),
      paymentDetails: activeTokenProcess?.isReSubmission ? {
        method: 'EXEMPT',
        amount: 0.00,
        status: 'SUCCESS',
        transactionId: `EXEMPT-${activeTokenProcess.tokenNumber}`
      } : {
        method: paymentMethod,
        amount: 20.00,
        status: paymentMethod === 'CASH' ? 'PENDING' : 'SUCCESS',
        transactionId: `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`
      }
    };

    submitApplication(applicationPayload)
      .then((result) => {
        setEnrollmentResult({
          ...result,
          enrollmentId: result.enrollment_id,
          tokenNumber: activeTokenProcess.tokenNumber,
          departmentBlock: activeTokenProcess.block,
          serviceType: activeTokenProcess.serviceType,
          commonDetails: applicationPayload.commonDetails,
          uploadedDocuments: applicationPayload.uploadedDocuments,
          paymentDetails: applicationPayload.paymentDetails,
          correctionFields: applicationPayload.correctionFields
        });
        setPaying(false);
        setStep('COMPLETE');
      })
      .catch((err) => {
        setPaying(false);
        alert(`Error submitting application: ${err.message}`);
      });
  };

  // Reset local wizard wizard state
  const handleCloseProcess = () => {
    setStep('VERIFICATION');
    setSelfieSrc(null);
    setSelectedFields({});
    setFormData({
      applicantName: '',
      mobileNumber: '',
      registrationNumber: '',
      fatherName: '',
      motherName: '',
      dob: '',
      relationWithApplicant: 'Self',
      fieldValues: {}
    });
    setNewRegData({
      childName: '',
      gender: 'MALE',
      placeOfBirth: 'HOSPITAL',
      hospitalName: '',
      permanentAddress: '',
      deceasedName: '',
      ageAtDeath: '',
      causeOfDeath: '',
      placeOfDeath: '',
      placeOfDeathCategory: 'HOSPITAL',
      groomName: '',
      groomAge: '',
      groomFather: '',
      brideName: '',
      brideAge: '',
      brideFather: '',
      placeOfMarriage: ''
    });
    setScannedFiles({});
    setEnrollmentResult(null);
    clearActiveTokenProcess();
  };

  // Physical print enrollment slip spooled trigger
  const handlePrintEnrollmentSlip = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-5 md:p-8 flex flex-col font-rajdhani text-left min-h-[500px]">
      
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-navy m-0 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-saffron" />
            Admin Counter Operations (प्रशासनिक काउंटर)
          </h2>
          <p className="text-sm font-semibold text-slate-400 m-0 mt-1 uppercase tracking-widest leading-none">
            secure citizen token processing terminal
          </p>
        </div>

        {/* Serving bar badge */}
        {activeTokenProcess && (
          <div className="px-4 py-2 bg-saffron/10 border border-saffron/30 rounded-xl flex items-center gap-2 font-bold text-saffron-dark text-lg animate-pulse">
            <span className="w-2.5 h-2.5 bg-saffron rounded-full" />
            <span>Serving: {activeTokenProcess.tokenNumber}</span>
          </div>
        )}
      </div>

      {/* STEP 1: VERIFICATION & TOKEN SELECT */}
      {step === 'VERIFICATION' && (
        <div className="flex flex-col gap-6">
          
          {/* Active Process / Queue Dispatch Controls */}
          {!activeTokenProcess ? (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              
              {/* Box A: Manual Token Input */}
              <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl flex flex-col justify-between gap-4">
                <div>
                  <h3 className="m-0 text-navy font-bold text-lg">Process Token Manually</h3>
                  <p className="text-sm text-slate-500 font-semibold leading-tight mt-1 m-0">
                    Enter the token number printed on the citizen's kiosk receipt.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. TKN-BIR-CORR-1002"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl text-lg font-bold text-navy focus:border-navy uppercase outline-none"
                  />
                  <button
                    onClick={handleVerifyManualToken}
                    className="px-6 bg-navy text-white hover:bg-slate-800 text-lg font-bold rounded-xl active:scale-95 transition-transform cursor-pointer shadow-md flex items-center gap-2"
                  >
                    <Search className="w-5 h-5 text-saffron" />
                    <span>Load</span>
                  </button>
                </div>
              </div>

              {/* Box B: Call Next Queue Control */}
              <div className="bg-gradient-to-br from-saffron/5 to-amber-100/10 border-2 border-dashed border-saffron/30 p-6 rounded-2xl flex flex-col justify-between gap-4">
                <div>
                  <h3 className="m-0 text-saffron-dark font-bold text-lg">Next Token Call Dispatch</h3>
                  <p className="text-sm text-slate-500 font-semibold leading-tight mt-1 m-0">
                    Fetch and serves the next ticket in the active citizen waiting queue.
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleCallNext}
                    className="flex-1 py-3 bg-gradient-to-r from-saffron to-amber-500 hover:from-saffron-dark text-white text-lg font-bold rounded-xl active:scale-95 transition-transform cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    <Users className="w-5 h-5 text-white" />
                    <span>Serve Next ({queue.length} Waiting)</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-amber-50/50 border border-amber-200/80 p-6 rounded-2xl flex flex-col justify-between gap-4 mt-6">
              <div>
                <h3 className="m-0 text-navy font-bold text-lg">Retrieve Application under Objection (आपत्ति वाली फाइलें)</h3>
                <p className="text-sm text-slate-500 font-semibold leading-tight mt-1 m-0">
                  Search and reload an application previously flagged with an objection by the Checker to correct its details/documents.
                </p>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Token Number or Enrollment ID (e.g. ENR-582935)"
                  value={objectionSearchInput}
                  onChange={(e) => setObjectionSearchInput(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl text-lg font-bold text-navy focus:border-navy uppercase outline-none"
                />
                <button
                  onClick={handleSearchObjectionApp}
                  className="px-6 bg-saffron text-navy hover:bg-amber-500 text-lg font-bold rounded-xl active:scale-95 transition-transform cursor-pointer shadow-md flex items-center gap-2"
                >
                  <Search className="w-5 h-5 text-navy" />
                  <span>Retrieve Application</span>
                </button>
              </div>
              {objectionError && (
                <p className="text-sm text-red-600 font-bold m-0 mt-1">{objectionError}</p>
              )}
            </div>
            </>
          ) : (
            // Active Token details loaded, start verification and camera capture
            <div className="flex flex-col gap-6 mt-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                
                {/* Column 1: Token Specs (Clean & Professional) */}
                <div className="flex flex-col gap-6 bg-white p-7 border border-slate-200 shadow-sm rounded-2xl">
                  <div>
                    <h3 className="m-0 text-navy font-bold text-xl uppercase tracking-tight">Verify Token Identity</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 m-0">
                      Review active municipal citizen token specifications
                    </p>
                  </div>

                  {activeTokenProcess.isReSubmission && (
                    <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm font-semibold leading-relaxed">
                      <strong className="block uppercase text-xs font-bold text-red-700 mb-1">🚨 Application under Objection</strong>
                      Objection Remarks: <span className="font-bold text-navy">"{activeTokenProcess.originalApp.objection_remarks}"</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6 text-sm font-semibold border-y py-5 my-1 leading-relaxed">
                    <div>
                      <span className="text-slate-400 block uppercase text-xs font-bold tracking-wider">Token Number</span>
                      <span className="text-2xl font-extrabold font-mono text-navy mt-1 block">{activeTokenProcess.tokenNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase text-xs font-bold tracking-wider">Department Block</span>
                      <span className="text-2xl font-extrabold text-navy uppercase mt-1 block">{activeTokenProcess.block}</span>
                    </div>
                    <div className="mt-4">
                      <span className="text-slate-400 block uppercase text-xs font-bold tracking-wider">Service Type</span>
                      <span className="text-2xl font-extrabold text-saffron uppercase mt-1 block">
                        {activeTokenProcess.serviceType.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="mt-4">
                      <span className="text-slate-400 block uppercase text-xs font-bold tracking-wider">Issued Time</span>
                      <span className="text-lg font-bold text-slate-500 font-mono mt-1 block">
                        {new Date(activeTokenProcess.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Visual status onboarding badge */}
                  <div className="mt-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex gap-3 text-sm font-semibold leading-relaxed shadow-sm">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-extrabold block uppercase text-[11px] tracking-wider leading-none mb-1 text-emerald-700">Token Status: Active</span>
                      Citizen ticket successfully verified against local municipal queue database. Capture live photo to proceed.
                    </div>
                  </div>
                </div>

                {/* Column 2: Camera Portal Viewport (where "select fields to correction was initially") */}
                <div className="flex flex-col gap-6 bg-white p-7 border border-slate-200 shadow-sm rounded-2xl justify-between min-h-[400px]">
                  <div>
                    <h3 className="m-0 text-navy font-bold text-xl uppercase tracking-tight">Citizen Portrait Verification</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 m-0">
                      Launch integrated camera to capture citizen selfie verification
                    </p>
                  </div>

                  {/* Webcam Viewport box */}
                  <div className="flex flex-col items-center gap-5 my-2">
                    <div className="w-72 h-52 bg-slate-950 border-2 border-slate-800 rounded-2xl relative flex items-center justify-center overflow-hidden shadow-inner">
                      {selfieSrc ? (
                        <img src={selfieSrc} alt="Applicant Portrait" className="w-full h-full object-cover" />
                      ) : cameraActive ? (
                        <video ref={videoRef} autoPlay className="w-full h-full object-cover scale-x-[-1]" />
                      ) : (
                        <div className="flex flex-col items-center text-slate-600 gap-2">
                          <Camera className="w-12 h-12 animate-pulse" />
                          <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500">Integrated Camera Offline</span>
                        </div>
                      )}
                      
                      <canvas ref={canvasRef} className="hidden" />

                      {cameraActive && (
                        <div className="absolute inset-0 border-2 border-emerald-400 rounded-2xl pointer-events-none flex flex-col justify-between p-3.5">
                          <div className="flex justify-between">
                            <span className="w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                            <span className="w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                          </div>
                          <div className="w-full text-center text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest bg-slate-950/60 py-0.5 animate-pulse rounded-md">
                            rec active feed
                          </div>
                          <div className="flex justify-between">
                            <span className="w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                            <span className="w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Camera buttons */}
                    <div className="flex gap-3">
                      {!cameraActive && !selfieSrc ? (
                        <button 
                          onClick={startCamera}
                          className="px-6 py-3 bg-navy text-white text-md font-bold rounded-xl active:scale-95 transition-transform flex items-center gap-2 cursor-pointer border border-slate-700 shadow-md hover:bg-slate-800"
                        >
                          <Camera className="w-4 h-4 text-saffron" />
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
                          <span>Retake Snapshot</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Onboarding text helper */}
                  <p className="text-xs text-slate-500 text-center font-semibold m-0 leading-normal border-t pt-3">
                    Integrated webcam complies with Aadhaar secure snapshot protocols. Captured photo is temporarily spooled with application metadata.
                  </p>
                </div>

              </div>

              {/* Verification transition action button container (aligned consistently at bottom-right) */}
              <div className="flex gap-4 justify-end mt-4 border-t pt-4">
                <button 
                  onClick={handleCloseProcess}
                  className="px-8 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl active:scale-95 transition-transform cursor-pointer"
                >
                  Cancel Session
                </button>
                <button 
                  disabled={!selfieSrc}
                  onClick={() => setStep(activeTokenProcess.serviceType === 'correction' ? 'CORRECTION_FIELDS' : 'DETAILS')}
                  className="px-8 py-3 bg-navy hover:bg-slate-800 text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <span>
                    {activeTokenProcess.serviceType === 'correction' ? 'Proceed to Fields Selection' : 'Proceed to Form Details'}
                  </span>
                  <ArrowRight className="w-5 h-5 text-saffron" />
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* STEP 1.5: CORRECTION FIELDS SELECTION */}
      {step === 'CORRECTION_FIELDS' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="m-0 text-navy font-bold text-xl uppercase tracking-tight">Step {getStepNumber('CORRECTION_FIELDS')} — Select Correction Fields</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 m-0">
                Choose the Pehchan certificate fields requiring corrections
              </p>
            </div>
            
            <button
              onClick={() => setStep('VERIFICATION')}
              className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-600 font-bold text-sm cursor-pointer"
            >
              Back
            </button>
          </div>

          <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl flex flex-col gap-4">
            <div>
              <h4 className="m-0 text-navy font-bold text-lg flex items-center gap-1.5 uppercase">
                <Sparkles className="w-5 h-5 text-saffron" />
                Select Fields to Correct
              </h4>
              <p className="text-xs text-slate-400 font-bold m-0 mt-1 uppercase tracking-widest">
                Choose one or more fields from the official government registry list
              </p>
            </div>

            {/* Checkbox fields grid (3 columns for premium widescreen, collapses on mobile) */}
            <div className="overflow-y-auto max-h-[380px] pr-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 border rounded-xl p-4 bg-slate-50 shadow-inner font-semibold">
              {PREDEFINED_FIELDS.map((field) => (
                <label 
                  key={field.id}
                  className={`flex items-center gap-3.5 p-3.5 border rounded-xl cursor-pointer select-none transition-all text-md font-bold hover:bg-white ${
                    selectedFields[field.id] 
                      ? 'bg-navy/5 border-navy shadow-sm text-navy font-extrabold' 
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!!selectedFields[field.id]}
                    onChange={(e) => setSelectedFields({
                      ...selectedFields,
                      [field.id]: e.target.checked
                    })}
                    className="w-5 h-5 accent-navy shrink-0 cursor-pointer"
                  />
                  <span className="leading-snug">{field.label}</span>
                </label>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 justify-end mt-4 border-t pt-4">
              <button
                onClick={() => setStep('VERIFICATION')}
                className="px-8 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl active:scale-95 transition-transform cursor-pointer"
              >
                Previous Step
              </button>
              
              <button
                disabled={Object.keys(selectedFields).filter(k => selectedFields[k]).length === 0}
                onClick={() => setStep('DETAILS')}
                className="px-8 py-3 bg-navy hover:bg-slate-800 text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <span>Proceed to Form Details</span>
                <ArrowRight className="w-5 h-5 text-saffron" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: DYNAMIC DETAILS INPUT FORM */}
      {step === 'DETAILS' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="m-0 text-navy font-bold text-xl uppercase tracking-tight">Step {getStepNumber('DETAILS')} — Applicant Information Forms</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 m-0">
                Complete details for administrative enrollment database
              </p>
            </div>
            
            <button
              onClick={() => setStep(activeTokenProcess?.serviceType === 'correction' ? 'CORRECTION_FIELDS' : 'VERIFICATION')}
              className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-600 font-bold text-sm cursor-pointer"
            >
              Back
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            {/* Common Profile Section Form */}
            <div className="flex flex-col gap-4 bg-white border border-slate-200 shadow-sm p-6 rounded-2xl w-full">
              <h4 className="m-0 text-navy font-bold border-b pb-2 text-md flex items-center gap-1.5 uppercase">
                <Users className="w-5 h-5 text-saffron" />
                Citizen General Bio-data
              </h4>

              <div className="grid grid-cols-1 gap-3.5 text-sm font-semibold font-rajdhani mt-2">
                <div className="flex flex-col gap-1">
                  <label className="text-slate-600">Applicant Name (आवेदक का नाम)</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter full name in English"
                    value={formData.applicantName}
                    onChange={(e) => setFormData({ ...formData, applicantName: e.target.value.toUpperCase() })}
                    className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-navy outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-slate-600">Mobile Number (10-Digit Mobile)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    placeholder="Enter valid citizen contact number"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value.replace(/[^0-9]/g, '') })}
                    className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-navy outline-none"
                  />
                </div>

                {activeTokenProcess.serviceType === 'correction' ? (
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-600">Base Registration Number (पंजीकरण संख्या)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. B-2026/89127"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                      className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-navy outline-none"
                    />
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-600">Father's Name (प्रमाण पत्र धारक के पिता)</label>
                    <input
                      type="text"
                      placeholder="Father's name"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: e.target.value.toUpperCase() })}
                      className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-navy outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-600">Mother's Name (प्रमाण पत्र धारक की माता)</label>
                    <input
                      type="text"
                      placeholder="Mother's name"
                      value={formData.motherName}
                      onChange={(e) => setFormData({ ...formData, motherName: e.target.value.toUpperCase() })}
                      className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-navy outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-600">Relation with Certificate Holder (प्रमाण पत्र धारक से आपका संबंध)</label>
                    <select
                      value={formData.relationWithApplicant}
                      onChange={(e) => setFormData({ ...formData, relationWithApplicant: e.target.value })}
                      className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-navy outline-none"
                    >
                      <option value="Self">Self (स्वयं)</option>
                      <option value="Father">Father (पिता)</option>
                      <option value="Mother">Mother (माता)</option>
                      <option value="Husband">Husband (पति)</option>
                      <option value="Relative">Guardian (संरक्षक)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-slate-600">DOB of Applicant</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-navy outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Specialized Form Panel (Depending on Token Service Type) */}
            <div className="flex flex-col gap-4 bg-white border p-6 rounded-2xl flex-1 w-full min-h-[350px]">
              
              {activeTokenProcess.serviceType === 'correction' ? (
                // ✏️ CORRECTION: RENDER OLD & NEW VALUE GRID FOR SELECTED FIELDS
                <div className="flex flex-col gap-4">
                  <h4 className="m-0 text-navy font-bold border-b pb-2 text-md flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-5 h-5 text-saffron" />
                    Correction Old & New Value Registry
                  </h4>

                  <div className="flex flex-col gap-3.5 overflow-y-auto max-h-[290px] pr-1">
                    {PREDEFINED_FIELDS.filter(f => selectedFields[f.id]).map((field) => (
                      <div key={field.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col gap-2">
                        <span className="text-sm font-bold text-navy">{field.label}</span>
                        <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                          <div className="flex flex-col gap-1">
                            <label className="text-slate-400">Old Value (पुराना मूल्य)</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Suresh Sharma"
                              value={formData.fieldValues[field.id]?.old || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                fieldValues: {
                                  ...formData.fieldValues,
                                  [field.id]: {
                                    ...formData.fieldValues[field.id],
                                    old: e.target.value
                                  }
                                }
                              })}
                              className="p-2 border rounded-lg text-sm text-navy bg-white outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-slate-400">New Value (नया मूल्य)</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Ramesh Sharma"
                              value={formData.fieldValues[field.id]?.new || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                fieldValues: {
                                  ...formData.fieldValues,
                                  [field.id]: {
                                    ...formData.fieldValues[field.id],
                                    new: e.target.value
                                  }
                                }
                              })}
                              className="p-2 border rounded-lg text-sm text-navy bg-white focus:border-navy outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // 📜 NEW REGISTRATION: RENDER DETAILED FORMS FOR BIRTH, DEATH, MARRIAGE
                <div className="flex flex-col gap-4">
                  <h4 className="m-0 text-navy font-bold border-b pb-2 text-md flex items-center gap-1.5 uppercase">
                    <FileText className="w-5 h-5 text-blue-600" />
                    {activeTokenProcess.block.toUpperCase()} Government Details Registry
                  </h4>

                  <div className="grid grid-cols-1 gap-3 text-sm font-semibold">
                    {/* Birth Department Form */}
                    {activeTokenProcess.block === 'birth' && (
                      <>
                        <div className="flex flex-col gap-1">
                          <label className="text-slate-600">Child's Name (अंग्रेजी में)</label>
                          <input
                            type="text"
                            placeholder="Enter child's full name"
                            value={newRegData.childName}
                            onChange={(e) => setNewRegData({ ...newRegData, childName: e.target.value.toUpperCase() })}
                            className="p-2.5 border rounded-xl text-base text-navy font-bold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-slate-600">Gender</label>
                            <select
                              value={newRegData.gender}
                              onChange={(e) => setNewRegData({ ...newRegData, gender: e.target.value })}
                              className="p-2.5 border rounded-xl text-base text-navy font-bold bg-white"
                            >
                              <option value="MALE">Male (पुरुष)</option>
                              <option value="FEMALE">Female (महिला)</option>
                              <option value="OTHER">Transgender (अन्य)</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-slate-600">Birth Date</label>
                            <input
                              type="date"
                              value={newRegData.dob}
                              onChange={(e) => setNewRegData({ ...newRegData, dob: e.target.value })}
                              className="p-2.5 border rounded-xl text-base text-navy font-bold font-mono"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-slate-600">Place of Birth</label>
                          <select
                            value={newRegData.placeOfBirth}
                            onChange={(e) => setNewRegData({ ...newRegData, placeOfBirth: e.target.value })}
                            className="p-2.5 border rounded-xl text-base text-navy font-bold bg-white"
                          >
                            <option value="HOSPITAL">Hospital / Nursing home (अस्पताल)</option>
                            <option value="HOME">Domiciliary / Home birth (घर पर)</option>
                          </select>
                        </div>
                        {newRegData.placeOfBirth === 'HOSPITAL' && (
                          <div className="flex flex-col gap-1">
                            <label className="text-slate-600">Hospital Details (अस्पताल का नाम)</label>
                            <input
                              type="text"
                              placeholder="e.g. SMS Government Hospital, Jaipur"
                              value={newRegData.hospitalName}
                              onChange={(e) => setNewRegData({ ...newRegData, hospitalName: e.target.value })}
                              className="p-2.5 border rounded-xl text-base text-navy font-bold"
                            />
                          </div>
                        )}
                        <div className="flex flex-col gap-1">
                          <label className="text-slate-600">Permanent Address (स्थायी पता)</label>
                          <textarea
                            placeholder="Enter parent's full permanent residential address"
                            value={newRegData.permanentAddress}
                            onChange={(e) => setNewRegData({ ...newRegData, permanentAddress: e.target.value })}
                            className="p-2.5 border rounded-xl text-base text-navy font-semibold h-16 outline-none resize-none"
                          />
                        </div>
                      </>
                    )}

                    {/* Death Department Form */}
                    {activeTokenProcess.block === 'death' && (
                      <>
                        <div className="flex flex-col gap-1">
                          <label className="text-slate-600">Deceased Person Name (मृतक का नाम)</label>
                          <input
                            type="text"
                            placeholder="Enter deceased's full name"
                            value={newRegData.deceasedName}
                            onChange={(e) => setNewRegData({ ...newRegData, deceasedName: e.target.value.toUpperCase() })}
                            className="p-2.5 border rounded-xl text-base text-navy font-bold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-slate-600">Gender</label>
                            <select
                              value={newRegData.gender}
                              onChange={(e) => setNewRegData({ ...newRegData, gender: e.target.value })}
                              className="p-2.5 border rounded-xl text-base text-navy font-bold bg-white"
                            >
                              <option value="MALE">Male (पुरुष)</option>
                              <option value="FEMALE">Female (महिला)</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-slate-600">Age at Death</label>
                            <input
                              type="number"
                              placeholder="e.g. 68"
                              value={newRegData.ageAtDeath}
                              onChange={(e) => setNewRegData({ ...newRegData, ageAtDeath: e.target.value })}
                              className="p-2.5 border rounded-xl text-base text-navy font-bold"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-slate-600 font-mono">Date of Death</label>
                          <input
                            type="date"
                            value={newRegData.dob}
                            onChange={(e) => setNewRegData({ ...newRegData, dob: e.target.value })}
                            className="p-2.5 border rounded-xl text-base text-navy font-bold font-mono"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-slate-600 font-bold">Place of Death Category (मृत्यु स्थान श्रेणी)</label>
                          <select
                            value={newRegData.placeOfDeathCategory || 'HOSPITAL'}
                            onChange={(e) => setNewRegData({ ...newRegData, placeOfDeathCategory: e.target.value })}
                            className="p-2.5 border rounded-xl text-base text-navy font-bold bg-white"
                          >
                            <option value="HOSPITAL">Hospital / Institution (अस्पताल)</option>
                            <option value="HOME">Domiciliary / Home (घर पर)</option>
                            <option value="BROUGHT_DEAD">Brought Dead to Hospital (अस्पताल में मृत लाया गया)</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-slate-600">Place of Death Details (मृत्यु स्थान का विवरण)</label>
                          <input
                            type="text"
                            placeholder="Hospital name or residential location details"
                            value={newRegData.placeOfDeath}
                            onChange={(e) => setNewRegData({ ...newRegData, placeOfDeath: e.target.value })}
                            className="p-2.5 border rounded-xl text-base text-navy font-bold"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-slate-600">Cause of Death (मृत्यु का कारण)</label>
                          <input
                            type="text"
                            placeholder="e.g. Cardiorespiratory Arrest / Cardiac Failure"
                            value={newRegData.causeOfDeath}
                            onChange={(e) => setNewRegData({ ...newRegData, causeOfDeath: e.target.value })}
                            className="p-2.5 border rounded-xl text-base text-navy font-bold"
                          />
                        </div>
                      </>
                    )}

                    {/* Marriage Department Form */}
                    {activeTokenProcess.block === 'marriage' && (
                      <div className="overflow-y-auto max-h-[300px] pr-1 flex flex-col gap-3">
                        <div className="border border-purple-100 rounded-xl p-3 bg-purple-50/10 flex flex-col gap-3.5">
                          <span className="font-bold text-purple-700 uppercase text-xs">Groom Details (वर विवरण)</span>
                          <div className="flex flex-col gap-1">
                            <label className="text-slate-600">Groom's Full Name</label>
                            <input
                              type="text"
                              value={newRegData.groomName}
                              onChange={(e) => setNewRegData({ ...newRegData, groomName: e.target.value.toUpperCase() })}
                              className="p-2 border rounded-lg text-sm text-navy font-bold"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                              <label className="text-slate-600">Age</label>
                              <input
                                type="number"
                                placeholder="e.g. 26"
                                value={newRegData.groomAge}
                                onChange={(e) => setNewRegData({ ...newRegData, groomAge: e.target.value })}
                                className="p-2 border rounded-lg text-sm text-navy font-bold"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-slate-600 font-mono">Father's Name</label>
                              <input
                                type="text"
                                value={newRegData.groomFather}
                                onChange={(e) => setNewRegData({ ...newRegData, groomFather: e.target.value.toUpperCase() })}
                                className="p-2 border rounded-lg text-sm text-navy font-bold"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="border border-purple-100 rounded-xl p-3 bg-purple-50/10 flex flex-col gap-3.5">
                          <span className="font-bold text-purple-700 uppercase text-xs">Bride Details (वधू विवरण)</span>
                          <div className="flex flex-col gap-1">
                            <label className="text-slate-600">Bride's Full Name</label>
                            <input
                              type="text"
                              value={newRegData.brideName}
                              onChange={(e) => setNewRegData({ ...newRegData, brideName: e.target.value.toUpperCase() })}
                              className="p-2 border rounded-lg text-sm text-navy font-bold"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                              <label className="text-slate-600">Age</label>
                              <input
                                type="number"
                                placeholder="e.g. 23"
                                value={newRegData.brideAge}
                                onChange={(e) => setNewRegData({ ...newRegData, brideAge: e.target.value })}
                                className="p-2 border rounded-lg text-sm text-navy font-bold"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-slate-600 font-mono">Father's Name</label>
                              <input
                                type="text"
                                value={newRegData.brideFather}
                                onChange={(e) => setNewRegData({ ...newRegData, brideFather: e.target.value.toUpperCase() })}
                                className="p-2 border rounded-lg text-sm text-navy font-bold"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-slate-600 font-mono">Date of Marriage</label>
                          <input
                            type="date"
                            value={newRegData.dob}
                            onChange={(e) => setNewRegData({ ...newRegData, dob: e.target.value })}
                            className="p-2.5 border rounded-xl text-base text-navy font-bold font-mono"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-slate-600">Place of Solemnization (विवाह स्थल)</label>
                          <input
                            type="text"
                            placeholder="e.g. Radisson Palace, Jaipur"
                            value={newRegData.placeOfMarriage}
                            onChange={(e) => setNewRegData({ ...newRegData, placeOfMarriage: e.target.value })}
                            className="p-2.5 border rounded-xl text-base text-navy font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Form Actions */}
          <div className="flex gap-4 justify-end mt-4 border-t pt-4">
            <button
              onClick={() => setStep(activeTokenProcess?.serviceType === 'correction' ? 'CORRECTION_FIELDS' : 'VERIFICATION')}
              className="px-8 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl active:scale-95 transition-transform cursor-pointer"
            >
              Previous Step
            </button>
            <button
              onClick={() => setStep('SCANNING')}
              className="px-8 py-3 bg-navy hover:bg-slate-800 text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>Scan Required Documents</span>
              <ArrowRight className="w-5 h-5 text-saffron" />
            </button>
          </div>

        </div>
      )}

      {/* STEP 3: DOCUMENT CHECKLIST & SCANNER SIMULATION */}
      {step === 'SCANNING' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="m-0 text-navy font-bold text-xl uppercase tracking-tight">Step {getStepNumber('SCANNING')} — Scans & Physical Verification</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 m-0">
                Scan and upload documents required by government guidelines
              </p>
            </div>
            
            <button
              onClick={() => setStep('DETAILS')}
              className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-600 font-bold text-sm cursor-pointer"
            >
              Back
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            
            {/* Column 1: Document checklist */}
            <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl flex flex-col justify-between gap-4">
              <div>
                <h4 className="m-0 text-navy font-bold border-b pb-2 text-md flex items-center gap-1.5 uppercase">
                  <FileText className="w-5 h-5 text-saffron" />
                  Predefined Checklist of verified attachments
                </h4>
                
                <div className="flex flex-col gap-3 mt-4">
                  {getRequiredDocumentsList().map((doc, idx) => (
                    <div 
                      key={idx}
                      className={`flex items-center justify-between p-4 border rounded-xl transition-all shadow-sm ${
                        scannedFiles[doc] 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          scannedFiles[doc] ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {scannedFiles[doc] ? <Check className="w-4 h-4" /> : idx + 1}
                        </div>
                        <span className="font-semibold text-[0.95rem]">{doc}</span>
                      </div>
                      
                      {scannedFiles[doc] ? (
                        <span className="font-mono text-xs text-emerald-600 font-bold bg-white px-2 py-1 rounded border border-emerald-200/50">
                          {scannedFiles[doc]}
                        </span>
                      ) : (
                        <button
                          onClick={() => triggerScanFile(doc)}
                          className="px-3.5 py-1.5 bg-navy hover:bg-slate-800 text-white font-bold text-xs rounded-lg active:scale-95 transition-transform cursor-pointer"
                        >
                          Scan & Upload
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Additional/Other Document (Optional Scan Option) */}
                  <div 
                    className={`flex items-center justify-between p-4 border rounded-xl transition-all shadow-sm ${
                      scannedFiles["Other Document (अन्य दस्तावेज)"] 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                        : 'bg-white border-slate-200 text-slate-700 border-dashed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        scannedFiles["Other Document (अन्य दस्तावेज)"] ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-450'
                      }`}>
                        {scannedFiles["Other Document (अन्य दस्तावेज)"] ? <Check className="w-4 h-4" /> : "+"}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[0.95rem]">Other Document (अन्य दस्तावेज)</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Optional / अतिरिक्त दस्तावेज</span>
                      </div>
                    </div>
                    
                    {scannedFiles["Other Document (अन्य दस्तावेज)"] ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-emerald-600 font-bold bg-white px-2 py-1 rounded border border-emerald-200/50">
                          {scannedFiles["Other Document (अन्य दस्तावेज)"]}
                        </span>
                        <button
                          onClick={() => setScannedFiles(prev => {
                            const copy = { ...prev };
                            delete copy["Other Document (अन्य दस्तावेज)"];
                            return copy;
                          })}
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded active:scale-95 transition-transform cursor-pointer border border-red-200/30"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => triggerScanFile("Other Document (अन्य दस्तावेज)")}
                        className="px-3.5 py-1.5 bg-slate-500 hover:bg-slate-600 text-white font-bold text-xs rounded-lg active:scale-95 transition-transform cursor-pointer"
                      >
                        Scan & Upload
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Secure storage warning */}
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 text-xs flex gap-2 font-semibold font-rajdhani mt-4 leading-relaxed">
                <AlertCircle className="w-5 h-5 text-saffron shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block uppercase leading-none mb-1">MUNICIPAL SCAN SECURE RESTRICTION</span>
                  Documents scanned at counter are temporarily packaged with enrollment slip and spooled to state registrar servers. Local sandbox cache is permanently purged immediately after counter resolution.
                </div>
              </div>

            </div>

            {/* Column 2: Scanner simulation screen */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-inner flex flex-col justify-between p-6 text-white min-h-[360px] relative overflow-hidden">
              
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 z-10">
                <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">Municipal Document Scanner Feed</span>
                <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  ONLINE
                </span>
              </div>

              {/* Visual simulated scanner screen */}
              <div className="flex-1 flex flex-col items-center justify-center py-6 relative">
                {scanning ? (
                  // Sweeping laser animation
                  <div className="w-48 h-64 bg-slate-800 border-2 border-slate-700/60 rounded-xl relative flex flex-col items-center justify-between p-4 overflow-hidden">
                    <FileText className="w-20 h-20 text-slate-500 mt-16 animate-pulse" />
                    <span className="text-[10px] text-slate-400 font-mono tracking-wider animate-pulse">Scanning: {scanning.substring(0, 20)}...</span>
                    
                    {/* Laser beam */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-[scan_2.5s_infinite_linear]" 
                      style={{
                        animation: 'scan-laser 2.5s infinite linear'
                      }}
                    />
                    
                    {/* Injecting CSS keyframes for scan simulation */}
                    <style>{`
                      @keyframes scan-laser {
                        0% { top: 0%; }
                        50% { top: 100%; }
                        100% { top: 0%; }
                      }
                    `}</style>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <FileText className="w-20 h-20 text-slate-700" />
                    <span className="text-xs uppercase font-bold tracking-widest text-slate-500">
                      Scanner Ready. Place Document.
                    </span>
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-slate-500 font-semibold border-t border-slate-800 pt-3 z-10">
                Integrated Hardware Model: Municipal-Scanner-X2
              </div>

            </div>

          </div>

          {/* Action buttons */}
          <div className="flex gap-4 justify-end mt-4 border-t pt-4">
            <button
              onClick={() => setStep('DETAILS')}
              className="px-8 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl active:scale-95 transition-transform cursor-pointer"
            >
              Previous Step
            </button>
            
            <button
              onClick={() => setStep('PAYMENT')}
              className="px-8 py-3 bg-navy hover:bg-slate-800 text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>Proceed to Payment</span>
              <ArrowRight className="w-5 h-5 text-saffron" />
            </button>
          </div>

        </div>
      )}

      {/* STEP 4: PAYMENT SUMMARY */}
      {step === 'PAYMENT' && (
        <div className="flex flex-col gap-6 font-rajdhani">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="m-0 text-navy font-bold text-xl uppercase tracking-tight">Step {getStepNumber('PAYMENT')} — Checkout & Payment Collection</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 m-0">
                Collect flat municipal service fee from citizen
              </p>
            </div>
            
            <button
              onClick={() => setStep('SCANNING')}
              className="px-4 py-2 border rounded-xl hover:bg-slate-50 text-slate-600 font-bold text-sm cursor-pointer"
            >
              Back
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch max-w-4xl mx-auto w-full">
            
            {/* Box A: Invoice summary */}
            <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl flex flex-col justify-between gap-5 text-navy">
              <div>
                <span className="font-bebas text-sm tracking-wider text-saffron uppercase block">payment statement</span>
                <h3 className="font-bold text-xl m-0 mt-1 uppercase">Nagar Nigam Billing Ticket</h3>
              </div>

              <div className="flex flex-col gap-2 font-semibold text-slate-600 border-y py-4 my-2">
                <div className="flex justify-between text-base">
                  <span>Service Type:</span>
                  <span className="text-navy uppercase">{activeTokenProcess.serviceType.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span>Department Block:</span>
                  <span className="text-navy uppercase">{activeTokenProcess.block}</span>
                </div>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-400 uppercase">Service Fee Due:</span>
                <span className="text-4xl font-extrabold text-navy">
                  {activeTokenProcess?.isReSubmission ? '₹0.00' : '₹20.00'}
                </span>
              </div>
            </div>

            {/* Box B: Select payment mode */}
            <div className="border border-slate-200 p-6 rounded-2xl flex flex-col justify-between gap-6 bg-white shadow-sm font-rajdhani">
              {activeTokenProcess?.isReSubmission ? (
                <div className="flex flex-col gap-4 flex-1 justify-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Payment Statement</span>
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-sm text-emerald-950 font-bold leading-relaxed shadow-sm">
                    <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Fees waived for resubmitting an objection application. Previously paid.</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Choose Payment Method</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPaymentMethod('CASH')}
                        className={`p-4 border-2 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 ${
                          paymentMethod === 'CASH' 
                            ? 'border-navy bg-navy/5 text-navy shadow-sm' 
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <CreditCard className="w-6 h-6" />
                        <span className="font-bold text-sm">Offline Cash</span>
                      </button>

                      <button
                        onClick={() => setPaymentMethod('UPI_QR')}
                        className={`p-4 border-2 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 ${
                          paymentMethod === 'UPI_QR' 
                            ? 'border-navy bg-navy/5 text-navy shadow-sm' 
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Smartphone className="w-6 h-6" />
                        <span className="font-bold text-sm">Simulate UPI QR</span>
                      </button>
                    </div>
                  </div>

                  {paymentMethod === 'UPI_QR' ? (
                    // Display mock dynamic QR
                    <div className="flex items-center gap-4 bg-slate-50 border p-3 rounded-xl">
                      <div className="w-20 h-20 bg-white border border-slate-300 rounded-lg p-1.5 flex items-center justify-center shrink-0">
                        <img 
                          src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=nagarnigam.kiosk@sbi%26am=20.00%26tn=Counter-Bill" 
                          alt="Mock QR" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="text-left text-xs leading-snug">
                        <span className="font-bold text-navy uppercase block">dynamic upi code generated</span>
                        <span className="text-slate-500 block mt-0.5">Point terminal display to citizen, wait for UPI transaction confirmation.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 bg-amber-50/50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 leading-snug">
                      <AlertCircle className="w-5 h-5 text-saffron shrink-0" />
                      <span>Admin verifies cash received of flat ₹20.00 from the citizen before completing registry.</span>
                    </div>
                  )}
                </>
              )}

              <button
                disabled={paying}
                onClick={handleSubmission}
                className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                {paying ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Spooling Enrollment Slip...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Approve & Print Enrollment Slip</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* STEP 5: REGISTRY COMPLETED & A4 ENROLLMENT SLIP PRINT */}
      {step === 'COMPLETE' && enrollmentResult && (
        <div className="flex flex-col gap-6 text-navy">
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
          <div className="text-center flex flex-col items-center gap-4 mt-2">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center shadow-inner">
              <Check className="w-10 h-10 text-emerald-600" />
            </div>
            
            <div>
              <h3 className="m-0 text-emerald-600 font-bold text-2xl uppercase">application registry success!</h3>
              <p className="text-sm font-semibold text-slate-400 mt-1 m-0 uppercase tracking-widest leading-none">
                enrollment slip successfully spooled
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start max-w-4xl mx-auto w-full font-rajdhani">
            
            {/* Column A: Simulated Mobile Smartphone graphic with SMS template */}
            <div className="flex flex-col items-center gap-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Simulated SMS Citizen Notification</span>
              
              <div className="w-60 h-[420px] bg-slate-950 border-4 border-slate-800 rounded-[36px] shadow-xl p-3.5 relative flex flex-col justify-between items-stretch">
                {/* Smartphone ear speaker */}
                <div className="w-16 h-4 bg-slate-800 rounded-full mx-auto mb-2 shrink-0 flex items-center justify-center">
                  <div className="w-8 h-1 bg-slate-900 rounded-full" />
                </div>
                
                {/* Smartphone internal display */}
                <div className="flex-1 bg-slate-900 rounded-[24px] p-3 flex flex-col gap-3 relative overflow-hidden text-white font-rajdhani">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span>9:41 AM</span>
                    <span className="text-emerald-400">4G LTE</span>
                  </div>

                  {/* SMS Message Bubble */}
                  <div className="bg-slate-800 rounded-2xl p-3 border border-slate-700 shadow-md flex flex-col gap-1 text-[11px] leading-snug">
                    <div className="flex justify-between items-center text-saffron border-b border-slate-700/80 pb-1 mb-1 font-bold">
                      <span>NAGAR NIGAM SMS</span>
                      <span>JUST NOW</span>
                    </div>
                    
                    <p className="m-0 text-slate-200">
                      Dear Applicant, your {enrollmentResult.serviceType === 'correction' ? 'correction' : 'new registration'} request for <strong>{enrollmentResult.departmentBlock.toUpperCase()}</strong> has been submitted successfully under <strong>Enrollment No: {enrollmentResult.enrollmentId}</strong>.
                    </p>
                    <p className="m-0 text-slate-400 mt-1 italic">
                      A SMS will be sent once approved by Registrar. - Jaipur Municipal
                    </p>
                  </div>
                </div>

                {/* Smartphone bottom home band */}
                <div className="w-20 h-1 bg-slate-800 rounded-full mx-auto mt-2 shrink-0" />
              </div>
            </div>

            {/* Column B: Enrollment Slip Action and Details */}
            <div className="flex flex-col gap-5 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <h4 className="m-0 text-navy font-bold border-b pb-2 text-md flex items-center gap-1.5 uppercase">
                <Printer className="w-5 h-5 text-saffron" />
                Physical A4 Printer Dispatch
              </h4>

              <div className="flex flex-col gap-3 text-sm font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span>Enrollment ID:</span>
                  <span className="text-navy font-bold font-mono">{enrollmentResult.enrollmentId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Token Number:</span>
                  <span className="text-navy font-bold font-mono">{enrollmentResult.tokenNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>Applicant Name:</span>
                  <span className="text-navy font-bold uppercase">{enrollmentResult.commonDetails.applicantName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Verified Documents:</span>
                  <span className="text-navy font-bold font-mono">{enrollmentResult.uploadedDocuments.length} Scanned</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee:</span>
                  {enrollmentResult.paymentDetails.method === 'EXEMPT' ? (
                    <span className="text-emerald-600 font-bold">₹0.00 (EXEMPT)</span>
                  ) : enrollmentResult.paymentDetails.method === 'CASH' ? (
                    <span className="text-amber-600 font-bold">₹20.00 (PENDING)</span>
                  ) : (
                    <span className="text-emerald-600 font-bold">₹20.00 (PAID)</span>
                  )}
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2.5 mt-1 font-bold text-navy">
                  <span>Next Visit:</span>
                  <span>{enrollmentResult.next_visit_time ? new Date(enrollmentResult.next_visit_time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <button
                  onClick={handlePrintEnrollmentSlip}
                  className="w-full p-4 bg-navy hover:bg-slate-800 text-white font-bold text-lg rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Printer className="w-5 h-5 text-saffron" />
                  <span>Print Physical Slip (A4)</span>
                </button>

                <button
                  onClick={handleCloseProcess}
                  className="w-full p-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-md rounded-xl active:scale-95 transition-colors"
                >
                  Close & Serve Next Token
                </button>
              </div>
            </div>

          </div>

          {/* 🖨️ A4 ENROLLMENT PRINT SLIP BODY (HIDDEN BY DEFAULT, RENDERED IN PRINT MEDIA ONLY) */}
          {enrollmentResult && createPortal(
            <div className="hidden print:block w-full p-10 text-black font-sans leading-relaxed text-left" style={{ fontFamily: 'sans-serif' }}>
              <div className="flex items-center justify-between border-b-4 border-black pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 border border-black flex items-center justify-center font-bold text-2xl">NN</div>
                  <div>
                    <h2 className="text-2xl font-bold uppercase m-0 leading-none">nagar nigam jaipur</h2>
                    <span className="text-xs uppercase font-bold tracking-wider text-slate-500 mt-1 block">citizen registry center</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm uppercase block font-bold">enrollment voucher</span>
                  <span className="text-lg font-bold font-mono block mt-1">{enrollmentResult.enrollmentId}</span>
                </div>
              </div>

              <h3 className="text-center font-bold uppercase text-lg border-b pb-2 mb-6">Citizen Request Enrollment Acknowledgement</h3>

              <div className="grid grid-cols-2 gap-6 text-sm mb-6 pb-6 border-b">
                <div>
                  <p className="my-1.5"><strong>Enrollment Number:</strong> {enrollmentResult.enrollmentId}</p>
                  <p className="my-1.5"><strong>Counter Token Number:</strong> {enrollmentResult.tokenNumber}</p>
                  <p className="my-1.5"><strong>Issued Date:</strong> {new Date(enrollmentResult.submittedAt || Date.now()).toLocaleDateString()}</p>
                  <p className="my-1.5"><strong>Department Block:</strong> {enrollmentResult.departmentBlock.toUpperCase()}</p>
                  <p className="my-1.5"><strong>Application Type:</strong> {enrollmentResult.serviceType.toUpperCase()}</p>
                  <p className="my-1.5 font-bold" style={{ color: '#1e3a8a' }}><strong>Next Visit Scheduled:</strong> {enrollmentResult.next_visit_time ? new Date(enrollmentResult.next_visit_time).toLocaleString('en-IN') : 'N/A'}</p>
                </div>
                <div>
                  <p className="my-1.5"><strong>Applicant Name:</strong> {enrollmentResult.commonDetails.applicantName.toUpperCase()}</p>
                  <p className="my-1.5"><strong>Applicant Contact:</strong> {enrollmentResult.commonDetails.mobileNumber}</p>
                  <p className="my-1.5"><strong>Base Reg ID:</strong> {enrollmentResult.commonDetails.registrationNumber}</p>
                  <p className="my-1.5">
                    <strong>Payment Fee:</strong>{' '}
                    {enrollmentResult.paymentDetails.method === 'EXEMPT' ? (
                      <span style={{ color: '#059669', fontWeight: 'bold' }}>₹0.00 (FEE EXEMPT)</span>
                    ) : enrollmentResult.paymentDetails.method === 'CASH' ? (
                      <span style={{ color: '#d97706', fontWeight: 'bold' }}>₹20.00 (PENDING via CASH)</span>
                    ) : (
                      <span>₹20.00 (PAID via {enrollmentResult.paymentDetails.method})</span>
                    )}
                  </p>
                  <p className="my-1.5"><strong>Transaction Reference:</strong> {enrollmentResult.paymentDetails.transactionId}</p>
                </div>
              </div>

              {enrollmentResult.serviceType === 'correction' && (
                <div className="mb-6">
                  <h4 className="font-bold uppercase text-sm border-b pb-1.5 mb-3">Correction Field registries</h4>
                  <table className="w-full text-sm border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-300 p-2 text-left">Correction Particular field</th>
                        <th className="border border-slate-300 p-2 text-left">Old Value in registry</th>
                        <th className="border border-slate-300 p-2 text-left">New Value requested</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrollmentResult.correctionFields.map((field, idx) => (
                        <tr key={idx}>
                          <td className="border border-slate-300 p-2 font-bold">{field.fieldName}</td>
                          <td className="border border-slate-300 p-2 font-mono text-slate-500">{field.oldValue}</td>
                          <td className="border border-slate-300 p-2 font-bold text-navy">{field.newValue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mb-6">
                <h4 className="font-bold uppercase text-sm border-b pb-1.5 mb-3 font-sans">Scanned & Uploaded Physical Attachments</h4>
                <ul className="text-sm list-inside list-disc pl-2">
                  {enrollmentResult.uploadedDocuments.map((doc, idx) => (
                    <li key={idx} className="my-1 text-slate-700">Verified Attachment: <strong>{doc}</strong></li>
                  ))}
                </ul>
              </div>

              {enrollmentResult.paymentDetails.method === 'CASH' ? (
                <div className="mt-12 flex justify-between text-xs font-semibold pt-12 border-t border-dashed">
                  <div className="text-center">
                    <div className="w-32 border-b border-black mb-2 mx-auto" />
                    <span>Applicant's Signature</span>
                  </div>
                  <div className="text-center">
                    <div className="w-32 border-b border-black mb-2 mx-auto" />
                    <span>Cashier Signature & Stamp</span>
                  </div>
                </div>
              ) : (
                <div className="mt-8 text-center text-xs font-semibold pt-4 border-t border-dashed text-slate-500 italic">
                  * This is a digitally generated acknowledgement. No signature or stamp is required.
                </div>
              )}
            </div>,
            document.body
          )}

        </div>
      )}

    </div>
  );
}
