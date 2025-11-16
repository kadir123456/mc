// backend/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Multer setup (görsel upload için)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ============================================
// API-FOOTBALL PROXY
// ============================================
app.get('/api/football/*', async (req, res) => {
  try {
    const endpoint = req.params[0];
    const API_KEY = process.env.API_FOOTBALL_KEY;
    
    if (!API_KEY) {
      return res.status(500).json({ error: 'API key bulunamadı' });
    }

    console.log(`📡 API isteği: ${endpoint}`, req.query);

    const response = await axios.get(
      `https://v3.football.api-sports.io/${endpoint}`,
      {
        params: req.query,
        headers: { 'x-apisports-key': API_KEY },
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

// ============================================
// GÖRSEL ANALİZ ENDPOINT
// ============================================
app.post('/api/analyze-coupon-image', upload.single('image'), async (req, res) => {
  try {
    const { userId, creditsToDeduct } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ error: 'Görsel bulunamadı' });
    }

    console.log('🖼️ Görsel analizi başlatılıyor...');

    // 1️⃣ Gemini Vision ile OCR (maçları çıkar)
    const base64Image = imageFile.buffer.toString('base64');
    const extractedMatches = await extractMatchesFromImage(base64Image);

    if (!extractedMatches || extractedMatches.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Görselde maç bulunamadı' 
      });
    }

    console.log(`✅ ${extractedMatches.length} maç tespit edildi`);

    // 2️⃣ Gemini ile tahmin yap (SADECE YÜZDELER)
    const predictions = await analyzeMatchesWithGemini(extractedMatches);

    // 3️⃣ Kredi düş (Firebase - opsiyonel)
    // await deductUserCredits(userId, creditsToDeduct);

    res.json({
      success: true,
      predictions,
      message: `${predictions.length} maç analiz edildi`
    });

  } catch (error) {
    console.error('❌ Görsel analiz hatası:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Analiz başarısız' 
    });
  }
});

// ============================================
// GEMINI VISION - MAÇ ÇIKARMA
// ============================================
async function extractMatchesFromImage(base64Image) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key bulunamadı');
  }

  const prompt = `Görseldeki futbol maçlarını çıkar. SADECE JSON döndür:

{
  "matches": [
    {
      "homeTeam": "Manchester Utd",
      "awayTeam": "Liverpool",
      "league": "Premier League"
    }
  ]
}

KURALLAR:
- Takım isimlerini AYNEN yaz
- Maksimum 5 maç
- SADECE JSON, açıklama yok`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048
        }
      },
      { timeout: 60000 }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('JSON bulunamadı');
    }

    const data = JSON.parse(jsonMatch[0]);
    return data.matches || [];

  } catch (error) {
    console.error('❌ Gemini Vision hatası:', error);
    throw error;
  }
}

// ============================================
// GEMINI - TAHMİN YAPMA (SADECE YÜZDELER)
// ============================================
async function analyzeMatchesWithGemini(matches) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  const prompt = `Sen futbol analisti AI'sın. Maçlar için TAHMİN yap (SADECE YÜZDELER).

MAÇLAR:
${matches.map((m, i) => `${i + 1}. ${m.homeTeam} vs ${m.awayTeam} (${m.league})`).join('\n')}

GÖREV:
Her maç için tahmin yüzdelerini ver:
- Ev Sahibi Kazanır (MS1)
- Beraberlik (X)
- Deplasman Kazanır (MS2)
- Toplam 3+ Gol (2.5 Üst)
- Toplam 0-2 Gol (2.5 Alt)

ÇIKTI FORMATI (JSON):
{
  "predictions": [
    {
      "homeTeam": "Manchester Utd",
      "awayTeam": "Liverpool",
      "league": "Premier League",
      "predictions": {
        "ms1": 35,
        "msX": 25,
        "ms2": 40,
        "over25": 68,
        "under25": 32
      },
      "bestBet": {
        "type": "Deplasman + Üst 2.5",
        "percentage": 68
      }
    }
  ]
}

KRİTİK:
- MS1 + MSX + MS2 = 100
- OVER25 + UNDER25 = 100
- bestBet = en yüksek ihtimalli seçenek
- AÇIKLAMA YOK, SADECE RAKAMLAR!`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 3072
        }
      },
      { timeout: 60000 }
    );

    const text = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('JSON bulunamadı');
    }

    const data = JSON.parse(jsonMatch[0]);
    return data.predictions || [];

  } catch (error) {
    console.error('❌ Gemini tahmin hatası:', error);
    throw error;
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend sunucusu ${PORT} portunda çalışıyor`);
});
