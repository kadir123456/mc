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

      window.location.href = paymentUrl;
    } catch (err: any) {
      setError(err.message || 'Ödeme başlatılamadı');
      setLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-2">Kredi Satın Al</h2>
      <p className="text-slate-400 mb-8">Her görsel analizi 1 kredi tüketir</p>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`rounded-xl border-2 p-6 transition ${
              pkg.popular
                ? 'bg-blue-600/10 border-blue-500 shadow-xl shadow-blue-500/20'
                : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
            }`}
          >
            {pkg.popular && (
              <div className="mb-4 inline-block px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full text-blue-300 text-xs font-medium">
                En Popüler
              </div>
            )}

            <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
            <div className="mb-6">
              <span className="text-3xl font-bold text-white">{pkg.price}</span>
              <span className="text-slate-400 ml-1">₺</span>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3 text-slate-300">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>{pkg.searches} görsel analizi</span>
              </li>
              <li className="flex items-start gap-3 text-slate-300">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Detaylı analiz raporları</span>
              </li>
              <li className="flex items-start gap-3 text-slate-300">
                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Krediler 1 yıl geçerli</span>
              </li>
            </ul>

            <button
              onClick={() => handlePurchase(pkg.id)}
              disabled={loading === pkg.id}
              className={`w-full font-medium py-2 rounded-lg transition flex items-center justify-center gap-2 ${
                pkg.popular
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 disabled:bg-slate-600 text-white'
              }`}
            >
              {loading === pkg.id ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Yükleniyor...
                </>
              ) : (
                'Satın Al'
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 bg-slate-700/30 border border-slate-600 rounded-lg">
        <h3 className="text-lg font-bold text-white mb-4">Ödeme Bilgileri</h3>
        <p className="text-slate-300 mb-4">
          Tüm ödemeler güvenli ödeme altyapısı ile işlenir.
          Kredi kartı, banka transferi ve diğer ödeme yöntemlerini kabul ediyoruz.
        </p>
        <p className="text-slate-400 text-sm mb-3">
          Ödeme işlemi sırasında Gizlilik Politikamız ve Kullanım Şartlarımız geçerlidir.
        </p>
        <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-yellow-400 text-sm font-medium">
            <strong>Önemli:</strong> Dijital ürün satışı olduğu için geri ödeme bulunmamaktadır.
            Satın almadan önce paket içeriklerini dikkatlice inceleyiniz.
          </p>
        </div>
      </div>
    </div>
  );
};
