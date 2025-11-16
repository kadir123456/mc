// src/components/MatchStatsModal.tsx
import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Activity, Target, Shield, AlertCircle, Zap, Trophy, Loader2, Award, Flame, History } from 'lucide-react';
import { Match } from '../services/matchService';
import { teamStatsService, TeamStatistics } from '../services/teamStatsService';
import { teamAnalysisService, TeamAnalysisResult } from '../services/teamAnalysisService';
import { useAuth } from '../context/AuthContext';

interface MatchStatsModalProps {
  match: Match;
  onClose: () => void;
}

export const MatchStatsModal: React.FC<MatchStatsModalProps> = ({ match, onClose }) => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState<TeamStatistics | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<TeamAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTeamStats();
  }, [match.fixtureId]);

  const loadTeamStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Takım istatistikleri yükleniyor...');
      console.log('Home Team ID:', match.homeTeamId);
      console.log('Away Team ID:', match.awayTeamId);
      console.log('League ID:', match.leagueId);
      console.log('Season:', match.season);

      // Her iki takımın istatistiklerini çek
      const teamStats = await teamStatsService.getMatchTeamStats(
        match.homeTeamId,
        match.awayTeamId,
        match.leagueId,
        match.season
      );

      setStats(teamStats);
      console.log('✅ Takım istatistikleri yüklendi:', teamStats);
      
    } catch (err: any) {
      console.error('❌ İstatistik yükleme hatası:', err);
      setError(err.message || 'İstatistikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!stats || !user) return;

    // Kredi kontrolü
    if (user.credits < 1) {
      alert('Yetersiz kredi! AI analizi için 1 kredi gerekli.');
      return;
    }

    try {
      setAnalyzing(true);

      // AI analizi yap
      const result = await teamAnalysisService.analyzeTeamStats(
        stats,
        match.homeTeam,
        match.awayTeam
      );

      setAiAnalysis(result);

      // ✅ 1 kredi düş (backend'e istek at)
      const response = await fetch('/api/auth/deduct-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.uid,
          amount: 1,
          reason: `AI Analiz: ${match.homeTeam} vs ${match.awayTeam}`
        })
      });

      if (response.ok) {
        // Local state güncelle
        setUser({ ...user, credits: user.credits - 1 });
        console.log('✅ 1 kredi düşürüldü');
      }

    } catch (err: any) {
      alert(err.message || 'AI analizi yapılamadı');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
        
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 z-10">
          <div className="p-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">
                {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
              </h2>
              <p className="text-sm text-slate-400">{match.league} • {match.date} {match.time}</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          {/* AI Analiz Butonu - ÜST KISIMDAI */}
          {stats && !loading && !error && (
            <div className="px-4 pb-4">
              <button
                onClick={handleAIAnalysis}
                disabled={analyzing || !user || user.credits < 1}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg hover:shadow-xl"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analiz Ediliyor...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    AI ile Detaylı Analiz Et (1 Kredi)
                  </>
                )}
              </button>
              {user && user.credits < 1 && (
                <p className="text-xs text-yellow-400 mt-2 text-center">
                  Yetersiz kredi. Analiz için 1 kredi gerekli.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-300">Takım istatistikleri yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
              <p className="text-yellow-400 text-lg mb-2">{error}</p>
              <button
                onClick={loadTeamStats}
                className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Tekrar Dene
              </button>
            </div>
          ) : stats ? (
            <div className="space-y-6">
              
              {/* AI Analiz Sonuçları - EN ÜSTTEani */}
              {aiAnalysis && (
                <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-2 border-blue-500/50 rounded-xl p-6 space-y-4 animate-in fade-in-50 duration-300">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                    <h3 className="text-xl font-bold text-white">AI Tahmin Sonucu</h3>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <PredictionCard
                      label="Maç Sonucu"
                      value={aiAnalysis.msPredict}
                      color="green"
                    />
                    <PredictionCard
                      label="İlk Yarı"
                      value={aiAnalysis.firstHalfPredict}
                      color="blue"
                    />
                    <PredictionCard
                      label="Karşılıklı Gol"
                      value={aiAnalysis.bttsPredict}
                      color="purple"
                    />
                    <PredictionCard
                      label="2.5 Gol"
                      value={aiAnalysis.over25Predict}
                      color="orange"
                    />
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-white mb-2">Teknik Analiz:</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {aiAnalysis.technicalAnalysis}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Güven Skoru:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            aiAnalysis.confidenceScore >= 70 
                              ? 'bg-green-500' 
                              : aiAnalysis.confidenceScore >= 50 
                              ? 'bg-yellow-500' 
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${aiAnalysis.confidenceScore}%` }}
                        ></div>
                      </div>
                      <span className="text-lg font-bold text-white">
                        %{aiAnalysis.confidenceScore}
                      </span>
                    </div>
                  </div>

                  {/* Key Factors */}
                  {aiAnalysis.keyFactors && aiAnalysis.keyFactors.length > 0 && (
                    <div className="bg-slate-800/30 rounded-lg p-3">
                      <h4 className="text-sm font-bold text-white mb-2">Önemli Faktörler:</h4>
                      <ul className="space-y-1">
                        {aiAnalysis.keyFactors.map((factor, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-blue-400">•</span>
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs text-slate-400 border-t border-slate-700 pt-4">
                    <div>
                      <strong className="text-slate-300">🎯 MS:</strong> {aiAnalysis.reasoning.msReasoning}
                    </div>
                    <div>
                      <strong className="text-slate-300">⏱️ İY:</strong> {aiAnalysis.reasoning.firstHalfReasoning}
                    </div>
                    <div>
                      <strong className="text-slate-300">⚽ KG:</strong> {aiAnalysis.reasoning.bttsReasoning}
                    </div>
                    <div>
                      <strong className="text-slate-300">📊 2.5:</strong> {aiAnalysis.reasoning.over25Reasoning}
                    </div>
                  </div>
                </div>
              )}

              {/* Puan Durumu Karşılaştırma */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-white font-bold">Puan Durumu</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <StandingCard team={stats.homeTeam} isHome />
                  <StandingCard team={stats.awayTeam} isHome={false} />
                </div>
              </div>

              {/* Form Durumu */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="w-5 h-5 text-red-400" />
                  <h3 className="text-white font-bold">Son 5 Maç Formu</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormDisplay team={stats.homeTeam} />
                  <FormDisplay team={stats.awayTeam} />
                </div>
              </div>

              {/* İstatistikler */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-green-400" />
                  <h3 className="text-white font-bold">Sezon İstatistikleri</h3>
                </div>
                <div className="space-y-3">
                  <StatComparison
                    label="Galibiyet"
                    homeValue={stats.homeTeam.wins}
                    awayValue={stats.awayTeam.wins}
                    homeTotal={stats.homeTeam.played}
                    awayTotal={stats.awayTeam.played}
                  />
                  <StatComparison
                    label="Beraberlik"
                    homeValue={stats.homeTeam.draws}
                    awayValue={stats.awayTeam.draws}
                    homeTotal={stats.homeTeam.played}
                    awayTotal={stats.awayTeam.played}
                  />
                  <StatComparison
                    label="Mağlubiyet"
                    homeValue={stats.homeTeam.losses}
                    awayValue={stats.awayTeam.losses}
                    homeTotal={stats.homeTeam.played}
                    awayTotal={stats.awayTeam.played}
                  />
                  <StatComparison
                    label="Attığı Gol"
                    homeValue={stats.homeTeam.goalsFor}
                    awayValue={stats.awayTeam.goalsFor}
                    suffix=" gol"
                  />
                  <StatComparison
                    label="Yediği Gol"
                    homeValue={stats.homeTeam.goalsAgainst}
                    awayValue={stats.awayTeam.goalsAgainst}
                    suffix=" gol"
                  />
                  <StatComparison
                    label="Averaj"
                    homeValue={stats.homeTeam.goalDifference}
                    awayValue={stats.awayTeam.goalDifference}
                    showSign
                  />
                </div>
              </div>

              {/* Kafa Kafaya Geçmiş */}
              {stats.headToHead.totalMatches > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-5 h-5 text-purple-400" />
                    <h3 className="text-white font-bold">Kafa Kafaya Geçmiş</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="bg-green-600/20 rounded-lg p-3">
                      <p className="text-2xl font-bold text-green-400">{stats.headToHead.homeWins}</p>
                      <p className="text-xs text-slate-400">{match.homeTeam}</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-slate-300">{stats.headToHead.draws}</p>
                      <p className="text-xs text-slate-400">Beraberlik</p>
                    </div>
                    <div className="bg-blue-600/20 rounded-lg p-3">
                      <p className="text-2xl font-bold text-blue-400">{stats.headToHead.awayWins}</p>
                      <p className="text-xs text-slate-400">{match.awayTeam}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {stats.headToHead.lastMatches.map((match, idx) => (
                      <div key={idx} className="bg-slate-700/30 rounded p-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">{match.date}</span>
                          <span className="text-white font-medium">{match.homeTeam} {match.score} {match.awayTeam}</span>
                          <span className="text-green-400 text-[10px]">{match.winner}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// Yardımcı Bileşenler

const StandingCard: React.FC<{ team: any; isHome: boolean }> = ({ team, isHome }) => (
  <div className={`p-4 rounded-lg ${isHome ? 'bg-green-600/10 border border-green-600/30' : 'bg-blue-600/10 border border-blue-600/30'}`}>
    <h4 className="text-sm font-bold text-white mb-2">{team.teamName}</h4>
    <div className="space-y-1 text-xs">
      <div className="flex justify-between">
        <span className="text-slate-400">Sıra:</span>
        <span className="text-white font-bold">{team.position || 'N/A'}.</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-400">Puan:</span>
        <span className="text-white font-bold">{team.points}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-400">Oynanan:</span>
        <span className="text-white">{team.played}</span>
      </div>
    </div>
  </div>
);

const FormDisplay: React.FC<{ team: any }> = ({ team }) => (
  <div>
    <h4 className="text-sm text-slate-400 mb-2">{team.teamName}</h4>
    <div className="flex gap-1 justify-center">
      {team.form.split('').map((result: string, idx: number) => (
        <div
          key={idx}
          className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
            result === 'W' ? 'bg-green-600 text-white' :
            result === 'D' ? 'bg-yellow-600 text-white' :
            result === 'L' ? 'bg-red-600 text-white' :
            'bg-slate-700 text-slate-400'
          }`}
        >
          {result}
        </div>
      ))}
    </div>
  </div>
);

const StatComparison: React.FC<{
  label: string;
  homeValue: number;
  awayValue: number;
  homeTotal?: number;
  awayTotal?: number;
  suffix?: string;
  showSign?: boolean;
}> = ({ label, homeValue, awayValue, homeTotal, awayTotal, suffix = '', showSign = false }) => {
  const total = Math.abs(homeValue) + Math.abs(awayValue);
  const homePercent = total > 0 ? (Math.abs(homeValue) / total) * 100 : 50;

  const formatValue = (val: number) => {
    if (showSign && val > 0) return `+${val}`;
    return val.toString();
  };

  return (
    <div>
      <p className="text-xs text-slate-400 mb-1.5">{label}</p>
      <div className="flex items-center gap-3">
        <span className="text-white font-bold w-16 text-right">
          {formatValue(homeValue)}{suffix}
          {homeTotal && ` (${((homeValue / homeTotal) * 100).toFixed(0)}%)`}
        </span>
        <div className="flex-1 bg-slate-700 h-2.5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
            style={{ width: `${homePercent}%` }}
          ></div>
        </div>
        <span className="text-white font-bold w-16">
          {formatValue(awayValue)}{suffix}
          {awayTotal && ` (${((awayValue / awayTotal) * 100).toFixed(0)}%)`}
        </span>
      </div>
    </div>
  );
};

const PredictionCard: React.FC<{
  label: string;
  value: string;
  color: 'green' | 'blue' | 'purple' | 'orange';
}> = ({ label, value, color }) => {
  const colorMap = {
    green: 'bg-green-600/20 border-green-500',
    blue: 'bg-blue-600/20 border-blue-500',
    purple: 'bg-purple-600/20 border-purple-500',
    orange: 'bg-orange-600/20 border-orange-500'
  };

  return (
    <div className={`p-3 rounded-lg text-center border-2 ${colorMap[color]}`}>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-white">{value}</p>
    </div>
  );
};