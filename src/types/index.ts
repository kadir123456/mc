export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  credits: number;
  totalSpent: number;
  createdAt: number;
  lastLogin: number;
}

export interface Package {
  id: string;
  name: string;
  searches: number;
  price: number;
  popular?: boolean;
}

export interface CouponAnalysis {
  id: string;
  userId: string;
  imageUrl: string;
  uploadedAt: number;
  analysis: {
    matches: MatchAnalysis[];
    totalOdds: number;
    recommendations: string[];
    confidence: number;
  };
  status: 'pending' | 'completed' | 'error';
}

export interface MatchAnalysis {
  matchId: string;
  league: string;
  teams: [string, string];
  predictions: {
    ms1: { odds: number; confidence: number; };
    ms2: { odds: number; confidence: number; };
    beraberlik: { odds: number; confidence: number; };
    altUst: { odds: number; confidence: number; };
    handicap: { odds: number; confidence: number; };
  };
  factors: {
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
