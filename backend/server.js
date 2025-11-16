// backend/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
const multer = require('multer');
require('dotenv').config();

// Multer ayarları (memory storage - dosyayı RAM'de tut)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ Firebase Admin SDK başlatma
if (!admin.apps.length) {
  // Service account'u parse et
  let serviceAccount;
  
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // .env dosyasından JSON string olarak geliyorsa
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT parse hatası:', e);
    }
  }
  
  // Eğer parse edemediyse veya yoksa, ayrı ayrı environment variables'dan oku
  if (!serviceAccount) {
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
  }

  const databaseURL = process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL
  });
  
  console.log('✅ Firebase Admin SDK başlatıldı');
}

const db = admin.database();

// CORS ayarları
app.use(cors({
  origin: '*', // Production'da: 'https://aikupon.com'
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

// ============================================
// API-FOOTBALL PROXY ENDPOINT (Zaten var, dokunma)
// ============================================
app.get('/api/football/*', async (req, res) => {
  try {
    const endpoint = req.params[0];
    const API_KEY = process.env.API_FOOTBALL_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ error: 'API key bulunamadı' });
    }

    console.log(`📡 API-Football isteği: ${endpoint}`, req.query);

    const response = await axios.get(
      `https://v3.football.api-sports.io/${endpoint}`,
      {
        params: req.query,
        headers: {
          'x-apisports-key': API_KEY,
        },
        timeout: 30000,
      }
    );

    console.log(`✅ API-Football yanıtı alındı: ${endpoint}`);
    res.json(response.data);

  } catch (error) {
    console.error('❌ API-Football hatası:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Rate limit aşıldı' });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'API key geçersiz' });
    }

    res.status(500).json({ 
      error: 'API isteği başarısız',
      details: error.message 
    });
  }
});

// ============================================
// 🆕 GEMINI API ENDPOINT (YENİ EKLENEN)
// ============================================
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { userId, creditsToDeduct, matches, contents, generationConfig } = req.body;

    console.log('🧠 Gemini analiz isteği alındı');
    console.log(`👤 Kullanıcı: ${userId}`);
    console.log(`💰 Harcanacak kredi: ${creditsToDeduct}`);
    console.log(`⚽ Maç sayısı: ${matches?.length || 0}`);

    // ✅ 1. ADIM: Kullanıcı kredisini kontrol et
    if (userId) {
      const userRef = db.ref(`users/${userId}`);
      const userSnapshot = await userRef.once('value');
      const userData = userSnapshot.val();

      if (!userData) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }

      const currentCredits = userData.credits || 0;

      if (currentCredits < creditsToDeduct) {
        return res.status(403).json({ 
          error: 'Yetersiz kredi',
          currentCredits,
          required: creditsToDeduct 
        });
      }

      console.log(`✅ Kredi kontrolü OK: ${currentCredits} >= ${creditsToDeduct}`);
    }

    // ✅ 2. ADIM: API-Football'dan gerçek istatistikleri çek
    console.log('📊 API-Football\'dan istatistikler çekiliyor...');
    
    const matchesWithStats = await Promise.allSettled(
      matches.map(async (match) => {
        try {
          const stats = await fetchMatchStats(match.homeTeam, match.awayTeam, match.league);
          return { ...match, stats };
        } catch (error) {
          console.error(`❌ ${match.homeTeam} vs ${match.awayTeam} - İstatistik alınamadı`);
          return {
            ...match,
            stats: {
              homeForm: 'Veri yok',
              awayForm: 'Veri yok',
              h2h: 'Veri yok',
              leaguePosition: 'Veri yok',
              confidenceScore: 0
            }
          };
        }
      })
    );

    const resolvedMatches = matchesWithStats.map(result => 
      result.status === 'fulfilled' ? result.value : result.reason
    );

    // ✅ 3. ADIM: Gerçek istatistiklerle Gemini prompt'u oluştur
    const enhancedPrompt = buildEnhancedPrompt(resolvedMatches, contents[0].parts[0].text);

    console.log('🧠 Gemini API\'ye istek gönderiliyor...');

    // ✅ 4. ADIM: Gemini API'ye gerçek verilerle istek at
    const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key bulunamadı' });
    }

    const geminiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: enhancedPrompt }]
          }
        ],
        generationConfig: generationConfig || {
          temperature: 0.1,
          topK: 20,
          topP: 0.9,
          maxOutputTokens: 3072,
        }
      },
      {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Gemini yanıtı alındı');

    // ✅ 5. ADIM: Krediyi düş (başarılı analiz sonrası)
    if (userId) {
      const userRef = db.ref(`users/${userId}`);
      const userSnapshot = await userRef.once('value');
      const userData = userSnapshot.val();
      const newCredits = (userData.credits || 0) - creditsToDeduct;

      await userRef.update({
        credits: Math.max(0, newCredits)
      });

      console.log(`💰 Kredi güncellendi: ${userData.credits} → ${newCredits}`);
    }

    // ✅ 6. ADIM: Yanıtı gönder
    res.json(geminiResponse.data);

  } catch (error) {
    console.error('❌ Gemini analiz hatası:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Gemini API rate limit aşıldı' });
    }

    res.status(500).json({ 
      error: 'Analiz başarısız oldu',
      details: error.message 
    });
  }
});

