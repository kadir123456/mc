
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
import multer from 'multer';
import crypto from 'crypto';

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
    footballApiKeyPreview: FOOTBALL_API_KEY ? FOOTBALL_API_KEY.substring(0, 10) + '...' : 'MISSING',
    firebaseConnected: !!firebaseDb,
    apiCallsToday: dailyApiCalls,
    apiCallsRemaining: MAX_DAILY_CALLS - dailyApiCalls,
    lastMatchFetch: lastMatchFetch > 0 ? new Date(lastMatchFetch).toISOString() : 'Never',
    nextMatchFetch: lastMatchFetch > 0 ? new Date(lastMatchFetch + FETCH_INTERVAL).toISOString() : 'Soon'
  });
});

// 🆕 Test API Key Endpoint
app.get('/api/test-key', async (req, res) => {
  if (!FOOTBALL_API_KEY) {
    return res.status(500).json({
      error: 'FOOTBALL_API_KEY is not configured',
      env: process.env.VITE_FOOTBALL_API_KEY ? 'VITE_FOOTBALL_API_KEY exists' : 'VITE_FOOTBALL_API_KEY missing',
      alternative: process.env.VITE_API_FOOTBALL_KEY ? 'VITE_API_FOOTBALL_KEY exists' : 'VITE_API_FOOTBALL_KEY missing'
    });
  }

  try {
    console.log('🔍 Testing API key:', FOOTBALL_API_KEY.substring(0, 10) + '...');
    
    const response = await axios.get('https://v3.football.api-sports.io/timezone', {
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': FOOTBALL_API_KEY
      }
    });

    console.log('✅ API test successful');
    
    res.json({
      success: true,
      keyPreview: FOOTBALL_API_KEY.substring(0, 10) + '...',
      responseStatus: response.status,
      data: response.data
    });
  } catch (error) {
    console.error('❌ API test failed:', error.response?.status, error.response?.data);
    
    res.status(500).json({
      error: 'API test failed',
      keyPreview: FOOTBALL_API_KEY.substring(0, 10) + '...',
      status: error.response?.status,
      message: error.response?.data || error.message
    });
  }
});

