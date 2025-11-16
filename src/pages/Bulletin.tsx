import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Menu, X, Info, Clock, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { matchService, Match } from '../services/matchService';
import { geminiAnalysisService } from '../services/geminiAnalysisService';
import { couponService } from '../services/couponService';
import { authService } from '../services/authService';
import { translateLeague, translateTeam, formatMatchTime, getMatchStatusText, isMatchLive, isMatchFinished } from '../utils/leagueTranslations';
import { MatchStatsModal } from '../components/MatchStatsModal'; // ✅ YENİ

export const Bulletin: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  
  // Set userId globally for Gemini service
  React.useEffect(() => {
    if (user?.uid) {
      (window as any).currentUserId = user.uid;
    }
  }, [user]);

  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<Match[]>([]);
  const [analysisType, setAnalysisType] = useState<'standard' | 'detailed'>('standard');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedMatchForStats, setSelectedMatchForStats] = useState<Match | null>(null); // ✅ YENİ

  const maxSelections = analysisType === 'standard' ? 3 : 5;
  const creditsRequired = analysisType === 'standard' ? 1 : (analysisType === 'detailed' ? 3 : 2);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const upcomingMatches = await matchService.getAllUpcomingMatches();
      setMatches(upcomingMatches);
    } catch (error) {
      console.error('Maç yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = useMemo(() => {
    if (!searchQuery.trim()) return matches;

    const query = searchQuery.toLowerCase();
    return matches.filter(match =>
      match.homeTeam.toLowerCase().includes(query) ||
      match.awayTeam.toLowerCase().includes(query) ||
      match.league.toLowerCase().includes(query)
    );
  }, [matches, searchQuery]);

  const getDateDisplay = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (dateStr === today) return 'Bugün';
    if (dateStr === tomorrow) return 'Yarın';

    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  };

  const toggleMatchSelection = (match: Match) => {
    const isSelected = selectedMatches.some(m => m.fixtureId === match.fixtureId);

    if (isSelected) {
      setSelectedMatches(selectedMatches.filter(m => m.fixtureId !== match.fixtureId));
    } else {
      if (selectedMatches.length < maxSelections) {
        setSelectedMatches([...selectedMatches, match]);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (selectedMatches.length !== maxSelections) {
      alert(`Lütfen ${maxSelections} maç seçin`);
      return;
    }

    if (user.credits < creditsRequired) {
      alert('Yetersiz kredi. Lütfen kredi satın alın.');
      navigate('/dashboard');
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmAnalysis = async () => {
    setShowConfirmModal(false);

    try {
      setProcessing(true);

      const analysis = await geminiAnalysisService.analyzeMatches(
        selectedMatches,
        analysisType === 'detailed'
      );

      await couponService.createCoupon(
        user.uid,
        selectedMatches,
        analysis,
        analysisType
      );

      // Kredi backend'den düşürüldü, sadece local state güncelle
      // Firebase'den yeni veriyi çekmek için refresh
      window.location.reload();

      alert('Analiz tamamlandı!');
      setSelectedMatches([]);
      navigate('/my-coupons');

    } catch (error: any) {
      console.error('Analiz hatası:', error);
      alert(error.message || 'Analiz yapılırken bir hata oluştu');
    } finally {
      setProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Zap className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Giriş Yapın</h2>
          <p className="text-slate-300 mb-6">Bülteni görüntülemek için giriş yapmalısınız</p>
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

  const groupedMatches: { [league: string]: Match[] } = {};
  filteredMatches.forEach(match => {
    if (!groupedMatches[match.league]) {
      groupedMatches[match.league] = [];
    }
    groupedMatches[match.league].push(match);
  });

  return (
    <div className="min-h-screen bg-slate-900 pb-28 md:pb-8 md:pt-20">
      <header className="md:hidden bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-400" />
              <h1 className="text-lg font-bold text-white">Aikupon</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-slate-700/80 px-2.5 py-1.5 rounded text-xs font-medium text-yellow-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                {user.credits}
              </div>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-1.5 text-slate-300 hover:text-white"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="md:hidden mt-2 space-y-1.5">
              <button
                onClick={() => {
                  navigate('/dashboard');
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition"
              >
                Kredi Al
              </button>
            </div>
          )}

          <div className="mt-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Takım veya lig ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 text-white text-sm rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none placeholder-slate-400"
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 py-3">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white">Bültendeki maç saatleri Türkiye saatine göre farklılık gösterebilir</h3>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="text-slate-400 hover:text-white"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          {showInfo && (
            <div className="mb-2 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-xs text-slate-300">
              <strong className="text-blue-400">Standart:</strong> 3 maç, MS1-MSX-MS2, 2.5, KG (1 kredi)<br/>
              <strong className="text-purple-400">Detaylı:</strong> 5 maç + ilk yarı tahminleri (5 kredi)
            </div>
          )}

          {/* ✅ YENİ: Kullanıcı Bilgilendirme */}
          <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-2 mb-2">
            <div className="flex items-center gap-2 text-xs text-blue-300">
              <Info className="w-4 h-4 flex-shrink-0" />
              <p>
                <strong>İpucu:</strong> Maça tıklayın → İstatistikler & AI Analiz | 
                <strong className="ml-1">Shift+Tıklayın</strong> → Kupon için seç
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setAnalysisType('standard');
                setSelectedMatches([]);
              }}
              className={`p-2 rounded border transition ${
                analysisType === 'standard'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                  : 'bg-slate-700/50 border-slate-600 text-slate-400'
              }`}
            >
              <div className="text-xs font-bold">Standart</div>
              <div className="text-[10px] text-slate-400">3 maç • 1 kredi</div>
            </button>
            <button
              onClick={() => {
                setAnalysisType('detailed');
                setSelectedMatches([]);
              }}
              className={`p-2 rounded border transition ${
                analysisType === 'detailed'
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                  : 'bg-slate-700/50 border-slate-600 text-slate-400'
              }`}
            >
              <div className="text-xs font-bold">Detaylı</div>
              <div className="text-[10px] text-slate-400">5 maç • 5 kredi</div>
            </button>
          </div>

          {selectedMatches.length > 0 && (
            <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded">
              <div className="text-xs text-yellow-400 font-medium">
                Seçilen: {selectedMatches.length}/{maxSelections} maç
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3"></div>
            <p className="text-sm text-slate-300">Maçlar yükleniyor...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 rounded-lg border border-slate-700">
            <Clock className="w-12 h-12 mx-auto text-slate-500 mb-3" />
            <p className="text-slate-300 text-sm mb-1">{searchQuery ? 'Arama sonucu bulunamadı' : 'Şu an için maç bulunmuyor'}</p>
            <p className="text-slate-500 text-xs">Yakında maçlar eklenecek</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.keys(groupedMatches).map(league => (
              <div key={league} className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                <div className="bg-slate-700/50 px-3 py-1.5 border-b border-slate-600 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200">{translateLeague(league)}</h3>
                  <span className="text-[10px] text-slate-400">
                    {getDateDisplay(groupedMatches[league][0].date)}
                  </span>
                </div>

                <div className="divide-y divide-slate-700">
                  {groupedMatches[league].map(match => {
                    const isSelected = selectedMatches.some(m => m.fixtureId === match.fixtureId);
                    const canSelect = selectedMatches.length < maxSelections || isSelected;
                    const matchIsLive = isMatchLive(match.status);
                    const matchIsFinished = isMatchFinished(match.status);

                    return (
                      <button
                        key={match.fixtureId}
                        onClick={(e) => {
                          // ✅ DEĞİŞTİRİLDİ: Shift tuşu kontrolü
                          if (matchIsFinished) return;
                          
                          if (e.shiftKey) {
                            // Shift+Tıklama → Maç seçimi
                            canSelect && toggleMatchSelection(match);
                          } else {
                            // Normal tıklama → İstatistik modal
                            setSelectedMatchForStats(match);
                          }
                        }}
                        disabled={matchIsFinished}
                        className={`w-full text-left px-3 py-2.5 transition hover:bg-slate-700/30 ${
                          isSelected ? 'bg-blue-600/10 border-l-2 border-blue-500' : ''
                        } ${matchIsFinished ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                            isSelected
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-slate-600'
                          }`}>
                            {isSelected && (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">{formatMatchTime(match.timestamp)}</span>
                          
                          {/* Maç Durumu Badge */}
                          {matchIsLive && (
                            <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                              🔴 CANLI
                            </span>
                          )}
                          {matchIsFinished && (
                            <span className="text-[10px] bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full">
                              Bitti
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white font-medium truncate">
                              {translateTeam(match.homeTeam)}
                            </div>
                            <div className="text-sm text-slate-300 truncate">
                              {translateTeam(match.awayTeam)}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 ml-3">
                            {!matchIsFinished && (
                              <div className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-[10px] font-medium">
                                Analiz Et
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedMatches.length === maxSelections && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md">
          <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-blue-500/50 rounded-2xl p-4 shadow-2xl animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Analiz Hazır</p>
                  <p className="text-xs text-slate-400">{selectedMatches.length} maç seçildi</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMatches([])}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Matches Preview */}
            <div className="bg-slate-800/50 rounded-xl p-3 mb-3 max-h-32 overflow-y-auto">
              {selectedMatches.map((match, index) => (
                <div key={match.fixtureId} className="flex items-center gap-2 text-xs text-slate-300 mb-1.5 last:mb-0">
                  <span className="text-blue-400 font-bold">{index + 1}.</span>
                  <span className="truncate">{match.homeTeam} vs {match.awayTeam}</span>
                </div>
              ))}
            </div>

            {/* Credit Info */}
            <div className="flex items-center justify-between bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-2 mb-3">
              <span className="text-xs text-slate-300">Kredi Kullanımı:</span>
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-bold text-yellow-400">{creditsRequired} Kredi</span>
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={processing}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white py-3.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
            >
              {processing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Analiz Ediliyor...
                </div>
              ) : (
                <>
                  <Zap className="w-5 h-5 inline-block mr-2" />
                  Analiz Et
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border-2 border-blue-500/30 rounded-xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Kredi Harcama Onayı</h3>
              <p className="text-slate-300 text-sm">
                {selectedMatches.length} maç için <span className="text-yellow-400 font-bold">{creditsRequired} kredi</span> harcanacak.
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4 mb-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Seçilen Maç:</span>
                  <span className="text-white font-medium">{selectedMatches.length} maç</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Analiz Tipi:</span>
                  <span className="text-white font-medium">
                    {analysisType === 'standard' ? 'Standart' : 'Detaylı'}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
                  <span className="text-slate-400">Harcanan Kredi:</span>
                  <span className="text-yellow-400 font-bold">{creditsRequired} kredi</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Kalan Kredi:</span>
                  <span className="text-green-400 font-bold">{(user?.credits || 0) - creditsRequired} kredi</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
              >
                İptal
              </button>
              <button
                onClick={confirmAnalysis}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-bold transition"
              >
                Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ YENİ: İstatistik Modal */}
      {selectedMatchForStats && (
        <MatchStatsModal
          match={selectedMatchForStats}
          onClose={() => setSelectedMatchForStats(null)}
        />
      )}
    </div>
  );
};