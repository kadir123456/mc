import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Lock, Zap } from 'lucide-react';
import { couponService, PopularCoupon } from '../services/couponService';
import { Match } from '../services/matchService';

interface PopularCouponsProps {
  onSelectCoupon: (matches: Match[]) => void;
}

export const PopularCoupons: React.FC<PopularCouponsProps> = ({ onSelectCoupon }) => {
  const [popularCoupons, setPopularCoupons] = useState<PopularCoupon[]>([]);
  const [trendingCoupons, setTrendingCoupons] = useState<PopularCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'popular' | 'trending'>('trending');

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const [popular, trending] = await Promise.all([
        couponService.getPopularCoupons(10),
        couponService.getTrendingCoupons()
      ]);
      setPopularCoupons(popular);
      setTrendingCoupons(trending);
    } catch (error) {
      console.error('Popüler kupon yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayCoupons = activeTab === 'popular' ? popularCoupons : trendingCoupons;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (displayCoupons.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-700/30 rounded-lg border border-slate-600">
        <TrendingUp className="w-12 h-12 mx-auto text-slate-500 mb-3" />
        <p className="text-slate-300">Henüz popüler kupon bulunmuyor</p>
        <p className="text-slate-500 text-sm mt-2">İlk kuponları oluşturan siz olun!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('trending')}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
            activeTab === 'trending'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trend Kuponlar
          </div>
        </button>
        <button
          onClick={() => setActiveTab('popular')}
          className={`flex-1 px-4 py-3 rounded-lg font-medium transition ${
            activeTab === 'popular'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            En Çok Oynananlar
          </div>
        </button>
      </div>

      <div className="space-y-3">
        {displayCoupons.map((coupon, index) => (
          <div
            key={coupon.id}
            className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:border-blue-500/50 transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                  #{index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span className="text-white font-medium">{coupon.playCount} kişi oynadı</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(coupon.lastPlayed).toLocaleDateString('tr-TR')} tarihinde
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {coupon.matches.map((match, idx) => (
                <div
                  key={idx}
                  className="text-sm text-slate-300 bg-slate-800/50 rounded px-3 py-2"
                >
                  <div className="flex items-center justify-between">
                    <span>{match.homeTeam} vs {match.awayTeam}</span>
                    <Lock className="w-3 h-3 text-slate-500" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{match.league}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => onSelectCoupon(coupon.matches as Match[])}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Bu Kuponu Analiz Et (5 Kredi)
            </button>

            {coupon.successRate > 0 && (
              <div className="mt-3 text-xs text-center text-slate-400">
                Başarı Oranı: %{coupon.successRate.toFixed(0)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
