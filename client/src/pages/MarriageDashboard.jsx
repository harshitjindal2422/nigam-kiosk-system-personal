import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useAdminStore } from '../store/adminStore.js';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, Layers, RefreshCw, Heart } from 'lucide-react';
import MarriageOperations from '../components/admin/MarriageOperations.jsx';

export default function MarriageDashboard() {
  const { user, logout } = useAuthStore();
  const { queue, fetchActiveQueue, setProcessingToken, activeTokenProcess, loading } = useAdminStore();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 1. Initial fetch on mount
  useEffect(() => {
    fetchActiveQueue();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Poll only when idle
  useEffect(() => {
    if (!activeTokenProcess) {
      const timer = setInterval(() => {
        fetchActiveQueue(true);
      }, 10000);
      return () => clearInterval(timer);
    }
  }, [activeTokenProcess]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchActiveQueue();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handleSelectToken = (tokenNum) => {
    setProcessingToken(tokenNum);
  };

  // Filter queue for marriage department only (TKN-MAR)
  const marriageQueue = queue.filter(tokenNum => tokenNum.includes('MAR'));

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-100 font-rajdhani select-none overflow-hidden">
      {/* Brand Tricolor Accent */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-saffron via-white to-green-custom z-50" />

      {/* Dedicated Counter Header */}
      <header className="py-4 px-6 md:px-10 bg-white border-b border-slate-200/80 flex items-center justify-between shadow-sm shrink-0 z-10">
        <div className="flex items-center gap-3">
          <img src="/assets/nigam-logo.png" alt="Emblem" className="w-10 h-10 object-contain" />
          <div>
            <h2 className="text-xl font-bold text-navy m-0 leading-none">नगर निगम जयपुर — विवाह काउंटर पटल</h2>
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Marriage Operator Processing Terminal</span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <span className="text-sm font-bold text-navy block">Operator: {user?.full_name || 'Marriage Counter Staff'}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Terminal: Marriage Desk-01</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer font-bold disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 text-purple-600 ${isRefreshing ? 'animate-spin' : ''}`} />
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

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Dynamic Token Processor */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto bg-slate-50 flex flex-col gap-5">
          <MarriageOperations />
        </main>

        {/* Right Side: Live Waiting Queue Sidebar */}
        <aside className="w-72 border-l border-slate-200 bg-white p-5 flex flex-col shrink-0 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h3 className="m-0 text-navy font-bold flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-purple-600" />
              <span>Marriage Queue</span>
            </h3>
            <span className="bg-purple-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {marriageQueue.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
            {marriageQueue.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center px-4 gap-2">
                <Layers className="w-8 h-8 text-slate-300 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider italic">No citizens waiting</span>
              </div>
            ) : (
              marriageQueue.map((tokenNum, idx) => {
                const isServing = activeTokenProcess?.tokenNumber === tokenNum;

                return (
                  <div 
                    key={idx} 
                    onClick={() => handleSelectToken(tokenNum)}
                    className={`p-3 border rounded-xl flex items-center justify-between shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-98 ${
                      isServing
                        ? 'border-purple-600 bg-purple-50/10 ring-2 ring-purple-600/10'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex flex-col text-left gap-0.5">
                      <span className="font-bold text-navy text-base font-mono">{tokenNum}</span>
                      <span className="text-[9px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-md border w-fit bg-purple-50 border-purple-200 text-purple-700">
                        Marriage
                      </span>
                    </div>
                    <div className="text-right flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Position</span>
                      <span className="text-lg font-extrabold text-slate-700 leading-none mt-1">#{idx + 1}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}
