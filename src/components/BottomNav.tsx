import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Ticket, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser } = useAuth();

  if (!authUser) return null;

  const navItems = [
    { path: '/bulletin', icon: Home, label: 'Bülten' },
    { path: '/my-coupons', icon: Ticket, label: 'Kuponlarım' },
    { path: '/dashboard', icon: User, label: 'Profil' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/98 backdrop-blur-sm border-t border-slate-700 z-50 md:hidden">
      <div className="grid grid-cols-3 px-2 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center p-3 rounded-lg transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
