import axios from 'axios';
import { CouponAnalysis } from '../types';
import { ref, set, get, remove } from 'firebase/database';
import { database } from './firebase';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
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
      "league": "Lig Adı (örn: Premier League, La Liga)",
      "date": "2024-01-15" (eğer görselde varsa),
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

ÖNEMLİ:
- Her maç için benzersiz matchId oluştur (team_home + team_away + league hash)
- Takım isimlerini tam ve doğru yaz
- Sadece JSON döndür, açıklama yapma`;

const DATA_COLLECTION_PROMPT = (match: DetectedMatch) => `Sen bir profesyonel futbol veri analisti olarak, aşağıdaki maç için internetten veri toplayacaksın.

MAÇ BİLGİSİ:
- Ev Sahibi: ${match.teamHome}
- Deplasman: ${match.teamAway}
- Lig: ${match.league}
${match.date ? `- Tarih: ${match.date}` : ''}

GÖREV:
Aşağıdaki bilgileri araştır ve topla:

1. **Son Form Durumu**: ${match.teamHome} ve ${match.teamAway} son 5 maç sonuçları
2. **Kafa Kafaya (H2H)**: Son karşılaşmalar
3. **Sakatlık ve Kadro**: Eksik oyuncular
4. **Lig Sıralaması**: Güncel puan durumu

ÇIKTI FORMATI (JSON - MUTLAKA BU FORMATTA DÖNDÜR):
{
  "homeForm": "Son 5: G-G-B-G-K (3G 1B 1K) | 12 gol attı, 7 gol yedi",
  "awayForm": "Son 5: K-K-B-G-K (1G 1B 3K) | 5 gol attı, 10 gol yedi",
  "h2h": "Son 5 karşılaşma: 2-1, 0-0, 3-1, 1-2, 2-0",
  "injuries": "Ev Sahibi: 2 oyuncu sakat | Deplasman: Ana forvet sakat",
  "leaguePosition": "Ev Sahibi: 3. sıra (45 puan) | Deplasman: 12. sıra (28 puan)",
  "dataSources": ["kaynak1", "kaynak2"],
  "confidenceScore": 85
}

KRİTİK: Yanıtının sadece JSON olması gerekiyor. Başka açıklama yapma!`;

const FINAL_ANALYSIS_PROMPT = (matches: Array<DetectedMatch & { cachedData: CachedMatchData }>) => `Sen bir profesyonel futbol analiz uzmanısın. Aşağıdaki maçlar için GERÇEK VERİLERE dayalı detaylı analiz yap.

AĞIRLIK SİSTEMİ:
- Son Form: %40
- Kafa Kafaya (H2H): %25
- Sakatlık/Kadro: %15
- Lig Sıralaması: %10
- İç Saha/Dış Saha Avantajı: %10

MAÇLAR VE GERÇEK VERİLER:
${matches.map((m, i) => `
MAÇ ${i + 1}: ${m.teamHome} vs ${m.teamAway} (${m.league})
- Son Form (Ev): ${m.cachedData.homeForm}
- Son Form (Deplasman): ${m.cachedData.awayForm}
- Kafa Kafaya: ${m.cachedData.h2h}
- Sakatlıklar: ${m.cachedData.injuries}
- Lig Durumu: ${m.cachedData.leaguePosition}
- Veri Kaynağı Sayısı: ${m.cachedData.dataSources.length}
${m.odds ? `- Oranlar: MS1: ${m.odds.ms1}, MS2: ${m.odds.ms2}, Beraberlik: ${m.odds.beraberlik}` : ''}
`).join('\n')}

GÖREV:
1. Her maç için yukarıdaki AĞIRLIK SİSTEMİNE göre analiz yap
2. Güven skoru 70+ olan maçları finalCoupon'a ekle
3. Her maç için risk seviyesi belirle (Düşük: 70-79, Orta: 80-89, Yüksek: 90+)
4. Tahminlerine gerekçe sun

