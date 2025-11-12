import axios from 'axios';
import { ref, get, set } from 'firebase/database';
import { database } from './firebase';
import { DetectedMatch } from './geminiVisionService';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const CACHE_EXPIRY_HOURS = 24;
const MAX_RETRIES = 2;
const REQUEST_TIMEOUT = 60000;

export interface MatchData {
  matchId: string;
  teamHome: string;
  teamAway: string;
  league: string;
  homeForm: string;
  awayForm: string;
  h2h: string;
  injuries: string;
  leaguePosition: string;
  dataSources: string[];
  confidenceScore: number;
  lastUpdated: number;
}

const SEARCH_PROMPT = (match: DetectedMatch) => `Google Search kullanarak aşağıdaki maç için GERÇEK ZAMANLIDA veri topla:

MAÇ: ${match.teamHome} vs ${match.teamAway} (${match.league})

TOPLANACAK VERİLER:
1. Son 5 maç performansı (her iki takım için)
2. Karşılıklı son 5 maç sonucu
3. Sakatlık ve cezalı oyuncular
4. Güncel lig sıralaması

ÇIKTI FORMATI:
{
  "homeForm": "Son 5 maç özeti ve gol istatistikleri",
  "awayForm": "Son 5 maç özeti ve gol istatistikleri",
  "h2h": "Son karşılaşmalar ve skorlar",
  "injuries": "Sakatlık ve ceza durumu",
  "leaguePosition": "Lig sıralamaları",
  "confidenceScore": 85
}

KURALLAR:
1. MUTLAKA Google Search kullan
2. Gerçek verileri topla, tahmin yapma
3. Bulamazsan "Veri bulunamadı" yaz
4. SADECE JSON döndür!`;

export const googleSearchService = {
  async fetchMatchData(match: DetectedMatch, retryCount = 0): Promise<MatchData> {
    const cacheKey = `match_cache/${match.league}/${match.teamHome}_vs_${match.teamAway}`;

    try {
      const cacheRef = ref(database, cacheKey);
      const snapshot = await get(cacheRef);

      if (snapshot.exists()) {
        const cached = snapshot.val() as MatchData;
        const hoursSinceUpdate = (Date.now() - cached.lastUpdated) / (1000 * 60 * 60);

        if (hoursSinceUpdate < CACHE_EXPIRY_HOURS) {
          console.log(`✅ Cache HIT: ${match.teamHome} vs ${match.teamAway}`);
          return cached;
        }
      }

      console.log(`🌐 Google Search: ${match.teamHome} vs ${match.teamAway} için veri toplama... (Deneme: ${retryCount + 1}/${MAX_RETRIES + 1})`);

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [{ text: SEARCH_PROMPT(match) }],
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
          timeout: REQUEST_TIMEOUT,
        }
      );

      const candidate = response.data.candidates?.[0];
      if (!candidate) {
        throw new Error('Google Search yanıt vermedi');
      }

      let textContent = '';
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            textContent += part.text;
          }
        }
      }

      const groundingMetadata = candidate.groundingMetadata;
      const dataSources: string[] = [];

      if (groundingMetadata?.groundingChunks) {
        groundingMetadata.groundingChunks.forEach((chunk: any) => {
          if (chunk.web?.uri) {
            dataSources.push(chunk.web.uri);
          }
        });
      }

      if (!textContent) {
        throw new Error('Boş yanıt alındı');
      }

      const cleanedText = textContent
        .replace(/\[cite:\s*\d+\]/g, '')
        .replace(/```json\n?|```\n?/g, '')
        .trim();

      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON bulunamadı');
      }

      const data = JSON.parse(jsonMatch[0]);

      const matchData: MatchData = {
        matchId: match.matchId,
        teamHome: match.teamHome,
        teamAway: match.teamAway,
        league: match.league,
        homeForm: data.homeForm || 'Veri yok',
        awayForm: data.awayForm || 'Veri yok',
        h2h: data.h2h || 'Veri yok',
        injuries: data.injuries || 'Veri yok',
        leaguePosition: data.leaguePosition || 'Veri yok',
        dataSources: dataSources.length > 0 ? dataSources : ['Gemini 2.5 Flash'],
        confidenceScore: data.confidenceScore || 70,
        lastUpdated: Date.now(),
      };

      await set(cacheRef, matchData);
      console.log(`✅ Google Search: ${match.teamHome} vs ${match.teamAway} verileri toplandı`);

      return matchData;

    } catch (error: any) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');

      if (isTimeout && retryCount < MAX_RETRIES) {
        console.warn(`⏱️ Timeout: ${match.teamHome} vs ${match.teamAway} - Tekrar deneniyor...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.fetchMatchData(match, retryCount + 1);
      }

      console.error(`❌ Google Search hatası: ${match.teamHome} vs ${match.teamAway}`, error.message);

      return {
        matchId: match.matchId,
        teamHome: match.teamHome,
        teamAway: match.teamAway,
        league: match.league,
        homeForm: 'Veri toplanamadı (Timeout)',
        awayForm: 'Veri toplanamadı (Timeout)',
        h2h: 'Veri toplanamadı (Timeout)',
        injuries: 'Veri toplanamadı (Timeout)',
        leaguePosition: 'Veri toplanamadı (Timeout)',
        dataSources: [],
        confidenceScore: 0,
        lastUpdated: Date.now(),
      };
    }
  },

  async fetchAllMatches(matches: DetectedMatch[]): Promise<MatchData[]> {
    console.log(`🔄 Google Search: ${matches.length} maç için veri toplama başlıyor...`);

    const results = await Promise.all(
      matches.map(match => this.fetchMatchData(match))
    );

    console.log(`✅ Google Search: Tüm maçlar için veri toplama tamamlandı`);
    return results;
  },
};
