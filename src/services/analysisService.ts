import axios from 'axios';
import { CouponAnalysis } from '../types';
import { ref, set, get, remove } from 'firebase/database';
import { database } from './firebase';

// ==================== KONFİGÜRASYON ====================
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_API_VERSION = 'v1beta';
const GEMINI_API_BASE = `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models`;

// Cache ve retry ayarları
const CACHE_EXPIRY_HOURS = 24; // 12 saatten 24 saate çıkardık (daha fazla tasarruf)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const API_TIMEOUT_MS = 90000;

// ==================== TYPE DEFINITIONS ====================
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
  searchQueries?: string[];
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

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: { uri?: string; title?: string };
      }>;
      webSearchQueries?: string[];
      searchEntryPoint?: { renderedContent?: string };
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

// ==================== OPTIMIZED PROMPTS ====================

const OCR_PROMPT = `🎯 GÖREV: Bahis kuponundaki TÜM maçları hassas şekilde tespit et.

📸 GÖRSEL ANALİZ TALİMATLARI:
1. Kupondaki her maç satırını dikkatlice oku
2. Takım isimlerini TAMAMEN ve DOĞRU şekilde çıkar
3. Lig bilgisini belirle (Premier League, La Liga, Serie A, Bundesliga, Süper Lig vb.)
4. Varsa oranları ve bahis türlerini kaydet
5. Her maç için benzersiz ID oluştur

📋 ÇIKTI FORMATI - SADECE GEÇERLİ JSON:
{
  "matches": [
    {
      "matchId": "liv_ars_epl_20241111",
      "teamHome": "Liverpool",
      "teamAway": "Arsenal", 
      "league": "Premier League",
      "date": "2024-11-11",
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

⚠️ KRİTİK KURALLAR:
✅ Takım isimlerini kısaltma (LIV ❌, Liverpool ✅)
✅ Türkçe karakterleri düzgün kullan (Galatasaray, Fenerbahçe)
✅ matchId formatı: takım1_takım2_lig_tarih (küçük harf, alt çizgi)
✅ SADECE geçerli JSON döndür (markdown/açıklama yok)
✅ Oranlar yoksa null bırak
✅ Minimum 1, maksimum 10 maç tespit et`;