// ============================================
// 🆕 YARDIMCI FONKSİYONLAR
// ============================================

// API-Football'dan maç istatistiklerini çek
async function fetchMatchStats(homeTeam, awayTeam, league) {
  const API_KEY = process.env.API_FOOTBALL_KEY;
  
  // 1. Takımları bul
  const [homeTeamData, awayTeamData] = await Promise.all([
    findTeam(homeTeam, API_KEY),
    findTeam(awayTeam, API_KEY)
  ]);

  if (!homeTeamData || !awayTeamData) {
    throw new Error('Takımlar bulunamadı');
  }

  // 2. İstatistikleri çek
  const [homeForm, awayForm, h2h] = await Promise.allSettled([
    getTeamForm(homeTeamData.id, API_KEY),
    getTeamForm(awayTeamData.id, API_KEY),
    getH2H(homeTeamData.id, awayTeamData.id, API_KEY)
  ]);

  return {
    homeForm: homeForm.status === 'fulfilled' ? homeForm.value : 'Veri yok',
    awayForm: awayForm.status === 'fulfilled' ? awayForm.value : 'Veri yok',
    h2h: h2h.status === 'fulfilled' ? h2h.value : 'Veri yok',
    leaguePosition: 'Hesaplanıyor...',
    confidenceScore: 70
  };
}

// Takım ara
async function findTeam(teamName, apiKey) {
  try {
    const response = await axios.get(
      'https://v3.football.api-sports.io/teams',
      {
        params: { search: teamName },
        headers: { 'x-apisports-key': apiKey },
        timeout: 10000
      }
    );

    const teams = response.data.response;
    if (teams && teams.length > 0) {
      return teams[0].team;
    }
    return null;
  } catch (error) {
    console.error(`Takım arama hatası: ${teamName}`, error.message);
    return null;
  }
}

// Takım formu
async function getTeamForm(teamId, apiKey) {
  try {
    const response = await axios.get(
      'https://v3.football.api-sports.io/fixtures',
      {
        params: { team: teamId, last: 5, status: 'FT' },
        headers: { 'x-apisports-key': apiKey },
        timeout: 10000
      }
    );

    const fixtures = response.data.response;
    if (!fixtures || fixtures.length === 0) {
      return 'Veri yok';
    }

    let wins = 0, draws = 0, losses = 0;
    const formString = [];

    fixtures.forEach(fixture => {
      const isHome = fixture.teams.home.id === teamId;
      const teamGoals = isHome ? fixture.goals.home : fixture.goals.away;
      const opponentGoals = isHome ? fixture.goals.away : fixture.goals.home;

      if (teamGoals > opponentGoals) {
        wins++;
        formString.push('G');
      } else if (teamGoals === opponentGoals) {
        draws++;
        formString.push('B');
      } else {
        losses++;
        formString.push('M');
      }
    });

    return `Son ${fixtures.length}: ${formString.join('-')} (${wins}G ${draws}B ${losses}M)`;
  } catch (error) {
    console.error(`Form hatası: ${teamId}`, error.message);
    return 'Veri alınamadı';
  }
}

