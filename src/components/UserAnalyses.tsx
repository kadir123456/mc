import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { analysisService } from '../services/analysisService';
import { CouponAnalysis } from '../types';
import { Loader, TrendingUp } from 'lucide-react';

export const UserAnalyses: React.FC = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<CouponAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<CouponAnalysis | null>(null);

  useEffect(() => {
    const loadAnalyses = async () => {
      if (!user) return;
      try {
        const data = await analysisService.getUserAnalyses(user.uid);
        setAnalyses(data);
      } catch (error) {
        console.error('Analizler yüklenemedi:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalyses();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 mb-4">Henüz analiz yok</p>
        <p className="text-slate-500 text-sm">Kupon görseli yükleyerek başla</p>
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

          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-400" />
              Analiz Özeti
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <p className="text-slate-400 text-sm mb-1">Toplam Maç</p>
                <p className="text-3xl font-bold text-white">{selectedAnalysis.analysis.matches.length}</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <p className="text-slate-400 text-sm mb-1">Toplam Oran</p>
                <p className="text-3xl font-bold text-green-400">{selectedAnalysis.analysis.totalOdds.toFixed(2)}</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <p className="text-slate-400 text-sm mb-1">Güven Skoru</p>
                <p className="text-3xl font-bold text-yellow-400">{selectedAnalysis.analysis.confidence}%</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-white mb-6">⚽ Maç Analizleri</h3>

            <div className="space-y-6">
              {selectedAnalysis.analysis.matches.map((match, index) => {
                const bestPrediction = Object.entries(match.predictions)
                  .sort((a, b) => b[1].confidence - a[1].confidence)[0];
                const predictionNames: Record<string, string> = {
                  ms1: 'Ev Sahibi Kazanır (MS1)',
                  ms2: 'Deplasman Kazanır (MS2)',
                  beraberlik: 'Beraberlik',
                  altUst: 'Alt/Üst',
                  handicap: 'Handikap'
                };

                return (
                  <div key={match.matchId} className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 border border-slate-600 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span className="inline-block bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-xs font-medium mb-3">
                          Maç {index + 1}
                        </span>
                        <h4 className="text-xl font-bold text-white mb-2">
                          {match.teams[0]} <span className="text-slate-500">vs</span> {match.teams[1]}
                        </h4>
                        <p className="text-slate-400 text-sm">🏆 {match.league}</p>
                      </div>
                    </div>

                    <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-4 mb-4">
                      <p className="text-green-400 text-sm font-medium mb-2">✅ ÖNERİLEN TAHMİN</p>
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-lg">{predictionNames[bestPrediction[0]]}</span>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-400">{bestPrediction[1].odds.toFixed(2)}</p>
                          <p className="text-xs text-green-300">Güven: {bestPrediction[1].confidence}%</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-slate-400 text-xs font-medium mb-3">TÜM TAHMİNLER</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(match.predictions).map(([key, value]) => (
                          <div key={key} className="bg-slate-600/30 p-3 rounded text-center">
                            <p className="text-slate-300 text-xs mb-1">{predictionNames[key]}</p>
                            <p className="text-white font-bold">{value.odds.toFixed(2)}</p>
                            <p className="text-xs text-green-400">{value.confidence}%</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-600 pt-4">
                      <p className="text-slate-400 text-xs font-medium mb-3">📊 DETAYLI ANALİZ</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-slate-400 mb-1">📈 Takım Formu</p>
                          <p className="text-white">{match.factors.teamForm}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 mb-1">🤕 Sakatlıklar</p>
                          <p className="text-white">{match.factors.injuries}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 mb-1">☁️ Hava Durumu</p>
                          <p className="text-white">{match.factors.weather}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 mb-1">⚔️ Geçmiş Karşılaşmalar</p>
                          <p className="text-white">{match.factors.headToHead}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedAnalysis.analysis.recommendations.length > 0 && (
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                💡 Stratejik Öneriler
              </h3>
              <div className="space-y-3">
                {selectedAnalysis.analysis.recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-slate-600/30 border border-slate-500 rounded-lg p-4 flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600/20 text-blue-400 rounded-full font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-slate-200 text-base leading-relaxed pt-1">{rec}</p>
                  </div>
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
