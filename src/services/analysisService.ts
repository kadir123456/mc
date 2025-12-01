import axios from 'axios';
import { CouponAnalysis } from '../types';
import { ref, set, get, remove } from 'firebase/database';
import { database } from './firebase';
import { compressImage } from '../utils/imageCompressor';
import sportsradarService from './sportsradarService'; // ← YENİ!

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-pro';
const CACHE_EXPIRY_HOURS = 24;
const MAX_MATCHES = 3; // Maximum 3 maç limiti

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
    },
    {
      "matchId": "match_kamerun_vs_kongo",
      "teamHome": "Kamerun",
      "teamAway": "Demokratik Kongo C.",
      "league": "Dünya Kupası Afrika Elemeleri",
      "date": "2025-11-13",
      "time": "22:00",
      "odds": {
        "ms1": 1.91,
        "msx": 2.50,
        "ms2": 3.42,
        "alt25": 1.18,
        "ust25": 2.71
      }
    }
  ]
}

KRİTİK KURALLAR:
1. Her maç için benzersiz matchId oluştur (takım_ismi_vs_takım_ismi formatında)
2. Takım isimlerini AYNEN görseldeki gibi yaz (U21, U19 varsa ekle)
3. Lig/Turnuva ismini TAM ve DOĞRU yaz ("U21 AVRUPA ŞAMP. ELEMELERİ" → "U21 Avrupa Şampiyonası Elemeleri")
4. Oranları DOĞRU kutudan al (MS1 solda, MS2 sağda)
5. Sadece JSON döndür, başka açıklama yapma
6. Eğer oran görselde yoksa null yaz`;

const FINAL_ANALYSIS_PROMPT = (matches: Array<DetectedMatch & { cachedData: CachedMatchData }>) => `Sen profesyonel futbol ve uluslararası turnuva analiz uzmanısın.

ÖNEMLİ: U21, U19 gibi genç takımlar ve Dünya Kupası elemeleri için ANALİZ YAPIYORSUN!

AĞIRLIK SİSTEMİ:
- Form: %40 (Son maç performansları)
- H2H: %25 (Kafa kafaya geçmiş)
- Lig Pozisyonu: %15 (Sıralama)
- Veri Kalitesi: %10 (Kaynak güvenilirliği)
- İç Saha Avantajı: %10

