import React from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useNavigate } from 'react-router-dom';
import { LogOut, Activity, Receipt, Printer, Landmark } from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Mock static reports for visual fidelity
  const metrics = [
    { title: 'Printed Certificates', count: '142', icon: Printer, color: 'text-orange-500 bg-orange-50' },
    { title: 'Active Correction Tokens', count: '28', icon: Receipt, color: 'text-green-500 bg-green-50' },
    { title: 'Collected Kiosk Revenue', count: '₹3,400.00', icon: Landmark, color: 'text-blue-500 bg-blue-50' },
    { title: 'System Diagnostics', count: 'ONLINE', icon: Activity, color: 'text-indigo-500 bg-indigo-50' },
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
          <h3 className="text-lg font-bold text-navy border-b pb-2 m-0">Live Diagnostic Logs Stream</h3>
          <div className="bg-slate-900 text-slate-300 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed flex flex-col gap-2">
            <div>[2026-05-19 12:45:01] [system] [INFO]: Connected to PostgreSQL database via Prisma...</div>
            <div>[2026-05-19 12:45:02] [system] [INFO]: Database connection established successfully!</div>
            <div>[2026-05-19 12:45:03] [system] [INFO]: Server running in development mode on port 5000</div>
            <div>[2026-05-19 12:46:12] [sessions] [INFO]: Touch screen active. Session ID: SES-9812-OK</div>
            <div className="text-green-400">[2026-05-19 12:46:44] [payments] [INFO]: 💳 Simulated payment successful for TKN-001. Amount: ₹20.00</div>
            <div className="text-blue-400">[2026-05-19 12:46:45] [printers] [INFO]: 🖨️ Thermal printer generated receipt TKN-001 at Counter 1.</div>
          </div>
        </div>

      </main>
    </div>
  );
}
