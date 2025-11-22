// src/services/geminiAnalysisService.ts - TAM YENİLENMİŞ VERSİYON

import axios from 'axios';
import { MatchSelection } from './matchService';
import { MatchAnalysis } from './couponService';
import sportsradarService from './sportsradarService';

const GEMINI_PROXY_URL = '/api/gemini/analyze';

interface DetailedMatchData {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  
  // Form bilgisi
  homeForm: string; // "GGBGG" formatında
  awayForm: string;
  homeFormScore: number; // 0-100
  awayFormScore: number;
  
  // Gol istatistikleri
  homeGoalsFor: number; // Attığı gol ortalaması
  homeGoalsAgainst: number;
  awayGoalsFor: number;
  awayGoalsAgainst: number;
  
  // Lig durumu
  homePosition: number; // Sıralama
  awayPosition: number;
  homePoints: number;
  awayPoints: number;
  
  // Kafa kafaya
  h2hHomeWins: number;
  h2hDraws: number;
  h2hAwayWins: number;
  h2hTotalGoals: number;
  h2hAverageGoals: number;
  
  // Sakatlıklar
  homeInjuries: string[];
  awayInjuries: string[];
  
  // Güven skoru
  dataConfidence: number; // 0-100
}

export const geminiAnalysisService = {
  async analyzeMatches(
    matches: MatchSelection[],
    detailedAnalysis: boolean = false
  ): Promise<MatchAnalysis[]> {
    try {
      console.log('🔍 Gelişmiş Gemini AI analizi başlatılıyor...');
      
      // 1. ADIM: Her maç için detaylı veri topla
      const matchesWithData = await this.collectDetailedMatchData(matches);
      
      // 2. ADIM: Gelişmiş prompt ile Gemini'ye gönder
      const prompt = this.buildAdvancedAnalysisPrompt(matchesWithData, detailedAnalysis);
      
      // 3. ADIM: Backend proxy üzerinden analiz yap
      const response = await axios.post(
        GEMINI_PROXY_URL,
        {
          userId: (window as any).currentUserId || null,
          creditsToDeduct: detailedAnalysis ? 5 : 1,
          matches: matches.map(m => ({
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            league: m.league,
            homeTeamId: m.homeTeamId || null,
            awayTeamId: m.awayTeamId || null,
            leagueId: m.leagueId || null,
            fixtureId: m.fixtureId || null
          })),
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1, // Düşük = daha tutarlı
            topK: 10,
            topP: 0.8,
            maxOutputTokens: 4096,
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 90000 // 90 saniye
        }
      );

      const analysisText = response.data.candidates[0].content.parts[0].text;
      return this.parseAdvancedAnalysisResponse(analysisText, matchesWithData);

    } catch (error: any) {
      console.error('❌ Analiz hatası:', error.response?.data || error.message);
      throw new Error('Analiz yapılamadı. Lütfen daha sonra tekrar deneyin.');
    }
  },

  // Detaylı maç verisi topla
  async collectDetailedMatchData(matches: MatchSelection[]): Promise<DetailedMatchData[]> {
    const detailedMatches: DetailedMatchData[] = [];
    
    for (const match of matches) {
      try {
        console.log(`📊 Detaylı veri toplama: ${match.homeTeam} vs ${match.awayTeam}`);
        
        // API-Football'dan gerçek veri çek
        const apiData = await sportsradarService.getMatchData(
          match.homeTeam,
          match.awayTeam,
          match.league
        );
        
        if (apiData && apiData.confidenceScore >= 40) {
          // Form skorunu hesapla (GGBGM formatından)
          const homeFormScore = this.calculateFormScore(apiData.homeForm);
          const awayFormScore = this.calculateFormScore(apiData.awayForm);
          
          // H2H verilerini parse et
          const h2hData = this.parseH2HData(apiData.h2h);
          
          // Lig pozisyonunu parse et
          const positionData = this.parseLeaguePosition(apiData.leaguePosition);
          
          detailedMatches.push({
            fixtureId: match.fixtureId,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            league: match.league,
            
            homeForm: apiData.homeForm,
            awayForm: apiData.awayForm,
            homeFormScore,
            awayFormScore,
            
            homeGoalsFor: this.extractGoalsFor(apiData.homeForm),
            homeGoalsAgainst: this.extractGoalsAgainst(apiData.homeForm),
            awayGoalsFor: this.extractGoalsFor(apiData.awayForm),
            awayGoalsAgainst: this.extractGoalsAgainst(apiData.awayForm),
            
            homePosition: positionData.homePosition,
            awayPosition: positionData.awayPosition,
            homePoints: positionData.homePoints,
            awayPoints: positionData.awayPoints,
            
            h2hHomeWins: h2hData.homeWins,
            h2hDraws: h2hData.draws,
            h2hAwayWins: h2hData.awayWins,
            h2hTotalGoals: h2hData.totalGoals,
            h2hAverageGoals: h2hData.averageGoals,
            
            homeInjuries: this.parseInjuries(apiData.injuries, 'home'),
            awayInjuries: this.parseInjuries(apiData.injuries, 'away'),
            
            dataConfidence: apiData.confidenceScore
          });
        } else {
          // Veri yoksa minimal bilgi ile devam et
          console.warn(`⚠️ ${match.homeTeam} vs ${match.awayTeam} için yeterli veri yok`);
          detailedMatches.push(this.createMinimalMatchData(match));
        }
        
      } catch (error) {
        console.error(`❌ ${match.homeTeam} vs ${match.awayTeam} veri hatası:`, error);
        detailedMatches.push(this.createMinimalMatchData(match));
      }
    }
    
    return detailedMatches;
  },

  // Form skorunu hesapla (GGBGM → 70 puan gibi)
  calculateFormScore(formString: string): number {
    if (!formString || formString === 'Veri yok') return 50;
    
    // "Son 5: G-B-G-M-G (3G 1B 1M)" formatından G/B/M'leri çıkar
    const matches = formString.match(/(\d+)G\s+(\d+)B\s+(\d+)M/);
    if (!matches) return 50;
    
    const wins = parseInt(matches[1]);
    const draws = parseInt(matches[2]);
    const losses = parseInt(matches[3]);
    const total = wins + draws + losses;
    
    if (total === 0) return 50;
    
    // Puan: Galibiyet=3, Beraberlik=1, Mağlubiyet=0
    const points = (wins * 3) + (draws * 1);
    const maxPoints = total * 3;
    
    return Math.round((points / maxPoints) * 100);
  },

  // H2H verisini parse et
  parseH2HData(h2hString: string): {
    homeWins: number;
    draws: number;
    awayWins: number;
    totalGoals: number;
    averageGoals: number;
  } {
    if (!h2hString || h2hString === 'H2H verisi yok') {
      return { homeWins: 0, draws: 0, awayWins: 0, totalGoals: 0, averageGoals: 0 };
    }
    
    // "Son 5: 2-1, 1-1, 3-0, 0-2, 1-1 (Ev sahibi 2 galibiyet)"
    const winsMatch = h2hString.match(/Ev sahibi (\d+) galibiyet/);
    const homeWins = winsMatch ? parseInt(winsMatch[1]) : 0;
    
    const scoresMatch = h2hString.match(/\d+-\d+/g);
    if (!scoresMatch) {
      return { homeWins, draws: 0, awayWins: 0, totalGoals: 0, averageGoals: 0 };
    }
    
    let totalGoals = 0;
    let draws = 0;
    let awayWins = 0;
    
    scoresMatch.forEach(score => {
      const [home, away] = score.split('-').map(Number);
      totalGoals += home + away;
      if (home === away) draws++;
      else if (away > home) awayWins++;
    });
    
    const averageGoals = totalGoals / scoresMatch.length;
    
    return { homeWins, draws, awayWins, totalGoals, averageGoals: parseFloat(averageGoals.toFixed(2)) };
  },

  // Lig pozisyonunu parse et
  parseLeaguePosition(positionString: string): {
    homePosition: number;
    awayPosition: number;
    homePoints: number;
    awayPoints: number;
  } {
    if (!positionString || positionString === 'Puan durumu yok') {
      return { homePosition: 0, awayPosition: 0, homePoints: 0, awayPoints: 0 };
    }
    
    // "Ev: 3. sıra (45 puan) | Deplasman: 7. sıra (38 puan)"
    const homeMatch = positionString.match(/Ev:\s*(\d+)\.\s*sıra\s*\((\d+)\s*puan\)/);
    const awayMatch = positionString.match(/Deplasman:\s*(\d+)\.\s*sıra\s*\((\d+)\s*puan\)/);
    
    return {
      homePosition: homeMatch ? parseInt(homeMatch[1]) : 0,
      homePoints: homeMatch ? parseInt(homeMatch[2]) : 0,
      awayPosition: awayMatch ? parseInt(awayMatch[1]) : 0,
      awayPoints: awayMatch ? parseInt(awayMatch[2]) : 0
    };
  },

  // Gol istatistiklerini çıkar
  extractGoalsFor(formString: string): number {
    // "Son 5: G-B-G-M-G (3G 1B 1M) | 12 attı, 5 yedi"
    const match = formString.match(/(\d+)\s*attı/);
    return match ? parseInt(match[1]) : 0;
  },

  extractGoalsAgainst(formString: string): number {
    const match = formString.match(/(\d+)\s*yedi/);
    return match ? parseInt(match[1]) : 0;
  },

  // Sakatlıkları parse et
  parseInjuries(injuryString: string, team: 'home' | 'away'): string[] {
    if (!injuryString || injuryString === 'Sakatlık verisi opsiyonel') {
      return [];
    }
    // Şimdilik boş dön, gelecekte API'den çekilebilir
    return [];
  },

  // Minimal veri oluştur (API verisi yoksa)
  createMinimalMatchData(match: MatchSelection): DetailedMatchData {
    return {
      fixtureId: match.fixtureId,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league,
      homeForm: 'Veri yok',
      awayForm: 'Veri yok',
      homeFormScore: 50,
      awayFormScore: 50,
      homeGoalsFor: 0,
      homeGoalsAgainst: 0,
      awayGoalsFor: 0,
      awayGoalsAgainst: 0,
      homePosition: 0,
      awayPosition: 0,
      homePoints: 0,
      awayPoints: 0,
      h2hHomeWins: 0,
      h2hDraws: 0,
      h2hAwayWins: 0,
      h2hTotalGoals: 0,
      h2hAverageGoals: 0,
      homeInjuries: [],
      awayInjuries: [],
      dataConfidence: 30
    };
  },

  // GELİŞMİŞ ANALİZ PROMPTU
  buildAdvancedAnalysisPrompt(matches: DetailedMatchData[], detailed: boolean): string {
    const analysisType = detailed ? 'DETAYLI' : 'STANDART';
    
    let prompt = `Sen PROFESYONEL bir futbol analisti ve istatistik uzmanısın. ${matches.length} maç için ${analysisType} analiz yapacaksın.

🎯 GÖREVİN: Her maç için GERÇEKÇİ ve VERİYE DAYALI tahmin yap. RASTGELE SONUÇ VERME!

📊 ANALİZ KRİTERLERİ (AĞIRLIK SİSTEMİ):
1. FORM ANALİZİ (%35): Son maçlardaki performans
2. KAFA KAFAYA GEÇMİŞ (%20): İki takımın geçmiş karşılaşmaları
3. LİG DURUMU (%20): Puan tablosundaki konum
4. GOL İSTATİSTİKLERİ (%15): Attığı/yediği gol ortalaması
5. EV SAHİBİ AVANTAJI (%10): İç saha faktörü

⚠️ KRİTİK KURALLAR:
- Her tahminin %100 MANTIKLI SEBEBİ olmalı
- Güven skoru GERÇEK VERİYE DAYANMALI (düşük veri = düşük güven)
- MS1+MSX+MS2 = 100 olmalı (matematiksel tutarlılık)
- Form kötüyse MS1 düşük, form iyiyse MS1 yüksek olmalı
- H2H'de ev sahibi sürekli kazanıyorsa MS1 yüksek olmalı
- Gol ortalaması yüksekse 2.5 Üst, düşükse 2.5 Alt öner

📋 MAÇLAR VE VERİLER:
`;

    matches.forEach((match, index) => {
      prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MAÇ ${index + 1}: ${match.homeTeam} vs ${match.awayTeam}
Lig: ${match.league}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 FORM ANALİZİ:
• Ev Sahibi Form: ${match.homeForm} (Skor: ${match.homeFormScore}/100)
• Deplasman Form: ${match.awayForm} (Skor: ${match.awayFormScore}/100)
${match.homeFormScore > match.awayFormScore + 15 ? '  → Ev sahibi formda çok daha iyi! MS1 yüksek olmalı.' : ''}
${match.awayFormScore > match.homeFormScore + 15 ? '  → Deplasman formda çok daha iyi! MS2 yüksek olmalı.' : ''}
${Math.abs(match.homeFormScore - match.awayFormScore) < 10 ? '  → Formlar dengeli, beraberlik veya çekişmeli maç beklenir.' : ''}

⚽ GOL İSTATİSTİKLERİ:
• Ev Sahibi: ${match.homeGoalsFor} gol attı, ${match.homeGoalsAgainst} gol yedi (Son 5 maç)
• Deplasman: ${match.awayGoalsFor} gol attı, ${match.awayGoalsAgainst} gol yedi
• Maç başına ortalama: ${((match.homeGoalsFor + match.awayGoalsFor) / 10).toFixed(1)} gol
${((match.homeGoalsFor + match.awayGoalsFor) / 10) > 2.5 ? '  → Yüksek gol ortalaması! 2.5 Üst tercih edilmeli.' : '  → Düşük gol ortalaması, 2.5 Alt tercih edilmeli.'}

🏆 LİG DURUMU:
• Ev Sahibi: ${match.homePosition > 0 ? `${match.homePosition}. sıra (${match.homePoints} puan)` : 'Bilinmiyor'}
• Deplasman: ${match.awayPosition > 0 ? `${match.awayPosition}. sıra (${match.awayPoints} puan)` : 'Bilinmiyor'}
${match.homePosition > 0 && match.awayPosition > 0 && match.homePosition < match.awayPosition - 3 ? '  → Ev sahibi ligde çok daha iyi durumda! MS1 avantajlı.' : ''}

⚔️ KAFA KAFAYA (H2H):
${match.h2hHomeWins > 0 || match.h2hDraws > 0 || match.h2hAwayWins > 0 ? `• Son karşılaşmalar: Ev ${match.h2hHomeWins} - Beraberlik ${match.h2hDraws} - Deplasman ${match.h2hAwayWins}
• Ortalama gol: ${match.h2hAverageGoals} gol/maç
${match.h2hHomeWins > match.h2hAwayWins + 1 ? '  → Ev sahibi H2H\'de dominant! MS1 güçlü.' : ''}
${match.h2hAwayWins > match.h2hHomeWins + 1 ? '  → Deplasman H2H\'de üstün! MS2 tercih edilmeli.' : ''}
${match.h2hAverageGoals > 2.5 ? '  → H2H maçları gollü geçiyor, 2.5 Üst mantıklı.' : '  → H2H maçları az gollü, 2.5 Alt makul.'}` : '• H2H verisi yetersiz (bu maçta daha temkinli ol!)'}

🔴 VERİ GÜVENİLİRLİĞİ: ${match.dataConfidence}%
${match.dataConfidence < 50 ? '⚠️ DÜŞÜK VERİ! Güven skoru 60\'ın altında olmalı!' : '✅ Yeterli veri var, güven skoru 65+ olabilir.'}
`;
    });

    prompt += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 TAHMİN KURALLARI:
1. Form skoru farkı 20+ ise → Güçlü taraf %45+, zayıf taraf %25-
2. H2H'de bir taraf dominant ise → O tarafa +5-10% ekle
3. Gol ortalaması 2.5'ten yüksekse → 2.5 Üst %60+
4. Gol ortalaması 2.0'dan düşükse → 2.5 Alt %65+
5. İki takım da formda iyiyse → KG Var %60+
6. Veri güven skoru <50 ise → Tahmin güven skoru <65 olmalı

📤 ÇIKTI FORMATI (JSON):
Her maç için şu yapıda JSON döndür (açıklama ekleme, SADECE JSON):

{
  "match1": {
    "ms1": "45",
    "msX": "28",
    "ms2": "27",
    "over25": "58",
    "under25": "42",
    "btts": "52",
    ${detailed ? '"firstHalfMs1": "38", "firstHalfMsX": "35", "firstHalfMs2": "27",' : ''}
    "recommendation": "MS1 + 2.5 Üst (Form avantajı + Gol ortalaması yüksek)",
    "confidence": 68
  },
  ...
}

✅ TAHMİNLERİNİN %100 MANTIKLI OLMASI LAZIM!
❌ RASTGELE SAYI VERME! HER TAHMİN VERİYE DAYANMALI!
`;

    return prompt;
  },

  // Gelişmiş parse fonksiyonu
  parseAdvancedAnalysisResponse(text: string, matchesData: DetailedMatchData[]): MatchAnalysis[] {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON bulunamadı');
      }

      const data = JSON.parse(jsonMatch[0]);
      const analyses: MatchAnalysis[] = [];

      matchesData.forEach((match, index) => {
        const key = `match${index + 1}`;
        const matchData = data[key];

        if (matchData) {
          // Tahminleri doğrula (toplam 100 olmalı)
          const ms1 = parseInt(matchData.ms1 || '33');
          const msX = parseInt(matchData.msX || '33');
          const ms2 = parseInt(matchData.ms2 || '34');
          const total = ms1 + msX + ms2;
          
          // Normalizasyon (toplam 100'e eşitle)
          const normalized = {
            ms1: Math.round((ms1 / total) * 100),
            msX: Math.round((msX / total) * 100),
            ms2: Math.round((ms2 / total) * 100)
          };
          
          // Yuvarlama hatası düzelt
          const diff = 100 - (normalized.ms1 + normalized.msX + normalized.ms2);
          if (diff !== 0) normalized.ms1 += diff;

          analyses.push({
            fixtureId: match.fixtureId,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            league: match.league,
            date: '', // matchSelection'dan gelecek
            time: '',
            predictions: {
              ms1: normalized.ms1.toString(),
              msX: normalized.msX.toString(),
              ms2: normalized.ms2.toString(),
              over25: matchData.over25 || '50',
              under25: matchData.under25 || '50',
              btts: matchData.btts || '50',
              firstHalfMs1: matchData.firstHalfMs1 || '33',
              firstHalfMsX: matchData.firstHalfMsX || '34',
              firstHalfMs2: matchData.firstHalfMs2 || '33'
            },
            recommendation: matchData.recommendation || 'Analiz tamamlandı',
            confidence: Math.min(parseInt(matchData.confidence) || 50, match.dataConfidence) // Veri güvenini aşmasın
          });
        }
      });

      return analyses;

    } catch (error) {
      console.error('❌ Parse hatası:', error);
      
      // Hata durumunda güvenli varsayılan dön
      return matchesData.map(match => ({
        fixtureId: match.fixtureId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        league: match.league,
        date: '',
        time: '',
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
        recommendation: 'Analiz hatası - varsayılan tahmin',
        confidence: 30
      }));
    }
  }
};
