import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Zap, ShoppingCart, LogOut, History, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ImageUpload } from '../components/ImageUpload';
import { PricingPlans } from '../components/PricingPlans';
import { UserAnalyses } from '../components/UserAnalyses';

type TabType = 'upload' | 'pricing' | 'history' | 'profile';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('upload');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="mb-4">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <nav className="bg-slate-800/50 backdrop-blur border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Aikupon</h1>
            <p className="text-slate-400 text-sm">Akıllı kupon analizi</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-white font-medium">{user.displayName || user.email}</p>
              <div className="flex items-center gap-1 text-yellow-400">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">{user.credits} kredi</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setActiveTab('upload')}
            className={`p-4 rounded-lg border-2 transition ${
              activeTab === 'upload'
                ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
            }`}
          >
            <Upload className="w-6 h-6 mx-auto mb-2" />
            <p className="font-medium text-sm">Görsel Yükle</p>
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            className={`p-4 rounded-lg border-2 transition ${
              activeTab === 'pricing'
                ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
            }`}
          >
            <ShoppingCart className="w-6 h-6 mx-auto mb-2" />
            <p className="font-medium text-sm">Kredi Al</p>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`p-4 rounded-lg border-2 transition ${
              activeTab === 'history'
                ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
            }`}
          >
            <History className="w-6 h-6 mx-auto mb-2" />
            <p className="font-medium text-sm">Geçmiş</p>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`p-4 rounded-lg border-2 transition ${
              activeTab === 'profile'
                ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
            }`}
          >
            <UserIcon className="w-6 h-6 mx-auto mb-2" />
            <p className="font-medium text-sm">Profil</p>
          </button>
        </div>

        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4 sm:p-8">
          {activeTab === 'upload' && (
            <>
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
                  <Upload className="w-6 h-6" />
                  Nasıl Kullanılır?
                </h2>
                <div className="space-y-3 text-slate-200">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600/30 text-blue-300 rounded-full font-bold flex-shrink-0">1</span>
                    <p className="pt-1"><strong>Kupon görselinizi yükleyin:</strong> Bahis sitesinden kuponunuzun ekran görüntüsünü alın veya fotoğrafını çekin.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600/30 text-blue-300 rounded-full font-bold flex-shrink-0">2</span>
                    <p className="pt-1"><strong>AI analizi başlatsın:</strong> Yapay zeka kuponunuzdaki tüm maçları okuyup profesyonel analiz yapar.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600/30 text-blue-300 rounded-full font-bold flex-shrink-0">3</span>
                    <p className="pt-1"><strong>Sonuçları inceleyin:</strong> Her maç için tahminler, oranlar, güven skorları ve stratejik öneriler görün.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600/30 text-blue-300 rounded-full font-bold flex-shrink-0">4</span>
                    <p className="pt-1"><strong>Geçmişe erişin:</strong> Tüm analizleriniz tarih/saat ile birlikte "Geçmiş" sekmesinde saklanır.</p>
                  </div>
                </div>
              </div>
              <ImageUpload />
            </>
          )}
          {activeTab === 'pricing' && <PricingPlans />}
          {activeTab === 'history' && <UserAnalyses />}
          {activeTab === 'profile' && (
            <div className="text-slate-300">
              <h2 className="text-2xl font-bold text-white mb-6">Profil Bilgileri</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-slate-400 text-sm">E-posta</p>
                  <p className="text-white font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Ad Soyad</p>
                  <p className="text-white font-medium">{user.displayName || 'Belirtilmemiş'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Kalan Kredi</p>
                  <p className="text-white font-medium">{user.credits} arama</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Toplam Harcama</p>
                  <p className="text-white font-medium">{user.totalSpent} ₺</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Üyelik Tarihi</p>
                  <p className="text-white font-medium">
                    {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