// H2H
async function getH2H(team1Id, team2Id, apiKey) {
  try {
    const response = await axios.get(
      'https://v3.football.api-sports.io/fixtures/headtohead',
      {
        params: { h2h: `${team1Id}-${team2Id}`, last: 5 },
        headers: { 'x-apisports-key': apiKey },
        timeout: 10000
      }
    );

    const fixtures = response.data.response;
    if (!fixtures || fixtures.length === 0) {
      return 'H2H verisi yok';
    }

    const scores = fixtures.map(f => `${f.goals.home}-${f.goals.away}`);
    return `Son ${fixtures.length}: ${scores.join(', ')}`;
  } catch (error) {
    console.error(`H2H hatası: ${team1Id}-${team2Id}`, error.message);
    return 'Veri alınamadı';
  }
}

// Geliştirilmiş prompt oluştur
function buildEnhancedPrompt(matchesWithStats, originalPrompt) {
  const statsSection = matchesWithStats.map((match, i) => {
    const stats = match.stats;
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MAÇ ${i + 1}: ${match.homeTeam} vs ${match.awayTeam}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Lig: ${match.league}

📊 API-FOOTBALL'DAN GELEN GERÇEK İSTATİSTİKLER:
- Ev Sahibi Form: ${stats.homeForm}
- Deplasman Form: ${stats.awayForm}
- Kafa Kafaya (H2H): ${stats.h2h}
- Güven Skoru: ${stats.confidenceScore}%
`;
  }).join('\n');

  return `
❌ GOOGLE SEARCH KULLANMA!
✅ SADECE AŞAĞIDAKİ GERÇEK İSTATİSTİKLERE DAYANARAK ANALİZ YAP!

${statsSection}

${originalPrompt.replace(/🎯 GOOGLE SEARCH KULLAN:.*?Google Search ile araştır\./gs, '')}

UYARI: Yukarıdaki API-Football verilerini kullan, başka kaynak arama!
`;
}

// ============================================
// 🆕 GÖRSEL KUPON ANALİZİ ENDPOINT
// ============================================
app.post('/api/analyze-coupon-image', upload.single('image'), async (req, res) => {
  try {
    const { userId, creditsToDeduct, selectedMarket } = req.body;
    const imageFile = req.file;

    console.log('🖼️ Görsel kupon analiz isteği alındı');
    console.log(`👤 Kullanıcı: ${userId}`);
    console.log(`💰 Kredi: ${creditsToDeduct}`);
    console.log(`📊 Seçilen Market: ${selectedMarket || 'Tümü'}`);

    if (!imageFile) {
      return res.status(400).json({ error: 'Görsel yüklenmedi' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'Kullanıcı ID gerekli' });
    }

    // ✅ 1. Kullanıcı kredisini kontrol et
    const userRef = db.ref(`users/${userId}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();

    if (!userData) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const currentCredits = userData.credits || 0;
    const requiredCredits = parseInt(creditsToDeduct) || 3;

    if (currentCredits < requiredCredits) {
      return res.status(403).json({ 
        error: 'Yetersiz kredi',
        currentCredits,
        required: requiredCredits
      });
    }

    console.log(`✅ Kredi kontrolü OK: ${currentCredits} >= ${requiredCredits}`);

    // ✅ 2. Görseli base64'e çevir
    const base64Image = imageFile.buffer.toString('base64');

    // ✅ 3. Gemini Vision API ile maçları çıkar
    console.log('🧠 Gemini Vision ile görseldeki maçlar çıkarılıyor...');
    const extractedMatches = await extractMatchesFromImage(base64Image, imageFile.mimetype);

    if (!extractedMatches || extractedMatches.length === 0) {
      // Kredi harcamadan hata döndür
      return res.status(400).json({ 
        success: false,
        error: 'Görselde maç bulunamadı. Lütfen net bir kupon görseli yükleyin.'
      });
    }

    console.log(`✅ ${extractedMatches.length} maç çıkarıldı`);

    // ✅ 4. API-Football'dan maçları bul ve eşleştir
    console.log('⚽ API-Football\'dan maçlar aranıyor...');
    const matchedMatches = await findAndMatchFixtures(extractedMatches);

    console.log(`✅ ${matchedMatches.length} maç API'de bulundu`);

    // ✅ 5. Eğer eşleşen maç varsa, Gemini'den tahmin al
    let analysisResults = [];
    if (matchedMatches.length > 0) {
      console.log('📊 Maçlar için tahmin analizi yapılıyor...');
      analysisResults = await analyzeMatchesWithMarket(matchedMatches, selectedMarket);
    }

    // ✅ 6. Krediyi düş (başarılı analiz)
    const newCredits = currentCredits - requiredCredits;
    await userRef.update({ credits: Math.max(0, newCredits) });
    console.log(`💰 Kredi güncellendi: ${currentCredits} → ${newCredits}`);

    // ✅ 7. Sonuçları döndür
    res.json({
      success: true,
      message: `${matchedMatches.length} maç başarıyla analiz edildi`,
      extractedMatches: extractedMatches,
      matchedMatches: analysisResults,
      creditsUsed: requiredCredits,
      remainingCredits: newCredits
    });

  } catch (error) {
    console.error('❌ Görsel analiz hatası:', error);
    res.status(500).json({ 
      error: 'Analiz başarısız oldu',
      details: error.message 
    });
  }
});

