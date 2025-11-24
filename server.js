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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
    const { matches, contents, generationConfig, userId, creditsToDeduct } = req.body;
    
    if (!GEMINI_API_KEY) {
      console.error('❌ Gemini API key bulunamadı');
      return res.status(500).json({ error: 'Gemini API key yapılandırılmamış' });
    }

    if (!matches || !Array.isArray(matches)) {
      return res.status(400).json({ error: 'Geçersiz maç verisi' });
    }

    // ✅ Kredi kontrolü ve düşürme
    if (userId && creditsToDeduct && firebaseDb) {
      const userRef = firebaseDb.ref(`users/${userId}`);
      const userSnapshot = await userRef.once('value');
      const userData = userSnapshot.val();
      
      if (!userData || userData.credits < parseInt(creditsToDeduct)) {
        return res.status(403).json({ error: 'Yetersiz kredi' });
      }
      
      // Kredi düş
      await userRef.update({
        credits: userData.credits - parseInt(creditsToDeduct)
      });
      
      console.log(`💰 ${creditsToDeduct} kredi düşüldü (bülten analizi): ${userId}`);
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

// ============================================
// 🖼️ KUPON GÖRSEL ANALİZİ (FormData ile)
// ============================================

app.post('/api/analyze-coupon-image', upload.single('image'), async (req, res) => {
  try {
    console.log('🖼️ Kupon görsel analizi başlatılıyor...');
    
    if (!GEMINI_API_KEY) {
      console.error('❌ Gemini API key bulunamadı');
      return res.status(500).json({ error: 'Gemini API key yapılandırılmamış' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Görsel yüklenemedi' });
    }

    const { userId, creditsToDeduct, analysisType } = req.body;
    
    // Kredi kontrolü ve düşürme (opsiyonel)
    if (userId && creditsToDeduct && firebaseDb) {
      const userRef = firebaseDb.ref(`users/${userId}`);
      const userSnapshot = await userRef.once('value');
      const userData = userSnapshot.val();
      
      if (!userData || userData.credits < parseInt(creditsToDeduct)) {
        return res.status(403).json({ error: 'Yetersiz kredi' });
      }
      
      // Kredi düş
      await userRef.update({
        credits: userData.credits - parseInt(creditsToDeduct)
      });
      
      console.log(`💰 ${creditsToDeduct} kredi düşüldü: ${userId}`);
    }

    // Base64'e çevir
    const base64Image = req.file.buffer.toString('base64');

    // Analiz tipine göre prompt belirle
    let prompt = '';
    
    // Analiz tipine göre özel tahmin formatı
    const predictionFormats = {
      'ilkYariSonucu': '1 (Ev sahibi önde) veya X (Beraberlik) veya 2 (Deplasman önde)',
      'macSonucu': '1 (Ev sahibi kazanır) veya X (Beraberlik) veya 2 (Deplasman kazanır)',
      'karsilikliGol': 'Var (Her iki takım gol atar) veya Yok (En az bir takım gol atmaz)',
      'ilkYariMac': '1/1, 1/X, 1/2, X/1, X/X, X/2, 2/1, 2/X, 2/2',
      'handikap': 'Handikap değeri (örn: +1.5, -0.5)',
      'altustu': '2.5 Üst (3+ gol) veya 2.5 Alt (0-2 gol)',
      'hepsi': 'Tüm bahis seçenekleri'
    };

    const predictionFormat = predictionFormats[analysisType] || predictionFormats['macSonucu'];
    
    if (analysisType === 'detailed' || analysisType === 'hepsi') {
      prompt = `Bu futbol kuponunu detaylı analiz et. Şu bilgileri çıkar:

1. Tüm maçları listele (takım isimleri, oran, seçilen bahis)
2. Her maç için tahmin ve güven oranı
3. Kuponun genel başarı şansı
4. Risk analizi ve öneriler

Tahmin formatı: ${predictionFormat}

JSON formatında yanıt ver:
{
  "matches": [
    {
      "homeTeam": "takım",
      "awayTeam": "takım", 
      "odds": {"1": oran, "X": oran, "2": oran},
      "selectedBet": "seçilen bahis",
      "prediction": "${predictionFormat} formatında tahmin",
      "confidence": 0-100
    }
  ],
  "totalOdds": toplam_oran,
  "successProbability": 0-100,
  "riskLevel": "düşük/orta/yüksek",
  "recommendations": ["öneri1", "öneri2"],
  "summary": "genel değerlendirme"
}`;
    } else {
      prompt = `Bu futbol kuponunu analiz et ve "${analysisType}" için tahmin yap.

Tahmin formatı: ${predictionFormat}

JSON formatında yanıt ver:
{
  "matches": [
    {
      "homeTeam": "takım adı",
      "awayTeam": "takım adı",
      "odds": {"1": oran, "X": oran, "2": oran},
      "selectedBet": "seçilen bahis",
      "prediction": "${predictionFormat} formatında tahmin",
      "confidence": 0-100
    }
  ],
  "totalOdds": toplam_oran,
  "summary": "kısa değerlendirme"
}`;
    }

    // Gemini Vision API çağrısı
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: req.file.mimetype || 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 3000
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
    const analysisData = jsonMatch ? JSON.parse(jsonMatch[0]) : { 
      matches: [], 
      summary: 'Analiz yapılamadı' 
    };

    console.log(`✅ Kupon analizi tamamlandı: ${analysisData.matches?.length || 0} maç`);
    
    // ✅ Firebase'den bugün ve yarının maçlarını çek ve eşleştir
    let matchedMatches = [];
    let unmatchedMatches = [];

    if (firebaseDb && analysisData.matches && analysisData.matches.length > 0) {
      try {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayStr = today.toISOString().split('T')[0];
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Firebase'den maçları çek
        const todaySnapshot = await firebaseDb.ref(`matches/${todayStr}`).once('value');
        const tomorrowSnapshot = await firebaseDb.ref(`matches/${tomorrowStr}`).once('value');
        
        const todayMatches = todaySnapshot.val() || {};
        const tomorrowMatches = tomorrowSnapshot.val() || {};
        
        // Tüm maçları birleştir
        const allFirebaseMatches = { ...todayMatches, ...tomorrowMatches };
        const firebaseMatchesArray = Object.entries(allFirebaseMatches).map(([id, match]) => ({
          fixtureId: id,
          ...match
        }));

        console.log(`🔍 Firebase'den ${firebaseMatchesArray.length} maç bulundu`);

        // Takım isimlerini normalize et (küçük harf, boşluk temizle, Türkçe karakter)
        const normalizeTeamName = (name) => {
          return name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c');
        };

        // Benzerlik skoru hesapla (Levenshtein distance basit versiyonu)
        const similarity = (s1, s2) => {
          const longer = s1.length > s2.length ? s1 : s2;
          const shorter = s1.length > s2.length ? s2 : s1;
          
          if (longer.length === 0) return 1.0;
          
          // Eğer biri diğerini içeriyorsa yüksek skor ver
          if (longer.includes(shorter) || shorter.includes(longer)) {
            return 0.8;
          }
          
          // Basit karakter eşleşme sayısı
          let matches = 0;
          for (let i = 0; i < shorter.length; i++) {
            if (longer.includes(shorter[i])) matches++;
          }
          
          return matches / longer.length;
        };

        // Her Gemini maçını Firebase maçlarıyla eşleştir
        analysisData.matches.forEach(geminiMatch => {
          const normalizedHome = normalizeTeamName(geminiMatch.homeTeam || '');
          const normalizedAway = normalizeTeamName(geminiMatch.awayTeam || '');

          let bestMatch = null;
          let bestScore = 0;

          firebaseMatchesArray.forEach(fbMatch => {
            const fbHome = normalizeTeamName(fbMatch.homeTeam || '');
            const fbAway = normalizeTeamName(fbMatch.awayTeam || '');

            // Her iki takım için benzerlik skoru hesapla
            const homeScore = similarity(normalizedHome, fbHome);
            const awayScore = similarity(normalizedAway, fbAway);
            const totalScore = (homeScore + awayScore) / 2;

            if (totalScore > bestScore && totalScore > 0.5) {
              bestScore = totalScore;
              bestMatch = fbMatch;
            }
          });

          if (bestMatch) {
            matchedMatches.push({
              ...geminiMatch,
              apiMatch: {
                fixtureId: bestMatch.fixtureId,
                homeTeam: bestMatch.homeTeam,
                awayTeam: bestMatch.awayTeam,
                league: bestMatch.league,
                date: bestMatch.date,
                time: bestMatch.time,
                status: bestMatch.status || 'scheduled',
                timestamp: bestMatch.timestamp
              },
              matchScore: Math.round(bestScore * 100)
            });
            console.log(`✅ Eşleşti: ${geminiMatch.homeTeam} vs ${geminiMatch.awayTeam} → ${bestMatch.homeTeam} vs ${bestMatch.awayTeam} (Skor: ${Math.round(bestScore * 100)}%)`);
          } else {
            unmatchedMatches.push(geminiMatch);
            console.log(`❌ Eşleşmedi: ${geminiMatch.homeTeam} vs ${geminiMatch.awayTeam}`);
          }
        });

      } catch (matchError) {
        console.error('❌ Maç eşleştirme hatası:', matchError.message);
      }
    }

    // Sonucu döndür
    res.json({
      ...analysisData,
      matchedMatches,
      unmatchedMatches,
      analysisType: analysisType || 'hepsi',
      totalMatches: analysisData.matches?.length || 0,
      matchedCount: matchedMatches.length,
      unmatchedCount: unmatchedMatches.length
    });

  } catch (error) {
    console.error('❌ Kupon analiz hatası:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Görsel analizi yapılamadı',
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
  console.log(`🔍 Kullanıcı aranıyor: ${normalizedEmail}`);
  
  // Önce Realtime Database'de ara
  const usersRef = firebaseDb.ref('users');
  const snapshot = await usersRef.orderByChild('email').equalTo(normalizedEmail).once('value');
  
  if (snapshot.exists()) {
    const userData = snapshot.val();
    const userId = Object.keys(userData)[0];
    console.log(`✅ Kullanıcı bulundu (Database): ${userId}`);
    return { userId, ...userData[userId] };
  }
  
  // Database'de bulunamadıysa, tüm kullanıcıları kontrol et (case-insensitive)
  console.log('🔍 Tüm kullanıcılar taranıyor (case-insensitive)...');
  const allUsersSnapshot = await usersRef.once('value');
  
  if (allUsersSnapshot.exists()) {
    const allUsers = allUsersSnapshot.val();
    
    for (const [userId, userData] of Object.entries(allUsers)) {
      if (userData.email && userData.email.toLowerCase().trim() === normalizedEmail) {
        console.log(`✅ Kullanıcı bulundu (Scan): ${userId}`);
        return { userId, ...userData };
      }
    }
  }
  
  // Hala bulunamadıysa, Firebase Auth'tan dene
  try {
    console.log('🔍 Firebase Authentication kontrol ediliyor...');
    const userRecord = await admin.auth().getUserByEmail(email);
    
    if (userRecord) {
      console.log(`✅ Kullanıcı bulundu (Auth): ${userRecord.uid}`);
      
      // Database'e ekleyelim (yoksa)
      const userRef = firebaseDb.ref(`users/${userRecord.uid}`);
      const userSnapshot = await userRef.once('value');
      
      if (!userSnapshot.exists()) {
        // Kullanıcı Auth'ta var ama Database'de yok - oluşturalım
        const newUserData = {
          uid: userRecord.uid,
          email: userRecord.email.toLowerCase(),
          displayName: userRecord.displayName || '',
          photoURL: userRecord.photoURL || '',
          credits: 0,
          totalSpent: 0,
          createdAt: Date.now(),
          lastLogin: Date.now(),
          isBanned: false
        };
        
        await userRef.set(newUserData);
        console.log(`✅ Database'e kullanıcı eklendi: ${userRecord.uid}`);
        
        return { userId: userRecord.uid, ...newUserData };
      }
      
      return { userId: userRecord.uid, ...userSnapshot.val() };
    }
  } catch (authError) {
    console.log('⚠️ Firebase Auth araması başarısız:', authError.message);
  }
  
  console.error(`❌ Kullanıcı hiçbir yerde bulunamadı: ${normalizedEmail}`);
  return null;
}

// Helper: Kullanıcıya kredi ekle
async function addCreditsToUser(userId, credits, orderId, amount) {
  if (!firebaseDb) {
    throw new Error('Firebase not initialized');
  }
  
  const userRef = firebaseDb.ref(`users/${userId}`);
  
  // Transaction ile güvenli kredi ekleme
  await userRef.transaction((user) => {
    if (user) {
      user.credits = (user.credits || 0) + credits;
      user.totalSpent = (user.totalSpent || 0) + amount;
      return user;
    }
    return user;
  });
  
  // Transaction kaydı oluştur
  const transactionRef = firebaseDb.ref(`users/${userId}/transactions`).push();
  await transactionRef.set({
    type: 'purchase',
    credits: credits,
    amount: amount,
    orderId: orderId,
    status: 'completed',
    provider: 'shopier',
    createdAt: Date.now(),
    timestamp: new Date().toISOString()
  });
  
  console.log(`💰 ${credits} kredi ${userId} kullanıcısına eklendi`);
}

// Shopier Callback Endpoint
app.post('/api/shopier/callback', async (req, res) => {
  try {
    console.log('📦 Shopier callback alındı:', req.body);
    
    // Shopier'dan gelen parametreler
    const {
      platform_order_id,
      order_id,
      buyer_name,
      buyer_email,
      buyer_phone,
      total_order_value,
      status,
      API_key,
      random_nr
    } = req.body;

    // API Key doğrulama
    const expectedApiKey = process.env.SHOPIER_API_USER;
    if (!expectedApiKey) {
      console.error('❌ SHOPIER_API_USER environment variable eksik');
      return res.status(200).send('OK');
    }
    
    if (API_key !== expectedApiKey) {
      console.error('❌ Geçersiz API Key');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Signature doğrulama
    const apiSecret = process.env.SHOPIER_API_SECRET;
    if (apiSecret) {
      const signature = crypto
        .createHash('sha256')
        .update(`${platform_order_id}${order_id}${apiSecret}`)
        .digest('hex');
      console.log('🔐 Signature doğrulandı');
    }

    console.log('✅ Shopier ödeme doğrulandı:', {
      order_id,
      buyer_email,
      amount: total_order_value,
      status
    });

    // Ödeme başarılı ise
    if (status === '1' || status === 1) {
      try {
        console.log(`🔍 Kullanıcı aranıyor: ${buyer_email}`);
        
        const user = await findUserByEmail(buyer_email);
        
        if (!user) {
          console.error(`❌ Kullanıcı bulunamadı: ${buyer_email}`);
          
          if (firebaseDb) {
            const failedPaymentRef = firebaseDb.ref('failed_payments').push();
            await failedPaymentRef.set({
              buyer_email,
              buyer_name,
              amount: total_order_value,
              order_id,
              platform_order_id,
              reason: 'User not found in database',
              timestamp: Date.now(),
              status: 'pending_manual_review'
            });
            console.log('📝 Başarısız ödeme kaydedildi');
          }
          
          return res.status(200).send('OK');
        }
        
        console.log(`✅ Kullanıcı bulundu: ${user.userId}`);
        
        const amount = parseInt(total_order_value);
        const credits = PRICE_TO_CREDITS[amount];
        
        if (!credits) {
          console.error(`❌ Bilinmeyen paket fiyatı: ${amount}₺`);
          return res.status(200).send('OK');
        }
        
        console.log(`💳 İşlenecek: ${amount}₺ → ${credits} kredi`);
        
        await addCreditsToUser(user.userId, credits, order_id, amount);
        
        console.log(`✅ Ödeme işlendi: ${credits} kredi → ${user.userId}`);
        
      } catch (error) {
        console.error('❌ Kredi ekleme hatası:', error);
      }
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Shopier callback hatası:', error);
    res.status(200).send('OK');
  }
});

// ============================================
// 🎯 SHOPIER OSB - DÜZELTİLDİ
// ============================================

app.post('/api/shopier/osb', upload.none(), async (req, res) => {
  try {
    console.log('📦 Shopier OSB bildirimi alındı');
    console.log('📄 Request Body:', req.body);

    // ✅ DÜZELTİLDİ: OSB_KEY kullanılıyor
    const OSB_USERNAME = process.env.SHOPIER_OSB_USERNAME;
    const OSB_KEY = process.env.SHOPIER_OSB_KEY;

    if (!OSB_USERNAME || !OSB_KEY) {
      console.error('❌ OSB credentials eksik! SHOPIER_OSB_USERNAME ve SHOPIER_OSB_KEY gerekli');
      return res.status(500).send('OSB credentials not configured');
    }

    const { res: encodedData, hash: receivedHash } = req.body;

    if (!encodedData || !receivedHash) {
      console.error('❌ OSB parametreleri eksik');
      return res.status(400).send('missing parameter');
    }

    // ✅ SHOPIER HASH FORMÜLÜ: hash_hmac('sha256', data+username, key)
    const expectedHash = crypto
      .createHmac('sha256', OSB_KEY)
      .update(encodedData + OSB_USERNAME)
      .digest('hex');

    console.log('🔐 Hash Doğrulama:');
    console.log('   OSB_USERNAME:', OSB_USERNAME);
    console.log('   OSB_KEY:', OSB_KEY.substring(0, 8) + '...');
    console.log('   Hesaplanan:', expectedHash);
    console.log('   Gelen     :', receivedHash);
    console.log('   Eşleşme   :', expectedHash === receivedHash ? '✅' : '❌');

    if (receivedHash !== expectedHash) {
      console.error('❌ OSB hash doğrulama hatası!');
      return res.status(401).send('Invalid hash');
    }

    console.log('✅ OSB hash doğrulandı');

    const jsonResult = Buffer.from(encodedData, 'base64').toString('utf-8');
    const orderData = JSON.parse(jsonResult);

    console.log('📊 OSB Sipariş Verisi:', orderData);

    const {
      email,
      orderid,
      currency,
      price,
      buyername,
      buyersurname,
      istest
    } = orderData;

    // Test modu
    if (istest === 1 || istest === '1') {
      console.log('⚠️ TEST MODU - Gerçek kredi eklenmeyecek');
      return res.status(200).send('success');
    }

    // Tekrar işlem kontrolü
    if (firebaseDb) {
      const orderRef = firebaseDb.ref(`processed_orders/${orderid}`);
      const orderSnapshot = await orderRef.once('value');
      
      if (orderSnapshot.exists()) {
        console.log('⚠️ Bu sipariş daha önce işlenmiş:', orderid);
        return res.status(200).send('success');
      }
    }

    console.log('🔍 Kullanıcı aranıyor:', email);

    const user = await findUserByEmail(email);

    if (!user) {
      console.error(`❌ Kullanıcı bulunamadı: ${email}`);

      if (firebaseDb) {
        const failedPaymentRef = firebaseDb.ref('failed_osb_payments').push();
        await failedPaymentRef.set({
          email,
          buyername,
          buyersurname,
          amount: price,
          currency,
          orderid,
          reason: 'User not found in database',
          timestamp: Date.now(),
          status: 'pending_manual_review'
        });
        console.log('📝 Başarısız OSB ödemesi kaydedildi');
      }

      return res.status(200).send('success');
    }

    console.log(`✅ Kullanıcı bulundu: ${user.userId}`);

    const amount = parseInt(price);
    const credits = PRICE_TO_CREDITS[amount];

    if (!credits) {
      console.error(`❌ Bilinmeyen paket fiyatı: ${amount}₺`);
      console.error(`📊 Bilinen fiyatlar: ${Object.keys(PRICE_TO_CREDITS).join(', ')}`);
      
      if (firebaseDb) {
        const unknownPriceRef = firebaseDb.ref('unknown_osb_prices').push();
        await unknownPriceRef.set({
          email,
          amount,
          currency,
          orderid,
          timestamp: Date.now()
        });
      }
      
      return res.status(200).send('success');
    }

    console.log(`💳 İşlenecek: ${amount}₺ → ${credits} kredi`);

    // Kullanıcıya kredi ekle
    await addCreditsToUser(user.userId, credits, orderid, amount);

    // Sipariş ID'yi işlenmiş olarak kaydet
    if (firebaseDb) {
      const orderRef = firebaseDb.ref(`processed_orders/${orderid}`);
      await orderRef.set({
        userId: user.userId,
        email,
        credits,
        amount,
        timestamp: Date.now(),
        processedAt: new Date().toISOString()
      });
      console.log('✅ Sipariş işlenmiş olarak kaydedildi:', orderid);
    }

    console.log(`✅ OSB ödemesi işlendi: ${credits} kredi → ${user.userId} (${email})`);
    console.log(`🎉 BAŞARILI: Kullanıcının yeni kredi bakiyesi güncellenmiştir`);

    // Shopier'a başarılı yanıt
    res.status(200).send('success');

  } catch (error) {
    console.error('❌ Shopier OSB hatası:', error);
    console.error('Stack:', error.stack);
    res.status(200).send('success');
  }
});
// ============================================
// 🎯 BACKEND PROXY (Port 3002)
// ============================================

// Yeni endpoint: Gelişmiş kupon analizi (v3.0)
app.post('/api/analyze-coupon-advanced', async (req, res) => {
  try {
    console.log('🔄 Proxy: /api/analyze-coupon-advanced isteği backend\'e yönlendiriliyor...');
    
    const response = await axios.post('http://localhost:3002/api/analyze-coupon-advanced', req.body, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 90000 // 90 saniye (Gemini + Football API için)
    });
    
    console.log('✅ Proxy: Backend\'den yanıt alındı');
    res.json(response.data);
    
  } catch (error) {
    console.error('❌ Proxy hatası:', error.message);
    
    // Backend'den gelen hata mesajını ilet
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Backend sunucusuna ulaşılamadı',
        details: error.message 
      });
    }
  }
});

// YENİ: Bülten analizi (Kullanıcı maç listesi)
app.post('/api/analyze-bulletin-advanced', async (req, res) => {
  try {
    console.log('🔄 Proxy: /api/analyze-bulletin-advanced isteği backend\'e yönlendiriliyor...');
    
    const response = await axios.post('http://localhost:3002/api/analyze-bulletin-advanced', req.body, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 90000 // 90 saniye (Gemini + Football API için)
    });
    
    console.log('✅ Proxy: Bülten analizi tamamlandı');
    res.json(response.data);
    
  } catch (error) {
    console.error('❌ Bülten analiz proxy hatası:', error.message);
    
    // Backend'den gelen hata mesajını ilet
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'Backend sunucusuna ulaşılamadı',
        details: error.message 
      });
    }
  }
});
// ============================================
// SERVER BAŞLATMA
// ============================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Sportsradar API: ${SPORTSRADAR_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
  console.log(`⚽ Football API: ${FOOTBALL_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
  console.log(`🔥 Firebase: ${firebaseDb ? 'Connected ✅' : 'Disabled ❌'}`);
  console.log(`💳 Shopier OSB: ${process.env.SHOPIER_OSB_USERNAME ? 'Configured ✅' : 'Missing ❌'}`);
  console.log(`⏱️  Update Interval: ${FETCH_INTERVAL / 60000} minutes`);
  console.log(`🧹 Cleanup Interval: ${CLEANUP_INTERVAL / 60000} minutes`);
  console.log(`📊 Daily API Limit: ${MAX_DAILY_CALLS} calls`);

  // İlk maç çekme işlemini başlat
  console.log('🔄 Starting initial match fetch...');
  fetchAndSaveMatches();

  // Periyodik maç çekme
  setInterval(() => {
    console.log('🔄 Periodic match fetch triggered');
    fetchAndSaveMatches();
  }, FETCH_INTERVAL);

  // Periyodik temizleme
  setInterval(() => {
    console.log('🧹 Periodic cleanup triggered');
    cleanupOldMatches();
  }, CLEANUP_INTERVAL);
});