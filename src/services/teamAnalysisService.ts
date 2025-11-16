// src/services/teamAnalysisService.ts
import axios from 'axios';
import { TeamStatistics } from './teamStatsService';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash-exp';

export interface TeamAnalysisResult {
  msPredict: 'MS 1' | 'MS X' | 'MS 2';
  firstHalfPredict: 'İY 1' | 'İY X' | 'İY 2';
  bttsPredict: 'KG Var' | 'KG Yok';
  over25Predict: '2.5 Üst' | '2.5 Alt';
  technicalAnalysis: string;
  confidenceScore: number;
  reasoning: {
    msReasoning: string;
    firstHalfReasoning: string;
    bttsReasoning: string;
    over25Reasoning: string;
  };
  keyFactors: string[];
}

const TEAM_ANALYSIS_PROMPT = (stats: TeamStatistics, homeTeam: string, awayTeam: string): string => {
  return `Sen profesyonel bir futbol analistsin. Aşağıdaki GERÇEK takım verilerine dayalı analiz yap.

⚠️ KRİTİK KURALLAR:
1. SADECE verilen istatistiklere dayalı analiz yap
2. Rastgele tahmin yapma, matematiğe ve mantığa dayalı karar ver
3. Ev sahibi avantajını hesaba kat (+10-15% şans)
4. Form, puan durumu, kafa kafaya geçmişi değerlendir

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏟️ MAÇ: ${homeTeam} (Ev Sahibi) vs ${awayTeam} (Deplasman)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏠 EV SAHİBİ: ${stats.homeTeam.teamName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Puan Durumu: ${stats.homeTeam.position}. sıra (${stats.homeTeam.points} puan)
📈 Oynanan: ${stats.homeTeam.played} maç
✅ Galibiyet: ${stats.homeTeam.wins} (${((stats.homeTeam.wins / stats.homeTeam.played) * 100).toFixed(0)}%)
➖ Beraberlik: ${stats.homeTeam.draws}
❌ Mağlubiyet: ${stats.homeTeam.losses}
⚽ Attığı Gol: ${stats.homeTeam.goalsFor} (Maç başına: ${(stats.homeTeam.goalsFor / stats.homeTeam.played).toFixed(2)})
🥅 Yediği Gol: ${stats.homeTeam.goalsAgainst} (Maç başına: ${(stats.homeTeam.goalsAgainst / stats.homeTeam.played).toFixed(2)})
📊 Averaj: ${stats.homeTeam.goalDifference > 0 ? '+' : ''}${stats.homeTeam.goalDifference}
🔥 Son 5 Maç Formu: ${stats.homeTeam.form} (W=Galibiyet, D=Beraberlik, L=Mağlubiyet)

✈️ DEPLASMAN: ${stats.awayTeam.teamName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Puan Durumu: ${stats.awayTeam.position}. sıra (${stats.awayTeam.points} puan)
📈 Oynanan: ${stats.awayTeam.played} maç
✅ Galibiyet: ${stats.awayTeam.wins} (${((stats.awayTeam.wins / stats.awayTeam.played) * 100).toFixed(0)}%)
➖ Beraberlik: ${stats.awayTeam.draws}
❌ Mağlubiyet: ${stats.awayTeam.losses}
⚽ Attığı Gol: ${stats.awayTeam.goalsFor} (Maç başına: ${(stats.awayTeam.goalsFor / stats.awayTeam.played).toFixed(2)})
🥅 Yediği Gol: ${stats.awayTeam.goalsAgainst} (Maç başına: ${(stats.awayTeam.goalsAgainst / stats.awayTeam.played).toFixed(2)})
📊 Averaj: ${stats.awayTeam.goalDifference > 0 ? '+' : ''}${stats.awayTeam.goalDifference}
🔥 Son 5 Maç Formu: ${stats.awayTeam.form}

${stats.headToHead.totalMatches > 0 ? `
🔄 KAFA KAFAYA GEÇMİŞ (Son ${stats.headToHead.lastMatches.length} Maç)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Toplam: ${stats.headToHead.totalMatches} maç
🏠 ${homeTeam} Galibiyeti: ${stats.headToHead.homeWins} (${((stats.headToHead.homeWins / stats.headToHead.totalMatches) * 100).toFixed(0)}%)
✈️ ${awayTeam} Galibiyeti: ${stats.headToHead.awayWins} (${((stats.headToHead.awayWins / stats.headToHead.totalMatches) * 100).toFixed(0)}%)
➖ Beraberlik: ${stats.headToHead.draws}

Son Maçlar:
${stats.headToHead.lastMatches.map((m, i) => `${i + 1}. ${m.date} - ${m.homeTeam} ${m.score} ${m.awayTeam} (Kazanan: ${m.winner})`).join('\n')}
` : '⚠️ Kafa kafaya geçmiş bulunamadı'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GÖREV: Bu verilere dayanarak şu tahminleri yap:

1. MS TAHMİNİ: MS 1 / MS X / MS 2
2. İLK YARI: İY 1 / İY X / İY 2
3. KARŞILIKLI GOL: KG Var / KG Yok
4. 2.5 GOL: 2.5 Üst / 2.5 Alt
5. TEKNİK ANALİZ (3-4 cümle, VERİLERE DAYALI)
6. GÜVEN SKORU (0-100)

ANALİZ KRİTERLERİ:
- Form durumu (son 5 maç performansı)
- Puan durumu ve sıralama farkı
- Gol ortalamaları (atak gücü vs savunma)
- Averaj farkı (pozitif averaj = güçlü takım)
- Kafa kafaya geçmiş (varsa)
- Ev sahibi avantajı (+10-15% ev sahibine)
- Galibiyet oranları

ÖRNEKLER:
- Form "WWWWW" = Çok iyi, "LLLLL" = Çok kötü
- Puan farkı 20+ = Büyük güç farkı var
- Maç başına 2+ gol = Güçlü atak
- Maç başına 0.5> gol yeme = Güçlü savunma

ÇIKTI FORMATI (JSON):
{
  "msPredict": "MS 1",
  "firstHalfPredict": "İY X",
  "bttsPredict": "KG Var",
  "over25Predict": "2.5 Üst",
  "technicalAnalysis": "Ev sahibi son 5 maçta 4 galibiyet aldı ve puan durumunda 8. sırada. Deplasman takımı kötü formda (LLDLL) ve 15. sırada. Kafa kafaya geçmişte ev sahibi üstün. Ev sahibi favori.",
  "confidenceScore": 72,
  "reasoning": {
    "msReasoning": "Ev sahibi son 5 maçta 4 galibiyet, deplasman 5 maçta 1 galibiyet. Puan farkı 12. Ev sahibi avantajı.",
    "firstHalfReasoning": "Her iki takım da ilk yarılarda genellikle temkinli başlıyor. İlk yarı beraberlikle sonuçlanabilir.",
    "bttsReasoning": "Her iki takım da maç başına 1.5+ gol atıyor. Defanslar orta seviye. KG bekleniyor.",
    "over25Reasoning": "Ev sahibi maç başına 1.8 gol atıyor, deplasman 1.2 gol yiyor. Toplam 3+ gol bekleniyor."
  },
  "keyFactors": [
    "Ev sahibi mükemmel formda (4/5 galibiyet)",
    "Deplasman kötü formda ve 15. sırada",
    "Kafa kafaya geçmişte ev sahibi üstün",
    "Ev sahibi güçlü atak, deplasman zayıf savunma"
  ]
}

KRİTİK KURALLAR:
1. SADECE JSON formatında yanıt ver
2. Tüm tahminler verilen formatlardan biri olmalı
3. confidenceScore sayı olmalı (0-100)
4. reasoning ve keyFactors mutlaka dolu olmalı
5. technicalAnalysis VERİLERE DAYALI olmalı, rastgele tahmin değil`;
};

export const teamAnalysisService = {
  async analyzeTeamStats(stats: TeamStatistics, homeTeam: string, awayTeam: string): Promise<TeamAnalysisResult> {
    try {
      console.log('🧠 Takım analizi başlatılıyor...');

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{ text: TEAM_ANALYSIS_PROMPT(stats, homeTeam, awayTeam) }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 2048,
          }
        },
        { timeout: 30000 }
      );

      const content = response.data.candidates[0].content.parts[0].text;
      console.log('📥 Gemini yanıtı:', content);

      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Analiz sonucu oluşturulamadı');
      }

      const result: TeamAnalysisResult = JSON.parse(jsonMatch[0]);
      
      // Validasyon
      if (!result.msPredict || !result.firstHalfPredict || !result.bttsPredict) {
        throw new Error('Eksik tahmin verisi');
      }

      console.log('✅ Takım analizi tamamlandı:', result);

      return result;

    } catch (error: any) {
      console.error('❌ Analiz hatası:', error);
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit aşıldı. Lütfen birkaç saniye sonra tekrar deneyin.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Gemini API key geçersiz.');
      }

      throw new Error('AI analizi yapılamadı. Lütfen tekrar deneyin.');
    }
  }
};