import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Calendar, Zap, TrendingUp, Shield, 
  LogOut, ArrowLeft, Settings, CreditCard, FileText, Gift
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    if (window.confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
      await logout();
      navigate('/login');
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  const stats = [
    { 
      icon: Zap, 
      label: 'Kalan Kredi', 
      value: user.credits,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30'
    },
    { 
      icon: FileText, 
      label: 'Toplam Kupon', 
      value: '0',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30'
    },
    { 
      icon: TrendingUp, 
      label: 'Harcama', 
      value: `${user.totalSpent}₺`,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30'
    }
  ];

  const menuItems = [
    { 
      icon: CreditCard, 
      label: 'Kredi Satın Al', 
      desc: 'Paketleri görüntüle',
      path: '/dashboard',
      color: 'text-blue-400'
    },
    { 
      icon: FileText, 
      label: 'Kuponlarım', 
      desc: 'Geçmiş analizler',
      path: '/my-coupons',
      color: 'text-purple-400'
    },
    { 
      icon: Gift, 
      label: 'Hediye Kredi', 
      desc: 'Arkadaşlarını davet et',
      path: '#',
      color: 'text-orange-400'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-24 md:pb-8 md:pt-20">
      {/* Header */}
      <header className="md:hidden bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-white">Profil</h1>
          <button
            onClick={handleLogout}
            className="p-2 text-red-400 hover:text-red-300 transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">
        {/* Profile Card */}
        <div className="relative mb-6 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 blur-3xl"></div>
          <div className="relative bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <User className="w-10 h-10 text-white" />
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-white mb-1 truncate">
                  {user.displayName || 'Kullanıcı'}
                </h2>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    Üye: {new Date(user.createdAt).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Settings Button */}
              <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className={`bg-slate-900/50 backdrop-blur border ${stat.border} rounded-xl p-4 hover:scale-105 transition-all duration-200`}
            >
              <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-xs text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Menu Items */}
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-semibold text-slate-400 px-2">Hızlı Erişim</h3>
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="w-full bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4 hover:bg-slate-800/50 hover:border-slate-700 transition-all duration-200 flex items-center gap-4"
            >
              <div className={`w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-white font-semibold mb-0.5">{item.label}</p>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>

        {/* Account Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-400 px-2">Hesap</h3>
          
          {user.isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/30 rounded-xl p-4 hover:from-purple-600/20 hover:to-pink-600/20 transition-all duration-200 flex items-center gap-4"
            >
              <Shield className="w-6 h-6 text-purple-400" />
              <div className="flex-1 text-left">
                <p className="text-white font-semibold">Admin Panel</p>
                <p className="text-xs text-purple-400">Yönetim paneline git</p>
              </div>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full bg-red-600/10 border border-red-500/30 rounded-xl p-4 hover:bg-red-600/20 transition-all duration-200 flex items-center gap-4"
          >
            <LogOut className="w-6 h-6 text-red-400" />
            <div className="flex-1 text-left">
              <p className="text-white font-semibold">Çıkış Yap</p>
              <p className="text-xs text-red-400">Hesaptan çıkış yap</p>
            </div>
          </button>
        </div>

        {/* App Version */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-600">
            Aikupon v1.0.0 • AI Destekli Analiz
          </p>
        </div>
      </div>
    </div>
  );
};
