import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ScheduleForm from './pages/ScheduleForm';
import Accounts from './pages/Accounts';
import Callback from './pages/Callback';
import Login from './pages/Login';
import { TermsOfService, PrivacyPolicy } from './pages/Legal';

const isAuthenticated = (): boolean => {
  return sessionStorage.getItem('admin_authenticated') === 'true';
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages - no layout */}
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/auth/callback" element={<Callback />} />
        <Route path="/login" element={<Login />} />

        {/* Protected admin pages - with layout */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/schedules/new" element={<ScheduleForm />} />
          <Route path="/schedules/:id/edit" element={<ScheduleForm />} />
          <Route path="/accounts" element={<Accounts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
