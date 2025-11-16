// src/pages/ImageAnalysis.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Image as ImageIcon, Loader2, CheckCircle, XCircle, Zap, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface MatchPrediction {
  homeTeam: string;
  awayTeam: string;
  league: string;
  predictions: {
    ms1: number;
    msX: number;
    ms2: number;
    over25: number;
    under25: number;
  };
  bestBet: {
    type: string;
    percentage: number;
  };
}

interface AnalysisResult {
  success: boolean;
  message?: string;
  predictions?: MatchPrediction[];
}

export const ImageAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    const REQUIRED_CREDITS = 3;
    if (user.credits < REQUIRED_CREDITS) {
      setError(`Yetersiz kredi. Bu analiz için ${REQUIRED_CREDITS} kredi gereklidir.`);
      return;
    }

    const confirmed = window.confirm(
      `Bu analiz ${REQUIRED_CREDITS} kredi harcayacaktır.\n\nMevcut: ${user.credits} | Kalan: ${user.credits - REQUIRED_CREDITS}\n\nDevam edilsin mi?`
    );

    if (!confirmed) return;

    try {
      setUploading(true);
      setError(null);
      setResult(null);

      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('userId', user.uid);
      formData.append('creditsToDeduct', REQUIRED_CREDITS.toString());

      const response = await fetch('/api/analyze-coupon-image', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analiz başarısız');
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
        {/* Upload Area */}
        {!result && (
          <div className="bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-xl p-8 text-center">
            {!previewUrl ? (
              <div>
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
                  <p className="text-sm text-slate-400 mb-4">PNG, JPG (Max 10MB)</p>
                  <button
                    type="button"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                  >
                    Dosya Seç
                  </button>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-80 mx-auto rounded-lg border border-slate-600"
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

        {/* ✅ SONUÇLAR - SADECE TAHMİNLER */}
        {result && result.predictions && (
          <div className="space-y-4 mt-6">
            {/* Success */}
            <div className="bg-green-600/10 border border-green-500/30 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-green-300 font-bold">✅ Analiz Tamamlandı</p>
                  <p className="text-sm text-green-200/80">{result.predictions.length} maç analiz edildi</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition"
              >
                Yeni Analiz
              </button>
            </div>

            {/* Tahminler */}
            {result.predictions.map((match, idx) => (
              <div
                key={idx}
                className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-blue-500/30 transition"
              >
                {/* Başlık */}
                <div className="bg-slate-900/70 px-4 py-3 border-b border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-white font-bold">
                          {match.homeTeam} <span className="text-slate-500">vs</span> {match.awayTeam}
                        </p>
                        <p className="text-xs text-blue-400">{match.league}</p>
                      </div>
                    </div>
                    {/* En İyi Tahmin */}
                    <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 px-3 py-1.5 rounded-lg text-right">
                      <p className="text-xs text-slate-400">Önerilen</p>
                      <p className="text-green-400 font-bold text-sm">{match.bestBet.type}</p>
                      <p className="text-green-300 text-xs">%{match.bestBet.percentage}</p>
                    </div>
                  </div>
                </div>

                {/* Tahmin Tablosu */}
                <div className="p-4">
                  {/* Maç Sonucu */}
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-2 font-semibold">MAÇ SONUCU</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className={`text-center p-3 rounded-lg ${match.predictions.ms1 > 40 ? 'bg-green-600/20 border border-green-500/30' : 'bg-slate-700/50'}`}>
                        <p className="text-[10px] text-slate-400 mb-1">EV SAHİBİ</p>
                        <p className={`text-lg font-bold ${match.predictions.ms1 > 40 ? 'text-green-400' : 'text-white'}`}>
                          %{match.predictions.ms1}
                        </p>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${match.predictions.msX > 30 ? 'bg-yellow-600/20 border border-yellow-500/30' : 'bg-slate-700/50'}`}>
                        <p className="text-[10px] text-slate-400 mb-1">BERABERLİK</p>
                        <p className={`text-lg font-bold ${match.predictions.msX > 30 ? 'text-yellow-400' : 'text-white'}`}>
                          %{match.predictions.msX}
                        </p>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${match.predictions.ms2 > 40 ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-slate-700/50'}`}>
                        <p className="text-[10px] text-slate-400 mb-1">DEPLASMAN</p>
                        <p className={`text-lg font-bold ${match.predictions.ms2 > 40 ? 'text-blue-400' : 'text-white'}`}>
                          %{match.predictions.ms2}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Gol Sayısı */}
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-semibold">TOPLAM GOL</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`text-center p-3 rounded-lg ${match.predictions.under25 > 50 ? 'bg-purple-600/20 border border-purple-500/30' : 'bg-slate-700/50'}`}>
                        <p className="text-[10px] text-slate-400 mb-1">0-2 GOL</p>
                        <p className={`text-lg font-bold ${match.predictions.under25 > 50 ? 'text-purple-400' : 'text-white'}`}>
                          %{match.predictions.under25}
                        </p>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${match.predictions.over25 > 50 ? 'bg-orange-600/20 border border-orange-500/30' : 'bg-slate-700/50'}`}>
                        <p className="text-[10px] text-slate-400 mb-1">3+ GOL</p>
                        <p className={`text-lg font-bold ${match.predictions.over25 > 50 ? 'text-orange-400' : 'text-white'}`}>
                          %{match.predictions.over25}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Bottom Action */}
            <div className="text-center pt-4">
              <button
                onClick={() => navigate('/bulletin')}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-bold transition shadow-lg"
              >
                Bültene Git →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
