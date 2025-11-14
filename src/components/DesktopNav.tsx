import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Ticket, User, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DesktopNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, user } = useAuth();

  if (!authUser) return null;

  const navItems = [
    { path: '/bulletin', icon: Home, label: 'Bülten' },
    { path: '/my-coupons', icon: Ticket, label: 'Kuponlarım' },
    { path: '/dashboard', icon: User, label: 'Profil' }
  ];

  return (
    <nav className="hidden md:block fixed top-0 left-0 right-0 bg-slate-900/98 backdrop-blur-sm border-b border-slate-700 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Zap className="w-7 h-7 text-yellow-400" />
            <h1 className="text-xl font-bold text-white">Aikupon</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-semibold">{user?.credits || 0}</span>
              <span className="text-slate-400 text-sm">Kredi</span>
            </div>

            <div className="flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
