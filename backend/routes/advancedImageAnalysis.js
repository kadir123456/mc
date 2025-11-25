// routes/advancedImageAnalysis.js - Gelişmiş Görsel Analiz (v3.0 - İKİ AŞAMALI GEMİNİ + FUZZY MATCHING)
const express = require('express');
const axios = require('axios');
const router = express.Router();

// ✅ Firebase Admin SDK ve utils fonksiyonları
const { deductCreditsFromUser } = require('../utils');

// ==================== HELPER FUNCTIONS ====================

// Gemini JSON yanıtını güvenli şekilde parse et
function parseGeminiJSON(text) {
  if (!text) {
    throw new Error('Boş yanıt');
  }
  
  try {
    // Markdown kod bloklarını temizle
    let cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // JSON'u bul
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON bulunamadı');
    }
    
    // Parse et
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
    
  } catch (error) {
    console.error('❌ JSON parse hatası:', error.message);
    console.error('📄 Ham yanıt:', text.substring(0, 500));
    throw new Error(`JSON parse hatası: ${error.message}`);
  }
}

// Takım ismi benzerlik skoru hesapla (Levenshtein Distance + Fuzzy Matching)
function calculateSimilarity(str1, str2) {
  const normalize = (str) => {
    return str
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[.-]/g, '')
      .replace(/ş/g, 's')
      .replace(/ç/g, 'c')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o');
  };
  
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  // Tam eşleşme
  if (s1 === s2) return 1.0;
  
  // İçerme kontrolü
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;
  
  // Levenshtein distance
  const matrix = Array(s2.length + 1).fill(null).map(() => 
    Array(s1.length + 1).fill(null)
  );
  
  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - (distance / maxLength);
}

// Gemini API helper fonksiyonu
async function callGeminiAPI(prompt, responseFormat = 'json', temperature = 0.3, GEMINI_API_KEY) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key bulunamadı');
  }

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
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

// ==================== COMPACT GEMINI SISTEM (v4.0 - KREDİ DOSTU) ====================

// Basit kalite skoru hesapla (60+ = iyi, 40-60 = orta, <40 = reddet)
function calculateSimpleQualityScore(match) {
  let score = 0;
  
  // Temel kontroller
  if (match.statistics?.homeTeam && match.statistics?.awayTeam) score += 30;
  if (match.statistics?.h2h?.total >= 3) score += 20;
  
  // H2H güncelliği
  const monthsAgo = match.statistics?.h2h?.lastMatchDate ? 
    (Date.now() - new Date(match.statistics.h2h.lastMatchDate)) / (1000*60*60*24*30) : 999;
  
  if (monthsAgo <= 12) score += 20;
  else if (monthsAgo <= 24) score += 10;
  
  // Form farkı (formPoints yoksa wins/total ile hesapla)
  const homeFormPoints = match.statistics?.homeTeam?.wins || 0;
  const awayFormPoints = match.statistics?.awayTeam?.wins || 0;
  const formDiff = Math.abs(homeFormPoints - awayFormPoints);
  
  if (formDiff >= 3) score += 20;
  else if (formDiff >= 2) score += 10;
  
  // Oran kontrolü
  if (match.apiMatch) score += 10;
  
  return {
    score,
    verdict: score >= 60 ? "GOOD" : score >= 40 ? "MODERATE" : "REJECT"
  };
}

// Hızlı bahis seçici - En iyi bahis türünü döndür
function selectBestBetFast(match, probabilities, goalPred) {
  const bets = [];
  
  // MS (Maç Sonucu)
  const maxProb = Math.max(probabilities.home, probabilities.draw, probabilities.away);
  if (maxProb >= 65) {
    const pred = probabilities.home >= 65 ? "1" : 
                 probabilities.away >= 65 ? "2" : "X";
    bets.push({
      type: "MS",
      prediction: pred,
      confidence: maxProb,
      odds: 1.80 // Varsayılan oran
    });
  }
  
  // Alt/Üst 2.5
  if (goalPred.over25 >= 65) {
    bets.push({
      type: "ALT_UST",
      prediction: "Üst 2.5",
      confidence: goalPred.over25,
      odds: 1.85
    });
  } else if (goalPred.over25 <= 35) {
    bets.push({
      type: "ALT_UST",
      prediction: "Alt 2.5",
      confidence: 100 - goalPred.over25,
      odds: 1.85
    });
  }
  
  // KG (Karşılıklı Gol)
  if (goalPred.btts >= 65) {
    bets.push({
      type: "KG",
      prediction: "Var",
      confidence: goalPred.btts,
      odds: 1.80
    });
  } else if (goalPred.btts <= 35) {
    bets.push({
      type: "KG",
      prediction: "Yok",
      confidence: 100 - goalPred.btts,
      odds: 1.80
    });
  }
  
  // En yüksek güvene sahip olanı seç
  return bets.sort((a, b) => b.confidence - a.confidence)[0] || null;
}

