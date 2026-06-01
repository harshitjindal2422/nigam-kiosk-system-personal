import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore.js';
import { useNavigate } from 'react-router-dom';
import { LogOut, Activity, Receipt, Printer, Landmark, LayoutDashboard, Database, ShieldAlert, Users, Maximize2, Minimize2 } from 'lucide-react';
import DatabaseViewer from '../components/admin/DatabaseViewer.jsx';
import CounterOperations from '../components/admin/CounterOperations.jsx';
import OperatorManager from '../components/admin/OperatorManager.jsx';

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [metricsData, setMetricsData] = useState({
    printedCertificates: 0,
    activeTokens: 0,
    collectedRevenue: 0,
    systemDiagnostics: 'ONLINE'
  });
  const [logs, setLogs] = useState([]);
  const [isMaximized, setIsMaximized] = useState(false);

  const standardLogsContainerRef = useRef(null);
  const maximizedLogsContainerRef = useRef(null);
  const isTailingStandardRef = useRef(true);
  const isTailingMaximizedRef = useRef(true);

  // Fetch metrics data
  useEffect(() => {
    if (activeTab === 'overview') {
      axios.get('http://localhost:5000/api/v1/admin/metrics', { withCredentials: true })
        .then(res => {
          if (res.data?.metrics) setMetricsData(res.data.metrics);
        })
        .catch(err => console.error("Error fetching metrics:", err));
    }
  }, [activeTab]);

  // Fetch realtime backend logs
  useEffect(() => {
    let intervalId;
    if (activeTab === 'overview') {
      const fetchLogs = () => {
        axios.get('http://localhost:5000/api/v1/admin/logs', { withCredentials: true })
          .then(res => {
            if (res.data?.logs) {
              setLogs(res.data.logs);
            }
          })
          .catch(err => console.error("Error fetching backend logs:", err));
      };

      fetchLogs();
      intervalId = setInterval(fetchLogs, 3000); // Poll every 3 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTab]);

  // Scroll event handlers to detect manual scroll up and toggle tailing
  const handleStandardScroll = (e) => {
    const container = e.currentTarget;
    const threshold = 15; // pixels tolerance
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + threshold;
    isTailingStandardRef.current = isAtBottom;
  };

  const handleMaximizedScroll = (e) => {
    const container = e.currentTarget;
    const threshold = 15; // pixels tolerance
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + threshold;
    isTailingMaximizedRef.current = isAtBottom;
  };

  // Smart Auto-Scroll Tailing for logs
  useEffect(() => {
    const timerId = setTimeout(() => {
      // Standard view smart scroll
      const stdContainer = standardLogsContainerRef.current;
      if (stdContainer && isTailingStandardRef.current) {
        stdContainer.scrollTo({
          top: stdContainer.scrollHeight,
          behavior: 'smooth'
        });
      }

      // Maximized view smart scroll
      const maxContainer = maximizedLogsContainerRef.current;
      if (maxContainer && isTailingMaximizedRef.current) {
        maxContainer.scrollTo({
          top: maxContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100);

    return () => clearTimeout(timerId);
  }, [logs, isMaximized]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const metrics = [
    { title: 'Printed Certificates', count: metricsData.printedCertificates.toString(), icon: Printer, color: 'text-orange-500 bg-orange-50' },
    { title: 'Active Correction Tokens', count: metricsData.activeTokens.toString(), icon: Receipt, color: 'text-green-500 bg-green-50' },
    { title: 'Collected Kiosk Revenue', count: `₹${metricsData.collectedRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: Landmark, color: 'text-blue-500 bg-blue-50' },
    { title: 'System Diagnostics', count: metricsData.systemDiagnostics, icon: Activity, color: 'text-indigo-500 bg-indigo-50' },
  ];

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-50 font-rajdhani select-none">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-saffron via-white to-green-custom" />

      {/* Header bar */}
      <header className="py-4 px-10 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/assets/nigam-logo.png" alt="Emblem" className="w-10 h-10 object-contain" />
          <div>
            <h2 className="text-xl font-bold text-navy m-0 leading-none">नगर निगम — नागरिक सेवा कियोस्क</h2>
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Administrative Management Portal</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition-transform cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-bold">Logout</span>
        </button>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 p-8 overflow-y-auto flex flex-col gap-8">
        
        {/* Profile Welcome banner */}
        <div className="p-6 bg-navy text-white rounded-2xl shadow-sm text-left">
          <h1 className="text-2xl font-bold m-0 leading-tight">Welcome, {user?.full_name || 'Administrator'}</h1>
          <p className="text-slate-300 text-sm font-semibold tracking-wider mt-1 m-0">
            Current system time: {new Date().toLocaleDateString()} · Terminal Unit: Kiosk-01
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b border-slate-200 pb-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-6 py-3 font-bold rounded-xl transition-colors ${activeTab === 'overview' ? 'bg-navy text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
          >
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-6 py-3 font-bold rounded-xl transition-colors ${activeTab === 'database' ? 'bg-green-custom text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
          >
            <Database className="w-5 h-5" /> Database Viewer
          </button>
          <button 
            onClick={() => setActiveTab('counter_ops')}
            className={`flex items-center gap-2 px-6 py-3 font-bold rounded-xl transition-colors ${activeTab === 'counter_ops' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
          >
            <ShieldAlert className="w-5 h-5" /> Counter Operations
          </button>
          {user?.role === 'SUPER_ADMIN' && (
            <button 
              onClick={() => setActiveTab('operators')}
              className={`flex items-center gap-2 px-6 py-3 font-bold rounded-xl transition-colors ${activeTab === 'operators' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
            >
              <Users className="w-5 h-5" /> Manage Operators
            </button>
          )}
        </div>

        {activeTab === 'overview' && (
          <>
            {/* 📊 Core metrics cards panel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {metrics.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="text-left flex flex-col gap-1">
                      <span className="text-slate-400 font-semibold uppercase text-xs tracking-wider">{card.title}</span>
                      <span className="text-3xl font-bold text-navy leading-none mt-1">{card.count}</span>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom log outputs preview */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4 text-left">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="text-lg font-bold text-navy m-0 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-saffron" />
                  <span>Live Diagnostic Logs Stream</span>
                </h3>
                <button
                  onClick={() => setIsMaximized(true)}
                  className="px-3.5 py-1.5 rounded-xl text-slate-500 hover:text-navy hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-sm font-bold active:scale-95 cursor-pointer border border-slate-200 shadow-sm bg-white"
                >
                  <Maximize2 className="w-4 h-4 text-saffron" />
                  <span>Maximize Logs</span>
                </button>
              </div>
              <div 
                ref={standardLogsContainerRef}
                onScroll={handleStandardScroll}
                className="bg-slate-900 text-slate-300 p-4 rounded-xl font-mono text-xs overflow-y-auto max-h-[300px] leading-relaxed flex flex-col gap-2 shadow-inner"
              >
                {logs.length > 0 ? (
                  logs.map((log, idx) => {
                    let textClass = "text-slate-300";
                    if (log.level === 'ERROR') {
                      textClass = "text-red-400 font-bold";
                    } else if (log.category === 'payments') {
                      textClass = "text-green-400";
                    } else if (log.category === 'printers') {
                      textClass = "text-blue-400";
                    } else if (log.category === 'sessions') {
                      textClass = "text-amber-400";
                    }

                    return (
                      <div key={idx} className={`${textClass} whitespace-pre-wrap`}>
                        [{log.timestamp}] [{log.category}] [{log.level}]: {log.message}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-slate-500 italic text-center py-4">No diagnostic logs found for today.</div>
                )}
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'database' && <DatabaseViewer />}

        {activeTab === 'counter_ops' && <CounterOperations />}

        {activeTab === 'operators' && user?.role === 'SUPER_ADMIN' && <OperatorManager />}

      </main>

      {/* Maximized Logs Full Screen Overlay */}
      {isMaximized && (
        <div className="fixed inset-0 bg-slate-950 z-[9999] flex flex-col w-screen h-screen overflow-hidden">
          {/* Header */}
          <div className="bg-navy p-5 flex justify-between items-center text-white border-b-4 border-saffron select-none">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-saffron animate-pulse" />
              <div>
                <h2 className="text-2xl font-bold m-0 leading-tight">Live Diagnostic Logs Stream (Maximized Console)</h2>
                <p className="text-xs text-slate-300 font-rajdhani tracking-widest uppercase m-0 leading-none mt-1">
                  Realtime server activity & hardware events console
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsMaximized(false)} 
              className="px-4 py-2 rounded-xl border border-slate-700 bg-navy hover:bg-slate-800 active:scale-95 transition-transform cursor-pointer flex items-center gap-1.5 font-bold text-sm text-slate-300 hover:text-white"
            >
              <Minimize2 className="w-5 h-5 text-saffron" />
              <span>Minimize Console</span>
            </button>
          </div>

          {/* Console Body */}
          <div 
            ref={maximizedLogsContainerRef}
            onScroll={handleMaximizedScroll}
            className="flex-1 bg-slate-950 p-8 overflow-y-auto leading-relaxed flex flex-col gap-2 font-mono text-sm text-left shadow-inner select-text"
          >
            {logs.length > 0 ? (
              logs.map((log, idx) => {
                let textClass = "text-slate-300";
                if (log.level === 'ERROR') {
                  textClass = "text-red-400 font-bold";
                } else if (log.category === 'payments') {
                  textClass = "text-green-400";
                } else if (log.category === 'printers') {
                  textClass = "text-blue-400";
                } else if (log.category === 'sessions') {
                  textClass = "text-amber-400";
                }

                return (
                  <div key={idx} className={`${textClass} whitespace-pre-wrap`}>
                    [{log.timestamp}] [{log.category}] [{log.level}]: {log.message}
                  </div>
                );
              })
            ) : (
              <div className="text-slate-500 italic text-center py-20">No diagnostic logs found for today.</div>
            )}
          </div>
          
          {/* Console Footer */}
          <div className="bg-slate-900 px-8 py-4 border-t border-slate-800 flex justify-between items-center text-xs font-semibold text-slate-400 select-none">
            <span className="uppercase tracking-widest font-mono">active connection: server:5000/api/v1/admin/logs</span>
            <span className="flex items-center gap-1.5 text-emerald-500 font-bold font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              POLLING ACTIVE
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
