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
    footballApiKeyPreview: FOOTBALL_API_KEY ? FOOTBALL_API_KEY.substring(0, 10) + '...' : 'MISSING',
    firebaseConnected: !!firebaseDb,
    apiCallsToday: dailyApiCalls,
    apiCallsRemaining: MAX_DAILY_CALLS - dailyApiCalls,
    lastMatchFetch: lastMatchFetch > 0 ? new Date(lastMatchFetch).toISOString() : 'Never',
    nextMatchFetch: lastMatchFetch > 0 ? new Date(lastMatchFetch + FETCH_INTERVAL).toISOString() : 'Soon'
  });
});

// 🆕 Test API Key Endpoint
app.get('/api/test-football-api', async (req, res) => {
  try {
    if (!FOOTBALL_API_KEY) {
      return res.status(500).json({ 
        error: 'Football API Key not configured',
        envVars: Object.keys(process.env).filter(k => k.includes('FOOTBALL') || k.includes('API'))
      });
    }

    const today = new Date().toISOString().split('T')[0];
    
    console.log(`🧪 Testing Football API...`);
    console.log(`   Key: ${FOOTBALL_API_KEY.substring(0, 10)}...`);
    console.log(`   Date: ${today}`);

    const response = await axios.get('https://v3.football.api-sports.io/fixtures', {
      headers: {
        'x-apisports-key': FOOTBALL_API_KEY
      },
      params: { date: today },
      timeout: 15000
    });

    res.json({
      success: true,
      status: response.status,
      headers: response.headers,
      dataKeys: Object.keys(response.data || {}),
      fixturesCount: response.data?.response?.length || 0,
      errors: response.data?.errors || null,
      results: response.data?.results || 0,
      paging: response.data?.paging || null,
      sampleFixture: response.data?.response?.[0] || null
    });

  } catch (error) {
    console.error('❌ Football API Test Error:', error.message);
    res.status(500).json({
      error: error.message,
      response: error.response?.data || null,
      status: error.response?.status || null,
      headers: error.response?.headers || null
    });
  }
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
      if (userId && creditsToDeduct && firebaseDb) {
        try {
          const userRef = firebaseDb.ref(`users/${userId}`);
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

    // ✅ Kullanıcı ve kredi bilgileri
    const userId = req.body.userId;
    const creditsToDeduct = parseInt(req.body.creditsToDeduct || '3');

    // ✅ Kredi kontrolü (backend'de de kontrol)
    if (userId && firebaseDb) {
      const userRef = firebaseDb.ref(`users/${userId}`);
      const userSnapshot = await userRef.once('value');
      const userData = userSnapshot.val();
      
      if (!userData) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }
      
      if (userData.credits < creditsToDeduct) {
        return res.status(402).json({ error: 'Yetersiz kredi' });
      }
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

    // Step 4: Analiz tipini al
    const analysisType = req.body.analysisType || 'macSonucu';
    console.log(`📊 Analiz tipi: ${analysisType}`);

    // Step 5: Eşleşen maçları Gemini ile analiz et
    if (matchedMatches.length > 0) {
      console.log('🤖 Gemini ile tahmin başlatılıyor...');
      
      // Her maç için tahmin al
      if (analysisType === 'hepsi') {
        // Tüm analiz tipleri için tahmin
        const allTypes = ['macSonucu', 'karsilikliGol', 'altustu', 'ilkYariSonucu', 'ilkYariMac', 'handikap'];
        
        for (const match of matchedMatches) {
          const predictions = {};
          for (const type of allTypes) {
            predictions[type] = await getPredictionForMatch(match, type);
          }
          match.allPredictions = predictions;
          match.prediction = `
Maç Sonucu: ${predictions.macSonucu}
KG Var: ${predictions.karsilikliGol}
2.5: ${predictions.altustu}
İlk Yarı: ${predictions.ilkYariSonucu}
İY/MS: ${predictions.ilkYariMac}
Handikap: ${predictions.handikap}
          `.trim();
        }
      } else {
        // Tek bir analiz tipi için
        for (const match of matchedMatches) {
          match.prediction = await getPredictionForMatch(match, analysisType);
        }
      }
      
      console.log('✅ Tahminler tamamlandı');

      // ✅ Analiz başarılı - Kredi düşür
      if (userId && firebaseDb) {
        try {
          const userRef = firebaseDb.ref(`users/${userId}`);
          const userSnapshot = await userRef.once('value');
          const userData = userSnapshot.val();
          
          if (userData) {
            await userRef.update({
              credits: userData.credits - creditsToDeduct
            });
            console.log(`💳 Görsel analiz kredi düşüldü: ${userId} → ${creditsToDeduct} kredi`);
            
            // Kuponu kaydet
            const couponId = `coupon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const couponData = {
              id: couponId,
              userId: userId,
              analysisType: analysisType,
              matches: matchedMatches.map(m => ({
                homeTeam: m.apiMatch.homeTeam,
                awayTeam: m.apiMatch.awayTeam,
                league: m.apiMatch.league,
                date: m.apiMatch.date,
                prediction: m.prediction,
                allPredictions: m.allPredictions || null
              })),
              createdAt: Date.now(),
              timestamp: new Date().toISOString()
            };
            
            await firebaseDb.ref(`coupons/${userId}/${couponId}`).set(couponData);
            console.log(`💾 Kupon kaydedildi: ${couponId}`);
          }
        } catch (creditError) {
          console.error('⚠️ Kredi/Kupon kaydetme hatası:', creditError.message);
        }
      }

      return res.json({
        success: true,
        ocrText,
        extractedMatches: matches,
        matchedMatches,
        analysisType,
        creditsDeducted: creditsToDeduct
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
  
  if (!FOOTBALL_API_KEY) {
    console.log('⚠️  Football API key eksik, eşleştirme yapılamıyor');
    return matched;
  }
  
  // Get today and tomorrow matches
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  try {
    console.log(`📡 Football API'den maçlar çekiliyor (${today} ve ${tomorrow})...`);
    
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
    
    console.log(`📊 API'den toplam ${allFixtures.length} maç alındı`);

    // Match each extracted match
    for (const extracted of extractedMatches) {
      console.log(`\n🔍 Eşleştirme deneniyor: ${extracted.homeTeam} vs ${extracted.awayTeam}`);
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
    
    console.log(`\n✅ Toplam ${matched.length}/${extractedMatches.length} maç eşleştirildi`);
    
  } catch (error) {
    console.error('❌ API eşleştirme hatası:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
  
  return matched;
}

function findBestMatch(extracted, fixtures) {
  let bestMatch = null;
  let bestScore = 0;
  
  for (const fixture of fixtures) {
    const homeTeamApi = fixture.teams.home.name;
    const awayTeamApi = fixture.teams.away.name;
    const homeTeamExtracted = extracted.homeTeam;
    const awayTeamExtracted = extracted.awayTeam;
    
    // Calculate similarity scores
    const homeScore = calculateSimilarity(homeTeamExtracted, homeTeamApi);
    const awayScore = calculateSimilarity(awayTeamExtracted, awayTeamApi);
    const totalScore = homeScore + awayScore;
    
    // Lower threshold for better matching (was 1.0, now 0.8)
    if (totalScore > bestScore && totalScore > 0.8) {
      bestScore = totalScore;
      bestMatch = fixture;
      console.log(`   ✓ Eşleşme bulundu: ${homeTeamExtracted} vs ${awayTeamExtracted} → ${homeTeamApi} vs ${awayTeamApi} (Skor: ${totalScore.toFixed(2)})`);
    }
  }
  
  if (!bestMatch) {
    console.log(`   ✗ Eşleşme bulunamadı: ${extracted.homeTeam} vs ${extracted.awayTeam}`);
  }
  
  return bestMatch;
}

function calculateSimilarity(str1, str2) {
  // Normalize strings
  const normalize = (s) => s.toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  // Exact match
  if (s1 === s2) return 3.0;
  
  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 2.5;
  
  // Word-by-word overlap with better scoring
  const words1 = s1.split(/\s+/).filter(w => w.length > 2); // Skip short words
  const words2 = s2.split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  let matchCount = 0;
  for (const w1 of words1) {
    for (const w2 of words2) {
      // Exact word match
      if (w1 === w2) {
        matchCount += 1.0;
      }
      // One word contains the other
      else if (w1.includes(w2) || w2.includes(w1)) {
        matchCount += 0.7;
      }
      // Partial match (first 3+ characters)
      else if (w1.length >= 3 && w2.length >= 3 && 
               (w1.substring(0, 3) === w2.substring(0, 3))) {
        matchCount += 0.5;
      }
    }
  }
  
  // Normalize by average word count
  return (matchCount / ((words1.length + words2.length) / 2)) * 1.5;
}

function generatePredictionPrompt(match, analysisType) {
  const { homeTeam, awayTeam, league } = match.apiMatch;
  
  const prompts = {
    macSonucu: `${homeTeam} vs ${awayTeam} maçı için SADECE maç sonucu tahmini yap.
Lig: ${league}

SADECE şu formatlardan birini kullan:
- "1" (Ev sahibi kazanır)
- "X" (Beraberlik)
- "2" (Deplasman kazanır)

Uzun açıklama YAPMA, sadece tek kelime tahmin ver.`,

    karsilikliGol: `${homeTeam} vs ${awayTeam} maçı için SADECE karşılıklı gol tahmini yap.

SADECE şu formatlardan birini kullan:
- "Var" (Her iki takım da gol atar)
- "Yok" (En az bir takım gol atmaz)

Uzun açıklama YAPMA, sadece tek kelime tahmin ver.`,

    altustu: `${homeTeam} vs ${awayTeam} maçı için SADECE 2.5 alt/üst tahmini yap.

SADECE şu formatlardan birini kullan:
- "Üst" (3 veya daha fazla gol)
- "Alt" (2 veya daha az gol)

Uzun açıklama YAPMA, sadece tek kelime tahmin ver.`,

    ilkYariSonucu: `${homeTeam} vs ${awayTeam} maçı için SADECE ilk yarı sonucu tahmini yap.

SADECE şu formatlardan birini kullan:
- "1" (Ev sahibi önde)
- "X" (Beraberlik)
- "2" (Deplasman önde)

Uzun açıklama YAPMA, sadece tek kelime tahmin ver.`,

    ilkYariMac: `${homeTeam} vs ${awayTeam} maçı için SADECE ilk yarı/maç sonucu tahmini yap.

SADECE şu formatlardan birini kullan (İlkYarı/Maç):
- "1/1" - "1/X" - "1/2"
- "X/1" - "X/X" - "X/2"
- "2/1" - "2/X" - "2/2"

Uzun açıklama YAPMA, sadece format ver.`,

    handikap: `${homeTeam} vs ${awayTeam} maçı için SADECE handikap tahmini yap.

SADECE şu formatlardan birini kullan:
- "Ev Sahibi -1" (En az 2 fark kazanır)
- "Deplasman +1" (Kazanır, berabere veya 1 golle kaybeder)

Uzun açıklama YAPMA, sadece tahmin ver.`,
  };

  return prompts[analysisType] || prompts.macSonucu;
}

async function getPredictionForMatch(match, analysisType) {
  try {
    if (!GEMINI_API_KEY) {
      return 'API yapılandırılmamış';
    }

    const prompt = generatePredictionPrompt(match, analysisType);
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    const prediction = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Tahmin yapılamadı';
    return prediction;
  } catch (error) {
    console.error('Tahmin hatası:', error.message);
    return 'Tahmin yapılamadı';
  }
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

    console.log(`🔑 Using API Key: ${FOOTBALL_API_KEY ? FOOTBALL_API_KEY.substring(0, 10) + '...' : 'MISSING!'}`);
    console.log(`📅 Fetching matches for dates: ${today} and ${tomorrow}`);

    incrementApiCall();
    const todayData = await axios.get('https://v3.football.api-sports.io/fixtures', {
      headers: {
        'x-apisports-key': FOOTBALL_API_KEY
      },
      params: { date: today },
      timeout: 15000
    });

    console.log(`\n📊 TODAY RESPONSE:`);
    console.log(`   Status: ${todayData.status}`);
    console.log(`   Headers:`, todayData.headers);
    console.log(`   Data keys:`, Object.keys(todayData.data || {}));
    console.log(`   Response length: ${todayData.data?.response?.length || 0}`);
    console.log(`   Errors:`, todayData.data?.errors || 'none');
    if (todayData.data?.response?.length > 0) {
      console.log(`   First match:`, todayData.data.response[0].teams);
    }

    incrementApiCall();
    const tomorrowData = await axios.get('https://v3.football.api-sports.io/fixtures', {
      headers: {
        'x-apisports-key': FOOTBALL_API_KEY
      },
      params: { date: tomorrow },
      timeout: 15000
    });

    console.log(`\n📊 TOMORROW RESPONSE:`);
    console.log(`   Status: ${tomorrowData.status}`);
    console.log(`   Response length: ${tomorrowData.data?.response?.length || 0}`);
    console.log(`   Errors:`, tomorrowData.data?.errors || 'none');

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

    let totalSaved = 0;
    
    if (todayData.data?.response?.length > 0) {
      console.log(`📊 Bugün için ${todayData.data.response.length} maç alındı`);
      const todayMatches = processMatches(todayData.data.response, today);
      const todayCount = Object.keys(todayMatches).length;
      
      if (todayCount > 0) {
        await firebaseDb.ref(`matches/${today}`).set(todayMatches);
        console.log(`✅ Firebase'e kaydedildi: ${todayCount} maç (${today})`);
        totalSaved += todayCount;
      } else {
        console.log(`⚠️  Bugün için uygun maç bulunamadı (hepsi bitmiş veya geçmiş)`);
      }
    } else {
      console.log(`⚠️  Bugün için API'den maç gelmedi`);
    }

    if (tomorrowData.data?.response?.length > 0) {
      console.log(`📊 Yarın için ${tomorrowData.data.response.length} maç alındı`);
      const tomorrowMatches = processMatches(tomorrowData.data.response, tomorrow);
      const tomorrowCount = Object.keys(tomorrowMatches).length;
      
      if (tomorrowCount > 0) {
        await firebaseDb.ref(`matches/${tomorrow}`).set(tomorrowMatches);
        console.log(`✅ Firebase'e kaydedildi: ${tomorrowCount} maç (${tomorrow})`);
        totalSaved += tomorrowCount;
      } else {
        console.log(`⚠️  Yarın için uygun maç bulunamadı`);
      }
    } else {
      console.log(`⚠️  Yarın için API'den maç gelmedi`);
    }
    
    console.log(`\n🎉 TOPLAM KAYDEDİLEN MAÇ: ${totalSaved}`);

    await cleanFinishedMatches();
    lastMatchFetch = Date.now();

  } catch (error) {
    console.error('❌ Match fetch error:', error.message);
    if (error.response) {
      console.error('   📊 Response Status:', error.response.status);
      console.error('   📊 Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.config) {
      console.error('   🔧 Request URL:', error.config.url);
      console.error('   🔧 Request Headers:', error.config.headers);
    }
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