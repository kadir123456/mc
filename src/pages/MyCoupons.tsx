import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Trash2, ArrowLeft, ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { imageCouponService, ImageCoupon } from '../services/imageCouponService';

export const MyCoupons: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<ImageCoupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCoupons();
    }
  }, [user]);

  const loadCoupons = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userCoupons = await imageCouponService.getUserCoupons(user.uid);
      setCoupons(userCoupons);
    } catch (error) {
      console.error('Kupon yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCoupon = async (couponId: string) => {
    if (!user) return;
    
    const confirmed = window.confirm('Bu kuponu silmek istediğinizden emin misiniz?');
    if (!confirmed) return;

    try {
      await imageCouponService.deleteCoupon(user.uid, couponId);
      await loadCoupons();
    } catch (error) {
      console.error('Kupon silme hatası:', error);
      alert('Kupon silinemedi');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Ticket className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <p className="text-white mb-4">Kuponları görmek için giriş yapmalısınız</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
          >
            Giriş Yap
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-white">Kuponlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-28 md:pb-8 md:pt-20">
      {/* Header */}
      <header className="md:hidden bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-white">Kuponlarım</h1>
            <div className="w-9"></div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Ticket className="w-8 h-8 text-blue-400" />
              Kuponlarım
            </h1>
            <p className="text-slate-400">Görsel analizi ile oluşturduğunuz kuponlar</p>
          </div>
          <button
            onClick={() => navigate('/image-analysis')}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition flex items-center gap-2"
          >
            <ImageIcon className="w-5 h-5" />
            Yeni Analiz
          </button>
        </div>

        {coupons.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/50 border border-slate-700 rounded-xl">
            <Ticket className="w-16 h-16 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-300 text-lg mb-2">Henüz kuponunuz yok</p>
            <p className="text-slate-500 mb-6">Görsel analizi ile kupon oluşturun</p>
            <button
              onClick={() => navigate('/image-analysis')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition"
            >
              Yeni Analiz Yap
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bilgi mesajı */}
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-300">
              💡 Maksimum 5 kupon tutulur. Yeni kupon eklendiğinde en eski otomatik silinir.
            </div>

            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-blue-500/30 transition"
              >
                {/* Kupon Header */}
                <div className="bg-slate-800/80 border-b border-slate-700 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold">Kupon #{coupon.id.slice(-6)}</h3>
                        <p className="text-xs text-slate-400">
                          {new Date(coupon.createdAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Toplam Oran</p>
                        <p className="text-lg font-bold text-yellow-400">{coupon.totalOdds}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteCoupon(coupon.id)}
                        className="p-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 rounded-lg transition"
                        title="Kuponu Sil"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Maçlar - Sade Format */}
                <div className="p-4 space-y-2">
                  {coupon.matches.map((match, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 hover:border-blue-500/30 transition"
                    >
                      {/* Takım - Market - Oran Formatı */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-white font-semibold text-sm">
                            {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {match.league} • {match.date} {match.time}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-center bg-blue-600/10 border border-blue-500/30 rounded px-3 py-1">
                            <p className="text-xs text-blue-300 font-medium">{match.marketDisplay}</p>
                          </div>
                          <div className="text-center bg-yellow-600/10 border border-yellow-500/30 rounded px-3 py-1">
                            <p className="text-sm font-bold text-yellow-400">{match.odds}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Güven Skoru */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                        <p className="text-xs text-slate-500">Güven Skoru</p>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          match.confidence >= 80 
                            ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
                            : match.confidence >= 70 
                            ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-red-600/20 text-red-400 border border-red-500/30'
                        }`}>
                          %{match.confidence}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Özet */}
                <div className="bg-slate-800/30 border-t border-slate-700 px-5 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-slate-400">
                      <span className="font-medium text-white">{coupon.matches.length}</span> maç
                    </p>
                    <p className="text-slate-400">
                      Toplam Oran: <span className="font-bold text-yellow-400">{coupon.totalOdds}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
