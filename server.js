import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import multer from 'multer';

// Load environment variables
dotenv.config();

// Configure multer for file uploads (memory storage)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

let firebaseDb = null;

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

  if (serviceAccount.project_id) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.VITE_FIREBASE_DATABASE_URL
    });
    firebaseDb = admin.database();
    console.log('✅ Firebase Admin initialized');
  } else {
    console.log('⚠️  Firebase Admin not configured (optional)');
  }
} catch (error) {
  console.log('⚠️  Firebase Admin initialization skipped:', error.message);
}

// CORS ayarları
app.use(cors());
app.use(express.json());

// API credentials
const SPORTSRADAR_API_KEY = process.env.VITE_SPORTSRADAR_API_KEY;
const SPORTSRADAR_API_BASE = process.env.VITE_SPORTSRADAR_API_BASE_URL || 'https://api.sportradar.com';
const FOOTBALL_API_KEY = process.env.VITE_FOOTBALL_API_KEY || process.env.VITE_API_FOOTBALL_KEY;
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

let lastMatchFetch = 0;
const FETCH_INTERVAL = 60 * 60 * 1000;
const CLEANUP_INTERVAL = 60 * 60 * 1000;
let dailyApiCalls = 0;
let lastApiResetTime = Date.now();
const MAX_DAILY_CALLS = 90;

function resetDailyApiCallsIfNeeded() {
  const now = Date.now();
  const hoursSinceReset = (now - lastApiResetTime) / (60 * 60 * 1000);

  if (hoursSinceReset >= 24) {
    dailyApiCalls = 0;
    lastApiResetTime = now;
    console.log('🔄 Daily API call counter reset');
  }
}

function canMakeApiCall() {
  resetDailyApiCallsIfNeeded();
  return dailyApiCalls < MAX_DAILY_CALLS;
}

function incrementApiCall() {
  dailyApiCalls++;
  console.log(`📊 API Calls Today: ${dailyApiCalls}/${MAX_DAILY_CALLS}`);
}

app.get('/api/health', (req, res) => {
  resetDailyApiCallsIfNeeded();
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    sportsradarConfigured: !!SPORTSRADAR_API_KEY,
    footballApiConfigured: !!FOOTBALL_API_KEY,
    firebaseConnected: !!firebaseDb,
    apiCallsToday: dailyApiCalls,
    apiCallsRemaining: MAX_DAILY_CALLS - dailyApiCalls,
    lastMatchFetch: lastMatchFetch > 0 ? new Date(lastMatchFetch).toISOString() : 'Never',
    nextMatchFetch: lastMatchFetch > 0 ? new Date(lastMatchFetch + FETCH_INTERVAL).toISOString() : 'Soon'
  });
});

