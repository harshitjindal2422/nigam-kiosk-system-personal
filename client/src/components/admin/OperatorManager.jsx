import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { Users, Plus, ShieldCheck, Mail, Lock, User, Monitor, Eye, EyeOff } from 'lucide-react';

export default function OperatorManager() {
  const { operators, registerOperator } = useAuthStore();
  
  // Registration Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [assignedCounter, setAssignedCounter] = useState('Counter 1');
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPasswordMap, setShowPasswordMap] = useState({});

  const handleRegister = (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMsg("All fields are required!");
      return;
    }

    // Check if operator email already exists
    const duplicate = operators.some(op => op.email.toLowerCase() === email.toLowerCase());
    if (duplicate) {
      setErrorMsg("An operator with this email address already exists!");
      return;
    }

    registerOperator({
      fullName,
      email,
      password,
      assignedCounter
    });

    setSuccessMsg(`Operator "${fullName}" successfully registered! They can now log in.`);
    setFullName('');
    setEmail('');
    setPassword('');
    setAssignedCounter('Counter 1');
    
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const togglePasswordVisibility = (opId) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [opId]: !prev[opId]
    }));
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col font-rajdhani text-left">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-navy m-0 flex items-center gap-2">
            <Users className="w-6 h-6 text-saffron" />
            Counter Operator Profiles Registry (ऑपरेटर प्रबंधन)
          </h2>
          <p className="text-xs font-bold text-slate-400 m-0 mt-1 uppercase tracking-widest leading-none">
            view, assign counter terminals, and spawn new operator credentials
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Column 1 & 2: Registered Operators List */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h3 className="text-base font-bold text-navy uppercase tracking-wider my-0">
            Active Registered Operators ({operators.length})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {operators.map((op) => (
              <div 
                key={op.id}
                className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-navy" />
                
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy text-lg leading-none">{op.full_name}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{op.id}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold mt-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{op.email}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-xs border-t border-slate-200/50 pt-2.5 mt-1 font-semibold text-slate-500">
                  <div className="flex justify-between items-center">
                    <span>Counter Station:</span>
                    <span className="text-navy font-bold">{op.assignedCounter}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span>Account Key:</span>
                    <div className="flex items-center gap-1 text-navy font-mono font-bold">
                      <span>{showPasswordMap[op.id] ? op.password : '••••••••'}</span>
                      <button 
                        onClick={() => togglePasswordVisibility(op.id)}
                        className="text-slate-400 hover:text-slate-600 transition-colors ml-1 cursor-pointer"
                      >
                        {showPasswordMap[op.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Register New Operator Form */}
        <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl shadow-sm flex flex-col gap-4">
          <div>
            <h3 className="m-0 text-navy font-bold text-lg flex items-center gap-1.5 uppercase">
              <Plus className="w-5 h-5 text-saffron" />
              Register New Operator
            </h3>
            <p className="text-xs text-slate-400 font-bold m-0 mt-1 uppercase tracking-widest">
              creates a login credential immediately
            </p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4 text-sm font-semibold text-slate-600">
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold leading-normal">
                {successMsg}
              </div>
            )}
            
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl font-bold leading-normal">
                {errorMsg}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-navy">
                <User className="w-4 h-4 text-slate-400" />
                <span>Full Name (पूरा नाम)</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Chandra"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="p-2.5 border rounded-xl bg-white text-navy font-bold focus:border-navy outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-navy">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>Email Address (ईमेल आईडी)</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. ramesh@nagarnigam.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                className="p-2.5 border rounded-xl bg-white text-navy font-bold focus:border-navy outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-navy">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Password (पासवर्ड)</span>
              </label>
              <input
                type="password"
                required
                placeholder="e.g. Operator@123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="p-2.5 border rounded-xl bg-white text-navy font-bold focus:border-navy outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-navy">
                <Monitor className="w-4 h-4 text-slate-400" />
                <span>Assigned Counter (काउंटर स्टेशन)</span>
              </label>
              <select
                value={assignedCounter}
                onChange={(e) => setAssignedCounter(e.target.value)}
                className="p-2.5 border rounded-xl bg-white text-navy font-bold focus:border-navy outline-none"
              >
                <option value="Counter 1">Counter 1 (काउंटर १)</option>
                <option value="Counter 2">Counter 2 (काउंटर २)</option>
                <option value="Counter 3">Counter 3 (काउंटर ३)</option>
                <option value="Counter 4">Counter 4 (काउंटर ४)</option>
                <option value="Counter 5">Counter 5 (काउंटर ५)</option>
              </select>
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-3 bg-navy hover:bg-slate-800 text-white font-bold text-md rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-transform"
            >
              <ShieldCheck className="w-4 h-4 text-saffron" />
              <span>Register Operator</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
