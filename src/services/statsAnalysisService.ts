// src/services/statsAnalysisService.ts
import axios from 'axios';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash-exp';

export interface MatchStatistics {
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  time: string;
  homeShots?: number;
  awayShots?: number;
  homeShotsOnTarget?: number;
  awayShotsOnTarget?: number;
  homexG?: number;
  awayxG?: number;
  homePossession?: number;
  awayPossession?: number;
  homeBigChances?: number;
  awayBigChances?: number;
  homeCorners?: number;
  awayCorners?: number;
  homeFouls?: number;
  awayFouls?: number;
  homeYellowCards?: number;
  awayYellowCards?: number;
  homeTotalAttacks?: number;
  awayTotalAttacks?: number;
  homeDangerousAttacks?: number;
  awayDangerousAttacks?: number;
  homeForm?: string;
  awayForm?: string;
  homeWinsAtHome?: number;
  awayWinsAway?: number;
}

export interface StatisticalAnalysisResult {
  msPredict: 'MS 1' | 'MS X' | 'MS 2';
  firstHalfPredict: 'İY 1' | 'İY X' | 'İY 2';
  bttsPredict: 'KG Var' | 'KG Yok';
  technicalAnalysis: string;
  confidenceScore: number;
  reasoning: {
    msReasoning: string;
    firstHalfReasoning: string;
    bttsReasoning: string;
  };
}

