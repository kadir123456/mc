import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Calendar, Share2, ChevronDown, ChevronUp, Trophy, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { couponService, Coupon } from '../services/couponService';
import { translateLeague, translateTeam } from '../utils/leagueTranslations';

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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Ticket className="w-16 h-16 mx-auto text-slate-600 mb-4" />
          <p className="text-white mb-4">Analizleri görmek için giriş yapmalısınız</p>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-white">Analizler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-24 md:pb-8 md:pt-20">
      {/* Header */}
      <header className="md:hidden bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-white">Analizler</h1>
          <div className="w-9"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Desktop Header */}
        <div className="hidden md:block mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Ticket className="w-8 h-8 text-blue-400" />
            Kuponlarım
          </h1>
          <p className="text-slate-400">AI analiz sonuçlarınız</p>
        </div>

        {coupons.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl">
            <Ticket className="w-16 h-16 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-300 text-lg mb-2">Henüz Analiziniz yok</p>
            <p className="text-slate-500 mb-6">Bülten'den maç seçerek ilk analizini oluşturun</p>
            <button
              onClick={() => navigate('/bulletin')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition"
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
                  className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all duration-300"
                >
                  {/* Kupon Header */}
                  <button
                    onClick={() => toggleCoupon(coupon.id)}
                    className="w-full p-5 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Ticket className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-lg">Kupon #{coupon.id.slice(-6)}</h3>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(coupon.purchasedAt).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </div>
                            <span>•</span>
                            <span>{coupon.matches.length} Maç</span>
                            <span>•</span>
                            <span className="text-yellow-400">{coupon.creditsUsed} Kredi</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            shareCoupon(coupon);
                          }}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                        >
                          <Share2 className="w-4 h-4 text-slate-400" />
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Kupon Detayı */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/50 bg-slate-800/30">
                      {/* Maçlar - Kompakt Kupon Formatı */}
                      <div className="p-4 space-y-2">
                        {coupon.analysis.map((match, index) => {
                          // En yüksek tahmini bul
                          const predictions = [
                            { type: 'MS1 (Ev Sahibi)', value: match.predictions.ms1, key: 'ms1' },
                            { type: 'X (Beraberlik)', value: match.predictions.msX, key: 'msX' },
                            { type: 'MS2 (Deplasman)', value: match.predictions.ms2, key: 'ms2' }
                          ];
                          const bestPrediction = predictions.reduce((max, p) => p.value > max.value ? p : max);

                          return (
                            <div
                              key={match.fixtureId}
                              className="bg-slate-900/70 border border-slate-700/50 rounded-lg p-3 hover:border-blue-500/30 transition"
                            >
                              {/* Başlık: Maç No + Lig */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    {index + 1}
                                  </div>
                                  <span className="text-xs text-blue-300 font-medium">
                                    {translateLeague(match.league)}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500">
                                  {new Date(match.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} • {match.time}
                                </span>
                              </div>

                              {/* Takımlar - Kompakt Görünüm */}
                              <div className="mb-2">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-white font-semibold">{translateTeam(match.homeTeam)}</span>
                                  <span className="text-xs text-slate-500 px-2">vs</span>
                                  <span className="text-white font-semibold">{translateTeam(match.awayTeam)}</span>
                                </div>
                              </div>

                              {/* Tahmin Sonucu - Tablo Formatı */}
                              <div className="bg-slate-800/50 rounded-lg p-2 mb-2">
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div className={`${bestPrediction.key === 'ms1' ? 'bg-green-600/20 border border-green-500/30' : ''} rounded p-1.5`}>
                                    <div className="text-[10px] text-slate-400 mb-0.5">Ev Sahibi</div>
                                    <div className={`text-xs font-bold ${bestPrediction.key === 'ms1' ? 'text-green-400' : 'text-white'}`}>
                                      %{match.predictions.ms1}
                                    </div>
                                  </div>
                                  <div className={`${bestPrediction.key === 'msX' ? 'bg-yellow-600/20 border border-yellow-500/30' : ''} rounded p-1.5`}>
                                    <div className="text-[10px] text-slate-400 mb-0.5">Beraberlik</div>
                                    <div className={`text-xs font-bold ${bestPrediction.key === 'msX' ? 'text-yellow-400' : 'text-white'}`}>
                                      %{match.predictions.msX}
                                    </div>
                                  </div>
                                  <div className={`${bestPrediction.key === 'ms2' ? 'bg-blue-600/20 border border-blue-500/30' : ''} rounded p-1.5`}>
                                    <div className="text-[10px] text-slate-400 mb-0.5">Deplasman</div>
                                    <div className={`text-xs font-bold ${bestPrediction.key === 'ms2' ? 'text-blue-400' : 'text-white'}`}>
                                      %{match.predictions.ms2}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* AI Tavsiyesi - Kompakt */}
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1">
                                  <Trophy className="w-3 h-3 text-yellow-400" />
                                  <span className="text-slate-400">AI Tavsiye:</span>
                                  <span className="text-white font-bold">{bestPrediction.type}</span>
                                </div>
                                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  match.confidence >= 70 ? 'bg-green-500/20 text-green-400' :
                                  match.confidence >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  Güven: %{match.confidence}
                                </div>
                              </div>

                              {/* Öneri Metni - Opsiyonel */}
                              {match.recommendation && (
                                <div className="mt-2 bg-blue-500/5 border border-blue-500/20 rounded p-2">
                                  <p className="text-xs text-slate-300 leading-relaxed">{match.recommendation}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Genel Analiz */}
                      {coupon.analysis[0]?.analysis && (
                        <div className="border-t border-slate-800/50 p-5">
                          <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            Genel Değerlendirme
                          </h4>
                          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {coupon.analysis[0].analysis}
                          </p>
                        </div>
                      )}
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
