import React from 'react';
import { Loader, AlertTriangle, X } from 'lucide-react';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose?: () => void;
  steps: Array<{
    id: string;
    label: string;
    status: 'pending' | 'in_progress' | 'completed';
    progress: number;
  }>;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({ isOpen, steps }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative bg-slate-800 border-2 border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <Loader className="w-6 h-6 text-white animate-spin" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Analiz Ediliyor</h3>
            <p className="text-slate-400 text-sm">Lütfen bekleyiniz...</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-semibold mb-1">Önemli Uyarı!</p>
              <ul className="text-yellow-300/90 text-sm space-y-1">
                <li>• Sayfayı yenilemeyin</li>
                <li>• Tarayıcı sekmesini kapatmayın</li>
                <li>• Geri butonuna basmayın</li>
                <li>• İşlem 30-60 saniye sürebilir</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.id} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className={`font-medium transition-colors ${
                  step.status === 'completed' ? 'text-green-400' :
                  step.status === 'in_progress' ? 'text-cyan-400' :
                  'text-slate-500'
                }`}>
                  {step.status === 'completed' && '✓ '}
                  {step.status === 'in_progress' && '⟳ '}
                  {step.label}
                </span>
                <span className="text-slate-400 text-xs">{step.progress}%</span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    step.status === 'completed' ? 'bg-green-500' :
                    step.status === 'in_progress' ? 'bg-cyan-500 animate-pulse' :
                    'bg-slate-700'
                  }`}
                  style={{ width: `${step.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-700">
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
            <span>Google Search ile gerçek zamanlı veri toplanıyor...</span>
          </div>
        </div>
      </div>
    </div>
  );
};