const STATS_ANALYSIS_PROMPT = (stats: MatchStatistics): string => {
  const hasxG = stats.homexG !== undefined && stats.awayxG !== undefined;
  const hasShots = stats.homeShots !== undefined && stats.awayShots !== undefined;
  const hasPossession = stats.homePossession !== undefined && stats.awayPossession !== undefined;
  
  return `Sen profesyonel bir futbol istatistik analistsin. Aşağıdaki GERÇEK maç istatistiklerini analiz et.

⚠️ KRİTİK KURALLAR:
1. SADECE verilen istatistiklere dayalı analiz yap
2. Rastgele tahmin yapma, oranlardan etkilenme
3. Matematik ve mantığa dayalı karar ver
4. Eğer veri yetersizse bunu belirt ve güven skorunu düşür

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 MAÇ: ${stats.homeTeam} vs ${stats.awayTeam}
🏆 Lig: ${stats.league}
📅 Tarih: ${stats.date} ${stats.time}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${hasxG ? `🎯 EXPECTED GOALS (xG):
• ${stats.homeTeam}: ${stats.homexG?.toFixed(2)} xG
• ${stats.awayTeam}: ${stats.awayxG?.toFixed(2)} xG
• Fark: ${Math.abs((stats.homexG || 0) - (stats.awayxG || 0)).toFixed(2)} (${(stats.homexG || 0) > (stats.awayxG || 0) ? stats.homeTeam : stats.awayTeam} lehine)
` : '⚠️ xG verisi yok'}

${hasShots ? `⚽ ŞUTLAR:
• ${stats.homeTeam}: ${stats.homeShots} şut (${stats.homeShotsOnTarget} isabetli - %${stats.homeShots > 0 ? ((stats.homeShotsOnTarget || 0) / stats.homeShots * 100).toFixed(0) : 0} isabet)
• ${stats.awayTeam}: ${stats.awayShots} şut (${stats.awayShotsOnTarget} isabetli - %${stats.awayShots > 0 ? ((stats.awayShotsOnTarget || 0) / stats.awayShots * 100).toFixed(0) : 0} isabet)
` : '⚠️ Şut verisi yok'}

${hasPossession ? `📊 TOPA SAHİP OLMA:
• ${stats.homeTeam}: %${stats.homePossession}
• ${stats.awayTeam}: %${stats.awayPossession}
` : '⚠️ Topa sahip olma verisi yok'}

${stats.homeTotalAttacks && stats.awayTotalAttacks ? `🔥 ATAKLAR:
• ${stats.homeTeam}: ${stats.homeTotalAttacks} atak (${stats.homeDangerousAttacks} tehlikeli)
• ${stats.awayTeam}: ${stats.awayTotalAttacks} atak (${stats.awayDangerousAttacks} tehlikeli)
` : ''}

${stats.homeBigChances !== undefined && stats.awayBigChances !== undefined ? `🎯 BÜYÜK POZİSYONLAR:
• ${stats.homeTeam}: ${stats.homeBigChances}
• ${stats.awayTeam}: ${stats.awayBigChances}
` : ''}

${stats.homeCorners !== undefined && stats.awayCorners !== undefined ? `🚩 KORNERLER:
• ${stats.homeTeam}: ${stats.homeCorners}
• ${stats.awayTeam}: ${stats.awayCorners}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GÖREV: Bu istatistiklere dayanarak şu tahminleri yap:

1. MS TAHMİNİ: MS 1 / MS X / MS 2
2. İLK YARI: İY 1 / İY X / İY 2
3. KARŞILIKLI GOL: KG Var / KG Yok
4. TEKNİK ANALİZ (2-3 cümle, İSTATİSTİKLERE DAYALI)
5. GÜVEN SKORU (0-100)

ANALİZ KRİTERLERİ:
${hasxG ? '- xG farkı (0.5+ fark önemli üstünlük)' : ''}
${hasShots ? '- Şut kalitesi (isabet oranı %40+ iyi)' : ''}
${hasPossession ? '- Topa sahip olma farkı (%10+ fark dominasyon)' : ''}
- Büyük pozisyon sayısı (3+ tehlikeli)
- Tehlikeli atak oranı
- Ev sahibi avantajı (+10-15% şans)

ÇIKTI FORMATI (JSON):
{
  "msPredict": "MS 1",
  "firstHalfPredict": "İY X",
  "bttsPredict": "KG Var",
  "technicalAnalysis": "Ev sahibi xG üstünlüğü (1.8 vs 0.9) ve %45 şut isabeti ile favori. Her iki takım da 3+ büyük pozisyon üretti, KG Var olasılığı yüksek.",
  "confidenceScore": 75,
  "reasoning": {
    "msReasoning": "Ev sahibi 1.8 xG ile 0.9 xG'ye karşı açık üstünlük, şut isabeti %45 vs %28",
    "firstHalfReasoning": "İlk yarı genellikle dengeliyor, tehlikeli atak sayıları benzer (15 vs 13)",
    "bttsReasoning": "Her iki takım da 3+ büyük pozisyon üretti, defanslar zayıf görünüyor"
  }
}

KRİTİK KURALLAR:
1. SADECE JSON formatında yanıt ver, başka metin ekleme
2. msPredict sadece "MS 1", "MS X" veya "MS 2" olabilir
3. firstHalfPredict sadece "İY 1", "İY X" veya "İY 2" olabilir
4. bttsPredict sadece "KG Var" veya "KG Yok" olabilir
5. confidenceScore sayı olmalı (0-100 arası)
6. reasoning'de her alan mutlaka dolu olmalı
7. technicalAnalysis 2-3 cümle olmalı ve VERİLERE DAYALI olmalı`;
};

export const statsAnalysisService = {
  async analyzeMatchStats(stats: MatchStatistics): Promise<StatisticalAnalysisResult> {
    try {
      console.log('🧠 İstatistik analizi başlatılıyor...');

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{ text: STATS_ANALYSIS_PROMPT(stats) }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 1024,
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

      const result: StatisticalAnalysisResult = JSON.parse(jsonMatch[0]);
      
      // Validasyon
      if (!result.msPredict || !result.firstHalfPredict || !result.bttsPredict) {
        throw new Error('Eksik tahmin verisi');
      }

      console.log('✅ İstatistik analizi tamamlandı:', result);

      return result;

    } catch (error: any) {
      console.error('❌ Analiz hatası:', error);
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit aşıldı. Lütfen birkaç saniye sonra tekrar deneyin.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('Gemini API key geçersiz. Lütfen .env dosyasını kontrol edin.');
      }

      throw new Error('AI analizi yapılamadı. Lütfen tekrar deneyin.');
    }
  }
};