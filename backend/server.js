// server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS ayarları - Tüm originlere izin ver (production'da domain belirtin)
app.use(cors({
  origin: '*', // Production'da: 'https://aikupon.com'
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// API-Football Proxy Endpoint
app.get('/api/football/*', async (req, res) => {
  try {
    const endpoint = req.params[0]; // teams, fixtures, standings vs.
    const API_KEY = process.env.API_FOOTBALL_KEY;
    
    if (!API_KEY) {
      console.error('❌ API_FOOTBALL_KEY .env dosyasında bulunamadı!');
      return res.status(500).json({ error: 'API key bulunamadı' });
    }

    console.log(`📡 API isteği: ${endpoint}`);
    console.log(`📋 Query parametreleri:`, req.query);

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
    console.log(`📊 Response status: ${response.status}`);
    console.log(`📦 Response data keys:`, Object.keys(response.data));
    
    // İstatistik isteği için özel log
    if (endpoint.includes('statistics')) {
      console.log(`📈 İstatistik sayısı:`, response.data.response?.length || 0);
      if (response.data.response?.[0]) {
        console.log(`🏠 Home team:`, response.data.response[0].team?.name);
        console.log(`📊 Home stats count:`, response.data.response[0].statistics?.length);
      }
      if (response.data.response?.[1]) {
        console.log(`✈️ Away team:`, response.data.response[1].team?.name);
        console.log(`📊 Away stats count:`, response.data.response[1].statistics?.length);
      }
    }

    // Teams statistics için özel log
    if (endpoint.includes('teams/statistics')) {
      console.log(`👥 Team Statistics Response:`, {
        hasResponse: !!response.data.response,
        responseType: typeof response.data.response,
        responseKeys: response.data.response ? Object.keys(response.data.response) : [],
        hasTeam: !!response.data.response?.team,
        teamName: response.data.response?.team?.name,
        hasForm: !!response.data.response?.form,
        form: response.data.response?.form
      });
    }

    // Standings isteği için özel log
    if (endpoint.includes('standings')) {
      console.log(`🏆 Standings count:`, response.data.response?.length || 0);
    }

    // H2H isteği için özel log
    if (endpoint.includes('headtohead')) {
      console.log(`🔄 H2H matches:`, response.data.response?.length || 0);
    }

    res.json(response.data);

  } catch (error) {
    console.error('❌ API hatası:', error.response?.data || error.message);
    console.error('❌ Error status:', error.response?.status);
    console.error('❌ Error headers:', error.response?.headers);
    
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit aşıldı',
        message: 'API günlük limiti doldu. Yarın tekrar deneyin.'
      });
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(401).json({ 
        error: 'API key geçersiz',
        message: 'Lütfen .env dosyasındaki API_FOOTBALL_KEY kontrol edin'
      });
    }

    res.status(500).json({ 
      error: 'API isteği başarısız',
      details: error.message,
      statusCode: error.response?.status
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!process.env.API_FOOTBALL_KEY
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Aikupon Backend Proxy',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      football: '/api/football/*'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend proxy sunucusu ${PORT} portunda çalışıyor`);
  console.log(`🔑 API Key durumu: ${process.env.API_FOOTBALL_KEY ? '✅ Tanımlı' : '❌ Tanımsız'}`);
});