import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Chrome } from 'lucide-react';
import { authService } from '../services/authService';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.email || !formData.password) {
        throw new Error('E-posta ve şifreyi girin');
      }

      await authService.loginWithEmail(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await authService.loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google ile giriş başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!resetEmail) {
        throw new Error('E-posta adresinizi girin');
      }

      await authService.resetPassword(resetEmail);
      setSuccess('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
      setTimeout(() => {
        setShowResetPassword(false);
        setResetEmail('');
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Şifre sıfırlama başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Aikupon</h1>
            <p className="text-slate-400">Kuponlarını analiz etmeye başla</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          {showResetPassword ? (
            <form onSubmit={handlePasswordReset} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">E-posta</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-medium py-2 rounded-lg transition duration-200"
              >
                {loading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Linki Gönder'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowResetPassword(false);
                  setResetEmail('');
                  setError('');
                  setSuccess('');
                }}
                className="w-full text-slate-400 hover:text-white text-sm transition"
              >
                Geri Dön
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ornek@email.com"
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Şifreniz"
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-medium py-2 rounded-lg transition duration-200"
            >
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>

            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="text-sm text-blue-400 hover:text-blue-300 transition"
              >
                Şifremi Unuttum
              </button>
            </div>
          </form>
          )}

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-slate-400">veya</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 text-white font-medium py-2 rounded-lg transition duration-200 mb-6"
          >
            <Chrome className="w-5 h-5" />
            Google ile Giriş Yap
          </button>

          <p className="text-center text-slate-400 text-sm">
            Hesabın yok mu?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">
              Kayıt Ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
