// routes/imageAnalysis.js - Gelişmiş Görsel Analiz (v3.0 - İKİ AŞAMALI GEMİNİ + FUZZY MATCHING)
const express = require('express');
const axios = require('axios');
const router = express.Router();

const {
  firebaseInitialized,
  parseGeminiJSON,
  refundCreditsToUser,
  deductCreditsFromUser,
  calculateSimilarity,
  analyzeHomeAwayPerformance,
  analyzeBTTS,
  calculateReliabilityScore
} = require('../utils');

// Gemini API helper fonksiyonu (ENV'den key çeker)
async function callGeminiAPI(prompt, responseFormat = 'json', temperature = 0.3) {
  const GEMINI_API_KEY = process.env.EMERGENT_LLM_KEY || process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key bulunamadı');
  }

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature,
        maxOutputTokens: 8000,
        responseMimeType: responseFormat === 'json' ? 'application/json' : 'text/plain'
      }
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    }
  );

  return response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
}

// Takım istatistiklerini Football API'den çek (RETRY MEKANIZMALI)
async function getTeamStatisticsWithRetry(teamId, leagueId, season, API_KEY, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(
        'https://v3.football.api-sports.io/teams/statistics',
        {
          params: {
            team: teamId,
            league: leagueId,
            season: season
          },
          headers: {
            'x-apisports-key': API_KEY
          },
          timeout: 10000
        }
      );

      return response.data?.response || null;
    } catch (error) {
      if (error.response?.status === 429 && attempt < retries) {
        const waitTime = attempt * 2000; // 2s, 4s, 6s
        console.log(`   ⏳ Rate limit, ${waitTime/1000}s bekleniyor... (Deneme ${attempt}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      console.error(`   ⚠️ Takım istatistiği alınamadı: ${teamId}`);
      return null;
    }
  }
  return null;
}

// Son maçları al (RETRY MEKANIZMALI)
async function getRecentMatchesWithRetry(teamId, last = 10, API_KEY, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(
        'https://v3.football.api-sports.io/fixtures',
        {
          params: {
            team: teamId,
            last: last
          },
          headers: {
            'x-apisports-key': API_KEY
          },
          timeout: 10000
        }
      );

      return response.data?.response || [];
    } catch (error) {
      if (error.response?.status === 429 && attempt < retries) {
        const waitTime = attempt * 2000;
        console.log(`   ⏳ Rate limit, ${waitTime/1000}s bekleniyor... (Deneme ${attempt}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      console.error(`   ⚠️ Son maçlar alınamadı: ${teamId}`);
      return [];
    }
  }
  return [];
}

// Head to head maçları al (RETRY MEKANIZMALI)
async function getH2HMatchesWithRetry(team1Id, team2Id, API_KEY, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(
        'https://v3.football.api-sports.io/fixtures/headtohead',
        {
          params: {
            h2h: `${team1Id}-${team2Id}`,
            last: 10
          },
          headers: {
            'x-apisports-key': API_KEY
          },
          timeout: 10000
        }
      );

      return response.data?.response || [];
    } catch (error) {
      if (error.response?.status === 429 && attempt < retries) {
        const waitTime = attempt * 2000;
        console.log(`   ⏳ Rate limit, ${waitTime/1000}s bekleniyor... (Deneme ${attempt}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      console.error(`   ⚠️ H2H maçları alınamadı`);
      return [];
    }
  }
  return [];
}

// İstatistiklerden KAPSAMLI form analizi yap
function analyzeTeamForm(recentMatches, teamId) {
  if (!recentMatches || recentMatches.length === 0) {
    return {
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      form: 'Bilinmiyor',
      formPoints: 0,
      homeStats: { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
      awayStats: { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
      btts: { count: 0, percentage: 0 },
      cleanSheets: { count: 0, percentage: 0 }
    };
  }

  let wins = 0, draws = 0, losses = 0;
  let goalsFor = 0, goalsAgainst = 0;
  let formString = '';
  
  let homeStats = { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, matches: 0 };
  let awayStats = { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, matches: 0 };
  
  let bttsCount = 0;
  let cleanSheets = 0;
  let validMatches = 0;

  recentMatches.slice(0, 10).forEach(match => {
    const homeTeamId = match.teams.home.id;
    const awayTeamId = match.teams.away.id;
    const homeGoals = match.goals.home;
    const awayGoals = match.goals.away;

    if (match.fixture.status.short !== 'FT') return;
    
    validMatches++;

    const isHome = homeTeamId === teamId;
    const teamGoals = isHome ? homeGoals : awayGoals;
    const opponentGoals = isHome ? awayGoals : homeGoals;

    goalsFor += teamGoals;
    goalsAgainst += opponentGoals;
    
    // BTTS ve Clean Sheet
    if (teamGoals > 0 && opponentGoals > 0) bttsCount++;
    if (opponentGoals === 0) cleanSheets++;
    
    // Ev/Deplasman ayrımı
    const stats = isHome ? homeStats : awayStats;
    stats.matches++;
    stats.goalsFor += teamGoals;
    stats.goalsAgainst += opponentGoals;

    if (teamGoals > opponentGoals) {
      wins++;
      stats.wins++;
      formString += 'G';
    } else if (teamGoals === opponentGoals) {
      draws++;
      stats.draws++;
      formString += 'B';
    } else {
      losses++;
      stats.losses++;
      formString += 'M';
    }
  });

  const formPoints = (wins * 3) + draws;

  return {
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    form: formString,
    formPoints,
    avgGoalsFor: validMatches > 0 ? (goalsFor / validMatches).toFixed(2) : '0.00',
    avgGoalsAgainst: validMatches > 0 ? (goalsAgainst / validMatches).toFixed(2) : '0.00',
    homeStats,
    awayStats,
    btts: {
      count: bttsCount,
      percentage: validMatches > 0 ? Math.round((bttsCount / validMatches) * 100) : 0
    },
    cleanSheets: {
      count: cleanSheets,
      percentage: validMatches > 0 ? Math.round((cleanSheets / validMatches) * 100) : 0
    }
  };
}

// YENİ: Gemini ile maç eşleştirme doğrulama
async function validateMatchWithGemini(extractedMatch, apiMatch, GEMINI_API_KEY) {
  try {
    const validationPrompt = `Bu iki takım çifti AYNI MAÇI mi temsil ediyor?

ÇİFT 1 (Kullanıcının görselden): ${extractedMatch.homeTeam} vs ${extractedMatch.awayTeam}
ÇİFT 2 (Football API'den): ${apiMatch.teams.home.name} vs ${apiMatch.teams.away.name}

KURALLAR:
- Takım isimleri farklı dillerde olabilir (Türkçe/İngilizce)
- Kısaltmalar kullanılmış olabilir
- Küçük yazım farklılıkları göz ardı edilebilir
- ANCAK farklı takımlar kesinlikle "false" olmalı

JSON yanıt ver:
{
  "isMatch": true/false,
  "confidence": 0-100,
  "reason": "kısa açıklama"
}`;

    const validationText = await callGeminiAPI(validationPrompt, 'json', 0.1);
    const validationData = parseGeminiJSON(validationText);
    
    return validationData.isMatch && validationData.confidence >= 75;
    
  } catch (error) {
    console.error('   ⚠️ Gemini doğrulama hatası:', error.message);
    return true; // Hata durumunda eşleşmeyi kabul et
  }
}

// ==================== GELİŞMİŞ KUPON GÖRSEL ANALİZİ ====================
router.post('/api/analyze-coupon-image', async (req, res) => {
  let creditsDeducted = false;
  
  try {
    const { image, userId, creditsToDeduct, analysisType } = req.body;
    
    const GEMINI_API_KEY = process.env.EMERGENT_LLM_KEY || process.env.GEMINI_API_KEY;
    const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;

    // Validasyonlar
    if (!GEMINI_API_KEY) {
      console.error('❌ Gemini API key bulunamadı');
      return res.status(500).json({ error: 'Gemini API key yapılandırılmamış' });
    }

    if (!FOOTBALL_API_KEY) {
      console.error('❌ Football API key bulunamadı');
      return res.status(500).json({ error: 'Football API key yapılandırılmamış' });
    }

    if (!image || typeof image !== 'string' || image.length === 0) {
      console.error('❌ Görsel parametresi eksik');
      return res.status(400).json({ 
        error: 'Görsel bulunamadı',
        details: 'Lütfen geçerli bir görsel yükleyin'
      });
    }

    if (!userId || !creditsToDeduct) {
      console.error('❌ Kullanıcı bilgisi eksik');
      return res.status(400).json({ error: 'Kullanıcı bilgisi eksik' });
    }

    // Kredi düşürme
    if (firebaseInitialized) {
      try {
        await deductCreditsFromUser(userId, parseInt(creditsToDeduct), 'image_analysis_advanced');
        creditsDeducted = true;
        console.log(`💰 ${creditsToDeduct} kredi düşüldü: ${userId}`);
      } catch (creditError) {
        console.error('❌ Kredi düşürme hatası:', creditError.message);
        return res.status(400).json({ error: creditError.message });
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎯 GELİŞMİŞ KUPON ANALİZİ BAŞLIYOR (v3.0 - İKİ AŞAMALI GEMİNİ)');
    console.log('='.repeat(70));

    // Base64 temizleme
    let base64Data = image;
    if (image.includes('base64,')) {
      base64Data = image.split('base64,')[1];
    }
    
    if (!base64Data || base64Data.length < 100) {
      throw new Error('Geçersiz görsel formatı');
    }
    
    console.log(`📏 Görsel boyutu: ${(base64Data.length / 1024 / 1024).toFixed(2)} MB`);

    // MIME type tespiti
    let mimeType = 'image/jpeg';
    if (image.startsWith('data:image/png')) {
      mimeType = 'image/png';
    } else if (image.startsWith('data:image/webp')) {
      mimeType = 'image/webp';
    }
    console.log(`🖼️ Görsel formatı: ${mimeType}`);

    // ========== ADIM 1: Gemini ile Takım İsimlerini Çıkar ve Normalize Et ==========
    console.log('\n📋 ADIM 1: Gemini ile takım isimleri çıkarılıyor ve normalize ediliyor...');
    
    const extractResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            {
              text: `Bu futbol kuponu görselindeki maçların takım isimlerini çıkar ve NORMALIZE ET.

ÇOK ÖNEMLİ KURALLAR:
1. Takım isimlerini TAM ve DOĞRU ULUSLARARASI İSİMLERİYLE yaz
2. Kısaltmaları düzelt ve resmi İngilizce isimlerini kullan:
   - "GS" / "Gala" -> "Galatasaray"
   - "FB" / "Fener" -> "Fenerbahce"  
   - "BJK" / "Beşiktaş" -> "Besiktas"
   - "TS" / "Trabzon" -> "Trabzonspor"
   - "Man Utd" / "Man United" -> "Manchester United"
   - "Man City" -> "Manchester City"
   - "Bayern" -> "Bayern Munich"
   - "PSG" -> "Paris Saint Germain"
   - "Real" -> "Real Madrid"
   - "Barca" -> "Barcelona"
3. Türkçe karakterleri İngilizce'ye çevir (ş->s, ç->c, ı->i, ğ->g, ü->u, ö->o)
4. Takım isimlerini Football API'de bulunabilecek şekilde normalize et
5. Şehir isimleri varsa tam takım adını ekle

JSON Formatı:
{
  "matches": [
    {
      "homeTeam": "Ev sahibi takım (orijinal görsel)",
      "awayTeam": "Deplasman takım (orijinal görsel)",
      "normalizedHome": "Arama için optimize edilmiş İngilizce isim",
      "normalizedAway": "Arama için optimize edilmiş İngilizce isim"
    }
  ]
}

SADECE JSON yanıt ver, başka açıklama ekleme.`
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 3000,
          responseMimeType: "application/json"
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );

    const extractText = extractResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!extractText) {
      throw new Error('Gemini yanıtı alınamadı');
    }

    let extractedData;
    try {
      extractedData = parseGeminiJSON(extractText);
    } catch (parseError) {
      throw new Error('Görsel işlenirken hata oluştu');
    }

    const extractedMatches = extractedData.matches || [];
    console.log(`✅ ${extractedMatches.length} maç çıkarıldı ve normalize edildi:`);
    extractedMatches.forEach((m, i) => {
      console.log(`   ${i+1}. ${m.homeTeam} vs ${m.awayTeam}`);
      console.log(`      → Normalized: ${m.normalizedHome} vs ${m.normalizedAway}`);
    });

    if (extractedMatches.length === 0) {
      // Kredi iadesi
      if (creditsDeducted && firebaseInitialized && userId && creditsToDeduct) {
        try {
          await refundCreditsToUser(userId, parseInt(creditsToDeduct), 'Görselde maç bulunamadı');
          console.log(`♻️ Kredi iade edildi`);
        } catch (refundError) {
          console.error('❌ Kredi iadesi hatası:', refundError.message);
        }
      }

      return res.json({
        success: true,
        message: 'Görselde maç bulunamadı. Krediniz iade edildi.',
        extractedMatches: [],
        matchedMatches: [],
        analysisType
      });
    }

    // ========== ADIM 2: Football API'den Yaklaşan Maçları Al ==========
    console.log('\n⚽ ADIM 2: Football API\'den yaklaşan maçlar alınıyor...');
    
    const footballResponse = await axios.get(
      'https://v3.football.api-sports.io/fixtures',
      {
        params: {
          next: 200 // Önümüzdeki 200 maç
        },
        headers: {
          'x-apisports-key': FOOTBALL_API_KEY
        },
        timeout: 20000
      }
    );

    const allFixtures = footballResponse.data?.response || [];
    console.log(`✅ ${allFixtures.length} maç bulundu Football API'de`);

    // ========== ADIM 3: Akıllı Maç Eşleştirme (FUZZY MATCHING + GEMİNİ DOĞRULAMA) ==========
    console.log('\n🔗 ADIM 3: Akıllı maç eşleştirme (Fuzzy Matching + Gemini Doğrulama)...');
    
    const matchedMatches = [];
    const unmatchedMatches = [];

    for (const extracted of extractedMatches) {
      const homeSearch = extracted.normalizedHome || extracted.homeTeam;
      const awaySearch = extracted.normalizedAway || extracted.awayTeam;
      
      console.log(`\n   🔍 Aranan: ${homeSearch} vs ${awaySearch}`);

      // Fuzzy matching ile en iyi eşleşmeyi bul
      let bestMatch = null;
      let bestScore = 0;

      for (const fixture of allFixtures) {
        const apiHome = fixture.teams.home.name;
        const apiAway = fixture.teams.away.name;
        
        // Her iki takım için benzerlik skorları hesapla
        const homeSimilarity = calculateSimilarity(apiHome, homeSearch);
        const awaySimilarity = calculateSimilarity(apiAway, awaySearch);
        
        // Ortalama skor
        const avgScore = (homeSimilarity + awaySimilarity) / 2;
        
        // En az %75 benzerlik gerekli
        if (avgScore >= 0.75 && avgScore > bestScore) {
          bestScore = avgScore;
          bestMatch = {
            fixture,
            homeScore: homeSimilarity,
            awayScore: awaySimilarity,
            avgScore
          };
        }
      }

      if (bestMatch) {
        console.log(`   📊 Fuzzy Match: ${bestMatch.fixture.teams.home.name} vs ${bestMatch.fixture.teams.away.name}`);
        console.log(`      Benzerlik: Ev %${(bestMatch.homeScore * 100).toFixed(0)}, Deplasman %${(bestMatch.awayScore * 100).toFixed(0)}, Ortalama %${(bestMatch.avgScore * 100).toFixed(0)}`);
        
        // Gemini ile doğrula
        console.log(`   🤖 Gemini ile doğrulanıyor...`);
        const isValid = await validateMatchWithGemini(extracted, bestMatch.fixture, GEMINI_API_KEY);
        
        if (isValid) {
          matchedMatches.push({
            extracted,
            fixtureId: bestMatch.fixture.fixture.id,
            homeTeam: bestMatch.fixture.teams.home.name,
            awayTeam: bestMatch.fixture.teams.away.name,
            homeTeamId: bestMatch.fixture.teams.home.id,
            awayTeamId: bestMatch.fixture.teams.away.id,
            league: bestMatch.fixture.league.name,
            leagueId: bestMatch.fixture.league.id,
            season: bestMatch.fixture.league.season,
            date: bestMatch.fixture.fixture.date,
            status: bestMatch.fixture.fixture.status.long,
            similarityScore: bestMatch.avgScore
          });
          console.log(`   ✅ Gemini ONAYLADI - Eşleşme kabul edildi`);
        } else {
          unmatchedMatches.push(extracted);
          console.log(`   ❌ Gemini ONAYLAMADI - Eşleşme reddedildi`);
        }
      } else {
        unmatchedMatches.push(extracted);
        console.log(`   ❌ Fuzzy matching ile eşleşme bulunamadı`);
      }
      
      // Rate limit için kısa bekleme
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`\n🎯 Sonuç: ${matchedMatches.length}/${extractedMatches.length} maç eşleştirildi ve doğrulandı`);

    if (matchedMatches.length === 0) {
      // Kredi iadesi
      if (creditsDeducted && firebaseInitialized && userId && creditsToDeduct) {
        try {
          await refundCreditsToUser(userId, parseInt(creditsToDeduct), 'Hiçbir maç eşleştirilemedi');
          console.log(`♻️ Kredi iade edildi`);
        } catch (refundError) {
          console.error('❌ Kredi iadesi hatası:', refundError.message);
        }
      }

      return res.json({
        success: true,
        message: 'Maçlar Football API\'de bulunamadı veya doğrulanamadı. Krediniz iade edildi.',
        extractedMatches,
        matchedMatches: [],
        unmatchedMatches,
        analysisType
      });
    }

    // ========== ADIM 4: Kapsamlı İstatistikleri Çek ==========
    console.log('\n📊 ADIM 4: Kapsamlı istatistikler çekiliyor...');
    
    for (let match of matchedMatches) {
      console.log(`\n   🔍 ${match.homeTeam} vs ${match.awayTeam} analiz ediliyor...`);
      
      // Son 10 maçları al (RETRY ile)
      console.log(`      📅 Son maçlar alınıyor...`);
      const homeRecentMatches = await getRecentMatchesWithRetry(match.homeTeamId, 10, FOOTBALL_API_KEY);
      const awayRecentMatches = await getRecentMatchesWithRetry(match.awayTeamId, 10, FOOTBALL_API_KEY);
      
      await new Promise(resolve => setTimeout(resolve, 300)); // Rate limit

      // H2H maçları al (RETRY ile)
      console.log(`      🤝 Head-to-head geçmişi alınıyor...`);
      const h2hMatches = await getH2HMatchesWithRetry(match.homeTeamId, match.awayTeamId, FOOTBALL_API_KEY);
      
      await new Promise(resolve => setTimeout(resolve, 300)); // Rate limit

      // Form analizleri yap (GENİŞLETİLMİŞ)
      const homeForm = analyzeTeamForm(homeRecentMatches, match.homeTeamId);
      const awayForm = analyzeTeamForm(awayRecentMatches, match.awayTeamId);

      // H2H analizi
      let h2hStats = {
        totalMatches: h2hMatches.length,
        homeWins: 0,
        draws: 0,
        awayWins: 0,
        avgGoals: 0,
        bttsPercentage: 0
      };

      if (h2hMatches.length > 0) {
        let totalGoals = 0;
        let bttsCount = 0;
        
        h2hMatches.forEach(h2h => {
          const homeGoals = h2h.goals.home;
          const awayGoals = h2h.goals.away;
          totalGoals += (homeGoals + awayGoals);
          
          if (homeGoals > 0 && awayGoals > 0) bttsCount++;

          if (h2h.teams.home.id === match.homeTeamId) {
            if (homeGoals > awayGoals) h2hStats.homeWins++;
            else if (homeGoals === awayGoals) h2hStats.draws++;
            else h2hStats.awayWins++;
          } else {
            if (awayGoals > homeGoals) h2hStats.homeWins++;
            else if (awayGoals === homeGoals) h2hStats.draws++;
            else h2hStats.awayWins++;
          }
        });
        
        h2hStats.avgGoals = (totalGoals / h2hMatches.length).toFixed(2);
        h2hStats.bttsPercentage = Math.round((bttsCount / h2hMatches.length) * 100);
      }

      // Verileri kaydet
      match.statistics = {
        home: homeForm,
        away: awayForm,
        h2h: h2hStats
      };
      
      // Güvenilirlik skoru hesapla
      match.reliabilityScore = calculateReliabilityScore(match);

      console.log(`      ✅ Ev sahibi: ${homeForm.wins}G ${homeForm.draws}B ${homeForm.losses}M (Form: ${homeForm.form})`);
      console.log(`         → Ev: ${homeForm.homeStats.wins}-${homeForm.homeStats.draws}-${homeForm.homeStats.losses}, Deplasman: ${homeForm.awayStats.wins}-${homeForm.awayStats.draws}-${homeForm.awayStats.losses}`);
      console.log(`         → BTTS: %${homeForm.btts.percentage}, Clean Sheet: %${homeForm.cleanSheets.percentage}`);
      console.log(`      ✅ Deplasman: ${awayForm.wins}G ${awayForm.draws}B ${awayForm.losses}M (Form: ${awayForm.form})`);
      console.log(`         → Ev: ${awayForm.homeStats.wins}-${awayForm.homeStats.draws}-${awayForm.homeStats.losses}, Deplasman: ${awayForm.awayStats.wins}-${awayForm.awayStats.draws}-${awayForm.awayStats.losses}`);
      console.log(`         → BTTS: %${awayForm.btts.percentage}, Clean Sheet: %${awayForm.cleanSheets.percentage}`);
      console.log(`      ✅ H2H: ${h2hStats.homeWins}/${h2hStats.draws}/${h2hStats.awayWins} (${h2hStats.totalMatches} maç, BTTS: %${h2hStats.bttsPercentage})`);
      console.log(`      📈 Güvenilirlik Skoru: ${match.reliabilityScore}/100`);
    }

    // ========== ADIM 5: Gemini ile KAPSAMLI Tahminler (SKORLAMA SİSTEMİYLE) ==========
    console.log('\n🤖 ADIM 5: Gemini ile kapsamlı tahminler (Skorlama Sistemi) yapılıyor...');
    
    const typeDescriptions = {
      'ilkYariSonucu': 'İLK YARI SONUCU',
      'macSonucu': 'MAÇ SONUCU (1/X/2)',
      'karsilikliGol': 'KARŞILIKLI GOL (Var/Yok)',
      'ilkYariMac': 'İLK YARI/MAÇ SONUCU',
      'handikap': 'HANDİKAP',
      'altustu': '2.5 ALT/ÜST',
      'hepsi': 'TÜM TAHMİNLER (Maç Sonucu & Alt/Üst & Karşılıklı Gol & İlk Yarı)'
    };

    const predictionType = typeDescriptions[analysisType] || 'TÜM TAHMİNLER';
    
    const matchesText = matchedMatches.map((m, idx) => {
      const stats = m.statistics;
      
      return `${idx + 1}. ${m.homeTeam} vs ${m.awayTeam}
   📍 Lig: ${m.league}
   📅 Tarih: ${new Date(m.date).toLocaleDateString('tr-TR')}
   📈 Güvenilirlik: ${m.reliabilityScore}/100
   
   📊 EV SAHİBİ FORMU:
      Genel: ${stats.home.wins}G ${stats.home.draws}B ${stats.home.losses}M (Form: ${stats.home.form}, ${stats.home.formPoints} puan)
      Ev Performansı: ${stats.home.homeStats.wins}G ${stats.home.homeStats.draws}B ${stats.home.homeStats.losses}M
      Deplasman Performansı: ${stats.home.awayStats.wins}G ${stats.home.awayStats.draws}B ${stats.home.awayStats.losses}M
      Goller: ${stats.home.goalsFor} attı / ${stats.home.goalsAgainst} yedi (Ort: ${stats.home.avgGoalsFor} / ${stats.home.avgGoalsAgainst})
      BTTS: %${stats.home.btts.percentage}, Clean Sheet: %${stats.home.cleanSheets.percentage}
   
   📊 DEPLASMAN FORMU:
      Genel: ${stats.away.wins}G ${stats.away.draws}B ${stats.away.losses}M (Form: ${stats.away.form}, ${stats.away.formPoints} puan)
      Ev Performansı: ${stats.away.homeStats.wins}G ${stats.away.homeStats.draws}B ${stats.away.homeStats.losses}M
      Deplasman Performansı: ${stats.away.awayStats.wins}G ${stats.away.awayStats.draws}B ${stats.away.awayStats.losses}M
      Goller: ${stats.away.goalsFor} attı / ${stats.away.goalsAgainst} yedi (Ort: ${stats.away.avgGoalsFor} / ${stats.away.avgGoalsAgainst})
      BTTS: %${stats.away.btts.percentage}, Clean Sheet: %${stats.away.cleanSheets.percentage}
   
   🤝 HEAD-TO-HEAD (Son ${stats.h2h.totalMatches} Maç):
      Sonuçlar: ${stats.h2h.homeWins} Ev Sahibi / ${stats.h2h.draws} Beraberlik / ${stats.h2h.awayWins} Deplasman
      Ortalama Gol: ${stats.h2h.avgGoals} gol/maç
      BTTS: %${stats.h2h.bttsPercentage}`;
    }).join('\n\n' + '-'.repeat(70) + '\n\n');

    const comprehensivePrompt = `Sen PROFESYONEL bir futbol analisti ve istatistik uzmanısın.

Aşağıdaki maçlar için "${predictionType}" tahmini yap.

${matchesText}

SKORLAMA SİSTEMİ (Her kriter için puan ver):

1️⃣ FORM FARKI (0-30 puan):
   - Son 10 maç kazanma yüzdesi
   - Form puanları farkı (3 puan = galibiyet, 1 puan = beraberlik)
   - Son 5 maç momentum
   
2️⃣ EV SAHİBİ AVANTAJI (0-15 puan):
   - Ev sahibinin evdeki performansı
   - Deplasman takımının dışarıdaki performansı
   
3️⃣ GOL ÜRETİM KABİLİYETİ (0-25 puan):
   - Maç başı ortalama gol sayıları
   - BTTS yüzdeleri
   - Gol yeme ortalamaları
   
4️⃣ H2H ÜSTÜNLÜĞÜ (0-20 puan):
   - Geçmiş karşılaşmalardaki galibiyet oranı
   - H2H'deki gol ortalaması
   
5️⃣ SAVUNMA KALİTESİ (0-10 puan):
   - Clean sheet yüzdeleri
   - Gol yeme ortalamaları

ÖRNEKTİR HESAPLAMA:
- Galatasaray form farkı: 27/30 (8G-1B-1M vs 3G-2B-5M)
- Ev sahibi avantajı: 15/15 (evde 6/6 galibiyet)
- Gol üretimi: 23/25 (maç başı 2.8 vs 1.2)
- H2H üstünlük: 16/20 (son 5 maçta 4 galibiyet)
- Savunma: 9/10 (%80 clean sheet)
TOPLAM: 90/100 → Tahmin: 1 (Ev Sahibi Galibiyeti)

TAHMİN KURALLARI:
- Maç Sonucu: "1" (ev sahibi), "X" (beraberlik), "2" (deplasman)
- Alt/Üst: "Alt" (0-2 gol), "Üst" (3+ gol) - toplam gol ortalamasına göre
- Karşılıklı Gol: "Var" (her iki takım da gol atar), "Yok" (en az biri gol atmaz) - BTTS %'sine göre
- İlk Yarı: İlk 45 dakika tahmini - istatistiklere göre

ÇIKTI FORMATI (JSON):
{
  "predictions": [
    {
      "matchIndex": 0,
      "homeTeam": "Takım adı",
      "awayTeam": "Takım adı",
      "scoringBreakdown": {
        "formDifference": 0-30,
        "homeAdvantage": 0-15,
        "goalProduction": 0-25,
        "h2hDominance": 0-20,
        "defense": 0-10,
        "totalScore": 0-100
      },
      "macSonucu": "1/X/2",
      "altustu": "Alt/Üst",
      "karsilikliGol": "Var/Yok",
      "ilkYariSonucu": "1/X/2",
      "confidence": 55-95,
      "reasoning": "Hangi istatistiklere dayandığını belirt (200 karakter max)",
      "keyFactors": ["İstatistik 1", "İstatistik 2", "İstatistik 3"]
    }
  ]
}

ÖNEMLİ:
- matchIndex 0'dan başla
- scoringBreakdown'da HER KRİTERİ puanla
- totalScore toplamını hesapla (max 100)
- Tüm tahmin türlerini ver (macSonucu, altustu, karsilikliGol, ilkYariSonucu)
- confidence skorlama ile uyumlu olsun (80+ puan = 85+ confidence)
- reasoning'de kullandığın GERÇEK istatistikleri belirt
- keyFactors 3 somut istatistik içermeli
- SADECE JSON yanıt ver, ekstra metin yok`;

    try {
      const predictionText = await callGeminiAPI(comprehensivePrompt, 'json', 0.3);
      
      if (predictionText) {
        try {
          const predData = parseGeminiJSON(predictionText);
          const predictions = predData.predictions || [];
          
          predictions.forEach(pred => {
            const idx = pred.matchIndex;
            if (idx >= 0 && idx < matchedMatches.length) {
              matchedMatches[idx].predictions = {
                scoringBreakdown: pred.scoringBreakdown || {
                  formDifference: 0,
                  homeAdvantage: 0,
                  goalProduction: 0,
                  h2hDominance: 0,
                  defense: 0,
                  totalScore: 0
                },
                macSonucu: pred.macSonucu || 'Tahmin yapılamadı',
                altustu: pred.altustu || 'Tahmin yapılamadı',
                karsilikliGol: pred.karsilikliGol || 'Tahmin yapılamadı',
                ilkYariSonucu: pred.ilkYariSonucu || 'Tahmin yapılamadı',
                confidence: pred.confidence || 50,
                reasoning: pred.reasoning || '',
                keyFactors: pred.keyFactors || []
              };
              
              console.log(`   ✅ Maç ${idx + 1}: Skor ${pred.scoringBreakdown?.totalScore || 0}/100 → ${pred.macSonucu}`);
            }
          });
          
          console.log(`✅ ${predictions.length} kapsamlı tahmin (skorlamalı) tamamlandı`);
        } catch (predParseError) {
          console.error('⚠️ Tahmin parse hatası:', predParseError.message);
          matchedMatches.forEach(m => {
            if (!m.predictions) {
              m.predictions = {
                scoringBreakdown: {
                  formDifference: 0,
                  homeAdvantage: 0,
                  goalProduction: 0,
                  h2hDominance: 0,
                  defense: 0,
                  totalScore: 0
                },
                macSonucu: 'Tahmin yapılamadı',
                altustu: 'Tahmin yapılamadı',
                karsilikliGol: 'Tahmin yapılamadı',
                ilkYariSonucu: 'Tahmin yapılamadı',
                confidence: 50,
                reasoning: 'Analiz tamamlanamadı',
                keyFactors: []
              };
            }
          });
        }
      }
    } catch (predError) {
      console.error('⚠️ Tahmin hatası:', predError.message);
      matchedMatches.forEach(m => {
        m.predictions = {
          scoringBreakdown: {
            formDifference: 0,
            homeAdvantage: 0,
            goalProduction: 0,
            h2hDominance: 0,
            defense: 0,
            totalScore: 0
          },
          macSonucu: 'Tahmin yapılamadı',
          altustu: 'Tahmin yapılamadı',
          karsilikliGol: 'Tahmin yapılamadı',
          ilkYariSonucu: 'Tahmin yapılamadı',
          confidence: 50,
          reasoning: 'Analiz tamamlanamadı',
          keyFactors: []
        };
      });
    }

    // ========== SONUÇ ==========
    console.log('\n' + '='.repeat(70));
    console.log('✅ KAPSAMLI ANALİZ TAMAMLANDI (v3.0)!');
    console.log('='.repeat(70));
    console.log(`   📊 ${extractedMatches.length} maç tespit edildi`);
    console.log(`   ✅ ${matchedMatches.length} maç eşleştirildi ve analiz edildi`);
    console.log(`   ❌ ${unmatchedMatches.length} maç eşleşmedi`);
    console.log('='.repeat(70) + '\n');

    res.json({
      success: true,
      message: `${matchedMatches.length} maç başarıyla analiz edildi`,
      extractedMatches,
      matchedMatches,
      unmatchedMatches,
      analysisType
    });

  } catch (error) {
    console.error('❌ KUPON ANALİZ HATASI:', error.message);
    console.error('Stack:', error.stack);
    
    // Hata durumunda kredi iadesi
    if (creditsDeducted && firebaseInitialized) {
      const { userId, creditsToDeduct } = req.body || {};
      if (userId && creditsToDeduct) {
        try {
          await refundCreditsToUser(userId, parseInt(creditsToDeduct), 'Analiz hatası - otomatik iade');
          console.log(`♻️ Kredi iade edildi`);
        } catch (refundError) {
          console.error('❌ Kredi iadesi hatası:', refundError.message);
        }
      }
    }
    
    const errorMessage = error.message || 'Bilinmeyen hata';
    const errorDetails = error.response?.data?.error?.message || errorMessage;
    
    res.status(500).json({ 
      error: 'Görsel analizi yapılamadı',
      details: errorDetails,
      message: 'Lütfen tekrar deneyin veya daha küçük bir görsel yükleyin'
    });
  }
});

module.exports = router;