// Football API endpoint - maçları çek
app.get('/api/football/matches', async (req, res) => {
  try {
    if (!FOOTBALL_API_KEY) {
      return res.status(500).json({ error: 'Football API key not configured' });
    }

    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    console.log(`⚽ Fetching matches for date: ${targetDate}`);

    const response = await axios.get('https://v3.football.api-sports.io/fixtures', {
      params: { date: targetDate },
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': FOOTBALL_API_KEY
      }
    });

    console.log(`✅ Received ${response.data.response?.length || 0} matches`);

    res.json(response.data);
  } catch (error) {
    console.error('❌ Error fetching matches:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Gemini AI analiz endpoint (eski format - geriye dönük uyumluluk)
app.post('/api/analyze', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const { homeTeam, awayTeam, matchData } = req.body;

    if (!homeTeam || !awayTeam) {
      return res.status(400).json({ error: 'Home team and away team are required' });
    }

    const prompt = `
Futbol maç analizi:
Ev Sahibi: ${homeTeam}
Deplasman: ${awayTeam}

${matchData ? `Maç Verileri: ${JSON.stringify(matchData)}` : ''}

Lütfen bu maç için detaylı bir analiz yap ve şu formatta JSON döndür:
{
  "prediction": "1 / X / 2",
  "confidence": 0-100 arası sayı,
  "analysis": "Detaylı analiz metni",
  "keyFactors": ["faktör 1", "faktör 2", "faktör 3"]
}
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      }
    );

    const textResponse = response.data.candidates[0].content.parts[0].text;
    
    try {
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        prediction: "X",
        confidence: 50,
        analysis: textResponse,
        keyFactors: []
      };

      res.json(analysis);
    } catch (parseError) {
      res.json({
        prediction: "X",
        confidence: 50,
        analysis: textResponse,
        keyFactors: []
      });
    }

  } catch (error) {
    console.error('❌ Gemini analysis error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================== GEMİNİ YENİ ENDPOINTS ====================

// Bülten Analiz Endpoint (Frontend için)
app.post('/api/gemini/analyze', async (req, res) => {
  try {
    const { matches, contents, generationConfig } = req.body;
    
    if (!GEMINI_API_KEY) {
      console.error('❌ Gemini API key bulunamadı');
      return res.status(500).json({ error: 'Gemini API key yapılandırılmamış' });
    }

    if (!matches || !Array.isArray(matches)) {
      return res.status(400).json({ error: 'Geçersiz maç verisi' });
    }

    console.log(`🤖 Gemini analizi başlatılıyor: ${matches.length} maç`);

    // Frontend'den gelen prompt'u kullan veya varsayılan oluştur
    let prompt = contents?.[0]?.parts?.[0]?.text;
    
    if (!prompt) {
      // Varsayılan prompt
      prompt = `Sen bir futbol analiz uzmanısın. Aşağıdaki maçları analiz et ve her maç için tahmin yap.

Maçlar:
${matches.map((m, i) => `${i + 1}. ${m.homeTeam} vs ${m.awayTeam}
   - Lig: ${m.league}
   ${m.statistics ? `- İstatistikler: ${JSON.stringify(m.statistics)}` : ''}`).join('\n\n')}

Her maç için şu formatta JSON yanıt ver:
{
  "match1": {
    "ms1": "yüzde",
    "msX": "yüzde",
    "ms2": "yüzde",
    "over25": "yüzde",
    "under25": "yüzde",
    "btts": "yüzde",
    "recommendation": "öneri",
    "confidence": 0-100
  }
}

SADECE JSON yanıt ver, başka metin ekleme.`;
    }

    // Gemini API'ye istek
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: generationConfig || {
          temperature: 0.1,
          maxOutputTokens: 3072
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );

    console.log(`✅ Gemini yanıtı alındı`);
    
    res.json(response.data);

  } catch (error) {
    console.error('❌ Gemini analiz hatası:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Analiz yapılamadı',
      details: error.message 
    });
  }
});

// Görsel Analiz Endpoint (Frontend için)
app.post('/api/gemini/analyze-image', async (req, res) => {
  try {
    const { image, prompt } = req.body;
    
    if (!GEMINI_API_KEY) {
      console.error('❌ Gemini API key bulunamadı');
      return res.status(500).json({ error: 'Gemini API key yapılandırılmamış' });
    }

    if (!image) {
      return res.status(400).json({ error: 'Görsel bulunamadı' });
    }

    console.log('🖼️ Görsel analizi başlatılıyor...');

    // Base64'ten data:image prefix'ini temizle
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    // Gemini Vision API'ye istek
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            {
              text: prompt || `Bu futbol bültenini analiz et. Maçları, oranları ve önerilen tahminleri çıkar. 
              
Yanıtı şu JSON formatında ver:
{
  "matches": [
    {
      "homeTeam": "takım adı",
      "awayTeam": "takım adı",
      "odds": { "1": oran, "X": oran, "2": oran },
      "recommendation": "1/X/2",
      "confidence": 0-100
    }
  ],
  "summary": "genel değerlendirme"
}

SADECE JSON yanıt ver.`
            },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2000
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000
      }
    );

    const geminiText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!geminiText) {
      throw new Error('Gemini yanıtı alınamadı');
    }

    // JSON parse et
    const jsonMatch = geminiText.match(/\{[\s\S]*\}/);
    const analysisData = jsonMatch ? JSON.parse(jsonMatch[0]) : { matches: [], summary: '' };

    console.log(`✅ Görsel analizi tamamlandı: ${analysisData.matches?.length || 0} maç bulundu`);
    
    res.json(analysisData);

  } catch (error) {
    console.error('❌ Görsel analiz hatası:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Görsel analizi yapılamadı',
      details: error.message 
    });
  }
});

// Maç verilerini Firebase'e kaydet - DÜZELTİLDİ: TÜM MAÇLARI KAYDEDİYOR
async function saveMatchesToFirebase(matches, date) {
  if (!firebaseDb) {
    console.log('⚠️  Firebase not available, skipping save');
    return;
  }

  try {
    // ✅ TİRE İLE KAYDET (frontend ile uyumlu)
    const matchesRef = firebaseDb.ref(`matches/${date}`);
    
    // ✅ OBJECT FORMATINDA KAYDET (fixtureId key olarak)
    const processedMatches = {};
    let count = 0;
    
    matches.forEach(match => {
      const fixtureId = match.fixture.id;
      const matchTime = new Date(match.fixture.date);
      const now = Date.now();
      const status = match.fixture.status.short;
      
      // Bitmiş veya 1 saatten eski maçları atla
      if (status === 'FT' || status === 'AET' || status === 'PEN' || matchTime.getTime() < now - 3600000) {
        return;
      }
      
      // 50 maç limitini uygula (API limitini korumak için)
      if (count >= 50) {
        return;
      }
      
      processedMatches[fixtureId] = {
        homeTeam: match.teams.home.name,
        awayTeam: match.teams.away.name,
        league: match.league.name,
        date: date,
        time: matchTime.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/Istanbul'
        }),
        timestamp: matchTime.getTime(),
        status: status === 'LIVE' || status === '1H' || status === '2H' || status === 'HT' ? 'live' : 
                status === 'FT' || status === 'AET' || status === 'PEN' ? 'finished' : 'scheduled',
        lastUpdated: Date.now()
      };
      count++;
    });

    await matchesRef.set(processedMatches);
    console.log(`✅ Firebase'e kaydedildi: ${count} maç (${date})`);
  } catch (error) {
    console.error('❌ Firebase kayıt hatası:', error.message);
  }
}

// Eski maçları temizle
async function cleanupOldMatches() {
  if (!firebaseDb) {
    return;
  }

  try {
    console.log('🧹 Eski maçlar temizleniyor...');
    const matchesRef = firebaseDb.ref('matches');
    const snapshot = await matchesRef.once('value');
    
    if (!snapshot.exists()) {
      console.log('✅ Temizlenecek maç yok');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0]; // Tire ile karşılaştır

    const allMatches = snapshot.val();
    let deletedCount = 0;

    for (const dateKey in allMatches) {
      // Tire ile format karşılaştırması
      if (dateKey < todayStr) {
        await firebaseDb.ref(`matches/${dateKey}`).remove();
        deletedCount++;
      }
    }

    console.log(`✅ ${deletedCount} geçmiş tarihli maç grubu temizlendi`);
  } catch (error) {
    console.error('❌ Temizleme hatası:', error.message);
  }
}

// Maçları otomatik çek
async function fetchAndSaveMatches() {
  if (!FOOTBALL_API_KEY || !firebaseDb) {
    console.log('⚠️  API key or Firebase not configured');
    return;
  }

  if (!canMakeApiCall()) {
    console.log('⚠️  Daily API limit reached, skipping fetch');
    return;
  }

  try {
    console.log('🔄 Fetching today and tomorrow matches...');
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log('🔑 Using API Key:', FOOTBALL_API_KEY.substring(0, 10) + '...');
    console.log('📅 Fetching matches for dates:', todayStr, 'and', tomorrowStr);

    // Bugünün maçları
    incrementApiCall();
    const todayResponse = await axios.get('https://v3.football.api-sports.io/fixtures', {
      params: { date: todayStr },
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': FOOTBALL_API_KEY
      }
    });

    console.log('\n📊 TODAY RESPONSE:');
    console.log('   Status:', todayResponse.status);
    console.log('   Response length:', todayResponse.data.response?.length);
    console.log('   Errors:', todayResponse.data.errors);

    // Yarının maçları
    incrementApiCall();
    const tomorrowResponse = await axios.get('https://v3.football.api-sports.io/fixtures', {
      params: { date: tomorrowStr },
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': FOOTBALL_API_KEY
      }
    });

    console.log('\n📊 TOMORROW RESPONSE:');
    console.log('   Status:', tomorrowResponse.status);
    console.log('   Response length:', tomorrowResponse.data.response?.length);
    console.log('   Errors:', tomorrowResponse.data.errors);

    const todayMatches = todayResponse.data.response || [];
    const tomorrowMatches = tomorrowResponse.data.response || [];

    console.log(`📊 Bugün için ${todayMatches.length} maç alındı`);
    await saveMatchesToFirebase(todayMatches, todayStr);

    console.log(`📊 Yarın için ${tomorrowMatches.length} maç alındı`);
    await saveMatchesToFirebase(tomorrowMatches, tomorrowStr);

    console.log(`\n🎉 TOPLAM KAYDEDİLEN MAÇ: ${todayMatches.length + tomorrowMatches.length}`);

    lastMatchFetch = Date.now();
  } catch (error) {
    console.error('❌ Maç çekme hatası:', error.response?.data || error.message);
  }
}

