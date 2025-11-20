import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Menu, X, Info, Clock, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { matchService, Match } from '../services/matchService';
import { geminiAnalysisService } from '../services/geminiAnalysisService';
import { couponService } from '../services/couponService';
import { authService } from '../services/authService';
import { translateLeague, translateTeam, formatMatchTime, getMatchStatusText, isMatchLive, isMatchFinished } from '../utils/leagueTranslations';

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <Zap className="w-20 h-20 mx-auto text-yellow-400 mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Giriş Yapın</h2>
          <p className="text-slate-300 mb-8 text-lg">Bülteni görüntülemek için giriş yapmalısınız</p>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
          >Giriş Yap</button>
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
    <div className="min-h-screen bg-slate-900 pb-32 md:pb-12 md:pt-20">
      <header className="md:hidden bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Zap className="w-7 h-7 text-yellow-400" />
              <h1 className="text-xl font-bold text-white">Aikupon</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-slate-700/80 px-4 py-2 rounded-lg text-sm font-semibold text-yellow-400 flex items-center gap-2 shadow-md">
                <Zap className="w-4 h-4" />
                {user.credits}
              </div>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="mb-3">
              <button
                onClick={() => {
                  navigate('/dashboard');
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-md"
              >Kredi Al</button>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Takım veya lig ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none placeholder-slate-400 shadow-md"
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white">Bültendeki maç saatleri Türkiye saatine göre farklılık gösterebilir</h3>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg transition-all"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>

          {showInfo && (
            <div className="mb-4 p-4 bg-blue-900/30 border border-blue-600/40 rounded-lg text-sm text-slate-200 leading-relaxed">
              <strong className="text-blue-300">Standart:</strong> 3 maç, MS1-MSX-MS2, 2.5, KG (1 kredi)<br/>
              <strong className="text-purple-300">Detaylı:</strong> 5 maç + ilk yarı istatistiksel değerlendirme (5 kredi)
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                setAnalysisType('standard');
                setSelectedMatches([]);
              }}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                analysisType === 'standard'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-lg'
                  : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              <div className="text-sm font-bold mb-1">Standart</div>
              <div className="text-xs text-slate-400">3 maç • 1 kredi</div>
            </button>
            <button
              onClick={() => {
                setAnalysisType('detailed');
                setSelectedMatches([]);
              }}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                analysisType === 'detailed'
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-lg'
                  : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              <div className="text-sm font-bold mb-1">Detaylı</div>
              <div className="text-xs text-slate-400">5 maç • 5 kredi</div>
            </button>
          </div>

          {selectedMatches.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="text-sm text-yellow-300 font-semibold">
                Seçilen: {selectedMatches.length}/{maxSelections} maç
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-base text-slate-300">Maçlar yükleniyor...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/30 rounded-xl border border-slate-700">
            <Clock className="w-16 h-16 mx-auto text-slate-500 mb-4" />
            <p className="text-slate-300 text-base mb-2">{searchQuery ? 'Arama sonucu bulunamadı' : 'Şu an için maç bulunmuyor'}</p>
            <p className="text-slate-500">Yakında maçlar eklenecek</p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.keys(groupedMatches).map(league => (
              <div key={league} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden shadow-lg">
                <div className="bg-slate-700/50 px-5 py-3 border-b border-slate-600 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200">{translateLeague(league)}</h3>
                  <span className="text-xs text-slate-400">
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
                        onClick={() => canSelect && toggleMatchSelection(match)}
                        disabled={!canSelect || matchIsFinished}
                        className={`w-full text-left px-5 py-4 transition-all hover:bg-slate-700/30 ${
                          isSelected ? 'bg-blue-600/10 border-l-4 border-blue-500' : ''
                        } ${!canSelect || matchIsFinished ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${
                            isSelected
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-slate-600'
                          }`}>
                            {isSelected && (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 font-medium">{formatMatchTime(match.timestamp)}</span>
                          
                          {matchIsLive && (
                            <span className="text-xs bg-red-600 text-white px-2.5 py-1 rounded-full font-bold animate-pulse">
                              🔴 CANLI
                            </span>
                          )}
                          {matchIsFinished && (
                            <span className="text-xs bg-slate-600 text-slate-300 px-2.5 py-1 rounded-full font-medium">
                              Bitti
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="text-base text-white font-semibold truncate mb-1">
                              {translateTeam(match.homeTeam)}
                            </div>
                            <div className="text-base text-slate-300 truncate">
                              {translateTeam(match.awayTeam)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            {!matchIsFinished && (
                              <div className="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-semibold">
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
          <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-blue-500/50 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-base">Analiz Hazır</p>
                  <p className="text-xs text-slate-400">{selectedMatches.length} maç seçildi</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMatches([])}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 mb-5 max-h-36 overflow-y-auto">
              {selectedMatches.map((match, index) => (
                <div key={match.fixtureId} className="flex items-center gap-2 text-sm text-slate-300 mb-2 last:mb-0">
                  <span className="text-blue-400 font-bold">{index + 1}.</span>
                  <span className="truncate">{match.homeTeam} vs {match.awayTeam}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-3 mb-5">
              <span className="text-sm text-slate-300">Kredi Kullanımı:</span>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="text-base font-bold text-yellow-400">{creditsRequired} Kredi</span>
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={processing}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white py-4 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
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
          <div className="bg-slate-800 border-2 border-blue-500/30 rounded-2xl p-8 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-5">
                <Zap className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Kredi Harcama Onayı</h3>
              <p className="text-slate-300">
                {selectedMatches.length} maç için <span className="text-yellow-400 font-bold">{creditsRequired} kredi</span> harcanacak.
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-5 mb-8">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Seçilen Maç:</span>
                  <span className="text-white font-semibold">{selectedMatches.length} maç</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Analiz Tipi:</span>
                  <span className="text-white font-semibold">
                    {analysisType === 'standard' ? 'Standart' : 'Detaylı'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-700 pt-3">
                  <span className="text-slate-400">Harcanan Kredi:</span>
                  <span className="text-yellow-400 font-bold">{creditsRequired} kredi</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kalan Kredi:</span>
                  <span className="text-green-400 font-bold">{(user?.credits || 0) - creditsRequired} kredi</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all"
              >İptal</button>
              <button
                onClick={confirmAnalysis}
                className="flex-1 px-4 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold transition-all"
              >Onayla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};