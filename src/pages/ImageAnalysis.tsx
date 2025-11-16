import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Image as ImageIcon, Loader2, CheckCircle, XCircle, Zap, ArrowLeft, AlertTriangle, Save, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { imageCouponService, MarketType, CouponMatch } from '../services/imageCouponService';

interface ExtractedMatch {
  homeTeam: string;
  awayTeam: string;
  league: string | null;
}

interface MatchedMatch {
  extracted: ExtractedMatch;
  apiMatch: {
    fixtureId: number;
    homeTeam: string;
    awayTeam: string;
    league: string;
    date: string;
    status: string;
  };
}

interface AnalysisResult {
  success: boolean;
  message?: string;
  ocrText?: string;
  extractedMatches?: ExtractedMatch[];
  matchedMatches?: MatchedMatch[];
  analysis?: string;
}

interface MarketSelection {
  matchIndex: number;
  market: MarketType;
  odds: number;
  confidence: number;
}

export const ImageAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarkets, setSelectedMarkets] = useState<MarketSelection[]>([]);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [showMarketPopup, setShowMarketPopup] = useState(false);
  const [selectedMarketType, setSelectedMarketType] = useState<string>('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Dosya boyutu 10MB\'dan küçük olmalıdır');
        return;
      }

      if (!file.type.startsWith('image/')) {
        setError('Lütfen bir görsel dosyası seçin');
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const fakeEvent = {
        target: { files: [file] }
      } as any;
      handleFileSelect(fakeEvent);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileSelectAndShowPopup = () => {
    if (selectedFile) {
      setShowMarketPopup(true);
    }
  };

  const handleMarketSelect = (market: string) => {
    setSelectedMarketType(market);
    setShowMarketPopup(false);
    handleAnalyze(market);
  };

  const handleAnalyze = async (marketType?: string) => {
    if (!selectedFile) {
      setError('Lütfen bir görsel seçin');
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    const REQUIRED_CREDITS = 3;
    if (user.credits < REQUIRED_CREDITS) {
      setError(`Yetersiz kredi. Bu analiz için ${REQUIRED_CREDITS} kredi gereklidir. Lütfen kredi satın alın.`);
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setResult(null);

      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('userId', user.uid);
      formData.append('creditsToDeduct', REQUIRED_CREDITS.toString());
      if (marketType) {
        formData.append('selectedMarket', marketType);
      }

      const response = await fetch('/api/analyze-coupon-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analiz başarısız oldu');
      }

      setResult(data);
      
      if (refreshUser) {
        await refreshUser();
      }
      
    } catch (err: any) {
      console.error('Analiz hatası:', err);
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setSelectedMarkets([]);
  };

  const toggleMarket = (matchIndex: number, market: MarketType, odds: number, confidence: number) => {
    setSelectedMarkets(prev => {
      const existing = prev.findIndex(m => m.matchIndex === matchIndex);
      if (existing !== -1) {
        // Aynı maç için farklı market seçiliyorsa değiştir
        const updated = [...prev];
        updated[existing] = { matchIndex, market, odds, confidence };
        return updated;
      } else {
        // Yeni market ekle
        return [...prev, { matchIndex, market, odds, confidence }];
      }
    });
  };

  const isMarketSelected = (matchIndex: number, market: MarketType): boolean => {
    return selectedMarkets.some(m => m.matchIndex === matchIndex && m.market === market);
  };

  const handleSaveCoupon = async () => {
    if (!user || !result || selectedMarkets.length === 0) {
      setError('Lütfen en az bir market seçin');
      return;
    }

    try {
      setSavingCoupon(true);

      const couponMatches: CouponMatch[] = selectedMarkets.map(selection => {
        const match = result.matchedMatches![selection.matchIndex];
        return {
          homeTeam: match.apiMatch.homeTeam,
          awayTeam: match.apiMatch.awayTeam,
          league: match.apiMatch.league,
          date: new Date(match.apiMatch.date).toLocaleDateString('tr-TR'),
          time: new Date(match.apiMatch.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          market: selection.market,
          marketDisplay: imageCouponService.getMarketDisplay(selection.market),
          odds: selection.odds,
          confidence: selection.confidence
        };
      });

      await imageCouponService.saveCoupon(user.uid, couponMatches);
      
      alert('✅ Kupon başarıyla kaydedildi!');
      navigate('/my-coupons');
    } catch (err: any) {
      console.error('Kupon kaydetme hatası:', err);
      setError(err.message || 'Kupon kaydedilemedi');
    } finally {
      setSavingCoupon(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Zap className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Giriş Yapın</h2>
          <p className="text-slate-300 mb-6">Görsel analizi için giriş yapmalısınız</p>
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
    <div className="min-h-screen bg-slate-900 pb-28 md:pb-8 md:pt-20">
      {/* Market Seçim Popup */}
      {showMarketPopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full border border-slate-700 shadow-2xl">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white mb-2">Analiz Türü Seçin</h3>
              <p className="text-sm text-slate-400">Hangi market için analiz yapmak istiyorsunuz?</p>
            </div>
            
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {[
                { value: 'ms1', label: 'MS1 (Ev Sahibi Kazanır)', icon: '🏠' },
                { value: 'ms2', label: 'MS2 (Deplasman Kazanır)', icon: '✈️' },
                { value: 'draw', label: 'X (Beraberlik)', icon: '🤝' },
                { value: 'over25', label: '2.5 Üst', icon: '⚽' },
                { value: 'under25', label: '2.5 Alt', icon: '🎯' },
                { value: 'btts', label: 'Karşılıklı Gol Var', icon: '⚔️' },
                { value: 'bttsNo', label: 'Karşılıklı Gol Yok', icon: '🛡️' },
                { value: 'firstHalfMs1', label: 'İlk Yarı MS1', icon: '1️⃣' },
                { value: 'firstHalfDraw', label: 'İlk Yarı Beraberlik', icon: '🔄' },
                { value: 'firstHalfMs2', label: 'İlk Yarı MS2', icon: '2️⃣' },
                { value: 'all', label: 'Tüm Marketler (Detaylı)', icon: '📊' }
              ].map((market) => (
                <button
                  key={market.value}
                  onClick={() => handleMarketSelect(market.value)}
                  className="w-full p-3 bg-slate-900/50 hover:bg-slate-700 border border-slate-700 hover:border-blue-500 rounded-lg text-left transition flex items-center gap-3"
                >
                  <span className="text-2xl">{market.icon}</span>
                  <span className="text-white font-medium">{market.label}</span>
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-slate-700">
              <button
                onClick={() => setShowMarketPopup(false)}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="md:hidden bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-1.5 text-slate-300 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <ImageIcon className="w-6 h-6 text-yellow-400" />
              <h1 className="text-lg font-bold text-white">Görsel Analizi</h1>
            </div>
            <div className="bg-slate-700/80 px-2.5 py-1.5 rounded text-xs font-medium text-yellow-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              {user.credits}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 py-6 md:py-8">
        {/* Desktop Header */}
        <div className="hidden md:block mb-8">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <ImageIcon className="w-8 h-8 text-yellow-400" />
            <h1 className="text-3xl font-bold text-white">Maç Görseli Analizi</h1>
          </div>
          <p className="text-slate-400 ml-14">
            Maç listesi görselinizi yükleyin, AI ile detaylı analiz edelim
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <h3 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Nasıl Çalışır?
          </h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>• Maç listesi görselinizin ekran görüntüsünü alın</li>
            <li>• Görseli buraya yükleyin</li>
            <li>• AI, görseldeki maçları otomatik çıkarır</li>
            <li>• Maçlar API'den bulunur ve detaylı analiz yapılır</li>
          </ul>
        </div>

        {/* Upload Area */}
        {!result && (
          <div className="bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-xl p-8 text-center">
            {!previewUrl ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="cursor-pointer"
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-16 h-16 mx-auto text-slate-500 mb-4" />
                  <p className="text-white font-medium mb-2">Maç Görseli Yükle</p>
                  <p className="text-sm text-slate-400 mb-4">
                    veya sürükleyip bırakın
                  </p>
                  <button
                    type="button"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                  >
                    Dosya Seç
                  </button>
                </label>
                <p className="text-xs text-slate-500 mt-4">
                  PNG, JPG, JPEG (Max 10MB)
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-96 mx-auto rounded-lg border border-slate-600"
                />
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleReset}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                  >
                    Değiştir
                  </button>
                  <button
                    onClick={handleFileSelectAndShowPopup}
                    disabled={uploading}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg font-medium transition flex items-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analiz Ediliyor...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Analiz Et (3 Kredi)
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 bg-red-600/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-medium">Hata</p>
              <p className="text-sm text-red-200/80">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6 mt-6">
            {/* Success Message */}
            <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-green-300 font-medium">Analiz Tamamlandı!</p>
                <p className="text-sm text-green-200/80">
                  {result.matchedMatches && result.matchedMatches.length > 0 
                    ? `${result.matchedMatches.length} maç başarıyla analiz edildi. 3 kredi kullanıldı.`
                    : 'Analiz tamamlandı ancak eşleşen maç bulunamadı. 3 kredi kullanıldı.'}
                </p>
              </div>
            </div>

            {/* Matched Matches - BAŞARILI SONUÇLAR + MARKET SEÇİMİ */}
            {result.matchedMatches && result.matchedMatches.length > 0 && (
              <div className="bg-slate-800/50 border border-green-600/30 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-b border-green-600/30 px-5 py-4">
                  <h3 className="text-green-300 font-bold text-lg flex items-center gap-2">
                    <CheckCircle className="w-6 h-6" />
                    Başarılı Eşleşmeler ({result.matchedMatches.length})
                  </h3>
                  <p className="text-sm text-green-200/70 mt-1">Market seçerek kupon oluşturun (Minimum %70 güven)</p>
                </div>
                <div className="p-4 space-y-4">
                  {result.matchedMatches.map((match, idx) => {
                    // Mock tahminler - gerçek API'den gelecek
                    const predictions = {
                      ms1: { odds: 1.85, confidence: 75 },
                      draw: { odds: 3.40, confidence: 65 },
                      ms2: { odds: 4.20, confidence: 72 },
                      over25: { odds: 1.70, confidence: 80 },
                      under25: { odds: 2.10, confidence: 68 },
                      btts: { odds: 1.95, confidence: 73 },
                      bttsNo: { odds: 1.80, confidence: 69 },
                      firstHalfMs1: { odds: 2.20, confidence: 71 },
                      firstHalfDraw: { odds: 2.10, confidence: 66 },
                      firstHalfMs2: { odds: 3.80, confidence: 68 }
                    };

                    return (
                      <div key={idx} className="bg-slate-900/70 rounded-lg border border-green-600/20 p-4">
                        {/* Maç Bilgisi */}
                        <div className="mb-4 pb-3 border-b border-slate-700">
                          <p className="text-white font-semibold text-base mb-2">
                            {match.apiMatch.homeTeam} 
                            <span className="text-slate-500 mx-2">vs</span> 
                            {match.apiMatch.awayTeam}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                              {match.apiMatch.league}
                            </span>
                            <span className="text-slate-400">
                              {new Date(match.apiMatch.date).toLocaleDateString('tr-TR')} • {new Date(match.apiMatch.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Market Seçenekleri */}
                        <div className="space-y-3">
                          <p className="text-xs text-slate-400 font-medium mb-2">Market Seçin:</p>
                          
                          {/* Maç Sonucu */}
                          <div>
                            <p className="text-xs text-slate-500 mb-2">Maç Sonucu</p>
                            <div className="grid grid-cols-3 gap-2">
                              {(['ms1', 'draw', 'ms2'] as const).map(market => {
                                const pred = predictions[market];
                                if (pred.confidence < 70) return null;
                                const selected = isMarketSelected(idx, market);
                                return (
                                  <button
                                    key={market}
                                    onClick={() => toggleMarket(idx, market, pred.odds, pred.confidence)}
                                    className={`p-2 rounded-lg border transition ${
                                      selected 
                                        ? 'bg-green-600/20 border-green-500 text-green-300' 
                                        : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-green-500/50'
                                    }`}
                                  >
                                    <div className="text-xs font-medium">
                                      {market === 'ms1' ? 'MS1' : market === 'draw' ? 'X' : 'MS2'}
                                    </div>
                                    <div className="text-xs mt-1">{pred.odds}</div>
                                    <div className="text-[10px] text-slate-500">%{pred.confidence}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 2.5 Alt/Üst */}
                          <div>
                            <p className="text-xs text-slate-500 mb-2">2.5 Gol</p>
                            <div className="grid grid-cols-2 gap-2">
                              {(['over25', 'under25'] as const).map(market => {
                                const pred = predictions[market];
                                if (pred.confidence < 70) return null;
                                const selected = isMarketSelected(idx, market);
                                return (
                                  <button
                                    key={market}
                                    onClick={() => toggleMarket(idx, market, pred.odds, pred.confidence)}
                                    className={`p-2 rounded-lg border transition ${
                                      selected 
                                        ? 'bg-green-600/20 border-green-500 text-green-300' 
                                        : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-green-500/50'
                                    }`}
                                  >
                                    <div className="text-xs font-medium">
                                      {market === 'over25' ? '2.5 Üst' : '2.5 Alt'}
                                    </div>
                                    <div className="text-xs mt-1">{pred.odds}</div>
                                    <div className="text-[10px] text-slate-500">%{pred.confidence}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* KG Var/Yok */}
                          <div>
                            <p className="text-xs text-slate-500 mb-2">Karşılıklı Gol</p>
                            <div className="grid grid-cols-2 gap-2">
                              {(['btts', 'bttsNo'] as const).map(market => {
                                const pred = predictions[market];
                                if (pred.confidence < 70) return null;
                                const selected = isMarketSelected(idx, market);
                                return (
                                  <button
                                    key={market}
                                    onClick={() => toggleMarket(idx, market, pred.odds, pred.confidence)}
                                    className={`p-2 rounded-lg border transition ${
                                      selected 
                                        ? 'bg-green-600/20 border-green-500 text-green-300' 
                                        : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-green-500/50'
                                    }`}
                                  >
                                    <div className="text-xs font-medium">
                                      {market === 'btts' ? 'KG Var' : 'KG Yok'}
                                    </div>
                                    <div className="text-xs mt-1">{pred.odds}</div>
                                    <div className="text-[10px] text-slate-500">%{pred.confidence}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* İlk Yarı */}
                          <div>
                            <p className="text-xs text-slate-500 mb-2">İlk Yarı Sonucu</p>
                            <div className="grid grid-cols-3 gap-2">
                              {(['firstHalfMs1', 'firstHalfDraw', 'firstHalfMs2'] as const).map(market => {
                                const pred = predictions[market];
                                if (pred.confidence < 70) return null;
                                const selected = isMarketSelected(idx, market);
                                return (
                                  <button
                                    key={market}
                                    onClick={() => toggleMarket(idx, market, pred.odds, pred.confidence)}
                                    className={`p-2 rounded-lg border transition ${
                                      selected 
                                        ? 'bg-green-600/20 border-green-500 text-green-300' 
                                        : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-green-500/50'
                                    }`}
                                  >
                                    <div className="text-xs font-medium">
                                      {market === 'firstHalfMs1' ? 'İY MS1' : market === 'firstHalfDraw' ? 'İY X' : 'İY MS2'}
                                    </div>
                                    <div className="text-xs mt-1">{pred.odds}</div>
                                    <div className="text-[10px] text-slate-500">%{pred.confidence}</div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Kupon Kaydetme Butonu */}
                {selectedMarkets.length > 0 && (
                  <div className="border-t border-slate-700 p-4 bg-slate-800/30">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white font-medium">Seçilen Market: {selectedMarkets.length}</p>
                        <p className="text-xs text-slate-400">
                          Toplam Oran: {selectedMarkets.reduce((total, m) => total * m.odds, 1).toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={handleSaveCoupon}
                        disabled={savingCoupon}
                        className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg font-medium transition flex items-center gap-2"
                      >
                        {savingCoupon ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Kaydediliyor...
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" />
                            Kupon Olarak Kaydet
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Failed Matches - BULUNAMAYAN MAÇLAR */}
            {result.extractedMatches && result.extractedMatches.length > 0 && (
              (() => {
                const failedMatches = result.extractedMatches.filter(extracted => 
                  !result.matchedMatches?.some(matched => 
                    matched.extracted.homeTeam === extracted.homeTeam && 
                    matched.extracted.awayTeam === extracted.awayTeam
                  )
                );
                
                return failedMatches.length > 0 ? (
                  <div className="bg-slate-800/50 border border-orange-600/30 rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-b border-orange-600/30 px-5 py-4">
                      <h3 className="text-orange-300 font-bold text-lg flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6" />
                        Bulunamadı ({failedMatches.length})
                      </h3>
                    </div>
                    <div className="p-4 space-y-2">
                      {failedMatches.map((match, idx) => (
                        <div key={idx} className="bg-slate-900/70 rounded-lg border border-orange-600/20 p-3 flex items-center justify-between">
                          <p className="text-white text-sm">
                            {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
                          </p>
                          <span className="text-xs text-orange-400 font-medium">Bulunamadı</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()
            )}

            {/* No Matches Found Warning */}
            {(!result.matchedMatches || result.matchedMatches.length === 0) && (
              <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                  <p className="text-yellow-300 font-semibold">Bulunamadı</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center pt-4 border-t border-slate-700">
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Yeni Analiz
              </button>
              <button
                onClick={() => navigate('/my-coupons')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition flex items-center gap-2"
              >
                <Ticket className="w-4 h-4" />
                Kuponlarıma Git
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
