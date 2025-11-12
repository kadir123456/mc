import axios from 'axios';
import { extractJsonFromText, safeJsonParse } from '../utils/sanitizePath';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';

export interface DetectedMatch {
  matchId: string;
  teamHome: string;
  teamAway: string;
  league: string;
  date?: string;
  odds?: {
    ms1: string;
    beraberlik: string;
    ms2: string;
  };
}

const DETECTION_PROMPT = `Sen bir kupon görsel analiz uzmanısın. Görseldeki futbol bahis kuponunu analiz et.

GÖREV: Kupondaki TÜM maçları tespit et ve JSON formatında döndür.

ÇIKTI FORMATI:
{
  "matches": [
    {
      "matchId": "unique_id_1",
      "teamHome": "Takım Adı",
      "teamAway": "Rakip Takım",
      "league": "Lig/Turnuva Adı",
      "date": "2025-01-15" (opsiyonel),
      "odds": {
        "ms1": "1.85",
        "beraberlik": "3.20",
        "ms2": "4.50"
      }
    }
  ]
}

KURALLAR:
1. Takım isimlerini tam ve doğru yaz
2. Lig/turnuva ismini belirt
3. Oranları varsa ekle
4. SADECE JSON döndür, başka açıklama yapma!`;

export const geminiVisionService = {
  async detectMatches(base64Image: string): Promise<DetectedMatch[]> {
    console.log('👁️ Gemini Vision: Görsel analizi başlıyor...');

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [
                { text: DETECTION_PROMPT },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
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
            maxOutputTokens: 8192,
          },
        },
        {
          timeout: 45000,
        }
      );

      const candidate = response.data.candidates?.[0];
      if (!candidate?.content?.parts?.[0]?.text) {
        throw new Error('Gemini Vision yanıt vermedi');
      }

      const textContent = candidate.content.parts[0].text;
      console.log('📝 Gemini Vision ham yanıt:', textContent.substring(0, 200));

      const jsonString = extractJsonFromText(textContent);
      if (!jsonString) {
        throw new Error('Görsel analiz yanıtında JSON bulunamadı');
      }

      const parsed = safeJsonParse(jsonString, { matches: [] });
      const matches = parsed.matches || [];

      if (matches.length === 0) {
        throw new Error('Görselde maç tespit edilemedi');
      }

      console.log(`✅ Gemini Vision: ${matches.length} maç tespit edildi`);
      return matches;

    } catch (error: any) {
      console.error('❌ Gemini Vision hatası:', error.message);
      throw new Error(`Görsel analizi başarısız: ${error.message}`);
    }
  },
};
