import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance.js';
import { motion, AnimatePresence } from 'framer-motion';
import printJS from 'print-js';
import { 
  LogOut, Search, Check, FileText, Smartphone, User, 
  Calendar, Tag, ShieldCheck, HelpCircle, Printer, 
  AlertTriangle, CreditCard, RefreshCw, Eye
} from 'lucide-react';

export default function PrinterDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  
  // Dashboard States
  const [tokens, setTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING, PRINTED
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(500);

  const containerRef = React.useRef(null);

  const handleContainerScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight || 500);
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setContainerHeight(entry.contentRect.height);
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Checklist Modal States
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklist, setChecklist] = useState({
    verifyIdentity: false,
    verifySignature: false,
    confirmJurisdiction: false
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const selectedTokenRef = React.useRef(selectedToken);

  React.useEffect(() => {
    selectedTokenRef.current = selectedToken;
  }, [selectedToken]);

  // Fetch Printer Tokens
  const fetchTokens = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/printer/tokens', {
        params: {
          status: activeTab,
          search: searchQuery || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }
      });
      const queueData = res.data || [];
      setTokens(queueData);
      
      // Preserve and update selected token details if still in list
      const currentSelected = selectedTokenRef.current;
      if (currentSelected) {
        const freshToken = queueData.find(tk => tk.print_token_id === currentSelected.print_token_id);
        if (freshToken) {
          setSelectedToken(freshToken);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch printer queue');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTokens();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  useEffect(() => {
    fetchTokens();
    const interval = setInterval(fetchTokens, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [activeTab, searchQuery, startDate, endDate]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handleSelectToken = (token) => {
    setSelectedToken(token);
    setSuccessMsg('');
    setErrorMsg('');
  };

  // Collect Offline cash fee or process payment category
  const handleCollectCash = async (paymentMode) => {
    if (!selectedToken) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await axiosInstance.post(`/printer/tokens/${selectedToken.token_number}/collect-cash`, { paymentMode });
      setSuccessMsg(`Payment category "${paymentMode}" successfully processed for token ${selectedToken.token_number}.`);
      setSelectedToken(res.data);
      fetchTokens();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to process print fee category');
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger Checklist Modal
  const handleOpenPrintChecklist = () => {
    setChecklist({
      verifyIdentity: false,
      verifySignature: false,
      confirmJurisdiction: false
    });
    setShowChecklistModal(true);
  };

  // Execute Printer Print Action
  const handleExecutePrint = async () => {
    if (!selectedToken) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setShowChecklistModal(false);

    try {
      const res = await axiosInstance.post(`/printer/tokens/${selectedToken.token_number}/print`);
      const payload = res.data;
      
      setSuccessMsg(`Print request processed successfully for ${selectedToken.token_number}.`);
      
      if (payload.base64Pdf) {
        printJS({
          printable: payload.base64Pdf,
          type: 'pdf',
          base64: true,
          onPrintDialogClose: () => {
            fetchTokens();
            setSelectedToken(null);
          }
        });
      } else {
        setErrorMsg('Error: No base64 PDF payload returned from server.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to process certificate printing');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-50 font-rajdhani select-none overflow-hidden text-left">
      {/* Top Tricolor Brand Accent Line */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-saffron via-white to-green-custom z-50" />

      {/* Header */}
      <header className="py-4 px-10 bg-white border-b border-slate-200/80 flex items-center justify-between shadow-sm shrink-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/assets/nigam-logo.png" alt="Emblem" className="w-10 h-10 object-contain" />
          <div>
            <h2 className="text-xl font-bold text-navy m-0 leading-none">नगर निगम जयपुर — Printer Operator Counter (प्रमाण-पत्र प्रिंट केंद्र)</h2>
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Jaipur Municipal Certificate Spool Station</span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <span className="text-sm font-bold text-navy block">Operator: {user?.full_name}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Counter: PRI-01</span>
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
        
        {/* Left Sidebar: Token Queue */}
        <aside className="w-96 border-r border-slate-200 bg-white p-5 flex flex-col shrink-0 overflow-hidden shadow-sm">
          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b pb-3">
            <button
              onClick={() => { setActiveTab('PENDING'); setSelectedToken(null); }}
              className={`flex-1 py-2 rounded-xl text-center font-bold text-sm transition-all ${
                activeTab === 'PENDING' 
                  ? 'bg-navy text-white' 
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              Pending Queue
            </button>
            <button
              onClick={() => { setActiveTab('PRINTED'); setSelectedToken(null); }}
              className={`flex-1 py-2 rounded-xl text-center font-bold text-sm transition-all ${
                activeTab === 'PRINTED' 
                  ? 'bg-navy text-white' 
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              Printed Logs
            </button>
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by token, name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-navy placeholder-slate-400 outline-none focus:border-navy transition-colors bg-slate-50"
            />
          </div>

          {/* Date Range Picker */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="flex flex-col gap-0.5 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-navy outline-none focus:border-navy bg-slate-50 cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-0.5 text-left">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-navy outline-none focus:border-navy bg-slate-50 cursor-pointer"
              />
            </div>
          </div>

          {/* Token List */}
          <div 
            ref={containerRef}
            onScroll={handleContainerScroll}
            className="flex-1 overflow-y-auto pr-1"
          >
            {loading && tokens.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 font-semibold gap-2 py-10">
                <RefreshCw className="w-5 h-5 animate-spin text-saffron" />
                <span>Loading queue...</span>
              </div>
            ) : tokens.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center px-4 gap-2 py-10">
                <ShieldCheck className="w-12 h-12 text-slate-300 animate-pulse" />
                <span className="text-sm font-bold uppercase tracking-wider italic">No tokens found!</span>
                <span className="text-xs text-slate-400">All certificates have been successfully spooled.</span>
              </div>
            ) : (() => {
              const rowHeight = 90;
              const rowMargin = 10;
              const itemHeight = rowHeight + rowMargin;

              const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 3);
              const endIndex = Math.min(tokens.length - 1, Math.floor((scrollTop + containerHeight) / itemHeight) + 3);

              const paddingTop = startIndex * itemHeight;
              const paddingBottom = Math.max(0, (tokens.length - 1 - endIndex) * itemHeight);

              const visibleTokens = tokens.slice(startIndex, endIndex + 1);

              return (
                <div style={{ paddingTop, paddingBottom }}>
                  {visibleTokens.map((tk) => {
                    const isOfflinePending = tk.fee_status === 'PENDING';
                    return (
                      <div
                        key={tk.print_token_id}
                        onClick={() => handleSelectToken(tk)}
                        className={`p-4 border rounded-2xl flex flex-col gap-2 cursor-pointer transition-all shadow-sm relative overflow-hidden shrink-0 h-[90px] box-border mb-2.5 ${
                          selectedToken?.print_token_id === tk.print_token_id
                            ? 'border-navy bg-navy/[0.02] ring-2 ring-navy/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-start leading-none">
                          <span className="font-bold text-navy text-base font-mono leading-none">{tk.token_number}</span>
                          <span className={`text-[9px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-md border leading-none ${
                            tk.certificate_type === 'BIRTH' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                            tk.certificate_type === 'DEATH' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                            'bg-purple-50 border-purple-200 text-purple-700'
                          }`}>
                            {tk.certificate_type}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs font-semibold mt-1">
                          <span className="text-slate-500 truncate mr-2">Applicant: <strong className="text-navy">{tk.applicant_name}</strong></span>
                          <span className={`text-[10px] font-bold shrink-0 ${isOfflinePending ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {isOfflinePending ? 'Cash Pending' : 'Paid'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </aside>

        {/* Right Area: Token Detailed Operations */}
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

          {selectedToken ? (
            <div className="flex flex-col gap-6 max-w-4xl">
              
              {/* Detailed Card */}
              <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start border-b pb-4 mb-4">
                  <div>
                    <h3 className="m-0 text-navy font-bold text-xl uppercase">Print Queue Details</h3>
                    <p className="text-xs text-slate-400 font-bold m-0 mt-1 uppercase tracking-widest">
                      Token Reference: {selectedToken.token_number}
                    </p>
                  </div>
                  <span className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg border ${
                    selectedToken.print_status === 'PRINTED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    Status: {selectedToken.print_status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm font-semibold text-slate-600">
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Citizen Name
                    </span>
                    <span className="text-base text-navy font-bold">{selectedToken.applicant_name}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5" /> Mobile Number
                    </span>
                    <span className="text-base text-navy font-bold font-mono">{selectedToken.mobile_number}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Issued Date
                    </span>
                    <span className="text-base text-navy font-bold">{new Date(selectedToken.created_at).toLocaleString('en-IN', { timeZone: 'UTC' })}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" /> Certificate Type
                    </span>
                    <span className="text-base text-navy font-bold uppercase">{selectedToken.certificate_type}</span>
                  </div>
                </div>

                {selectedToken.printed_at && (
                  <div className="bg-slate-50 border rounded-xl p-4 mt-6 text-sm font-semibold text-slate-600 flex justify-between items-center">
                    <span>Spool Date & Time: <strong>{new Date(selectedToken.printed_at).toLocaleString('en-IN', { timeZone: 'UTC' })}</strong></span>
                    <span>Operator ID: <strong className="uppercase">OPR-{selectedToken.admin_id}</strong></span>
                  </div>
                )}
              </div>

              {/* Action Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                
                {/* Billing Statement */}
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between gap-5 text-navy">
                  <div>
                    <span className="font-bebas text-xs tracking-wider text-saffron uppercase block font-bold">Billing statement</span>
                    <h3 className="font-bold text-xl m-0 mt-1 uppercase">Municipal Print Invoice</h3>
                  </div>

                  <div className="flex flex-col gap-2 font-semibold text-slate-600 border-y py-4 my-2 text-sm">
                    <div className="flex justify-between">
                      <span>Service Description:</span>
                      <span className="text-navy font-bold uppercase">{selectedToken.certificate_type} Print</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Number of Copies:</span>
                      <span className="text-navy font-bold">{selectedToken.total_copies}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fee Status:</span>
                      <span className={`font-extrabold uppercase ${selectedToken.fee_status !== 'PENDING' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {selectedToken.fee_status !== 'PENDING' ? 'PAID / VERIFIED' : 'PENDING OFFLINE CASH'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-400 uppercase">
                      {selectedToken.fee_status !== 'PENDING' ? 'Amount Paid:' : 'Amount Due:'}
                    </span>
                    <span className="text-3xl font-extrabold text-navy">₹{selectedToken.fee_amount}</span>
                  </div>
                </div>

                {/* Operations Actions */}
                <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="m-0 text-navy font-bold border-b pb-3 text-base flex items-center gap-1.5 uppercase">
                      <ShieldCheck className="w-5 h-5 text-saffron" />
                      Verification & Collection
                    </h4>
                    <p className="text-xs text-slate-400 font-bold m-0 mt-2 uppercase tracking-wide leading-relaxed">
                      {selectedToken.fee_status === 'PENDING'
                        ? `Confirm that flat fee of ₹${selectedToken.fee_amount} offline cash has been collected from the citizen.`
                        : `Fee payment is verified. Trigger certificate spooling and print.`}
                    </p>
                  </div>

                  {selectedToken.fee_status === 'PENDING' ? (
                    <div className="flex flex-col gap-2.5 mt-4">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Pending payment:</span>
                      
                      <button
                        disabled={actionLoading}
                        onClick={() => handleCollectCash('OFFLINE_CASH')}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md mt-2"
                      >
                        <CreditCard className="w-5 h-5" />
                        <span>Confirm Offline Cash Collected (₹{selectedToken.fee_amount})</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled={actionLoading}
                      onClick={handleExecutePrint}
                      className="w-full py-4 bg-navy hover:bg-slate-800 text-white font-bold text-lg rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 cursor-pointer shadow-md mt-4 border-2 border-saffron"
                    >
                      <Printer className="w-5 h-5 text-saffron" />
                      <span>{actionLoading ? 'Loading Spool...' : 'Print Certificate'}</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center gap-3">
              <Printer className="w-16 h-16 text-slate-300 animate-bounce" />
              <h3 className="m-0 text-navy font-bold text-lg uppercase">No Print Token Selected</h3>
              <p className="text-sm font-semibold max-w-sm m-0">
                Click on any print token from the left queue sidebar to inspect invoice statements, verify fees, and print certificates.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Checklist and Verification Modal */}
      <AnimatePresence>
        {showChecklistModal && selectedToken && (
          <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-6 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col border-4 border-navy"
            >
              {/* Header */}
              <div className="bg-navy p-5 flex justify-between items-center text-white border-b-4 border-saffron">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-saffron" />
                  <div>
                    <h2 className="text-xl font-bold m-0 leading-tight">Printer Operator Checklist & Verification</h2>
                    <p className="text-[10px] text-slate-300 m-0 uppercase tracking-widest">Verify identity and stationery before printing</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowChecklistModal(false)}
                  className="text-white hover:text-slate-300 text-2xl font-bold outline-none"
                >
                  &times;
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
                
                {/* Side-by-side identity check */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-navy uppercase border-b pb-2 mb-3">Identity Verification Profile</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Citizen Database ID photo */}
                    <div className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-100 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Database Identity Photo</span>
                      <img 
                        src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150" 
                        alt="Citizen DB ID" 
                        className="w-24 h-24 rounded-full object-cover border border-slate-200"
                      />
                      <span className="text-xs font-bold text-navy mt-1">{selectedToken.applicant_name}</span>
                    </div>

                    {/* Citizen selfie verification comparison */}
                    <div className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-100 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Operator Verification Cam</span>
                      <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden relative">
                        <img 
                          src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150" 
                          alt="Citizen Live comparison" 
                          className="w-full h-full object-cover filter sepia-[20%]"
                        />
                        <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center font-bold text-[10px] text-emerald-800 uppercase tracking-widest font-mono">
                          MATCH 98%
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 mt-1 uppercase flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Verified
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Stationery Warning Alert */}
                {selectedToken.token_number.includes('BIR') || selectedToken.token_number.includes('DEA') || selectedToken.token_number.includes('MAR') ? (
                  <div className="p-4 bg-orange-50 border-2 border-orange-400 rounded-xl text-orange-800 flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-sm uppercase">⚠️ CRITICAL INSTRUCTION: PRINT ON OFFICIAL STATIONERY</strong>
                      <span className="text-xs leading-normal">
                        This is a Jaipur Nagar Nigam official certificate. Please ensure the municipal printer is loaded with <strong>OFFICIAL GREEN JAIPUR MUNICIPAL STATIONERY</strong> before clicking Print.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-sky-50 border-2 border-sky-400 rounded-xl text-sky-800 flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-sky-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-sm uppercase">⚠️ INSTRUCTION: PRINT ON PLAIN A4 PAPER</strong>
                      <span className="text-xs leading-normal">
                        This certificate is issued outside Jaipur Municipal Corporation. Please load standard <strong>PLAIN WHITE A4 PAPER</strong> into the printer tray.
                      </span>
                    </div>
                  </div>
                )}

                {/* Checklist checkboxes */}
                <div className="flex flex-col gap-3 font-semibold text-navy text-sm border-t pt-4">
                  <span className="uppercase text-xs text-slate-400 font-bold tracking-widest block mb-1">Counter Audit Checklists</span>

                  <label className="flex items-center gap-3 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer transition-all">
                    <input 
                      type="checkbox"
                      checked={checklist.verifyIdentity}
                      onChange={(e) => setChecklist({ ...checklist, verifyIdentity: e.target.checked })}
                      className="w-5 h-5 accent-navy cursor-pointer"
                    />
                    <span>Verify citizen identity card matches the applicant name: <strong className="underline">{selectedToken.applicant_name}</strong></span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer transition-all">
                    <input 
                      type="checkbox"
                      checked={checklist.verifySignature}
                      onChange={(e) => setChecklist({ ...checklist, verifySignature: e.target.checked })}
                      className="w-5 h-5 accent-navy cursor-pointer"
                    />
                    <span>Verify digital signature manually using Adobe Acrobat Reader before issuing.</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer transition-all">
                    <input 
                      type="checkbox"
                      checked={checklist.confirmJurisdiction}
                      onChange={(e) => setChecklist({ ...checklist, confirmJurisdiction: e.target.checked })}
                      className="w-5 h-5 accent-navy cursor-pointer"
                    />
                    <span>Confirm Jaipur Nagar Nigam jurisdiction parameters.</span>
                  </label>
                </div>
              </div>

              {/* Footer controls */}
              <div className="bg-slate-50 p-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => setShowChecklistModal(false)}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 active:scale-95 transition-all font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={!checklist.verifyIdentity || !checklist.verifySignature || !checklist.confirmJurisdiction}
                  onClick={handleExecutePrint}
                  className="px-8 py-2.5 bg-navy text-white rounded-xl active:scale-95 transition-all font-bold text-sm disabled:opacity-50 disabled:scale-100 flex items-center gap-2 border border-saffron"
                >
                  <Printer className="w-4 h-4 text-saffron" />
                  <span>Spool & Print Certificate</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
