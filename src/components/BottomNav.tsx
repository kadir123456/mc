import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, ShoppingCart, User, Image } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, user } = useAuth();

  if (!authUser) return null;

  const navItems = [
    { path: '/bulletin', icon: Home, label: 'Bülten', badge: null },
    { path: '/image-analysis', icon: Image, label: 'Görsel', badge: null },
    { path: '/my-coupons', icon: FileText, label: 'Kuponlar', badge: null },
    { path: '/dashboard', icon: ShoppingCart, label: 'Kredi', badge: user?.credits || 0 },
    { path: '/profile', icon: User, label: 'Profil', badge: null }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 to-slate-900/95 backdrop-blur-xl border-t border-slate-800/50 shadow-2xl z-50 md:hidden">
      <div className="grid grid-cols-5 px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white scale-105 shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 mb-1 ${isActive ? 'animate-pulse' : ''}`} />
                {item.badge !== null && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-yellow-500 text-slate-900 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
