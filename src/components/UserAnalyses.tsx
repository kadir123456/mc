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
          className="mb-6 text-blue-400 hover:text-blue-300 text-sm font-medium"
        >
          ← Geri Dön
        </button>

        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
          <div className="mb-6">
            <img
              src={selectedAnalysis.imageUrl}
              alt="Kupon"
              className="w-full max-h-96 object-cover rounded-lg"
            />
          </div>

          <h3 className="text-xl font-bold text-white mb-4">Analiz Sonuçları</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {selectedAnalysis.analysis.matches.map((match) => (
              <div key={match.matchId} className="bg-slate-600/50 p-4 rounded-lg">
                <h4 className="font-bold text-white mb-3">
                  {match.teams[0]} vs {match.teams[1]}
                </h4>
                <p className="text-slate-400 text-sm mb-4">{match.league}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">MS1</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{match.predictions.ms1.odds.toFixed(2)}</span>
                      <span className="text-xs text-green-400">{match.predictions.ms1.confidence}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">MS2</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{match.predictions.ms2.odds.toFixed(2)}</span>
                      <span className="text-xs text-green-400">{match.predictions.ms2.confidence}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Beraberlik</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{match.predictions.beraberlik.odds.toFixed(2)}</span>
                      <span className="text-xs text-green-400">{match.predictions.beraberlik.confidence}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Alt/Üst</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{match.predictions.altUst.odds.toFixed(2)}</span>
                      <span className="text-xs text-green-400">{match.predictions.altUst.confidence}%</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-500 pt-4 text-sm">
                  <p className="text-slate-300 mb-2"><span className="font-medium">Takım Formu:</span> {match.factors.teamForm}</p>
                  <p className="text-slate-300 mb-2"><span className="font-medium">Yaralılar:</span> {match.factors.injuries}</p>
                  <p className="text-slate-300 mb-2"><span className="font-medium">Hava:</span> {match.factors.weather}</p>
                  <p className="text-slate-300"><span className="font-medium">Başa Baş:</span> {match.factors.headToHead}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <h4 className="font-bold text-white">Genel İstatistikler</h4>
            </div>
            <p className="text-slate-300 mb-2">
              <span className="font-medium">Toplam Oran:</span> {selectedAnalysis.analysis.totalOdds.toFixed(2)}
            </p>
            <p className="text-slate-300">
              <span className="font-medium">Ortalama Güven:</span> {selectedAnalysis.analysis.confidence}%
            </p>
          </div>

          {selectedAnalysis.analysis.recommendations.length > 0 && (
            <div>
              <h4 className="font-bold text-white mb-3">Öneriler</h4>
              <ul className="space-y-2">
                {selectedAnalysis.analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-300">
                    <span className="text-blue-400 font-bold mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
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
