import React from 'react';
import { X, AlertCircle, Zap } from 'lucide-react';
import { Match } from '../services/matchService';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  matches: Match[];
  creditsRequired: number;
  analysisType: 'standard' | 'detailed';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  matches,
  creditsRequired,
  analysisType
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-md w-full border border-slate-700 shadow-2xl">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Onay Gerekli</h3>
                <p className="text-sm text-slate-400">İşlemi onaylamak istediğinizden emin misiniz?</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <p className="text-sm text-slate-400 mb-2">Seçilen Maçlar:</p>
              <div className="space-y-2">
                {matches.map((match, index) => (
                  <div key={match.fixtureId} className="text-sm text-white">
                    <span className="text-blue-400">{index + 1}.</span> {match.homeTeam} vs {match.awayTeam}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300">Analiz Tipi:</span>
                <span className="text-white font-medium">
                  {analysisType === 'standard' ? 'Standart' : 'Detaylı'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Maç Sayısı:</span>
                <span className="text-white font-medium">{matches.length} maç</span>
              </div>
            </div>

            <div className="bg-yellow-500/10 border-2 border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-bold">Harcanacak Kredi:</span>
                </div>
                <span className="text-2xl font-bold text-yellow-400">{creditsRequired}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {analysisType === 'standard'
                  ? `${matches.length} maç için ${creditsRequired} kredi harcanacak`
                  : `${matches.length} maç için detaylı analiz (ilk yarı + maç sonu) - ${creditsRequired} kredi`
                }
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
            >
              İptal
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-bold transition shadow-lg"
            >
              Onayla ve Satın Al
            </button>
          </div>

          <p className="text-xs text-slate-500 text-center mt-4">
            Onayladıktan sonra {creditsRequired} kredi hesabınızdan düşülecek ve analiz sonuçlarınız "Kuponlarım" sayfasında görüntülenecektir.
          </p>
        </div>
      </div>
    </div>
  );
};
