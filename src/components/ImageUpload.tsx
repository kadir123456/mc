import React, { useState } from 'react';
import { Upload, Loader, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { analysisService } from '../services/analysisService';
import { authService } from '../services/authService';

interface ImageUploadProps {
  onAnalysisComplete?: () => void;
}

type AnalysisStep = {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress: number;
};

export const ImageUpload: React.FC<ImageUploadProps> = ({ onAnalysisComplete }) => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
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

  const handleAnalyze = async () => {
    if (!preview || !user) return;

    setLoading(true);
    setError('');
    setSuccess('');
    setAnalysisSteps([
      { id: 'upload', label: 'Görsel yükleniyor', status: 'pending', progress: 0 },
      { id: 'detect', label: 'Maçlar tespit ediliyor', status: 'pending', progress: 0 },
      { id: 'collect', label: 'Gerçek zamanlı veriler toplanıyor', status: 'pending', progress: 0 },
      { id: 'analyze', label: 'Analiz tamamlanıyor', status: 'pending', progress: 0 },
    ]);

    try {
      if (user.credits < 1) {
        throw new Error('Yeterli krediniz yok. Lütfen kredi satın alın.');
      }

      updateStep('upload', 'in_progress', 50);
      const base64 = preview.split(',')[1];
      updateStep('upload', 'completed', 100);

      updateStep('detect', 'in_progress', 30);
      const analysis = await analysisService.analyzeImageWithGemini(base64);
      updateStep('detect', 'completed', 100);

      updateStep('collect', 'completed', 100);
      updateStep('analyze', 'in_progress', 80);

      await analysisService.saveCouponAnalysis(user.uid, {
        id: '',
        userId: user.uid,
        imageUrl: preview,
        uploadedAt: Date.now(),
        analysis,
        status: 'completed',
      });

      updateStep('analyze', 'completed', 100);

      await authService.updateCredits(user.uid, user.credits - 1);
      await refreshUser();

      setSuccess('Analiz başarıyla tamamlandı!');
      setPreview(null);

      if (onAnalysisComplete) {
        onAnalysisComplete();
      }

      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Analiz sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-2">Kupon Analizi Yap</h2>
      <p className="text-slate-400 mb-6">Kupon görselini yükle ve detaylı analiz al</p>

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
            Maçlar analiz ediliyor...
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

      {preview && !loading && (
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Analiz Yap
        </button>
      )}
    </div>
  );
};
