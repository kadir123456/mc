import axios from 'axios';
import { DetectedMatch } from './geminiVisionService';
import { MatchData } from './googleSearchService';
import { extractJsonFromText, safeJsonParse } from '../utils/sanitizePath';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';

export interface PredictionDetail {
  odds: number;
  confidence: number;
  type?: string;
}

export interface MatchPredictions {
  ms1: PredictionDetail;
  ms2: PredictionDetail;
  beraberlik: PredictionDetail;
  ust25: PredictionDetail;
  alt25: PredictionDetail;
  kgg: PredictionDetail;
}

export interface AnalyzedMatch {
  matchId: string;
  league: string;
  teams: [string, string];
  predictions: MatchPredictions;
  reasoning: string;
  riskLevel: string;
  dataQuality: number;
}

export interface FinalAnalysis {
  finalCoupon: string[];
  matches: AnalyzedMatch[];
  overallConfidence: number;
  totalOdds: number;
  estimatedSuccess: number;
}

const ANALYSIS_PROMPT = (matches: Array<{ match: DetectedMatch; data: MatchData }>) => `Sen profesyonel futbol analiz uzmanısın. GERÇEK VERİLERE dayalı analiz yap.

AĞIRLIK SİSTEMİ:
- Son Form: %40
- Kafa Kafaya: %25
- Sakatlık/Kadro: %15
- Lig Sıralaması: %10
- İç/Dış Saha: %10

MAÇLAR VE VERİLER:
${matches.map((item, i) => `
MAÇ ${i + 1}: ${item.match.teamHome} vs ${item.match.teamAway}
Lig: ${item.match.league}
Ev Sahibi Form: ${item.data.homeForm}
Deplasman Form: ${item.data.awayForm}
Kafa Kafaya: ${item.data.h2h}
Sakatlıklar: ${item.data.injuries}
Lig Durumu: ${item.data.leaguePosition}
Veri Kaynakları: ${item.data.dataSources.length} kaynak
${item.match.odds ? `Oranlar: MS1: ${item.match.odds.ms1}, X: ${item.match.odds.beraberlik}, MS2: ${item.match.odds.ms2}` : ''}
`).join('\n')}

GÖREV:
1. Her maç için tahmin yap
2. Güven skoru 70+ olanları finalCoupon'a ekle
3. Risk seviyesi belirle
4. Gerekçeli analiz yap

ÇIKTI FORMATI:
{
  "finalCoupon": ["Takım - Tahmin", "Takım2 - Tahmin2"],
  "matches": [
    {
      "matchId": "id",
      "league": "Lig",
      "teams": ["Ev", "Deplasman"],
      "predictions": {
        "ms1": {"odds": 1.85, "confidence": 78},
        "ms2": {"odds": 2.20, "confidence": 55},
        "beraberlik": {"odds": 3.10, "confidence": 35},
        "ust25": {"odds": 1.92, "confidence": 70, "type": "Üst 2.5"},
        "alt25": {"odds": 1.88, "confidence": 65, "type": "Alt 2.5"},
        "kgg": {"odds": 1.95, "confidence": 60, "type": "KGG Var"}
      },
      "reasoning": "Analiz gerekçesi",
      "riskLevel": "Orta",
      "dataQuality": 85
    }
  ],
  "overallConfidence": 75,
  "totalOdds": 5.2,
  "estimatedSuccess": 72
}

KURALLAR:
1. Sadece gerçek verilere dayalı analiz yap
2. Veri yetersizse ("Veri toplanamadı" görüyorsan) güven skorunu 0-20 arası yap
3. "Veri toplanamadı" yazan maçları analiz etme, atlayabilirsin
4. Risk seviyesi: Düşük (70-79), Orta (80-89), Yüksek (90+)
5. SADECE JSON döndür!`;

export const geminiAnalysisService = {
  async analyzeMatches(
    matches: DetectedMatch[],
    matchDataList: MatchData[]
  ): Promise<FinalAnalysis> {
    console.log('🧠 Gemini Analysis: Final analiz başlıyor...');

    try {
      const combined = matches.map((match, i) => ({
        match,
        data: matchDataList[i],
      }));

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [{ text: ANALYSIS_PROMPT(combined) }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 8192,
          },
        },
        {
          timeout: 60000,
        }
      );

      const candidate = response.data.candidates?.[0];
      if (!candidate?.content?.parts?.[0]?.text) {
        throw new Error('Gemini Analysis yanıt vermedi');
      }

      const textContent = candidate.content.parts[0].text;
      console.log('📝 Gemini Analysis ham yanıt:', textContent.substring(0, 200));

      const jsonString = extractJsonFromText(textContent);
      if (!jsonString) {
        throw new Error('Analiz yanıtında JSON bulunamadı');
      }

      const defaultAnalysis: FinalAnalysis = {
        finalCoupon: [],
        matches: [],
        overallConfidence: 0,
        totalOdds: 0,
        estimatedSuccess: 0,
      };

      const analysis = safeJsonParse<FinalAnalysis>(jsonString, defaultAnalysis);

      console.log(`✅ Gemini Analysis: ${analysis.matches.length} maç analiz edildi`);
      console.log(`📊 Final kupon: ${analysis.finalCoupon.length} tahmin`);
      console.log(`🎯 Genel güven: ${analysis.overallConfidence}%`);

      return analysis;

    } catch (error: any) {
      console.error('❌ Gemini Analysis hatası:', error.message);
      throw new Error(`Final analiz başarısız: ${error.message}`);
    }
  },
};
