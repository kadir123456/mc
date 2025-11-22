// src/services/analysisService.ts - TAM YENİLENMİŞ

import axios from 'axios';
import { CouponAnalysis } from '../types';
import { ref, set, get, remove } from 'firebase/database';
import { database } from './firebase';
import { compressImage } from '../utils/imageCompressor';
import sportsradarService from './sportsradarService';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const CACHE_EXPIRY_HOURS = 24;
const MAX_MATCHES = 3;

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
  
  // Yeni: Detaylı istatistikler
  homeFormScore: number;
  awayFormScore: number;
  homeGoalsFor: number;
  homeGoalsAgainst: number;
  awayGoalsFor: number;
  awayGoalsAgainst: number;
  averageGoalsPerMatch: number;
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

// ✅ GELİŞMİŞ OCR PROMPTU
const OCR_PROMPT = `Görseldeki bahis kuponunu DİKKATLİCE analiz et ve maç bilgilerini ÇOK NET çıkar.

⚠️ ÇOK ÖNEMLİ: SADECE İLK 3 MAÇI TESPIT ET! Daha fazla maç varsa göz ardı et.

ÖNEMLİ: U21, U19 gibi yaş gruplarını, Dünya Kupası, Avrupa Kupası gibi turnuva isimlerini MUTLAKA yaz!

GÖRSELDE ARANACAK BİLGİLER:
1. Takım isimleri (solda ev sahibi, sağda deplasman)
2. Lig/Turnuva adı (üstte gri kutuda yazıyor)
3. MS1, MS X, MS2 oranları (kutularda)
4. 2.5 Alt, 2.5 Üst oranları
5. Maç saati (sağda "Bugün 21:30" gibi)

ÇIKTI FORMATI (JSON):
{
  "matches": [
    {
      "matchId": "match_luksemburg_u21_vs_izlanda_u21",
      "teamHome": "Lüksemburg U21",
      "teamAway": "İzlanda U21",
      "league": "U21 Avrupa Şampiyonası Elemeleri",
      "date": "2025-11-13",
      "time": "21:30",
      "odds": {
        "ms1": 2.45,
        "msx": 3.64,
        "ms2": 2.67,
        "alt25": 2.30,
        "ust25": 1.52
      }
    }
  ]
}

KRİTİK KURALLAR:
1. Her maç için benzersiz matchId oluştur
2. Takım isimlerini AYNEN görseldeki gibi yaz
3. Lig/Turnuva ismini TAM ve DOĞRU yaz
4. SADECE JSON döndür, başka metin ekleme`;

