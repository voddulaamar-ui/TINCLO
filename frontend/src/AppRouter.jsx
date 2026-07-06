import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// ── Lazy-loaded page components (route-based code splitting) ─────────────────
const LandingPage       = lazy(() => import('./components/LandingPage'));
const SignupPage        = lazy(() => import('./components/SignupPage'));
const LoginPage         = lazy(() => import('./components/LoginPage'));
const ProfilePage       = lazy(() => import('./components/ProfilePage'));
const AdminPanel        = lazy(() => import('./components/AdminPanel'));
const AdminLogin        = lazy(() => import('./components/AdminLogin'));
const RecruiterDashboard= lazy(() => import('./components/RecruiterDashboard'));
const AnalyticsPage     = lazy(() => import('./components/AnalyticsPage'));
const SavedJobsPage     = lazy(() => import('./components/SavedJobsPage'));
const CandidateDashboard= lazy(() => import('./components/CandidateDashboard'));
const CompanyPage       = lazy(() => import('./components/CompanyPage'));
const CompaniesListPage = lazy(() => import('./components/CompaniesListPage'));
const JobDetailPage     = lazy(() => import('./components/JobDetailPage'));
const AppMain           = lazy(() => import('./App').then(m => ({ default: m.App })));
const CareerDnaPage     = lazy(() => import('./components/CareerDnaPage'));
const CareerSimulationPage = lazy(() => import('./components/CareerSimulationPage'));
const TalentHeatmapPage = lazy(() => import('./components/TalentHeatmapPage'));
const CommandCenterPage = lazy(() => import('./components/CommandCenterPage'));
const BenchmarkPage = lazy(() => import('./components/BenchmarkPage'));
const HackathonPage = lazy(() => import('./components/HackathonPage'));
const CareerFairPage = lazy(() => import('./components/CareerFairPage'));
const VerifiedSkillsPage = lazy(() => import('./components/VerifiedSkillsPage'));

// ── Non-lazy (small, needed immediately) ─────────────────────────────────────
import AdminRoute from './components/AdminRoute';
import MobileBottomNav from './components/MobileBottomNav';

// ── Loading fallback ─────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-3"
    style={{ background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}>
    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
    <p className="text-white text-sm font-medium">Loading…</p>
  </div>
);

// ── Auth helpers ──────────────────────────────────────────────────────────────
const getUser = () => {
  try { return JSON.parse(localStorage.getItem('tinclo_current_user') || 'null'); } catch { return null; }
};

const UserOnlyRoute = ({ children }) => {
  const user = getUser();
  if (user?.role === 'admin' || localStorage.getItem('tinclo_admin_session') === 'true')
    return <Navigate to="/admin" replace />;
  return children;
};

const AuthRoute = ({ children }) => {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const RecruiterRoute = ({ children }) => {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'recruiter' && user.role !== 'admin') return <Navigate to="/jobs" replace />;
  return children;
};

const AnyAuthRoute = ({ children }) => {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// ── Router ───────────────────────────────────────────────────────────────────
const AppRouter = () => (
  <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/"                element={<LandingPage />} />
        <Route path="/signup"          element={<SignupPage />} />
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/jobs/:id"        element={<JobDetailPage />} />
        <Route path="/companies"       element={<CompaniesListPage />} />
        <Route path="/companies/:slug" element={<CompanyPage />} />

        {/* Candidate */}
        <Route path="/jobs"            element={<UserOnlyRoute><AppMain /></UserOnlyRoute>} />
        <Route path="/dashboard"       element={<AuthRoute><UserOnlyRoute><CandidateDashboard /></UserOnlyRoute></AuthRoute>} />
        <Route path="/saved-jobs"      element={<AuthRoute><UserOnlyRoute><SavedJobsPage /></UserOnlyRoute></AuthRoute>} />

        {/* Shared */}
        <Route path="/analytics"       element={<AnyAuthRoute><AnalyticsPage /></AnyAuthRoute>} />
        <Route path="/profile"         element={<AuthRoute><ProfilePage /></AuthRoute>} />
        <Route path="/career-dna"      element={<AuthRoute><CareerDnaPage /></AuthRoute>} />
        <Route path="/career-simulation" element={<AuthRoute><CareerSimulationPage /></AuthRoute>} />
        <Route path="/talent-heatmap" element={<AnyAuthRoute><TalentHeatmapPage /></AnyAuthRoute>} />
        <Route path="/command-center" element={<RecruiterRoute><CommandCenterPage /></RecruiterRoute>} />
        <Route path="/benchmark" element={<RecruiterRoute><BenchmarkPage /></RecruiterRoute>} />
        <Route path="/hackathons" element={<AnyAuthRoute><HackathonPage /></AnyAuthRoute>} />
        <Route path="/career-fairs" element={<AnyAuthRoute><CareerFairPage /></AnyAuthRoute>} />
        <Route path="/verified-skills" element={<AuthRoute><VerifiedSkillsPage /></AuthRoute>} />

        {/* Recruiter */}
        <Route path="/recruiter"       element={<RecruiterRoute><RecruiterDashboard /></RecruiterRoute>} />

        {/* Admin */}
        <Route path="/admin/login"     element={<AdminLogin />} />
        <Route path="/admin"           element={<AdminRoute><AdminPanel /></AdminRoute>} />
      </Routes>
      <MobileBottomNav />
    </Suspense>
  </Router>
);

export default AppRouter;
