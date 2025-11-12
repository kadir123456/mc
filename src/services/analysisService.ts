import axios from 'axios';
import { CouponAnalysis } from '../types';
import { ref, set, get, remove } from 'firebase/database';
import { database } from './firebase';
import { compressImage } from '../utils/imageCompressor';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const CACHE_EXPIRY_HOURS = 24;

interface CachedMatchData {
  matchId: string;
  teamHome: string;
  teamAway: string;
  league: string;
  homeForm: string;
  awayForm: string;
  h2h: string;
  injuries: string;
  leaguePosition: string;
  lastUpdated: number;
  dataSources: string[];
  confidenceScore: number;
}

interface DetectedMatch {
  matchId: string;
  teamHome: string;
  teamAway: string;
  league: string;
  date?: string;
  odds?: {
    ms1?: number;
    ms2?: number;
    beraberlik?: number;
    ust25?: number;
    alt25?: number;
    kgg?: number;
  };
}

const OCR_PROMPT = `Görseldeki bahis kuponunu analiz et ve maç bilgilerini çıkar.

SADECE MAÇLARI TESPIT ET, ANALİZ YAPMA!

ÇIKTI FORMATI (JSON):
{
  "matches": [
    {
      "matchId": "unique_hash",
      "teamHome": "Ev Sahibi Takım",
      "teamAway": "Deplasman Takım",
      "league": "Lig Adı",
      "date": "2024-01-15",
      "odds": {
        "ms1": 1.85,
        "ms2": 2.20,
        "beraberlik": 3.10,
        "ust25": 1.92,
        "alt25": 1.88,
        "kgg": 1.95
      }
    }
  ]
}

KURALLAR:
- Her maç için benzersiz matchId oluştur
- Takım isimlerini tam ve doğru yaz
- Sadece JSON döndür, açıklama yapma`;

const DATA_COLLECTION_PROMPT = (match: DetectedMatch) => `Sen profesyonel futbol veri analistisin. Aşağıdaki maç için GERÇEK ZAMANLIDA internetten veri toplayacaksın.

MAÇ: ${match.teamHome} vs ${match.teamAway} (${match.league})

GÖREV - Google Search kullanarak araştır:

1. Son Form (Son 5 maç): "${match.teamHome} son maçlar", "${match.teamAway} son maçlar"
2. H2H: "${match.teamHome} vs ${match.teamAway} h2h"
3. Sakatlıklar: "${match.teamHome} injuries", "${match.teamAway} missing players"
4. Lig Sıralaması: "${match.league} table standings"

ÇIKTI (JSON):
{
  "homeForm": "Son 5: G-G-B-G-K | 12 gol attı, 7 yedi",
  "awayForm": "Son 5: K-K-B-G-K | 5 gol attı, 10 yedi",
  "h2h": "Son 5: 2-1, 0-0, 3-1, 1-2, 2-0",
  "injuries": "Ev: 2 sakat | Deplasman: Ana forvet sakat",
  "leaguePosition": "Ev: 3. (45p) | Deplasman: 12. (28p)",
  "dataSources": ["url1", "url2"],
  "confidenceScore": 85
}

KURAL: Veri bulunamazsa "Veri yok" yaz, tahmin yapma!`;