// 🆕 API-Football Proxy Endpoint (CORS sorununu çözer)
app.get('/api/football/*', async (req, res) => {
  try {
    const endpoint = req.params[0];
    
    if (!FOOTBALL_API_KEY) {
      return res.status(500).json({ error: 'API-Football key yapılandırılmamış' });
    }

    console.log(`📡 API-Football isteği: ${endpoint}`, req.query);

    const response = await axios.get(
      `https://v3.football.api-sports.io/${endpoint}`,
      {
        params: req.query,
        headers: {
          'x-apisports-key': FOOTBALL_API_KEY,
        },
        timeout: 30000,
      }
    );

    console.log(`✅ API yanıtı alındı: ${endpoint}`);
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

// Sportsradar Proxy Endpoint
app.get('/api/sportsradar-proxy', async (req, res) => {
  try {
    const { endpoint } = req.query;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint parametresi gerekli' });
    }

    if (!SPORTSRADAR_API_KEY) {
      return res.status(500).json({ error: 'Sportsradar API key yapılandırılmamış' });
    }

    const url = `${SPORTSRADAR_API_BASE}/soccer/trial/v4/en${endpoint}`;
    console.log('🌐 Proxy Request:', url);

    const response = await axios.get(url, {
      params: { api_key: SPORTSRADAR_API_KEY },
      timeout: 30000,
      headers: {
        'Accept': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Proxy hatası:', error.response?.data || error.message);
    
    const status = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    res.status(status).json({
      error: 'API hatası',
      details: errorData,
      endpoint: req.query.endpoint
    });
  }
});

// 🆕 Gelişmiş Gemini Analiz Endpoint (Football API istatistikleri ile)
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key yapılandırılmamış' });
    }

    console.log('🤖 Gemini analiz isteği alındı');

    // Eğer matches bilgisi varsa, Football API'den istatistikleri çek
    const { matches, contents, userId, creditsToDeduct } = req.body;
    
    if (matches && matches.length > 0) {
      console.log(`⚽ ${matches.length} maç için Football API istatistikleri çekiliyor...`);
      
      // Her maç için istatistik çek
      const enrichedMatches = await Promise.all(
        matches.map(async (match) => {
          try {
            if (!FOOTBALL_API_KEY) {
              return match;
            }

            // H2H (Head to Head) istatistikleri
            const h2hResponse = await axios.get('https://v3.football.api-sports.io/fixtures/headtohead', {
              headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': FOOTBALL_API_KEY
              },
              params: {
                h2h: `${match.homeTeamId}-${match.awayTeamId}`,
                last: 5
              },
              timeout: 10000
            });

            // Takım istatistikleri
            const statsResponse = await axios.get('https://v3.football.api-sports.io/teams/statistics', {
              headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': FOOTBALL_API_KEY
              },
              params: {
                team: match.homeTeamId,
                season: new Date().getFullYear(),
                league: match.leagueId
              },
              timeout: 10000
            });

            const h2hData = h2hResponse.data?.response || [];
            const statsData = statsResponse.data?.response || {};

            return {
              ...match,
              h2h: h2hData.slice(0, 5).map(f => ({
                date: f.fixture.date,
                homeTeam: f.teams.home.name,
                awayTeam: f.teams.away.name,
                score: `${f.goals.home}-${f.goals.away}`
              })),
              stats: {
                form: statsData.form || 'N/A',
                wins: statsData.fixtures?.wins?.total || 0,
                draws: statsData.fixtures?.draws?.total || 0,
                loses: statsData.fixtures?.loses?.total || 0,
                goalsFor: statsData.goals?.for?.total?.total || 0,
                goalsAgainst: statsData.goals?.against?.total?.total || 0
              }
            };
          } catch (err) {
            console.error(`⚠️ ${match.homeTeam} istatistiği alınamadı:`, err.message);
            return match;
          }
        })
      );

      console.log('✅ İstatistikler alındı, Gemini\'ye gönderiliyor...');

      // İstatistiklerle zenginleştirilmiş prompt oluştur
      const enrichedPrompt = buildEnrichedPrompt(enrichedMatches, contents);

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        enrichedPrompt,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000
        }
      );

      // ✅ Analiz başarılı, kredi düşür
      if (userId && creditsToDeduct && firebaseAdmin) {
        try {
          const userRef = firebaseAdmin.database().ref(`users/${userId}`);
          const userSnapshot = await userRef.once('value');
          const userData = userSnapshot.val();
          
          if (userData && userData.credits >= creditsToDeduct) {
            await userRef.update({
              credits: userData.credits - creditsToDeduct
            });
            console.log(`💳 Kredi düşürüldü: ${userId} → ${creditsToDeduct} kredi`);
          }
        } catch (creditError) {
          console.error('⚠️ Kredi düşürme hatası:', creditError.message);
          // Hata olsa bile analiz sonucunu döndür
        }
      }

      return res.json(response.data);
    }

    // Standart istek (matches yok)
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      req.body,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('❌ Gemini API hatası:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Gemini analiz hatası',
      details: error.response?.data || error.message 
    });
  }
});

function buildEnrichedPrompt(matches, originalContents) {
  const originalPrompt = originalContents?.[0]?.parts?.[0]?.text || '';
  
  let enrichedText = originalPrompt + '\n\n📊 GERÇEK İSTATİSTİKLER (Football API):\n\n';
  
  matches.forEach((match, index) => {
    enrichedText += `${index + 1}. ${match.homeTeam} vs ${match.awayTeam}\n`;
    
    if (match.stats) {
      enrichedText += `   📈 Form: ${match.stats.form}\n`;
      enrichedText += `   ⚽ Galibiyet/Beraberlik/Mağlubiyet: ${match.stats.wins}/${match.stats.draws}/${match.stats.loses}\n`;
      enrichedText += `   🎯 Atılan Gol: ${match.stats.goalsFor} | Yenilen: ${match.stats.goalsAgainst}\n`;
    }
    
    if (match.h2h && match.h2h.length > 0) {
      enrichedText += `   🔄 Son 5 H2H:\n`;
      match.h2h.forEach(h => {
        enrichedText += `      • ${h.homeTeam} ${h.score} ${h.awayTeam}\n`;
      });
    }
    
    enrichedText += '\n';
  });
  
  enrichedText += '\n⚠️ Yukarıdaki GERÇEK istatistikleri kullanarak analiz yap!\n';
  
  return {
    contents: [{
      parts: [{
        text: enrichedText
      }]
    }]
  };
}

