import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import KioskLayout from '../layouts/KioskLayout.jsx';
import LanguageSelection from '../pages/LanguageSelection.jsx';
import Home from '../pages/Home.jsx';
import PrintSelection from '../pages/PrintSelection.jsx';
import CorrectionSelection from '../pages/CorrectionSelection.jsx';
import BirthCorrection from '../pages/BirthCorrection.jsx';
import DeathCorrection from '../pages/DeathCorrection.jsx';
import ServiceSelection from '../pages/ServiceSelection.jsx';
import TokenGeneration from '../pages/TokenGeneration.jsx';
import AdminLogin from '../pages/AdminLogin.jsx';
import AdminDashboard from '../pages/AdminDashboard.jsx';
import CounterDashboard from '../pages/CounterDashboard.jsx';
import MarriageDashboard from '../pages/MarriageDashboard.jsx';
import CheckerDashboard from '../pages/CheckerDashboard.jsx';
import ApprovalDashboard from '../pages/ApprovalDashboard.jsx';
import PrinterDashboard from '../pages/PrinterDashboard.jsx';

// 🛡️ Protected Route Guard for Administrative views
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, checkAuth, loading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Enforce role-based checks for administrative routing
  if (user && allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'COUNTER_OPERATOR') {
      return <Navigate to="/counter/dashboard" replace />;
    } else if (user.role === 'MARRIAGE_OPERATOR') {
      return <Navigate to="/marriage/dashboard" replace />;
    } else if (user.role === 'CHECKER_OPERATOR') {
      return <Navigate to="/checker/dashboard" replace />;
    } else if (user.role === 'APPROVAL_OPERATOR') {
      return <Navigate to="/approval/dashboard" replace />;
    } else if (user.role === 'PRINTER_OPERATOR') {
      return <Navigate to="/printer/dashboard" replace />;
    } else if (user.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/admin/login" replace />;
    }
  }

  return children;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 📱 Citizen Kiosk View Paths */}
        <Route path="/" element={<KioskLayout />}>
          <Route index element={<LanguageSelection />} />
          <Route path="home" element={<Home />} />
          <Route path="services" element={<ServiceSelection />} />
          <Route path="token-generation" element={<TokenGeneration />} />
          <Route path="print" element={<PrintSelection />} />
          <Route path="correction" element={<CorrectionSelection />} />
          <Route path="correction/birth" element={<BirthCorrection />} />
          <Route path="correction/death" element={<DeathCorrection />} />
        </Route>

        {/* 🔒 Administrative Panel View Paths */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/counter/dashboard"
          element={
            <ProtectedRoute allowedRoles={['COUNTER_OPERATOR', 'SUPER_ADMIN']}>
              <CounterDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marriage/dashboard"
          element={
            <ProtectedRoute allowedRoles={['MARRIAGE_OPERATOR', 'SUPER_ADMIN']}>
              <MarriageDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checker/dashboard"
          element={
            <ProtectedRoute allowedRoles={['CHECKER_OPERATOR', 'SUPER_ADMIN']}>
              <CheckerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/approval/dashboard"
          element={
            <ProtectedRoute allowedRoles={['APPROVAL_OPERATOR', 'SUPER_ADMIN']}>
              <ApprovalDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/printer/dashboard"
          element={
            <ProtectedRoute allowedRoles={['PRINTER_OPERATOR', 'SUPER_ADMIN']}>
              <PrinterDashboard />
            </ProtectedRoute>
          }
        />

        {/* 🚨 Catchall fallback redirection */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
