// src/components/MatchStatsModal.tsx
import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Activity, Target, Shield, AlertCircle, Zap, Trophy } from 'lucide-react';
import { Match } from '../services/matchService';
import { statsAnalysisService, MatchStatistics, StatisticalAnalysisResult } from '../services/statsAnalysisService';

interface MatchStatsModalProps {
  match: Match;
  onClose: () => void;
}

export const MatchStatsModal: React.FC<MatchStatsModalProps> = ({ match, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState<MatchStatistics | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<StatisticalAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMatchStats();
  }, [match.fixtureId]);

  const loadMatchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/football/fixtures/statistics?fixture=${match.fixtureId}`);
      const data = await response.json();
      
      if (data.response && data.response[0]) {
        const rawStats = data.response[0].statistics;
        const parsed = parseStatistics(rawStats);
        setStats(parsed);
      } else {
        setError('Maç istatistikleri bulunamadı');
      }
    } catch (err: any) {
      console.error('İstatistik yükleme hatası:', err);
      setError('İstatistikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const parseStatistics = (rawStats: any): MatchStatistics => {
    const home = rawStats[0]?.statistics || [];
    const away = rawStats[1]?.statistics || [];

    const getStat = (arr: any[], type: string) => {
      const item = arr.find((s: any) => s.type === type);
      return item?.value || 0;
    };

    return {
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league,
      date: match.date,
      time: match.time,
      homeShots: getStat(home, 'Total Shots'),
      awayShots: getStat(away, 'Total Shots'),
      homeShotsOnTarget: getStat(home, 'Shots on Goal'),
      awayShotsOnTarget: getStat(away, 'Shots on Goal'),
      homexG: getStat(home, 'expected_goals'),
      awayxG: getStat(away, 'expected_goals'),
      homePossession: parseInt(getStat(home, 'Ball Possession')?.toString().replace('%', '') || '0'),
      awayPossession: parseInt(getStat(away, 'Ball Possession')?.toString().replace('%', '') || '0'),
      homeBigChances: getStat(home, 'Big Chances'),
      awayBigChances: getStat(away, 'Big Chances'),
      homeCorners: getStat(home, 'Corner Kicks'),
      awayCorners: getStat(away, 'Corner Kicks'),
      homeFouls: getStat(home, 'Fouls'),
      awayFouls: getStat(away, 'Fouls'),
      homeYellowCards: getStat(home, 'Yellow Cards'),
      awayYellowCards: getStat(away, 'Yellow Cards'),
      homeTotalAttacks: getStat(home, 'Total Attacks'),
      awayTotalAttacks: getStat(away, 'Total Attacks'),
      homeDangerousAttacks: getStat(home, 'Dangerous Attacks'),
      awayDangerousAttacks: getStat(away, 'Dangerous Attacks'),
    };
  };

  const handleAIAnalysis = async () => {
    if (!stats) return;

    try {
      setAnalyzing(true);
      const result = await statsAnalysisService.analyzeMatchStats(stats);
      setAiAnalysis(result);
    } catch (err: any) {
      alert(err.message || 'AI analizi yapılamadı');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-white">{match.homeTeam} vs {match.awayTeam}</h2>
            <p className="text-sm text-slate-400">{match.league}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
            <p className="text-red-400">{error}</p>
          </div>
        ) : stats ? (
          <div className="p-6 space-y-6">
            {stats.homexG && stats.awayxG && (
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-blue-400" />
                  <h3 className="text-white font-bold">Expected Goals (xG)</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-400">{stats.homexG?.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">{stats.homeTeam}</p>
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${((stats.homexG || 0) / ((stats.homexG || 0) + (stats.awayxG || 0))) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-400">{stats.awayxG?.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">{stats.awayTeam}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-green-400" />
                <h3 className="text-white font-bold">Şutlar</h3>
              </div>
              <div className="space-y-3">
                <StatRow 
                  label="Toplam Şut"
                  homeValue={stats.homeShots || 0}
                  awayValue={stats.awayShots || 0}
                />
                <StatRow 
                  label="İsabetli Şut"
                  homeValue={stats.homeShotsOnTarget || 0}
                  awayValue={stats.awayShotsOnTarget || 0}
                />
              </div>
            </div>

            {stats.homePossession && stats.awayPossession && (
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-white font-bold">Topa Sahip Olma</h3>
                </div>
                <StatRow 
                  label=""
                  homeValue={stats.homePossession}
                  awayValue={stats.awayPossession}
                  isPercentage
                />
              </div>
            )}

            <div className="bg-slate-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-red-400" />
                <h3 className="text-white font-bold">Ataklar</h3>
              </div>
              <div className="space-y-3">
                <StatRow 
                  label="Toplam Atak"
                  homeValue={stats.homeTotalAttacks || 0}
                  awayValue={stats.awayTotalAttacks || 0}
                />
                <StatRow 
                  label="Tehlikeli Atak"
                  homeValue={stats.homeDangerousAttacks || 0}
                  awayValue={stats.awayDangerousAttacks || 0}
                />
                <StatRow 
                  label="Büyük Pozisyon"
                  homeValue={stats.homeBigChances || 0}
                  awayValue={stats.awayBigChances || 0}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <h4 className="text-sm text-slate-400 mb-2">Kornerler</h4>
                <StatRow 
                  label=""
                  homeValue={stats.homeCorners || 0}
                  awayValue={stats.awayCorners || 0}
                />
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <h4 className="text-sm text-slate-400 mb-2">Sarı Kartlar</h4>
                <StatRow 
                  label=""
                  homeValue={stats.homeYellowCards || 0}
                  awayValue={stats.awayYellowCards || 0}
                />
              </div>
            </div>

            {!aiAnalysis ? (
              <button
                onClick={handleAIAnalysis}
                disabled={analyzing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition"
              >
                {analyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Analiz Ediliyor...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    AI ile Analiz Et
                  </>
                )}
              </button>
            ) : (
              <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-2 border-blue-500/50 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-xl font-bold text-white">AI Tahmin Sonucu</h3>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className={`p-4 rounded-lg text-center ${aiAnalysis.msPredict === 'MS 1' ? 'bg-green-600/30 border-2 border-green-500' : 'bg-slate-800/50'}`}>
                    <p className="text-xs text-slate-400 mb-1">Maç Sonucu</p>
                    <p className="text-lg font-bold text-white">{aiAnalysis.msPredict}</p>
                  </div>
                  <div className={`p-4 rounded-lg text-center ${aiAnalysis.firstHalfPredict === 'İY 1' ? 'bg-blue-600/30 border-2 border-blue-500' : 'bg-slate-800/50'}`}>
                    <p className="text-xs text-slate-400 mb-1">İlk Yarı</p>
                    <p className="text-lg font-bold text-white">{aiAnalysis.firstHalfPredict}</p>
                  </div>
                  <div className={`p-4 rounded-lg text-center ${aiAnalysis.bttsPredict === 'KG Var' ? 'bg-purple-600/30 border-2 border-purple-500' : 'bg-slate-800/50'}`}>
                    <p className="text-xs text-slate-400 mb-1">Karşılıklı Gol</p>
                    <p className="text-lg font-bold text-white">{aiAnalysis.bttsPredict}</p>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-sm text-slate-300 leading-relaxed">{aiAnalysis.technicalAnalysis}</p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Güven Skoru:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${aiAnalysis.confidenceScore >= 70 ? 'bg-green-500' : aiAnalysis.confidenceScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${aiAnalysis.confidenceScore}%` }}
                      ></div>
                    </div>
                    <span className="text-lg font-bold text-white">%{aiAnalysis.confidenceScore}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-400">
                  <p>🎯 MS Sebebi: {aiAnalysis.reasoning.msReasoning}</p>
                  <p>⏱️ İY Sebebi: {aiAnalysis.reasoning.firstHalfReasoning}</p>
                  <p>⚽ KG Sebebi: {aiAnalysis.reasoning.bttsReasoning}</p>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const StatRow: React.FC<{ label: string; homeValue: number; awayValue: number; isPercentage?: boolean }> = ({ 
  label, 
  homeValue, 
  awayValue, 
  isPercentage 
}) => {
  const total = homeValue + awayValue;
  const homePercent = total > 0 ? (homeValue / total) * 100 : 50;
  const awayPercent = 100 - homePercent;

  return (
    <div>
      {label && <p className="text-xs text-slate-400 mb-1">{label}</p>}
      <div className="flex items-center gap-3">
        <span className="text-white font-bold w-12 text-right">{homeValue}{isPercentage ? '%' : ''}</span>
        <div className="flex-1 bg-slate-700 h-2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
            style={{ width: `${homePercent}%` }}
          ></div>
        </div>
        <span className="text-white font-bold w-12">{awayValue}{isPercentage ? '%' : ''}</span>
      </div>
    </div>
  );
};