// ============================================
// YARDIMCI FONKSİYONLAR - Görsel Analiz
// ============================================

// Gemini Vision API ile görselden maçları çıkar
async function extractMatchesFromImage(base64Image, mimeType) {
  const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  const prompt = `Bu görsel bir bahis kuponudur. Görseldeki TÜM maçları çıkar ve JSON formatında döndür.

GÖREV:
1. Görseldeki her maçın EV SAHİBİ ve DEPLASMAN takım isimlerini çıkar
2. Varsa lig bilgisini de ekle
3. SADECE JSON formatında yanıt ver

ÇIKTI FORMATI:
{
  "matches": [
    {
      "homeTeam": "Takım Adı",
      "awayTeam": "Takım Adı",
      "league": "Lig Adı" veya null
    }
  ]
}

ÖNEMLİ:
- Türkçe karakterleri koru
- Sadece takım isimlerini çıkar, oran bilgilerini değil
- Eğer görselde maç yoksa boş array döndür: {"matches": []}
- SADECE JSON yanıtı ver, açıklama ekleme`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 20,
          topP: 0.9,
          maxOutputTokens: 2048
        }
      },
      { timeout: 30000 }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return data.matches || [];
    }
    
    return [];
  } catch (error) {
    console.error('Gemini Vision hatası:', error.response?.data || error.message);
    throw new Error('Görsel analizi başarısız oldu');
  }
}