// ✅ GELİŞMİŞ FİNAL ANALİZ PROMPTU
const FINAL_ANALYSIS_PROMPT = (matches: Array<DetectedMatch & { cachedData: CachedMatchData }>) => {
  let prompt = `Sen PROFESYONEL bir futbol analisti ve istatistik uzmanısın. ${matches.length} maç için DETAYLI ve VERİYE DAYALI analiz yap.

🎯 GÖREVİN: Her maç için GERÇEKÇİ tahmin yap. RASTGELE SONUÇ VERME!

📊 ANALİZ KRİTERLERİ (AĞIRLIK):
1. FORM ANALİZİ (%35): Son maç performansları
2. H2H GEÇMİŞİ (%20): Kafa kafaya sonuçlar
3. LİG DURUMU (%20): Puan tablosundaki konum
4. GOL İSTATİSTİKLERİ (%15): Attığı/yediği gol ortalaması
5. EV SAHİBİ AVANTAJI (%10): İç saha faktörü

⚠️ KRİTİK KURALLAR:
- Her tahminin MANTIKLI SEBEBİ olmalı
- Form iyiyse tahmin yüksek, kötüyse düşük
- H2H'de dominant taraf avantajlı
- Gol ortalaması yüksekse 2.5 Üst, düşükse Alt
- Güven skoru veri kalitesine göre ayarlanmalı

📋 MAÇLAR VE DETAYLI VERİLER:
`;

  matches.forEach((m, i) => {
    const data = m.cachedData;
    prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MAÇ ${i + 1}: ${m.teamHome} vs ${m.teamAway}
Lig: ${m.league}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 FORM ANALİZİ:
• Ev Sahibi: ${data.homeForm} (Skor: ${data.homeFormScore}/100)
• Deplasman: ${data.awayForm} (Skor: ${data.awayFormScore}/100)
${data.homeFormScore > data.awayFormScore + 15 ? '  → Ev sahibi formda ÇOK DAHA İYİ! MS1 yüksek olmalı.' : ''}
${data.awayFormScore > data.homeFormScore + 15 ? '  → Deplasman formda ÇOK DAHA İYİ! MS2 yüksek olmalı.' : ''}

⚽ GOL İSTATİSTİKLERİ:
• Ev Sahibi: ${data.homeGoalsFor} attı, ${data.homeGoalsAgainst} yedi (Son 5 maç)
• Deplasman: ${data.awayGoalsFor} attı, ${data.awayGoalsAgainst} yedi
• Ortalama: ${data.averageGoalsPerMatch.toFixed(1)} gol/maç
${data.averageGoalsPerMatch > 2.5 ? '  → Yüksek gol ortalaması! 2.5 ÜST tercih et.' : '  → Düşük gol ortalaması, 2.5 ALT tercih et.'}

🏆 LİG DURUMU:
${data.leaguePosition}

⚔️ KAFA KAFAYA (H2H):
${data.h2h}

💰 ORANLAR:
${m.odds ? `• MS1: ${m.odds.ms1} | MSX: ${m.odds.msx || m.odds.beraberlik} | MS2: ${m.odds.ms2}
• 2.5 Üst: ${m.odds.ust25} | 2.5 Alt: ${m.odds.alt25}` : 'Oran bilgisi yok'}

🔴 VERİ GÜVENİLİRLİĞİ: ${data.confidenceScore}%
${data.confidenceScore < 50 ? '⚠️ DÜŞÜK VERİ! Güven skoru 60 altında olmalı.' : '✅ Yeterli veri, güven 65+ olabilir.'}
`;
  });

  prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 TAHMİN KURALLARI:
1. Form farkı 20+ ise → Güçlü taraf %45+, zayıf %25-
2. H2H dominant ise → +5-10% ekle
3. Gol ort. >2.5 ise → 2.5 Üst %60+
4. Gol ort. <2.0 ise → 2.5 Alt %65+
5. Veri <50 ise → Güven <65 olmalı

📤 ÇIKTI (JSON):
{
  "finalCoupon": [
    "Lüksemburg U21 - MS1 (Sebep: Ev sahibi formda, İzlanda deplasmanı zayıf)",
    "Kamerun - Alt 2.5 (Sebep: İki takım da defansif, son 4 maç az gollü)"
  ],
  "matches": [
    {
      "matchId": "${matches[0]?.matchId}",
      "league": "${matches[0]?.league}",
      "teams": ["${matches[0]?.teamHome}", "${matches[0]?.teamAway}"],
      "predictions": {
        "ms1": { "odds": ${matches[0]?.odds?.ms1 || 0}, "confidence": 72, "reasoning": "Sebep açıkla" },
        "msx": { "odds": ${matches[0]?.odds?.msx || matches[0]?.odds?.beraberlik || 0}, "confidence": 65, "reasoning": "Sebep" },
        "ms2": { "odds": ${matches[0]?.odds?.ms2 || 0}, "confidence": 68, "reasoning": "Sebep" },
        "ust25": { "odds": ${matches[0]?.odds?.ust25 || 0}, "confidence": 70, "reasoning": "Sebep" },
        "alt25": { "odds": ${matches[0]?.odds?.alt25 || 0}, "confidence": 60, "reasoning": "Sebep" }
      },
      "realData": {
        "homeForm": "${matches[0]?.cachedData.homeForm}",
        "awayForm": "${matches[0]?.cachedData.awayForm}",
        "homeFormScore": ${matches[0]?.cachedData.homeFormScore},
        "awayFormScore": ${matches[0]?.cachedData.awayFormScore},
        "averageGoals": ${matches[0]?.cachedData.averageGoalsPerMatch}
      }
    }
  ],
  "totalOdds": 5.63,
  "confidence": 68,
  "riskLevel": "Orta",
  "recommendations": [
    "Lüksemburg U21 formda, MS1 tercih edilebilir",
    "Kamerun-Kongo genelde az gollü, 2.5 Alt mantıklı"
  ]
}

✅ HER TAHMİN VERİYE DAYANMALI!
❌ RASTGELE SAYI VERME!`;

  return prompt;
};

export const analysisService = {
  async analyzeImageWithGemini(base64Image: string): Promise<CouponAnalysis['analysis']> {
    try {
      console.log('🗜️ Görsel sıkıştırılıyor...');
      const compressedImage = await compressImage(base64Image, 800, 0.6);

      console.log('🔍 ADIM 1: Görselden maçları tespit et...');
      const detectedMatches = await this.detectMatches(compressedImage);

      if (!detectedMatches || detectedMatches.length === 0) {
        throw new Error('Görselde maç tespit edilemedi');
      }

      console.log(`✅ ${detectedMatches.length} maç tespit edildi`);

      console.log('📦 ADIM 2: Detaylı veri toplama...');
      const matchesWithData = await this.getOrFetchMatchData(detectedMatches);

      console.log('🧠 ADIM 3: Gelişmiş AI analizi...');
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
        contents: [{
          parts: [
            { text: OCR_PROMPT },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 2048,
        },
      },
      { timeout: 60000 }
    );

    const content = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Maç bilgisi çıkarılamadı');
    }

    const result = JSON.parse(jsonMatch[0]);
    const matches = result.matches || [];

    if (matches.length > MAX_MATCHES) {
      console.warn(`⚠️ ${matches.length} maç tespit edildi, ilk ${MAX_MATCHES} kullanılacak`);
      return matches.slice(0, MAX_MATCHES);
    }

    return matches;
  },

  async getOrFetchMatchData(
    matches: DetectedMatch[]
  ): Promise<Array<DetectedMatch & { cachedData: CachedMatchData }>> {
    const matchesWithData: Array<DetectedMatch & { cachedData: CachedMatchData }> = [];
    const failedMatches: string[] = [];

    for (const match of matches) {
      try {
        const cacheKey = `match_cache/${match.matchId}`;
        const cacheRef = ref(database, cacheKey);
        const snapshot = await get(cacheRef);

        let cachedData: CachedMatchData;

        if (snapshot.exists()) {
          const cached = snapshot.val() as CachedMatchData;
          const hoursSinceUpdate = (Date.now() - cached.lastUpdated) / (1000 * 60 * 60);

          if (hoursSinceUpdate < CACHE_EXPIRY_HOURS) {
            console.log(`✅ Cache HIT: ${match.teamHome} vs ${match.teamAway}`);
            cachedData = cached;
          } else {
            console.log(`🔄 Cache EXPIRED: ${match.teamHome} vs ${match.teamAway}`);
            cachedData = await this.fetchMatchDataWithSportsradar(match);
            await set(cacheRef, cachedData);
          }
        } else {
          console.log(`🆕 Cache MISS: ${match.teamHome} vs ${match.teamAway}`);
          cachedData = await this.fetchMatchDataWithSportsradar(match);
          await set(cacheRef, cachedData);
        }

        matchesWithData.push({ ...match, cachedData });
      } catch (error: any) {
        console.error(`❌ ${match.teamHome} vs ${match.teamAway} veri hatası:`, error.message);
        failedMatches.push(`${match.teamHome} vs ${match.teamAway}`);
      }
    }

    if (matchesWithData.length === 0) {
      throw new Error(`Hiçbir maç için veri alınamadı. Başarısız: ${failedMatches.join(', ')}`);
    }

    if (failedMatches.length > 0) {
      console.warn(`⚠️ ${failedMatches.length} maç atlandı, ${matchesWithData.length} maç analiz edilecek`);
    }

    return matchesWithData;
  },

  async fetchMatchDataWithSportsradar(match: DetectedMatch): Promise<CachedMatchData> {
    try {
      console.log(`🏟️ API-Football: ${match.teamHome} vs ${match.teamAway}`);

      const apiData = await sportsradarService.getMatchData(
        match.teamHome,
        match.teamAway,
        match.league
      );

      if (apiData && apiData.confidenceScore >= 40) {
        // Form skorunu hesapla
        const homeFormScore = this.calculateFormScore(apiData.homeForm);
        const awayFormScore = this.calculateFormScore(apiData.awayForm);
        
        // Gol istatistiklerini çıkar
        const homeGoalsFor = this.extractGoalsFor(apiData.homeForm);
        const homeGoalsAgainst = this.extractGoalsAgainst(apiData.homeForm);
        const awayGoalsFor = this.extractGoalsFor(apiData.awayForm);
        const awayGoalsAgainst = this.extractGoalsAgainst(apiData.awayForm);
        
        const averageGoalsPerMatch = (homeGoalsFor + awayGoalsFor) / 10; // Son 5'er maç

        console.log(`✅ API-Football başarılı (Güven: ${apiData.confidenceScore}%)`);

        return {
          matchId: match.matchId,
          teamHome: match.teamHome,
          teamAway: match.teamAway,
          league: match.league,
          homeForm: apiData.homeForm,
          awayForm: apiData.awayForm,
          h2h: apiData.h2h,
          injuries: apiData.injuries,
          leaguePosition: apiData.leaguePosition,
          lastUpdated: Date.now(),
          dataSources: apiData.dataSources,
          confidenceScore: apiData.confidenceScore,
          homeFormScore,
          awayFormScore,
          homeGoalsFor,
          homeGoalsAgainst,
          awayGoalsFor,
          awayGoalsAgainst,
          averageGoalsPerMatch,
        };
      }

      throw new Error(`Yetersiz veri: ${match.teamHome} vs ${match.teamAway}`);
    } catch (error: any) {
      console.error('❌ API-Football hatası:', error.message);
      throw error;
    }
  },

  // Form skorunu hesapla
  calculateFormScore(formString: string): number {
    if (!formString || formString === 'Veri yok') return 50;
    
    const matches = formString.match(/(\d+)G\s+(\d+)B\s+(\d+)M/);
    if (!matches) return 50;
    
    const wins = parseInt(matches[1]);
    const draws = parseInt(matches[2]);
    const losses = parseInt(matches[3]);
    const total = wins + draws + losses;
    
    if (total === 0) return 50;
    
    const points = (wins * 3) + (draws * 1);
    const maxPoints = total * 3;
    
    return Math.round((points / maxPoints) * 100);
  },

  extractGoalsFor(formString: string): number {
    const match = formString.match(/(\d+)\s*attı/);
    return match ? parseInt(match[1]) : 0;
  },

  extractGoalsAgainst(formString: string): number {
    const match = formString.match(/(\d+)\s*yedi/);
    return match ? parseInt(match[1]) : 0;
  },

  async performFinalAnalysis(
    matchesWithData: Array<DetectedMatch & { cachedData: CachedMatchData }>
  ): Promise<CouponAnalysis['analysis']> {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: FINAL_ANALYSIS_PROMPT(matchesWithData) }],
        }],
        generationConfig: {
          temperature: 0.2, // Düşük = tutarlı
          topK: 20,
          topP: 0.85,
          maxOutputTokens: 4096,
        },
      },
      { timeout: 90000 }
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
      confidence: analysis.confidence || 50,
    };
  },

  // Diğer fonksiyonlar (saveCouponAnalysis, getUserAnalyses, vb.) aynen kalabilir
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
