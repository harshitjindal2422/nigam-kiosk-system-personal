import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance.js';
import { LogOut, Search, Check, AlertTriangle, FileText, Smartphone, User, Calendar, Tag, ShieldCheck, HelpCircle, RefreshCw } from 'lucide-react';
import { getFileUrl } from '../utils/urlHelper.js';

export default function CheckerDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [objectionRemarks, setObjectionRemarks] = useState('');
  const [showObjectionForm, setShowObjectionForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedAppRef = useRef(selectedApp);
  useEffect(() => {
    selectedAppRef.current = selectedApp;
  }, [selectedApp]);

  const [editForm, setEditForm] = useState({
    applicant_name: '',
    mobile_number: '',
    father_name: '',
    mother_name: '',
    registration_number: '',
    dob: '',
    correction_details: [],
    uploaded_documents: []
  });

  const [scanningDocIdx, setScanningDocIdx] = useState(null);

  const prevAppIdRef = useRef(null);

  useEffect(() => {
    const currentId = selectedApp ? selectedApp.application_id : null;
    if (selectedApp && prevAppIdRef.current !== currentId) {
      setEditForm({
        applicant_name: selectedApp.applicant_name || '',
        mobile_number: selectedApp.mobile_number || '',
        father_name: selectedApp.father_name || '',
        mother_name: selectedApp.mother_name || '',
        registration_number: selectedApp.registration_number || '',
        dob: selectedApp.dob || '',
        correction_details: selectedApp.correction_details ? JSON.parse(JSON.stringify(selectedApp.correction_details)) : [],
        uploaded_documents: selectedApp.uploaded_documents ? [...selectedApp.uploaded_documents] : []
      });
      prevAppIdRef.current = currentId;
    } else if (!selectedApp) {
      prevAppIdRef.current = null;
    }
  }, [selectedApp]);

  const handleRescanDoc = (idx) => {
    setScanningDocIdx(idx);
    setTimeout(() => {
      setEditForm(prev => {
        const docs = [...prev.uploaded_documents];
        const oldName = docs[idx];
        const baseName = oldName.replace(/\.pdf$/i, '').replace(/_Rescanned_\d+$/, '');
        docs[idx] = `${baseName}_Rescanned_${Math.floor(1000 + Math.random() * 9000)}.pdf`;
        return {
          ...prev,
          uploaded_documents: docs
        };
      });
      setScanningDocIdx(null);
    }, 2000);
  };

  const handleCorrectionDetailChange = (idx, newValue) => {
    setEditForm(prev => {
      const details = [...prev.correction_details];
      details[idx] = { ...details[idx], newValue };
      return { ...prev, correction_details: details };
    });
  };

  const handleSubmitCorrection = async () => {
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await axiosInstance.post(`/applications/${selectedApp.application_id}/checker-review`, {
        action: 'APPROVE',
        correctedData: editForm
      });

      setSuccessMsg(`Application ${selectedApp.enrollment_id} corrected and submitted for final DSC approval successfully.`);
      setSelectedApp(null);
      await fetchQueue();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit corrected file');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/applications/checker-queue');
      const queueData = res.data || [];
      setApplications(queueData);
      
      const currentSelected = selectedAppRef.current;
      if (currentSelected) {
        const freshApp = queueData.find(app => app.application_id === currentSelected.application_id);
        if (freshApp) {
          setSelectedApp(freshApp);
        }
      }
      setLoading(false);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch checker queue');
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
    setObjectionRemarks('');
    setShowObjectionForm(false);
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleReview = async (action) => {
    if (action === 'OBJECT' && !objectionRemarks.trim()) {
      setErrorMsg('Please specify objection remarks!');
      return;
    }

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await axiosInstance.post(`/applications/${selectedApp.application_id}/checker-review`, {
        action,
        objectionRemarks: action === 'OBJECT' ? objectionRemarks : undefined
      });

      setSuccessMsg(`Application ${selectedApp.enrollment_id} successfully ${action === 'APPROVE' ? 'Approved' : 'Objected'}.`);
      setSelectedApp(null);
      setShowObjectionForm(false);
      setObjectionRemarks('');
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
            <h2 className="text-xl font-bold text-navy m-0 leading-none">नगर निगम जयपुर — Checker Dashboard (सत्यापन अधिकारी)</h2>
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Municipal Registrar Verification Office</span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <span className="text-sm font-bold text-navy block">Checker: {user?.full_name}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Terminal: CHK-01</span>
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
        
        {/* Left Side: Pending Application Queue */}
        <aside className="w-96 border-r border-slate-200 bg-white p-5 flex flex-col shrink-0 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h3 className="m-0 text-navy font-bold flex items-center gap-2 text-lg">
              <Smartphone className="w-5 h-5 text-saffron" />
              <span>Pending Review Queue</span>
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
                <span className="text-xs text-slate-400">All submitted applications have been audited.</span>
              </div>
            ) : (
              applications.map((app) => {
                const isCorrection = app.service_type === 'CORRECTION';
                const isRevert = app.status === 'REVERTED_TO_CHECKER';
                
                return (
                  <div
                    key={app.application_id}
                    onClick={() => handleSelectApp(app)}
                    className={`p-4 border rounded-2xl flex flex-col gap-2 cursor-pointer transition-all shadow-sm relative overflow-hidden shrink-0 ${
                      selectedApp?.application_id === app.application_id
                        ? 'border-navy bg-navy/[0.02] ring-2 ring-navy/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {isRevert && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-bl-xl font-bold uppercase tracking-widest">
                        REVERTED
                      </div>
                    )}
                    {app.status === 'OBJECTION' && (
                      <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-bl-xl font-bold uppercase tracking-widest">
                        OBJECTION
                      </div>
                    )}
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

        {/* Right Side: Document Auditor Panel */}
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
            <div className="flex flex-col gap-6">
              
              {/* Application Details Summary */}
              <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start border-b pb-4 mb-4">
                  <div>
                    <h3 className="m-0 text-navy font-bold text-xl uppercase">Application Audit Terminal</h3>
                    <p className="text-xs text-slate-400 font-bold m-0 mt-1 uppercase tracking-widest">
                      File Enrollment ID: {selectedApp.enrollment_id} · Token: {selectedApp.token_number}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase bg-slate-100 px-3 py-1.5 rounded-lg border">
                    Type: {selectedApp.service_type}
                  </span>
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
                      <div className="md:col-span-3 grid grid-cols-2 gap-4 text-sm font-semibold text-slate-600">
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                            <User className="w-3.5 h-3.5" /> Deceased/Child/Groom Name
                          </span>
                          {selectedApp.status === 'REVERTED_TO_CHECKER' ? (
                            <input
                              type="text"
                              value={editForm.applicant_name}
                              onChange={(e) => setEditForm({ ...editForm, applicant_name: e.target.value })}
                              className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-navy bg-white focus:border-navy outline-none"
                            />
                          ) : (
                            <span className="text-base text-navy font-bold">{selectedApp.applicant_name}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                            <Smartphone className="w-3.5 h-3.5" /> Mobile Number
                          </span>
                          {selectedApp.status === 'REVERTED_TO_CHECKER' ? (
                            <input
                              type="text"
                              value={editForm.mobile_number}
                              onChange={(e) => setEditForm({ ...editForm, mobile_number: e.target.value })}
                              className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-navy bg-white focus:border-navy outline-none"
                            />
                          ) : (
                            <span className="text-base text-navy font-bold">{selectedApp.mobile_number}</span>
                          )}
                        </div>
                        {(selectedApp.father_name || selectedApp.status === 'REVERTED_TO_CHECKER') && (
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                              <User className="w-3.5 h-3.5" /> Father's Name
                            </span>
                            {selectedApp.status === 'REVERTED_TO_CHECKER' ? (
                              <input
                                type="text"
                                value={editForm.father_name}
                                onChange={(e) => setEditForm({ ...editForm, father_name: e.target.value })}
                                className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-navy bg-white focus:border-navy outline-none"
                              />
                            ) : (
                              <span className="text-base text-navy font-bold">{selectedApp.father_name}</span>
                            )}
                          </div>
                        )}
                        {(selectedApp.mother_name || selectedApp.status === 'REVERTED_TO_CHECKER') && (
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                              <User className="w-3.5 h-3.5" /> Mother's Name
                            </span>
                            {selectedApp.status === 'REVERTED_TO_CHECKER' ? (
                              <input
                                type="text"
                                value={editForm.mother_name}
                                onChange={(e) => setEditForm({ ...editForm, mother_name: e.target.value })}
                                className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-navy bg-white focus:border-navy outline-none"
                              />
                            ) : (
                              <span className="text-base text-navy font-bold">{selectedApp.mother_name}</span>
                            )}
                          </div>
                        )}
                        {(selectedApp.registration_number || selectedApp.status === 'REVERTED_TO_CHECKER') && (
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                              <Tag className="w-3.5 h-3.5" /> Base Registration ID
                            </span>
                            {selectedApp.status === 'REVERTED_TO_CHECKER' ? (
                              <input
                                type="text"
                                value={editForm.registration_number}
                                onChange={(e) => setEditForm({ ...editForm, registration_number: e.target.value })}
                                className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-navy bg-white focus:border-navy outline-none"
                              />
                            ) : (
                              <span className="text-base text-navy font-bold font-mono">{selectedApp.registration_number}</span>
                            )}
                          </div>
                        )}
                        {(selectedApp.dob || selectedApp.status === 'REVERTED_TO_CHECKER') && (
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" /> Birth/Event/Marriage Date
                            </span>
                            {selectedApp.status === 'REVERTED_TO_CHECKER' ? (
                              <input
                                type="text"
                                value={editForm.dob}
                                onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                                className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-navy bg-white focus:border-navy outline-none"
                              />
                            ) : (
                              <span className="text-base text-navy font-bold">{selectedApp.dob}</span>
                            )}
                          </div>
                        )}
                        <div className="flex flex-col gap-1 col-span-2 border-t pt-2 mt-1">
                          <span className="text-slate-400 uppercase text-[10px] tracking-wider">Fee Registry Details</span>
                          <span className="text-sm font-bold text-navy">
                            ₹{selectedApp.payment_amount} ({selectedApp.payment_status} via {selectedApp.payment_method || 'CASH'})
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {selectedApp.status === 'REVERTED_TO_CHECKER' && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mt-6 text-sm font-semibold leading-relaxed">
                    <strong className="block text-red-700 uppercase text-xs mb-1">⚠️ REVERTED BY APPROVAL OPERATOR</strong>
                    Revert remarks: <span className="font-bold">"{selectedApp.objection_remarks}"</span>
                  </div>
                )}
              </div>

              {/* Dynamic Details Section for CORRECTION vs NEW_REGISTRATION */}
              {selectedApp.service_type === 'CORRECTION' ? (
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
                        {selectedApp.status === 'REVERTED_TO_CHECKER' ? (
                          (editForm.correction_details || []).map((field, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 font-semibold">
                              <td className="border border-slate-200 p-2.5 text-navy font-bold">{field.fieldName}</td>
                              <td className="border border-slate-200 p-2.5 text-slate-400 font-mono">{field.oldValue}</td>
                              <td className="border border-slate-200 p-2.5">
                                <input
                                  type="text"
                                  value={field.newValue}
                                  onChange={(e) => handleCorrectionDetailChange(idx, e.target.value)}
                                  className="w-full px-2 py-1 border border-slate-200 rounded-lg text-sm font-bold text-navy focus:border-navy outline-none bg-white font-mono"
                                />
                              </td>
                            </tr>
                          ))
                        ) : (
                          (selectedApp.correction_details || []).map((field, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 font-semibold">
                              <td className="border border-slate-200 p-2.5 text-navy font-bold">{field.fieldName}</td>
                              <td className="border border-slate-200 p-2.5 text-slate-400 font-mono">{field.oldValue}</td>
                              <td className="border border-slate-200 p-2.5 text-emerald-600 font-bold font-mono">{field.newValue}</td>
                            </tr>
                          ))
                        )}
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
                    {selectedApp.status === 'REVERTED_TO_CHECKER' ? (
                      (editForm.correction_details || [])
                        .filter(field => field.fieldName !== 'combinedPhoto')
                        .map((field, idx) => {
                          const originalIdx = editForm.correction_details.findIndex(f => f.fieldName === field.fieldName);
                          return (
                            <div key={idx} className="border border-slate-100 rounded-xl p-3 bg-slate-50 flex flex-col gap-1">
                              <span className="text-xs text-slate-400 uppercase tracking-wider">{field.fieldName}</span>
                              <input
                                type="text"
                                value={field.newValue}
                                onChange={(e) => handleCorrectionDetailChange(originalIdx, e.target.value)}
                                className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold text-navy bg-white focus:border-navy outline-none"
                              />
                            </div>
                          );
                        })
                    ) : (
                      (selectedApp.correction_details || [])
                        .filter(field => field.fieldName !== 'combinedPhoto')
                        .map((field, idx) => (
                          <div key={idx} className="border border-slate-100 rounded-xl p-3 bg-slate-50 flex flex-col gap-1">
                            <span className="text-xs text-slate-400 uppercase tracking-wider">{field.fieldName}</span>
                            <span className="text-sm text-navy font-bold">{field.newValue}</span>
                          </div>
                        ))
                    )}
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
                    {selectedApp.status === 'REVERTED_TO_CHECKER' ? (
                      (editForm.uploaded_documents || []).map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 font-semibold text-navy text-sm truncate max-w-[50%]">
                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="truncate" title={doc}>{doc}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              disabled={scanningDocIdx !== null}
                              onClick={() => handleRescanDoc(idx)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-transform active:scale-95 cursor-pointer shadow-sm disabled:opacity-50"
                            >
                              {scanningDocIdx === idx ? 'Scanning...' : 'Rescan / Upload'}
                            </button>
                            <a
                              href={getFileUrl(doc, 'scans')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-navy text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-transform active:scale-95 cursor-pointer shadow-sm"
                            >
                              View
                            </a>
                          </div>
                        </div>
                      ))
                    ) : (
                      (selectedApp.uploaded_documents || []).map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 font-semibold text-navy text-sm truncate max-w-[60%]">
                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="truncate" title={doc}>{doc}</span>
                          </div>
                          <a
                            href={getFileUrl(doc, 'scans')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 bg-navy text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-transform active:scale-95 cursor-pointer shadow-sm"
                          >
                            View Document
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Audit Controls */}
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="m-0 text-navy font-bold border-b pb-3 text-base flex items-center gap-1.5 uppercase">
                      <ShieldCheck className="w-5 h-5 text-saffron" />
                      Verification Audit Actions
                    </h4>
                    <p className="text-xs text-slate-400 font-bold m-0 mt-2 uppercase tracking-wide">
                      Select review action to progress workflow session
                    </p>
                  </div>

                  {selectedApp.status === 'OBJECTION' ? (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm font-semibold leading-relaxed shadow-sm">
                      <div className="flex items-center gap-2 mb-1.5">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <strong className="uppercase text-xs font-bold text-amber-700">Objection Active</strong>
                      </div>
                      This application has an active objection. Waiting for the counter operator to edit and resubmit details.
                      {selectedApp.objection_remarks && (
                        <div className="mt-2 pt-2 border-t border-amber-200/50 text-xs">
                          Objection Remarks: <span className="font-bold">"{selectedApp.objection_remarks}"</span>
                        </div>
                      )}
                    </div>
                  ) : selectedApp.status === 'REVERTED_TO_CHECKER' ? (
                    <div className="flex flex-col gap-3">
                      <button
                        disabled={actionLoading || scanningDocIdx !== null}
                        onClick={handleSubmitCorrection}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                      >
                        <Check className="w-5 h-5" />
                        <span>Submit Corrected File & Send for Approval</span>
                      </button>
                    </div>
                  ) : showObjectionForm ? (
                    <div className="flex flex-col gap-3 font-semibold text-sm">
                      <label className="text-navy">Objection Remarks / Reason (आपत्ति का कारण)</label>
                      <textarea
                        value={objectionRemarks}
                        onChange={(e) => setObjectionRemarks(e.target.value)}
                        placeholder="e.g. Affidavit not clear or mismatch in name"
                        className="p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-navy h-24 font-rajdhani text-navy font-bold resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={actionLoading}
                          onClick={() => handleReview('OBJECT')}
                          className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl active:scale-95 transition-transform cursor-pointer"
                        >
                          {actionLoading ? 'Submitting...' : 'Confirm Objection'}
                        </button>
                        <button
                          onClick={() => setShowObjectionForm(false)}
                          className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl active:scale-95 transition-transform"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <button
                        disabled={actionLoading}
                        onClick={() => handleReview('APPROVE')}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <Check className="w-5 h-5" />
                        <span>Approve Application</span>
                      </button>

                      <button
                        onClick={() => setShowObjectionForm(true)}
                        className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-lg rounded-xl active:scale-95 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <AlertTriangle className="w-5 h-5" />
                        <span>Flag with Objection</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center gap-3">
              <HelpCircle className="w-16 h-16 text-slate-300 animate-bounce" />
              <h3 className="m-0 text-navy font-bold text-lg uppercase">No Application Selected</h3>
              <p className="text-sm font-semibold max-w-sm m-0">
                Click on any application from the left queue sidebar to inspect documents, user profiles, and trigger verification audits.
              </p>
            </div>
          )}
        </main>

      </div>
    </div>
  );
}
