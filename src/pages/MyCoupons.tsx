import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Calendar, TrendingUp, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { couponService, Coupon } from '../services/couponService';

export const MyCoupons: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCoupon, setExpandedCoupon] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCoupons();
    }
  }, [user]);

  const loadCoupons = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userCoupons = await couponService.getUserCoupons(user.uid);
      setCoupons(userCoupons);
    } catch (error) {
      console.error('Kupon yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCoupon = (couponId: string) => {
    setExpandedCoupon(expandedCoupon === couponId ? null : couponId);
  };

  const shareCoupon = (coupon: Coupon) => {
    const text = `Aikupon Analizi\n\n${coupon.matches.map((m, i) =>
      `${i + 1}. ${m.homeTeam} vs ${m.awayTeam}`
    ).join('\n')}\n\nToplam ${coupon.matches.length} maç`;

    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      alert('Kupon panoya kopyalandı!');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white mb-4">Kuponlarınızı görmek için giriş yapmalısınız</p>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-white">Kuponlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Ticket className="w-8 h-8 text-blue-400" />
            Kuponlarım
          </h1>
          <p className="text-slate-300">Satın aldığınız analiz sonuçları</p>
        </div>

        {coupons.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/50 rounded-xl border border-slate-700">
            <Ticket className="w-16 h-16 mx-auto text-slate-500 mb-4" />
            <p className="text-slate-300 text-lg mb-2">Henüz kuponunuz yok</p>
            <p className="text-slate-500 mb-6">Ana sayfadan maç seçerek ilk kuponunuzu oluşturun</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              Maçları Görüntüle
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {coupons.map((coupon) => {
              const isExpanded = expandedCoupon === coupon.id;

              return (
                <div
                  key={coupon.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-blue-500/50 transition"
                >
                  <button
                    onClick={() => toggleCoupon(coupon.id)}
                    className="w-full p-6 text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <Ticket className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-white font-bold">
                              Kupon #{coupon.id.slice(0, 8)}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <Calendar className="w-3 h-3" />
                              {new Date(coupon.purchasedAt).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'long',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-300">
                            {coupon.matches.length} maç
                          </span>
                          <span className="text-blue-400">
                            {coupon.type === 'standard' ? 'Standart' : 'Detaylı'} Analiz
                          </span>
                          <span className="text-yellow-400">
                            {coupon.creditsUsed} kredi
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            shareCoupon(coupon);
                          }}
                          className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
                        >
                          <Share2 className="w-4 h-4 text-slate-300" />
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-700 p-6 space-y-4">
                      {coupon.analysis.map((match, index) => (
                        <div
                          key={match.fixtureId}
                          className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="text-xs text-blue-400 mb-1">{match.league}</div>
                              <h4 className="text-white font-bold text-lg">
                                {match.homeTeam} vs {match.awayTeam}
                              </h4>
                              <div className="text-xs text-slate-400 mt-1">
                                {match.date} - {match.time}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-400">Güven Skoru</div>
                              <div className={`text-2xl font-bold ${
                                match.confidence >= 70 ? 'text-green-400' :
                                match.confidence >= 50 ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                %{match.confidence}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="bg-slate-800/50 rounded p-2 text-center">
                              <div className="text-xs text-slate-400 mb-1">MS1</div>
                              <div className="text-white font-bold">{match.predictions.ms1}%</div>
                            </div>
                            <div className="bg-slate-800/50 rounded p-2 text-center">
                              <div className="text-xs text-slate-400 mb-1">MSX</div>
                              <div className="text-white font-bold">{match.predictions.msX}%</div>
                            </div>
                            <div className="bg-slate-800/50 rounded p-2 text-center">
                              <div className="text-xs text-slate-400 mb-1">MS2</div>
                              <div className="text-white font-bold">{match.predictions.ms2}%</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="bg-slate-800/50 rounded p-2 text-center">
                              <div className="text-xs text-slate-400 mb-1">2.5 Üst</div>
                              <div className="text-white font-bold">{match.predictions.over25}%</div>
                            </div>
                            <div className="bg-slate-800/50 rounded p-2 text-center">
                              <div className="text-xs text-slate-400 mb-1">2.5 Alt</div>
                              <div className="text-white font-bold">{match.predictions.under25}%</div>
                            </div>
                            <div className="bg-slate-800/50 rounded p-2 text-center">
                              <div className="text-xs text-slate-400 mb-1">KG Var</div>
                              <div className="text-white font-bold">{match.predictions.btts}%</div>
                            </div>
                          </div>

                          {coupon.type === 'detailed' && (
                            <div className="grid grid-cols-3 gap-3 mb-3">
                              <div className="bg-blue-900/20 border border-blue-700/30 rounded p-2 text-center">
                                <div className="text-xs text-blue-400 mb-1">İ.Y. MS1</div>
                                <div className="text-white font-bold">{match.predictions.firstHalfMs1}%</div>
                              </div>
                              <div className="bg-blue-900/20 border border-blue-700/30 rounded p-2 text-center">
                                <div className="text-xs text-blue-400 mb-1">İ.Y. MSX</div>
                                <div className="text-white font-bold">{match.predictions.firstHalfMsX}%</div>
                              </div>
                              <div className="bg-blue-900/20 border border-blue-700/30 rounded p-2 text-center">
                                <div className="text-xs text-blue-400 mb-1">İ.Y. MS2</div>
                                <div className="text-white font-bold">{match.predictions.firstHalfMs2}%</div>
                              </div>
                            </div>
                          )}

                          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-blue-300 mb-1">
                              <TrendingUp className="w-4 h-4" />
                              <span className="text-sm font-medium">Tavsiye</span>
                            </div>
                            <p className="text-white font-medium">{match.recommendation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
