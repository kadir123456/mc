import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertTriangle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Yasal Uyarı Banner */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-slate-300 text-xs leading-relaxed space-y-1">
              <p><strong className="text-red-400">Önemli Uyarı:</strong> Bu platform sadece eğitim ve bilgilendirme amaçlıdır. 18 yaş altı kullanıcılar için uygun değildir.</p>
              <p>Sunulan analizler yatırım veya finansal tavsiye niteliğinde değildir. Bulunduğunuz ülkenin yasalarına göre hareket etmek zorundasınız.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold mb-4">Aikupon</h3>
            <p className="text-slate-400 text-sm">
              Yapay zeka ile futbol maç istatistiklerini değerlendirin. Sadece bilgilendirme amaçlıdır.
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
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 mt-4">
              <p className="text-yellow-400 text-xs font-semibold">18+ Yaş Sınırı</p>
              <p className="text-slate-400 text-xs mt-1">Bu hizmet 18 yaş altı kullanıcılar için uygun değildir.</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700 mt-8 pt-8 text-center">
          <p className="text-slate-400 text-sm">
            © 2025 <span className="font-semibold">bilwin.inc</span> - Tüm hakları saklıdır.
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Bu platform sadece bilgilendirme ve eğitim amaçlıdır. Yatırım tavsiyesi değildir.
          </p>
          <p className="text-slate-500 text-xs mt-1">
            Kullanıcı kararları kendi sorumluluğundadır. Yerel yasalara göre hareket ediniz.
          </p>
        </div>
      </div>
    </footer>
  );
};