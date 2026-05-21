import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import KioskLayout from '../layouts/KioskLayout.jsx';
import Home from '../pages/Home.jsx';
import CorrectionSelection from '../pages/CorrectionSelection.jsx';
import BirthCorrection from '../pages/BirthCorrection.jsx';
import DeathCorrection from '../pages/DeathCorrection.jsx';
import AdminLogin from '../pages/AdminLogin.jsx';
import AdminDashboard from '../pages/AdminDashboard.jsx';

// 🛡️ Protected Route Guard for Administrative views
function ProtectedRoute({ children }) {
  const { isAuthenticated, checkAuth, loading } = useAuthStore();

  useEffect(() => {
    // Perform session verification checks against backend on mount
    checkAuth();
  }, [checkAuth]);

  if (loading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50 z-50">
        <div className="w-12 h-12 border-4 border-saffron border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-bebas text-xl text-navy tracking-wider uppercase">Verifying Admin Session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 📱 Citizen Kiosk View Paths */}
        <Route path="/" element={<KioskLayout />}>
          <Route index element={<Home />} />
          <Route path="correction" element={<CorrectionSelection />} />
          <Route path="correction/birth" element={<BirthCorrection />} />
          <Route path="correction/death" element={<DeathCorrection />} />
        </Route>

        {/* 🔒 Administrative Panel View Paths */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🚨 Catchall fallback redirection */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
