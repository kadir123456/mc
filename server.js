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

// Gemini AI analiz endpoint
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

// Maç verilerini Firebase'e kaydet - DÜZELTİLDİ: TÜM MAÇLARI KAYDEDİYOR
async function saveMatchesToFirebase(matches, date) {
  if (!firebaseDb) {
    console.log('⚠️  Firebase not available, skipping save');
    return;
  }

  try {
    const dateKey = date.replace(/-/g, '');
    const matchesRef = firebaseDb.ref(`matches/${dateKey}`);
    
    // ✅ 50 SINIRI KALDIRILDI - TÜM MAÇLARI KAYDET
    const processedMatches = matches.map(match => ({
      id: match.fixture.id,
      date: match.fixture.date,
      timestamp: match.fixture.timestamp,
      status: match.fixture.status.short,
      league: {
        id: match.league.id,
        name: match.league.name,
        country: match.league.country,
        logo: match.league.logo
      },
      teams: {
        home: {
          id: match.teams.home.id,
          name: match.teams.home.name,
          logo: match.teams.home.logo
        },
        away: {
          id: match.teams.away.id,
          name: match.teams.away.name,
          logo: match.teams.away.logo
        }
      },
      goals: match.goals,
      score: match.score
    }));

    await matchesRef.set(processedMatches);
    console.log(`✅ Firebase'e kaydedildi: ${processedMatches.length} maç (${date})`);
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
    const todayKey = today.toISOString().split('T')[0].replace(/-/g, '');

    const allMatches = snapshot.val();
    let deletedCount = 0;

    for (const dateKey in allMatches) {
      if (parseInt(dateKey) < parseInt(todayKey)) {
        await firebaseDb.ref(`matches/${dateKey}`).remove();
        deletedCount++;
      }
    }

    console.log(`✅ ${deletedCount} geçmiş maç temizlendi`);
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
    const dateKey = targetDate.replace(/-/g, '');

    const matchesRef = firebaseDb.ref(`matches/${dateKey}`);
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
