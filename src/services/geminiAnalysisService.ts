import axios from 'axios';
import { MatchSelection } from './matchService';
import { MatchAnalysis } from './couponService';
import sportsradarService from './sportsradarService';

// ✅ Backend proxy kullanılacak (CORS sorununu çözer)
const GEMINI_PROXY_URL = '/api/gemini/analyze';
console.log('🔧 Gemini Proxy URL:', GEMINI_PROXY_URL);

interface MatchData {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  time: string;
}

export const geminiAnalysisService = {
  async analyzeMatches(
    matches: MatchSelection[],
    detailedAnalysis: boolean = false
  ): Promise<MatchAnalysis[]> {
    try {
      console.log('🔍 Gemini AI analizi başlatılıyor...');

      // Sportsradar API devre dışı (API key yok)
      // Football API'den zaten maç bilgileri var
      const matchesData = matches.map(() => null);

      const prompt = this.buildAnalysisPrompt(matches, matchesData, detailedAnalysis);

      // ✅ Backend proxy üzerinden istek (CORS sorunu yok)
      const response = await axios.post(
        GEMINI_PROXY_URL,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 20,
            topP: 0.9,
            maxOutputTokens: 3072,
          },
          tools: [{
            googleSearchRetrieval: {
              dynamicRetrievalConfig: {
                mode: "MODE_DYNAMIC",
                dynamicThreshold: 0.3
              }
            }
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 45000
        }
      );

      const analysisText = response.data.candidates[0].content.parts[0].text;
      return this.parseAnalysisResponse(analysisText, matches);

    } catch (error: any) {
      console.error('Gemini API error:', error.response?.data || error.message);
      throw new Error('Analiz yapılamadı. Lütfen daha sonra tekrar deneyin.');
    }
  },

  buildAnalysisPrompt(matches: MatchSelection[], matchesData: any[], detailed: boolean): string {
    const matchList = matches.map((m, i) => {
      let info = `${i + 1}. ${m.homeTeam} vs ${m.awayTeam}`;
      info += `\n   📍 Lig: ${m.league}`;
      info += `\n   📅 Tarih/Saat: ${m.date} ${m.time}`;
      return info;
    }).join('\n\n');

    const analysisType = detailed ? 'DETAYLI' : 'STANDART';

    return `Sen profesyonel bir futbol analisti ve istatistik uzmanısın. Aşağıdaki ${matches.length} maç için ${analysisType} analiz yap.

🎯 GOOGLE SEARCH KULLAN: Her maç için güncel bilgileri (form, sakatlıklar, haberler, kafa kafaya sonuçlar) Google Search ile araştır.

MAÇLAR:
${matchList}

GÖREV:
Google Search ile güncel verileri araştırarak her maç için şu tahminleri yüzde olarak ver:
1. MS1 (Ev sahibi kazanır): %X
2. MSX (Beraberlik): %X
3. MS2 (Deplasman kazanır): %X
4. 2.5 ÜST (Toplam gol 3+): %X
5. 2.5 ALT (Toplam gol 0-2): %X
6. KG VAR (Karşılıklı gol): %X
${detailed ? `7. İLK YARI MS1 (Ev sahibi ilk yarı önde): %X
8. İLK YARI MSX (İlk yarı beraberlik): %X
9. İLK YARI MS2 (Deplasman ilk yarı önde): %X` : ''}

ANALİZ KRİTERLERİ:
- Yukarıdaki API verilerini kullan (form, H2H, puan durumu)
- Takım formunu dikkate al (G=Galibiyet, B=Beraberlik, M=Mağlubiyet)
- Attıkları ve yedikleri gol sayısını değerlendir
- Puan durumunu ve sıralamayı hesaba kat
- H2H geçmişini önemse
- Google Search ile güncel takım haberlerini kontrol et
- Ev sahibi avantajını (genelde +10-15% şans) dahil et

ÇIKTI FORMATI (JSON):
Her maç için şu yapıda JSON döndür:

{
  "match1": {
    "ms1": "45",
    "msX": "25",
    "ms2": "30",
    "over25": "65",
    "under25": "35",
    "btts": "55",
    ${detailed ? '"firstHalfMs1": "40", "firstHalfMsX": "35", "firstHalfMs2": "25",' : ''}
    "recommendation": "2.5 Üst + MS1",
    "confidence": 75
  },
  ...
}

KRITIK KURALLAR:
1. SADECE JSON formatında yanıt ver, açıklama ekleme
2. MS1+MSX+MS2 = 100 olmalı
3. over25+under25 = 100 olmalı
4. Confidence'ı API güven skoruna göre ayarla
5. Recommendation'ı en yüksek ihtimalli seçeneklere göre yap
6. AYNI MAÇ HER SEFERINDE AYNI SONUCU VERMELİ (tutarlılık)
7. Gerçek verilere dayalı objektif analiz yap`;
  },

  parseAnalysisResponse(text: string, matches: MatchSelection[]): MatchAnalysis[] {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON bulunamadı');
      }

      const data = JSON.parse(jsonMatch[0]);
      const analyses: MatchAnalysis[] = [];

      matches.forEach((match, index) => {
        const key = `match${index + 1}`;
        const matchData = data[key];

        if (matchData) {
          analyses.push({
            fixtureId: match.fixtureId,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            league: match.league,
            date: match.date,
            time: match.time,
            predictions: {
              ms1: matchData.ms1 || '33',
              msX: matchData.msX || '33',
              ms2: matchData.ms2 || '34',
              over25: matchData.over25 || '50',
              under25: matchData.under25 || '50',
              btts: matchData.btts || '50',
              firstHalfMs1: matchData.firstHalfMs1 || '33',
              firstHalfMsX: matchData.firstHalfMsX || '34',
              firstHalfMs2: matchData.firstHalfMs2 || '33'
            },
            recommendation: matchData.recommendation || 'Analiz edildi',
            confidence: parseInt(matchData.confidence) || 50
          });
        }
      });

      return analyses;

    } catch (error) {
      console.error('Parse error:', error);

      return matches.map(match => ({
        fixtureId: match.fixtureId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        league: match.league,
        date: match.date,
        time: match.time,
        predictions: {
          ms1: '33',
          msX: '33',
          ms2: '34',
          over25: '50',
          under25: '50',
          btts: '50',
          firstHalfMs1: '33',
          firstHalfMsX: '34',
          firstHalfMs2: '33'
        },
        recommendation: 'Analiz yapılıyor...',
        confidence: 50
      }));
    }
  }
};