// 🆕 Kupon Görseli Analiz Endpoint
app.post('/api/analyze-coupon-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Görsel dosyası gerekli' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key yapılandırılmamış' });
    }

    console.log('🖼️  Kupon görseli alındı, boyut:', req.file.size, 'bytes');

    // Convert image to base64
    const imageBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';

    // Step 1: OCR ile metin çıkarma (Gemini Vision API)
    console.log('📝 OCR işlemi başlatılıyor...');
    
    const ocrPrompt = `Bu bahis kuponundaki tüm maç bilgilerini çıkar. 
Her maç için şu formatta bilgi ver:
- Ev Sahibi Takım adı
- Deplasman Takım adı  
- Lig/Turnuva adı (varsa)

Sadece maç bilgilerini ver, diğer metinleri (oran, tarih vb.) görmezden gel.
Her maçı ayrı satırda listele. Format: "Ev Sahibi vs Deplasman - Lig"`;

    const ocrResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            { text: ocrPrompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64
              }
            }
          ]
        }]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );

    const ocrText = ocrResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('✅ OCR tamamlandı');
    console.log('📄 Çıkarılan metin:', ocrText);

    // Step 2: Maç isimlerini parse et ve temizle
    const matches = parseMatchesFromText(ocrText);
    console.log(`🔍 ${matches.length} maç bulundu`);

    if (matches.length === 0) {
      return res.json({
        success: false,
        message: 'Görselde maç bilgisi bulunamadı',
        ocrText,
        matches: []
      });
    }

    // Step 3: Football API'den maçları ara ve eşleştir
    console.log('⚽ Maçlar Football API\'den aranıyor...');
    const matchedMatches = await findMatchesInAPI(matches);
    console.log(`✅ ${matchedMatches.length} maç eşleştirildi`);

    // Step 4: Eşleşen maçları Gemini ile analiz et
    if (matchedMatches.length > 0) {
      console.log('🤖 Gemini ile analiz başlatılıyor...');
      
      const analysisPrompt = generateAnalysisPrompt(matchedMatches);
      
      const analysisResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: analysisPrompt }] }]
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000
        }
      );

      const analysis = analysisResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Analiz yapılamadı';
      console.log('✅ Analiz tamamlandı');

      return res.json({
        success: true,
        ocrText,
        extractedMatches: matches,
        matchedMatches,
        analysis
      });
    }

    return res.json({
      success: true,
      message: 'Maçlar çıkarıldı ama API\'de eşleştirilemedi',
      ocrText,
      extractedMatches: matches,
      matchedMatches: []
    });

  } catch (error) {
    console.error('❌ Kupon analizi hatası:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Kupon analizi başarısız',
      details: error.message 
    });
  }
});

// Yardımcı fonksiyonlar
function parseMatchesFromText(text) {
  const matches = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    // Format: "Home vs Away - League" veya "Home - Away (League)"
    const vsMatch = line.match(/(.+?)\s+vs\.?\s+(.+?)(?:\s*-\s*(.+))?$/i);
    const dashMatch = line.match(/(.+?)\s*-\s*(.+?)(?:\s*\((.+?)\))?$/);
    
    if (vsMatch) {
      matches.push({
        homeTeam: cleanTeamName(vsMatch[1]),
        awayTeam: cleanTeamName(vsMatch[2]),
        league: vsMatch[3] ? cleanLeagueName(vsMatch[3]) : null
      });
    } else if (dashMatch && !line.includes('€') && !line.includes('TL')) {
      matches.push({
        homeTeam: cleanTeamName(dashMatch[1]),
        awayTeam: cleanTeamName(dashMatch[2]),
        league: dashMatch[3] ? cleanLeagueName(dashMatch[3]) : null
      });
    }
  }
  
  return matches;
}

function cleanTeamName(name) {
  return name
    .trim()
    .replace(/^\d+[\.\)]\s*/, '') // Başlangıçtaki sayıları kaldır
    .replace(/\s+/g, ' ')
    .replace(/[^\w\sğüşöçİĞÜŞÖÇ\-]/gi, '');
}

function cleanLeagueName(name) {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\sğüşöçİĞÜŞÖÇ\-]/gi, '');
}

