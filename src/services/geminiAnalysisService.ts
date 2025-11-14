import axios from 'axios';
import { MatchSelection } from './matchService';
import { MatchAnalysis } from './couponService';
import sportsradarService from './sportsradarService';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

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
      console.log('🔍 API\'den gerçek maç verileri çekiliyor...');

      const matchDataPromises = matches.map(match =>
        sportsradarService.getMatchData(match.homeTeam, match.awayTeam, match.league)
          .catch(err => {
            console.error(`⚠️ ${match.homeTeam} vs ${match.awayTeam} verisi alınamadı:`, err.message);
            return null;
          })
      );

      const matchesData = await Promise.all(matchDataPromises);
      console.log('✅ API verileri alındı!');

      const prompt = this.buildAnalysisPrompt(matches, matchesData, detailedAnalysis);

      const response = await axios.post(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
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

  buildAnalysisPrompt(matches: MatchSelection[], matchesData: any[], detailed: boolean): string {
    const matchList = matches.map((m, i) => {
      const data = matchesData[i];
      let info = `${i + 1}. ${m.homeTeam} vs ${m.awayTeam}`;

      if (data && data.homeForm && data.homeForm !== 'Veri yok') {
        info += ` | Ev Form: ${data.homeForm.split('|')[0]} | Dep Form: ${data.awayForm.split('|')[0]}`;
      }

      return info;
    }).join('\n');

    return `Futbol maç analizi yap. Her maç için tahmin ver (JSON formatında):

MAÇLAR:
${matchList}

JSON çıktı formatı:
{
  "match1": {
    "ms1": "40",
    "msX": "30",
    "ms2": "30",
    "over25": "60",
    "under25": "40",
    "btts": "50",
    ${detailed ? '"firstHalfMs1": "35", "firstHalfMsX": "35", "firstHalfMs2": "30",' : ''}
    "recommendation": "2.5 Üst",
    "confidence": 70
  }
}

Kurallar:
- MS1+MSX+MS2 = 100
- over25+under25 = 100
- Sadece JSON döndür
- Form verisi varsa kullan
- Ev sahibi avantajı ver`;
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
