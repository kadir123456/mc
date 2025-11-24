,// server.js - Ana Entry Point (Modüler Mimari)
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { firebaseInitialized } = require('./utils');

// Route'ları import et
const mainApiRoutes = require('./routes/mainApi');
const imageAnalysisRoutes = require('./routes/imageAnalysis');
const advancedImageAnalysisRoutes = require('./routes/advancedImageAnalysis');
const bulletinAnalysisRoutes = require('./routes/bulletinAnalysis');

const app = express();
const PORT = process.env.PORT || 3001;

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// ==================== ROUTES ====================
// Ana health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'aikupon-backend',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    firebase: firebaseInitialized,
    gemini: !!process.env.GEMINI_API_KEY || !!process.env.EMERGENT_LLM_KEY,
    football: !!process.env.FOOTBALL_API_KEY,
    emergentKey: !!process.env.EMERGENT_LLM_KEY
  });
});

// Ana API route'ları (Football API, Gemini basit analiz, Shopier)
app.use('/', mainApiRoutes);

// Gelişmiş görsel analiz route'ları
app.use('/', imageAnalysisRoutes);

// YENİ: Gelişmiş görsel analiz v3.0 (Fuzzy Matching + Gemini Doğrulama)
app.use('/', advancedImageAnalysisRoutes);

// YENİ: Bülten Analizi (Kullanıcı Maç Listesi)
app.use('/', bulletinAnalysisRoutes);

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('❌ Global hata:', err.message);
  res.status(500).json({ 
    error: 'Sunucu hatası',
    details: err.message 
  });
});

// ==================== SERVER START ====================
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 AIKUPON BACKEND SERVİSİ BAŞLATILDI (v2.0)');
  console.log('='.repeat(60));
  console.log(`📡 Port: ${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`\n📋 ANA API ROUTE'LARI:`);
  console.log(`   ⚽ Football API Proxy: /api/football/*`);
  console.log(`   🤖 Gemini Metin Analiz: /api/gemini/analyze`);
  console.log(`   🖼️  Gemini Basit Görsel: /api/gemini/analyze-image`);
  console.log(`   📦 Shopier Callback: /api/shopier/callback`);
  console.log(`\n🎯 GELİŞMİŞ ANALİZ ROUTE'LARI:`);
  console.log(`   📸 Kupon Görsel Analizi (ESKİ): /api/analyze-coupon-image`);
  console.log(`   🎯 Kupon Görsel Analizi (YENİ v3.0): /api/analyze-coupon-advanced`);
  console.log(`   📋 Bülten Analizi (Maç Listesi): /api/analyze-bulletin-advanced`);
  console.log(`\n🔧 SİSTEM:`);
  console.log(`   Firebase: ${firebaseInitialized ? '✅' : '❌'}`);
  console.log(`   Gemini API: ${process.env.GEMINI_API_KEY ? '✅' : '❌'}`);
  console.log(`   Emergent LLM Key: ${process.env.EMERGENT_LLM_KEY ? '✅ (Aktif)' : '❌'}`);
  console.log(`   Football API: ${process.env.FOOTBALL_API_KEY ? '✅' : '❌'}`);
  console.log('='.repeat(60) + '\n');
});

module.exports = app;