async function findMatchesInAPI(extractedMatches) {
  const matched = [];
  
  // Get today and tomorrow matches
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  try {
    // Fetch matches from API
    const todayResponse = await axios.get('https://v3.football.api-sports.io/fixtures', {
      headers: { 'x-apisports-key': FOOTBALL_API_KEY },
      params: { date: today },
      timeout: 15000
    });

    const tomorrowResponse = await axios.get('https://v3.football.api-sports.io/fixtures', {
      headers: { 'x-apisports-key': FOOTBALL_API_KEY },
      params: { date: tomorrow },
      timeout: 15000
    });

    const allFixtures = [
      ...(todayResponse.data?.response || []),
      ...(tomorrowResponse.data?.response || [])
    ];

    // Match each extracted match
    for (const extracted of extractedMatches) {
      const match = findBestMatch(extracted, allFixtures);
      if (match) {
        matched.push({
          extracted,
          apiMatch: {
            fixtureId: match.fixture.id,
            homeTeam: match.teams.home.name,
            awayTeam: match.teams.away.name,
            league: match.league.name,
            date: match.fixture.date,
            status: match.fixture.status.short
          }
        });
      }
    }
  } catch (error) {
    console.error('❌ API eşleştirme hatası:', error.message);
  }
  
  return matched;
}

function findBestMatch(extracted, fixtures) {
  let bestMatch = null;
  let bestScore = 0;
  
  for (const fixture of fixtures) {
    const homeTeamApi = fixture.teams.home.name.toLowerCase();
    const awayTeamApi = fixture.teams.away.name.toLowerCase();
    const homeTeamExtracted = extracted.homeTeam.toLowerCase();
    const awayTeamExtracted = extracted.awayTeam.toLowerCase();
    
    // Simple similarity check
    const homeScore = calculateSimilarity(homeTeamExtracted, homeTeamApi);
    const awayScore = calculateSimilarity(awayTeamExtracted, awayTeamApi);
    const totalScore = homeScore + awayScore;
    
    if (totalScore > bestScore && totalScore > 1.0) { // Minimum similarity threshold
      bestScore = totalScore;
      bestMatch = fixture;
    }
  }
  
  return bestMatch;
}

function calculateSimilarity(str1, str2) {
  // Simple contains check with scoring
  if (str1 === str2) return 2.0;
  if (str1.includes(str2) || str2.includes(str1)) return 1.5;
  
  // Check word overlap
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  const overlap = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));
  
  return overlap.length * 0.5;
}

function generateAnalysisPrompt(matchedMatches) {
  let prompt = `Aşağıdaki bahis kuponu için profesyonel analiz yap:\n\n`;
  
  matchedMatches.forEach((match, index) => {
    prompt += `${index + 1}. ${match.apiMatch.homeTeam} vs ${match.apiMatch.awayTeam}\n`;
    prompt += `   Lig: ${match.apiMatch.league}\n`;
    prompt += `   Durum: ${match.apiMatch.status}\n\n`;
  });
  
  prompt += `\nLütfen her maç için:\n`;
  prompt += `- Genel değerlendirme\n`;
  prompt += `- Olası sonuç tahmini\n`;
  prompt += `- Risk analizi\n`;
  prompt += `- Genel kupon değerlendirmesi\n\n`;
  prompt += `Profesyonel ve detaylı bir analiz yap.`;
  
  return prompt;
}

// Static files (React build)
app.use(express.static(join(__dirname, 'dist')));

// React routing (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

