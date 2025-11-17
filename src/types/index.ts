export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  credits: number;
  totalSpent: number;
  createdAt: number;
  lastLogin: number;
  isBanned?: boolean;
  bannedReason?: string;
  registrationIP?: string;
  lastIP?: string;
  termsAcceptedAt?: number;
  privacyAcceptedAt?: number;
}

export interface Package {
  id: string;
  name: string;
  searches: number;
  price: number;
  popular?: boolean;
  shopierUrl?: string;
}

export interface CouponAnalysis {
  id: string;
  userId: string;
  imageUrl: string;
  uploadedAt: number;
  analysis: {
    finalCoupon?: string[];
    matches: MatchAnalysis[];
    totalOdds: number;
    recommendations: string[];
    confidence: number;
  };
  status: 'pending' | 'completed' | 'failed' | 'error';
  errorMessage?: string;
}

export interface MatchAnalysis {
  matchId: string;
  league: string;
  teams: [string, string];
  predictions: {
    ms1: { odds: number; confidence: number; };
    ms2: { odds: number; confidence: number; };
    beraberlik: { odds: number; confidence: number; };
    ust25?: { odds: number; confidence: number; type: string; };
    alt25?: { odds: number; confidence: number; type: string; };
    kgg?: { odds: number; confidence: number; type: string; };
    altUst?: { odds: number; confidence: number; };
    handicap?: { odds: number; confidence: number; };
  };
  realData?: {
    homeForm: string;
    awayForm: string;
    h2h: string;
    injuries: string;
    leaguePosition: string;
  };
  dataQuality?: {
    sources: number;
    confidence: number;
    lastUpdated: string;
  };
  factors?: {
    teamForm: string;
    injuries: string;
    weather: string;
    headToHead: string;
  };
}

export interface Transaction {
  id: string;
  userId: string;
  packageId: string;
  amount: number;
  credits: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: number;
  pytrOrderId?: string;
}
