import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Image as ImageIcon, Loader2, CheckCircle, XCircle, Zap, ArrowLeft, Save, History, Trash2 } from 'lucide-react';
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
}

interface AnalysisResult {
  success: boolean;
  message?: string;
  ocrText?: string;
  extractedMatches?: ExtractedMatch[];
  matchedMatches?: MatchedMatch[];
  analysis?: string;
}

interface SavedAnalysis {
  id: string;
  result: AnalysisResult;
  previewUrl?: string;
  savedAt: number;
  timestamp: string;
}

export const ImageAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('Lütfen bir görsel seçin');
      return;
    }

    if (!user) {
      navigate('/login');
      return;
    }

    // ✅ Kredi kontrolü (1 kredi gerekli)
    const REQUIRED_CREDITS = 1;
    if (user.credits < REQUIRED_CREDITS) {
      setError(`Yetersiz kredi. Bu analiz için ${REQUIRED_CREDITS} kredi gereklidir. Lütfen kredi satın alın.`);
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setResult(null);

      // ✅ Görseli base64'e çevir
      const reader = new FileReader();
      const base64Image = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      // ✅ JSON olarak gönder (FormData yerine)
      const response = await fetch('/api/analyze-coupon-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          userId: user.uid,
          creditsToDeduct: REQUIRED_CREDITS,
          analysisType: 'hepsi', // ✅ Tüm tahmin türlerini al
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analiz başarısız oldu');
      }

      setResult(data);
      
      // ✅ Kredi bakiyesini güncelle (sayfa yenilemeden)
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

  // Analizi kaydet
  const handleSaveAnalysis = async () => {
    if (!user || !result) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          analysisData: {
            result,
            previewUrl
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kaydetme başarısız');
      }

      alert('✅ Analiz başarıyla kaydedildi!');
      loadAnalysisHistory(); // Geçmişi yenile

    } catch (err: any) {
      console.error('Kaydetme hatası:', err);
      setError(err.message || 'Kaydetme sırasında hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  // Geçmiş analizleri yükle
  const loadAnalysisHistory = async () => {
    if (!user) return;

    try {
      setLoadingHistory(true);

      const response = await fetch(`/api/get-analyses/${user.uid}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setSavedAnalyses(data.analyses || []);
      }

    } catch (err) {
      console.error('Geçmiş yükleme hatası:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Analizi sil
  const handleDeleteAnalysis = async (analysisId: string) => {
    if (!user) return;
    
    if (!confirm('Bu analizi silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/delete-analysis/${user.uid}/${analysisId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('✅ Analiz silindi');
        loadAnalysisHistory(); // Geçmişi yenile
      }

    } catch (err) {
      console.error('Silme hatası:', err);
      alert('❌ Silme sırasında hata oluştu');
    }
  };

  // Kaydedilmiş analizi görüntüle
  const handleViewSavedAnalysis = (analysis: SavedAnalysis) => {
    setResult(analysis.result);
    setPreviewUrl(analysis.previewUrl || null);
    setSelectedFile(null);
    setShowHistory(false);
  };

  // Sayfa yüklendiğinde geçmişi yükle
  useEffect(() => {
    if (user) {
      loadAnalysisHistory();
    }
  }, [user]);

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
    <div className="min-h-screen bg-slate-900 pb-20 md:pb-8 md:pt-20">
      {/* Header */}
      <header className="md:hidden bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-1 text-slate-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <ImageIcon className="w-5 h-5 text-yellow-400" />
              <h1 className="text-base font-bold text-white">Görsel Analizi</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-1 text-slate-300 hover:text-white relative"
              >
                <History className="w-4 h-4" />
                {savedAnalyses.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-blue-600 text-white text-[10px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {savedAnalyses.length}
                  </span>
                )}
              </button>
              <div className="bg-slate-700/80 px-2 py-1 rounded text-xs font-medium text-yellow-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {user.credits}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 py-3 md:py-8">
        {/* Desktop Header */}
        <div className="hidden md:block mb-6">
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
          <div className="flex items-center justify-between">
            <p className="text-slate-400 ml-14 text-sm">
              Maç listesi görselinizi yükleyin, AI ile detaylı analiz edelim
            </p>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-medium transition flex items-center gap-2"
            >
              <History className="w-4 h-4" />
              Geçmiş
              {savedAnalyses.length > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5">
                  {savedAnalyses.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Info Card - Mobile Optimized */}
        <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-3 mb-3">
          <h3 className="text-blue-300 text-sm font-semibold mb-1.5 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4" />
            Nasıl Çalışır?
          </h3>
          <ul className="text-xs text-slate-300 space-y-0.5">
            <li>• Bülten görselini yükle (1 kredi)</li>
            <li>• AI maçları otomatik çıkarır</li>
            <li>• Her maç için tahmin ve analiz alırsın</li>
          </ul>
        </div>

        {/* Upload Area - Mobile Optimized */}
        {!result && (
          <div className="bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-lg p-4 md:p-6 text-center">
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
                  <Upload className="w-12 h-12 md:w-16 md:h-16 mx-auto text-slate-500 mb-3" />
                  <p className="text-white text-sm md:text-base font-medium mb-1">Maç Görseli Yükle</p>
                  <p className="text-xs text-slate-400 mb-3">
                    veya sürükleyip bırakın
                  </p>
                  <span className="px-4 py-2 md:px-6 md:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition inline-block">
                    Dosya Seç
                  </span>
                </label>
                <p className="text-xs text-slate-500 mt-3">
                  PNG, JPG, JPEG (Max 10MB)
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-64 md:max-h-96 mx-auto rounded-lg border border-slate-600"
                />
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleReset}
                    className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-medium transition"
                  >
                    Değiştir
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={uploading}
                    className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white text-sm rounded-lg font-medium transition flex items-center gap-1.5"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs md:text-sm">Analiz Ediliyor...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span className="text-xs md:text-sm">Analiz Et (1 Kredi)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error - Mobile Optimized */}
        {error && (
          <div className="mt-3 bg-red-600/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 text-sm font-medium">Hata</p>
              <p className="text-xs text-red-200/80">{error}</p>
            </div>
          </div>
        )}

        {/* Results - Mobile Optimized */}
        {result && (
          <div className="space-y-3 mt-3">
            {/* Success Message - Compact */}
            <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-2.5 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-300 text-sm font-medium">Analiz Tamamlandı!</p>
                <p className="text-xs text-green-200/80">
                  1 kredi düşüldü. Tahminler hazır.
                </p>
              </div>
            </div>

            {/* Preview - Compact */}
            {previewUrl && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5">
                <h3 className="text-white text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  Yüklenen Görsel
                </h3>
                <img
                  src={previewUrl}
                  alt="Analyzed"
                  className="max-h-48 mx-auto rounded-lg border border-slate-600"
                />
              </div>
            )}

            {/* OCR Text - Compact */}
            {result.ocrText && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5">
                <h3 className="text-white text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Çıkarılan Metin
                </h3>
                <pre className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-900/50 p-2 rounded max-h-40 overflow-y-auto">
                  {result.ocrText}
                </pre>
              </div>
            )}

            {/* Extracted Matches - Compact */}
            {result.extractedMatches && result.extractedMatches.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2.5">
                <h3 className="text-white text-sm font-semibold mb-2">
                  Tespit Edilen Maçlar ({result.extractedMatches.length})
                </h3>
                <div className="space-y-1.5">
                  {result.extractedMatches.map((match, idx) => (
                    <div key={idx} className="bg-slate-900/50 p-2 rounded border border-slate-700">
                      <p className="text-white text-xs font-medium">
                        {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
                      </p>
                      {match.league && (
                        <p className="text-xs text-slate-400 mt-0.5">{match.league}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Matched Matches - Mobile Optimized */}
            {result.matchedMatches && result.matchedMatches.length > 0 && (
              <div className="bg-slate-800/50 border border-green-700/30 rounded-lg p-2.5">
                <h3 className="text-green-300 text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Müsabaka Tahminleri ({result.matchedMatches.length})
                </h3>
                <div className="space-y-2">
                  {result.matchedMatches.map((match, idx) => (
                    <div key={idx} className="bg-slate-900/50 p-2.5 rounded border border-green-700/30">
                      {/* Maç Bilgisi - Compact */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium leading-tight">
                            {match.apiMatch.homeTeam} <span className="text-slate-500">vs</span> {match.apiMatch.awayTeam}
                          </p>
                          <p className="text-xs text-blue-400 mt-0.5 truncate">{match.apiMatch.league}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(match.apiMatch.date).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <span className="bg-green-600/20 text-green-300 text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                          {match.apiMatch.status}
                        </span>
                      </div>
                      
                      {/* AI Tahmini - Compact & Clear */}
                      {match.prediction && (
                        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg p-2">
                          {/* Tahmin ve Güven */}
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                              <span className="text-blue-300 text-xs font-medium">Tahmin:</span>
                              <span className="text-white font-bold text-sm">{match.prediction}</span>
                            </div>
                            <div className="flex items-center gap-1 bg-slate-900/50 px-2 py-0.5 rounded">
                              <span className="text-[10px] text-slate-400">Güven</span>
                              <span className="text-yellow-400 font-semibold text-xs">{match.confidence}%</span>
                            </div>
                          </div>
                          {/* Açıklama */}
                          {match.reasoning && (
                            <p className="text-xs text-slate-300 leading-snug border-t border-slate-700/50 pt-1.5">
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

            {/* AI Analysis - Compact */}
            {result.analysis && (
              <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-3">
                <h3 className="text-blue-300 text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  AI Analiz Sonucu
                </h3>
                <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {result.analysis}
                </div>
              </div>
            )}

            {/* Message - Compact */}
            {result.message && (
              <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-2.5">
                <p className="text-yellow-300 text-xs">{result.message}</p>
              </div>
            )}

            {/* Actions - Compact Mobile Buttons */}
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              <button
                onClick={handleSaveAnalysis}
                disabled={saving}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white text-xs md:text-sm rounded-lg font-medium transition flex items-center gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Kaydet
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs md:text-sm rounded-lg font-medium transition"
              >
                Yeni Analiz
              </button>
              <button
                onClick={() => navigate('/bulletin')}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm rounded-lg font-medium transition"
              >
                Bültene Git
              </button>
            </div>
          </div>
        )}

        {/* Geçmiş Analizler - Mobile Optimized */}
        {showHistory && (
          <div className="mt-4 bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-400" />
                Kaydedilmiş Analizler ({savedAnalyses.length})
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            {loadingHistory ? (
              <div className="text-center py-6">
                <Loader2 className="w-6 h-6 mx-auto text-blue-400 animate-spin mb-2" />
                <p className="text-slate-400 text-xs">Yükleniyor...</p>
              </div>
            ) : savedAnalyses.length === 0 ? (
              <div className="text-center py-6">
                <History className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-slate-400 text-xs">Henüz kaydedilmiş analiz yok</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {savedAnalyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="bg-slate-900/50 border border-slate-700 rounded-lg p-2.5 hover:border-blue-500/50 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <ImageIcon className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                          <p className="text-white text-xs font-medium">
                            {analysis.result.matchedMatches?.length || 0} Maç Analizi
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {new Date(analysis.savedAt).toLocaleString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleViewSavedAnalysis(analysis)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition"
                        >
                          Görüntüle
                        </button>
                        <button
                          onClick={() => handleDeleteAnalysis(analysis.id)}
                          className="p-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};