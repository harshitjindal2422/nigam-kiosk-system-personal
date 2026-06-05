import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance.js';
import { LogOut, Check, AlertTriangle, FileText, Smartphone, User, Calendar, Tag, ShieldCheck, KeyRound, ArrowRight, HelpCircle } from 'lucide-react';

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

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/applications/approval-queue');
      setApplications(res.data || []);
      setLoading(false);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch approval queue');
      setLoading(false);
    }
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
    setRevertRemarks('');
    setShowRevertForm(false);
    setSuccessMsg('');
    setErrorMsg('');
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
        revertRemarks: action === 'REVERT' ? revertRemarks : undefined
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
                    className={`p-4 border rounded-2xl flex flex-col gap-2 cursor-pointer transition-all shadow-sm ${
                      selectedApp?.application_id === app.application_id
                        ? 'border-navy bg-navy/[0.02] ring-2 ring-navy/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-navy text-base font-mono">{app.enrollment_id}</span>
                      <span className={`text-[9px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-md border ${
                        isCorrection ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-green-50 border-green-200 text-green-700'
                      }`}>
                        {app.department_block}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mt-1">
                      <span>Applicant: <strong className="text-navy">{app.applicant_name}</strong></span>
                      <span className="font-mono text-[10px] text-slate-400">{new Date(app.created_at).toLocaleDateString()}</span>
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
                  <span className="text-xs font-bold text-slate-400 uppercase bg-slate-100 px-3 py-1.5 rounded-lg border">
                    Type: {selectedApp.service_type}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm font-semibold text-slate-600">
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
                        <Calendar className="w-3.5 h-3.5" /> Birth/Event Date
                      </span>
                      <span className="text-base text-navy font-bold">{selectedApp.dob}</span>
                    </div>
                  )}
                </div>
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
                      Select final disposition for this application
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
                    <div className="flex flex-col gap-3">
                      <button
                        disabled={actionLoading}
                        onClick={() => handleReview('DONE')}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <Check className="w-5 h-5" />
                        <span>Confirm DSC Done (Complete Request)</span>
                      </button>

                      <button
                        onClick={() => setShowRevertForm(true)}
                        className="w-full py-4 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-lg rounded-xl active:scale-95 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <AlertTriangle className="w-5 h-5" />
                        <span>Revert to Checker</span>
                      </button>
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
