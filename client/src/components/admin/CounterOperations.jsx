import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAdminStore } from '../../store/adminStore.js';
import { useKioskStore } from '../../store/kioskStore.js';
import axiosInstance from '../../api/axiosInstance.js';
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

  const getAgeAtMarriage = (dobString, marriageDateString) => {
    if (!dobString || !marriageDateString) return null;
    const dob = new Date(dobString);
    const dom = new Date(marriageDateString);
    if (isNaN(dob.getTime()) || isNaN(dom.getTime())) return null;
    let age = dom.getFullYear() - dob.getFullYear();
    const m = dom.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && dom.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };
  
  // Verification states
  const [cameraActive, setCameraActive] = useState(false);
  const [selfieSrc, setSelfieSrc] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanPollIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (scanPollIntervalRef.current) {
        clearInterval(scanPollIntervalRef.current);
      }
    };
  }, []);

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
    regCategory: 'NEW_REGISTRATION',
    hospitalUnfed: false,
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
    groomDob: '',
    groomFather: '',
    brideName: '',
    brideDob: '',
    brideFather: '',
    placeOfMarriage: '',
    dob: ''
  });

  // Scanning states
  const [scanning, setScanning] = useState(false);
  const [scannedFiles, setScannedFiles] = useState({});

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // CASH, UPI_QR
  const [paying, setPaying] = useState(false);
  const [cashCollected, setCashCollected] = useState(false);

  // Stateful Billing Editor States
  const [customDocName, setCustomDocName] = useState('');
  const [billingCopies, setBillingCopies] = useState(1);
  const [extraFeesList, setExtraFeesList] = useState([]);
  const [customFeeName, setCustomFeeName] = useState('');
  const [customFeeAmount, setCustomFeeAmount] = useState('');

  // Success enrollment state
  const [enrollmentResult, setEnrollmentResult] = useState(null);

  // Predefined Fields dynamic selector with Minor/Major tag
  const getPredefinedFields = () => {
    const block = activeTokenProcess?.block || 'birth';
    if (block === 'death') {
      return [
        { id: 'deceasedNameHi', label: "मृतक का नाम हिंदी में (Deceased Name in Hindi)", isMajor: true },
        { id: 'deceasedNameEn', label: "मृतक का नाम अंग्रेजी में (Deceased Name in English)", isMajor: true },
        { id: 'motherNameSpellingHi', label: "मृतक की माता का नाम - वर्तनी परिवर्तन हिंदी में (Mother's Name - Spelling Change in Hindi)", isMajor: false },
        { id: 'motherNameSpellingEn', label: "मृतक की माता का नाम - वर्तनी परिवर्तन अंग्रेजी में (Mother's Name - Spelling Change in English)", isMajor: false },
        { id: 'motherNameFullHi', label: "मृतक की माता का नाम - पूर्ण नाम परिवर्तन हिंदी में (Mother's Name - Full Name Change in Hindi)", isMajor: true },
        { id: 'motherNameFullEn', label: "मृतक की माता का नाम - पूर्ण नाम परिवर्तन अंग्रेजी में (Mother's Name - Full Name Change in English)", isMajor: true },
        { id: 'fatherNameSpellingHi', label: "मृतक के पिता का नाम - वर्तनी परिवर्तन हिंदी में (Father's Name - Spelling Change in Hindi)", isMajor: false },
        { id: 'fatherNameSpellingEn', label: "मृतक के पिता का नाम - वर्तनी परिवर्तन अंग्रेजी में (Father's Name - Spelling Change in English)", isMajor: false },
        { id: 'fatherNameFullHi', label: "मृतक के पिता का नाम - पूर्ण नाम परिवर्तन हिंदी में (Father's Name - Full Name Change in Hindi)", isMajor: true },
        { id: 'fatherNameFullEn', label: "मृतक के पिता का नाम - पूर्ण नाम परिवर्तन अंग्रेजी में (Father's Name - Full Name Change in English)", isMajor: true },
        { id: 'spouseNameSpellingHi', label: "मृतक के पति/पत्नी का नाम - वर्तनी परिवर्तन हिंदी में (Spouse Name - Spelling Change in Hindi)", isMajor: false },
        { id: 'spouseNameSpellingEn', label: "मृतक के पति/पत्नी का नाम - वर्तनी परिवर्तन अंग्रेजी में (Spouse Name - Spelling Change in English)", isMajor: false },
        { id: 'spouseNameFullHi', label: "मृतक के पति/पत्नी का नाम - पूर्ण नाम परिवर्तन हिंदी में (Spouse Name - Full Name Change in Hindi)", isMajor: true },
        { id: 'spouseNameFullEn', label: "मृतक के पति/पत्नी का नाम - पूर्ण नाम परिवर्तन अंग्रेजी में (Spouse Name - Full Name Change in English)", isMajor: true },
        { id: 'dod', label: "मृत्यु की दिनांक (Date of Death)", isMajor: true },
        { id: 'permanentAddressHi', label: "मृतक का स्थायी पता हिंदी में (Deceased Permanent Address in Hindi)", isMajor: false },
        { id: 'permanentAddressEn', label: "मृतक का स्थायी पता अंग्रेजी में (Deceased Permanent Address in English)", isMajor: false },
        { id: 'deathAddressHi', label: "मृतक का मृत्यु के समय पता हिंदी में (Address at Time of Death in Hindi)", isMajor: false },
        { id: 'deathAddressEn', label: "मृतक का मृत्यु के समय पता अंग्रेजी में (Address at Time of Death in English)", isMajor: false },
        { id: 'janAadhaar', label: "जन-आधार (Jan-Aadhaar)", isMajor: false },
        { id: 'pincode', label: "पिन कोड (Pin Code)", isMajor: false },
        { id: 'fatherAadhaar', label: "पिता का आधार नंबर (Father's Aadhaar Number)", isMajor: false },
        { id: 'motherAadhaar', label: "माता का आधार नंबर (Mother's Aadhaar Number)", isMajor: false },
        { id: 'spouseAadhaar', label: "मृतक के पति/पत्नी का आधार (Deceased's Spouse's Aadhaar)", isMajor: false },
        { id: 'gender', label: "लिंग (Gender)", isMajor: true },
        { id: 'eSign', label: "ई-साइन (E-Sign)", isMajor: false },
        { id: 'motherMobile', label: "माता का मोबाइल नंबर (Mother's Mobile Number)", isMajor: false },
        { id: 'motherEmail', label: "माता का ईमेल (Mother's Email)", isMajor: false },
        { id: 'fatherMobile', label: "पिता का मोबाइल नंबर (Father's Mobile Number)", isMajor: false },
        { id: 'fatherEmail', label: "पिता का ईमेल (Father's Email)", isMajor: false },
        { id: 'spouseMobile', label: "मृतक के पति / पत्नी का मोबाइल नंबर (Spouse's Mobile Number)", isMajor: false },
        { id: 'spouseEmail', label: "मृतक के पति / पत्नी का ईमेल (Spouse's Email)", isMajor: false }
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
    
    // Default / Birth Certificate
    return [
      { id: 'childNameHi', label: "शिशु का नाम हिंदी में (Child Name in Hindi)", isMajor: true },
      { id: 'childNameEn', label: "शिशु का नाम अंग्रेजी में (Child Name in English)", isMajor: true },
      { id: 'motherNameSpellingHi', label: "शिशु की माता का नाम - वर्तनी परिवर्तन हिंदी में (Mother's Name - Spelling Change in Hindi)", isMajor: false },
      { id: 'motherNameSpellingEn', label: "शिशु की माता का नाम - वर्तनी परिवर्तन अंग्रेजी में (Mother's Name - Spelling Change in English)", isMajor: false },
      { id: 'motherNameFullHi', label: "शिशु की माता का नाम - पूर्ण नाम परिवर्तन हिंदी में (Mother's Name - Full Name Change in Hindi)", isMajor: true },
      { id: 'motherNameFullEn', label: "शिशु की माता का नाम - पूर्ण नाम परिवर्तन अंग्रेजी में (Mother's Name - Full Name Change in English)", isMajor: true },
      { id: 'fatherNameSpellingHi', label: "शिशु के पिता का नाम - वर्तनी परिवर्तन हिंदी में (Father's Name - Spelling Change in Hindi)", isMajor: false },
      { id: 'fatherNameSpellingEn', label: "शिशु के पिता का नाम - वर्तनी परिवर्तन अंग्रेजी में (Father's Name - Spelling Change in English)", isMajor: false },
      { id: 'fatherNameFullHi', label: "शिशु के पिता का नाम - पूर्ण नाम परिवर्तन हिंदी में (Father's Name - Full Name Change in Hindi)", isMajor: true },
      { id: 'fatherNameFullEn', label: "शिशु के पिता का नाम - पूर्ण नाम परिवर्तन अंग्रेजी में (Father's Name - Full Name Change in English)", isMajor: true },
      { id: 'gender', label: "लिंग (Gender)", isMajor: true },
      { id: 'dob', label: "जन्म दिनांक (Date of Birth)", isMajor: true },
      { id: 'permanentAddressHi', label: "माता पिता का स्थाई पता हिंदी में (Parents' Permanent Address in Hindi)", isMajor: false },
      { id: 'permanentAddressEn', label: "माता पिता का स्थाई पता अंग्रेजी में (Parents' Permanent Address in English)", isMajor: false },
      { id: 'birthAddressHi', label: "बच्चे के जन्म के समय माता पिता का पता हिंदी में (Address of Parents at Child's Birth in Hindi)", isMajor: false },
      { id: 'birthAddressEn', label: "बच्चे के जन्म के समय माता पिता का पता अंग्रेजी में (Address of Parents at Child's Birth in English)", isMajor: false },
      { id: 'janAadhaar', label: "जन-आधार (Jan-Aadhaar)", isMajor: false },
      { id: 'pincode', label: "पिन कोड (Pin Code)", isMajor: false },
      { id: 'fatherAadhaar', label: "पिता का आधार नंबर (Father's Aadhaar Number)", isMajor: false },
      { id: 'motherAadhaar', label: "माता का आधार नंबर (Mother's Aadhaar Number)", isMajor: false },
      { id: 'eSign', label: "ई-साइन (E-Sign)", isMajor: false },
      { id: 'fatherMobile', label: "पिता का मोबाइल नंबर (Father's Mobile Number)", isMajor: false },
      { id: 'fatherEmail', label: "पिता का ईमेल (Father's Email)", isMajor: false },
      { id: 'motherMobile', label: "माता का मोबाइल नंबर (Mother's Mobile Number)", isMajor: false },
      { id: 'motherEmail', label: "माता का ईमेल (Mother's Email)", isMajor: false }
    ];
  };

  const PREDEFINED_FIELDS = getPredefinedFields();

  const getSelectableFields = () => {
    const block = activeTokenProcess?.block || 'birth';
    if (block === 'death') {
      return [
        { isBilingual: true, enId: 'deceasedNameEn', hiId: 'deceasedNameHi', label: "Deceased Person Name (मृतक का नाम)", isMajor: true },
        { isBilingual: true, enId: 'motherNameSpellingEn', hiId: 'motherNameSpellingHi', label: "Mother's Name - Spelling Change (माता का नाम - वर्तनी परिवर्तन)", isMajor: false },
        { isBilingual: true, enId: 'motherNameFullEn', hiId: 'motherNameFullHi', label: "Mother's Name - Full Name Change (माता का नाम - पूर्ण नाम परिवर्तन)", isMajor: true },
        { isBilingual: true, enId: 'fatherNameSpellingEn', hiId: 'fatherNameSpellingHi', label: "Father's Name - Spelling Change (पिता का नाम - वर्तनी परिवर्तन)", isMajor: false },
        { isBilingual: true, enId: 'fatherNameFullEn', hiId: 'fatherNameFullHi', label: "Father's Name - Full Name Change (पिता का नाम - पूर्ण नाम परिवर्तन)", isMajor: true },
        { isBilingual: true, enId: 'spouseNameSpellingEn', hiId: 'spouseNameSpellingHi', label: "Spouse's Name - Spelling Change (पति/पत्नी का नाम - वर्तनी परिवर्तन)", isMajor: false },
        { isBilingual: true, enId: 'spouseNameFullEn', hiId: 'spouseNameFullHi', label: "Spouse's Name - Full Name Change (पति/पत्नी का नाम - पूर्ण नाम परिवर्तन)", isMajor: true },
        { isBilingual: true, enId: 'permanentAddressEn', hiId: 'permanentAddressHi', label: "Deceased's Permanent Address (स्थायी पता)", isMajor: false },
        { isBilingual: true, enId: 'deathAddressEn', hiId: 'deathAddressHi', label: "Address at Time of Death (मृत्यु के समय पता)", isMajor: false },
        { isBilingual: false, id: 'dod', label: "Date of Death (मृत्यु दिनांक)", isMajor: true },
        { isBilingual: false, id: 'janAadhaar', label: "Jan-Aadhaar (जन-आधार)", isMajor: false },
        { isBilingual: false, id: 'pincode', label: "Pin Code (पिन कोड)", isMajor: false },
        { isBilingual: false, id: 'fatherAadhaar', label: "Father's Aadhaar (पिता का आधार)", isMajor: false },
        { isBilingual: false, id: 'motherAadhaar', label: "Mother's Aadhaar (माता का आधार)", isMajor: false },
        { isBilingual: false, id: 'spouseAadhaar', label: "Spouse's Aadhaar (पति/पत्नी का आधार)", isMajor: false },
        { isBilingual: false, id: 'gender', label: "Gender (लिंग)", isMajor: true },
        { isBilingual: false, id: 'eSign', label: "E-Sign (ई-साइन)", isMajor: false },
        { isBilingual: false, id: 'fatherMobile', label: "Father's Mobile (पिता का मोबाइल)", isMajor: false },
        { isBilingual: false, id: 'fatherEmail', label: "Father's Email (पिता का ईमेल)", isMajor: false },
        { isBilingual: false, id: 'motherMobile', label: "Mother's Mobile (माता का मोबाइल)", isMajor: false },
        { isBilingual: false, id: 'motherEmail', label: "Mother's Email (माता का ईमेल)", isMajor: false },
        { isBilingual: false, id: 'spouseMobile', label: "Spouse's Mobile (पति/पत्नी का मोबाइल)", isMajor: false },
        { isBilingual: false, id: 'spouseEmail', label: "Spouse's Email (पति/पत्नी का ईमेल)", isMajor: false }
      ];
    } else if (block === 'marriage') {
      return [
        { isBilingual: false, id: 'groomName', label: "Groom's Name (वर का नाम)", isMajor: true },
        { isBilingual: false, id: 'brideName', label: "Bride's Name (वधू का नाम)", isMajor: true },
        { isBilingual: false, id: 'dom', label: "Date of Marriage (विवाह तिथि)", isMajor: true },
        { isBilingual: false, id: 'placeOfMarriage', label: "Place of Solemnization (विवाह स्थल)", isMajor: true },
        { isBilingual: false, id: 'groomFather', label: "Groom's Father's Name (वर के पिता का नाम)", isMajor: false },
        { isBilingual: false, id: 'brideFather', label: "Bride's Father's Name (वधू के पिता का नाम)", isMajor: false }
      ];
    }

    // Default: Birth
    return [
      { isBilingual: true, enId: 'childNameEn', hiId: 'childNameHi', label: "Child's Name (शिशु का नाम)", isMajor: true },
      { isBilingual: true, enId: 'motherNameSpellingEn', hiId: 'motherNameSpellingHi', label: "Mother's Name - Spelling Change (माता का नाम - वर्तनी परिवर्तन)", isMajor: false },
      { isBilingual: true, enId: 'motherNameFullEn', hiId: 'motherNameFullHi', label: "Mother's Name - Full Name Change (माता का नाम - पूर्ण नाम परिवर्तन)", isMajor: true },
      { isBilingual: true, enId: 'fatherNameSpellingEn', hiId: 'fatherNameSpellingHi', label: "Father's Name - Spelling Change (पिता का नाम - वर्तनी परिवर्तन)", isMajor: false },
      { isBilingual: true, enId: 'fatherNameFullEn', hiId: 'fatherNameFullHi', label: "Father's Name - Full Name Change (पिता का नाम - पूर्ण नाम परिवर्तन)", isMajor: true },
      { isBilingual: true, enId: 'permanentAddressEn', hiId: 'permanentAddressHi', label: "Parents' Permanent Address (स्थायी पता)", isMajor: false },
      { isBilingual: true, enId: 'birthAddressEn', hiId: 'birthAddressHi', label: "Address of Parents at Child's Birth (जन्म के समय माता-पिता का पता)", isMajor: false },
      { isBilingual: false, id: 'dob', label: "Date of Birth (जन्म दिनांक)", isMajor: true },
      { isBilingual: false, id: 'janAadhaar', label: "Jan-Aadhaar (जन-आधार)", isMajor: false },
      { isBilingual: false, id: 'pincode', label: "Pin Code (पिन कोड)", isMajor: false },
      { isBilingual: false, id: 'fatherAadhaar', label: "Father's Aadhaar (पिता का आधार)", isMajor: false },
      { isBilingual: false, id: 'motherAadhaar', label: "Mother's Aadhaar (माता का आधार)", isMajor: false },
      { isBilingual: false, id: 'gender', label: "Gender (लिंग)", isMajor: true },
      { isBilingual: false, id: 'eSign', label: "E-Sign (ई-साइन)", isMajor: false },
      { isBilingual: false, id: 'fatherMobile', label: "Father's Mobile (पिता का मोबाइल)", isMajor: false },
      { isBilingual: false, id: 'fatherEmail', label: "Father's Email (पिता का ईमेल)", isMajor: false },
      { isBilingual: false, id: 'motherMobile', label: "Mother's Mobile (माता का मोबाइल)", isMajor: false },
      { isBilingual: false, id: 'motherEmail', label: "Mother's Email (माता का ईमेल)", isMajor: false }
    ];
  };

  const handleEnglishBlur = async (enId, hiId, value, type) => {
    if (!value || value.trim() === '') return;
    try {
      const response = await axiosInstance.post('/applications/translate', { text: value.toUpperCase() });
      const translatedText = response.data?.translatedText;
      if (translatedText) {
        setFormData(prev => ({
          ...prev,
          fieldValues: {
            ...prev.fieldValues,
            [hiId]: {
              ...prev.fieldValues[hiId],
              [type]: translatedText
            }
          }
        }));
      }
    } catch (err) {
      console.warn("Transliteration API failed: ", err);
    }
  };

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
        applicantName: activeTokenProcess.correction_record?.applicant_name !== 'Kiosk Citizen' ? (activeTokenProcess.correction_record?.applicant_name || '') : '',
        mobileNumber: activeTokenProcess.correction_record?.mobile_number !== '9829XXXXXX' ? (activeTokenProcess.correction_record?.mobile_number || '') : '',
        registrationNumber: activeTokenProcess.correction_record?.registration_number !== 'KIOSK-TICKET' ? (activeTokenProcess.correction_record?.registration_number || '') : '',
        fatherName: '',
        motherName: '',
        dob: '',
        relationWithApplicant: 'Self',
        fieldValues: {}
      });
      setNewRegData({
        regCategory: 'NEW_REGISTRATION',
        hospitalUnfed: false,
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
        groomDob: '',
        groomFather: '',
        brideName: '',
        brideDob: '',
        brideFather: '',
        placeOfMarriage: '',
        dob: ''
      });
      setScannedFiles({});
      setEnrollmentResult(null);
      setCashCollected(false);
      setCustomDocName('');
      const match = activeTokenProcess.correction_record?.remarks?.match(/COPIES:\s*(\d+)/);
      const initialCopies = match ? parseInt(match[1]) : 1;
      setBillingCopies(initialCopies);
      setExtraFeesList([]);
      setCustomFeeName('');
      setCustomFeeAmount('');
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
          const details = app.correction_details || [];
          const getValue = (name) => {
            const found = details.find(d => d.fieldName === name);
            return found ? found.newValue : '';
          };
          setNewRegData({
            regCategory: getValue("Registration Category") || 'NEW_REGISTRATION',
            hospitalUnfed: getValue("Hospital Unfed") === 'Yes',
            childName: getValue("Child's Name") || getValue("Child Name") || app.applicant_name,
            gender: getValue("Gender") || 'MALE',
            placeOfBirth: getValue("Place of Birth") || getValue("Place of Birth Category") || 'HOSPITAL',
            hospitalName: getValue("Hospital Details") || getValue("Place of Birth Details / Hospital Name") || '',
            permanentAddress: getValue("Permanent Address") || '',
            deceasedName: getValue("Deceased Person Name") || getValue("Deceased Name") || app.applicant_name,
            ageAtDeath: getValue("Age at Death") || '',
            causeOfDeath: getValue("Cause of Death") || '',
            placeOfDeath: getValue("Place of Death Details") || getValue("Place of Death") || '',
            placeOfDeathCategory: getValue("Place of Death Category") || 'HOSPITAL',
            groomName: getValue("Groom's Full Name") || getValue("Groom Name") || app.applicant_name,
            groomDob: getValue("Groom Date of Birth") || getValue("Groom DOB") || '',
            groomFather: getValue("Father's Name") || getValue("Groom Father") || app.father_name || '',
            brideName: getValue("Bride's Full Name") || getValue("Bride Name") || '',
            brideDob: getValue("Bride Date of Birth") || getValue("Bride DOB") || '',
            brideFather: getValue("Bride Father") || '',
            placeOfMarriage: getValue("Place of Solemnization") || getValue("Place of Marriage") || '',
            dob: getValue("Date of Marriage") || getValue("Birth Date") || getValue("Date of Death") || app.dob || ''
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
        // Deceased name corrections
        if (selectedIds.includes('deceasedNameHi') || selectedIds.includes('deceasedNameEn')) {
          docs.push("Gazette Notification for name change (राजपत्र अधिसूचना — नाम परिवर्तन)");
          docs.push("Gazette Receipt (राजपत्र की रसीद)");
          docs.push("Spouse's/Parents' Aadhaar/Jan Aadhaar (पति-पत्नी/माता-पिता का आधार/जन-आधार)");
          docs.push("Notary Stamp Affidavit on Pipe Paper (नोटरी स्टाम्प शपथ पत्र — पाइप पेपर पर)");
        }
        // Mother name corrections
        if (
          selectedIds.includes('motherNameSpellingHi') || selectedIds.includes('motherNameSpellingEn') ||
          selectedIds.includes('motherNameFullHi') || selectedIds.includes('motherNameFullEn')
        ) {
          docs.push("Mother's ID/Marksheet/Aadhaar (माता का पहचान पत्र/अंकतालिका/आधार)");
          docs.push("Mother's Voter ID Card (pre-birth) (माता की मतदाता पहचान पत्र)");
          docs.push("Notary Stamp Affidavit on Pipe Paper (नोटरी स्टाम्प शपथ पत्र — पाइप पेपर पर)");
        }
        // Father name corrections
        if (
          selectedIds.includes('fatherNameSpellingHi') || selectedIds.includes('fatherNameSpellingEn') ||
          selectedIds.includes('fatherNameFullHi') || selectedIds.includes('fatherNameFullEn')
        ) {
          docs.push("Father's ID/Marksheet/Aadhaar (पिता का पहचान पत्र/अंकतालिका/आधार)");
          docs.push("Parents' Marriage Certificate (माता-पिता का विवाह प्रमाण पत्र)");
          docs.push("Notary Stamp Affidavit on Pipe Paper (नोटरी स्टाम्प शपथ पत्र — पाइप पेपर पर)");
        }
        // Spouse name corrections
        if (
          selectedIds.includes('spouseNameSpellingHi') || selectedIds.includes('spouseNameSpellingEn') ||
          selectedIds.includes('spouseNameFullHi') || selectedIds.includes('spouseNameFullEn')
        ) {
          docs.push("Spouse's ID/Aadhaar Card (पति/पत्नी का पहचान पत्र/आधार)");
          docs.push("Marriage Certificate copy (विवाह प्रमाण पत्र की प्रति)");
          docs.push("Notary Stamp Affidavit on Pipe Paper (नोटरी स्टाम्प शपथ पत्र — पाइप पेपर पर)");
        }
        // Date of Death Corrections
        if (selectedIds.includes('dod')) {
          docs.push("Hospital Death Record / Cremation Slip (अस्पताल का मृत्यु रिकॉर्ड/दाह संस्कार पर्ची)");
        }
        // Address Corrections
        if (
          selectedIds.includes('permanentAddressHi') || selectedIds.includes('permanentAddressEn') ||
          selectedIds.includes('deathAddressHi') || selectedIds.includes('deathAddressEn')
        ) {
          docs.push("Deceased/Spouse Address Proof Document (मृतक/पति-पत्नी का पता प्रमाण)");
        }
        // Aadhaar corrections
        if (
          selectedIds.includes('spouseAadhaar') ||
          selectedIds.includes('fatherAadhaar') || selectedIds.includes('motherAadhaar')
        ) {
          docs.push("Copy of Aadhaar Card matching registry (आधार कार्ड की प्रति)");
        }
        // Jan-Aadhaar or Pincode
        if (selectedIds.includes('janAadhaar') || selectedIds.includes('pincode')) {
          docs.push("Copy of Aadhaar Card / Jan-Aadhaar Card (आधार या जन-आधार कार्ड की प्रति)");
        }
        
        if (docs.length === 0) {
          docs.push("Self-Declaration Form verified by Municipal councilor (पार्षद द्वारा सत्यापित स्व-घोषणा पत्र)");
        }
        return [...new Set(docs)];
      }

      // Default / Birth block correction documents
      if (selectedIds.includes('childNameHi') || selectedIds.includes('childNameEn')) {
        docs.push("Gazette Notification for name change (राजपत्र अधिसूचना — नाम परिवर्तन)");
        docs.push("Gazette Receipt (राजपत्र की रसीद)");
        docs.push("Parents' Aadhaar/Jan Aadhaar (माता-पिता का आधार/जन-आधार)");
        docs.push("Notary Stamp Affidavit on Pipe Paper (नोटरी स्टाम्प शपथ पत्र — पाइप पेपर पर)");
      }
      if (
        selectedIds.includes('motherNameSpellingHi') || selectedIds.includes('motherNameSpellingEn') ||
        selectedIds.includes('motherNameFullHi') || selectedIds.includes('motherNameFullEn')
      ) {
        docs.push("Mother's ID/Marksheet/Aadhaar (माता का पहचान पत्र/अंकतालिका/आधार)");
        docs.push("Mother's Voter ID Card (pre-birth) (माता की मतदाता पहचान पत्र — जन्म से पूर्व की)");
        docs.push("Notary Stamp Affidavit on Pipe Paper (नोटरी स्टाम्प शपथ पत्र — पाइप पेपर पर)");
      }
      if (
        selectedIds.includes('fatherNameSpellingHi') || selectedIds.includes('fatherNameSpellingEn') ||
        selectedIds.includes('fatherNameFullHi') || selectedIds.includes('fatherNameFullEn')
      ) {
        docs.push("Father's ID/Marksheet/Aadhaar (पिता का पहचान पत्र/अंकतालिका/आधार)");
        docs.push("Parents' Marriage Certificate (माता-पिता का विवाह प्रमाण पत्र)");
        docs.push("Notary Stamp Affidavit on Pipe Paper (नोटरी स्टाम्प शपथ पत्र — पाइप पेपर पर)");
      }
      if (selectedIds.includes('dob')) {
        docs.push("Hospital Birth Record / Discharge Summary (अस्पताल का जन्म रिकॉर्ड/डिस्चार्ज समरी)");
        docs.push("School Transfer Certificate or Age proof (स्कूल टीसी / आयु प्रमाण)");
      }
      if (
        selectedIds.includes('permanentAddressHi') || selectedIds.includes('permanentAddressEn') ||
        selectedIds.includes('birthAddressHi') || selectedIds.includes('birthAddressEn')
      ) {
        docs.push("Parents' Address Proof (Voter ID/Electricity Bill) (बिजली बिल/पानी बिल/वोटर आईडी)");
      }
      if (selectedIds.includes('janAadhaar') || selectedIds.includes('pincode')) {
        docs.push("Copy of Aadhaar Card / Jan-Aadhaar Card (आधार या जन-आधार कार्ड की प्रति)");
      }
      if (selectedIds.includes('fatherAadhaar') || selectedIds.includes('motherAadhaar')) {
        docs.push("Aadhaar Card copy (आधार कार्ड की प्रति)");
      }

      if (docs.length === 0) {
        docs.push("Self-Declaration Form verified by Municipal councilor (पार्षद द्वारा सत्यापित स्व-घोषणा पत्र)");
      }
      return [...new Set(docs)];
    } else {
      // New Registrations
      const blockType = activeTokenProcess.block;
      if (blockType === 'birth') {
        const isHospital = newRegData.placeOfBirth === 'HOSPITAL';
        return [
          "Report Form-1 (रिपोर्ट प्रपत्र-1)",
          isHospital ? "other Hospital document (अस्पताल प्रसव रिपोर्ट)" : "Magistrate affidavit (मजिस्ट्रेट शपथ पत्र)"
        ];
      } else if (blockType === 'death') {
        const isHospital = newRegData.placeOfDeathCategory === 'HOSPITAL';
        return [
          "Report Form-2 (रिपोर्ट प्रपत्र-2)",
          isHospital ? "other Hospital document (अस्पताल मृत्यु रिपोर्ट)" : "Magistrate affidavit (मजिस्ट्रेट शपथ पत्र)"
        ];
      } else {
        // Marriage
        return [
          "Joint photograph of Bride & Groom (वर-वधू का संयुक्त चित्र)",
          "Marriage Application Form - Front Side (विवाह आवेदन पत्र - मुख्य पृष्ठ)",
          "Marriage Application Form - Back Side (विवाह आवेदन पत्र - अंतिम पृष्ठ)"
        ];
      }
    }
  };

  const getOfficialDocFileName = (docName) => {
    let englishName = docName.split('(')[0].trim();
    let cleanName = englishName
      .replace(/[^a-zA-Z0-9]/g, ' ') // Replace non-alphanumeric with spaces
      .trim()
      .replace(/\s+/g, '_'); // Replace spaces with underscore
    return `${cleanName}.pdf`;
  };

  // Scanning trigger
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

  // Default Base Fee and Prepopulated items calculation
  const calculateDefaultBaseFeeAndItems = () => {
    if (!activeTokenProcess) return { baseFee: 20.00, baseLabel: "Standard Processing Fee", extraItems: [] };
    if (activeTokenProcess.isReSubmission) {
      return { baseFee: 0.00, baseLabel: "Objection Re-submission (Fees Exempted)", extraItems: [] };
    }

    const isCorrection = activeTokenProcess.serviceType === 'correction';
    const block = activeTokenProcess.block;
    
    if (isCorrection) {
      return {
        baseFee: 5.00,
        baseLabel: "Correction Fee (संशोधन शुल्क)",
        extraItems: []
      };
    }

    if (block === 'birth') {
      const isAddName = newRegData.regCategory === 'ADD_NAME';
      const dobStr = newRegData.dob;
      if (!dobStr) {
        return { baseFee: 50.00, baseLabel: "Registration Fee (Base Certificate)", extraItems: [] };
      }
      const dob = new Date(dobStr);
      const today = new Date();
      const diffTime = today - dob;
      const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

      if (isAddName) {
        if (diffDays <= 365) {
          return { baseFee: 0.00, baseLabel: "Child Name Addition (Within 1 Year)", extraItems: [] };
        } else {
          return { baseFee: 5.00, baseLabel: "Child Name Addition (After 1 Year)", extraItems: [] };
        }
      } else {
        const extraItems = [];
        if (diffDays > 21 && diffDays <= 30) {
          extraItems.push({ name: "Late Registration Fee (21-30 Days)", amount: 20.00 });
        } else if (diffDays > 30 && diffDays <= 365) {
          extraItems.push({ name: "Late Registration Fee", amount: 20.00 });
          extraItems.push({ name: "Search Fee (खोज शुल्क)", amount: 20.00 });
          extraItems.push({ name: "Commissioner Approval Fee (अनुमोदन शुल्क)", amount: 50.00 });
        } else if (diffDays > 365) {
          extraItems.push({ name: "Late Registration Penalty", amount: 20.00 });
          extraItems.push({ name: "Search Fee (खोज शुल्क)", amount: 20.00 });
          extraItems.push({ name: "First Class Magistrate Order Fee", amount: 50.00 });
          extraItems.push({ name: "Jaipur Nagar Nigam Late Penalty", amount: 300.00 });
        }
        return {
          baseFee: 50.00,
          baseLabel: "Birth Certificate Base Fee",
          extraItems
        };
      }
    }

    if (block === 'death') {
      const dodStr = newRegData.dob;
      if (!dodStr) {
        return { baseFee: 50.00, baseLabel: "Registration Fee (Base Certificate)", extraItems: [] };
      }
      const dod = new Date(dodStr);
      const today = new Date();
      const diffTime = today - dod;
      const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

      const extraItems = [];
      if (diffDays > 21 && diffDays <= 30) {
        extraItems.push({ name: "Late Registration Fee (21-30 Days)", amount: 20.00 });
      } else if (diffDays > 30 && diffDays <= 365) {
        extraItems.push({ name: "Late Registration Fee", amount: 20.00 });
        extraItems.push({ name: "Search Fee (खोज शुल्क)", amount: 20.00 });
        extraItems.push({ name: "Commissioner Approval Fee (अनुमोदन शुल्क)", amount: 50.00 });
      } else if (diffDays > 365) {
        extraItems.push({ name: "Late Registration Penalty", amount: 20.00 });
        extraItems.push({ name: "Search Fee (खोज शुल्क)", amount: 20.00 });
        extraItems.push({ name: "First Class Magistrate Order Fee", amount: 50.00 });
        extraItems.push({ name: "Jaipur Nagar Nigam Late Penalty", amount: 300.00 });
      }
      return {
        baseFee: 50.00,
        baseLabel: "Death Certificate Base Fee",
        extraItems
      };
    }

    if (block === 'marriage') {
      const marriageDateStr = newRegData.marriageDate || newRegData.dob;
      let marriageFee = 110.00;
      if (marriageDateStr) {
        const marriageDate = new Date(marriageDateStr);
        const cutOffDate = new Date('2006-05-22');
        if (marriageDate < cutOffDate) {
          marriageFee = 120.00;
        } else {
          const today = new Date();
          const diffTime = today - marriageDate;
          const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
          if (diffDays > 30) {
            marriageFee = 200.00;
          }
        }
      }
      return {
        baseFee: marriageFee,
        baseLabel: "Marriage Registration Fee",
        extraItems: []
      };
    }

    return { baseFee: 20.00, baseLabel: "Standard Processing Fee", extraItems: [] };
  };

  // Dynamic municipal fee calculator
  const calculateWizardFee = () => {
    const baseObj = calculateDefaultBaseFeeAndItems();
    
    const result = {
      total: baseObj.baseFee,
      items: [{ name: baseObj.baseLabel, amount: baseObj.baseFee }]
    };

    const block = activeTokenProcess?.block;
    if (billingCopies > 0 && block !== 'marriage') {
      const printAmount = billingCopies * 50.00;
      result.items.push({
        name: `Certificate Prints (${billingCopies} ${billingCopies === 1 ? 'copy' : 'copies'} @ ₹50)`,
        amount: printAmount
      });
      result.total += printAmount;
    }

    extraFeesList.forEach(fee => {
      const amt = parseFloat(fee.amount) || 0;
      result.items.push({
        name: fee.name,
        amount: amt
      });
      result.total += amt;
    });

    return result;
  };

  // Proceed step validation helper
  const handleProceedToScanning = () => {
    if (!formData.applicantName || !formData.applicantName.trim()) {
      alert("Please enter Applicant Name / कृपया आवेदक का नाम दर्ज करें");
      return;
    }

    const mobile = formData.mobileNumber ? formData.mobileNumber.trim() : '';
    if (!/^[0-9]{10}$/.test(mobile)) {
      alert("Please enter a valid 10-digit mobile number / कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें");
      return;
    }
    if (/^(.)\1{9}$/.test(mobile)) {
      alert("Invalid mobile number: Repeated digits are not allowed / अमान्य मोबाइल नंबर: बार-बार आने वाले अंकों की अनुमति नहीं है");
      return;
    }

    if (activeTokenProcess?.serviceType === 'correction') {
      const regNum = formData.registrationNumber ? formData.registrationNumber.trim() : '';
      if (!regNum) {
        alert("Please enter Registration Number / कृपया पंजीकरण संख्या दर्ज करें");
        return;
      }
      if (!/^\d+\/\d{4}$/.test(regNum)) {
        alert("Registration number must be in format [Number]/[Year] (e.g. 1234/2026) / पंजीकरण संख्या प्रारूप [संख्या]/[वर्ष] (जैसे 1234/2026) में होनी चाहिए");
        return;
      }
    }

    setStep('SCANNING');
  };

  // Payment billing initialization helper
  const initializePaymentBilling = () => {
    const baseObj = calculateDefaultBaseFeeAndItems();
    const extraWithIds = baseObj.extraItems.map((item, idx) => ({
      ...item,
      id: Date.now() + idx
    }));
    setExtraFeesList(extraWithIds);
    setStep('PAYMENT');
  };

  // Complete application submit
  const handleSubmission = () => {
    // Scanning is optional, so we do not block submission if documents are missing.
    setPaying(true);

    const isCorrection = activeTokenProcess.serviceType === 'correction';
    const dynamicFee = calculateWizardFee();
    const applicationPayload = {
      tokenNumber: activeTokenProcess.tokenNumber,
      departmentBlock: activeTokenProcess.block,
      serviceType: activeTokenProcess.serviceType,
      selfieUrl: selfieSrc || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      commonDetails: isCorrection ? formData : {
        applicantName: activeTokenProcess.block === 'marriage' ? newRegData.groomName : newRegData.childName || newRegData.deceasedName,
        mobileNumber: formData.mobileNumber || "9829XXXXXX",
        registrationNumber: isCorrection ? formData.registrationNumber : 'NEW-REGISTRATION',
        fatherName: activeTokenProcess.block === 'marriage' ? newRegData.groomFather : formData.fatherName,
        motherName: isCorrection ? formData.motherName : (newRegData.motherName || '---'),
        dob: newRegData.dob || formData.dob,
        relationWithApplicant: formData.relationWithApplicant || 'Self',
      },
      correctionFields: isCorrection ? Object.keys(selectedFields).filter(k => selectedFields[k]).map(key => ({
        fieldName: PREDEFINED_FIELDS.find(f => f.id === key)?.label || key,
        oldValue: key === 'eSign' ? 'RE-SIGN REQUEST' : (formData.fieldValues[key]?.old || '---'),
        newValue: key === 'eSign' ? 'RE-SIGN REQUEST' : (formData.fieldValues[key]?.new || '---')
      })) : (
        activeTokenProcess.block === 'birth' ? [
          { fieldName: 'Registration Category', oldValue: '---', newValue: newRegData.regCategory || 'NEW_REGISTRATION' },
          { fieldName: 'Hospital Unfed', oldValue: '---', newValue: newRegData.hospitalUnfed ? "Yes" : "No" },
          { fieldName: 'Applicant Name', oldValue: '---', newValue: formData.applicantName },
          { fieldName: 'Applicant Mobile', oldValue: '---', newValue: formData.mobileNumber },
          { fieldName: 'Relation with Child', oldValue: '---', newValue: formData.relationWithApplicant },
          { fieldName: "Child's Name", oldValue: '---', newValue: newRegData.childName },
          { fieldName: 'Gender', oldValue: '---', newValue: newRegData.gender },
          { fieldName: 'Birth Date', oldValue: '---', newValue: newRegData.dob },
          { fieldName: "Father's Name of Child", oldValue: '---', newValue: formData.fatherName },
          { fieldName: 'Place of Birth', oldValue: '---', newValue: newRegData.placeOfBirth },
          { fieldName: 'Hospital Details', oldValue: '---', newValue: newRegData.placeOfBirth === 'HOSPITAL' ? newRegData.hospitalName : 'N/A' },
          { fieldName: 'Permanent Address', oldValue: '---', newValue: newRegData.permanentAddress }
        ] : activeTokenProcess.block === 'death' ? [
          { fieldName: 'Registration Category', oldValue: '---', newValue: 'NEW_REGISTRATION' },
          { fieldName: 'Applicant Name', oldValue: '---', newValue: formData.applicantName },
          { fieldName: 'Applicant Mobile', oldValue: '---', newValue: formData.mobileNumber },
          { fieldName: 'Relation with Deceased', oldValue: '---', newValue: formData.relationWithApplicant },
          { fieldName: 'Deceased Person Name', oldValue: '---', newValue: newRegData.deceasedName },
          { fieldName: 'Gender', oldValue: '---', newValue: newRegData.gender },
          { fieldName: 'Age at Death', oldValue: '---', newValue: newRegData.ageAtDeath },
          { fieldName: 'Date of Death', oldValue: '---', newValue: newRegData.dob },
          { fieldName: "Father's Name of Deceased", oldValue: '---', newValue: formData.fatherName },
          { fieldName: 'Place of Death Category', oldValue: '---', newValue: newRegData.placeOfDeathCategory || 'HOSPITAL' },
          { fieldName: 'Place of Death Details', oldValue: '---', newValue: newRegData.placeOfDeath },
          { fieldName: 'Cause of Death', oldValue: '---', newValue: newRegData.causeOfDeath }
        ] : activeTokenProcess.block === 'marriage' ? [
          { fieldName: 'Registration Category', oldValue: '---', newValue: 'NEW_REGISTRATION' },
          { fieldName: "Groom's Full Name", oldValue: '---', newValue: newRegData.groomName },
          { fieldName: 'Groom DOB', oldValue: '---', newValue: newRegData.groomDob },
          { fieldName: 'Groom Father', oldValue: '---', newValue: newRegData.groomFather },
          { fieldName: "Bride's Full Name", oldValue: '---', newValue: newRegData.brideName },
          { fieldName: 'Bride DOB', oldValue: '---', newValue: newRegData.brideDob },
          { fieldName: 'Bride Father', oldValue: '---', newValue: newRegData.brideFather },
          { fieldName: 'Date of Marriage', oldValue: '---', newValue: newRegData.marriageDate || newRegData.dob },
          { fieldName: 'Place of Solemnization', oldValue: '---', newValue: newRegData.placeOfMarriage }
        ] : []
      ),
      correctionType: isCorrection ? (isMajorCorrection ? 'MAJOR' : 'MINOR') : 'NEW_REGISTRATION',
      uploadedDocuments: Object.values(scannedFiles),
      paymentDetails: activeTokenProcess?.isReSubmission ? {
        method: 'EXEMPT',
        amount: 0.00,
        status: 'SUCCESS',
        transactionId: `EXEMPT-${activeTokenProcess.tokenNumber}`
      } : {
        method: paymentMethod,
        amount: dynamicFee.total,
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
          departmentBlock: activeTokenProcess.block,
          serviceType: activeTokenProcess.serviceType,
          commonDetails: applicationPayload.commonDetails,
          uploadedDocuments: applicationPayload.uploadedDocuments,
          paymentDetails: applicationPayload.paymentDetails,
          correctionFields: applicationPayload.correctionFields,
          feeItems: dynamicFee.items
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
      regCategory: 'NEW_REGISTRATION',
      hospitalUnfed: false,
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
      groomDob: '',
      groomFather: '',
      brideName: '',
      brideDob: '',
      brideFather: '',
      placeOfMarriage: '',
      dob: ''
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
              {getSelectableFields().map((field) => {
                const checked = field.isBilingual 
                  ? (!!selectedFields[field.enId] && !!selectedFields[field.hiId]) 
                  : !!selectedFields[field.id];
                
                return (
                  <label 
                    key={field.isBilingual ? field.enId : field.id}
                    className={`flex items-center gap-3.5 p-3.5 border rounded-xl cursor-pointer select-none transition-all text-md font-bold hover:bg-white ${
                      checked 
                        ? 'bg-navy/5 border-navy shadow-sm text-navy font-extrabold' 
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        if (field.isBilingual) {
                          setSelectedFields(prev => ({
                            ...prev,
                            [field.enId]: isChecked,
                            [field.hiId]: isChecked
                          }));
                        } else {
                          setSelectedFields(prev => ({
                            ...prev,
                            [field.id]: isChecked
                          }));
                        }
                      }}
                      className="w-5 h-5 accent-navy shrink-0 cursor-pointer"
                    />
                    <span className="leading-snug">{field.label}</span>
                  </label>
                );
              })}
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
                      placeholder="e.g. 1234/2026"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
                      className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-navy outline-none"
                    />
                  </div>
                ) : null}

                {(activeTokenProcess.block === 'birth' || activeTokenProcess.block === 'death') ? (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-slate-600">
                        {activeTokenProcess.block === 'birth' 
                          ? "Father's Name of Child (बालक के पिता का नाम)" 
                          : "Father's Name of Deceased (मृतक के पिता का नाम)"}
                      </label>
                      <input
                        type="text"
                        placeholder="Father's name"
                        value={formData.fatherName}
                        onChange={(e) => setFormData({ ...formData, fatherName: e.target.value.toUpperCase() })}
                        className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-navy outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-slate-600">
                        {activeTokenProcess.block === 'birth' 
                          ? "Relation with Child (बालक से संबंध)" 
                          : "Relation with Deceased (मृतक से संबंध)"}
                      </label>
                      <select
                        value={formData.relationWithApplicant}
                        onChange={(e) => setFormData({ ...formData, relationWithApplicant: e.target.value })}
                        className="p-3 border border-slate-300 rounded-xl text-base text-navy font-bold bg-white focus:border-navy outline-none"
                      >
                        <option value="Self">Self (स्वयं)</option>
                        <option value="Father">Father (पिता)</option>
                        <option value="Mother">Mother (माता)</option>
                        <option value="Spouse">Spouse (पति/पत्नी)</option>
                        <option value="Relative">Relative/Guardian (रिश्तेदार/संरक्षक)</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
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
                    {getSelectableFields().filter(field => 
                      field.isBilingual 
                        ? (selectedFields[field.enId] || selectedFields[field.hiId])
                        : selectedFields[field.id]
                    ).map((field) => {
                      if (field.isBilingual) {
                        return (
                          <div key={field.enId} className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 flex flex-col gap-3">
                            <span className="text-sm font-bold text-navy border-b pb-1.5">{field.label}</span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* English inputs */}
                              <div className="flex flex-col gap-2.5">
                                <span className="text-xs font-extrabold text-navy/70 uppercase tracking-wider">English (अंग्रेजी)</span>
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[11px] font-bold text-slate-400">Old Value (पुराना मूल्य - वैकल्पिक)</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. RAMESH (optional)"
                                    value={formData.fieldValues[field.enId]?.old || ''}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      fieldValues: {
                                        ...formData.fieldValues,
                                        [field.enId]: {
                                          ...formData.fieldValues[field.enId],
                                          old: e.target.value
                                        }
                                      }
                                    })}
                                    onBlur={(e) => handleEnglishBlur(field.enId, field.hiId, e.target.value, 'old')}
                                    className="p-2 border rounded-lg text-sm text-navy bg-white outline-none font-semibold focus:border-navy"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[11px] font-bold text-slate-400">New Value (नया मूल्य)</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. SURESH"
                                    value={formData.fieldValues[field.enId]?.new || ''}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      fieldValues: {
                                        ...formData.fieldValues,
                                        [field.enId]: {
                                          ...formData.fieldValues[field.enId],
                                          new: e.target.value
                                        }
                                      }
                                    })}
                                    onBlur={(e) => handleEnglishBlur(field.enId, field.hiId, e.target.value, 'new')}
                                    className="p-2 border rounded-lg text-sm text-navy bg-white outline-none font-semibold focus:border-navy"
                                  />
                                </div>
                              </div>

                              {/* Hindi inputs */}
                              <div className="flex flex-col gap-2.5">
                                <span className="text-xs font-extrabold text-navy/70 uppercase tracking-wider">Hindi (हिंदी)</span>
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[11px] font-bold text-slate-400">Old Value (पुराना मूल्य - वैकल्पिक)</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. रमेश (optional)"
                                    value={formData.fieldValues[field.hiId]?.old || ''}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      fieldValues: {
                                        ...formData.fieldValues,
                                        [field.hiId]: {
                                          ...formData.fieldValues[field.hiId],
                                          old: e.target.value
                                        }
                                      }
                                    })}
                                    className="p-2 border rounded-lg text-sm text-navy bg-white outline-none font-semibold focus:border-navy"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[11px] font-bold text-slate-400">New Value (नया मूल्य)</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="e.g. सुरेश"
                                    value={formData.fieldValues[field.hiId]?.new || ''}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      fieldValues: {
                                        ...formData.fieldValues,
                                        [field.hiId]: {
                                          ...formData.fieldValues[field.hiId],
                                          new: e.target.value
                                        }
                                      }
                                    })}
                                    className="p-2 border rounded-lg text-sm text-navy bg-white outline-none font-semibold focus:border-navy"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div key={field.id} className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 flex flex-col gap-2">
                            <span className="text-sm font-bold text-navy">{field.label}</span>
                            {field.id === 'eSign' ? (
                              <div className="p-3.5 border border-purple-200 bg-purple-50 text-purple-800 rounded-xl text-xs font-bold leading-normal">
                                E-Sign Correction: Citizen will re-sign digitally during approval. No text input required. <br/>
                                (ई-साइन संशोधन: नागरिक अनुमोदन के दौरान डिजिटल रूप से पुनः हस्ताक्षर करेंगे। किसी इनपुट की आवश्यकता नहीं है।)
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-slate-400">Old Value (पुराना मूल्य - वैकल्पिक)</label>
                                  <input
                                    type="text"
                                    placeholder="Old value (optional)..."
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
                                    className="p-2 border rounded-lg text-sm text-navy bg-white outline-none font-semibold focus:border-navy"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-slate-400">New Value (नया मूल्य)</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="New value..."
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
                                    className="p-2 border rounded-lg text-sm text-navy bg-white outline-none font-semibold focus:border-navy"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }
                    })}
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
                              <label className="text-slate-600 font-mono">Date of Birth</label>
                              <input
                                type="date"
                                value={newRegData.groomDob}
                                onChange={(e) => setNewRegData({ ...newRegData, groomDob: e.target.value })}
                                className="p-2 border rounded-lg text-sm text-navy font-bold font-mono"
                              />
                              {(() => {
                                const groomAge = getAgeAtMarriage(newRegData.groomDob, newRegData.dob);
                                if (groomAge === null) return null;
                                return (
                                  <div className={`mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded border text-left ${
                                    groomAge >= 18 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                      : 'bg-red-50 border-red-200 text-red-800'
                                  }`}>
                                    Age: {groomAge} yrs ({groomAge >= 18 ? "Eligible / योग्य" : "Underage / कम उम्र"})
                                  </div>
                                );
                              })()}
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
                              <label className="text-slate-600 font-mono">Date of Birth</label>
                              <input
                                type="date"
                                value={newRegData.brideDob}
                                onChange={(e) => setNewRegData({ ...newRegData, brideDob: e.target.value })}
                                className="p-2 border rounded-lg text-sm text-navy font-bold font-mono"
                              />
                              {(() => {
                                const brideAge = getAgeAtMarriage(newRegData.brideDob, newRegData.dob);
                                if (brideAge === null) return null;
                                return (
                                  <div className={`mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded border text-left ${
                                    brideAge >= 18 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                      : 'bg-red-50 border-red-200 text-red-800'
                                  }`}>
                                    Age: {brideAge} yrs ({brideAge >= 18 ? "Eligible / योग्य" : "Underage / कम उम्र"})
                                  </div>
                                );
                              })()}
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
              onClick={handleProceedToScanning}
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
                        <a
                          href={`http://localhost:5000/temp/scans/${scannedFiles[doc]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-emerald-600 hover:text-emerald-750 underline font-bold bg-white px-2 py-1 rounded border border-emerald-200/50 cursor-pointer"
                        >
                          {scannedFiles[doc]}
                        </a>
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

                  {/* Dynamic Additional Document Scanner */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col gap-3 mt-4">
                    <span className="text-xs font-extrabold text-navy uppercase tracking-wider block text-left font-rajdhani">Scan Additional Document (अतिरिक्त दस्तावेज)</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Affidavit, Ration Card (दस्तावेज का नाम)"
                        value={customDocName}
                        onChange={(e) => setCustomDocName(e.target.value)}
                        className="flex-1 p-2 border rounded-lg text-sm text-navy bg-white outline-none font-semibold focus:border-navy font-rajdhani"
                      />
                      <button
                        onClick={() => {
                          if (!customDocName.trim()) {
                            alert("Please enter a document name / कृपया दस्तावेज का नाम दर्ज करें");
                            return;
                          }
                          const docName = customDocName.trim();
                          triggerScanFile(docName);
                          setCustomDocName('');
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg active:scale-95 transition-transform cursor-pointer"
                      >
                        Scan & Add
                      </button>
                    </div>
                  </div>

                  {/* Render dynamically scanned custom documents */}
                  {Object.keys(scannedFiles)
                    .filter(doc => !getRequiredDocumentsList().includes(doc))
                    .map((doc) => (
                      <div 
                        key={doc}
                        className="flex items-center justify-between p-3.5 bg-slate-50/50 border border-emerald-300 bg-emerald-50 text-emerald-800 rounded-xl shadow-inner text-sm mt-3"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                            <Check className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-[0.95rem] text-emerald-900">{doc}</span>
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Additional Document / अतिरिक्त दस्तावेज</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={`http://localhost:5000/temp/scans/${scannedFiles[doc]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-emerald-600 hover:text-emerald-700 underline font-bold bg-white px-2 py-1 rounded border border-emerald-250/50 cursor-pointer"
                          >
                            {scannedFiles[doc]}
                          </a>
                          <button
                            onClick={() => setScannedFiles(prev => {
                              const copy = { ...prev };
                              delete copy[doc];
                              return copy;
                            })}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold rounded active:scale-95 transition-transform cursor-pointer border border-red-200/30"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    ))}
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
                  <div className="flex flex-col items-center gap-4">
                    {/* Sweeping laser animation */}
                    <div className="w-48 h-64 bg-slate-800 border-2 border-slate-700/60 rounded-xl relative flex flex-col items-center justify-between p-4 overflow-hidden shadow-md">
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

                    {/* Physical scanner instructions & bypass */}
                    <div className="text-center flex flex-col items-center gap-2 max-w-xs px-2">
                      <p className="text-[11px] text-slate-400 font-bold leading-normal m-0 animate-pulse">
                        Waiting for scanner... Please place document on the scanner bed and scan it using Epson Scan 2 (saving output to temp/scans).
                      </p>
                      <button
                        onClick={handleBypassScan}
                        className="mt-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] uppercase rounded-md tracking-wider active:scale-95 transition-transform cursor-pointer border border-slate-700"
                      >
                        Bypass & Use Demo Mock File
                      </button>
                    </div>
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
              onClick={initializePaymentBilling}
              disabled={getRequiredDocumentsList().some(doc => !scannedFiles[doc]) || scanning}
              className="px-8 py-3 bg-navy hover:bg-slate-800 text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
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
            
            {/* Box A: Stateful Billing Editor */}
            <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl flex flex-col justify-between gap-5 text-navy">
              <div>
                <span className="font-bebas text-sm tracking-wider text-saffron uppercase block">payment statement & billing editor</span>
                <h3 className="font-bold text-xl m-0 mt-1 uppercase">Counter Billing Console</h3>
              </div>

              <div className="flex flex-col gap-4 border-y py-4 my-2 text-sm font-semibold max-h-[350px] overflow-y-auto pr-1">
                
                {/* 1. Copies adjustment (only for Birth/Death) */}
                {activeTokenProcess.block !== 'marriage' && (
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-slate-800">Print Copies (प्रिंट प्रतियां)</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">₹50.00 per certificate copy</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setBillingCopies(prev => Math.max(1, prev - 1))}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-extrabold hover:bg-slate-50 active:scale-95 transition-transform text-navy cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-extrabold font-mono text-base">{billingCopies}</span>
                      <button
                        onClick={() => setBillingCopies(prev => prev + 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-extrabold hover:bg-slate-50 active:scale-95 transition-transform text-navy cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Add Predefined or Custom Extra Fee */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                  <span className="font-bold text-slate-700 block text-left">Add Fees / Penalties (शुल्क / शास्ति जोड़ें)</span>
                  
                  {/* Predefined Dropdown */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Predefined Municipal Fees</label>
                    <select
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const val = JSON.parse(e.target.value);
                        setExtraFeesList(prev => [...prev, { name: val.name, amount: val.amount, id: Date.now() }]);
                        e.target.value = ''; // reset dropdown selection
                      }}
                      className="p-2 border rounded-lg bg-white font-rajdhani text-sm text-navy outline-none font-bold focus:border-navy"
                    >
                      <option value="">-- Choose predefined fee to add --</option>
                      <option value={JSON.stringify({ name: "Late Registration Fee", amount: 20.00 })}>Late Registration Fee (₹20.00)</option>
                      <option value={JSON.stringify({ name: "Search Fee (खोज शुल्क)", amount: 20.00 })}>Search Fee (₹20.00)</option>
                      <option value={JSON.stringify({ name: "First Class Magistrate Order Fee", amount: 50.00 })}>Magistrate Order Fee (₹50.00)</option>
                      <option value={JSON.stringify({ name: "Commissioner Approval Fee (अनुमोदन शुल्क)", amount: 50.00 })}>Commissioner Approval Fee (₹50.00)</option>
                      <option value={JSON.stringify({ name: "Jaipur Nagar Nigam Late Penalty", amount: 300.00 })}>Late Penalty (₹300.00)</option>
                    </select>
                  </div>

                  {/* Custom Fee inputs */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Or Enter Custom Particular</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Fee Name (e.g. Penalty)"
                        value={customFeeName}
                        onChange={(e) => setCustomFeeName(e.target.value)}
                        className="flex-1 p-2 border rounded-lg text-xs bg-white outline-none font-bold text-navy"
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        value={customFeeAmount}
                        onChange={(e) => setCustomFeeAmount(e.target.value)}
                        className="w-20 p-2 border rounded-lg text-xs bg-white outline-none font-bold text-navy font-mono"
                      />
                      <button
                        onClick={() => {
                          if (!customFeeName.trim() || !customFeeAmount.trim()) {
                            alert("Please enter both fee name and amount / कृपया शुल्क का नाम और राशि दोनों दर्ज करें");
                            return;
                          }
                          const amt = parseFloat(customFeeAmount);
                          if (isNaN(amt) || amt < 0) {
                            alert("Please enter a valid positive amount / कृपया एक वैध धनात्मक राशि दर्ज करें");
                            return;
                          }
                          setExtraFeesList(prev => [...prev, { name: customFeeName.trim(), amount: amt, id: Date.now() }]);
                          setCustomFeeName('');
                          setCustomFeeAmount('');
                        }}
                        className="px-3 py-2 bg-navy hover:bg-slate-800 text-white font-bold text-xs rounded-lg active:scale-95 transition-all cursor-pointer font-sans"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Editable Itemized Fee Breakdown list */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[11px] text-slate-400 uppercase tracking-widest block text-left font-bold">Itemized Invoice Details</span>
                  
                  {/* Fixed Base Fee */}
                  <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded border border-slate-100 font-rajdhani text-navy font-bold text-xs">
                    <span>{calculateDefaultBaseFeeAndItems().baseLabel} (Base Fixed)</span>
                    <span>₹{calculateDefaultBaseFeeAndItems().baseFee.toFixed(2)}</span>
                  </div>

                  {/* Certificate Prints */}
                  {activeTokenProcess.block !== 'marriage' && billingCopies > 0 && (
                    <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded border border-slate-100 font-rajdhani text-navy font-bold text-xs">
                      <span>Certificate Prints ({billingCopies} copies @ ₹50)</span>
                      <span>₹{(billingCopies * 50).toFixed(2)}</span>
                    </div>
                  )}

                  {/* Custom Extra Fees List (Editable Prices & Removable) */}
                  {extraFeesList.map((fee, idx) => (
                    <div key={fee.id || idx} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 font-rajdhani text-navy font-bold text-xs gap-4">
                      <span className="flex-1 text-left">{fee.name}</span>
                      <div className="flex items-center gap-2">
                        <span>₹</span>
                        <input
                          type="number"
                          value={fee.amount}
                          onChange={(e) => {
                            const newAmt = e.target.value;
                            setExtraFeesList(prev => prev.map(f => f.id === fee.id ? { ...f, amount: newAmt } : f));
                          }}
                          className="w-16 p-1 border rounded text-right font-mono font-bold outline-none focus:border-navy"
                        />
                        <button
                          onClick={() => setExtraFeesList(prev => prev.filter(f => f.id !== fee.id))}
                          className="text-red-500 hover:text-red-700 font-extrabold px-1 font-sans text-sm cursor-pointer"
                          title="Remove item"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}

                </div>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-400 uppercase">Total Demand Due:</span>
                <span className="text-4xl font-extrabold text-navy font-mono">
                  ₹{calculateWizardFee().total.toFixed(2)}
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
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=nagarnigam.kiosk@sbi%26am=${calculateWizardFee().total.toFixed(2)}%26tn=Counter-Bill-${activeTokenProcess.tokenNumber}`}
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
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3 bg-amber-50/50 border border-amber-200 p-3 rounded-xl text-xs text-amber-950 font-bold leading-snug">
                        <AlertCircle className="w-5 h-5 text-saffron shrink-0" />
                        <span>Admin verifies cash received of flat ₹{calculateWizardFee().total.toFixed(2)} from the citizen before completing registry.</span>
                      </div>
                      <label className="flex items-center gap-2.5 p-3.5 border border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50/30 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={cashCollected}
                          onChange={(e) => setCashCollected(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-700">
                          Cash Collected (₹{calculateWizardFee().total.toFixed(2)} received in hand)
                        </span>
                      </label>
                    </div>
                  )}
                </>
              )}

              <button
                disabled={paying || (paymentMethod === 'CASH' && !activeTokenProcess?.isReSubmission && !cashCollected)}
                onClick={handleSubmission}
                className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                {paying ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Spooling Enrollment Slip...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Submit & Print Enrollment Slip</span>
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
                {enrollmentResult.departmentBlock.toUpperCase() === 'BIRTH' || enrollmentResult.departmentBlock.toUpperCase() === 'DEATH' ? (
                  <>
                    {enrollmentResult.serviceType === 'new_registration' && (
                      <div className="flex justify-between">
                        <span>{enrollmentResult.departmentBlock.toUpperCase() === 'BIRTH' ? "Child's Name" : "Deceased's Name"}:</span>
                        <span className="text-navy font-bold uppercase">{enrollmentResult.commonDetails.applicantName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Applicant/Informant:</span>
                      <span className="text-navy font-bold uppercase">
                        {enrollmentResult.serviceType === 'new_registration'
                          ? (enrollmentResult.correctionFields?.find(f => f.fieldName === 'Applicant Name')?.newValue || 'N/A')
                          : enrollmentResult.commonDetails.applicantName}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>Applicant Name:</span>
                    <span className="text-navy font-bold uppercase">{enrollmentResult.commonDetails.applicantName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Verified Documents:</span>
                  <span className="text-navy font-bold font-mono">{enrollmentResult.uploadedDocuments.length} Scanned</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee:</span>
                  {enrollmentResult.paymentDetails.method === 'EXEMPT' ? (
                    <span className="text-emerald-600 font-bold">₹0.00 (EXEMPT)</span>
                  ) : (
                    <span className="text-emerald-600 font-bold">
                      ₹{enrollmentResult.paymentDetails.amount?.toFixed(2)} ({enrollmentResult.paymentDetails.method === 'CASH' ? 'PAID via CASH' : 'PAID'})
                    </span>
                  )}
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2.5 mt-1 font-bold text-navy">
                  <span>Timeline:</span>
                  <span>Will be proceeded with in 7 working days</span>
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
            <div className="hidden print:block w-full text-black font-sans leading-relaxed text-left" style={{ fontFamily: 'sans-serif' }}>
              {[
                { title: 'Applicant Copy / आवेदक प्रति' },
                { title: 'Office Copy / कार्यालय प्रति' }
              ].map((copy, index) => (
                <div key={index} className="w-full p-10 flex flex-col justify-between" style={{ minHeight: '297mm', boxSizing: 'border-box', pageBreakAfter: index === 0 ? 'always' : 'auto' }}>
                  <div>
                    <div className="flex items-center justify-between border-b-4 border-black pb-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 border border-black flex items-center justify-center font-bold text-2xl">NN</div>
                        <div>
                          <h2 className="text-2xl font-bold uppercase m-0 leading-none">nagar nigam jaipur</h2>
                          <span className="text-xs uppercase font-bold tracking-wider text-slate-500 mt-1 block">citizen registry center</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm uppercase block font-bold">{copy.title}</span>
                        <span className="text-xs uppercase block font-medium mt-1">enrollment voucher</span>
                        <span className="text-lg font-bold font-mono block mt-1">{enrollmentResult.enrollmentId}</span>
                      </div>
                    </div>

                    <h3 className="text-center font-bold uppercase text-lg border-b pb-2 mb-6">Citizen Request Enrollment Acknowledgement</h3>

                    <div className="grid grid-cols-2 gap-6 text-sm mb-6 pb-6 border-b">
                      <div>
                        <p className="my-1.5"><strong>Enrollment Number:</strong> {enrollmentResult.enrollmentId}</p>
                        <p className="my-1.5"><strong>Counter Token Number:</strong> {enrollmentResult.tokenNumber}</p>
                        <p className="my-1.5"><strong>Issued Date:</strong> {new Date(enrollmentResult.submittedAt || Date.now()).toLocaleString('en-IN')}</p>
                        <p className="my-1.5"><strong>Department Block:</strong> {enrollmentResult.departmentBlock.toUpperCase()}</p>
                        <p className="my-1.5"><strong>Application Type:</strong> {enrollmentResult.serviceType.toUpperCase()}</p>
                        <p className="my-1.5 font-bold" style={{ color: '#1e3a8a' }}>Your application will be proceeded with in 7 working days</p>
                      </div>
                      <div>
                        {(() => {
                          const block = enrollmentResult.departmentBlock.toUpperCase();
                          const isBirthOrDeath = (block === 'BIRTH' || block === 'DEATH');
                          
                          if (isBirthOrDeath) {
                            const appNameField = enrollmentResult.serviceType === 'new_registration'
                              ? (enrollmentResult.correctionFields?.find(f => f.fieldName === 'Applicant Name')?.newValue || 'N/A')
                              : enrollmentResult.commonDetails.applicantName;
                            
                            const relationField = enrollmentResult.serviceType === 'new_registration'
                              ? (enrollmentResult.correctionFields?.find(f => f.fieldName.startsWith('Relation'))?.newValue || 'N/A')
                              : enrollmentResult.commonDetails.relationWithApplicant;

                            const childDeceasedName = enrollmentResult.serviceType === 'new_registration'
                              ? enrollmentResult.commonDetails.applicantName
                              : (enrollmentResult.correctionFields?.find(f => f.fieldName.includes("Child's Name") || f.fieldName.includes("Deceased Person Name"))?.newValue || 'See Correction Particulars');
                            
                            return (
                              <>
                                {enrollmentResult.serviceType === 'new_registration' && (
                                  <p className="my-1.5"><strong>{block === 'BIRTH' ? "Child's Name" : "Deceased's Name"}:</strong> {childDeceasedName.toUpperCase()}</p>
                                )}
                                <p className="my-1.5"><strong>Applicant/Informant:</strong> {(appNameField || 'N/A').toUpperCase()} ({(relationField || 'N/A').toUpperCase()})</p>
                                <p className="my-1.5"><strong>Father's Name:</strong> {(enrollmentResult.commonDetails.fatherName || 'N/A').toUpperCase()}</p>
                                <p className="my-1.5"><strong>Applicant Contact:</strong> {enrollmentResult.commonDetails.mobileNumber}</p>
                              </>
                            );
                          } else {
                            return (
                              <>
                                <p className="my-1.5"><strong>Applicant Name:</strong> {enrollmentResult.commonDetails.applicantName.toUpperCase()}</p>
                                <p className="my-1.5"><strong>Applicant Contact:</strong> {enrollmentResult.commonDetails.mobileNumber}</p>
                              </>
                            );
                          }
                        })()}
                        <p className="my-1.5"><strong>Base Reg ID:</strong> {enrollmentResult.commonDetails.registrationNumber}</p>
                        <p className="my-1.5">
                          <strong>Payment Fee:</strong>{' '}
                          {enrollmentResult.paymentDetails.method === 'EXEMPT' ? (
                            <span style={{ color: '#059669', fontWeight: 'bold' }}>₹0.00 (FEE EXEMPT)</span>
                          ) : enrollmentResult.paymentDetails.method === 'CASH' ? (
                            <span style={{ color: '#059669', fontWeight: 'bold' }}>₹{enrollmentResult.paymentDetails.amount?.toFixed(2)} (PAID via CASH)</span>
                          ) : (
                            <span style={{ color: '#059669', fontWeight: 'bold' }}>₹{enrollmentResult.paymentDetails.amount?.toFixed(2)} (PAID via {enrollmentResult.paymentDetails.method})</span>
                          )}
                        </p>
                        <p className="my-1.5"><strong>Transaction Reference:</strong> {enrollmentResult.paymentDetails.transactionId}</p>
                      </div>
                    </div>

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
                              <td className="border border-slate-300 p-2 font-bold">{item.name}</td>
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
                  </div>
                </div>
              ))}
            </div>,
            document.body
          )}

        </div>
      )}

    </div>
  );
}
