import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import OtpVerificationPage from './pages/OtpVerificationPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import KycPage from './pages/KycPage';
import KycPendingPage from './pages/KycPendingPage';
import KycRejectedPage from './pages/KycRejectedPage';
import CatalogPage from './pages/CatalogPage';
import ProductDetailPage from './pages/ProductDetailPage';
import VendorProfilePage from './pages/VendorProfilePage';
import VendorListPage from './pages/VendorListPage';
import OrdersPage from './pages/OrdersPage';
import HowToRentPage from './pages/HowToRentPage';

// Layout wrapper for standard public/logged-in pages
function MainLayout({ children, isLoggedIn = true }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6F1]">
      <Navbar isLoggedIn={isLoggedIn} />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Pages (AuthLayout handles its own header & footer) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/otp-verification" element={<OtpVerificationPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Public Landing Page */}
        <Route path="/" element={
          <MainLayout isLoggedIn={true}>
            <HomePage />
          </MainLayout>
        } />

        {/* Catalog & Products (Logged In views as shown in designs) */}
        <Route path="/catalog" element={
          <MainLayout isLoggedIn={true}>
            <CatalogPage />
          </MainLayout>
        } />
        <Route path="/product/:id" element={
          <MainLayout isLoggedIn={true}>
            <ProductDetailPage />
          </MainLayout>
        } />
        <Route path="/vendor" element={
          <MainLayout isLoggedIn={true}>
            <VendorListPage />
          </MainLayout>
        } />
        <Route path="/vendor/:id" element={
          <MainLayout isLoggedIn={true}>
            <VendorProfilePage />
          </MainLayout>
        } />
        <Route path="/cara-sewa" element={
          <MainLayout isLoggedIn={true}>
            <HowToRentPage />
          </MainLayout>
        } />
        <Route path="/pesanan" element={
          <MainLayout isLoggedIn={true}>
            <OrdersPage />
          </MainLayout>
        } />

        {/* KYC Verification Flow Pages */}
        <Route path="/kyc" element={
          <MainLayout isLoggedIn={true}>
            <KycPage />
          </MainLayout>
        } />
        <Route path="/kyc-pending" element={
          <MainLayout isLoggedIn={true}>
            <KycPendingPage />
          </MainLayout>
        } />
        <Route path="/kyc-rejected" element={
          <MainLayout isLoggedIn={true}>
            <KycRejectedPage />
          </MainLayout>
        } />

        {/* Fallback to Home */}
        <Route path="*" element={
          <MainLayout isLoggedIn={false}>
            <HomePage />
          </MainLayout>
        } />
      </Routes>
    </Router>
  );
}

export default App;
