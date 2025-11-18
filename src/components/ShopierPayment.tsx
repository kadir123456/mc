import React, { useState } from 'react';
import { ShoppingCart, Zap, Check, Sparkles, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { shopierPackages, shopierService } from '../services/shopierService';

export const ShopierPayment: React.FC = () => {
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const handlePurchase = (packageId: string) => {
    if (!user) {
      alert('Lütfen önce giriş yapın');
      return;
    }

    try {
      shopierService.redirectToPayment(
        packageId, 
        user.uid, 
        user.email || '', 
        user.displayName || undefined
      );
    } catch (error) {
      console.error('Payment redirect error:', error);
      alert('Ödeme sayfasına yönlendirilirken bir hata oluştu');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Kredi Paketleri</h2>
        </div>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          Ödeme Sayfasında Kayıtlı epostanızı yazın Krediler hesabınıza yüklenmeyecektir.
        </p>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {shopierPackages.map((pkg) => (
          <div
            key={pkg.id}
            onMouseEnter={() => setSelectedPackage(pkg.id)}
            onMouseLeave={() => setSelectedPackage(null)}
            className={`relative group overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border-2 rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
              pkg.popular
                ? 'border-yellow-500/50 shadow-yellow-500/20'
                : selectedPackage === pkg.id
                ? 'border-blue-500/50 shadow-blue-500/20'
                : 'border-slate-700/50 hover:border-slate-600'
            }`}
          >
            {/* Popular Badge */}
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  En Popüler
                </div>
              </div>
            )}

            {/* Glow Effect */}
            {pkg.popular && (
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 blur-xl"></div>
            )}

            {/* Content */}
            <div className="relative z-10">
              {/* Icon */}
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                pkg.popular
                  ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                  : 'bg-gradient-to-br from-blue-500 to-purple-600'
              }`}>
                <Zap className="w-8 h-8 text-white" />
              </div>

              {/* Package Name */}
              <h3 className="text-xl font-bold text-white text-center mb-2">
                {pkg.name}
              </h3>

              {/* Credits */}
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-white mb-1">
                  {pkg.searches}
                </div>
                <div className="text-sm text-slate-400">
                  Kredi
                </div>
              </div>

              {/* Price */}
              <div className="text-center mb-4">
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {pkg.price}₺
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>{pkg.searches} Kupon Analizi</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>AI Destekli Tahmin</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>Detaylı İstatistik</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>7/24 Erişim</span>
                </div>
              </div>

              {/* Purchase Button */}
              <button
                onClick={() => handlePurchase(pkg.id)}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl ${
                  pkg.popular
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-slate-900'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                Satın Al
                <ExternalLink className="w-3 h-3" />
              </button>

              {/* Per Credit Price */}
              <div className="text-center mt-3">
                <span className="text-xs text-slate-500">
                  Kredi başına {(pkg.price / pkg.searches).toFixed(2)}₺
                </span>
              </div>
            </div>

            {/* Hover Border Glow */}
            <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${
              selectedPackage === pkg.id ? 'opacity-100' : 'opacity-0'
            }`}>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-blue-300 mb-2">Güvenli Ödeme</h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Shopier güvenli ödeme altyapısı ile korumalı işlem</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Ödeme sonrası krediler otomatik olarak hesabınıza yüklenir</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Kredi kartı, banka kartı ve havale ile ödeme yapabilirsiniz</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>Sorun yaşarsanız destek ekibimiz 7/24 yanınızda</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
