import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, TrendingUp, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MatchBulletin } from '../components/MatchBulletin';
import { PopularCoupons } from '../components/PopularCoupons';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Match } from '../services/matchService';
import { geminiAnalysisService } from '../services/geminiAnalysisService';
import { couponService } from '../services/couponService';
import { authService } from '../services/authService';

export const Bulletin: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'bulletin' | 'popular'>('bulletin');
  const [selectedMatches, setSelectedMatches] = useState<Match[]>([]);
  const [analysisType, setAnalysisType] = useState<'standard' | 'detailed'>('standard');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const maxSelections = analysisType === 'standard' ? 3 : 5;
  const creditsRequired = analysisType === 'standard' ? 1 : 5;

  const handleMatchSelect = (matches: Match[]) => {
    setSelectedMatches(matches);
  };

  const handlePopularCouponSelect = (matches: Match[]) => {
    setSelectedMatches(matches);
    setAnalysisType('detailed');
    setActiveTab('bulletin');
  };

  const handleAnalyzeClick = () => {
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

    setShowConfirmation(true);
  };

  const handleConfirmPurchase = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setShowConfirmation(false);

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

      const newCredits = user.credits - creditsRequired;
      await authService.updateCredits(user.uid, newCredits);
      setUser({ ...user, credits: newCredits });

      alert('Analiz tamamlandı! Kuponlarım sayfasında görebilirsiniz.');
      setSelectedMatches([]);
      navigate('/my-coupons');

    } catch (error: any) {
      console.error('Analiz hatası:', error);
      alert(error.message || 'Analiz yapılırken bir hata oluştu');
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-24">
      <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Zap className="w-7 h-7 text-yellow-400" />
                Aikupon
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-slate-700 px-4 py-2 rounded-lg">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-white font-medium">{user.credits} kredi</span>
              </div>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="sm:hidden p-2 text-slate-300 hover:text-white"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="sm:hidden mt-4 space-y-2">
              <div className="bg-slate-700 px-4 py-3 rounded-lg">
                <div className="flex items-center justify-between text-white">
                  <span>Kredi:</span>
                  <span className="font-bold">{user.credits}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  navigate('/dashboard');
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                Kredi Al
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('bulletin')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
                activeTab === 'bulletin'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              Günlük Bülten
            </button>
            <button
              onClick={() => setActiveTab('popular')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                activeTab === 'popular'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Popüler Kuponlar
            </button>
          </div>

          {activeTab === 'bulletin' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
              <p className="text-white font-medium mb-3">Analiz Tipi Seçin:</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setAnalysisType('standard');
                    setSelectedMatches([]);
                  }}
                  className={`p-4 rounded-lg border-2 transition ${
                    analysisType === 'standard'
                      ? 'bg-blue-600/20 border-blue-500'
                      : 'bg-slate-700 border-slate-600'
                  }`}
                >
                  <div className="text-white font-bold mb-1">Standart</div>
                  <div className="text-sm text-slate-300 mb-2">3 maç</div>
                  <div className="text-yellow-400 font-bold">1 Kredi</div>
                </button>
                <button
                  onClick={() => {
                    setAnalysisType('detailed');
                    setSelectedMatches([]);
                  }}
                  className={`p-4 rounded-lg border-2 transition ${
                    analysisType === 'detailed'
                      ? 'bg-purple-600/20 border-purple-500'
                      : 'bg-slate-700 border-slate-600'
                  }`}
                >
                  <div className="text-white font-bold mb-1">Detaylı</div>
                  <div className="text-sm text-slate-300 mb-2">5 maç + İlk Yarı</div>
                  <div className="text-yellow-400 font-bold">5 Kredi</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {activeTab === 'bulletin' ? (
          <MatchBulletin
            onMatchSelect={handleMatchSelect}
            maxSelections={maxSelections}
            selectedMatches={selectedMatches}
          />
        ) : (
          <PopularCoupons onSelectCoupon={handlePopularCouponSelect} />
        )}
      </div>

      {activeTab === 'bulletin' && selectedMatches.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800/95 backdrop-blur border-t border-slate-700 p-4 z-50">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={handleAnalyzeClick}
              disabled={selectedMatches.length !== maxSelections || loading}
              className={`w-full px-6 py-4 rounded-lg font-bold text-lg transition ${
                selectedMatches.length === maxSelections && !loading
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Analiz Ediliyor...
                </div>
              ) : (
                `${selectedMatches.length}/${maxSelections} Maç Seçildi - ${creditsRequired} Kredi ile Analiz Et`
              )}
            </button>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmPurchase}
        matches={selectedMatches}
        creditsRequired={creditsRequired}
        analysisType={analysisType}
      />
    </div>
  );
};