const FINAL_ANALYSIS_PROMPT = (matches: Array<DetectedMatch & { cachedData: CachedMatchData }>) => `Sen profesyonel futbol analiz uzmanısın. GERÇEK VERİLERE dayalı analiz yap.

AĞIRLIK: Form %40, H2H %25, Sakatlık %15, Lig %10, İç Saha %10

MAÇLAR:
${matches.map((m, i) => `
${i + 1}. ${m.teamHome} vs ${m.teamAway}
- Form (Ev): ${m.cachedData.homeForm}
- Form (Deplasman): ${m.cachedData.awayForm}
- H2H: ${m.cachedData.h2h}
- Sakatlık: ${m.cachedData.injuries}
- Lig: ${m.cachedData.leaguePosition}
${m.odds ? `- Oranlar: MS1 ${m.odds.ms1}, MS2 ${m.odds.ms2}` : ''}
`).join('\n')}

GÖREV:
1. AĞIRLIK SİSTEMİNE göre analiz
2. 70+ güven skorlu maçları finalCoupon'a ekle
3. Risk belirle (Düşük: 70-79, Orta: 80-89, Yüksek: 90+)

ÇIKTI (JSON):
{
  "finalCoupon": ["${matches[0]?.teamHome} - MS1"],
  "matches": [
    {
      "matchId": "${matches[0]?.matchId}",
      "league": "${matches[0]?.league}",
      "teams": ["${matches[0]?.teamHome}", "${matches[0]?.teamAway}"],
      "predictions": {
        "ms1": {"odds": 1.85, "confidence": 78},
        "ust25": {"odds": 1.92, "confidence": 70}
      },
      "realData": {
        "homeForm": "${matches[0]?.cachedData.homeForm}",
        "awayForm": "${matches[0]?.cachedData.awayForm}",
        "h2h": "${matches[0]?.cachedData.h2h}"
      },
      "dataQuality": {
        "sources": ${matches[0]?.cachedData.dataSources.length || 0},
        "confidence": ${matches[0]?.cachedData.confidenceScore || 0}
      }
    }
  ],
  "totalOdds": 8.50,
  "confidence": 75,
  "recommendations": ["Toplam oran: 8.50 - Risk: Orta"]
}

KURAL: SADECE 70+ confidence maçları finalCoupon'a ekle`;

