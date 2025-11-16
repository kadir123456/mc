import { ref, get, set, remove, query, orderByChild } from 'firebase/database';
import { database } from './firebase';

export type MarketType = 'ms1' | 'ms2' | 'draw' | 'over25' | 'under25' | 'btts' | 'bttsNo' | 'firstHalfMs1' | 'firstHalfDraw' | 'firstHalfMs2' | 'handicap';

export interface CouponMatch {
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  time: string;
  market: MarketType;
  marketDisplay: string;
  odds: number;
  confidence: number;
}

export interface ImageCoupon {
  id: string;
  userId: string;
  matches: CouponMatch[];
  totalOdds: number;
  createdAt: number;
}

const MAX_COUPONS = 5;

export const imageCouponService = {
  async saveCoupon(
    userId: string,
    matches: CouponMatch[]
  ): Promise<string> {
    // Toplam oran hesapla
    const totalOdds = matches.reduce((total, match) => total * match.odds, 1);

    // Yeni kupon oluştur
    const couponId = `img_coupon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const coupon: ImageCoupon = {
      id: couponId,
      userId,
      matches,
      totalOdds: parseFloat(totalOdds.toFixed(2)),
      createdAt: Date.now()
    };

    // Mevcut kuponları kontrol et
    const existingCoupons = await this.getUserCoupons(userId);

    // Eğer 5 kupon varsa en eskiyi sil
    if (existingCoupons.length >= MAX_COUPONS) {
      const oldestCoupon = existingCoupons[existingCoupons.length - 1];
      await this.deleteCoupon(userId, oldestCoupon.id);
      console.log(`🗑️ En eski kupon silindi: ${oldestCoupon.id}`);
    }

    // Yeni kuponu kaydet
    const couponRef = ref(database, `image_coupons/${userId}/${couponId}`);
    await set(couponRef, coupon);

    console.log(`✅ Kupon kaydedildi: ${couponId}`);
    return couponId;
  },

  async getUserCoupons(userId: string): Promise<ImageCoupon[]> {
    const couponsRef = ref(database, `image_coupons/${userId}`);
    const snapshot = await get(couponsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const couponsData = snapshot.val();
    const coupons: ImageCoupon[] = [];

    Object.keys(couponsData).forEach(couponId => {
      coupons.push(couponsData[couponId]);
    });

    // Tarihe göre sırala (en yeni en üstte)
    return coupons.sort((a, b) => b.createdAt - a.createdAt);
  },

  async getCouponById(userId: string, couponId: string): Promise<ImageCoupon | null> {
    const couponRef = ref(database, `image_coupons/${userId}/${couponId}`);
    const snapshot = await get(couponRef);

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.val();
  },

  async deleteCoupon(userId: string, couponId: string): Promise<void> {
    const couponRef = ref(database, `image_coupons/${userId}/${couponId}`);
    await remove(couponRef);
  },

  // Market türünü kullanıcı dostu isime çevir
  getMarketDisplay(market: MarketType): string {
    const marketNames: Record<MarketType, string> = {
      ms1: 'MS1 (Ev Sahibi)',
      ms2: 'MS2 (Deplasman)',
      draw: 'X (Beraberlik)',
      over25: '2.5 Üst',
      under25: '2.5 Alt',
      btts: 'KG Var',
      bttsNo: 'KG Yok',
      firstHalfMs1: 'İY MS1',
      firstHalfDraw: 'İY X',
      firstHalfMs2: 'İY MS2',
      handicap: 'Handikap'
    };
    return marketNames[market] || market;
  }
};