ÇIKTI FORMATI (JSON):
{
  "finalCoupon": [
    "${matches[0]?.teamHome} - MS1",
    "${matches[1]?.teamHome} - Üst 2.5"
  ],
  "matches": [
    {
      "matchId": "${matches[0]?.matchId}",
      "league": "${matches[0]?.league}",
      "teams": ["${matches[0]?.teamHome}", "${matches[0]?.teamAway}"],
      "predictions": {
        "ms1": {"odds": 1.85, "confidence": 78},
        "ms2": {"odds": 2.20, "confidence": 55},
        "beraberlik": {"odds": 3.10, "confidence": 35},
        "ust25": {"odds": 1.92, "confidence": 70, "type": "Üst 2.5"},
        "alt25": {"odds": 1.88, "confidence": 65, "type": "Alt 2.5"},
        "kgg": {"odds": 1.95, "confidence": 60, "type": "Karşılıklı Gol Var"}
      },
      "realData": {
        "homeForm": "${matches[0]?.cachedData.homeForm}",
        "awayForm": "${matches[0]?.cachedData.awayForm}",
        "h2h": "${matches[0]?.cachedData.h2h}",
        "injuries": "${matches[0]?.cachedData.injuries}",
        "leaguePosition": "${matches[0]?.cachedData.leaguePosition}"
      },
      "dataQuality": {
        "sources": ${matches[0]?.cachedData.dataSources.length || 0},
        "confidence": ${matches[0]?.cachedData.confidenceScore || 0},
        "lastUpdated": "${new Date(matches[0]?.cachedData.lastUpdated || Date.now()).toLocaleString('tr-TR')}"
      }
    }
  ],
  "totalOdds": 8.50,
  "confidence": 75,
  "recommendations": [
    "Form bazlı güçlü 3 maçlık kombine",
    "Toplam oran: 8.50 - Risk: Orta",
    "Sadece 70+ güven skorlu maçlar seçildi"
  ]
}

