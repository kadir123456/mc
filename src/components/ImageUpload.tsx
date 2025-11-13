import React, { useState } from 'react';
import { Upload, Loader, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { analysisService } from '../services/analysisService';
import { authService } from '../services/authService';
import { compressImage } from '../utils/imageCompressor';

interface ImageUploadProps {
  onAnalysisComplete?: () => void;
}

type AnalysisStep = {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress: number;
};

interface DetectedMatch {
  matchId: string;
  teamHome: string;
  teamAway: string;
  league: string;
  date?: string;
  time?: string;
  odds?: {
    ms1?: number;
    msx?: number;
    ms2?: number;
    beraberlik?: number;
    ust25?: number;
    alt25?: number;
    kgg?: number;
  };
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onAnalysisComplete }) => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [detectedMatches, setDetectedMatches] = useState<DetectedMatch[] | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [editedMatches, setEditedMatches] = useState<DetectedMatch[]>([]);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>([
    { id: 'upload', label: 'Görsel yükleniyor', status: 'pending', progress: 0 },
    { id: 'detect', label: 'Maçlar tespit ediliyor', status: 'pending', progress: 0 },
    { id: 'collect', label: 'Gerçek zamanlı veriler toplanıyor', status: 'pending', progress: 0 },
    { id: 'analyze', label: 'Analiz tamamlanıyor', status: 'pending', progress: 0 },
  ]);

  const updateStep = (stepId: string, status: AnalysisStep['status'], progress: number) => {
    setAnalysisSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status, progress } : step
      )
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Lütfen bir görsel dosyası seçin');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Dosya boyutu 10MB\'den büyük olamaz');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  // ADIM 1: Maçları Tespit Et ve Kullanıcıya Göster
  const handleDetectMatches = async () => {
    if (!preview || !user) return;

    setLoading(true);
    setError('');
    setShowConfirmation(false);

    try {
      updateStep('upload', 'in_progress', 30);
      const base64 = preview.split(',')[1];

      // Görseli sıkıştır
      const compressedImage = await compressImage(base64, 800, 0.6);
      updateStep('upload', 'completed', 100);

      updateStep('detect', 'in_progress', 50);
      const matches = await analysisService.detectMatches(compressedImage);
      updateStep('detect', 'completed', 100);

      if (!matches || matches.length === 0) {
        throw new Error('Görselde maç tespit edilemedi. Lütfen daha net bir görsel yükleyin.');
      }

      setDetectedMatches(matches);
      setEditedMatches(matches);
      setShowConfirmation(true);
    } catch (err: any) {
      setError(err.message || 'Maç tespiti sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // ADIM 2: Kullanıcı Onayladıktan Sonra Analiz Yap
  const handleConfirmAndAnalyze = async () => {
    if (!preview || !user || !editedMatches) return;

    if (user.credits < 1) {
      setError('Yeterli krediniz yok. Lütfen kredi satın alın.');
      return;
    }

    setLoading(true);
    setError('');
    setShowConfirmation(false);

    let creditDeducted = false;
    let analysisSuccessful = false;

    try {
      // Önce kredi düş
      await authService.updateCredits(user.uid, user.credits - 1);
      creditDeducted = true;
      await refreshUser();

      updateStep('collect', 'in_progress', 30);
      const matchesWithData = await analysisService.getOrFetchMatchData(editedMatches as any);

      // Veri kalitesi kontrolü
      const validMatches = matchesWithData.filter(m => m.cachedData.confidenceScore >= 40);

      if (validMatches.length === 0) {
        throw new Error('Maç verileri alınamadı. Veri kalitesi yetersiz.');
      }

      updateStep('collect', 'completed', 100);

      updateStep('analyze', 'in_progress', 50);
      const finalAnalysis = await analysisService.performFinalAnalysis(matchesWithData);

      // Final analiz kontrolü
      if (!finalAnalysis || !finalAnalysis.matches || finalAnalysis.matches.length === 0) {
        throw new Error('Analiz tamamlanamadı. Veriler yetersiz.');
      }

      updateStep('analyze', 'completed', 100);

      // Başarılı analizi kaydet
      await analysisService.saveCouponAnalysis(user.uid, {
        id: '',
        userId: user.uid,
        imageUrl: preview,
        uploadedAt: Date.now(),
        analysis: finalAnalysis,
        status: 'completed',
      });

      analysisSuccessful = true;
      setSuccess('✅ Analiz başarıyla tamamlandı! Detaylı sonuçlar aşağıda.');
      setPreview(null);
      setDetectedMatches(null);
      setEditedMatches([]);

      if (onAnalysisComplete) {
        onAnalysisComplete();
      }

      setTimeout(() => setSuccess(''), 7000);
    } catch (err: any) {
      console.error('Analiz hatası:', err);

      // Hata durumunda krediyi iade et
      if (creditDeducted && !analysisSuccessful) {
        try {
          await authService.updateCredits(user.uid, user.credits + 1);
          await refreshUser();

          setError(
            `❌ Analiz başarısız oldu: ${err.message}\n\n✅ Krediniz iade edildi (1 kredi geri yüklendi)`
          );
        } catch (refundError) {
          console.error('Kredi iadesi hatası:', refundError);
          setError(
            `❌ Analiz başarısız: ${err.message}\n⚠️ Kredi iadesi yapılamadı, lütfen destek ekibiyle iletişime geçin.`
          );
        }
      } else {
        setError(`❌ ${err.message || 'Analiz sırasında hata oluştu'}`);
      }

      // Başarısız analizi kaydet
      try {
        await analysisService.saveCouponAnalysis(user.uid, {
          id: '',
          userId: user.uid,
          imageUrl: preview,
          uploadedAt: Date.now(),
          analysis: {
            matches: [],
            finalCoupon: [],
            totalOdds: 0,
            confidence: 0,
            recommendations: [`Analiz başarısız: ${err.message}`],
          },
          status: 'failed',
          errorMessage: err.message,
        });
      } catch (saveError) {
        console.error('Başarısız analiz kaydı hatası:', saveError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setDetectedMatches(null);
    setEditedMatches([]);
    setAnalysisSteps([
      { id: 'upload', label: 'Görsel yükleniyor', status: 'pending', progress: 0 },
      { id: 'detect', label: 'Maçlar tespit ediliyor', status: 'pending', progress: 0 },
      { id: 'collect', label: 'Gerçek zamanlı veriler toplanıyor', status: 'pending', progress: 0 },
      { id: 'analyze', label: 'Analiz tamamlanıyor', status: 'pending', progress: 0 },
    ]);
  };

  const handleEditMatch = (index: number, field: keyof DetectedMatch, value: string) => {
    const updated = [...editedMatches];
    (updated[index] as any)[field] = value;
    setEditedMatches(updated);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-2">Kupon Analizi Yap</h2>
      <p className="text-slate-400 mb-6">Kupon görselini yükle ve gerçek zamanlı verilerle detaylı analiz al</p>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-green-400">{success}</p>
        </div>
      )}

      {loading && (
        <div className="mb-6 p-6 bg-slate-700/50 border border-slate-600 rounded-lg">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Loader className="w-5 h-5 animate-spin text-cyan-400" />
            Analiz İşlemi Devam Ediyor
          </h3>
          <div className="space-y-4">
            {analysisSteps.map((step) => (
              <div key={step.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className={`
                    ${step.status === 'completed' ? 'text-green-400' : ''}
                    ${step.status === 'in_progress' ? 'text-cyan-400' : ''}
                    ${step.status === 'pending' ? 'text-slate-400' : ''}
                  `}>
                    {step.status === 'completed' && '✓ '}
                    {step.status === 'in_progress' && '⟳ '}
                    {step.label}
                  </span>
                  <span className="text-slate-400">{step.progress}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      step.status === 'completed'
                        ? 'bg-green-500'
                        : step.status === 'in_progress'
                        ? 'bg-cyan-500'
                        : 'bg-slate-700'
                    }`}
                    style={{ width: `${step.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-sm mt-4 text-center">
            Google Search ile gerçek zamanlı veriler toplanıyor...
          </p>
        </div>
      )}

      <div className="bg-slate-700/50 border-2 border-dashed border-slate-600 rounded-xl p-8 mb-6 hover:border-slate-500 transition">
        <label className="cursor-pointer block">
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-12 h-12 text-slate-400" />
            <p className="text-slate-200 font-medium">Kupon görselini yükle</p>
            <p className="text-slate-400 text-sm">PNG, JPG veya WebP (Max 10MB)</p>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={loading}
          />
        </label>
      </div>

      {preview && !loading && (
        <div className="mb-6">
          <div className="relative rounded-lg overflow-hidden bg-slate-700">
            <img src={preview} alt="Ön izleme" className="w-full h-auto max-h-96 object-cover" />
          </div>
          <p className="text-slate-400 text-sm mt-2">Bu görselin analizine 1 kredi harcanacak</p>
        </div>
      )}

      {showConfirmation && detectedMatches && !loading && (
        <div className="mb-6 p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/30 rounded-lg">
          <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
            ✅ Tespit Edilen Maçlar
          </h3>
          <p className="text-slate-300 text-sm mb-4">
            Lütfen bilgileri kontrol edin. Düzeltmek isterseniz takım isimlerini düzenleyebilirsiniz.
          </p>

          <div className="space-y-3 mb-4">
            {editedMatches.map((match, idx) => (
              <div key={idx} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-cyan-500 text-white px-2 py-1 rounded text-sm font-bold">
                    #{idx + 1}
                  </span>
                  <span className="text-slate-400 text-xs">{match.league}</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Ev Sahibi</label>
                    <input
                      type="text"
                      value={match.teamHome}
                      onChange={(e) => handleEditMatch(idx, 'teamHome', e.target.value)}
                      className="w-full bg-slate-800 text-white px-3 py-2 rounded border border-slate-600 focus:border-cyan-500 focus:outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Deplasman</label>
                    <input
                      type="text"
                      value={match.teamAway}
                      onChange={(e) => handleEditMatch(idx, 'teamAway', e.target.value)}
                      className="w-full bg-slate-800 text-white px-3 py-2 rounded border border-slate-600 focus:border-cyan-500 focus:outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 text-xs mb-1 block">Lig/Turnuva</label>
                    <input
                      type="text"
                      value={match.league}
                      onChange={(e) => handleEditMatch(idx, 'league', e.target.value)}
                      className="w-full bg-slate-800 text-white px-3 py-2 rounded border border-slate-600 focus:border-cyan-500 focus:outline-none text-sm"
                    />
                  </div>

                  {match.odds && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {match.odds.ms1 && (
                        <div className="bg-slate-800 rounded p-2 text-center">
                          <p className="text-slate-400 text-xs">MS1</p>
                          <p className="text-white font-bold">{match.odds.ms1}</p>
                        </div>
                      )}
                      {(match.odds.msx || match.odds.beraberlik) && (
                        <div className="bg-slate-800 rounded p-2 text-center">
                          <p className="text-slate-400 text-xs">Beraberlik</p>
                          <p className="text-white font-bold">{match.odds.msx || match.odds.beraberlik}</p>
                        </div>
                      )}
                      {match.odds.ms2 && (
                        <div className="bg-slate-800 rounded p-2 text-center">
                          <p className="text-slate-400 text-xs">MS2</p>
                          <p className="text-white font-bold">{match.odds.ms2}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancelConfirmation}
              className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-medium py-3 rounded-lg transition"
            >
              İptal Et
            </button>
            <button
              onClick={handleConfirmAndAnalyze}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Onayla ve Analiz Et (1 Kredi)
            </button>
          </div>
        </div>
      )}

      {preview && !loading && !showConfirmation && (
        <button
          onClick={handleDetectMatches}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          <Upload className="w-5 h-5" />
          1. Adım: Maçları Tespit Et (Ücretsiz)
        </button>
      )}
    </div>
  );
};
