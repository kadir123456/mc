import axios from 'axios';
import { CouponAnalysis } from '../types';
import { ref, set, get } from 'firebase/database';
import { database } from './firebase';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const analysisPrompt = `Bu spor bahis kuponunu detaylı analiz et:

GÖREV:
1. Görseldeki TÜM maçları oku (takım isimleri, ligler, tarihler)
2. Her maç için profesyonel analiz yap
3. Takım formlarını, son maçları, istatistikleri değerlendir
4. Bahis tahminleri oluştur (MS1, MS2, Beraberlik, Alt/Üst, Handicap)
5. Gerçekçi oranlar ve güven skorları ver
6. Kullanıcıya stratejik öneriler sun

ANALİZ KRİTERLERİ:
- Takım güncel formu (son 5 maç)
- Sakatlık/ceza durumları
- İç saha/dış saha performansı
- Takımlar arası geçmiş karşılaşmalar
- Lig durumu ve motivasyon
- İstatistiksel veriler

ÇIKTI FORMATI (JSON):
{
  "matches": [
    {
      "matchId": "1",
      "league": "gerçek lig adı",
      "teams": ["Ev Sahibi Takım", "Deplasman Takımı"],
      "predictions": {
        "ms1": {"odds": 1.85, "confidence": 78},
        "ms2": {"odds": 2.20, "confidence": 55},
        "beraberlik": {"odds": 3.10, "confidence": 35},
        "altUst": {"odds": 1.92, "confidence": 70},
        "handicap": {"odds": 1.88, "confidence": 65}
      },
      "factors": {
        "teamForm": "ev sahibi son 3 maçta galip",
        "injuries": "deplasman takımında 2 önemli eksik",
        "weather": "normal koşullar",
        "headToHead": "son 5 maçın 3'ünü ev sahibi kazandı"
      }
    }
  ],
  "totalOdds": 12.45,
  "confidence": 68,
  "recommendations": [
    "Ev sahibi takımlar form üstünde, MS1 kombinasyonu mantıklı",
    "3. maçta beraberlik ihtimali yüksek, dikkatli ol",
    "Toplam oran 12.45, orta riskli bir kupon"
  ]
}

ÖNEMLİ: Sadece JSON döndür, ekstra açıklama yapma.`;

export const analysisService = {
  async analyzeImageWithGemini(base64Image: string): Promise<CouponAnalysis['analysis']> {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
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
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 2048,
          },
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
