import React, { useState } from 'react';
import { Upload, Loader, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { couponAnalysisOrchestrator } from '../services/couponAnalysisOrchestrator';
import { authService } from '../services/authService';
import { AnalysisModal } from './AnalysisModal';

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

      const base64 = preview.split(',')[1];

      await couponAnalysisOrchestrator.analyzeImage(
        user.uid,
        base64,
        (step, progress) => {
          updateStep(step, progress === 100 ? 'completed' : 'in_progress', progress);
        }
      );

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

      <AnalysisModal isOpen={loading} steps={analysisSteps} />

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