const DATA_COLLECTION_PROMPT = (match: DetectedMatch) => {
  const today = new Date().toISOString().split('T')[0];
  const searchDate = match.date || today;
  
  return `🔍 PROFESYONEL FUTBOL VERİ TOPLAMA SİSTEMİ - GOOGLE SEARCH POWERED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 HEDEF MAÇ BİLGİLERİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏠 Ev Sahibi: ${match.teamHome}
✈️ Deplasman: ${match.teamAway}
🏆 Lig: ${match.league}
📅 Tarih: ${searchDate}
🆔 ID: ${match.matchId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 GÖREV: Google Search ile GERÇEK ZAMANLI veri topla

📌 ARAŞTIRMA ALANLARI:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ SON FORM ANALİZİ (Son 5 Maç - %40 Ağırlık)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔎 ARAMA ÖNERİLERİ:
   • "${match.teamHome} latest results 2024"
   • "${match.teamHome} last 5 matches"
   • "${match.teamHome} recent form ${match.league}"
   • "${match.teamAway} recent results 2024"
   • "${match.teamAway} last 5 games"
   • "${match.teamAway} away form"

📊 TOPLANACAK VERİ:
   ✓ Son 5 maçın sonuçları (G-B-M)
   ✓ Attığı/yediği goller
   ✓ İç saha/dış saha performansı
   ✓ Son haftalardaki trend

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ KAFA KAFAYA (H2H - %25 Ağırlık)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔎 ARAMA ÖNERİLERİ:
   • "${match.teamHome} vs ${match.teamAway} head to head"
   • "${match.teamHome} ${match.teamAway} h2h statistics"
   • "${match.teamHome} ${match.teamAway} previous meetings"

📊 TOPLANACAK VERİ:
   ✓ Son 5 karşılaşma skorları
   ✓ Galibiyet dağılımı
   ✓ Gol ortalaması
   ✓ Ev sahibi avantajı

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ SAKATLIK VE KADRO (%15 Ağırlık)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔎 ARAMA ÖNERİLERİ:
   • "${match.teamHome} injury news today"
   • "${match.teamHome} team news lineup"
   • "${match.teamHome} suspended players"
   • "${match.teamAway} injuries ${searchDate}"
   • "${match.teamAway} squad news"

📊 TOPLANACAK VERİ:
   ✓ Sakat/cezalı oyuncular
   ✓ Kilit oyuncuların durumu
   ✓ Kadro derinliği

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ LİG SIRALAMASI (%10 Ağırlık)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔎 ARAMA ÖNERİLERİ:
   • "${match.league} table standings 2024"
   • "${match.league} current standings"
   • "${match.teamHome} league position"
   • "${match.teamAway} standings"

📊 TOPLANACAK VERİ:
   ✓ Lig sıralamaları
   ✓ Puan durumu
   ✓ Hedefler (şampiyonluk/düşme)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ EK FAKTÖRLER (%10 Ağırlık)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔎 ARAMA ÖNERİLERİ:
   • "${match.teamHome} home record ${match.league}"
   • "${match.teamAway} away record"
   • "${match.teamHome} ${match.teamAway} rivalry"

📊 TOPLANACAK VERİ:
   ✓ İç/dış saha istatistikleri
   ✓ Maç öncesi haberler
   ✓ Teknik direktör/transfer haberleri

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 ÇIKTI FORMATI - SADECE GEÇERLİ JSON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "homeForm": "Son 5: G-G-B-G-M (3G 1B 1M) | 12 gol attı, 7 yedi | İç sahada 4/5 galibiyet",
  "awayForm": "Son 5: M-M-B-G-M (1G 1B 3M) | 5 gol attı, 10 yedi | Dış sahada 1/5 galibiyet",
  "h2h": "Son 5: 2-1, 0-0, 3-1, 1-2, 2-0 (Ev sahibi 3G 1B 1M) | Ortalama 2.2 gol/maç",
  "injuries": "Ev: 2 sakat (orta saha zayıf) | Deplasman: Yıldız forvet sakat (büyük eksik)",
  "leaguePosition": "Ev: 3. sıra 45p (şampiyonluk yarışı) | Deplasman: 12. sıra 28p (rahat)",
  "dataSources": [
    "https://www.flashscore.com/...",
    "https://www.sofascore.com/...",
    "https://www.bbc.com/sport/..."
  ],
  "confidenceScore": 85
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ KRİTİK KURALLAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ZORUNLU:
   • Google Search sonuçlarını MUTLAKA kullan
   • Güvenilir kaynaklardan veri topla
   • SON 48 SAAT içindeki güncel verileri tercih et
   • Her bilgi için kaynak URL'si ekle
   • confidenceScore: 0-100

✅ KALİTE:
   • 90-100: Mükemmel (5+ kaynak)
   • 80-89: Çok İyi (4 kaynak)
   • 70-79: İyi (3 kaynak)
   • 60-69: Orta (2 kaynak)
   • 0-59: Zayıf

❌ YASAK:
   • Tahmin yapma
   • Eski veri güncel gösterme
   • Rastgele sayı üretme
   • Veri yoksa "Veri bulunamadı" yaz`;
};

const FINAL_ANALYSIS_PROMPT = (matches: Array<DetectedMatch & { cachedData: CachedMatchData }>) => `🎯 PROFESYONEL FUTBOL ANALİZ SİSTEMİ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 AĞIRLIK SİSTEMİ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 Form (%40) 🟠 H2H (%25) 🟡 Kadro (%15) 🟢 Sıralama (%10) 🔵 Saha (%10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 MAÇLAR:

${matches.map((m, i) => `
MAÇ ${i + 1}: ${m.teamHome} vs ${m.teamAway} (${m.league})
Form: ${m.cachedData.homeForm} | ${m.cachedData.awayForm}
H2H: ${m.cachedData.h2h}
Sakatlık: ${m.cachedData.injuries}
Sıralama: ${m.cachedData.leaguePosition}
Güven: ${m.cachedData.confidenceScore}/100
${m.odds ? `Oranlar: MS1=${m.odds.ms1} Beraberlik=${m.odds.beraberlik} MS2=${m.odds.ms2} Üst2.5=${m.odds.ust25} Alt2.5=${m.odds.alt25} KGG=${m.odds.kgg}` : ''}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GÖREV: Her maç için detaylı analiz yap
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONFIDENCE HESAPLAMA:
• 90-100: Kesin
• 80-89: Çok Güvenli
• 70-79: Güvenli
• 60-69: Orta Risk
• 0-59: Yüksek Risk

