import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { analysisService } from '../services/analysisService';
import { CouponAnalysis } from '../types';
import { Loader, TrendingUp, ChevronDown, ChevronUp, Database, Clock } from 'lucide-react';

export const UserAnalyses: React.FC = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<CouponAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<CouponAnalysis | null>(null);
  const [expandedMatches, setExpandedMatches] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadAnalyses = async () => {
      // ✅ KRITIK FIX: User yoksa işlem yapma
      if (!user || !user.uid) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const data = await analysisService.getUserAnalyses(user.uid);
        setAnalyses(data);
      } catch (error: any) {
        console.error('Analizler yüklenemedi:', error);
        setError(error.message || 'Analizler yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadAnalyses();
  }, [user]);

  const toggleMatchExpand = (matchId: string) => {
    setExpandedMatches((prev) => ({ ...prev, [matchId]: !prev[matchId] }));
  };

  // ✅ User yoksa loading göster
  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-slate-400">Kullanıcı bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-slate-400">Analizler yükleniyor...</p>
        </div>
      </div>
    );
  }

  // ✅ Hata durumu
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-400 font-semibold mb-2">❌ Hata Oluştu</p>
          <p className="text-slate-300 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            Sayfayı Yenile
          </button>
        </div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-8 max-w-md mx-auto">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-white font-semibold text-lg mb-2">Henüz analiz yok</p>
          <p className="text-slate-400 text-sm">
            Kupon görseli yükleyerek ilk analizinizi başlatın
          </p>
        </div>
      </div>
    );
  }

  if (selectedAnalysis) {
    return (
      <div>
        <button
          onClick={() => setSelectedAnalysis(null)}
          className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition flex items-center gap-2"
        >
          <span>←</span> Geri Dön
        </button>

        <div className="space-y-6">
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">📋 Kupon Görseli</h3>
              <div className="text-right">
                <p className="text-slate-400 text-sm">Analiz Tarihi</p>
                <p className="text-white font-medium">
                  {new Date(selectedAnalysis.uploadedAt).toLocaleDateString('tr-TR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            <img
              src={selectedAnalysis.imageUrl}
              alt="Kupon"
              className="w-full max-h-[500px] object-contain rounded-lg border-2 border-slate-600"
            />
          </div>

          {selectedAnalysis.analysis.finalCoupon && selectedAnalysis.analysis.finalCoupon.length > 0 && (
            <div className="bg-white/95 rounded-xl shadow-lg p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Kupon Tutarı</h3>
                  <p className="text-xs text-slate-500">Toplam Oran</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-800">{selectedAnalysis.analysis.totalOdds.toFixed(2)}</p>
                  <p className="text-xs text-green-600 font-medium">{selectedAnalysis.analysis.confidence}% Güven</p>
                </div>
              </div>
              <div className="space-y-2">
                {selectedAnalysis.analysis.finalCoupon.map((pick, idx) => {
                  const parts = pick.split(' - ');
                  const teamName = parts[0];
                  const prediction = parts[1] || '';
                  return (
                    <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-orange-500 text-white text-xs font-bold rounded">
                              {idx + 1}
                            </span>
                            <span className="text-xs text-slate-500">CANLI</span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{teamName}</h4>
                          <p className="text-xs text-slate-500">Bugün 22:00</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-center">
                            <div className="bg-slate-700 text-white px-3 py-1.5 rounded font-bold text-sm min-w-[45px]">
                              {prediction}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-medium mb-1">Gerçek Zamanlı Veri Analizi</h4>
                <p className="text-slate-300 text-sm">
                  Bu analiz, Sportsradar API ve Google Search ile toplanan güncel verilerle yapılmıştır.
                  Her maç için takım formu, sakatlıklar ve istatistikler gerçek zamanlı olarak toplanmıştır.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">🔍 Detaylı Maç Analizleri</h3>
            {selectedAnalysis.analysis.matches.map((match) => {
              const isExpanded = expandedMatches[match.matchId];
              const dataQuality = (match as any).dataQuality;
              const confidenceColor =
                match.predictions.ms1.confidence >= 80 ? 'text-green-400' :
                match.predictions.ms1.confidence >= 70 ? 'text-yellow-400' :
                'text-red-400';

              return (
                <div key={match.matchId} className="bg-slate-700/50 border border-slate-600 rounded-lg overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-slate-700/70 transition"
                    onClick={() => toggleMatchExpand(match.matchId)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-xs text-slate-400 mb-1">{match.league}</p>
                        <h4 className="text-white font-bold">
                          {match.teams[0]} <span className="text-slate-400">vs</span> {match.teams[1]}
                        </h4>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={`font-medium ${confidenceColor}`}>
                        Güven: {Math.max(
                          match.predictions.ms1.confidence,
                          match.predictions.ms2?.confidence || 0,
                          match.predictions.beraberlik?.confidence || 0
                        )}%
                      </span>
                      {dataQuality && (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Database className="w-4 h-4" />
                          {dataQuality.sources} kaynak
                        </span>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-600 p-4 space-y-4 bg-slate-800/30">
                      <div>
                        <h5 className="text-white font-semibold mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Tahmin Oranları
                        </h5>
                        <div className="grid grid-cols-3 gap-2">
                          {match.predictions.ms1 && (
                            <div className="bg-slate-700 rounded p-2 text-center">
                              <p className="text-slate-400 text-xs mb-1">MS1</p>
                              <p className="text-white font-bold">{match.predictions.ms1.odds}</p>
                              <p className="text-xs text-slate-400">{match.predictions.ms1.confidence}%</p>
                            </div>
                          )}
                          {match.predictions.beraberlik && (
                            <div className="bg-slate-700 rounded p-2 text-center">
                              <p className="text-slate-400 text-xs mb-1">Beraberlik</p>
                              <p className="text-white font-bold">{match.predictions.beraberlik.odds}</p>
                              <p className="text-xs text-slate-400">{match.predictions.beraberlik.confidence}%</p>
                            </div>
                          )}
                          {match.predictions.ms2 && (
                            <div className="bg-slate-700 rounded p-2 text-center">
                              <p className="text-slate-400 text-xs mb-1">MS2</p>
                              <p className="text-white font-bold">{match.predictions.ms2.odds}</p>
                              <p className="text-xs text-slate-400">{match.predictions.ms2.confidence}%</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {match.realData && (
                        <div>
                          <h5 className="text-white font-semibold mb-2 flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Gerçek Veriler
                          </h5>
                          <div className="space-y-2 text-sm">
                            <div className="bg-slate-700/50 rounded p-2">
                              <p className="text-slate-400 text-xs mb-1">Ev Sahibi Formu</p>
                              <p className="text-slate-200">{match.realData.homeForm}</p>
                            </div>
                            <div className="bg-slate-700/50 rounded p-2">
                              <p className="text-slate-400 text-xs mb-1">Deplasman Formu</p>
                              <p className="text-slate-200">{match.realData.awayForm}</p>
                            </div>
                            <div className="bg-slate-700/50 rounded p-2">
                              <p className="text-slate-400 text-xs mb-1">Kafa Kafaya (H2H)</p>
                              <p className="text-slate-200">{match.realData.h2h}</p>
                            </div>
                            {match.realData.injuries && (
                              <div className="bg-slate-700/50 rounded p-2">
                                <p className="text-slate-400 text-xs mb-1">Sakatlıklar</p>
                                <p className="text-slate-200">{match.realData.injuries}</p>
                              </div>
                            )}
                            {match.realData.leaguePosition && (
                              <div className="bg-slate-700/50 rounded p-2">
                                <p className="text-slate-400 text-xs mb-1">Lig Durumu</p>
                                <p className="text-slate-200">{match.realData.leaguePosition}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {dataQuality && (
                        <div className="border-t border-slate-600 pt-3">
                          <h5 className="text-white font-semibold mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Veri Kalitesi
                          </h5>
                          <div className="space-y-1 text-sm">
                            <p className="text-slate-300">
                              Güven Skoru: <span className="font-bold text-cyan-400">{dataQuality.confidence}/100</span>
                            </p>
                            <p className="text-slate-300">
                              Kaynak Sayısı: <span className="font-bold text-cyan-400">{dataQuality.sources}</span>
                            </p>
                            {dataQuality.lastUpdated && (
                              <p className="text-slate-300">
                                Son Güncelleme: <span className="font-bold text-cyan-400">{dataQuality.lastUpdated}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {selectedAnalysis.analysis.recommendations && selectedAnalysis.analysis.recommendations.length > 0 && (
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <h3 className="text-base font-bold text-white mb-3">💡 Notlar</h3>
              <div className="space-y-2">
                {selectedAnalysis.analysis.recommendations.map((rec, idx) => (
                  <p key={idx} className="text-slate-300 text-sm leading-relaxed">
                    • {rec}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Analiz Geçmişi</h2>

      <div className="space-y-4">
        {analyses.map((analysis) => (
          <div
            key={analysis.id}
            className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition cursor-pointer"
            onClick={() => setSelectedAnalysis(analysis)}
          >
            <div className="flex items-start gap-4">
              <img
                src={analysis.imageUrl}
                alt="Kupon"
                className="w-20 h-20 object-cover rounded"
              />
              <div className="flex-1">
                <p className="text-white font-medium mb-1">
                  {analysis.analysis.matches.length} maç analizi
                </p>
                <p className="text-slate-400 text-sm mb-2">
                  {new Date(analysis.uploadedAt).toLocaleString('tr-TR')}
                </p>
                <p className="text-slate-300 text-sm">
                  Toplam Oran: {analysis.analysis.totalOdds.toFixed(2)} | Güven: {analysis.analysis.confidence}%
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
