import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { analysisService } from '../services/analysisService';
import { CouponAnalysis } from '../types';
import { Loader, TrendingUp } from 'lucide-react';

export const UserAnalyses: React.FC = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<CouponAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<CouponAnalysis | null>(null);

  useEffect(() => {
    const loadAnalyses = async () => {
      if (!user) return;
      try {
        const data = await analysisService.getUserAnalyses(user.uid);
        setAnalyses(data);
      } catch (error) {
        console.error('Analizler yüklenemedi:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalyses();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 mb-4">Henüz analiz yok</p>
        <p className="text-slate-500 text-sm">Kupon görseli yükleyerek başla</p>
      </div>
    );
  }

  if (selectedAnalysis) {
    return (
      <div>
        <button
          onClick={() => setSelectedAnalysis(null)}
          className="mb-6 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition flex items-center gap-2"
        >
          <span>←</span> Geri Dön
        </button>

        <div className="space-y-6">
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">📋 Kupon Görseli</h3>
              <div className="text-right">
                <p className="text-slate-400 text-sm">Analiz Tarihi</p>
                <p className="text-white font-medium">
                  {new Date(selectedAnalysis.uploadedAt).toLocaleDateString('tr-TR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            <img
              src={selectedAnalysis.imageUrl}
              alt="Kupon"
              className="w-full max-h-[500px] object-contain rounded-lg border-2 border-slate-600"
            />
          </div>

          {selectedAnalysis.analysis.finalCoupon && selectedAnalysis.analysis.finalCoupon.length > 0 && (
            <div className="bg-white/95 rounded-xl shadow-lg p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Kupon Tutarı</h3>
                  <p className="text-xs text-slate-500">Toplam Oran</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-800">{selectedAnalysis.analysis.totalOdds.toFixed(2)}</p>
                  <p className="text-xs text-green-600 font-medium">{selectedAnalysis.analysis.confidence}% Güven</p>
                </div>
              </div>
              <div className="space-y-2">
                {selectedAnalysis.analysis.finalCoupon.map((pick, idx) => {
                  const parts = pick.split(' - ');
                  const teamName = parts[0];
                  const prediction = parts[1] || '';
                  return (
                    <div key={idx} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-orange-500 text-white text-xs font-bold rounded">
                              {idx + 1}
                            </span>
                            <span className="text-xs text-slate-500">CANLI</span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{teamName}</h4>
                          <p className="text-xs text-slate-500">Bugün 22:00</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-center">
                            <div className="bg-slate-700 text-white px-3 py-1.5 rounded font-bold text-sm min-w-[45px]">
                              {prediction}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}



          {selectedAnalysis.analysis.recommendations.length > 0 && (
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <h3 className="text-base font-bold text-white mb-3">💡 Notlar</h3>
              <div className="space-y-2">
                {selectedAnalysis.analysis.recommendations.map((rec, idx) => (
                  <p key={idx} className="text-slate-300 text-sm leading-relaxed">
                    • {rec}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Analiz Geçmişi</h2>

      <div className="space-y-4">
        {analyses.map((analysis) => (
          <div
            key={analysis.id}
            className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition cursor-pointer"
            onClick={() => setSelectedAnalysis(analysis)}
          >
            <div className="flex items-start gap-4">
              <img
                src={analysis.imageUrl}
                alt="Kupon"
                className="w-20 h-20 object-cover rounded"
              />
              <div className="flex-1">
                <p className="text-white font-medium mb-1">
                  {analysis.analysis.matches.length} maç analizi
                </p>
                <p className="text-slate-400 text-sm mb-2">
                  {new Date(analysis.uploadedAt).toLocaleString('tr-TR')}
                </p>
                <p className="text-slate-300 text-sm">
                  Toplam Oran: {analysis.analysis.totalOdds.toFixed(2)} | Güven: {analysis.analysis.confidence}%
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
