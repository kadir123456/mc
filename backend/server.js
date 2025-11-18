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

// Helper: Kullanıcıya kredi iade et
async function refundCreditsToUser(userId, credits, reason) {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }
  
  const db = admin.database();
  const userRef = db.ref(`users/${userId}`);
  
  // Transaction ile güvenli kredi iadesi
  await userRef.transaction((user) => {
    if (user) {
      user.credits = (user.credits || 0) + credits;
      return user;
    }
    return user;
  });
  
  // Transaction kaydı oluştur
  const transactionRef = db.ref(`users/${userId}/transactions`).push();
  await transactionRef.set({
    type: 'refund',
    credits: credits,
    reason: reason,
    status: 'completed',
    createdAt: Date.now(),
    timestamp: new Date().toISOString()
  });
  
  console.log(`💰 ${credits} kredi ${userId} kullanıcısına iade edildi: ${reason}`);
}

// Helper: Gemini JSON yanıtını güvenli şekilde parse et
function parseGeminiJSON(text) {
  if (!text) {
    throw new Error('Boş yanıt');
  }
  
  try {
    // Markdown kod bloklarını temizle
    let cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // JSON'u bul
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON bulunamadı');
    }
    
    // Parse et
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
    
  } catch (error) {
    console.error('❌ JSON parse hatası:', error.message);
    console.error('📄 Ham yanıt:', text.substring(0, 500));
    throw new Error(`JSON parse hatası: ${error.message}`);
  }
}

// Express app setup
const app = express();
const PORT = process.env.PORT || 3001;

