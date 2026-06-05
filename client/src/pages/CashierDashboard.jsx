import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance.js';
import { createPortal } from 'react-dom';
import { LogOut, Search, Check, CreditCard, FileText, Smartphone, User, Calendar, Tag, ShieldCheck, HelpCircle, Printer } from 'lucide-react';

export default function CashierDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [receiptToPrint, setReceiptToPrint] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/applications/cashier-queue');
      setApplications(res.data || []);
      setLoading(false);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch cashier queue');
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
    setSuccessMsg('');
    setErrorMsg('');
    setReceiptToPrint(null);
  };

  const handleCollectPayment = async () => {
    if (!selectedApp) return;

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await axiosInstance.post(`/applications/${selectedApp.application_id}/cashier-collect`);
      
      setSuccessMsg(`Payment of ₹20.00 collected successfully for ${selectedApp.enrollment_id}.`);
      setReceiptToPrint({
        ...selectedApp,
        collectedAt: new Date().toISOString(),
        transactionId: `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`
      });
      setSelectedApp(null);
      await fetchQueue();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to collect payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
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
            <h2 className="text-xl font-bold text-navy m-0 leading-none">नगर निगम जयपुर — Cashier Dashboard (राजस्व संग्रह विभाग)</h2>
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Jaipur Municipal Revenue Cash Desk</span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <span className="text-sm font-bold text-navy block">Cashier: {user?.full_name}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Terminal: CSH-01</span>
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
        
        {/* Left Side: Cash Queue Sidebar */}
        <aside className="w-96 border-r border-slate-200 bg-white p-5 flex flex-col shrink-0 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h3 className="m-0 text-navy font-bold flex items-center gap-2 text-lg">
              <CreditCard className="w-5 h-5 text-saffron" />
              <span>Unpaid Cash Queue</span>
            </h3>
            <span className="bg-navy text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {applications.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
            {loading && applications.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 font-semibold">
                Loading unpaid records...
              </div>
            ) : applications.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center px-4 gap-2">
                <ShieldCheck className="w-12 h-12 text-slate-300 animate-pulse" />
                <span className="text-sm font-bold uppercase tracking-wider italic">No Pending Cash Payments!</span>
                <span className="text-xs text-slate-400">All offline applications have cleared cashier collections.</span>
              </div>
            ) : (
              applications.map((app) => {
                const isCorrection = app.service_type === 'CORRECTION';
                return (
                  <div
                    key={app.application_id}
                    onClick={() => handleSelectApp(app)}
                    className={`p-4 border rounded-2xl flex flex-col gap-2 cursor-pointer transition-all shadow-sm relative overflow-hidden ${
                      selectedApp?.application_id === app.application_id
                        ? 'border-navy bg-navy/[0.02] ring-2 ring-navy/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-navy text-base font-mono">{app.enrollment_id}</span>
                      <span className={`text-[9px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-600`}>
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

        {/* Right Side: Cash Collection Details */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50 flex flex-col gap-6">
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between shadow-sm">
              <span className="font-bold text-lg">{successMsg}</span>
              {receiptToPrint && (
                <button
                  onClick={handlePrintReceipt}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 active:scale-95 transition-transform cursor-pointer shadow-sm text-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl font-bold text-lg shadow-sm">
              {errorMsg}
            </div>
          )}

          {selectedApp ? (
            <div className="flex flex-col gap-6 max-w-4xl">
              
              {/* Card 1: Summary */}
              <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start border-b pb-4 mb-4">
                  <div>
                    <h3 className="m-0 text-navy font-bold text-xl uppercase">Revenue Cash Collection</h3>
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
                      <User className="w-3.5 h-3.5" /> Applicant Name
                    </span>
                    <span className="text-base text-navy font-bold">{selectedApp.applicant_name}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5" /> Mobile Number
                    </span>
                    <span className="text-base text-navy font-bold">{selectedApp.mobile_number}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Filed Date
                    </span>
                    <span className="text-base text-navy font-bold">{new Date(selectedApp.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" /> Department Block
                    </span>
                    <span className="text-base text-navy font-bold uppercase">{selectedApp.department_block}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Cashier collection action box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between gap-5 text-navy">
                  <div>
                    <span className="font-bebas text-xs tracking-wider text-saffron uppercase block font-bold">Billing statement</span>
                    <h3 className="font-bold text-xl m-0 mt-1 uppercase">Municipal Service Fee</h3>
                  </div>

                  <div className="flex flex-col gap-2 font-semibold text-slate-600 border-y py-4 my-2 text-sm">
                    <div className="flex justify-between">
                      <span>Service Description:</span>
                      <span className="text-navy font-bold">{selectedApp.service_type === 'CORRECTION' ? 'Certificate Registry Correction' : 'New Certificate Registration'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Method:</span>
                      <span className="text-amber-600 font-extrabold uppercase">OFFLINE CASH</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-400 uppercase">Cash Amount to Collect:</span>
                    <span className="text-3xl font-extrabold text-navy">₹20.00</span>
                  </div>
                </div>

                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="m-0 text-navy font-bold border-b pb-3 text-base flex items-center gap-1.5 uppercase">
                      <ShieldCheck className="w-5 h-5 text-saffron" />
                      Verify & Collect
                    </h4>
                    <p className="text-xs text-slate-400 font-bold m-0 mt-2 uppercase tracking-wide leading-relaxed">
                      Confirm you have received flat ₹20.00 cash from the citizen. Approving this updates the registry state and releases the file for audit verification.
                    </p>
                  </div>

                  <button
                    disabled={actionLoading}
                    onClick={handleCollectPayment}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md mt-4"
                  >
                    <Check className="w-5 h-5" />
                    <span>{actionLoading ? 'Saving Payment...' : 'Accept Cash & Approve Payment'}</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center gap-3">
              <HelpCircle className="w-16 h-16 text-slate-300 animate-bounce" />
              <h3 className="m-0 text-navy font-bold text-lg uppercase">No Application Selected</h3>
              <p className="text-sm font-semibold max-w-sm m-0">
                Click on any application from the left queue sidebar to inspect billing amounts and approve cash collections.
              </p>
            </div>
          )}
        </main>

      </div>

      {/* 🖨️ PHYSICAL MUNICIPAL CASH RECEIPT PRINT LAYOUT */}
      {receiptToPrint && createPortal(
        <div className="hidden print:block w-[80mm] p-[10px] text-black font-mono text-[11px] leading-relaxed">
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
                size: 80mm auto !important;
                margin: 0 !important;
              }
            }
          `}} />
          <div className="text-center border-b border-dashed border-black pb-2 mb-2">
            <h3 className="font-bold text-[14px] uppercase m-0">NAGAR NIGAM JAIPUR</h3>
            <p className="text-[8px] m-0 uppercase mt-0.5">OFFLINE PAYMENT RECEIPT</p>
          </div>
          
          <div className="flex flex-col gap-1 border-b border-dashed border-black pb-2 mb-2">
            <div><strong>RECEIPT NO:</strong> {receiptToPrint.transactionId}</div>
            <div><strong>ENROLLMENT NO:</strong> {receiptToPrint.enrollment_id || receiptToPrint.enrollmentId}</div>
            <div><strong>TOKEN NO:</strong> {receiptToPrint.token_number || receiptToPrint.tokenNumber}</div>
            <div><strong>DATE & TIME:</strong> {new Date(receiptToPrint.collectedAt).toLocaleString('en-IN')}</div>
            <div><strong>APPLICANT:</strong> {receiptToPrint.applicant_name.toUpperCase()}</div>
            <div><strong>CONTACT:</strong> {receiptToPrint.mobile_number}</div>
            <div><strong>DEPT BLOCK:</strong> {receiptToPrint.department_block.toUpperCase()}</div>
            <div><strong>SERVICE:</strong> {receiptToPrint.service_type === 'CORRECTION' ? 'REGISTRY CORRECTION' : 'NEW REGISTRATION'}</div>
          </div>

          <div className="flex justify-between font-bold border-b border-dashed border-black pb-2 mb-2 text-[12px]">
            <span>TOTAL AMOUNT PAID:</span>
            <span>₹20.00</span>
          </div>

          <div className="text-center py-1 text-[9px] uppercase leading-snug border-b border-dashed border-black mb-2">
            Payment Mode: CASH (OFFLINE COLLECTION)<br/>
            <strong>STATUS: SUCCESS / PAID</strong>
          </div>

          <div className="text-center text-[8px] uppercase pt-2">
            This is a computer generated receipt.<br/>
            Thank you for your payment!
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
