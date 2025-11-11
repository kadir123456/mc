import axios from 'axios';
import { CouponAnalysis } from '../types';
import { ref, set, get } from 'firebase/database';
import { database } from './firebase';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const analysisPrompt = `Görseldeki spor bahis kuponunu analiz et. İNTERNETTEN GERÇEK VERİLERİ ARAŞTIR!

ÖNEMLİ KURALLAR:
1. Her maç için internetten GERÇEK ZAMANLIDA veri araştır (Google Search kullan)
2. Takımların son maç sonuçlarını, formlarını, lig sıralamasını KONTROL ET
3. Sakatlık haberleri, kadro durumu, son transferleri ARAŞTIR
4. Karşılıklı maç geçmişini (H2H) KONTROL ET
5. ASLA RASTGELE TAHMİN YAPMA - sadece gerçek verilere dayalı analiz yap
6. Oranlara göre öneride bulunma - takımların gerçek performansına bak

GÖREV ADIMLARI:
1. Görseldeki maçları oku (takım adları, ligler, tarihler)
2. HER MAÇ İÇİN internetten şu bilgileri ara:
   - Takımların son 5 maç sonuçları (kazandı/kaybetti/berabere)
   - Güncel lig sıralamaları ve puan durumu
   - Sakatlık/ceza durumları (resmi takım haberleri)
   - Son karşılaşmaları (H2H istatistikleri)
   - İç saha/dış saha performansları
3. Toplanan gerçek verilere göre SADECE MANTIKLI TAHMİNLER yap
4. Sadece bahse değer maçları seç - şüpheli maçları ekleme

ÇIKTI FORMATI (JSON):
{
  "finalCoupon": [
    "Takım Adı - MS1",
    "Takım Adı - Üst 2.5",
    "Takım Adı - MS2",
    "Takım Adı - Alt 2.5",
    "Takım Adı - Karşılıklı Gol Var"
  ],
  "matches": [
    {
      "matchId": "1",
      "league": "gerçek lig adı",
      "teams": ["Ev Sahibi", "Deplasman"],
      "predictions": {
        "ms1": {"odds": 1.85, "confidence": 78},
        "ms2": {"odds": 2.20, "confidence": 55},
        "beraberlik": {"odds": 3.10, "confidence": 35},
        "ust25": {"odds": 1.92, "confidence": 70, "type": "Üst 2.5"},
        "alt25": {"odds": 1.88, "confidence": 65, "type": "Alt 2.5"},
        "kgg": {"odds": 1.95, "confidence": 60, "type": "Karşılıklı Gol Var"}
      },
      "realData": {
        "homeForm": "Son 5: G-G-B-G-K (3G 1B 1K)",
        "awayForm": "Son 5: K-K-B-G-K (1G 1B 3K)",
        "h2h": "Son 3 maç: 2-1, 0-0, 3-1 (Ev sahibi üstün)",
        "injuries": "Deplasman takımında 2 oyuncu eksik",
        "leaguePosition": "Ev sahibi 3. - Deplasman 12."
      }
    }
  ],
  "totalOdds": 8.50,
  "confidence": 75,
  "recommendations": [
    "Gerçek verilere göre mantıklı 3 maçlık kombine",
    "Toplam oran: 8.50 - Risk: Orta"
  ]
}

ÖNEMLİ:
- İnternetten araştırma yap, rastgele sonuç üretme!
- finalCoupon'da sadece bahse değer maçları listele
- Uzun açıklama yapma, sade ve net ol
- Sadece JSON döndür`;

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
