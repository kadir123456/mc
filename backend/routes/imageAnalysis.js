// routes/imageAnalysis.js - Gelişmiş Görsel Analiz (v2.0 - Kapsamlı)
const express = require('express');
const axios = require('axios');
const router = express.Router();

const {
  firebaseInitialized,
  parseGeminiJSON,
  refundCreditsToUser,
  deductCreditsFromUser
} = require('../utils');

// Gemini API helper fonksiyonu
async function callGeminiAPI(prompt, responseFormat = 'json', temperature = 0.3) {
  const GEMINI_API_KEY = process.env.EMERGENT_LLM_KEY || process.env.GEMINI_API_KEY;
  
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

// Takım istatistiklerini Football API'den çek
async function getTeamStatistics(teamId, leagueId, season, API_KEY) {
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
    console.error(`   ⚠️ Takım istatistiği alınamadı: ${teamId}`);
    return null;
  }
}

// Son maçları al
async function getRecentMatches(teamId, last = 10, API_KEY) {
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
    console.error(`   ⚠️ Son maçlar alınamadı: ${teamId}`);
    return [];
  }
}

// Head to head maçları al
async function getH2HMatches(team1Id, team2Id, API_KEY) {
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
    console.error(`   ⚠️ H2H maçları alınamadı`);
    return [];
  }
}