SADECE 70+ confidence finalCoupon'a ekle!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ÇIKTI - SADECE JSON:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "finalCoupon": ["Liverpool - MS1 (1.85, Orta Risk)"],
  "matches": [{
    "matchId": "liv_ars_epl",
    "league": "Premier League",
    "teams": ["Liverpool", "Arsenal"],
    "predictions": {
      "ms1": {
        "odds": 1.85,
        "confidence": 78,
        "reasoning": "Liverpool ev sahibi, form iyi (%40). H2H avantajlı (%25). Arsenal sakat (%15). Şampiyonluk yarışı (%10). Ev avantajı (%10). Toplam: 78"
      },
      "ust25": {
        "odds": 1.92,
        "confidence": 72,
        "type": "Üst 2.5 Gol",
        "reasoning": "Her iki takım gol atıyor. H2H'de 4/5 maçta 3+ gol."
      }
    }
  }],
  "totalOdds": 3.55,
  "confidence": 75,
  "recommendations": [
    "2 Maçlık Kombine",
    "Toplam Oran: 3.55",
    "Risk: ORTA"
  ]
}`;

// ==================== HELPER FUNCTIONS ====================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanAndParseJSON(text: string): any {
  try {
    let cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    
    if (!jsonMatch) {
      throw new Error('JSON formatı bulunamadı');
    }
    
    let jsonStr = jsonMatch[0]
      .replace(/"\s*\n\s*"/g, '",\n"')
      .replace(/"\s*\n\s*\{/g, '",\n{')
      .replace(/\}\s*\n\s*"/g, '},\n"')
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/,,+/g, ',')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    
    const parsed = JSON.parse(jsonStr);
    console.log('✅ JSON parse başarılı');
    return parsed;
    
  } catch (error) {
    console.error('❌ JSON parse hatası:', error);
    throw new Error(`JSON parse başarısız: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
  }
}

