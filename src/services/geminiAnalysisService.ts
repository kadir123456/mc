import axios from 'axios';
import { MatchSelection } from './matchService';
import { MatchAnalysis } from './couponService';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

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
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key yapılandırılmamış');
    }

    try {
      const prompt = this.buildAnalysisPrompt(matches, detailedAnalysis);

      const response = await axios.post(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const analysisText = response.data.candidates[0].content.parts[0].text;
      return this.parseAnalysisResponse(analysisText, matches);

    } catch (error: any) {
      console.error('Gemini API error:', error.response?.data || error.message);
      throw new Error('Analiz yapılamadı. Lütfen daha sonra tekrar deneyin.');
    }
  },

  buildAnalysisPrompt(matches: MatchSelection[], detailed: boolean): string {
    const matchList = matches.map((m, i) =>
      `${i + 1}. ${m.homeTeam} vs ${m.awayTeam} (${m.league}) - ${m.date} ${m.time}`
    ).join('\n');

    const analysisType = detailed ? 'DETAYLI' : 'STANDART';

    return `Sen profesyonel bir futbol analisti ve istatistik uzmanısın. Aşağıdaki ${matches.length} maç için ${analysisType} analiz yap.

MAÇLAR:
${matchList}

GÖREV:
Her maç için şu tahminleri yüzde olarak ver:
1. MS1 (Ev sahibi kazanır): %X
2. MSX (Beraberlik): %X
3. MS2 (Deplasman kazanır): %X
4. 2.5 ÜST (Toplam gol 3+): %X
5. 2.5 ALT (Toplam gol 0-2): %X
6. KG VAR (Karşılıklı gol): %X
${detailed ? `7. İLK YARI MS1 (Ev sahibi ilk yarı önde): %X
8. İLK YARI MSX (İlk yarı beraberlik): %X
9. İLK YARI MS2 (Deplasman ilk yarı önde): %X` : ''}

${detailed ? 'DETAYLI ANALİZ:' : 'KISA ANALİZ:'}
- Takım formu ve son performans
- Kafa kafaya istatistikler
- Ev sahibi/deplasman avantajı
- Önemli eksikler/sakatlıklar (tahminler)
- Lig durumu ve motivasyon

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

ÖNEMLİ:
- Sadece JSON formatında yanıt ver, başka metin ekleme
- Yüzdeleri realistic tut (MS1+MSX+MS2 = 100)
- Güven skoru (confidence) 0-100 arası
- Recommendation kısa ve net olsun
- Gerçekçi futbol analizi yap, rastgele değil`;
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
