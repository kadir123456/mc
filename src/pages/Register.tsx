import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, Chrome, AlertTriangle } from 'lucide-react';
import { authService } from '../services/authService';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.displayName || !formData.email || !formData.password) {
        throw new Error('Tüm alanları doldurun');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Şifreler eşleşmiyor');
      }

      if (formData.password.length < 6) {
        throw new Error('Şifre en az 6 karakter olmalıdır');
      }

      if (!formData.agreeTerms) {
        throw new Error('Kullanım şartlarını kabul etmelisiniz');
      }

      console.log('📝 Kayıt yapılıyor...');
      await authService.registerWithEmail(formData.email, formData.password, formData.displayName);
      
      // ✅ Kayıt başarılı, yönlendir
      console.log('✅ Kayıt başarılı, dashboard\'a yönlendiriliyor');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('❌ Kayıt hatası:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setLoading(true);

    try {
      if (!formData.agreeTerms) {
        throw new Error('Kullanım şartlarını kabul etmelisiniz');
      }

      console.log('📝 Google ile kayıt yapılıyor...');
      await authService.loginWithGoogle();
      
      // ✅ Kayıt başarılı, yönlendir
      console.log('✅ Google kayıt başarılı, dashboard\'a yönlendiriliyor');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('❌ Google kayıt hatası:', err);
      setError(err.message);
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
            <p className="text-slate-400">Futbol maçlarını değerlendirin, istatistiksel raporlar alın</p>
          </div>

          {/* Önemli Uyarı */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-slate-300 text-xs leading-relaxed">
                <p className="font-semibold text-red-400 mb-1">18+ Yaş Sınırı</p>
                <p>Bu platform sadece 18 yaş ve üstü kullanıcılar içindir. Eğitim amaçlıdır, yatırım tavsiyesi değildir.</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailRegister} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Ad Soyad</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  placeholder="Adınız ve soyadınız"
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
            </div>

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
                  placeholder="En az 6 karakter"
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Şifre Tekrar</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Şifrenizi tekrar girin"
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                className="mt-1 mr-2"
                disabled={loading}
              />
              <label className="text-sm text-slate-300">
                <Link to="/terms-of-service" className="text-blue-400 hover:text-blue-300 underline">
                  Kullanım Şartları
                </Link>
                {' '}ve{' '}
                <Link to="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                  Gizlilik Politikası
                </Link>
                {'nı okudum, kabul ediyorum. '}
                <strong className="text-red-400">18 yaşında veya daha büyüğüm</strong>
                {' ve bulunduğum ülkenin yasalarına göre hareket ediyorum.'}
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-medium py-2 rounded-lg transition duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Kayıt Yapılıyor...
                </>
              ) : (
                'Kayıt Ol'
              )}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-slate-400">veya</span>
            </div>
          </div>

          <button
            onClick={handleGoogleRegister}
            disabled={loading || !formData.agreeTerms}
            className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 text-white font-medium py-2 rounded-lg transition duration-200 mb-6"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Yükleniyor...
              </>
            ) : (
              <>
                <Chrome className="w-5 h-5" />
                Google ile Kayıt Ol
              </>
            )}
          </button>

          <p className="text-center text-slate-400 text-sm">
            Zaten hesabın var mı?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Giriş Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};