// Compact Gemini prompt oluştur (80% daha kısa)
function generateCompactPredictionPrompt(match, homeStats, awayStats, h2h) {
  return `Sen profesyonel futbol analistisin. Sadece güvenilir tahminler yap.

🏠 ${match.apiMatch.homeTeam} vs ✈️ ${match.apiMatch.awayTeam}

📊 TEMEL VERİLER:
Ev: Form ${homeStats?.form || 'N/A'}, ${homeStats?.goalsAvg || 0} gol/maç
Deplasman: Form ${awayStats?.form || 'N/A'}, ${awayStats?.goalsAvg || 0} gol/maç
H2H: ${h2h?.homeWins || 0}-${h2h?.draws || 0}-${h2h?.awayWins || 0} (Son ${h2h?.total || 0} maç)

⚠️ KURALLAR:
1. Veri yetersizse → "dataQuality": "INSUFFICIENT"
2. Güven <%60 ise → "status": "NO_VALUE"
3. Sadece EN İYİ 1 bahis türünü öner (MS/Alt-Üst/KG)

🎯 ANALİZ:
A) OLASILIK: Form + Ev avantajı + H2H
B) BAHİS TÜRÜ: MS/Alt-Üst/KG (en güvenilir olanı)
C) VALUE: Oran olasılığı vs tahmin

JSON ÇIKTI:
{
  "dataQuality": "SUFFICIENT/INSUFFICIENT",
  "probabilities": {"home": 0-100, "draw": 0-100, "away": 0-100},
  "goalPrediction": {"expectedTotal": 0-10, "over25": 0-100, "btts": 0-100},
  "recommendation": {
    "betType": "MS/ALT_UST/KG",
    "prediction": "tahmin",
    "confidence": 0-100,
    "reasoning": "kısa açıklama (max 100 karakter)"
  },
  "status": "RECOMMENDED/NO_VALUE/REJECTED"
}

SADECE JSON!`;
}

// Gemini ile maç eşleştirme doğrulama
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

    const validationText = await callGeminiAPI(validationPrompt, 'json', 0.1, GEMINI_API_KEY);
    const validationData = parseGeminiJSON(validationText);
    
    return validationData.isMatch && validationData.confidence >= 75;
    
  } catch (error) {
    console.error('   ⚠️ Gemini doğrulama hatası:', error.message);
    return true; // Hata durumunda eşleşmeyi kabul et
  }
}

