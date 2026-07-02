import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import SignupPage from './components/SignupPage';
import LoginPage from './components/LoginPage';
import ProfilePage from './components/ProfilePage';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import AdminRoute from './components/AdminRoute';
import RecruiterDashboard from './components/RecruiterDashboard';
import AnalyticsPage from './components/AnalyticsPage';
import { App } from './App';

// ── Auth helpers ─────────────────────────────────────────────────────────────
const getUser = () => {
  try { return JSON.parse(localStorage.getItem('tinclo_current_user') || 'null'); } catch { return null; }
};

// Redirect admins away from regular routes
const UserOnlyRoute = ({ children }) => {
  const user = getUser();
  if (user?.role === 'admin' || localStorage.getItem('tinclo_admin_session') === 'true') return <Navigate to="/admin" replace />;
  return children;
};

// Require any authenticated user
const AuthRoute = ({ children }) => {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Require recruiter or admin role
const RecruiterRoute = ({ children }) => {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'recruiter' && user.role !== 'admin') return <Navigate to="/jobs" replace />;
  return children;
};

const AppRouter = () => (
  <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes>
      <Route path="/"            element={<LandingPage />} />
      <Route path="/signup"      element={<SignupPage />} />
      <Route path="/login"       element={<LoginPage />} />
      <Route path="/jobs"        element={<UserOnlyRoute><App /></UserOnlyRoute>} />
      <Route path="/profile"     element={<AuthRoute><ProfilePage /></AuthRoute>} />
      <Route path="/analytics"   element={<AuthRoute><UserOnlyRoute><AnalyticsPage /></UserOnlyRoute></AuthRoute>} />
      <Route path="/recruiter"   element={<RecruiterRoute><RecruiterDashboard /></RecruiterRoute>} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin"       element={<AdminRoute><AdminPanel /></AdminRoute>} />
    </Routes>
  </Router>
);

export default AppRouter;
