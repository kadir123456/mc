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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="text-center">
          <Ticket className="w-20 h-20 mx-auto text-slate-600 mb-6" />
          <p className="text-white text-xl mb-6">Analizleri görmek için giriş yapmalısınız</p>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all hover:scale-105 shadow-lg"
          >Giriş Yap</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-6"></div>
          <p className="text-white text-xl">Analizler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-32 md:pb-12 md:pt-20">
      {/* Header */}
      <header className="md:hidden bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-white">Analizler</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Desktop Header */}
        <div className="hidden md:block mb-10">
          <h1 className="text-4xl font-bold text-white mb-3 flex items-center gap-4">
            <Ticket className="w-10 h-10 text-blue-400" />
            Kuponlarım
          </h1>
          <p className="text-slate-400 text-lg">AI analiz sonuçlarınız</p>
        </div>

        {coupons.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl shadow-lg">
            <Ticket className="w-20 h-20 mx-auto text-slate-600 mb-6" />
            <p className="text-slate-300 text-2xl mb-3">Henüz Analiziniz yok</p>
            <p className="text-slate-500 text-lg mb-8">Bülten'den maç seçerek ilk analizini oluşturun</p>
            <button
              onClick={() => navigate('/bulletin')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all hover:scale-105 shadow-lg"
            >Maçları Görüntüle</button>
          </div>
        ) : (
          <div className="space-y-5">
            {coupons.map((coupon) => {
              const isExpanded = expandedCoupon === coupon.id;

              return (
                <div
                  key={coupon.id}
                  className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all duration-300 shadow-lg"
                >
                  {/* Kupon Header */}
                  <button
                    onClick={() => toggleCoupon(coupon.id)}
                    className="w-full p-6 text-left hover:bg-slate-800/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Ticket className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-xl">Kupon #{coupon.id.slice(-6)}</h3>
                          <div className="flex items-center gap-4 text-sm text-slate-400 mt-2">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              {new Date(coupon.purchasedAt).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </div>
                            <span>•</span>
                            <span>{coupon.matches.length} Maç</span>
                            <span>•</span>
                            <span className="text-yellow-400 font-semibold">{coupon.creditsUsed} Kredi</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            shareCoupon(coupon);
                          }}
                          className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
                        >
                          <Share2 className="w-5 h-5 text-slate-400" />
                        </button>
                        {isExpanded ? (
                          <ChevronUp className="w-6 h-6 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Kupon Detayı */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/50 bg-slate-800/30">
                      {/* Yeni Format: Image Analysis Sonuçları */}
                      {coupon.matches && Array.isArray(coupon.matches) && !coupon.analysis && (
                        <div className="p-6 space-y-4">
                          <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                            <p className="text-blue-300 font-semibold">
                              Analiz Tipi: {
                                coupon.analysisType === 'macSonucu' ? 'Maç Sonucu' :
                                coupon.analysisType === 'karsilikliGol' ? 'Karşılıklı Gol' :
                                coupon.analysisType === 'altustu' ? '2.5 Alt/Üst' :
                                coupon.analysisType === 'ilkYariSonucu' ? 'İlk Yarı Sonucu' :
                                coupon.analysisType === 'ilkYariMac' ? 'İlk Yarı/Maç Sonucu' :
                                coupon.analysisType === 'handikap' ? 'Handikap' :
                                coupon.analysisType === 'hepsi' ? 'Tüm Değerlendirmeler' : 'Genel Analiz'
                              }
                            </p>
                          </div>
                          {coupon.matches.map((match: any, index: number) => (
                            <div
                              key={index}
                              className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-5 hover:border-blue-500/30 transition-all"
                              data-testid={`coupon-match-${index}`}
                            >
                              <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                      {index + 1}
                                    </div>
                                    <span className="text-sm text-blue-300 font-semibold">
                                      {match.league}
                                    </span>
                                  </div>
                                  <p className="text-white font-bold text-lg mb-2">
                                    {match.homeTeam} <span className="text-slate-500 mx-2">vs</span> {match.awayTeam}
                                  </p>
                                  <p className="text-sm text-slate-400">
                                    {new Date(match.date).toLocaleDateString('tr-TR', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                              
                              {match.prediction && (
                                <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-4 mt-4">
                                  <p className="text-sm text-green-300 font-semibold mb-2">İstatistiksel Değerlendirme:</p>
                                  <p className="text-white font-bold text-lg whitespace-pre-wrap leading-relaxed">{match.prediction}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Eski Format: Standart Kuponlar */}
                      {coupon.analysis && coupon.analysis.length > 0 && (
                        <div className="p-6 space-y-4">
                        {coupon.analysis.map((match, index) => {
                          // En yüksek istatistiksel değerlendirmeyi bul
                          const predictions = [
                            { type: 'MS1 (Ev Sahibi)', value: match.predictions.ms1, key: 'ms1' },
                            { type: 'X (Beraberlik)', value: match.predictions.msX, key: 'msX' },
                            { type: 'MS2 (Deplasman)', value: match.predictions.ms2, key: 'ms2' }
                          ];
                          const bestPrediction = predictions.reduce((max, p) => p.value > max.value ? p : max);

                          return (
                            <div
                              key={match.fixtureId}
                              className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-5 hover:border-blue-500/30 transition-all"
                            >
                              {/* Başlık: Maç No + Lig */}
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {index + 1}
                                  </div>
                                  <span className="text-sm text-blue-300 font-semibold">
                                    {translateLeague(match.league)}
                                  </span>
                                </div>
                                <span className="text-xs text-slate-500">
                                  {new Date(match.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} • {match.time}
                                </span>
                              </div>

                              {/* Takımlar - Kompakt Görünüm */}
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-white font-bold text-base">{translateTeam(match.homeTeam)}</span>
                                  <span className="text-sm text-slate-500 px-3">vs</span>
                                  <span className="text-white font-bold text-base">{translateTeam(match.awayTeam)}</span>
                                </div>
                              </div>

                              {/* İstatistiksel Değerlendirme - Tablo Formatı */}
                              <div className="bg-slate-800/50 rounded-xl p-3 mb-4">
                                <div className="grid grid-cols-3 gap-3 text-center">
                                  <div className={`${bestPrediction.key === 'ms1' ? 'bg-green-600/20 border border-green-500/30' : ''} rounded-lg p-3`}>
                                    <div className="text-xs text-slate-400 mb-1">Ev Sahibi</div>
                                    <div className={`text-sm font-bold ${bestPrediction.key === 'ms1' ? 'text-green-400' : 'text-white'}`}>
                                      %{match.predictions.ms1}
                                    </div>
                                  </div>
                                  <div className={`${bestPrediction.key === 'msX' ? 'bg-yellow-600/20 border border-yellow-500/30' : ''} rounded-lg p-3`}>
                                    <div className="text-xs text-slate-400 mb-1">Beraberlik</div>
                                    <div className={`text-sm font-bold ${bestPrediction.key === 'msX' ? 'text-yellow-400' : 'text-white'}`}>
                                      %{match.predictions.msX}
                                    </div>
                                  </div>
                                  <div className={`${bestPrediction.key === 'ms2' ? 'bg-blue-600/20 border border-blue-500/30' : ''} rounded-lg p-3`}>
                                    <div className="text-xs text-slate-400 mb-1">Deplasman</div>
                                    <div className={`text-sm font-bold ${bestPrediction.key === 'ms2' ? 'text-blue-400' : 'text-white'}`}>
                                      %{match.predictions.ms2}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* AI Tavsiyesi - Kompakt */}
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <Trophy className="w-4 h-4 text-yellow-400" />
                                  <span className="text-slate-400">AI Tavsiye:</span>
                                  <span className="text-white font-bold">{bestPrediction.type}</span>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  match.confidence >= 70 ? 'bg-green-500/20 text-green-400' :
                                  match.confidence >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  Güven: %{match.confidence}
                                </div>
                              </div>

                              {/* Öneri Metni - Opsiyonel */}
                              {match.recommendation && (
                                <div className="mt-4 bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                                  <p className="text-sm text-slate-300 leading-relaxed">{match.recommendation}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        </div>
                      )}

                      {/* Genel Analiz - Sadece eski kuponlar için */}
                      {coupon.analysis && coupon.analysis[0]?.analysis && (
                        <div className="border-t border-slate-800/50 p-6">
                          <h4 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                            Genel Değerlendirme
                          </h4>
                          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
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