// Football API çağrısı (Rate Limit Retry ile)
async function fetchFootballAPIWithRetry(url, params, FOOTBALL_API_KEY, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        params,
        headers: {
          'x-rapidapi-key': FOOTBALL_API_KEY,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        },
        timeout: 20000
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 429 && attempt < maxRetries - 1) {
        const waitTime = 2000 * (attempt + 1); // 2s, 4s, 6s
        console.log(`   ⚠️ Rate limit, ${waitTime/1000}s bekleniyor...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
}

// Takım istatistikleri çek (Son 10 maç)
async function getTeamStats(teamId, FOOTBALL_API_KEY) {
  try {
    const data = await fetchFootballAPIWithRetry(
      'https://v3.football.api-sports.io/fixtures',
      { team: teamId, last: 10 },
      FOOTBALL_API_KEY
    );

    const fixtures = data.response || [];
    if (fixtures.length === 0) {
      return null;
    }

    // İstatistikleri hesapla
    let wins = 0, draws = 0, losses = 0;
    let goalsScored = 0, goalsConceded = 0;
    let bttsCount = 0, cleanSheetCount = 0;
    let homeFixtures = [];
    let awayFixtures = [];
    const formArray = [];

    for (const fixture of fixtures) {
      const isHome = fixture.teams.home.id === teamId;
      const goalsFor = isHome ? fixture.goals.home : fixture.goals.away;
      const goalsAgainst = isHome ? fixture.goals.away : fixture.goals.home;

      // Form hesapla
      if (goalsFor > goalsAgainst) {
        wins++;
        formArray.push('W');
      } else if (goalsFor < goalsAgainst) {
        losses++;
        formArray.push('L');
      } else {
        draws++;
        formArray.push('D');
      }

      // Goller
      goalsScored += goalsFor || 0;
      goalsConceded += goalsAgainst || 0;

      // BTTS (Both Teams To Score)
      if ((fixture.goals.home || 0) > 0 && (fixture.goals.away || 0) > 0) {
        bttsCount++;
      }

      // Clean Sheet
      if (goalsAgainst === 0) {
        cleanSheetCount++;
      }

      // Ev/Deplasman ayır
      if (isHome) {
        homeFixtures.push(fixture);
      } else {
        awayFixtures.push(fixture);
      }
    }

    // Ev/Deplasman formları
    const calculateForm = (fixtures, teamId) => {
      const form = [];
      for (const f of fixtures) {
        const isHome = f.teams.home.id === teamId;
        const goalsFor = isHome ? f.goals.home : f.goals.away;
        const goalsAgainst = isHome ? f.goals.away : f.goals.home;
        if (goalsFor > goalsAgainst) form.push('W');
        else if (goalsFor < goalsAgainst) form.push('L');
        else form.push('D');
      }
      return form.join('');
    };

    return {
      form: formArray.join(''),
      wins,
      draws,
      losses,
      goalsScored,
      goalsConceded,
      goalsAvg: (goalsScored / fixtures.length).toFixed(1),
      concededAvg: (goalsConceded / fixtures.length).toFixed(1),
      homeForm: calculateForm(homeFixtures.slice(0, 5), teamId),
      awayForm: calculateForm(awayFixtures.slice(0, 5), teamId),
      btts: Math.round((bttsCount / fixtures.length) * 100),
      cleanSheet: Math.round((cleanSheetCount / fixtures.length) * 100)
    };

  } catch (error) {
    console.error(`   ⚠️ Takım ${teamId} istatistikleri alınamadı:`, error.message);
    return null;
  }
}

// Head-to-Head istatistikleri çek
async function getH2H(homeTeamId, awayTeamId, FOOTBALL_API_KEY) {
  try {
    const data = await fetchFootballAPIWithRetry(
      'https://v3.football.api-sports.io/fixtures/headtohead',
      { h2h: `${homeTeamId}-${awayTeamId}`, last: 5 },
      FOOTBALL_API_KEY
    );

    const fixtures = data.response || [];
    if (fixtures.length === 0) {
      return null;
    }

    let homeWins = 0, draws = 0, awayWins = 0, totalGoals = 0;

    for (const fixture of fixtures) {
      const homeGoals = fixture.goals.home || 0;
      const awayGoals = fixture.goals.away || 0;
      totalGoals += homeGoals + awayGoals;

      // Kazananı belirle (ev sahibi perspektifinden)
      const isHomeTeamHome = fixture.teams.home.id === homeTeamId;
      if (homeGoals > awayGoals) {
        if (isHomeTeamHome) homeWins++;
        else awayWins++;
      } else if (homeGoals < awayGoals) {
        if (isHomeTeamHome) awayWins++;
        else homeWins++;
      } else {
        draws++;
      }
    }

    return {
      total: fixtures.length,
      homeWins,
      draws,
      awayWins,
      totalGoals,
      avgGoals: (totalGoals / fixtures.length).toFixed(1)
    };

  } catch (error) {
    console.error(`   ⚠️ H2H alınamadı (${homeTeamId} vs ${awayTeamId}):`, error.message);
    return null;
  }
}

// Compact Gemini Prediction (v4.0 - Token Optimized)
async function getGeminiPrediction(match, homeStats, awayStats, h2h, GEMINI_API_KEY) {
  try {
    // ADIM 1: Kalite Kontrolü
    const quality = calculateSimpleQualityScore(match);
    console.log(`   ├─ 📊 Kalite Skoru: ${quality.score}/100 (${quality.verdict})`);
    
    if (quality.verdict === "REJECT") {
      return {
        status: "REJECTED",
        reason: `Yetersiz veri - kalite skoru: ${quality.score}`,
        qualityScore: quality.score
      };
    }
    
    // ADIM 2: Compact Prompt Oluştur
    const prompt = generateCompactPredictionPrompt(match, homeStats, awayStats, h2h);
    
    // ADIM 3: Gemini API Çağrısı
    console.log(`   ├─ 🤖 Gemini API'ye compact prompt gönderiliyor...`);
    const predictionText = await callGeminiAPI(prompt, 'json', 0.2, GEMINI_API_KEY);
    
    // ADIM 4: JSON Parse
    let prediction = parseGeminiJSON(predictionText);
    
    // ADIM 5: AI Kalite Kontrolü
    if (prediction.dataQuality === "INSUFFICIENT" || prediction.status === "REJECTED") {
      return { 
        status: "REJECTED", 
        reason: "AI: Veri yetersiz",
        qualityScore: quality.score 
      };
    }
    
    // ADIM 6: En İyi Bahis Seçimi
    const bestBet = selectBestBetFast(
      match, 
      prediction.probabilities || {home: 33, draw: 33, away: 33},
      prediction.goalPrediction || {expectedTotal: 2.5, over25: 50, btts: 50}
    );
    
    // ADIM 7: Final Kontrol
    if (!bestBet || bestBet.confidence < 60) {
      return {
        status: "NO_VALUE",
        reason: "Güvenilir fırsat yok (confidence < 60)",
        qualityScore: quality.score,
        bestConfidence: bestBet?.confidence || 0
      };
    }
    
    // ADIM 8: Başarılı Sonuç
    return {
      status: "RECOMMENDED",
      match: {
        home: match.apiMatch.homeTeam,
        away: match.apiMatch.awayTeam,
        league: match.apiMatch.league,
        date: match.apiMatch.date
      },
      qualityScore: quality.score,
      recommendation: {
        ...bestBet,
        reasoning: prediction.recommendation?.reasoning || "Güvenilir analiz"
      },
      riskLevel: bestBet.confidence >= 75 ? "DÜŞÜK" : 
                 bestBet.confidence >= 65 ? "ORTA" : "YÜKSEK",
      probabilities: prediction.probabilities,
      goalPrediction: prediction.goalPrediction
    };
    
  } catch (error) {
    console.error(`   ⚠️ Gemini compact prediction hatası:`, error.message);
    return { 
      status: "ERROR", 
      reason: error.message 
    };
  }
}