KRİTİK KURALLAR:
1. SADECE 70+ confidence skorlu maçları finalCoupon'a ekle
2. Düşük güven skorlu maçları ekleme
3. Gerçek verilere dayalı mantıklı tahminler yap
4. Risk uyarılarını belirt`;

export const analysisService = {
  async analyzeImageWithGemini(base64Image: string): Promise<CouponAnalysis['analysis']> {
    try {
      console.log('🔍 Adım 1: Görselden maçları tespit ediliyor...');
      const detectedMatches = await this.detectMatches(base64Image);

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
      }
    );

    const content = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Maç bilgileri çıkarılamadı');
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
    try {
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
            responseMimeType: "application/json",
          },
        }
      );

      console.log('📡 API Response:', JSON.stringify(response.data, null, 2));

      const candidate = response.data.candidates?.[0];
      if (!candidate) {
        console.error('❌ No candidates in response');
        throw new Error('API yanıtı geçersiz');
      }

      // Grounding metadata'dan kaynakları topla
      const groundingMetadata = candidate.groundingMetadata;
      const dataSources: string[] = [];

      if (groundingMetadata?.groundingChunks) {
        groundingMetadata.groundingChunks.forEach((chunk: any) => {
          if (chunk.web?.uri) {
            dataSources.push(chunk.web.uri);
          }
        });
      }

      if (groundingMetadata?.webSearchQueries) {
        console.log('🔍 Search queries:', groundingMetadata.webSearchQueries);
      }

      console.log('🔗 Data sources found:', dataSources.length);

      // Metin içeriğini topla
      let textContent = '';
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            textContent += part.text;
          }
        }
      }

      console.log('📝 Extracted text:', textContent);

      // Eğer metin yoksa, grounding data var mı kontrol et
      if (!textContent || textContent.trim() === '') {
        console.warn('⚠️ No text content, checking grounding data...');
        
        // Grounding data varsa, basit bir veri oluştur
        if (dataSources.length > 0) {
          console.log('✅ Found grounding data, creating fallback response');
          return {
            matchId: match.matchId,
            teamHome: match.teamHome,
            teamAway: match.teamAway,
            league: match.league,
            homeForm: 'Veri aranıyor... (Web araması yapıldı)',
            awayForm: 'Veri aranıyor... (Web araması yapıldı)',
            h2h: 'Veri aranıyor... (Web araması yapıldı)',
            injuries: 'Veri aranıyor... (Web araması yapıldı)',
            leaguePosition: 'Veri aranıyor... (Web araması yapıldı)',
            lastUpdated: Date.now(),
            dataSources: dataSources,
            confidenceScore: 50,
          };
        }
        
        // Hiç veri yoksa, ikinci bir deneme yap (grounding olmadan)
        console.warn('⚠️ No grounding data either, retrying without grounding...');
        return await this.fetchMatchDataWithoutGrounding(match);
      }

      // JSON parse et
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.error('❌ No JSON found in text:', textContent);
        // JSON bulunamadıysa, grounding olmadan tekrar dene
        console.warn('⚠️ Retrying without grounding...');
        return await this.fetchMatchDataWithoutGrounding(match);
      }

      const data = JSON.parse(jsonMatch[0]);
      console.log('✅ Parsed data:', data);

      return {
        matchId: match.matchId,
        teamHome: match.teamHome,
        teamAway: match.teamAway,
        league: match.league,
        homeForm: data.homeForm || 'Veri yok',
        awayForm: data.awayForm || 'Veri yok',
        h2h: data.h2h || 'Veri yok',
        injuries: data.injuries || 'Veri yok',
        leaguePosition: data.leaguePosition || 'Veri yok',
        lastUpdated: Date.now(),
        dataSources: dataSources.length > 0 ? dataSources : (data.dataSources || ['Gemini 1.5 Pro']),
        confidenceScore: data.confidenceScore || 70,
      };
    } catch (error: any) {
      console.error('❌ fetchMatchDataWithGrounding error:', error);
      console.error('Error details:', error.response?.data || error.message);

      // Hata durumunda grounding olmadan dene
      console.warn('⚠️ Trying fallback without grounding...');
      try {
        return await this.fetchMatchDataWithoutGrounding(match);
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        
        // Her şey başarısız olursa, boş veri döndür
        return {
          matchId: match.matchId,
          teamHome: match.teamHome,
          teamAway: match.teamAway,
          league: match.league,
          homeForm: 'Veri toplama hatası',
          awayForm: 'Veri toplama hatası',
          h2h: 'Veri toplama hatası',
          injuries: 'Veri toplama hatası',
          leaguePosition: 'Veri toplama hatası',
          lastUpdated: Date.now(),
          dataSources: [],
          confidenceScore: 0,
        };
      }
    }
  },

  async fetchMatchDataWithoutGrounding(match: DetectedMatch): Promise<CachedMatchData> {
    console.log('🔄 Fetching data WITHOUT grounding for:', match.teamHome, 'vs', match.teamAway);
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { 
                text: `${match.teamHome} vs ${match.teamAway} (${match.league}) maçı için bilinen verilerle analiz yap.

Döndürmen gereken JSON formatı:
{
  "homeForm": "Son formlarını özetle",
  "awayForm": "Son formlarını özetle",
  "h2h": "Genel kafa kafaya bilgisi",
  "injuries": "Bilinen sakatlık durumları",
  "leaguePosition": "Lig pozisyonları hakkında genel bilgi",
  "dataSources": ["Genel bilgi"],
  "confidenceScore": 60
}

Sadece JSON döndür, başka açıklama yapma!` 
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }
    );

    const textContent = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
      matchId: match.matchId,
      teamHome: match.teamHome,
      teamAway: match.teamAway,
      league: match.league,
      homeForm: data.homeForm || 'Genel form bilgisi mevcut değil',
      awayForm: data.awayForm || 'Genel form bilgisi mevcut değil',
      h2h: data.h2h || 'Kafa kafaya bilgisi mevcut değil',
      injuries: data.injuries || 'Sakatlık bilgisi mevcut değil',
      leaguePosition: data.leaguePosition || 'Lig bilgisi mevcut değil',
      lastUpdated: Date.now(),
      dataSources: ['Gemini 1.5 Pro (Genel Bilgi)'],
      confidenceScore: data.confidenceScore || 60,
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