async function fetchAndCacheMatches(forceUpdate = false) {
  if (!firebaseDb || !FOOTBALL_API_KEY) {
    console.log('⚠️  Match fetching disabled (Firebase or API key missing)');
    return;
  }

  if (!forceUpdate && !canMakeApiCall()) {
    console.log('⚠️  API call limit reached for today. Using cached data.');
    return;
  }

  try {
    console.log('🔄 Fetching today and tomorrow matches...');

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    incrementApiCall();
    const todayData = await axios.get('https://v3.football.api-sports.io/fixtures', {
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': FOOTBALL_API_KEY
      },
      params: { date: today },
      timeout: 15000
    });

    incrementApiCall();
    const tomorrowData = await axios.get('https://v3.football.api-sports.io/fixtures', {
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': FOOTBALL_API_KEY
      },
      params: { date: tomorrow },
      timeout: 15000
    });

    const processMatches = (fixtures, date) => {
      const matches = {};
      let count = 0;
      const now = Date.now();

      fixtures.forEach(fixture => {
        const status = fixture.fixture.status.short;
        const matchTime = new Date(fixture.fixture.date);

        // ✅ Bitmiş maçları filtrele
        if (status === 'FT' || status === 'AET' || status === 'PEN') {
          return;
        }

        // ✅ 1 saatten eski maçları gösterme
        if (matchTime.getTime() < now - 3600000) {
          return;
        }

        if (count >= 50) {
          return;
        }

        // ✅ Türkiye saatine çevir (UTC+3)
        const turkeyTime = new Date(matchTime.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
        
        matches[fixture.fixture.id] = {
          fixtureId: fixture.fixture.id,
          homeTeam: fixture.teams.home.name,
          homeTeamId: fixture.teams.home.id,
          awayTeam: fixture.teams.away.name,
          awayTeamId: fixture.teams.away.id,
          league: fixture.league.name,
          leagueId: fixture.league.id,
          date: date,
          time: turkeyTime.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }),
          timestamp: matchTime.getTime(),
          turkeyTimestamp: turkeyTime.getTime(),
          status: status === 'LIVE' || status === '1H' || status === '2H' ? 'live' : 'scheduled',
          lastUpdated: Date.now()
        };
        count++;
      });
      return matches;
    };

    if (todayData.data?.response?.length > 0) {
      const todayMatches = processMatches(todayData.data.response, today);
      await firebaseDb.ref(`matches/${today}`).set(todayMatches);
      console.log(`✅ Saved ${Object.keys(todayMatches).length} matches for ${today}`);
    }

    if (tomorrowData.data?.response?.length > 0) {
      const tomorrowMatches = processMatches(tomorrowData.data.response, tomorrow);
      await firebaseDb.ref(`matches/${tomorrow}`).set(tomorrowMatches);
      console.log(`✅ Saved ${Object.keys(tomorrowMatches).length} matches for ${tomorrow}`);
    }

    await cleanFinishedMatches();
    lastMatchFetch = Date.now();

  } catch (error) {
    console.error('❌ Match fetch error:', error.message);
  }
}

async function cleanFinishedMatches() {
  if (!firebaseDb) return;

  try {
    console.log('🧹 Eski maçlar temizleniyor...');
    
    // ✅ Dünün ve bugünün maçlarını kontrol et
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    const dates = [yesterday, today];
    let deletedCount = 0;

    for (const date of dates) {
      const snapshot = await firebaseDb.ref(`matches/${date}`).once('value');
      
      if (snapshot.exists()) {
        const matchesData = snapshot.val();
        
        for (const fixtureId of Object.keys(matchesData)) {
          const match = matchesData[fixtureId];
          
          // ✅ Bitmiş veya 6 saatten eski maçları sil
          if (match.status === 'finished' || match.timestamp < Date.now() - 21600000) {
            await firebaseDb.ref(`matches/${date}/${fixtureId}`).remove();
            deletedCount++;
          }
        }
      }
    }

    // ✅ Dünün tüm verilerini temizle
    await firebaseDb.ref(`matches/${yesterday}`).remove();
    
    console.log(`✅ ${deletedCount} geçmiş maç temizlendi`);
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
  }
}

app.get('/api/trigger-match-fetch', async (req, res) => {
  const timeSinceLastFetch = Date.now() - lastMatchFetch;
  const canFetch = timeSinceLastFetch >= FETCH_INTERVAL;

  if (!canFetch && !req.query.force) {
    return res.json({
      message: 'Match data is fresh',
      lastFetch: new Date(lastMatchFetch).toISOString(),
      nextFetch: new Date(lastMatchFetch + FETCH_INTERVAL).toISOString(),
      minutesUntilNextFetch: Math.ceil((FETCH_INTERVAL - timeSinceLastFetch) / 60000),
      apiCallsRemaining: MAX_DAILY_CALLS - dailyApiCalls
    });
  }

  await fetchAndCacheMatches(!!req.query.force);
  res.json({
    message: 'Match fetch triggered',
    timestamp: Date.now(),
    apiCallsUsed: dailyApiCalls,
    apiCallsRemaining: MAX_DAILY_CALLS - dailyApiCalls
  });
});

setInterval(fetchAndCacheMatches, FETCH_INTERVAL);

setInterval(cleanFinishedMatches, 60 * 60 * 1000);

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Sportsradar API: ${SPORTSRADAR_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
  console.log(`⚽ Football API: ${FOOTBALL_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
  console.log(`🔥 Firebase: ${firebaseDb ? 'Connected ✅' : 'Disabled ❌'}`);
  console.log(`⏱️  Update Interval: ${FETCH_INTERVAL / 60000} minutes`);
  console.log(`🧹 Cleanup Interval: ${CLEANUP_INTERVAL / 60000} minutes`);
  console.log(`📊 Daily API Limit: ${MAX_DAILY_CALLS} calls`);

  if (firebaseDb && FOOTBALL_API_KEY) {
    console.log('🔄 Starting initial match fetch...');
    await fetchAndCacheMatches(true);
  }
});