// İstatistiklerden form analizi yap
function analyzeTeamForm(recentMatches, teamId) {
  if (!recentMatches || recentMatches.length === 0) {
    return {
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      form: 'Bilinmiyor',
      formPoints: 0
    };
  }

  let wins = 0, draws = 0, losses = 0;
  let goalsFor = 0, goalsAgainst = 0;
  let formString = '';

  recentMatches.slice(0, 10).forEach(match => {
    const homeTeamId = match.teams.home.id;
    const awayTeamId = match.teams.away.id;
    const homeGoals = match.goals.home;
    const awayGoals = match.goals.away;

    if (match.fixture.status.short !== 'FT') return;

    const isHome = homeTeamId === teamId;
    const teamGoals = isHome ? homeGoals : awayGoals;
    const opponentGoals = isHome ? awayGoals : homeGoals;

    goalsFor += teamGoals;
    goalsAgainst += opponentGoals;

    if (teamGoals > opponentGoals) {
      wins++;
      formString += 'G';
    } else if (teamGoals === opponentGoals) {
      draws++;
      formString += 'B';
    } else {
      losses++;
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
    avgGoalsFor: (goalsFor / recentMatches.length).toFixed(2),
    avgGoalsAgainst: (goalsAgainst / recentMatches.length).toFixed(2)
  };
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
    console.log('🎯 GELİŞMİŞ KUPON ANALİZİ BAŞLIYOR (v2.0)');
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            {
              text: `Bu futbol kuponu görselindeki maçların takım isimlerini çıkar ve NORMALIZE ET.

ÇOK ÖNEMLİ KURALLAR:
1. Takım isimlerini TAM ve DOĞRU ULUSLARARASI İSİMLERİYLE yaz
2. Kısaltmaları düzelt ve resmi İngilizce isimlerini kullan:
   - "GS" -> "Galatasaray"
   - "FB" -> "Fenerbahce"  
   - "BJK" -> "Besiktas"
   - "TS" -> "Trabzonspor"
   - "Man Utd" -> "Manchester United"
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
      "homeTeam": "Ev sahibi takım (resmi İngilizce isim)",
      "awayTeam": "Deplasman takım (resmi İngilizce isim)",
      "normalizedHome": "Arama için optimize edilmiş isim",
      "normalizedAway": "Arama için optimize edilmiş isim"
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

    // ========== ADIM 3: Akıllı Maç Eşleştirme ==========
    console.log('\n🔗 ADIM 3: Akıllı maç eşleştirme yapılıyor...');
    
    const matchedMatches = [];
    const unmatchedMatches = [];

    // Normalize fonksiyonu
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

    for (const extracted of extractedMatches) {
      const homeSearch = extracted.normalizedHome || extracted.homeTeam;
      const awaySearch = extracted.normalizedAway || extracted.awayTeam;
      
      const homeNorm = normalize(homeSearch);
      const awayNorm = normalize(awaySearch);

      // API'den maçı bul - daha akıllı eşleştirme
      const foundMatch = allFixtures.find(fixture => {
        const apiHome = normalize(fixture.teams.home.name);
        const apiAway = normalize(fixture.teams.away.name);
        
        // Çoklu eşleştirme stratejisi
        const homeMatch = 
          apiHome === homeNorm ||
          apiHome.includes(homeNorm) || 
          homeNorm.includes(apiHome) ||
          (homeNorm.length > 4 && apiHome.includes(homeNorm.substring(0, 5))) ||
          (apiHome.length > 4 && homeNorm.includes(apiHome.substring(0, 5)));
        
        const awayMatch = 
          apiAway === awayNorm ||
          apiAway.includes(awayNorm) || 
          awayNorm.includes(apiAway) ||
          (awayNorm.length > 4 && apiAway.includes(awayNorm.substring(0, 5))) ||
          (apiAway.length > 4 && awayNorm.includes(apiAway.substring(0, 5)));
        
        return homeMatch && awayMatch;
      });

      if (foundMatch) {
        matchedMatches.push({
          extracted,
          fixtureId: foundMatch.fixture.id,
          homeTeam: foundMatch.teams.home.name,
          awayTeam: foundMatch.teams.away.name,
          homeTeamId: foundMatch.teams.home.id,
          awayTeamId: foundMatch.teams.away.id,
          league: foundMatch.league.name,
          leagueId: foundMatch.league.id,
          season: foundMatch.league.season,
          date: foundMatch.fixture.date,
          status: foundMatch.fixture.status.long
        });
        console.log(`   ✅ ${foundMatch.teams.home.name} vs ${foundMatch.teams.away.name}`);
      } else {
        unmatchedMatches.push(extracted);
        console.log(`   ❌ Eşleşmedi: ${extracted.homeTeam} vs ${extracted.awayTeam}`);
      }
    }

    console.log(`\n🎯 Sonuç: ${matchedMatches.length}/${extractedMatches.length} maç eşleştirildi`);

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
        message: 'Maçlar Football API\'de bulunamadı. Krediniz iade edildi.',
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
      
      // Son 10 maçları al
      console.log(`      📅 Son maçlar alınıyor...`);
      const homeRecentMatches = await getRecentMatches(match.homeTeamId, 10, FOOTBALL_API_KEY);
      const awayRecentMatches = await getRecentMatches(match.awayTeamId, 10, FOOTBALL_API_KEY);
      
      await new Promise(resolve => setTimeout(resolve, 300)); // Rate limit

      // H2H maçları al
      console.log(`      🤝 Head-to-head geçmişi alınıyor...`);
      const h2hMatches = await getH2HMatches(match.homeTeamId, match.awayTeamId, FOOTBALL_API_KEY);
      
      await new Promise(resolve => setTimeout(resolve, 300)); // Rate limit

      // Form analizleri yap
      const homeForm = analyzeTeamForm(homeRecentMatches, match.homeTeamId);
      const awayForm = analyzeTeamForm(awayRecentMatches, match.awayTeamId);

      // H2H analizi
      let h2hStats = {
        totalMatches: h2hMatches.length,
        homeWins: 0,
        draws: 0,
        awayWins: 0,
        avgGoals: 0
      };

      if (h2hMatches.length > 0) {
        let totalGoals = 0;
        h2hMatches.forEach(h2h => {
          const homeGoals = h2h.goals.home;
          const awayGoals = h2h.goals.away;
          totalGoals += (homeGoals + awayGoals);

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
      }

      // Verileri kaydet
      match.statistics = {
        home: homeForm,
        away: awayForm,
        h2h: h2hStats
      };

      console.log(`      ✅ Ev sahibi: ${homeForm.wins}G ${homeForm.draws}B ${homeForm.losses}M (Form: ${homeForm.form})`);
      console.log(`      ✅ Deplasman: ${awayForm.wins}G ${awayForm.draws}B ${awayForm.losses}M (Form: ${awayForm.form})`);
      console.log(`      ✅ H2H: ${h2hStats.homeWins}/${h2hStats.draws}/${h2hStats.awayWins} (${h2hStats.totalMatches} maç)`);
    }

    // ========== ADIM 5: Gemini ile KAPSAMLI Tahminler ==========
    console.log('\n🤖 ADIM 5: Gemini ile kapsamlı tahminler yapılıyor...');
    
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
   
   📊 EV SAHİBİ FORMU:
      Son 10 Maç: ${stats.home.wins}G ${stats.home.draws}B ${stats.home.losses}M
      Form: ${stats.home.form} (${stats.home.formPoints} puan)
      Goller: ${stats.home.goalsFor} attı / ${stats.home.goalsAgainst} yedi
      Maç Başı Ort: ${stats.home.avgGoalsFor} gol atıyor / ${stats.home.avgGoalsAgainst} yiyor
   
   📊 DEPLASMAN FORMU:
      Son 10 Maç: ${stats.away.wins}G ${stats.away.draws}B ${stats.away.losses}M
      Form: ${stats.away.form} (${stats.away.formPoints} puan)
      Goller: ${stats.away.goalsFor} attı / ${stats.away.goalsAgainst} yedi
      Maç Başı Ort: ${stats.away.avgGoalsFor} gol atıyor / ${stats.away.avgGoalsAgainst} yiyor
   
   🤝 HEAD-TO-HEAD (Son ${stats.h2h.totalMatches} Maç):
      Ev Sahibi Galibiyet: ${stats.h2h.homeWins}
      Beraberlik: ${stats.h2h.draws}
      Deplasman Galibiyet: ${stats.h2h.awayWins}
      Ortalama Gol: ${stats.h2h.avgGoals} gol/maç`;
    }).join('\n\n' + '-'.repeat(70) + '\n\n');

    const comprehensivePrompt = `Sen PROFESYONEL bir futbol analisti ve istatistik uzmanısın.

Aşağıdaki maçlar için "${predictionType}" tahmini yap.

${matchesText}

ANALİZ YÖNTEMİ:
1. Son 10 maç formu - takımların güncel durumu
2. Gol ortalamaları - hücum ve savunma gücü  
3. Head-to-head geçmiş - psikolojik üstünlük
4. Ev sahibi avantajı - istatistiksel faktör
5. Form puanları - momentum analizi

TAHMİN KURALLARI:
- Maç Sonucu: "1" (ev sahibi), "X" (beraberlik), "2" (deplasman)
- Alt/Üst: "Alt" (0-2 gol), "Üst" (3+ gol) - ortalama gol sayısına göre
- Karşılıklı Gol: "Var" (iki takım da gol atar), "Yok" (en az biri gol atmaz)
- İlk Yarı: İlk 45 dakika tahmini
- Kombine: "1 & Üst & Var" gibi

ÇIKTI FORMATI (JSON):
{
  "predictions": [
    {
      "matchIndex": 0,
      "homeTeam": "Takım adı",
      "awayTeam": "Takım adı",
      "macSonucu": "1/X/2",
      "altustu": "Alt/Üst",
      "karsilikliGol": "Var/Yok",
      "ilkYariSonucu": "1/X/2",
      "confidence": 55-85,
      "reasoning": "İstatistiklere dayalı detaylı açıklama (150 karakter max)",
      "keyFactors": ["Faktör 1", "Faktör 2", "Faktör 3"]
    }
  ]
}

ÖNEMLİ:
- matchIndex 0'dan başla
- Tüm tahmin türlerini (macSonucu, altustu, karsilikliGol, ilkYariSonucu) ver
- confidence 55-85 arası (aşırı güven verme)
- reasoning'de kullandığın istatistikleri belirt
- keyFactors 3 önemli faktör içermeli
- SADECE JSON yanıt ver`;

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
                macSonucu: pred.macSonucu || 'Tahmin yapılamadı',
                altustu: pred.altustu || 'Tahmin yapılamadı',
                karsilikliGol: pred.karsilikliGol || 'Tahmin yapılamadı',
                ilkYariSonucu: pred.ilkYariSonucu || 'Tahmin yapılamadı',
                confidence: pred.confidence || 50,
                reasoning: pred.reasoning || '',
                keyFactors: pred.keyFactors || []
              };
            }
          });
          
          console.log(`✅ ${predictions.length} kapsamlı tahmin tamamlandı`);
        } catch (predParseError) {
          console.error('⚠️ Tahmin parse hatası:', predParseError.message);
          matchedMatches.forEach(m => {
            if (!m.predictions) {
              m.predictions = {
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
    console.log('✅ KAPSAMLI ANALİZ TAMAMLANDI!');
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
