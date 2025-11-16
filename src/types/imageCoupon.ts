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

export interface MarketOption {
  id: MarketType;
  label: string;
  confidenceKey: string;
}
