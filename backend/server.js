// server.js - Ana API Servisi
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const {
  firebaseInitialized,
  parseGeminiJSON,
  refundCreditsToUser,
  findUserByEmail,
  addCreditsToUser,
  deductCreditsFromUser
} = require('./utils');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS ayarları
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'main-api',
    timestamp: new Date().toISOString(),
    firebase: firebaseInitialized,
    gemini: !!process.env.GEMINI_API_KEY,
    football: !!process.env.FOOTBALL_API_KEY
  });
});

// ==================== API-FOOTBALL PROXY ====================
app.get('/api/football/*', async (req, res) => {
  try {
    const endpoint = req.params[0];
    const API_KEY = process.env.FOOTBALL_API_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ error: 'API key bulunamadı' });
    }

    console.log(`📡 Football API: ${endpoint}`, req.query);

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

    console.log(`✅ Football API yanıt alındı: ${endpoint}`);
    res.json(response.data);

  } catch (error) {
    console.error('❌ Football API hatası:', error.response?.data || error.message);
    
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

// ==================== GEMİNİ METIN ANALİZ ====================
app.post('/api/gemini/analyze', async (req, res) => {
  let creditsDeducted = false;
  const { matches, userId, creditsToDeduct } = req.body;
  
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      console.error('❌ Gemini API key bulunamadı');
      return res.status(500).json({ error: 'Gemini API key yapılandırılmamış' });
    }

    if (!matches || !Array.isArray(matches)) {
      return res.status(400).json({ error: 'Geçersiz maç verisi' });
    }

    // Kredi düşürme
    if (userId && creditsToDeduct && firebaseInitialized) {
      try {
        const analysisType = creditsToDeduct === 5 ? 'detailed' : 'standard';
        await deductCreditsFromUser(userId, creditsToDeduct, analysisType);
        creditsDeducted = true;
        console.log(`💰 ${creditsToDeduct} kredi düşüldü: ${userId}`);
      } catch (creditError) {
        console.error('❌ Kredi düşürme hatası:', creditError.message);
        return res.status(400).json({ error: creditError.message });
      }
    }

    console.log(`🤖 Gemini analizi başlatılıyor: ${matches.length} maç`);

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `Sen bir futbol analiz uzmanısın. Aşağıdaki maçları analiz et ve her maç için tahmin yap.

Maçlar:
${matches.map((m, i) => `${i + 1}. ${m.homeTeam} vs ${m.awayTeam}
   - Lig: ${m.league}
   - Tarih: ${m.date}
   - Saat: ${m.time}
   ${m.statistics ? `- İstatistikler: ${JSON.stringify(m.statistics)}` : ''}`).join('\n\n')}

Her maç için şu formatta JSON yanıt ver:
{
  "analyses": [
    {
      "matchId": "maç_id",
      "prediction": "1/X/2",
      "confidence": 0-100,
      "reasoning": "kısa açıklama"
    }
  ]
}

SADECE JSON yanıt ver, başka metin ekleme.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
          responseMimeType: "application/json"
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    const geminiText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!geminiText) {
      throw new Error('Gemini yanıtı alınamadı');
    }

    let analysisData;
    try {
      analysisData = parseGeminiJSON(geminiText);
      if (!analysisData.analyses) {
        analysisData = { analyses: [] };
      }
    } catch (parseError) {
      console.error('❌ JSON parse hatası:', parseError.message);
      throw new Error('Analiz sonuçları işlenirken hata oluştu');
    }

    console.log(`✅ Gemini analizi tamamlandı: ${analysisData.analyses?.length || 0} tahmin`);
    
    res.json(analysisData);

  } catch (error) {
    console.error('❌ Gemini analiz hatası:', error.message);
    
    // Hata durumunda kredi iadesi
    if (creditsDeducted && firebaseInitialized && userId && creditsToDeduct) {
      try {
        await refundCreditsToUser(userId, creditsToDeduct, 'Analiz hatası - otomatik iade');
        console.log(`♻️ ${creditsToDeduct} kredi iade edildi: ${userId}`);
      } catch (refundError) {
        console.error('❌ Kredi iadesi hatası:', refundError.message);
      }
    }
    
    res.status(500).json({ 
      error: 'Analiz yapılamadı',
      details: error.message 
    });
  }
});

// ==================== GEMİNİ GÖRSEL ANALİZ (Basit) ====================
app.post('/api/gemini/analyze-image', async (req, res) => {
  try {
    const { image, prompt } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key yapılandırılmamış' });
    }

    if (!image) {
      return res.status(400).json({ error: 'Görsel bulunamadı' });
    }

    // Base64'ten prefix temizle
    let base64Data = image;
    if (image.includes('base64,')) {
      base64Data = image.split('base64,')[1];
    }

    console.log('🖼️ Basit görsel analizi başlatılıyor...');

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
          maxOutputTokens: 2000,
          responseMimeType: "application/json"
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

    let analysisData;
    try {
      analysisData = parseGeminiJSON(geminiText);
      if (!analysisData.matches) {
        analysisData.matches = [];
      }
      if (!analysisData.summary) {
        analysisData.summary = '';
      }
    } catch (parseError) {
      console.error('❌ JSON parse hatası:', parseError.message);
      throw new Error('Görsel işlenirken hata oluştu');
    }

    console.log(`✅ Görsel analizi tamamlandı: ${analysisData.matches?.length || 0} maç bulundu`);
    
    res.json(analysisData);

  } catch (error) {
    console.error('❌ Görsel analiz hatası:', error.message);
    res.status(500).json({ 
      error: 'Görsel analizi yapılamadı',
      details: error.message 
    });
  }
});

// ==================== SHOPIER CALLBACK ====================

const PRICE_TO_CREDITS = {
  99: 5,
  189: 10,
  449: 25,
  799: 50
};

app.post('/api/shopier/callback', async (req, res) => {
  try {
    console.log('📦 Shopier callback alındı:', req.body);
    
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

    console.log('✅ Shopier ödeme doğrulandı:', {
      order_id,
      buyer_email,
      amount: total_order_value,
      status
    });

    // Ödeme başarılı ise
    if (status === '1' || status === 1) {
      try {
        const user = await findUserByEmail(buyer_email);
        
        if (!user) {
          console.error(`❌ Kullanıcı bulunamadı: ${buyer_email}`);
          return res.status(200).send('OK');
        }
        
        const amount = parseInt(total_order_value);
        const credits = PRICE_TO_CREDITS[amount];
        
        if (!credits) {
          console.error(`❌ Bilinmeyen paket fiyatı: ${amount}₺`);
          return res.status(200).send('OK');
        }
        
        await addCreditsToUser(user.userId, credits, order_id, amount);
        
        console.log(`✅ Ödeme işlendi: ${credits} kredi -> ${user.userId} (${buyer_email})`);
        
      } catch (error) {
        console.error('❌ Kredi ekleme hatası:', error);
      }
    } else {
      console.log('⚠️ Ödeme başarısız veya beklemede:', status);
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Shopier callback hatası:', error);
    res.status(200).send('OK');
  }
});

// ==================== SERVER START ====================
app.listen(PORT, () => {
  console.log(`\n🚀 ANA API SERVİSİ BAŞLATILDI`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`⚽ Football API: http://localhost:${PORT}/api/football/*`);
  console.log(`🤖 Gemini Analiz: http://localhost:${PORT}/api/gemini/analyze`);
  console.log(`🖼️ Görsel Analiz: http://localhost:${PORT}/api/gemini/analyze-image`);
  console.log(`📦 Shopier: http://localhost:${PORT}/api/shopier/callback\n`);
});