async function callGeminiAPI(
  endpoint: string,
  payload: any,
  retries = MAX_RETRIES
): Promise<GeminiResponse> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📡 API çağrısı (${attempt}/${retries})...`);
      
      const response = await axios.post<GeminiResponse>(endpoint, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: API_TIMEOUT_MS,
      });
      
      if (response.data.usageMetadata) {
        const usage = response.data.usageMetadata;
        console.log(`📊 Token: ${usage.totalTokenCount}`);
      }
      
      console.log('✅ API başarılı');
      return response.data;
      
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      console.error(`❌ API hatası (${attempt}/${retries}):`, errorMsg);
      
      if (attempt === retries) {
        throw new Error(`API başarısız: ${errorMsg}`);
      }
      
      if (error.response?.status === 429 || error.response?.status === 503 || error.response?.status === 500) {
        const waitTime = RETRY_DELAY_MS * attempt;
        console.log(`⏳ ${waitTime}ms bekleniyor...`);
        await sleep(waitTime);
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('API çağrısı başarısız');
}

function extractGroundingData(candidate: any): { sources: string[]; queries: string[] } {
  const sources: string[] = [];
  const queries: string[] = [];
  
  if (!candidate.groundingMetadata) return { sources, queries };
  
  const metadata = candidate.groundingMetadata;
  
  if (metadata.groundingChunks) {
    metadata.groundingChunks.forEach((chunk: any) => {
      if (chunk.web?.uri) sources.push(chunk.web.uri);
    });
  }
  
  if (metadata.webSearchQueries) {
    queries.push(...metadata.webSearchQueries);
  }
  
  return { sources, queries };
}

function validateAPIKey(): void {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.trim() === '') {
    throw new Error('⚠️ GEMINI_API_KEY bulunamadı!');
  }
  
  if (!GEMINI_API_KEY.startsWith('AIzaSy')) {
    throw new Error('⚠️ GEMINI_API_KEY geçersiz!');
  }
  
  console.log('✅ API anahtarı doğrulandı');
}

// ==================== MAIN SERVICE ====================

export const analysisService = {
  async analyzeImageWithGemini(base64Image: string): Promise<CouponAnalysis['analysis']> {
    try {
      validateAPIKey();
      
      console.log('\n🚀 GEMINI 2.0 FLASH ANALİZ BAŞLADI\n');
      
      // ADIM 1: MAÇ TESPİTİ
      console.log('📸 [1/3] Görsel analizi...');
      const detectedMatches = await this.detectMatches(base64Image);
      
      if (!detectedMatches || detectedMatches.length === 0) {
        throw new Error('❌ Maç tespit edilemedi');
      }
      
      console.log(`✅ ${detectedMatches.length} maç tespit edildi\n`);

      // ADIM 2: VERİ TOPLAMA
      console.log('📊 [2/3] Veri toplama (Google Search)...');
      const matchesWithData = await this.getOrFetchMatchData(detectedMatches);
      
      const validMatches = matchesWithData.filter(m => m.cachedData.confidenceScore >= 60);
      console.log(`✅ ${validMatches.length} maç için kaliteli veri\n`);

      // ADIM 3: ANALİZ
      console.log('🧠 [3/3] Profesyonel analiz...');
      const finalAnalysis = await this.performFinalAnalysis(matchesWithData);

      console.log('\n✅ ANALİZ TAMAMLANDI!');
      console.log(`📋 ${finalAnalysis.finalCoupon.length} tahmin`);
      console.log(`💰 Oran: ${finalAnalysis.totalOdds.toFixed(2)}`);
      console.log(`🎯 Güven: ${finalAnalysis.confidence}%\n`);
      
      return finalAnalysis;
      
    } catch (error) {
      console.error('\n❌ HATA:', error);
      throw error;
    }
  },

  async detectMatches(base64Image: string): Promise<DetectedMatch[]> {
    try {
      const endpoint = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      
      const payload = {
        contents: [{
          parts: [
            { text: OCR_PROMPT },
            {
              inline_data: {
                mime_type: 'image/jpeg',
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
      };

      const data = await callGeminiAPI(endpoint, payload);
      
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('API yanıtı boş');
      }

      const content = data.candidates[0].content.parts[0].text;
      const result = cleanAndParseJSON(content);
      
      if (!result.matches || !Array.isArray(result.matches) || result.matches.length === 0) {
        throw new Error('Maç listesi bulunamadı');
      }

      return result.matches;
      
    } catch (error) {
      console.error('❌ Maç tespiti hatası:', error);
      throw error;
    }
  },

  async getOrFetchMatchData(
    matches: DetectedMatch[]
  ): Promise<Array<DetectedMatch & { cachedData: CachedMatchData }>> {
    const matchesWithData: Array<DetectedMatch & { cachedData: CachedMatchData }> = [];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      console.log(`Maç ${i + 1}/${matches.length}: ${match.teamHome} vs ${match.teamAway}`);
      
      const cacheKey = `match_cache/${match.matchId}`;
      const cacheRef = ref(database, cacheKey);
      
      try {
        const snapshot = await get(cacheRef);
        let cachedData: CachedMatchData;

        if (snapshot.exists()) {
          const cached = snapshot.val() as CachedMatchData;
          const hoursSinceUpdate = (Date.now() - cached.lastUpdated) / (1000 * 60 * 60);

          if (hoursSinceUpdate < CACHE_EXPIRY_HOURS) {
            console.log(`✅ Cache HIT (${hoursSinceUpdate.toFixed(1)}h)`);
            cachedData = cached;
          } else {
            console.log(`🔄 Cache yenileniyor...`);
            cachedData = await this.fetchMatchDataWithGrounding(match);
            await set(cacheRef, cachedData);
          }
        } else {
          console.log(`🆕 İlk veri toplama...`);
          cachedData = await this.fetchMatchDataWithGrounding(match);
          await set(cacheRef, cachedData);
        }

        matchesWithData.push({ ...match, cachedData });
        
      } catch (error) {
        console.error(`❌ Hata:`, error);
        
        matchesWithData.push({
          ...match,
          cachedData: {
            matchId: match.matchId,
            teamHome: match.teamHome,
            teamAway: match.teamAway,
            league: match.league,
            homeForm: 'Veri hatası',
            awayForm: 'Veri hatası',
            h2h: 'Veri hatası',
            injuries: 'Veri hatası',
            leaguePosition: 'Veri hatası',
            lastUpdated: Date.now(),
            dataSources: [],
            confidenceScore: 0,
          },
        });
      }
    }

    return matchesWithData;
  },

  async fetchMatchDataWithGrounding(match: DetectedMatch): Promise<CachedMatchData> {
    try {
      const endpoint = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      
      const payload = {
        contents: [{
          parts: [{ text: DATA_COLLECTION_PROMPT(match) }],
        }],
        tools: [{
          google_search_retrieval: {
            dynamic_retrieval_config: {
              mode: 'MODE_DYNAMIC',
              dynamic_threshold: 0.3,
            },
          },
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
      };

      const data = await callGeminiAPI(endpoint, payload);

      if (!data.candidates?.[0]) {
        throw new Error('API yanıtı boş');
      }

      const candidate = data.candidates[0];
      
      let textContent = '';
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) textContent += part.text;
        }
      }

      if (!textContent) {
        throw new Error('Metin bulunamadı');
      }

      const parsedData = cleanAndParseJSON(textContent);
      const { sources, queries } = extractGroundingData(candidate);

      console.log(`✅ ${sources.length} kaynak`);

      return {
        matchId: match.matchId,
        teamHome: match.teamHome,
        teamAway: match.teamAway,
        league: match.league,
        homeForm: parsedData.homeForm || 'Veri bulunamadı',
        awayForm: parsedData.awayForm || 'Veri bulunamadı',
        h2h: parsedData.h2h || 'Veri bulunamadı',
        injuries: parsedData.injuries || 'Veri bulunamadı',
        leaguePosition: parsedData.leaguePosition || 'Veri bulunamadı',
        lastUpdated: Date.now(),
        dataSources: sources.length > 0 ? sources : ['Gemini Search'],
        confidenceScore: parsedData.confidenceScore || 70,
        searchQueries: queries.length > 0 ? queries : undefined,
      };
      
    } catch (error: any) {
      console.error(`❌ Veri hatası:`, error.message);
      
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
  },

  async performFinalAnalysis(
    matchesWithData: Array<DetectedMatch & { cachedData: CachedMatchData }>
  ): Promise<CouponAnalysis['analysis']> {
    try {
      const endpoint = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      
      const payload = {
        contents: [{
          parts: [{ text: FINAL_ANALYSIS_PROMPT(matchesWithData) }],
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      };

      const data = await callGeminiAPI(endpoint, payload);

      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('API yanıtı boş');
      }

      const content = data.candidates[0].content.parts[0].text;
      const analysis = cleanAndParseJSON(content);

      if (!analysis.matches || !Array.isArray(analysis.matches)) {
        throw new Error('Geçersiz analiz formatı');
      }

      return {
        finalCoupon: analysis.finalCoupon || [],
        matches: analysis.matches || [],
        totalOdds: analysis.totalOdds || 0,
        recommendations: analysis.recommendations || [],
        confidence: analysis.confidence || 0,
      };
      
    } catch (error) {
      console.error('❌ Analiz hatası:', error);
      throw error;
    }
  },

  // ==================== FIREBASE OPERATIONS ====================

  async saveCouponAnalysis(userId: string, analysis: CouponAnalysis): Promise<CouponAnalysis> {
    try {
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

      console.log(`💾 Analiz kaydedildi: ${analysisId}`);

      // Eski analizleri temizle (son 10'u tut)
      const userAnalyses = await this.getUserAnalyses(userId);
      if (userAnalyses.length > 10) {
        const oldestAnalyses = userAnalyses
          .sort((a, b) => a.uploadedAt - b.uploadedAt)
          .slice(0, userAnalyses.length - 10);

        for (const oldAnalysis of oldestAnalyses) {
          await this.deleteAnalysis(userId, oldAnalysis.id);
        }
        
        console.log(`🗑️ ${oldestAnalyses.length} eski analiz temizlendi`);
      }

      return fullAnalysis;
      
    } catch (error) {
      console.error('❌ Kayıt hatası:', error);
      throw new Error('Analiz kaydedilemedi');
    }
  },

  async deleteAnalysis(userId: string, analysisId: string): Promise<void> {
    try {
      await remove(ref(database, `analyses/${analysisId}`));
      await remove(ref(database, `users/${userId}/analyses/${analysisId}`));
      console.log(`🗑️ Silindi: ${analysisId}`);
    } catch (error) {
      console.error('❌ Silme hatası:', error);
      throw new Error('Silinemedi');
    }
  },

  async getUserAnalyses(userId: string): Promise<CouponAnalysis[]> {
    try {
      const userAnalysesRef = ref(database, `users/${userId}/analyses`);
      const snapshot = await get(userAnalysesRef);

      if (!snapshot.exists()) return [];

      const analysisIds = Object.values(snapshot.val()) as string[];
      const analyses: CouponAnalysis[] = [];

      for (const id of analysisIds) {
        const analysisRef = ref(database, `analyses/${id}`);
        const analysisSnapshot = await get(analysisRef);
        
        if (analysisSnapshot.exists()) {
          analyses.push(analysisSnapshot.val());
        }
      }

      return analyses.sort((a, b) => b.uploadedAt - a.uploadedAt);
      
    } catch (error) {
      console.error('❌ Listeleme hatası:', error);
      return [];
    }
  },

  // ==================== UTILITY FUNCTIONS ====================

  async clearCache(matchId?: string): Promise<void> {
    try {
      if (matchId) {
        const cacheRef = ref(database, `match_cache/${matchId}`);
        await remove(cacheRef);
        console.log(`🗑️ Cache temizlendi: ${matchId}`);
      } else {
        const cacheRef = ref(database, 'match_cache');
        await remove(cacheRef);
        console.log('🗑️ Tüm cache temizlendi');
      }
    } catch (error) {
      console.error('❌ Cache hatası:', error);
      throw new Error('Cache temizlenemedi');
    }
  },

  async getSystemStats(): Promise<{
    totalAnalyses: number;
    totalMatches: number;
    cacheSize: number;
    averageConfidence: number;
  }> {
    try {
      const analysesRef = ref(database, 'analyses');
      const cacheRef = ref(database, 'match_cache');
      
      const [analysesSnap, cacheSnap] = await Promise.all([
        get(analysesRef),
        get(cacheRef),
      ]);

      const analyses = analysesSnap.exists() ? Object.values(analysesSnap.val()) : [];
      const cache = cacheSnap.exists() ? Object.values(cacheSnap.val()) : [];

      const totalMatches = analyses.reduce((sum: number, a: any) => 
        sum + (a.analysis?.matches?.length || 0), 0
      );

      const totalConfidence = analyses.reduce((sum: number, a: any) => 
        sum + (a.analysis?.confidence || 0), 0
      );

      return {
        totalAnalyses: analyses.length,
        totalMatches,
        cacheSize: cache.length,
        averageConfidence: analyses.length > 0 ? Math.round(totalConfidence / analyses.length) : 0,
      };
      
    } catch (error) {
      console.error('❌ İstatistik hatası:', error);
      return {
        totalAnalyses: 0,
        totalMatches: 0,
        cacheSize: 0,
        averageConfidence: 0,
      };
    }
  },
};