MAÇLAR:
${matches.map((m, i) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MAÇ ${i + 1}: ${m.teamHome} vs ${m.teamAway}
Lig/Turnuva: ${m.league}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 GERÇEK VERİLER:
• Ev Sahibi Form: ${m.cachedData.homeForm}
• Deplasman Form: ${m.cachedData.awayForm}
• Kafa Kafaya (H2H): ${m.cachedData.h2h}
• Sakatlıklar: ${m.cachedData.injuries}
• Lig Durumu: ${m.cachedData.leaguePosition}

📈 VERİ KALİTESİ:
• Veri Kaynağı: ${m.cachedData.dataSources.join(', ')}
• Güven Skoru: ${m.cachedData.confidenceScore}/100

💰 ORANLAR:
${m.odds ? `• MS1 (Ev Kazanır): ${m.odds.ms1}
• MS X (Beraberlik): ${m.odds.msx || m.odds.beraberlik || 'N/A'}
• MS2 (Deplasman Kazanır): ${m.odds.ms2}
• Üst 2.5: ${m.odds.ust25 || 'N/A'}
• Alt 2.5: ${m.odds.alt25 || 'N/A'}` : 'Oran bilgisi yok'}
`).join('\n')}

GÖREVİN:
1. Her maç için AĞIRLIK SİSTEMİNE göre detaylı analiz yap
2. SADECE 70+ confidence skorlu tahminleri finalCoupon'a ekle
3. Her tahmin için GÜVENİLİR sebep ver (form, H2H, sakatlık, vb.)
4. Risk seviyesi belirle:
   - Düşük Risk: 70-79 confidence
   - Orta Risk: 80-89 confidence
   - Yüksek Risk: 90-100 confidence

ÇIKTI FORMATI (JSON):
{
  "finalCoupon": [
    "Lüksemburg U21 - MS1 (Sebep: Ev sahibi son 3 maçını kazandı, İzlanda deplasmanı zayıf)",
    "Kamerun - Alt 2.5 (Sebep: Her iki takım da defansif oynuyor, son 4 karşılaşma gol az)"
  ],
  "matches": [
    {
      "matchId": "match_luksemburg_u21_vs_izlanda_u21",
      "league": "U21 Avrupa Şampiyonası Elemeleri",
      "teams": ["Lüksemburg U21", "İzlanda U21"],
      "predictions": {
        "ms1": {
          "odds": 2.45,
          "confidence": 75,
          "reasoning": "Ev sahibi son 3 maçta 2 galibiyet aldı, İzlanda deplasmanı zayıf (son 5'te 1 galibiyet)"
        },
        "alt25": {
          "odds": 2.30,
          "confidence": 68,
          "reasoning": "Her iki takım da genç ve temkinli oynuyor"
        }
      },
      "realData": {
        "homeForm": "${matches[0]?.cachedData.homeForm || 'Veri yok'}",
        "awayForm": "${matches[0]?.cachedData.awayForm || 'Veri yok'}",
        "h2h": "${matches[0]?.cachedData.h2h || 'Veri yok'}",
        "injuries": "${matches[0]?.cachedData.injuries || 'Veri yok'}",
        "leaguePosition": "${matches[0]?.cachedData.leaguePosition || 'Veri yok'}"
      },
      "dataQuality": {
        "sources": ${matches[0]?.cachedData.dataSources.length || 0},
        "confidence": ${matches[0]?.cachedData.confidenceScore || 0},
        "lastUpdated": "Önbellek veya yeni veri"
      }
    }
  ],
  "totalOdds": 5.63,
  "confidence": 72,
  "riskLevel": "Düşük",
  "recommendations": [
    "Toplam oran: 5.63 - Risk seviyesi: Düşük",
    "Lüksemburg U21 ev sahibi avantajını kullanmalı",
    "Kamerun-Kongo maçı genellikle az gollü geçiyor",
    "Veri kalitesi iyi, 2 kaynaktan toplanan bilgiler"
  ]
}

KRİTİK KURALLAR:
1. SADECE 70+ confidence skorlu tahminleri finalCoupon'a ekle!
2. Her tahmin için MUTLAKA reasoning (sebep) ekle
3. Gerçek verilere dayanarak analiz yap (form, H2H, sakatlık)
4. U21/U19 maçlarında genç takım özelliklerini dikkate al
5. Toplam oranı doğru hesapla (çarpımla)
6. JSON formatına DİKKATLİ UY, hata yapma!`;

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
        timeout: 60000,
        maxContentLength: 50 * 1024 * 1024,
        maxBodyLength: 50 * 1024 * 1024,
      }
    );

    const content = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Maç bilgisi çıkarılamadı');
    }

    const result = JSON.parse(jsonMatch[0]);
    const matches = result.matches || [];

    // Maximum 3 maç limiti
    if (matches.length > MAX_MATCHES) {
      console.warn(`⚠️ ${matches.length} maç tespit edildi, sadece ilk ${MAX_MATCHES} tanesi kullanılacak`);
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
            console.log(`✅ Cache HIT: ${match.teamHome} vs ${match.teamAway} (${hoursSinceUpdate.toFixed(1)}h önce)`);
            cachedData = cached;
          } else {
            console.log(`🔄 Cache EXPIRED: ${match.teamHome} vs ${match.teamAway} - Yeni veri çekiliyor...`);
            cachedData = await this.fetchMatchDataWithSportsradar(match);
            await set(cacheRef, cachedData);
          }
        } else {
          console.log(`🆕 Cache MISS: ${match.teamHome} vs ${match.teamAway} - İlk kez veri çekiliyor...`);
          cachedData = await this.fetchMatchDataWithSportsradar(match);
          await set(cacheRef, cachedData);
        }

        matchesWithData.push({ ...match, cachedData });
      } catch (error: any) {
        console.error(`❌ Maç verisi alınamadı: ${match.teamHome} vs ${match.teamAway}`, error.message);
        failedMatches.push(`${match.teamHome} vs ${match.teamAway}`);
      }
    }

    if (matchesWithData.length === 0) {
      throw new Error(`Hiçbir maç için veri alınamadı. Başarısız maçlar: ${failedMatches.join(', ')}`);
    }

    if (failedMatches.length > 0) {
      console.warn(`⚠️ ${failedMatches.length} maç atlandı: ${failedMatches.join(', ')}`);
      console.warn(`✅ ${matchesWithData.length} maç için veri alındı, analiz devam ediyor...`);
    }

    return matchesWithData;
  },

  // ✅ API-Football ile veri çekme (Gemini fallback YOK)
  async fetchMatchDataWithSportsradar(match: DetectedMatch): Promise<CachedMatchData> {
    try {
      console.log(`🏟️ API-Football'dan veri çekiliyor: ${match.teamHome} vs ${match.teamAway}`);

      const apiData = await sportsradarService.getMatchData(
        match.teamHome,
        match.teamAway,
        match.league
      );

      if (apiData && apiData.confidenceScore >= 40) {
        console.log(`✅ API-Football verisi kullanıldı (Confidence: ${apiData.confidenceScore}%)`);

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
        };
      }

      // ❌ API-Football başarısız - Veri yetersiz
      console.error('❌ API-Football verisi yetersiz veya bulunamadı');
      throw new Error(`Maç verileri alınamadı: ${match.teamHome} vs ${match.teamAway}. Lüksemburg gibi küçük liglerde veri olmayabilir.`);
    } catch (error: any) {
      console.error('❌ API-Football hatası:', error.message);
      throw error; // Hata yukarı ilet, kredi iade edilsin
    }
  },

  // ❌ KALDIRILDI: Gemini fallback artık kullanılmıyor
  // Sadece API-Football kullanılacak, başarısız olursa kredi iade edilecek

  async performFinalAnalysis(
    matchesWithData: Array<DetectedMatch & { cachedData: CachedMatchData }>
  ): Promise<CouponAnalysis['analysis']> {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: FINAL_ANALYSIS_PROMPT(matchesWithData) }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 32,
          topP: 0.9,
          maxOutputTokens: 4096,
        },
      },
      { timeout: 60000 }
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
