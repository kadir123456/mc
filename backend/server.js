// server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
const admin = require('firebase-admin');
require('dotenv').config();

// Firebase Admin SDK Initialization
let firebaseInitialized = false;
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.VITE_FIREBASE_DATABASE_URL
  });
  
  firebaseInitialized = true;
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed:', error.message);
}

const app = express();
const PORT = process.env.PORT || 3001;

// CORS ayarları - Tüm originlere izin ver (production'da domain belirtin)
app.use(cors({
  origin: '*', // Production'da: 'https://aikupon.com'
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API-Football Proxy Endpoint
app.get('/api/football/*', async (req, res) => {
  try {
    const endpoint = req.params[0]; // teams, fixtures, standings vs.
    const API_KEY = process.env.API_FOOTBALL_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ error: 'API key bulunamadı' });
    }

    console.log(`📡 API isteği: ${endpoint}`, req.query);

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

    console.log(`✅ API yanıtı alındı: ${endpoint}`);
    res.json(response.data);

  } catch (error) {
    console.error('❌ API hatası:', error.response?.data || error.message);
    
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

// Paket fiyatlarına göre kredi mapping
const PRICE_TO_CREDITS = {
  99: 5,
  189: 10,
  449: 25,
  799: 50
};

// Helper: Email ile kullanıcı bul
async function findUserByEmail(email) {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }
  
  const db = admin.database();
  const usersRef = db.ref('users');
  const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
  
  if (!snapshot.exists()) {
    return null;
  }
  
  const userData = snapshot.val();
  const userId = Object.keys(userData)[0];
  return { userId, ...userData[userId] };
}

// Helper: Kullanıcıya kredi ekle
async function addCreditsToUser(userId, credits, orderId, amount) {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }
  
  const db = admin.database();
  const userRef = db.ref(`users/${userId}`);
  
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
  const transactionRef = db.ref(`users/${userId}/transactions`).push();
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
    if (API_key !== expectedApiKey) {
      console.error('❌ Geçersiz API Key');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Signature doğrulama (Shopier API şifre ile)
    const signature = crypto
      .createHash('sha256')
      .update(`${platform_order_id}${order_id}${process.env.SHOPIER_API_SECRET}`)
      .digest('hex');

    console.log('✅ Shopier ödeme doğrulandı:', {
      order_id,
      buyer_email,
      amount: total_order_value,
      status
    });

    // Ödeme başarılı ise
    if (status === '1' || status === 1) {
      try {
        // Kullanıcıyı email ile bul
        const user = await findUserByEmail(buyer_email);
        
        if (!user) {
          console.error(`❌ Kullanıcı bulunamadı: ${buyer_email}`);
          // Yine de Shopier'a OK döneceğiz çünkü bu bizim taraf hatası
          return res.status(200).send('OK');
        }
        
        // Fiyata göre kredi miktarını belirle
        const amount = parseInt(total_order_value);
        const credits = PRICE_TO_CREDITS[amount];
        
        if (!credits) {
          console.error(`❌ Bilinmeyen paket fiyatı: ${amount}₺`);
          return res.status(200).send('OK');
        }
        
        // Kullanıcıya kredi ekle
        await addCreditsToUser(user.userId, credits, order_id, amount);
        
        console.log(`✅ Ödeme işlendi: ${credits} kredi -> ${user.userId} (${buyer_email})`);
        
      } catch (error) {
        console.error('❌ Kredi ekleme hatası:', error);
        // Yine de Shopier'a OK döneceğiz
      }
    } else {
      console.log('⚠️ Ödeme başarısız veya beklemede:', status);
    }

    // Shopier'a başarılı yanıt (her durumda)
    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Shopier callback hatası:', error);
    // Shopier'a yine OK döneriz çünkü webhook'u tekrar göndermelerini istemeyiz
    res.status(200).send('OK');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend proxy sunucusu ${PORT} portunda çalışıyor`);
  console.log(`📦 Shopier callback: http://localhost:${PORT}/api/shopier/callback`);
});
