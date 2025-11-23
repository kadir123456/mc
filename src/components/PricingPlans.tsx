import React, { useState } from 'react';
import { Check, Loader } from 'lucide-react';
import { packages, pytrService } from '../services/pytrService';
import { useAuth } from '../context/AuthContext';

export const PricingPlans: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handlePurchase = async (packageId: string) => {
    if (!user) return;

    setLoading(packageId);
    setError('');

    try {
      const { paymentUrl } = await pytrService.createPaymentOrder(
        user.uid,
        packageId,
        user.email
      );

      // ✅ Yeni sekmede aç (SADECE yeni sekmede)
      const newWindow = window.open(paymentUrl, '_blank', 'noopener,noreferrer');
      
      // ✅ Eğer pop-up engelleyici varsa, kullanıcıyı bilgilendir (ama mevcut sekmede AÇMA)
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        alert(
          '⚠️ Pop-up engelleyici aktif!\n\n' +
          'Lütfen tarayıcınızın pop-up engelleyicisini devre dışı bırakın ve tekrar deneyin.\n\n' +
          'Veya "Satın Al" butonuna tekrar tıklayın.'
        );
      }
      
      setLoading(null);
    } catch (err: any) {
      setError(err.message || 'Ödeme başlatılamadı');
      setLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-lg md:text-xl font-bold text-white mb-1.5">Kredi Paketleri</h2>
      <p className="text-slate-400 text-xs md:text-sm mb-4">
        Analiz için kredi satın al
      </p>

      {error && (
        <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`rounded-lg border p-3 md:p-4 transition ${
              pkg.popular
                ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/10'
                : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
            }`}
          >
            {pkg.popular && (
              <div className="mb-2 inline-block px-2 py-0.5 bg-blue-600/20 border border-blue-500/30 rounded-full text-blue-300 text-[10px] font-medium">
                Popüler
              </div>
            )}

            <h3 className="text-sm md:text-base font-bold text-white mb-1">{pkg.name}</h3>
            <div className="mb-3">
              <span className="text-xl md:text-2xl font-bold text-white">{pkg.price}</span>
              <span className="text-slate-400 text-xs ml-1">₺</span>
            </div>

            <ul className="space-y-1.5 mb-4">
              <li className="flex items-start gap-1.5 text-slate-300">
                <Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs">{pkg.searches} kredi</span>
              </li>
              <li className="flex items-start gap-1.5 text-slate-300">
                <Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs">{Math.floor(pkg.searches / 1)} standart</span>
              </li>
              <li className="flex items-start gap-1.5 text-slate-300">
                <Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs">{Math.floor(pkg.searches / 5)} detaylı</span>
              </li>
              <li className="flex items-start gap-1.5 text-slate-300">
                <Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs">AI analizi</span>
              </li>
              <li className="flex items-start gap-1.5 text-slate-300">
                <Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs">1 yıl geçerli</span>
              </li>
            </ul>

            <button
              onClick={() => handlePurchase(pkg.id)}
              disabled={loading === pkg.id}
              className={`w-full font-medium text-xs md:text-sm py-1.5 md:py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                pkg.popular
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 text-white'
              }`}
            >
              {loading === pkg.id ? (
                <>
                  <Loader className="w-3 h-3 animate-spin" />
                  <span className="text-xs">Yükleniyor...</span>
                </>
              ) : (
                'Satın Al'
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        <div className="p-3 md:p-4 bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/30 rounded-lg">
          <h3 className="text-sm md:text-base font-bold text-white mb-2">🎁 İlk Kayıt Bonusu</h3>
          <p className="text-slate-300 text-xs md:text-sm mb-1">
            Yeni üyelere <strong className="text-blue-400">2 ÜCRETSİZ KREDİ</strong> veriyoruz!
          </p>
          <p className="text-slate-400 text-xs">
            Sistemi test et, 1 standart analiz yap.
          </p>
        </div>

        <div className="p-3 bg-yellow-600/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-xs font-medium">
            <strong>Önemli:</strong> Dijital ürün olduğu için iade yapılmaz.
          </p>
        </div>
      </div>
    </div>
  );
};
