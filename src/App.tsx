import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Home } from './pages/Home';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Bulletin } from './pages/Bulletin';
import { MyCoupons } from './pages/MyCoupons';
import { ImageAnalysis } from './pages/ImageAnalysis';
import { Profile } from './pages/Profile';
import { PaymentSuccess } from './pages/PaymentSuccess';
import { About } from './pages/About';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { TermsOfService } from './pages/TermsOfService';
import { Contact } from './pages/Contact';
import { HowToUse } from './pages/HowToUse';
import { AdminPanel } from './pages/AdminPanel';
import { BottomNav } from './components/BottomNav';
import { DesktopNav } from './components/DesktopNav';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">Yükleniyor...</div>
      </div>
    );
  }

  return authUser ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/about" element={<About />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/how-to-use" element={<HowToUse />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bulletin"
            element={
              <ProtectedRoute>
                <Bulletin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-coupons"
            element={
              <ProtectedRoute>
                <MyCoupons />
              </ProtectedRoute>
            }
          />
          <Route
            path="/image-analysis"
            element={
              <ProtectedRoute>
                <ImageAnalysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Routes>
        <DesktopNav />
        <BottomNav />
      </AuthProvider>
    </Router>
  );
}

export default App;