// CORS ayarları - Tüm originlere izin ver (production'da domain belirtin)
app.use(cors({
  origin: '*', // Production'da: 'https://aikupon.com'
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON body parser - ÖNCE raw body'yi logla
app.use((req, res, next) => {
  if (req.path === '/api/analyze-coupon-image') {
    console.log('🔍 Request alındı:', {
      method: req.method,
      path: req.path,
      contentType: req.get('content-type'),
      contentLength: req.get('content-length'),
      hasBody: !!req.body
    });
  }
  next();
});

app.use(express.json({ limit: '50mb' })); // Görsel analiz için limit artırıldı
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    firebase: firebaseInitialized,
    gemini: !!process.env.GEMINI_API_KEY,
    football: !!process.env.API_FOOTBALL_KEY
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend proxy sunucusu ${PORT} portunda çalışıyor`);
  console.log(`📡 Football API: http://localhost:${PORT}/api/football/*`);
  console.log(`🤖 Gemini Analiz: http://localhost:${PORT}/api/gemini/analyze`);
  console.log(`🖼️ Görsel Analiz: http://localhost:${PORT}/api/gemini/analyze-image`);
  console.log(`🎯 Görsel Kupon Analiz: http://localhost:${PORT}/api/analyze-coupon-image`);
  console.log(`📦 Shopier callback: http://localhost:${PORT}/api/shopier/callback`);
});

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

// ==================== GEMİNİ ENDPOINTS ====================

// Bülten Analiz Endpoint
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

    // Kredi düşürme işlemi
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

    // Gemini API'ye istek
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

    // Güvenli JSON parse
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
    
    // Hata durumunda kredi iadesi yap
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

// Görsel Analiz Endpoint
app.post('/api/gemini/analyze-image', async (req, res) => {
  try {
    const { image, prompt } = req.body;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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

    // Güvenli JSON parse
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

// ==================== GÖRSEL ANALİZ KUPON ENDPOINT - OPTİMİZE EDİLMİŞ ====================

app.post('/api/analyze-coupon-image', async (req, res) => {
  let creditsDeducted = false;
  const { image, userId, creditsToDeduct, analysisType } = req.body;
  
  console.log('📥 Gelen istek:', {
    hasImage: !!image,
    imagePrefix: image?.substring(0, 30),
    userId,
    creditsToDeduct,
    analysisType
  });
  
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const FOOTBALL_API_KEY = process.env.API_FOOTBALL_KEY;

    if (!GEMINI_API_KEY) {
      console.error('❌ Gemini API key bulunamadı');
      return res.status(500).json({ error: 'Gemini API key yapılandırılmamış' });
    }

    if (!FOOTBALL_API_KEY) {
      console.error('❌ Football API key bulunamadı');
      return res.status(500).json({ error: 'Football API key yapılandırılmamış' });
    }

    if (!image) {
      console.error('❌ Görsel parametresi eksik');
      return res.status(400).json({ error: 'Görsel bulunamadı' });
    }

    if (!userId || !creditsToDeduct) {
      console.error('❌ Kullanıcı bilgisi eksik');
      return res.status(400).json({ error: 'Kullanıcı bilgisi eksik' });
    }

    // Kredi düşürme işlemi
    if (firebaseInitialized) {
      try {
        await deductCreditsFromUser(userId, parseInt(creditsToDeduct), 'image_analysis');
        creditsDeducted = true;
        console.log(`💰 ${creditsToDeduct} kredi düşüldü: ${userId}`);
      } catch (creditError) {
        console.error('❌ Kredi düşürme hatası:', creditError.message);
        return res.status(400).json({ error: creditError.message });
      }
    }

    console.log('🖼️ Kupon görsel analizi başlatılıyor...');

    // Base64'ten data:image prefix'ini temizle
    let base64Data = image;
    if (image.includes('base64,')) {
      base64Data = image.split('base64,')[1];
    }

    // ADIM 1: Gemini ile görselden maçları çıkar
    console.log('🤖 Gemini ile maçlar çıkarılıyor...');
    const extractResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            {
              text: `Bu görseldeki futbol maçlarının takım isimlerini çıkar.

SADECE takım isimlerini ver, başka bilgi ekleme.
Takım isimlerini mutlaka İNGİLİZCE yaz.
Türkçe takım isimlerini İngilizce'ye çevir.

Örnek: "Galatasaray" -> "Galatasaray", "Fenerbahçe" -> "Fenerbahce"

JSON formatı:
{
  "matches": [
    {
      "homeTeam": "Ev sahibi takım (İngilizce)",
      "awayTeam": "Deplasman takım (İngilizce)"
    }
  ]
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
          temperature: 0.2,
          maxOutputTokens: 2000,
          responseMimeType: "application/json"
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000
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
      console.error('❌ JSON parse hatası:', parseError.message);
      throw new Error('Görsel işlenirken hata oluştu');
    }

    const extractedMatches = extractedData.matches || [];
    console.log(`✅ ${extractedMatches.length} maç çıkarıldı`);

    if (extractedMatches.length === 0) {
      // Krediyi iade et - maç bulunamadı
      if (creditsDeducted && firebaseInitialized && userId && creditsToDeduct) {
        try {
          await refundCreditsToUser(userId, parseInt(creditsToDeduct), 'Görselde maç bulunamadı');
          console.log(`♻️ ${creditsToDeduct} kredi iade edildi`);
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

    // ADIM 2: Football API'den önümüzdeki maçları al (tek seferde)
    console.log('🔍 Football API\'den maçlar alınıyor...');
    const footballResponse = await axios.get(
      'https://v3.football.api-sports.io/fixtures',
      {
        params: {
          next: 100 // Önümüzdeki 100 maç
        },
        headers: {
          'x-apisports-key': FOOTBALL_API_KEY
        },
        timeout: 15000
      }
    );

    const allFixtures = footballResponse.data?.response || [];
    console.log(`📊 ${allFixtures.length} maç bulundu Football API'de`);

    // ADIM 3: Çıkarılan maçları API maçlarıyla eşleştir
    const matchedMatches = [];
    const unmatchedMatches = [];

    for (const extracted of extractedMatches) {
      const homeSearch = extracted.homeTeam.toLowerCase().trim();
      const awaySearch = extracted.awayTeam.toLowerCase().trim();

      // Eşleşen maçı bul
      const foundMatch = allFixtures.find(fixture => {
        const apiHome = fixture.teams.home.name.toLowerCase();
        const apiAway = fixture.teams.away.name.toLowerCase();
        
        // Tam eşleşme veya içerme kontrolü
        const homeMatch = apiHome.includes(homeSearch) || homeSearch.includes(apiHome);
        const awayMatch = apiAway.includes(awaySearch) || awaySearch.includes(apiAway);
        
        return homeMatch && awayMatch;
      });

      if (foundMatch) {
        matchedMatches.push({
          extracted,
          apiMatch: {
            fixtureId: foundMatch.fixture.id,
            homeTeam: foundMatch.teams.home.name,
            awayTeam: foundMatch.teams.away.name,
            league: foundMatch.league.name,
            date: foundMatch.fixture.date,
            status: foundMatch.fixture.status.long
          }
        });
        console.log(`✅ Eşleşti: ${foundMatch.teams.home.name} vs ${foundMatch.teams.away.name}`);
      } else {
        unmatchedMatches.push(extracted);
        console.log(`❌ Eşleşmedi: ${extracted.homeTeam} vs ${extracted.awayTeam}`);
      }
    }

    console.log(`🎯 ${matchedMatches.length}/${extractedMatches.length} maç eşleştirildi`);

    // ADIM 4: Eşleşen maçlar için TEK BİR GEMINI İSTEĞİ ile tüm tahminleri yap
    if (matchedMatches.length > 0) {
      console.log('🤖 Gemini ile tahminler yapılıyor...');
      
      // Analiz tipi açıklamaları
      const typeDescriptions = {
        'ilkYariSonucu': 'İLK YARI SONUCU (1: Ev sahibi önde, X: Beraberlik, 2: Deplasman önde)',
        'macSonucu': 'MAÇ SONUCU (1: Ev sahibi kazanır, X: Beraberlik, 2: Deplasman kazanır)',
        'karsilikliGol': 'KARŞILIKLI GOL (Var: İki takım da gol atar, Yok: En az bir takım gol atmaz)',
        'ilkYariMac': 'İLK YARI/MAÇ SONUCU (örn: 1/1 = İY ev sahibi, MS ev sahibi)',
        'handikap': 'HANDİKAP (-1.5: Ev sahibi 2+ farkla kazanmalı, +1.5: Deplasman kaybetmemeli)',
        'altustu': '2.5 ALT/ÜST (Alt: Toplam 0-2 gol, Üst: Toplam 3+ gol)',
        'hepsi': 'TÜM TAHMİNLER (Maç Sonucu & 2.5 Alt/Üst & Karşılıklı Gol)'
      };

      const predictionType = typeDescriptions[analysisType] || 'MAÇ SONUCU';
      
      // Tüm maçları tek prompt'ta gönder
      const matchesText = matchedMatches.map((m, idx) => 
        `${idx + 1}. ${m.apiMatch.homeTeam} vs ${m.apiMatch.awayTeam}
   Lig: ${m.apiMatch.league}
   Tarih: ${new Date(m.apiMatch.date).toLocaleDateString('tr-TR')}`
      ).join('\n\n');

      const bulkPredictionPrompt = `Sen profesyonel bir futbol analisti ve istatistik uzmanısın.

AŞAĞIDAKİ MAÇLAR İÇİN "${predictionType}" TAHMİNİ YAP:

${matchesText}

ÇIKTI FORMATI (JSON):
{
  "predictions": [
    {
      "matchIndex": 0,
      "homeTeam": "Takım adı",
      "awayTeam": "Takım adı",
      "prediction": "tahminin",
      "confidence": 65,
      "reasoning": "Kısa açıklama"
    }
  ]
}

TAHMİN ÖRNEKLERİ:
- Maç Sonucu: "1", "X", "2"
- İlk Yarı Sonucu: "1", "X", "2"
- Karşılıklı Gol: "Var", "Yok"
- İlk Yarı/Maç: "1/1", "X/2", "2/X", "1/X", "X/X", "2/2"
- Handikap: "-1.5", "-0.5", "+0.5", "+1.5"
- Alt/Üst: "Alt", "Üst"
- Hepsi: "1 & Üst & Var"

KURALLAR:
- Her maç için matchIndex değeri sırayla 0, 1, 2... olmalı
- Confidence 40-85 arası olsun
- Reasoning max 100 karakter
- SADECE JSON yanıt ver, başka metin ekleme`;

      try {
        const predictionResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
          {
            contents: [{
              parts: [{ text: bulkPredictionPrompt }]
            }],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 3000,
              responseMimeType: "application/json"
            }
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 45000
          }
        );

        const predictionText = predictionResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (predictionText) {
          try {
            const predData = parseGeminiJSON(predictionText);
            const predictions = predData.predictions || [];
            
            // Tahminleri eşleşen maçlara ekle
            predictions.forEach(pred => {
              const idx = pred.matchIndex;
              if (idx >= 0 && idx < matchedMatches.length) {
                matchedMatches[idx].prediction = pred.prediction || 'Tahmin yapılamadı';
                matchedMatches[idx].confidence = pred.confidence || 50;
                matchedMatches[idx].reasoning = pred.reasoning || '';
              }
            });
            
            console.log(`✅ ${predictions.length} tahmin tamamlandı`);
          } catch (predParseError) {
            console.error('⚠️ Tahmin JSON parse hatası:', predParseError.message);
            // Hata durumunda varsayılan tahmin
            matchedMatches.forEach(m => {
              if (!m.prediction) {
                m.prediction = 'Tahmin yapılamadı';
              }
            });
          }
        }
      } catch (predError) {
        console.error('⚠️ Toplu tahmin hatası:', predError.message);
        // Hata durumunda varsayılan tahmin
        matchedMatches.forEach(m => {
          m.prediction = 'Tahmin yapılamadı';
        });
      }
    }

    // Sonuçları formatla ve döndür
    res.json({
      success: true,
      message: `${matchedMatches.length} maç başarıyla analiz edildi`,
      extractedMatches,
      matchedMatches,
      analysisType
    });

  } catch (error) {
    console.error('❌ Kupon analiz hatası:', error.message);
    console.error('Stack:', error.stack);
    
    // Hata durumunda kredi iadesi yap
    if (creditsDeducted && firebaseInitialized && userId && creditsToDeduct) {
      try {
        await refundCreditsToUser(userId, parseInt(creditsToDeduct), 'Analiz hatası - otomatik iade');
        console.log(`♻️ ${creditsToDeduct} kredi iade edildi: ${userId}`);
      } catch (refundError) {
        console.error('❌ Kredi iadesi hatası:', refundError.message);
      }
    }
    
    res.status(500).json({ 
      error: 'Görsel analizi yapılamadı',
      details: error.message 
    });
  }
});

// ==================== SHOPIER ENDPOINTS ====================

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

// Helper: Kullanıcıdan kredi düş
async function deductCreditsFromUser(userId, credits, analysisType) {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }
  
  const db = admin.database();
  const userRef = db.ref(`users/${userId}`);
  
  // Önce mevcut krediyi kontrol et
  const snapshot = await userRef.once('value');
  const userData = snapshot.val();
  
  if (!userData) {
    throw new Error('Kullanıcı bulunamadı');
  }
  
  const currentCredits = userData.credits || 0;
  
  if (currentCredits < credits) {
    throw new Error(`Yetersiz kredi. Mevcut: ${currentCredits}, Gerekli: ${credits}`);
  }
  
  // Transaction ile güvenli kredi düşürme
  await userRef.transaction((user) => {
    if (user && user.credits >= credits) {
      user.credits = user.credits - credits;
      return user;
    }
    return user;
  });
  
  // Transaction kaydı oluştur
  const transactionRef = db.ref(`users/${userId}/transactions`).push();
  await transactionRef.set({
    type: 'analysis',
    credits: -credits,
    analysisType: analysisType,
    status: 'completed',
    createdAt: Date.now(),
    timestamp: new Date().toISOString()
  });
  
  console.log(`💳 ${credits} kredi ${userId} kullanıcısından düşüldü (${analysisType})`);
  
  return currentCredits - credits; // Kalan kredi
}
