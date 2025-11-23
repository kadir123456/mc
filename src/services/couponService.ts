import { ref, get, set, push, remove, query, orderByChild, limitToLast } from 'firebase/database';
import { database } from './firebase';
import { MatchSelection } from './matchService';

export interface MatchAnalysis {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  time: string;
  predictions: {
    ms1: string;
    msX: string;
    ms2: string;
    over25: string;
    under25: string;
    btts: string;
    firstHalfMs1: string;
    firstHalfMsX: string;
    firstHalfMs2: string;
  };
  recommendation: string;
  confidence: number;
}

export interface Coupon {
  id: string;
  userId: string;
  matches: MatchSelection[];
  analysis: MatchAnalysis[];
  type: 'standard' | 'detailed';
  analysisType?: string;
  creditsUsed: number;
  purchasedAt: number;
}

export interface PopularCoupon {
  id: string;
  matches: MatchSelection[];
  playCount: number;
  successRate: number;
  averageOdds: number;
  lastPlayed: number;
}

export const couponService = {
  async createCoupon(
    userId: string,
    matches: MatchSelection[],
    analysis: MatchAnalysis[],
    type: 'standard' | 'detailed'
  ): Promise<string> {
    const couponRef = push(ref(database, `coupons/${userId}`));
    const couponId = couponRef.key!;

    const coupon: Omit<Coupon, 'id'> = {
      userId,
      matches,
      analysis,
      type,
      creditsUsed: type === 'standard' ? 1 : 5,
      purchasedAt: Date.now()
    };

    await set(couponRef, coupon);

    // popularCoupons update edilmesi opsiyonel (permission hatası önlemek için kapalı)
    // await this.updatePopularCoupons(matches);

    return couponId;
  },

  async getUserCoupons(userId: string): Promise<Coupon[]> {
    const couponsRef = ref(database, `coupons/${userId}`);
    const snapshot = await get(couponsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const couponsData = snapshot.val();
    const coupons: Coupon[] = [];

    Object.keys(couponsData).forEach(couponId => {
      coupons.push({
        id: couponId,
        ...couponsData[couponId]
      });
    });

    return coupons.sort((a, b) => b.purchasedAt - a.purchasedAt);
  },

  async getCouponById(userId: string, couponId: string): Promise<Coupon | null> {
    const couponRef = ref(database, `coupons/${userId}/${couponId}`);
    const snapshot = await get(couponRef);

    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: couponId,
      ...snapshot.val()
    };
  },

  // ✅ YENİ: Kupon silme fonksiyonu
  async deleteCoupon(userId: string, couponId: string): Promise<void> {
    try {
      const couponRef = ref(database, `coupons/${userId}/${couponId}`);
      await remove(couponRef);
      console.log(`🗑️ Kupon silindi: ${couponId}`);
    } catch (error) {
      console.error('❌ Kupon silme hatası:', error);
      throw error;
    }
  },

  async updatePopularCoupons(matches: MatchSelection[]): Promise<void> {
    const matchIds = matches.map(m => m.fixtureId).sort().join('-');
    const popularRef = ref(database, `popular_coupons/${matchIds}`);
    const snapshot = await get(popularRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      await set(popularRef, {
        ...data,
        playCount: (data.playCount || 0) + 1,
        lastPlayed: Date.now()
      });
    } else {
      await set(popularRef, {
        matches,
        playCount: 1,
        successRate: 0,
        averageOdds: 0,
        lastPlayed: Date.now()
      });
    }
  },

  async getPopularCoupons(limit: number = 10): Promise<PopularCoupon[]> {
    const popularRef = ref(database, 'popular_coupons');
    const popularQuery = query(popularRef, orderByChild('playCount'), limitToLast(limit));
    const snapshot = await get(popularQuery);

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();
    const coupons: PopularCoupon[] = [];

    Object.keys(data).forEach(id => {
      const coupon = data[id];
      if (coupon.playCount >= 5) {
        coupons.push({
          id,
          ...coupon
        });
      }
    });

    return coupons.sort((a, b) => b.playCount - a.playCount);
  },

  async getTrendingCoupons(): Promise<PopularCoupon[]> {
    const popularRef = ref(database, 'popular_coupons');
    const snapshot = await get(popularRef);

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();
    const coupons: PopularCoupon[] = [];
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;

    Object.keys(data).forEach(id => {
      const coupon = data[id];
      if (coupon.lastPlayed > last24Hours && coupon.playCount >= 3) {
        coupons.push({
          id,
          ...coupon
        });
      }
    });

    return coupons.sort((a, b) => b.playCount - a.playCount).slice(0, 5);
  }
};