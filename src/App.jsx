import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import RequireAuth from './components/RequireAuth';
import RoleRouteBoundary from './components/RoleRouteBoundary';
import PaymentRouteBoundary from './components/PaymentRouteBoundary';
import KycLoginNotice from './features/kyc/KycLoginNotice';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import OtpVerificationPage from './pages/OtpVerificationPage';
import TwoFactorVerificationPage from './pages/TwoFactorVerificationPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VendorListPage from './pages/VendorListPage';
import { AuthProvider, useAuth } from './AuthContext';
const InterfacePage = lazy(() => import('./features/interface/InterfacePage'));
const InterfaceReviewPage = lazy(() => import('./features/interface/InterfaceReviewPage'));
const VendorWorkspace = lazy(() => import('./features/vendor/VendorWorkspace'));
const AdminWorkspace = lazy(() => import('./features/admin/AdminWorkspace'));

function VendorArea() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  // Numeric vendor profiles and contacts belong to the customer-facing directory.
  return /^\/vendor\/\d+(?:\/|$)/.test(pathname) ? <InterfacePage /> : <RequireAuth role="vendor"><VendorWorkspace key={user?.user_id} /></RequireAuth>;
}

// Layout wrapper for standard public/logged-in pages (Navbar membaca status login dari AuthContext)
function MainLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6F1]">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
    <Router>
      <RoleRouteBoundary>
      <PaymentRouteBoundary>
      <Suspense fallback={<div className="p-10" role="status">Memuat halaman…</div>}>
      <Routes>
        {/* Auth Pages (AuthLayout handles its own header & footer) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/otp-verification" element={<OtpVerificationPage />} />
        <Route path="/two-factor-verification" element={<TwoFactorVerificationPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* The existing directory has no corresponding Figma frame. */}
        <Route path="/vendor" element={
          <MainLayout>
            <VendorListPage />
          </MainLayout>
        } />
        <Route path="/vendor/*" element={<VendorArea />} />
        <Route path="/admin/*" element={<RequireAuth role="admin"><AdminWorkspace /></RequireAuth>} />
        <Route path="/interface-review" element={<InterfaceReviewPage />} />
        <Route path="/interface-review/:screenKey" element={<InterfacePage />} />
        <Route path="*" element={<InterfacePage />} />
      </Routes>
      </Suspense>
      <KycLoginNotice />
      </PaymentRouteBoundary>
      </RoleRouteBoundary>
    </Router>
    </AuthProvider>
  );
}

export default App;
