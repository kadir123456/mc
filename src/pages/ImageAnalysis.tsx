import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Image as ImageIcon, Loader2, CheckCircle, XCircle, Zap, ArrowLeft, TrendingUp, Target } from 'lucide-react';
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
  analysisType?: string;
}

export const ImageAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<string>('macSonucu');

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

    // ✅ Kredi kontrolü (3 kredi gerekli)
    const REQUIRED_CREDITS = 3;
    if (user.credits < REQUIRED_CREDITS) {
      setError(`Yetersiz kredi. Bu analiz için ${REQUIRED_CREDITS} kredi gereklidir. Lütfen kredi satın alın.`);
      return;
    }

    // ✅ Kullanıcıya onay sor
    const confirmed = window.confirm(
      `Bu analiz ${REQUIRED_CREDITS} kredi harcayacaktır.\n\nMevcut krediniz: ${user.credits}\nKalan krediniz: ${user.credits - REQUIRED_CREDITS}\n\nDevam etmek istiyor musunuz?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setResult(null);

      // Görseli base64'e çevir
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      
      const base64Image = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });

      const response = await fetch('/api/analyze-coupon-image', {
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

        {/* Analysis Type Selection */}
        {!result && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6">
            <label className="block text-white font-semibold mb-3">
              Tahmin Türü Seçin
            </label>
            <select
              value={analysisType}
              onChange={(e) => setAnalysisType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="macSonucu">Maç Sonucu (1/X/2)</option>
              <option value="ilkYariSonucu">İlk Yarı Sonucu</option>
              <option value="karsilikliGol">Karşılıklı Gol (Var/Yok)</option>
              <option value="ilkYariMac">İlk Yarı/Maç</option>
              <option value="handikap">Handikap</option>
              <option value="altustu">2.5 Alt/Üst</option>
              <option value="hepsi">Tüm Tahminler</option>
            </select>
          </div>
        )}

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
                    Boşluğa Tıkla
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
                    onClick={handleAnalyze}
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
              <div>
                <p className="text-green-300 font-medium">Analiz Tamamlandı!</p>
                <p className="text-sm text-green-200/80">Görsel başarıyla analiz edildi. 3 kredi hesabınızdan düşüldü.</p>
              </div>
            </div>

            {/* Preview */}
            {previewUrl && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-400" />
                  Yüklenen Görsel
                </h3>
                <img
                  src={previewUrl}
                  alt="Analyzed"
                  className="max-h-64 mx-auto rounded-lg border border-slate-600"
                />
              </div>
            )}

            {/* OCR Text */}
            {result.ocrText && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Çıkarılan Metin
                </h3>
                <pre className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-900/50 p-3 rounded max-h-64 overflow-y-auto">
                  {result.ocrText}
                </pre>
              </div>
            )}

            {/* Extracted Matches */}
            {result.extractedMatches && result.extractedMatches.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3">
                  Tespit Edilen Maçlar ({result.extractedMatches.length})
                </h3>
                <div className="space-y-2">
                  {result.extractedMatches.map((match, idx) => (
                    <div key={idx} className="bg-slate-900/50 p-3 rounded border border-slate-700">
                      <p className="text-white font-medium">
                        {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
                      </p>
                      {match.league && (
                        <p className="text-sm text-slate-400 mt-1">{match.league}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kupon - AI Tahminleri */}
            {result.matchedMatches && result.matchedMatches.length > 0 && (
              <div className="bg-gradient-to-br from-emerald-900/30 to-blue-900/30 border-2 border-emerald-500/40 rounded-xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <Target className="w-6 h-6 text-emerald-400" />
                    </div>
                    AI Kupon Tahminleri
                  </h3>
                  <div className="bg-emerald-500/20 text-emerald-300 px-4 py-2 rounded-lg font-bold">
                    {result.matchedMatches.length} Maç
                  </div>
                </div>

                {/* Analiz Türü */}
                {result.analysisType && (
                  <div className="mb-4 text-center">
                    <span className="inline-block bg-blue-500/20 text-blue-300 px-4 py-2 rounded-lg text-sm font-medium">
                      {result.analysisType === 'macSonucu' && 'Maç Sonucu'}
                      {result.analysisType === 'ilkYariSonucu' && 'İlk Yarı Sonucu'}
                      {result.analysisType === 'karsilikliGol' && 'Karşılıklı Gol'}
                      {result.analysisType === 'ilkYariMac' && 'İlk Yarı/Maç'}
                      {result.analysisType === 'handikap' && 'Handikap'}
                      {result.analysisType === 'altustu' && '2.5 Alt/Üst'}
                      {result.analysisType === 'hepsi' && 'Tüm Tahminler'}
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  {result.matchedMatches.map((match, idx) => (
                    <div 
                      key={idx} 
                      className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-lg p-5 hover:border-emerald-500/50 transition-all duration-300"
                      data-testid={`coupon-match-${idx}`}
                    >
                      {/* Maç Bilgisi */}
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <p className="text-white font-bold text-lg mb-1">
                            {match.apiMatch.homeTeam}
                            <span className="text-slate-500 mx-2">vs</span>
                            {match.apiMatch.awayTeam}
                          </p>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-blue-400">{match.apiMatch.league}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400">
                              {new Date(match.apiMatch.date).toLocaleString('tr-TR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        <span className="bg-emerald-600/20 text-emerald-300 text-xs px-3 py-1 rounded-full font-medium">
                          {match.apiMatch.status}
                        </span>
                      </div>

                      {/* Tahmin */}
                      <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="w-5 h-5 text-emerald-400" />
                              <span className="text-slate-400 text-sm font-medium">AI Tahmini:</span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-400" data-testid={`prediction-${idx}`}>
                              {match.prediction || 'Tahmin yapılıyor...'}
                            </p>
                          </div>
                          
                          {/* Güven Skoru */}
                          {match.confidence && (
                            <div className="text-right">
                              <div className="text-sm text-slate-400 mb-1">Güven</div>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
                                    style={{ width: `${match.confidence}%` }}
                                  />
                                </div>
                                <span className="text-lg font-bold text-white">
                                  {match.confidence}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Açıklama */}
                        {match.reasoning && (
                          <div className="mt-3 pt-3 border-t border-slate-700/50">
                            <p className="text-sm text-slate-300 leading-relaxed">
                              {match.reasoning}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Kupon Özeti */}
                <div className="mt-6 bg-slate-800/60 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Toplam Maç</p>
                      <p className="text-white text-2xl font-bold">{result.matchedMatches.length}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-sm mb-1">Ortalama Güven</p>
                      <p className="text-emerald-400 text-2xl font-bold">
                        {Math.round(
                          result.matchedMatches.reduce((sum, m) => sum + (m.confidence || 0), 0) / 
                          result.matchedMatches.length
                        )}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Analysis */}
            {result.analysis && (
              <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg p-6">
                <h3 className="text-blue-300 font-semibold mb-4 flex items-center gap-2 text-lg">
                  <Zap className="w-6 h-6" />
                  AI Analiz Sonucu
                </h3>
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {result.analysis}
                  </div>
                </div>
              </div>
            )}

            {/* Message */}
            {result.message && (
              <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-300">{result.message}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center pt-4">
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
              >
                Yeni Analiz
              </button>
              <button
                onClick={() => navigate('/bulletin')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                Bültene Git
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};