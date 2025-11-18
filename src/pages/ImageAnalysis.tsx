import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Image as ImageIcon, Loader2, CheckCircle, XCircle, Zap, ArrowLeft, AlertTriangle, X } from 'lucide-react';
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
}

interface AnalysisResult {
  success: boolean;
  message?: string;
  ocrText?: string;
  extractedMatches?: ExtractedMatch[];
  matchedMatches?: MatchedMatch[];
  predictions?: Record<string, any>;
  analysisType?: string;
}

type AnalysisType = 'ilkYariSonucu' | 'macSonucu' | 'karsilikliGol' | 'ilkYariMac' | 'handikap' | 'altustu' | 'hepsi';

export const ImageAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<AnalysisType | null>(null);

  // Görsel yüklenince popup'ı aç
  useEffect(() => {
    if (selectedFile && !showPopup && !result) {
      setShowPopup(true);
    }
  }, [selectedFile]);

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

  const handleAnalysisTypeSelect = (type: AnalysisType) => {
    setSelectedAnalysisType(type);
    setShowPopup(false);
    handleAnalyze(type);
  };

  const handleAnalyze = async (analysisType: AnalysisType) => {
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

      // Görseli base64'e çevir
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const base64Image = await base64Promise;

      console.log('📤 API isteği gönderiliyor:', {
        imageLength: base64Image.length,
        userId: user.uid,
        creditsToDeduct: REQUIRED_CREDITS,
        analysisType: analysisType,
      });

      const response = await fetch('https://aikupon.com/api/analyze-coupon-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          userId: user.uid,
          creditsToDeduct: REQUIRED_CREDITS,
          analysisType: analysisType,
        }),
      });

      console.log('📥 API yanıtı alındı:', response.status);
      const data = await response.json();
      console.log('📊 Yanıt verisi:', data);

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
                <label htmlFor="file-upload" className="cursor-pointer block">
                  <Upload className="w-16 h-16 mx-auto text-slate-500 mb-4" />
                  <p className="text-white font-medium mb-2">Maç Görseli Yükle</p>
                  <p className="text-sm text-slate-400 mb-4">
                    veya sürükleyip bırakın
                  </p>
                </label>
                <button
                  type="button"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="px-6 py-3 min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                >
                  Dosya Seç
                </button>
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
                    className="px-6 py-2 min-h-[48px] bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                  >
                    Değiştir
                  </button>
                </div>
                {uploading && (
                  <div className="flex items-center justify-center gap-2 text-blue-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Analiz Ediliyor...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Analysis Type Popup */}
        {showPopup && !uploading && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Hangi Sonucu Görmek İstersiniz?</h3>
                <button
                  onClick={() => {setShowPopup(false); handleReset();}}
                  className="text-slate-400 hover:text-white transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => handleAnalysisTypeSelect('ilkYariSonucu')}
                  className="w-full px-6 py-4 min-h-[48px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition text-left"
                  data-testid="analysis-type-ilk-yari"
                >
                  İlk Yarı Sonucu
                </button>
                
                <button
                  onClick={() => handleAnalysisTypeSelect('macSonucu')}
                  className="w-full px-6 py-4 min-h-[48px] bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-medium transition text-left"
                  data-testid="analysis-type-mac-sonucu"
                >
                  Maç Sonucu
                </button>
                
                <button
                  onClick={() => handleAnalysisTypeSelect('karsilikliGol')}
                  className="w-full px-6 py-4 min-h-[48px] bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium transition text-left"
                  data-testid="analysis-type-kg"
                >
                  Karşılıklı Gol Var
                </button>
                
                <button
                  onClick={() => handleAnalysisTypeSelect('ilkYariMac')}
                  className="w-full px-6 py-4 min-h-[48px] bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-lg font-medium transition text-left"
                  data-testid="analysis-type-ilk-yari-mac"
                >
                  İlk Yarı / Maç Sonucu
                </button>
                
                <button
                  onClick={() => handleAnalysisTypeSelect('handikap')}
                  className="w-full px-6 py-4 min-h-[48px] bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium transition text-left"
                  data-testid="analysis-type-handikap"
                >
                  Handikap
                </button>
                
                <button
                  onClick={() => handleAnalysisTypeSelect('altustu')}
                  className="w-full px-6 py-4 min-h-[48px] bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg font-medium transition text-left"
                  data-testid="analysis-type-alt-ust"
                >
                  2.5 Alt / Üst
                </button>
                
                <button
                  onClick={() => handleAnalysisTypeSelect('hepsi')}
                  className="w-full px-6 py-4 min-h-[48px] bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white rounded-lg font-medium transition text-left"
                  data-testid="analysis-type-hepsi"
                >
                  Hepsi
                </button>
              </div>
              
              <p className="text-xs text-slate-400 mt-4 text-center">
                Bu analiz 3 kredi harcayacaktır
              </p>
            </div>
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

            {/* Matched Matches - BAŞARILI SONUÇLAR */}
            {result.matchedMatches && result.matchedMatches.length > 0 && (
              <div className="bg-slate-800/50 border border-green-600/30 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-b border-green-600/30 px-5 py-4">
                  <h3 className="text-green-300 font-bold text-lg flex items-center gap-2">
                    <CheckCircle className="w-6 h-6" />
                    Analiz Sonuçları ({result.matchedMatches.length})
                  </h3>
                  <p className="text-sm text-green-200/70 mt-1">
                    {result.analysisType === 'macSonucu' && 'Maç Sonucu Tahminleri'}
                    {result.analysisType === 'karsilikliGol' && 'Karşılıklı Gol Tahminleri'}
                    {result.analysisType === 'altustu' && '2.5 Alt/Üst Tahminleri'}
                    {result.analysisType === 'ilkYariSonucu' && 'İlk Yarı Sonucu Tahminleri'}
                    {result.analysisType === 'ilkYariMac' && 'İlk Yarı/Maç Sonucu Tahminleri'}
                    {result.analysisType === 'handikap' && 'Handikap Tahminleri'}
                    {result.analysisType === 'hepsi' && 'Tüm Tahminler'}
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  {result.matchedMatches.map((match, idx) => (
                    <div key={idx} className="bg-slate-900/70 rounded-lg border border-green-600/20 p-4 hover:border-green-500/40 transition">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <p className="text-white font-semibold text-lg mb-1">
                            {match.apiMatch.homeTeam} 
                            <span className="text-slate-500 mx-2">vs</span> 
                            {match.apiMatch.awayTeam}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            <span className="text-sm text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded">
                              {match.apiMatch.league}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(match.apiMatch.date).toLocaleString('tr-TR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {match.prediction && (
                            <div className="mt-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-3">
                              <p className="text-sm text-blue-300 font-medium mb-1">Tahmin:</p>
                              <p className="text-white font-bold text-lg">{match.prediction}</p>
                            </div>
                          )}
                        </div>
                        <span className="bg-green-600/20 text-green-300 text-xs font-medium px-3 py-1.5 rounded-full border border-green-500/30">
                          {match.apiMatch.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Matches - BAŞARISIZ SONUÇLAR */}
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
                        API'de Bulunamayan Maçlar ({failedMatches.length})
                      </h3>
                      <p className="text-sm text-orange-200/70 mt-1">Bu maçlar API veritabanında eşleştirilemedi</p>
                    </div>
                    <div className="p-4 space-y-3">
                      {failedMatches.map((match, idx) => (
                        <div key={idx} className="bg-slate-900/70 rounded-lg border border-orange-600/20 p-4">
                          <p className="text-white font-medium">
                            {match.homeTeam} 
                            <span className="text-slate-500 mx-2">vs</span> 
                            {match.awayTeam}
                          </p>
                          {match.league && (
                            <p className="text-sm text-slate-400 mt-2 bg-slate-800/50 px-2.5 py-1 rounded inline-block">
                              {match.league}
                            </p>
                          )}
                          <p className="text-xs text-orange-400 mt-3 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            Maç bilgileri API'de bulunamadı veya geçmiş tarihli
                          </p>
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
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-300 font-semibold mb-1">Maç Bulunamadı</p>
                    <p className="text-sm text-yellow-200/80">
                      Görseldeki maçlar API veritabanında bulunamadı. Lütfen:
                    </p>
                    <ul className="text-sm text-yellow-200/70 mt-2 space-y-1 ml-4 list-disc">
                      <li>Görselin net ve okunabilir olduğundan emin olun</li>
                      <li>Maç isimlerinin doğru yazıldığını kontrol edin</li>
                      <li>Güncel maçların bulunduğu bir görsel kullanın</li>
                    </ul>
                  </div>
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
                onClick={() => navigate('/bulletin')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                Bültene Git
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
