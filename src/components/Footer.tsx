import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold mb-4">Coupon Analyzer</h3>
            <p className="text-slate-400 text-sm">
              Akıllı kupon analizi ile kazanç şansınızı arttırın.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Hızlı Linkler</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-slate-400 hover:text-blue-400 text-sm transition">
                  Hakkında
                </Link>
              </li>
              <li>
                <Link to="/how-to-use" className="text-slate-400 hover:text-blue-400 text-sm transition">
                  Nasıl Kullanılır
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-slate-400 hover:text-blue-400 text-sm transition">
                  İletişim
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Yasal</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-slate-400 hover:text-blue-400 text-sm transition">
                  Kullanım Şartları
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-slate-400 hover:text-blue-400 text-sm transition">
                  Gizlilik Politikası
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">İletişim</h4>
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Mail className="w-4 h-4" />
              <a href="mailto:bilwininc@gmail.com" className="hover:text-blue-400 transition">
                bilwininc@gmail.com
              </a>
            </div>
            <p className="text-slate-500 text-xs mt-4">
              18 yaş altı kullanıcılar bu hizmeti kullanamaz.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-700 mt-8 pt-8 text-center">
          <p className="text-slate-400 text-sm">
            © 2025 <span className="font-semibold">bilwin.inc</span> - Tüm hakları saklıdır.
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Bu platform bilgilendirme amaçlıdır. Kullanıcı kararları kendi sorumluluğundadır.
          </p>
        </div>
      </div>
    </footer>
  );
};
