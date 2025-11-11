import axios from 'axios';
import { CouponAnalysis } from '../types';
import { ref, set, get } from 'firebase/database';
import { database } from './firebase';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const analysisPrompt = `
Aşağıdaki spor kuponunun görselini analiz edin ve aşağıdaki JSON formatında detaylı bir analiz sunun:

KRİTERLER:
1. Her maç için aşağıdaki tahminleri yapın:
   - MS1 (Ev sahibi kazanır)
   - MS2 (Misafir kazanır)
   - Beraberlik
   - Alt/Üst
   - Handicap

2. Her tahmin için:
   - Oran (1.50 - 3.50 arası)
   - Güven oranı (0-100)

3. Etkileyen faktörler:
   - Takım formu (çok iyi/iyi/orta/kötü)
   - Yaralı oyuncular
   - Hava durumu
   - Başa baş karşılaştırmalar

4. Genel öneriler

ÇIKTI FORMATI:
{
  "matches": [
    {
      "matchId": "1",
      "league": "Süper Lig",
      "teams": ["Takım A", "Takım B"],
      "predictions": {
        "ms1": {"odds": 1.80, "confidence": 75},
        "ms2": {"odds": 2.10, "confidence": 60},
        "beraberlik": {"odds": 3.20, "confidence": 40},
        "altUst": {"odds": 1.90, "confidence": 65},
        "handicap": {"odds": 1.85, "confidence": 70}
      },
      "factors": {
        "teamForm": "iyi",
        "injuries": "önemli oyuncu yok",
        "weather": "uygun",
        "headToHead": "ev sahibi avantajlı"
      }
    }
  ],
  "totalOdds": 8.50,
  "confidence": 72,
  "recommendations": [
    "MS1 + Üst - Ev sahibi form başında",
    "Uygun oranlar için beklemeyin"
  ]
}

Lütfen JSON'u geçerli ve tam olarak bu formatta sunun.
`;

export const analysisService = {
  async analyzeImageWithGemini(base64Image: string): Promise<CouponAnalysis['analysis']> {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [
                {
                  text: analysisPrompt,
                },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        }
      );

      const content = response.data.candidates[0].content.parts[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Geçerli JSON yanıt alınamadı');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      return {
        matches: analysis.matches || [],
        totalOdds: analysis.totalOdds || 0,
        recommendations: analysis.recommendations || [],
        confidence: analysis.confidence || 0,
      };
    } catch (error) {
      console.error('Gemini API hatası:', error);
      throw error;
    }
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

    return fullAnalysis;
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