// ==================== YENİ ENDPOINT: /api/analyze-coupon-advanced ====================

router.post('/api/analyze-coupon-advanced', async (req, res) => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 GELİŞMİŞ KUPON ANALİZİ BAŞLATILIYOR (v3.0)');
    console.log('='.repeat(80));

    const { image, userId, creditsToDeduct, analysisType } = req.body;
    
    // ENV değişkenleri - SADECE GEMINI_API_KEY KULLAN
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY || process.env.VITE_FOOTBALL_API_KEY;

    console.log('\n📋 PARAMETRE KONTROLÜ:');
    console.log(`   ├─ userId: ${userId || 'YOK'}`);
    console.log(`   ├─ creditsToDeduct: ${creditsToDeduct || 'YOK'}`);
    console.log(`   ├─ analysisType: ${analysisType || 'hepsi'}`);
    console.log(`   ├─ GEMINI_API_KEY: ${GEMINI_API_KEY ? '✅ MEVCUT' : '❌ EKSİK'}`);
    console.log(`   └─ FOOTBALL_API_KEY: ${FOOTBALL_API_KEY ? '✅ MEVCUT' : '❌ EKSİK'}`);

    // Validasyonlar
    if (!GEMINI_API_KEY) {
      console.error('\n❌ HATA: Gemini API key bulunamadı');
      return res.status(500).json({ error: 'Gemini API key yapılandırılmamış' });
    }

    if (!FOOTBALL_API_KEY) {
      console.error('\n❌ HATA: Football API key bulunamadı');
      return res.status(500).json({ error: 'Football API key yapılandırılmamış' });
    }

    if (!image || typeof image !== 'string' || image.length === 0) {
      console.error('\n❌ HATA: Görsel parametresi eksik veya geçersiz');
      return res.status(400).json({ 
        error: 'Görsel bulunamadı',
        details: 'Lütfen geçerli bir görsel yükleyin'
      });
    }

    // Base64 temizleme
    let base64Data = image;
    if (image.includes('base64,')) {
      base64Data = image.split('base64,')[1];
    }
    
    if (!base64Data || base64Data.length < 100) {
      console.error('\n❌ HATA: Geçersiz görsel formatı');
      throw new Error('Geçersiz görsel formatı');
    }
    
    console.log(`\n📏 Görsel bilgileri:`);
    console.log(`   └─ Boyut: ${(base64Data.length / 1024 / 1024).toFixed(2)} MB`);

    // MIME type tespiti
    let mimeType = 'image/jpeg';
    if (image.startsWith('data:image/png')) {
      mimeType = 'image/png';
    } else if (image.startsWith('data:image/webp')) {
      mimeType = 'image/webp';
    }
    console.log(`   └─ Format: ${mimeType}`);

    // ========== ADIM 1: Gemini ile Takım İsimlerini Çıkar ve Normalize Et ==========
    console.log('\n' + '─'.repeat(80));
    console.log('📋 ADIM 1: GEMİNİ İLE TAKIM İSİMLERİNİ ÇIKARMA VE NORMALİZE ETME');
    console.log('─'.repeat(80));
    
    const extractResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
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
      console.error('\n❌ HATA: Gemini yanıtı alınamadı');
      throw new Error('Gemini yanıtı alınamadı');
    }

    let extractedData;
    try {
      extractedData = parseGeminiJSON(extractText);
    } catch (parseError) {
      console.error('\n❌ HATA: Gemini yanıtı parse edilemedi:', parseError.message);
      throw new Error('Görsel işlenirken hata oluştu');
    }

    const extractedMatches = extractedData.matches || [];
    
    console.log(`\n✅ Gemini analizi tamamlandı:`);
    console.log(`   └─ Bulunan maç sayısı: ${extractedMatches.length}`);
    
    if (extractedMatches.length > 0) {
      console.log('\n📊 Çıkarılan maçlar:');
      extractedMatches.forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.homeTeam} vs ${m.awayTeam}`);
        console.log(`      └─ Normalized: ${m.normalizedHome} vs ${m.normalizedAway}`);
      });
    }

    if (extractedMatches.length === 0) {
      console.log('\n⚠️ UYARI: Görselde hiç maç bulunamadı');
      return res.json({
        success: true,
        message: 'Görselde maç bulunamadı.',
        extractedMatches: [],
        matchedMatches: [],
        analysisType
      });
    }

// ========== ADIM 2: Football API'den Yaklaşan Maçları Al ==========
    console.log('\n' + '─'.repeat(80));
    console.log('⚽ ADIM 2: FOOTBALL API\'DEN YAKLAŞAN MAÇLARI ÇEKME');
    console.log('─'.repeat(80));
    
    console.log('\n🔍 API isteği gönderiliyor...');
    console.log(`   ├─ Endpoint: https://v3.football.api-sports.io/fixtures`);
    console.log(`   ├─ Parametre: date (bugün ve yarın)`);
    console.log(`   └─ Timeout: 20 saniye`);

    // Bugün ve yarının maçlarını çek
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`   ├─ Bugün: ${todayStr}`);
    console.log(`   └─ Yarın: ${tomorrowStr}`);
    
    // İki istek paralel olarak
    const [todayResponse, tomorrowResponse] = await Promise.all([
      axios.get('https://v3.football.api-sports.io/fixtures', {
        params: { date: todayStr },
        headers: {
          'x-rapidapi-host': 'v3.football.api-sports.io',
          'x-rapidapi-key': FOOTBALL_API_KEY
        },
        timeout: 20000
      }),
      axios.get('https://v3.football.api-sports.io/fixtures', {
        params: { date: tomorrowStr },
        headers: {
          'x-rapidapi-host': 'v3.football.api-sports.io',
          'x-rapidapi-key': FOOTBALL_API_KEY
        },
        timeout: 20000
      })
    ]);
    
    // Maçları birleştir
    const allFixtures = [
      ...(todayResponse.data.response || []),
      ...(tomorrowResponse.data.response || [])
    ];
    
    console.log(`\n✅ Football API yanıtı alındı:`);
    console.log(`   ├─ Bugün: ${todayResponse.data.response?.length || 0} maç`);
    console.log(`   ├─ Yarın: ${tomorrowResponse.data.response?.length || 0} maç`);
    console.log(`   └─ Toplam: ${allFixtures.length} maç`);

    if (allFixtures.length === 0) {
      console.error('\n❌ HATA: Football API\'den maç alınamadı');
      return res.json({
        success: false,
        message: 'Football API\'den maç bilgisi alınamadı.',
        extractedMatches,
        matchedMatches: [],
        analysisType
      });
    }

    // ========== ADIM 3: Akıllı Maç Eşleştirme (FUZZY MATCHING + GEMİNİ DOĞRULAMA) ==========
    console.log('\n' + '─'.repeat(80));
    console.log('🔗 ADIM 3: AKILLI MAÇ EŞLEŞTİRME (FUZZY MATCHING + GEMİNİ DOĞRULAMA)');
    console.log('─'.repeat(80));
    
    const matchedMatches = [];
    const unmatchedMatches = [];

    for (let idx = 0; idx < extractedMatches.length; idx++) {
      const extracted = extractedMatches[idx];
      const homeSearch = extracted.normalizedHome || extracted.homeTeam;
      const awaySearch = extracted.normalizedAway || extracted.awayTeam;
      
      console.log(`\n🔍 Maç ${idx + 1}/${extractedMatches.length}: ${homeSearch} vs ${awaySearch}`);

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
        console.log(`   ├─ 📊 Fuzzy Match Bulundu:`);
        console.log(`   │  └─ ${bestMatch.fixture.teams.home.name} vs ${bestMatch.fixture.teams.away.name}`);
        console.log(`   ├─ 📈 Benzerlik Skorları:`);
        console.log(`   │  ├─ Ev Sahibi: %${(bestMatch.homeScore * 100).toFixed(0)}`);
        console.log(`   │  ├─ Deplasman: %${(bestMatch.awayScore * 100).toFixed(0)}`);
        console.log(`   │  └─ Ortalama: %${(bestMatch.avgScore * 100).toFixed(0)}`);
        
        // Gemini ile doğrula
        console.log(`   ├─ 🤖 Gemini ile doğrulanıyor...`);
        const isValid = await validateMatchWithGemini(extracted, bestMatch.fixture, GEMINI_API_KEY);
        
        if (isValid) {
          matchedMatches.push({
            extracted: {
              homeTeam: extracted.homeTeam,
              awayTeam: extracted.awayTeam,
              league: null
            },
            apiMatch: {
              fixtureId: bestMatch.fixture.fixture.id,
              homeTeam: bestMatch.fixture.teams.home.name,
              awayTeam: bestMatch.fixture.teams.away.name,
              league: bestMatch.fixture.league.name,
              date: bestMatch.fixture.fixture.date,
              status: bestMatch.fixture.fixture.status.short
            },
            matchScore: Math.round(bestMatch.avgScore * 100)
          });
          console.log(`   └─ ✅ Gemini ONAYLADI - Eşleşme kabul edildi\n`);
        } else {
          unmatchedMatches.push(extracted);
          console.log(`   └─ ❌ Gemini ONAYLAMADI - Eşleşme reddedildi\n`);
        }
      } else {
        unmatchedMatches.push(extracted);
        console.log(`   └─ ❌ Fuzzy matching ile eşleşme bulunamadı (%75 altında)\n`);
      }
      
      // Rate limit için kısa bekleme
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // ========== ADIM 4: KAPSAMLI İSTATİSTİKLER ÇEK ==========
    console.log('\n' + '─'.repeat(80));
    console.log('📊 ADIM 4: KAPSAMLI İSTATİSTİKLER ÇEKİLİYOR');
    console.log('─'.repeat(80));

    for (let idx = 0; idx < matchedMatches.length; idx++) {
      const match = matchedMatches[idx];
      console.log(`\n⚽ Maç ${idx + 1}/${matchedMatches.length}: ${match.apiMatch.homeTeam} vs ${match.apiMatch.awayTeam}`);
      
      try {
        // Takım ID'lerini al (Football API'den fixture verisi içinde var)
        const fixtureId = match.apiMatch.fixtureId;
        
        // Takım ID'lerini bulmak için fixture detaylarını çek
        console.log(`   ├─ 🔍 Takım ID'leri alınıyor...`);
        const fixtureData = await fetchFootballAPIWithRetry(
          'https://v3.football.api-sports.io/fixtures',
          { id: fixtureId },
          FOOTBALL_API_KEY
        );
        
        const fixture = fixtureData.response?.[0];
        if (!fixture) {
          console.log(`   └─ ⚠️ Fixture bulunamadı, istatistik atlanıyor`);
          continue;
        }

        const homeTeamId = fixture.teams.home.id;
        const awayTeamId = fixture.teams.away.id;
        console.log(`   │  └─ Ev Sahibi ID: ${homeTeamId}, Deplasman ID: ${awayTeamId}`);

        // Ev sahibi istatistikleri
        console.log(`   ├─ 📈 Ev sahibi son 10 maç alınıyor...`);
        const homeStats = await getTeamStats(homeTeamId, FOOTBALL_API_KEY);
        if (homeStats) {
          console.log(`   │  └─ Form: ${homeStats.form} (${homeStats.wins}G ${homeStats.draws}B ${homeStats.losses}M)`);
        } else {
          console.log(`   │  └─ ⚠️ İstatistik alınamadı`);
        }

        // Deplasman istatistikleri
        console.log(`   ├─ 📉 Deplasman son 10 maç alınıyor...`);
        const awayStats = await getTeamStats(awayTeamId, FOOTBALL_API_KEY);
        if (awayStats) {
          console.log(`   │  └─ Form: ${awayStats.form} (${awayStats.wins}G ${awayStats.draws}B ${awayStats.losses}M)`);
        } else {
          console.log(`   │  └─ ⚠️ İstatistik alınamadı`);
        }

        // Head-to-Head
        console.log(`   ├─ 🔄 H2H son 5 karşılaşma alınıyor...`);
        const h2h = await getH2H(homeTeamId, awayTeamId, FOOTBALL_API_KEY);
        if (h2h) {
          console.log(`   │  └─ ${h2h.homeWins}-${h2h.draws}-${h2h.awayWins} (Ort. ${h2h.avgGoals} gol)`);
        } else {
          console.log(`   │  └─ ⚠️ H2H verisi yok`);
        }

        // İstatistikleri match objesine ekle
        match.statistics = {
          homeTeam: homeStats,
          awayTeam: awayStats,
          h2h: h2h
        };

        // Takım ID'lerini de sakla (ADIM 5 için)
        match.homeTeamId = homeTeamId;
        match.awayTeamId = awayTeamId;

        console.log(`   └─ ✅ İstatistikler tamamlandı`);

        // Rate limit için bekleme
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.log(`   └─ ❌ Hata: ${error.message} - Bu maç atlanıyor`);
        // Hata durumunda boş istatistikler ekle
        match.statistics = {
          homeTeam: null,
          awayTeam: null,
          h2h: null
        };
      }
    }

    // ========== ADIM 5: GEMİNİ İLE KAPSAMLI TAHMİNLER ==========
    console.log('\n' + '─'.repeat(80));
    console.log('🤖 ADIM 5: GEMİNİ İLE KAPSAMLI TAHMİNLER');
    console.log('─'.repeat(80));

    const BATCH_SIZE = 3;
    for (let i = 0; i < matchedMatches.length; i += BATCH_SIZE) {
      const batch = matchedMatches.slice(i, i + BATCH_SIZE);
      
      console.log(`\n📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(matchedMatches.length / BATCH_SIZE)}: ${batch.length} maç`);

      await Promise.all(batch.map(async (match, batchIdx) => {
        const globalIdx = i + batchIdx;
        console.log(`\n📊 Maç ${globalIdx + 1}/${matchedMatches.length}: ${match.apiMatch.homeTeam} vs ${match.apiMatch.awayTeam}`);
        
        try {
          if (!match.statistics || (!match.statistics.homeTeam && !match.statistics.awayTeam)) {
            console.log(`   └─ ⚠️ İstatistik yok, tahmin atlanıyor`);
            match.predictionResult = {
              status: "REJECTED",
              reason: "İstatistik eksik"
            };
            return;
          }

          console.log(`   ├─ 🤖 Compact Gemini tahmini üretiliyor...`);
          const predictionResult = await getGeminiPrediction(
            match,
            match.statistics.homeTeam,
            match.statistics.awayTeam,
            match.statistics.h2h,
            GEMINI_API_KEY
          );

          // Yeni compact sonuç formatı
          match.predictionResult = predictionResult;
          
          // Status'e göre log
          if (predictionResult.status === "RECOMMENDED") {
            console.log(`   ├─ ✅ Durum: ${predictionResult.status}`);
            console.log(`   ├─ 📊 Kalite Skoru: ${predictionResult.qualityScore}/100`);
            console.log(`   ├─ 🎯 Bahis Türü: ${predictionResult.recommendation.type}`);
            console.log(`   ├─ 💡 Tahmin: ${predictionResult.recommendation.prediction}`);
            console.log(`   ├─ 🎲 Güven: %${predictionResult.recommendation.confidence}`);
            console.log(`   ├─ ⚠️ Risk: ${predictionResult.riskLevel}`);
            console.log(`   └─ 💬 ${predictionResult.recommendation.reasoning}`);
          } else {
            console.log(`   ├─ ❌ Durum: ${predictionResult.status}`);
            console.log(`   └─ 💬 Sebep: ${predictionResult.reason}`);
          }

        } catch (error) {
          console.log(`   └─ ❌ Tahmin hatası: ${error.message}`);
          match.predictionResult = {
            status: "ERROR",
            reason: error.message
          };
        }
      }));

      // Batch'ler arası 1 saniye bekle
      if (i + BATCH_SIZE < matchedMatches.length) {
        console.log(`\n⏳ Sonraki batch için 1 saniye bekleniyor...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // ========== SONUÇ ==========
    console.log('\n' + '='.repeat(80));
    console.log('✅ TÜM ANALİZLER TAMAMLANDI! (COMPACT v4.0)');
    console.log('='.repeat(80));
    
    // Compact sistem istatistikleri
    const recommendedCount = matchedMatches.filter(m => m.predictionResult?.status === "RECOMMENDED").length;
    const rejectedCount = matchedMatches.filter(m => m.predictionResult?.status === "REJECTED").length;
    const noValueCount = matchedMatches.filter(m => m.predictionResult?.status === "NO_VALUE").length;
    const errorCount = matchedMatches.filter(m => m.predictionResult?.status === "ERROR").length;
    
    console.log(`\n📊 ÖZET:`);
    console.log(`   ├─ Görselden çıkarılan maç: ${extractedMatches.length}`);
    console.log(`   ├─ Başarıyla eşleştirilen: ${matchedMatches.length}`);
    console.log(`   ├─ İstatistik çekilen: ${matchedMatches.filter(m => m.statistics?.homeTeam).length}`);
    console.log(`   ├─ ✅ ÖNERİLEN (RECOMMENDED): ${recommendedCount}`);
    console.log(`   ├─ ❌ REDDEDİLEN (REJECTED): ${rejectedCount}`);
    console.log(`   ├─ ⚠️  DEĞER YOK (NO_VALUE): ${noValueCount}`);
    console.log(`   ├─ 🔴 HATA (ERROR): ${errorCount}`);
    console.log(`   └─ Eşleşmeyen: ${unmatchedMatches.length}`);
    console.log('\n' + '='.repeat(80) + '\n');

    // ========================================
    // ✅ KREDİ DÜŞÜRME - ANALİZ TAMAMLANDI
    // ========================================
    
    console.log('💳 KREDİ DÜŞÜRME İŞLEMİ BAŞLATILIYOR...');
    console.log(`   ├─ Kullanıcı ID: ${userId}`);
    console.log(`   └─ Düşürülecek Kredi: 1`);
    
    try {
      if (!userId) {
        console.error('❌ HATA: userId parametresi eksik!');
        return res.status(400).json({ 
          error: 'Kullanıcı kimliği bulunamadı',
          details: 'userId parametresi gereklidir'
        });
      }

      // Kredi düş (utils.js fonksiyonu)
      await deductCreditsFromUser(userId, 1, 'gorsel_analizi');
      
      // Güncel kredi bilgisini al
      const admin = require('firebase-admin');
      const db = admin.database();
      const userSnapshot = await db.ref(`users/${userId}`).once('value');
      const userData = userSnapshot.val();
      const remainingCredits = userData?.credits || 0;
      
      console.log(`✅ KREDİ DÜŞÜRME BAŞARILI!`);
      console.log(`   └─ Yeni kredi: ${remainingCredits}`);

      // Maçları status'e göre ayır (Compact v4.0 formatı)
      const recommendedMatches = matchedMatches.filter(m => m.predictionResult?.status === "RECOMMENDED");
      const rejectedMatches = matchedMatches.filter(m => 
        m.predictionResult?.status === "REJECTED" || 
        m.predictionResult?.status === "NO_VALUE" ||
        m.predictionResult?.status === "ERROR"
      );

      // Response gönder (Yeni Compact Format)
      res.json({
        success: true,
        message: `${matchedMatches.length} maç analiz edildi. ${recommendedMatches.length} önerilen, ${rejectedMatches.length} reddedilen.`,
        creditsDeducted: 1,
        remainingCredits: remainingCredits,
        analysisVersion: "v4.0-compact",
        
        // Önerilen maçlar (sadece güvenilir tahminler)
        recommendedMatches: recommendedMatches.map(m => ({
          match: {
            home: m.apiMatch.homeTeam,
            away: m.apiMatch.awayTeam,
            league: m.apiMatch.league,
            date: m.apiMatch.date
          },
          qualityScore: m.predictionResult.qualityScore,
          recommendation: m.predictionResult.recommendation,
          riskLevel: m.predictionResult.riskLevel,
          probabilities: m.predictionResult.probabilities,
          goalPrediction: m.predictionResult.goalPrediction
        })),
        
        // Reddedilen maçlar
        rejectedMatches: rejectedMatches.map(m => ({
          match: {
            home: m.apiMatch.homeTeam,
            away: m.apiMatch.awayTeam
          },
          status: m.predictionResult?.status || "UNKNOWN",
          reason: m.predictionResult?.reason || "Bilinmeyen sebep",
          qualityScore: m.predictionResult?.qualityScore
        })),
        
        // Eski format uyumluluğu için (isteğe bağlı)
        extractedMatches,
        matchedMatches, // Tüm maçlar (eski format ile uyumluluk)
        unmatchedMatches,
        analysisType
      });

    } catch (creditError) {
      console.error('❌ KREDİ DÜŞÜRME HATASI:', creditError.message);
      
      // Kredi hatası durumunda özel yanıt
      if (creditError.message.includes('Yetersiz kredi')) {
        return res.status(402).json({ 
          error: 'Yetersiz kredi',
          details: creditError.message,
          requiredCredits: 1
        });
      }
      
      // Diğer hatalar
      return res.status(500).json({ 
        error: 'Kredi düşürme işlemi başarısız',
        details: creditError.message
      });
    }

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ KUPON ANALİZ HATASI');
    console.error('='.repeat(80));
    console.error(`Hata: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error('='.repeat(80) + '\n');
    
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
