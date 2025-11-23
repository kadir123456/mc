import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Image as ImageIcon, Loader2, CheckCircle, XCircle, Zap, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  prediction?: string;
  confidence?: number;
  reasoning?: string;
  matchScore?: number;
  statistics?: {
    homeFormScore: number;
    awayFormScore: number;
    avgGoalsPerMatch: string;
  };
}

interface AnalysisResult {
  success: boolean;
  message?: string;
  extractedMatches?: ExtractedMatch[];
  matchedMatches?: MatchedMatch[];
  unmatchedMatches?: ExtractedMatch[];
  analysis?: string;
}

export const ImageAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ 1 KREDİ
  const REQUIRED_CREDITS = 1;

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

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Lütfen bir görsel seçin');
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    if (user.credits < REQUIRED_CREDITS) {
      setError(`Yetersiz kredi. Bu analiz için ${REQUIRED_CREDITS} kredi gereklidir. Lütfen kredi satın alın.`);
      return;
    }

    const confirmed = window.confirm(
      `Bu analiz ${REQUIRED_CREDITS} kredi harcayacaktır.\n\nMevcut krediniz: ${user.credits}\nKalan krediniz: ${user.credits - REQUIRED_CREDITS}\n\nDevam etmek istiyor musunuz?`
    );

    if (!confirmed) return;

    try {
      setUploading(true);
      setError(null);
      setResult(null);

      // Görseli base64'e çevir
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const response = await fetch('/api/analyze-coupon-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          userId: user.uid,
          creditsToDeduct: REQUIRED_CREDITS.toString(),
          analysisType: 'macSonucu'
        }),
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
  };

  const triggerFileInput = () => {
    document.getElementById('file-upload')?.click();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 md:bg-gradient-to-br md:from-slate-900 md:via-slate-800 md:to-slate-900 flex items-center justify-center p-6">
        <div className="text-center bg-white md:bg-slate-800/50 p-8 rounded-2xl border border-slate-200 md:border-slate-700">
          <Zap className="w-16 h-16 md:w-20 md:h-20 mx-auto text-blue-600 md:text-yellow-400 mb-4 md:mb-6" />
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 md:text-white mb-3 md:mb-4">Giriş Yapın</h2>
          <p className="text-slate-600 md:text-slate-300 mb-6 md:mb-8 text-base md:text-lg">Görsel analizi için giriş yapmalısınız</p>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3 md:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all active:scale-95 shadow-lg"
          >Giriş Yap</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 md:bg-slate-900 pb-24 md:pb-12 md:pt-20">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all active:scale-95"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <ImageIcon className="w-6 h-6 text-blue-600" />
              <h1 className="text-lg font-bold text-slate-900">Görsel Analizi</h1>
            </div>
            <div className="bg-blue-100 px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-700 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              {user.credits}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
        {/* Desktop Header */}
        <div className="hidden md:block mb-10">
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <ImageIcon className="w-10 h-10 text-yellow-400" />
            <h1 className="text-4xl font-bold text-white">Maç Görseli Analizi</h1>
          </div>
          <p className="text-slate-400 text-lg ml-16">
            Maç listesi görselinizi yükleyin, AI ile detaylı analiz edelim
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 md:bg-blue-600/10 border border-blue-200 md:border-blue-500/30 rounded-xl p-3 md:p-4 mb-4 shadow-sm">
          <h3 className="text-blue-700 md:text-blue-300 font-bold text-sm mb-2 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4" />
            Nasıl Çalışır?
          </h3>
          <ul className="text-slate-700 md:text-slate-300 space-y-1 leading-snug text-xs">
            <li>• Bülten görselinizin ekran görüntüsünü alın</li>
            <li>• Görseli buraya yükleyin ({REQUIRED_CREDITS} kredi)</li>
            <li>• AI, görseldeki maçları otomatik tespit eder</li>
            <li>• Her maç için form, H2H ve gol istatistikleri çekilir</li>
            <li>• Gerçek verilere dayalı AI tahminleri görürsünüz</li>
          </ul>
        </div>

        {/* Upload Area */}
        {!result && (
          <div className="bg-white md:bg-slate-800/50 border-2 border-dashed border-slate-300 md:border-slate-600 rounded-xl p-6 md:p-8 text-center shadow-sm md:shadow-lg">
            {!previewUrl ? (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Upload className="w-12 h-12 mx-auto text-slate-400 md:text-slate-500 mb-3" />
                <p className="text-slate-900 md:text-white font-semibold text-base mb-2">Maç Görseli Yükle</p>
                <p className="text-slate-600 md:text-slate-400 mb-4 text-sm">
                  PNG, JPG, JPEG (Max 10MB)
                </p>
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-semibold transition-all active:scale-95 shadow-md"
                >Dosya Seç</button>
              </div>
            ) : (
              <div className="space-y-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-80 mx-auto rounded-lg border border-slate-300 md:border-slate-600 shadow-lg"
                />
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleReset}
                    className="px-6 py-2.5 bg-slate-200 md:bg-slate-700 hover:bg-slate-300 md:hover:bg-slate-600 text-slate-900 md:text-white rounded-lg font-semibold transition-all active:scale-95"
                  >Değiştir</button>
                  <button
                    onClick={handleAnalyze}
                    disabled={uploading}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-400 text-white rounded-lg font-semibold transition-all flex items-center gap-2 active:scale-95 shadow-md"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Analiz Ediliyor...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Analiz Et ({REQUIRED_CREDITS} Kredi)
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
          <div className="mt-6 bg-red-50 md:bg-red-600/10 border border-red-200 md:border-red-500/30 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <XCircle className="w-5 h-5 text-red-600 md:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 md:text-red-300 font-semibold text-base">Hata</p>
              <p className="text-red-600 md:text-red-200/80 mt-1 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4 mt-6">
            {/* Success Message */}
            <div className="bg-green-50 md:bg-green-600/10 border border-green-200 md:border-green-500/30 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <CheckCircle className="w-5 h-5 text-green-600 md:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-700 md:text-green-300 font-semibold text-base">Analiz Tamamlandı!</p>
                <p className="text-green-600 md:text-green-200/80 mt-1 text-sm">
                  {result.matchedMatches?.length || 0} maç analiz edildi. {REQUIRED_CREDITS} kredi hesabınızdan düşüldü.
                </p>
              </div>
            </div>

            {/* Unmatched Warning */}
            {result.unmatchedMatches && result.unmatchedMatches.length > 0 && (
              <div className="bg-yellow-50 md:bg-yellow-600/10 border border-yellow-200 md:border-yellow-500/30 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-yellow-600 md:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-700 md:text-yellow-300 font-semibold text-sm">Eşleştirilemeyen Maçlar</p>
                  <p className="text-yellow-600 md:text-yellow-200/80 mt-1 text-xs">
                    {result.unmatchedMatches.map(m => `${m.homeTeam} vs ${m.awayTeam}`).join(', ')} - Bu maçlar yaklaşan maçlar listesinde bulunamadı.
                  </p>
                </div>
              </div>
            )}

            {/* Preview */}
            {previewUrl && (
              <div className="bg-white md:bg-slate-800/50 border border-slate-200 md:border-slate-700 rounded-xl p-4 shadow-sm">
                <h3 className="text-slate-900 md:text-white font-bold text-base mb-3 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-600 md:text-blue-400" />
                  Yüklenen Görsel
                </h3>
                <img
                  src={previewUrl}
                  alt="Analyzed"
                  className="max-h-48 mx-auto rounded-lg border border-slate-300 md:border-slate-600 shadow-md"
                />
              </div>
            )}

            {/* Matched Matches with Predictions */}
            {result.matchedMatches && result.matchedMatches.length > 0 && (
              <div className="bg-white md:bg-slate-800/50 border border-slate-200 md:border-slate-700 rounded-xl p-4 shadow-sm">
                <h3 className="text-slate-900 md:text-green-300 font-bold text-base mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 md:text-green-400" />
                  Tahminler ({result.matchedMatches.length})
                </h3>
                <div className="space-y-3">
                  {result.matchedMatches.map((match, idx) => (
                    <div key={idx} className="bg-slate-50 md:bg-slate-900/50 p-4 rounded-lg border border-slate-200 md:border-slate-700">
                      {/* Maç Bilgisi */}
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 md:border-slate-700/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-900 md:text-white font-bold text-sm">
                            {match.apiMatch.homeTeam} <span className="text-slate-400 md:text-slate-500">vs</span> {match.apiMatch.awayTeam}
                          </p>
                          <p className="text-blue-600 md:text-blue-400 text-xs mt-0.5">{match.apiMatch.league}</p>
                        </div>
                        {match.matchScore && (
                          <span className="text-xs text-slate-500 bg-slate-200 md:bg-slate-700 px-2 py-0.5 rounded">
                            Eşleşme: {match.matchScore.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      
                      {/* İstatistikler */}
                      {match.statistics && (
                        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                          <div className="bg-slate-100 md:bg-slate-800 p-2 rounded text-center">
                            <div className="text-slate-500 md:text-slate-400">Ev Form</div>
                            <div className="text-slate-900 md:text-white font-bold">{match.statistics.homeFormScore}/100</div>
                          </div>
                          <div className="bg-slate-100 md:bg-slate-800 p-2 rounded text-center">
                            <div className="text-slate-500 md:text-slate-400">Gol Ort.</div>
                            <div className="text-slate-900 md:text-white font-bold">{match.statistics.avgGoalsPerMatch}</div>
                          </div>
                          <div className="bg-slate-100 md:bg-slate-800 p-2 rounded text-center">
                            <div className="text-slate-500 md:text-slate-400">Dep Form</div>
                            <div className="text-slate-900 md:text-white font-bold">{match.statistics.awayFormScore}/100</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Tahmin */}
                      {match.prediction && (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 md:from-blue-900/30 md:to-purple-900/30 border border-blue-200 md:border-blue-500/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-yellow-500" />
                              <span className="text-blue-700 md:text-blue-300 font-semibold text-sm">AI Tahmini:</span>
                              <span className="text-slate-900 md:text-white font-bold">{match.prediction}</span>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              (match.confidence || 0) >= 70 ? 'bg-green-100 text-green-700 md:bg-green-600/20 md:text-green-400' :
                              (match.confidence || 0) >= 50 ? 'bg-yellow-100 text-yellow-700 md:bg-yellow-600/20 md:text-yellow-400' :
                              'bg-red-100 text-red-700 md:bg-red-600/20 md:text-red-400'
                            }`}>
                              Güven: {match.confidence}%
                            </span>
                          </div>
                          {match.reasoning && (
                            <p className="text-xs text-slate-600 md:text-slate-400 leading-relaxed">
                              💡 {match.reasoning}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center pt-4">
              <button
                onClick={handleReset}
                className="px-6 py-2.5 bg-slate-200 md:bg-slate-700 hover:bg-slate-300 md:hover:bg-slate-600 text-slate-900 md:text-white rounded-lg font-semibold transition-all active:scale-95"
              >Yeni Analiz</button>
              <button
                onClick={() => navigate('/bulletin')}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all active:scale-95"
              >Bültene Git</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};