export const analysisService = {
  async analyzeImageWithGemini(base64Image: string): Promise<CouponAnalysis['analysis']> {
    try {
      // ✅ Görseli sıkıştır
      console.log('🗜️ Görsel sıkıştırılıyor...');
      const compressedImage = await compressImage(base64Image, 800, 0.6);

      console.log('🔍 Adım 1: Görselden maçları tespit ediliyor...');
      const detectedMatches = await this.detectMatches(compressedImage);

      if (!detectedMatches || detectedMatches.length === 0) {
        throw new Error('Görselde maç tespit edilemedi');
      }

      console.log(`✅ ${detectedMatches.length} maç tespit edildi`);

      console.log('📦 Adım 2: Cache kontrolü yapılıyor...');
      const matchesWithData = await this.getOrFetchMatchData(detectedMatches);

      console.log('🧠 Adım 3: Final analiz yapılıyor...');
      const finalAnalysis = await this.performFinalAnalysis(matchesWithData);

      console.log('✅ Analiz tamamlandı!');
      return finalAnalysis;
    } catch (error) {
      console.error('❌ Analiz hatası:', error);
      throw error;
    }
  },

  async detectMatches(base64Image: string): Promise<DetectedMatch[]> {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: OCR_PROMPT },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 2048,
        },
      },
      {
        timeout: 60000, // 60 saniye timeout
        maxContentLength: 50 * 1024 * 1024, // 50MB limit
        maxBodyLength: 50 * 1024 * 1024,
      }
    );

    const content = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Maç bilgisi çıkarılamadı');
    }

    const result = JSON.parse(jsonMatch[0]);
    return result.matches || [];
  },

  async getOrFetchMatchData(
    matches: DetectedMatch[]
  ): Promise<Array<DetectedMatch & { cachedData: CachedMatchData }>> {
    const matchesWithData: Array<DetectedMatch & { cachedData: CachedMatchData }> = [];

    for (const match of matches) {
      const cacheKey = `match_cache/${match.matchId}`;
      const cacheRef = ref(database, cacheKey);
      const snapshot = await get(cacheRef);

      let cachedData: CachedMatchData;

      if (snapshot.exists()) {
        const cached = snapshot.val() as CachedMatchData;
        const hoursSinceUpdate = (Date.now() - cached.lastUpdated) / (1000 * 60 * 60);

        if (hoursSinceUpdate < CACHE_EXPIRY_HOURS) {
          console.log(`✅ Cache HIT: ${match.teamHome} vs ${match.teamAway} (${hoursSinceUpdate.toFixed(1)}h önce)`);
          cachedData = cached;
        } else {
          console.log(`🔄 Cache EXPIRED: ${match.teamHome} vs ${match.teamAway} - Yeni veri çekiliyor...`);
          cachedData = await this.fetchMatchDataWithGrounding(match);
          await set(cacheRef, cachedData);
        }
      } else {
        console.log(`🆕 Cache MISS: ${match.teamHome} vs ${match.teamAway} - İlk kez veri çekiliyor...`);
        cachedData = await this.fetchMatchDataWithGrounding(match);
        await set(cacheRef, cachedData);
      }

      matchesWithData.push({ ...match, cachedData });
    }

    return matchesWithData;
  },

  async fetchMatchDataWithGrounding(match: DetectedMatch): Promise<CachedMatchData> {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: DATA_COLLECTION_PROMPT(match) },
            ],
          },
        ],
        tools: [
          {
            googleSearch: {},
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 4096,
        },
      },
      {
        timeout: 90000, // 90 saniye timeout
        maxContentLength: 50 * 1024 * 1024,
        maxBodyLength: 50 * 1024 * 1024,
      }
    );

    const content = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Veri toplanamadı');
    }

    const data = JSON.parse(jsonMatch[0]);

    const groundingMetadata = response.data.candidates[0].groundingMetadata;
    const dataSources: string[] = [];

    if (groundingMetadata?.groundingChunks) {
      groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          dataSources.push(chunk.web.uri);
        }
      });
    }

    return {
      matchId: match.matchId,
      teamHome: match.teamHome,
      teamAway: match.teamAway,
      league: match.league,
      homeForm: data.homeForm || 'Veri bulunamadı',
      awayForm: data.awayForm || 'Veri bulunamadı',
      h2h: data.h2h || 'Veri bulunamadı',
      injuries: data.injuries || 'Veri bulunamadı',
      leaguePosition: data.leaguePosition || 'Veri bulunamadı',
      lastUpdated: Date.now(),
      dataSources: dataSources.length > 0 ? dataSources : data.dataSources || [],
      confidenceScore: data.confidenceScore || 50,
    };
  },

  async performFinalAnalysis(
    matchesWithData: Array<DetectedMatch & { cachedData: CachedMatchData }>
  ): Promise<CouponAnalysis['analysis']> {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: FINAL_ANALYSIS_PROMPT(matchesWithData) },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 32,
          topP: 0.9,
          maxOutputTokens: 4096,
        },
      },
      {
        timeout: 60000,
        maxContentLength: 50 * 1024 * 1024,
        maxBodyLength: 50 * 1024 * 1024,
      }
    );

    const content = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Final analiz oluşturulamadı');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      finalCoupon: analysis.finalCoupon || [],
      matches: analysis.matches || [],
      totalOdds: analysis.totalOdds || 0,
      recommendations: analysis.recommendations || [],
      confidence: analysis.confidence || 0,
    };
  },

  async saveCouponAnalysis(userId: string, analysis: CouponAnalysis) {
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullAnalysis: CouponAnalysis = {
      ...analysis,
      id: analysisId,
      userId,
      uploadedAt: Date.now(),
      status: 'completed',
    };

    await set(ref(database, `analyses/${analysisId}`), fullAnalysis);
    await set(ref(database, `users/${userId}/analyses/${analysisId}`), analysisId);

    const userAnalyses = await this.getUserAnalyses(userId);
    if (userAnalyses.length > 5) {
      const oldestAnalyses = userAnalyses
        .sort((a, b) => a.uploadedAt - b.uploadedAt)
        .slice(0, userAnalyses.length - 5);

      for (const oldAnalysis of oldestAnalyses) {
        await this.deleteAnalysis(userId, oldAnalysis.id);
      }
    }

    return fullAnalysis;
  },

  async deleteAnalysis(userId: string, analysisId: string) {
    await remove(ref(database, `analyses/${analysisId}`));
    await remove(ref(database, `users/${userId}/analyses/${analysisId}`));
  },

  async getUserAnalyses(userId: string) {
    const userAnalysesRef = ref(database, `users/${userId}/analyses`);
    const snapshot = await get(userAnalysesRef);

    if (!snapshot.exists()) return [];

    const analysisIds = Object.values(snapshot.val());
    const analyses: CouponAnalysis[] = [];

    for (const id of analysisIds) {
      const analysisRef = ref(database, `analyses/${id}`);
      const analysisSnapshot = await get(analysisRef);
      if (analysisSnapshot.exists()) {
        analyses.push(analysisSnapshot.val());
      }
    }

    return analyses.sort((a, b) => b.uploadedAt - a.uploadedAt);
  },
};