// API-Football'dan maçları bul ve eşleştir
async function findAndMatchFixtures(extractedMatches) {
  const API_KEY = process.env.API_FOOTBALL_KEY;
  const matched = [];

  for (const extracted of extractedMatches) {
    try {
      // Takımları ara
      const homeTeamData = await findTeam(extracted.homeTeam, API_KEY);
      const awayTeamData = await findTeam(extracted.awayTeam, API_KEY);

      if (!homeTeamData || !awayTeamData) {
        console.log(`⚠️ Takımlar bulunamadı: ${extracted.homeTeam} vs ${extracted.awayTeam}`);
        continue;
      }

      // Yaklaşan maçları ara
      const fixtureResponse = await axios.get(
        'https://v3.football.api-sports.io/fixtures',
        {
          params: {
            team: homeTeamData.id,
            next: 20 // Önümüzdeki 20 maç
          },
          headers: { 'x-apisports-key': API_KEY },
          timeout: 10000
        }
      );

      const fixtures = fixtureResponse.data.response;
      
      // İki takımın karşılaştığı maçı bul
      const fixture = fixtures.find(f => 
        (f.teams.home.id === homeTeamData.id && f.teams.away.id === awayTeamData.id) ||
        (f.teams.away.id === homeTeamData.id && f.teams.home.id === awayTeamData.id)
      );

      if (fixture) {
        matched.push({
          extracted,
          apiMatch: {
            fixtureId: fixture.fixture.id,
            homeTeam: fixture.teams.home.name,
            awayTeam: fixture.teams.away.name,
            league: fixture.league.name,
            date: fixture.fixture.date,
            status: fixture.fixture.status.short
          }
        });
        console.log(`✅ Eşleşti: ${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
      } else {
        console.log(`⚠️ Maç bulunamadı: ${extracted.homeTeam} vs ${extracted.awayTeam}`);
      }

    } catch (error) {
      console.error(`Maç arama hatası: ${extracted.homeTeam} vs ${extracted.awayTeam}`, error.message);
    }
  }

  return matched;
}

// Maçlar için tahmin analizi yap (seçilen markete göre)
async function analyzeMatchesWithMarket(matchedMatches, selectedMarket) {
  const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const API_KEY = process.env.API_FOOTBALL_KEY;

  // Her maç için istatistik + tahmin al
  const results = [];

  for (const match of matchedMatches) {
    try {
      // İstatistikleri çek
      const stats = await fetchMatchStats(
        match.apiMatch.homeTeam,
        match.apiMatch.awayTeam,
        match.apiMatch.league
      );

      // Gemini'den tahmin al
      const marketPrompt = selectedMarket 
        ? `SADECE ${getMarketName(selectedMarket)} marketini analiz et ve tahmin ver.`
        : 'Tüm marketleri analiz et.';

      const prompt = `Sen profesyonel bir futbol analistisin.

MAÇ: ${match.apiMatch.homeTeam} vs ${match.apiMatch.awayTeam}
LİG: ${match.apiMatch.league}
TARİH: ${new Date(match.apiMatch.date).toLocaleString('tr-TR')}

GERÇEK İSTATİSTİKLER:
- Ev Sahibi Form: ${stats.homeForm}
- Deplasman Form: ${stats.awayForm}
- Kafa Kafaya: ${stats.h2h}

${marketPrompt}

ÇIKTI FORMATI (JSON):
{
  "ms1": { "odds": 1.85, "confidence": 75 },
  "draw": { "odds": 3.40, "confidence": 65 },
  "ms2": { "odds": 4.20, "confidence": 72 },
  "over25": { "odds": 1.70, "confidence": 80 },
  "under25": { "odds": 2.10, "confidence": 68 },
  "btts": { "odds": 1.95, "confidence": 73 },
  "bttsNo": { "odds": 1.80, "confidence": 69 },
  "firstHalfMs1": { "odds": 2.20, "confidence": 71 },
  "firstHalfDraw": { "odds": 2.10, "confidence": 66 },
  "firstHalfMs2": { "odds": 3.80, "confidence": 68 }
}

SADECE JSON döndür, açıklama ekleme.`;

      const geminiResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            topK: 20,
            topP: 0.9,
            maxOutputTokens: 1024
          }
        },
        { timeout: 30000 }
      );

      const text = geminiResponse.data.candidates[0].content.parts[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      let predictions = {};
      if (jsonMatch) {
        predictions = JSON.parse(jsonMatch[0]);
      }

      results.push({
        ...match,
        predictions,
        stats
      });

    } catch (error) {
      console.error(`Analiz hatası: ${match.apiMatch.homeTeam}`, error.message);
      results.push({
        ...match,
        predictions: null,
        stats: null,
        error: 'Analiz yapılamadı'
      });
    }
  }

  return results;
}

function getMarketName(market) {
  const names = {
    'ms1': 'MS1 (Ev Sahibi Kazanır)',
    'ms2': 'MS2 (Deplasman Kazanır)',
    'draw': 'Beraberlik (X)',
    'over25': '2.5 Üst',
    'under25': '2.5 Alt',
    'btts': 'Karşılıklı Gol Var',
    'bttsNo': 'Karşılıklı Gol Yok',
    'firstHalfMs1': 'İlk Yarı MS1',
    'firstHalfDraw': 'İlk Yarı Beraberlik',
    'firstHalfMs2': 'İlk Yarı MS2'
  };
  return names[market] || market;
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/football/*',
      'POST /api/gemini/analyze',
      'POST /api/analyze-coupon-image'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend sunucusu ${PORT} portunda çalışıyor`);
  console.log(`📡 API-Football proxy: /api/football/*`);
  console.log(`🧠 Gemini analiz: /api/gemini/analyze`);
});
