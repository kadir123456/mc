// backend/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ Firebase Admin SDK başlatma
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
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
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/football/*',
      'POST /api/gemini/analyze'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend sunucusu ${PORT} portunda çalışıyor`);
  console.log(`📡 API-Football proxy: /api/football/*`);
  console.log(`🧠 Gemini analiz: /api/gemini/analyze`);
});
