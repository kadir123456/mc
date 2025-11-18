import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ShoppingCart, LogOut, User as UserIcon, TrendingUp, Image, FileText, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BankTransferPayment } from '../components/BankTransferPayment';

type TabType = 'pricing' | 'profile';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('pricing');

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-24 md:pb-8 md:pt-20">
      {/* Mobile Header */}
      <nav className="md:hidden bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Aikupon</h1>
                <p className="text-xs text-slate-400">AI Analiz</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-bold text-yellow-400">{user.credits}</span>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all duration-200"
              >
                <UserIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Welcome Card */}
        <div className="mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 blur-3xl"></div>
          <div className="relative bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 md:p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Hoş Geldiniz!</h2>
                <p className="text-sm text-slate-400">{user.displayName || user.email}</p>
              </div>
            </div>
            <p className="text-slate-300 text-sm md:text-base mb-6 leading-relaxed">
              AI"ile analiz edin ve profesyonel tahminlere anında erişin.
            </p>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => navigate('/bulletin')}
                className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl p-4 transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-lg"
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm">Bülten</p>
                      <p className="text-xs opacity-90">Maç Seç</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>

              <button
                onClick={() => navigate('/image-analysis')}
                className="group relative overflow-hidden bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl p-4 transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-lg"
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
                      <Image className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm">Görsel</p>
                      <p className="text-xs opacity-90">AI Analiz</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>

              <button
                onClick={() => navigate('/my-coupons')}
                className="group relative overflow-hidden bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-white rounded-xl p-4 transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm">Tahminler</p>
                      <p className="text-xs text-slate-400">Geçmiş</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-xl p-4 hover:border-blue-500/30 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{user.credits}</p>
                <p className="text-xs text-slate-400">Kredi</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-xl p-4 hover:border-purple-500/30 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">0</p>
                <p className="text-xs text-slate-400">Kupon</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-xl p-4 hover:border-green-500/30 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{user.totalSpent}₺</p>
                <p className="text-xs text-slate-400">Harcama</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-xl p-4 hover:border-orange-500/30 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">AI</p>
                <p className="text-xs text-slate-400">Aktif</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab('pricing')}
            className={`flex-1 relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${
              activeTab === 'pricing'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl scale-105'
                : 'bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-semibold">Kredi Al</span>
            </div>
            {activeTab === 'pricing' && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl scale-105'
                : 'bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              <UserIcon className="w-5 h-5" />
              <span className="font-semibold">Profil</span>
            </div>
            {activeTab === 'profile' && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/10"></div>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-4 md:p-6 shadow-xl">
          {activeTab === 'pricing' && <BankTransferPayment />}
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <UserIcon className="w-7 h-7 text-blue-400" />
                Profil Bilgileri
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50 hover:border-blue-500/30 transition-all">
                  <p className="text-slate-400 text-sm mb-1">E-posta</p>
                  <p className="text-white font-semibold">{user.email}</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50 hover:border-purple-500/30 transition-all">
                  <p className="text-slate-400 text-sm mb-1">Ad Soyad</p>
                  <p className="text-white font-semibold">{user.displayName || 'Belirtilmemiş'}</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50 hover:border-green-500/30 transition-all">
                  <p className="text-slate-400 text-sm mb-1">Kalan Kredi</p>
                  <p className="text-white font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    {user.credits} arama
                  </p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50 hover:border-orange-500/30 transition-all">
                  <p className="text-slate-400 text-sm mb-1">Toplam Harcama</p>
                  <p className="text-white font-semibold">{user.totalSpent} ₺</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50 hover:border-pink-500/30 transition-all md:col-span-2">
                  <p className="text-slate-400 text-sm mb-1">Üyelik Tarihi</p>
                  <p className="text-white font-semibold">
                    {new Date(user.createdAt).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
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