// Firebase'den maçları çek
app.get('/api/matches', async (req, res) => {
  try {
    if (!firebaseDb) {
      return res.status(500).json({ error: 'Firebase not configured' });
    }

    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const matchesRef = firebaseDb.ref(`matches/${targetDate}`);
    const snapshot = await matchesRef.once('value');

    if (!snapshot.exists()) {
      return res.json({ matches: [] });
    }

    const matches = snapshot.val();
    res.json({ matches: Array.isArray(matches) ? matches : Object.values(matches) });
  } catch (error) {
    console.error('❌ Error fetching matches from Firebase:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Manuel maç çekme
app.post('/api/fetch-matches', async (req, res) => {
  try {
    await fetchAndSaveMatches();
    res.json({ success: true, message: 'Matches fetched and saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve static files from dist in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
}

// ============================================
// 🎯 SHOPIER PAYMENT INTEGRATION
// ============================================

// Fiyat-Kredi Eşleştirmesi
const PRICE_TO_CREDITS = {
  1: 1,     // Test paketi (1₺ = 1 kredi) - Sadece test için
  99: 5,    // Başlangıç paketi
  189: 10,  // Standart paket
  449: 25,  // Profesyonel paket
  799: 50   // Expert paket
};

// Helper: Email ile kullanıcı bul
async function findUserByEmail(email) {
  if (!firebaseDb) {
    throw new Error('Firebase not initialized');
  }
  
  // Email'i lowercase'e çevir
  const normalizedEmail = email.toLowerCase().trim();
  console.log(
