import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance.js';
import { LogOut, Check, AlertTriangle, FileText, Smartphone, User, Calendar, Tag, ShieldCheck, KeyRound, ArrowRight, HelpCircle, RefreshCw } from 'lucide-react';

export default function ApprovalDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [revertRemarks, setRevertRemarks] = useState('');
  const [showRevertForm, setShowRevertForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    applicantName: '',
    mobileNumber: '',
    registrationNumber: '',
    dob: '',
    correctionDetails: []
  });

  const selectedAppRef = useRef(selectedApp);
  const isEditingRef = useRef(isEditing);

  useEffect(() => {
    selectedAppRef.current = selectedApp;
  }, [selectedApp]);

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  const [dscDoneCheck, setDscDoneCheck] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const prevAppIdRef = useRef(null);

  useEffect(() => {
    const currentId = selectedApp ? selectedApp.application_id : null;
    if (prevAppIdRef.current !== currentId) {
      setDscDoneCheck(false);
      setUploadedFileName('');
      setUploadedFileUrl('');
      setUploadError('');
      setIsEditing(false);
      prevAppIdRef.current = currentId;
    }
  }, [selectedApp]);

  const [rescanningDoc, setRescanningDoc] = useState(null);

  const handleRescanDocument = async (oldDocName) => {
    setRescanningDoc(oldDocName);
    setErrorMsg('');
    setSuccessMsg('');
    setTimeout(async () => {
      try {
        const cleanName = oldDocName.split('.')[0];
        const ext = oldDocName.includes('.') ? oldDocName.split('.').pop() : 'pdf';
        const newDocName = `${cleanName}_Rescanned_${Math.floor(1000 + Math.random() * 9000)}.${ext}`;

        const currentApp = selectedAppRef.current;
        if (!currentApp) return;

        const updatedDocs = (currentApp.uploaded_documents || []).map(d => d === oldDocName ? newDocName : d);

        await axiosInstance.post(`/applications/${currentApp.application_id}/update-documents`, {
          uploadedDocuments: updatedDocs
        });

        setSelectedApp(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            uploaded_documents: updatedDocs
          };
        });

        setApplications(prev => prev.map(app => 
          app.application_id === currentApp.application_id
            ? { ...app, uploaded_documents: updatedDocs }
            : app
        ));

        setSuccessMsg(`Document "${oldDocName}" rescanned and updated as: "${newDocName}"`);
      } catch (err) {
        setErrorMsg(err.message || "Failed to update rescanned document on server");
      } finally {
        setRescanningDoc(null);
      }
    }, 2500);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadError('');
    setIsUploading(true);
    
    const expectedName = `${selectedApp.token_number}.pdf`;
    
    if (file.name.toUpperCase() !== expectedName.toUpperCase()) {
      setIsUploading(false);
      setUploadError(`INVALID FILENAME: The uploaded certificate must be renamed exactly to "${expectedName}" before uploading.`);
      setUploadedFileName('');
      setUploadedFileUrl('');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result.split(',')[1];
        await axiosInstance.post('/applications/upload-certificate', {
          fileName: file.name,
          base64Data
        });
        
        setUploadedFileName(file.name);
        setUploadedFileUrl(`http://localhost:5000/temp/downloads/${file.name}`);
      } catch (err) {
        setUploadError(err.response?.data?.message || err.message || 'Failed to upload certificate to server');
        setUploadedFileName('');
        setUploadedFileUrl('');
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read local file');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/applications/approval-queue');
      const queueData = res.data || [];
      setApplications(queueData);
      
      const currentSelected = selectedAppRef.current;
      if (currentSelected && !isEditingRef.current) {
        const freshApp = queueData.find(app => app.application_id === currentSelected.application_id);
        if (freshApp) {
          setSelectedApp(freshApp);
        }
      }
      setLoading(false);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch approval queue');
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchQueue();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handleSelectApp = (app) => {
    setSelectedApp(app);
    setIsEditing(false);
    setRevertRemarks('');
    setShowRevertForm(false);
    setSuccessMsg('');
    setErrorMsg('');
  };

  const startEditing = () => {
    setEditForm({
      applicantName: selectedApp.applicant_name,
      mobileNumber: selectedApp.mobile_number,
      registrationNumber: selectedApp.registration_number || '',
      dob: selectedApp.dob || '',
      correctionDetails: (selectedApp.correction_details || []).map(d => ({ ...d }))
    });
    setIsEditing(true);
  };

  const saveEditing = async () => {
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await axiosInstance.post(`/applications/${selectedApp.application_id}/update-details`, {
        applicantName: editForm.applicantName,
        mobileNumber: editForm.mobileNumber,
        registrationNumber: editForm.registrationNumber,
        dob: editForm.dob,
        correctionDetails: editForm.correctionDetails
      });

      setSuccessMsg("Application details updated successfully.");
      setIsEditing(false);
      isEditingRef.current = false;

      const updatedApp = res.data;
      if (updatedApp) {
        setSelectedApp(updatedApp);
        setApplications(prev => prev.map(app => 
          app.application_id === updatedApp.application_id ? updatedApp : app
        ));
      } else {
        await fetchQueue();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to update application details");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async (action) => {
    if (action === 'REVERT' && !revertRemarks.trim()) {
      setErrorMsg('Please specify revert remarks!');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await axiosInstance.post(`/applications/${selectedApp.application_id}/approval-review`, {
        action,
        revertRemarks: action === 'REVERT' ? revertRemarks : undefined,
        downloadedCertificateUrl: action === 'DONE' ? uploadedFileUrl : undefined
      });

      setSuccessMsg(`Application ${selectedApp.enrollment_id} successfully marked as ${action === 'DONE' ? 'Done (Completed)' : 'Reverted to Checker'}.`);
      setSelectedApp(null);
      setShowRevertForm(false);
      setRevertRemarks('');
      await fetchQueue();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit review');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-50 font-rajdhani select-none overflow-hidden text-left">
      {/* Tricolor Ribbon */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-saffron via-white to-green-custom z-50" />

      {/* Header */}
      <header className="py-4 px-10 bg-white border-b border-slate-200/80 flex items-center justify-between shadow-sm shrink-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/assets/nigam-logo.png" alt="Emblem" className="w-10 h-10 object-contain" />
          <div>
            <h2 className="text-xl font-bold text-navy m-0 leading-none">नगर निगम जयपुर — Approval Dashboard (DSC सक्षम अधिकारी)</h2>
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Municipal Registrar DSC Approval Office</span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <span className="text-sm font-bold text-navy block">Approver: {user?.full_name}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Terminal: APR-01 (DSC Active)</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer font-bold disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 text-saffron ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition-transform cursor-pointer font-bold"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Body Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Pending Approved Queue */}
        <aside className="w-96 border-r border-slate-200 bg-white p-5 flex flex-col shrink-0 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h3 className="m-0 text-navy font-bold flex items-center gap-2 text-lg">
              <Smartphone className="w-5 h-5 text-saffron" />
              <span>Approved Queue</span>
            </h3>
            <span className="bg-navy text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {applications.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
            {loading && applications.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 font-semibold">
                Loading applications...
              </div>
            ) : applications.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center px-4 gap-2">
                <ShieldCheck className="w-12 h-12 text-slate-300 animate-pulse" />
                <span className="text-sm font-bold uppercase tracking-wider italic">Queue is clear!</span>
                <span className="text-xs text-slate-400">All approved files have been digitally signed.</span>
              </div>
            ) : (
              applications.map((app) => {
                const isCorrection = app.service_type === 'CORRECTION';
                
                return (
                  <div
                    key={app.application_id}
                    onClick={() => handleSelectApp(app)}
                    className={`p-4 border rounded-2xl flex flex-col gap-2 cursor-pointer transition-all shadow-sm shrink-0 ${
                      selectedApp?.application_id === app.application_id
                        ? 'border-navy bg-navy/[0.02] ring-2 ring-navy/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-navy text-sm font-mono">{app.token_number}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(app.token_number);
                            alert(`Copied token: ${app.token_number}`);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-navy active:scale-95 transition-all cursor-pointer shrink-0"
                          title="Copy Token Number"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        </button>
                      </div>
                      <span className={`text-[9px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-md border ${
                        isCorrection ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-green-50 border-green-200 text-green-700'
                      }`}>
                        {app.department_block}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-500 mt-1 flex flex-col gap-1 text-left leading-tight">
                      <div>ENR: <span className="font-mono text-navy font-bold">{app.enrollment_id}</span></div>
                      <div className="flex justify-between items-center mt-0.5">
                        <span>Applicant: <strong className="text-navy">{app.applicant_name}</strong></span>
                        <span className="font-mono text-[10px] text-slate-400">{new Date(app.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Side: DSC Portal Integration simulator */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50 flex flex-col gap-6">
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl font-bold text-lg">
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl font-bold text-lg">
              {errorMsg}
            </div>
          )}

          {selectedApp ? (
            <div className="flex flex-col gap-6 font-rajdhani">
              
              {/* Application Details Summary */}
              <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start border-b pb-4 mb-4">
                  <div>
                    <h3 className="m-0 text-navy font-bold text-xl uppercase">Digital Signature Gateway (DSC)</h3>
                    <p className="text-xs text-slate-400 font-bold m-0 mt-1 uppercase tracking-widest">
                      File Enrollment ID: {selectedApp.enrollment_id} · Token: {selectedApp.token_number}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isEditing && (
                      <button
                        onClick={startEditing}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-transform active:scale-95 cursor-pointer shadow-sm"
                      >
                        Edit Details
                      </button>
                    )}
                    <span className="text-xs font-bold text-slate-400 uppercase bg-slate-100 px-3 py-1.5 rounded-lg border">
                      Type: {selectedApp.service_type}
                    </span>
                  </div>
                </div>

                {(() => {
                  const combinedPhotoObj = (selectedApp.correction_details || []).find(d => d.fieldName === 'combinedPhoto');
                  const combinedPhotoSrc = combinedPhotoObj ? combinedPhotoObj.newValue : null;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                      {/* Photo column */}
                      <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 p-4 rounded-xl items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {combinedPhotoSrc ? "Combined Marriage Photo" : "Selfie Verification"}
                        </span>
                        <div className="w-44 h-32 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex items-center justify-center shadow-inner">
                          {combinedPhotoSrc ? (
                            <img src={combinedPhotoSrc} alt="Groom & Bride" className="w-full h-full object-cover" />
                          ) : selectedApp.selfie_url ? (
                            <img src={selectedApp.selfie_url} alt="Applicant Selfie" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-slate-500 italic">No Photo Available</span>
                          )}
                        </div>
                      </div>

                      {/* Info fields column */}
                      {isEditing ? (
                        <div className="md:col-span-3 grid grid-cols-2 gap-4 text-sm font-semibold text-slate-600">
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                              <User className="w-3.5 h-3.5" /> Deceased/Child/Groom Name
                            </span>
                            <input
                              type="text"
                              value={editForm.applicantName}
                              onChange={(e) => setEditForm(prev => ({ ...prev, applicantName: e.target.value }))}
                              className="p-2 border border-slate-300 rounded-lg text-sm text-navy font-bold bg-white focus:border-navy outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                              <Smartphone className="w-3.5 h-3.5" /> Mobile Number
                            </span>
                            <input
                              type="text"
                              value={editForm.mobileNumber}
                              onChange={(e) => setEditForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
                              className="p-2 border border-slate-300 rounded-lg text-sm text-navy font-bold bg-white focus:border-navy outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                              <Tag className="w-3.5 h-3.5" /> Base Registration ID
                            </span>
                            <input
                              type="text"
                              value={editForm.registrationNumber}
                              onChange={(e) => setEditForm(prev => ({ ...prev, registrationNumber: e.target.value }))}
                              className="p-2 border border-slate-300 rounded-lg text-sm text-navy font-bold bg-white focus:border-navy outline-none"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> Birth/Event/Marriage Date
                            </span>
                            <input
                              type="text"
                              value={editForm.dob}
                              onChange={(e) => setEditForm(prev => ({ ...prev, dob: e.target.value }))}
                              className="p-2 border border-slate-300 rounded-lg text-sm text-navy font-bold bg-white focus:border-navy outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="md:col-span-3 grid grid-cols-2 gap-4 text-sm font-semibold text-slate-600">
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                              <User className="w-3.5 h-3.5" /> Deceased/Child/Groom Name
                            </span>
                            <span className="text-base text-navy font-bold">{selectedApp.applicant_name}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                              <Smartphone className="w-3.5 h-3.5" /> Mobile Number
                            </span>
                            <span className="text-base text-navy font-bold">{selectedApp.mobile_number}</span>
                          </div>
                          {selectedApp.registration_number && (
                            <div className="flex flex-col gap-1">
                              <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                                <Tag className="w-3.5 h-3.5" /> Base Registration ID
                              </span>
                              <span className="text-base text-navy font-bold font-mono">{selectedApp.registration_number}</span>
                            </div>
                          )}
                          {selectedApp.dob && (
                            <div className="flex flex-col gap-1">
                              <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> Birth/Event/Marriage Date
                              </span>
                              <span className="text-base text-navy font-bold">{selectedApp.dob}</span>
                            </div>
                          )}
                          <div className="flex flex-col gap-1 col-span-2 border-t pt-2 mt-1">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wider">Fee Registry Details</span>
                            <span className="text-sm font-bold text-navy">
                              ₹{selectedApp.payment_amount} ({selectedApp.payment_status} via {selectedApp.payment_method || 'CASH'})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* DSC Portal Actions Integration Alert */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col gap-3 shadow-inner">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-base uppercase">
                  <KeyRound className="w-5 h-5 text-saffron shrink-0" />
                  <span>DSC Pehchan Portal Verification Action Required</span>
                </div>
                <p className="text-sm font-semibold text-amber-950 leading-relaxed m-0">
                  Please verify this application on your secondary DSC machine and log in to the state Pehchan Portal. Once you sign this certificate with your USB DSC token dongle, mark this record as <strong>Done</strong> below. If you encounter any document or system issue, click <strong>Revert to Checker</strong> to return it.
                </p>
              </div>

              {/* Dynamic Details Section for CORRECTION vs NEW_REGISTRATION */}
              {isEditing ? (
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm flex flex-col gap-4">
                  <h4 className="m-0 text-navy font-bold border-b pb-3 text-base flex items-center gap-1.5 uppercase">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Modify Registry Particulars
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2 font-semibold text-slate-600">
                    {editForm.correctionDetails
                      .filter(field => field.fieldName !== 'combinedPhoto')
                      .map((field, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col gap-1.5">
                          <span className="text-xs text-slate-400 uppercase tracking-wider">{field.fieldName}</span>
                          <input
                            type="text"
                            value={field.newValue}
                            onChange={(e) => {
                              const updatedDetails = [...editForm.correctionDetails];
                              const realIdx = editForm.correctionDetails.findIndex(d => d.fieldName === field.fieldName);
                              if (realIdx !== -1) {
                                updatedDetails[realIdx].newValue = e.target.value;
                                setEditForm(prev => ({ ...prev, correctionDetails: updatedDetails }));
                              }
                            }}
                            className="p-2 border border-slate-300 rounded-lg text-sm text-navy font-bold bg-white focus:border-navy outline-none"
                          />
                        </div>
                      ))}
                  </div>

                  <div className="flex gap-3 justify-end mt-4 border-t pt-4">
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={actionLoading}
                      className="px-6 py-2.5 border rounded-xl hover:bg-slate-50 text-slate-600 font-bold text-sm cursor-pointer transition-transform active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEditing}
                      disabled={actionLoading}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-transform active:scale-95 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {actionLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : selectedApp.service_type === 'CORRECTION' ? (
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                  <h4 className="m-0 text-navy font-bold border-b pb-3 text-base flex items-center gap-1.5 uppercase">
                    <Tag className="w-5 h-5 text-saffron" />
                    Correction Registry Field Mappings
                  </h4>
                  
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm border-collapse border border-slate-200">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold">
                          <th className="border border-slate-200 p-2.5 text-left">Correction Field</th>
                          <th className="border border-slate-200 p-2.5 text-left">Old Value in Registry</th>
                          <th className="border border-slate-200 p-2.5 text-left">New Value Requested</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedApp.correction_details || []).map((field, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 font-semibold">
                            <td className="border border-slate-200 p-2.5 text-navy font-bold">{field.fieldName}</td>
                            <td className="border border-slate-200 p-2.5 text-slate-400 font-mono">{field.oldValue}</td>
                            <td className="border border-slate-200 p-2.5 text-emerald-600 font-bold font-mono">{field.newValue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                  <h4 className="m-0 text-navy font-bold border-b pb-3 text-base flex items-center gap-1.5 uppercase">
                    <FileText className="w-5 h-5 text-saffron" />
                    New Registration Details Grid
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 font-semibold text-slate-600">
                    {(selectedApp.correction_details || [])
                      .filter(field => field.fieldName !== 'combinedPhoto')
                      .map((field, idx) => (
                        <div key={idx} className="border border-slate-100 rounded-xl p-3 bg-slate-50 flex flex-col gap-1">
                          <span className="text-xs text-slate-400 uppercase tracking-wider">{field.fieldName}</span>
                          <span className="text-sm text-navy font-bold">{field.newValue}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Verified Documents Attachment Audit */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm flex flex-col gap-4">
                  <h4 className="m-0 text-navy font-bold border-b pb-3 text-base flex items-center gap-1.5 uppercase">
                    <FileText className="w-5 h-5 text-saffron" />
                    Uploaded Scanned Documents
                  </h4>

                  <div className="flex flex-col gap-3">
                    {(selectedApp.uploaded_documents || []).map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 font-semibold text-navy text-sm">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span>{doc}</span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              alert(`Opening mock document: ${doc}`);
                            }}
                            className="px-3.5 py-1.5 bg-navy text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-transform active:scale-95 cursor-pointer shadow-sm"
                          >
                            View Document
                          </a>
                          <button
                            disabled={rescanningDoc === doc}
                            onClick={() => handleRescanDocument(doc)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg active:scale-95 transition-transform flex items-center gap-1 cursor-pointer border border-purple-700 shadow-sm"
                          >
                            {rescanningDoc === doc ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin text-white" />
                                <span>Scanning...</span>
                              </>
                            ) : (
                              <span>Rescan</span>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit Controls */}
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="m-0 text-navy font-bold border-b pb-3 text-base flex items-center gap-1.5 uppercase">
                      <ShieldCheck className="w-5 h-5 text-saffron" />
                      DSC Gateway Confirmation
                    </h4>
                    <p className="text-xs text-slate-400 font-bold m-0 mt-2 uppercase tracking-wide">
                      Complete DSC signature sequence to release certificate
                    </p>
                  </div>
 
                  {showRevertForm ? (
                    <div className="flex flex-col gap-3 font-semibold text-sm">
                      <label className="text-navy">Revert Remarks / Reason (checker operator ke liye remarks)</label>
                      <textarea
                        value={revertRemarks}
                        onChange={(e) => setRevertRemarks(e.target.value)}
                        placeholder="e.g. Scan quality is bad, ask applicant to submit again"
                        className="p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-navy h-24 font-rajdhani text-navy font-bold resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={actionLoading}
                          onClick={() => handleReview('REVERT')}
                          className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl active:scale-95 transition-transform cursor-pointer"
                        >
                          {actionLoading ? 'Reverting...' : 'Confirm Revert'}
                        </button>
                        <button
                          onClick={() => setShowRevertForm(false)}
                          className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl active:scale-95 transition-transform"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 text-left">
                      
                      {/* Step 1: Pehchan/DSC Verification */}
                      <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-navy uppercase tracking-wide">Step 1: Pehchan & DSC Entry</span>
                          {dscDoneCheck ? (
                            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">Confirmed</span>
                          ) : (
                            <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border uppercase">Pending</span>
                          )}
                        </div>
                        <label className="flex items-center gap-3 p-2 border border-slate-200 bg-white rounded-lg cursor-pointer select-none font-semibold text-sm">
                          <input
                            type="checkbox"
                            checked={dscDoneCheck}
                            onChange={(e) => setDscDoneCheck(e.target.checked)}
                            className="w-4 h-4 accent-navy cursor-pointer"
                          />
                          <span>Details entered on Pehchan & DSC successfully</span>
                        </label>
                      </div>

                      {/* Step 2: Upload renamed and signed PDF */}
                      <div className={`border border-slate-100 rounded-xl p-3.5 bg-slate-50 flex flex-col gap-2 ${!dscDoneCheck ? 'opacity-40 pointer-events-none' : ''}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-navy uppercase tracking-wide">Step 2: Upload Renamed Certificate</span>
                          {uploadedFileName ? (
                            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">Uploaded</span>
                          ) : (
                            <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border uppercase">Pending</span>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 bg-white border border-slate-200 rounded-lg p-2 relative">
                          <input
                            type="file"
                            accept=".pdf"
                            disabled={!dscDoneCheck || isUploading}
                            onChange={handleFileUpload}
                            className="text-xs font-semibold text-slate-600 file:mr-4 file:py-1.5 file:px-3.5 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-navy hover:file:bg-slate-200 cursor-pointer w-full"
                          />
                          {isUploading && (
                            <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center text-xs font-bold text-navy gap-2">
                              <RefreshCw className="w-4 h-4 text-saffron animate-spin" />
                              <span>Uploading to Cloud System...</span>
                            </div>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-500 font-semibold m-0 leading-tight">
                          * The uploaded certificate must be renamed exactly to the token number <strong>"{selectedApp.token_number}.pdf"</strong>.
                        </p>

                        {uploadError && (
                          <p className="text-[11px] text-red-600 font-bold m-0 leading-tight">{uploadError}</p>
                        )}
                        {uploadedFileName && (
                          <div className="text-[11px] text-emerald-600 font-bold m-0 leading-tight flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 shrink-0" />
                            <span>Staged: {uploadedFileName}</span>
                          </div>
                        )}
                      </div>

                      {/* Confirm DSC Done & Revert Button */}
                      <div className="flex flex-col gap-2 border-t pt-4 mt-2">
                        <button
                          disabled={actionLoading || !dscDoneCheck || !uploadedFileName}
                          onClick={() => handleReview('DONE')}
                          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                        >
                          <Check className="w-5 h-5" />
                          <span>Approve & Release Certificate</span>
                        </button>
 
                        {selectedApp.service_type !== 'NEW_REGISTRATION' && (
                          <button
                            onClick={() => setShowRevertForm(true)}
                            className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-sm rounded-xl active:scale-95 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            <span>Revert to Checker</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center gap-3">
              <HelpCircle className="w-16 h-16 text-slate-300 animate-bounce" />
              <h3 className="m-0 text-navy font-bold text-lg uppercase">No Approved File Selected</h3>
              <p className="text-sm font-semibold max-w-sm m-0">
                Click on any approved application from the left sidebar to perform DSC Pehchan portal verification and finalize the request.
              </p>
            </div>
          )}
        </main>

      </div>
    </div>
  );
}
