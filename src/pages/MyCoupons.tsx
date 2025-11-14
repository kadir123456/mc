import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Calendar, Share2, ChevronDown, ChevronUp, Trophy, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { couponService, Coupon } from '../services/couponService';
import { translateLeague } from '../utils/leagueTranslations';

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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-white">Kuponlar yükleniyor...</p>
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
          <h1 className="text-lg font-bold text-white">Kuponlarım</h1>
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
            <p className="text-slate-300 text-lg mb-2">Henüz kuponunuz yok</p>
            <p className="text-slate-500 mb-6">Bülten'den maç seçerek ilk kuponunuzu oluşturun</p>
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
                      {/* Maçlar - Bahis Kuponu Formatı */}
                      <div className="p-5 space-y-3">
                        {coupon.analysis.map((match, index) => (
                          <div
                            key={match.fixtureId}
                            className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 hover:border-blue-500/30 transition"
                          >
                            {/* Maç Numarası ve Lig */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  {index + 1}
                                </div>
                                <span className="text-xs text-blue-400 font-medium">
                                  {translateLeague(match.league)}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">
                                {new Date(match.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} • {match.time}
                              </div>
                            </div>

                            {/* Takımlar - Bahis Kuponu Stili */}
                            <div className="space-y-2 mb-3">
                              <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                                <span className="text-white font-semibold">{match.homeTeam}</span>
                                <div className="flex items-center gap-2">
                                  <Trophy className="w-4 h-4 text-yellow-400" />
                                  <span className="text-sm text-slate-400">Ev Sahibi</span>
                                </div>
                              </div>
                              <div className="text-center text-xs text-slate-500 font-bold">VS</div>
                              <div className="flex items-center justify-between py-2">
                                <span className="text-white font-semibold">{match.awayTeam}</span>
                                <span className="text-sm text-slate-400">Deplasman</span>
                              </div>
                            </div>

                            {/* Tahmin ve Güven Skoru */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                                <div className="text-xs text-slate-400 mb-1">MS1</div>
                                <div className="text-sm font-bold text-white">%{match.prediction.home}</div>
                              </div>
                              <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                                <div className="text-xs text-slate-400 mb-1">X</div>
                                <div className="text-sm font-bold text-white">%{match.prediction.draw}</div>
                              </div>
                              <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                                <div className="text-xs text-slate-400 mb-1">MS2</div>
                                <div className="text-sm font-bold text-white">%{match.prediction.away}</div>
                              </div>
                            </div>

                            {/* Güven Skoru Badge */}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-400">Güven Skoru:</span>
                              <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                match.confidence >= 70 ? 'bg-green-500/20 text-green-400' :
                                match.confidence >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 
                                'bg-red-500/20 text-red-400'
                              }`}>
                                %{match.confidence}
                              </div>
                            </div>

                            {/* Öneri */}
                            {match.recommendation && (
                              <div className="mt-3 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                <div className="text-xs text-blue-400 font-semibold mb-1">AI Önerisi:</div>
                                <p className="text-sm text-slate-300">{match.recommendation}</p>
                              </div>
                            )}
                          </div>
                        ))}
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
