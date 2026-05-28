import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  
  const { login, loading, error: authError } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    const result = await login(email, password);
    if (result.success) {
      if (result.role === 'COUNTER_OPERATOR') {
        navigate('/counter/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } else {
      setLocalError(result.message);
    }
  };

  const activeError = localError || authError;

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-slate-100 select-none">
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-saffron via-white to-green-custom" />
      
      <div className="w-[90%] max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-1">
          <img src="/assets/nigam-logo.png" alt="Emblem" className="w-16 h-16 object-contain mb-2" />
          <h2 className="font-hindi text-2xl font-bold text-navy m-0">नगर निगम — कियोस्क एडमिन</h2>
          <span className="font-bebas text-lg tracking-wider text-saffron-dark uppercase font-semibold">Admin Portal Login</span>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4 font-rajdhani">
          {activeError && (
            <div className="p-3 bg-red-100 text-red-700 rounded-xl text-sm font-bold leading-relaxed">
              {activeError}
            </div>
          )}
          
          <div className="flex flex-col text-left gap-1">
            <label className="text-sm font-bold text-navy">Email Address / ईमेल आईडी</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@nagarnigam.gov.in"
              required
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 focus:border-saffron disabled:bg-slate-50 transition-colors"
            />
          </div>

          <div className="flex flex-col text-left gap-1">
            <label className="text-sm font-bold text-navy">Password / पासवर्ड</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-800 focus:border-saffron disabled:bg-slate-50 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-navy text-white font-bold text-lg rounded-xl shadow-md active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100 cursor-pointer"
          >
            {loading ? 'Logging In...' : 'Sign In / लॉगिन करें'}
          </button>
        </form>
      </div>
    </div>
  );
}
