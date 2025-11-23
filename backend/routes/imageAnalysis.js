// routes/imageAnalysis.js - Gelişmiş Görsel Analiz
const express = require('express');
const axios = require('axios');
const router = express.Router();

const {
  firebaseInitialized,
  parseGeminiJSON,
  refundCreditsToUser,
  deductCreditsFromUser
} = require('../utils');

// ==================== GELİŞMİŞ GÖRSEL ANALİZ ====================

router.post('/api/analyze-coupon-image', async (req, res) => {
  let creditsDeducted = false;
  
  try {
    const { image, userId, creditsToDeduct, analysisType } = req.body;
    
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;

    // Validasyonlar
    if (!GEMINI_API_KEY) {
      console.error('❌ Gemini API key bulunamadı');
      return res.status(500).json({ error: 'Gemini API key yapılandırılmamış' });
    }

    if (!FOOTBALL_API_KEY) {
      console.error('❌ Football API key bulunamadı');
      return res.status(500).json({ error: 'Football API key yapılandırılmamış' });
    }

    if (!image || typeof image !== 'string' || image.length === 0) {
      console.error('❌ Görsel parametresi eksik');
      return res.status(400).json({ 
        error: 'Görsel bulunamadı',
        details: 'Lütfen geçerli bir görsel yükleyin'
      });
    }

    if (!userId || !creditsToDeduct) {
      console.error('❌ Kullanıcı bilgisi eksik');
      return res.status(400).json({ error: 'Kullanıcı bilgisi eksik' });
    }

    // Kredi düşürme
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

    console.log('\n🎯 GELİŞMİŞ KUPON ANALİZİ BAŞLIYOR...');

    // Base64 temizleme
    let base64Data = image;
    if (image.includes('base64,')) {
      base64Data = image.split('base64,')[1];
    }
    
    if (!base64Data || base64Data.length < 100) {
      throw new Error('Geçersiz görsel formatı');
    }
    
    console.log(`📏 Görsel boyutu: ${(base64Data.length / 1024 / 1024).toFixed(2)} MB`);

    // MIME type tespiti
    let mimeType = 'image/jpeg';
    if (image.startsWith('data:image/png')) {
      mimeType = 'image/png';
    } else if (image.startsWith('data:image/webp')) {
      mimeType = 'image/webp';
    }
    console.log(`🖼️ Görsel formatı: ${mimeType}`);

    // ========== ADIM 1: Gemini ile Takım İsimlerini Çıkar ==========
    console.log('\n📋 ADIM 1: Gemini ile takım isimleri çıkarılıyor...');
    
    const extractResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            {
              text: `Bu futbol kuponu görselindeki maçların takım isimlerini çıkar.

ÖNEMLİ KURALLAR:
1. Takım isimlerini TAM ve DOĞRU yaz
2. Kısaltmaları düzelt (örn: "GS" -> "Galatasaray", "FB" -> "Fenerbahce")
3. Türkçe karakterleri İngilizce'ye çevir (ş->s, ç->c, ı->i, ğ->g, ü->u, ö->o)
4. Resmi takım isimlerini kullan (örn: "Beşiktaş" -> "Besiktas")

JSON Formatı:
{
  "matches": [
    {
      "homeTeam": "Ev sahibi takım (tam isim, İngilizce)",
      "awayTeam": "Deplasman takım (tam isim, İngilizce)"
    }
  ]
}

SADECE JSON yanıt ver, başka açıklama ekleme.`
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000,
          responseMimeType: "application/json"
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
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
      throw new Error('Görsel işlenirken hata oluştu');
    }

    const extractedMatches = extractedData.matches || [];
    console.log(`✅ ${extractedMatches.length} maç çıkarıldı:`);
    extractedMatches.forEach((m, i) => {
      console.log(`   ${i+1}. ${m.homeTeam} vs ${m.awayTeam}`);
    });

    if (extractedMatches.length === 0) {
      // Kredi iadesi
      if (creditsDeducted && firebaseInitialized && userId && creditsToDeduct) {
        try {
          await refundCreditsToUser(userId, parseInt(creditsToDeduct), 'Görselde maç bulunamadı');
          console.log(`♻️ Kredi iade edildi`);
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

    // ========== ADIM 2: Football API'den Yaklaşan Maçları Al ==========
    console.log('\n⚽ ADIM 2: Football API\'den maçlar alınıyor...');
    
    const footballResponse = await axios.get(
      'https://v3.football.api-sports.io/fixtures',
      {
        params: {
          next: 150 // Önümüzdeki 150 maç
        },
        headers: {
          'x-apisports-key': FOOTBALL_API_KEY
        },
        timeout: 15000
      }
    );

    const allFixtures = footballResponse.data?.response || [];
    console.log(`✅ ${allFixtures.length} maç bulundu Football API'de`);

    // ========== ADIM 3: Maçları Eşleştir ==========
    console.log('\n🔗 ADIM 3: Maçlar eşleştiriliyor...');
    
    const matchedMatches = [];
    const unmatchedMatches = [];

    for (const extracted of extractedMatches) {
      const homeSearch = extracted.homeTeam.toLowerCase().trim();
      const awaySearch = extracted.awayTeam.toLowerCase().trim();

      // Normalize fonksiyonu
      const normalize = (str) => {
        return str
          .toLowerCase()
          .replace(/\s+/g, '')
          .replace(/[.-]/g, '');
      };

      const homeNorm = normalize(homeSearch);
      const awayNorm = normalize(awaySearch);

      // API'den maçı bul
      const foundMatch = allFixtures.find(fixture => {
        const apiHome = normalize(fixture.teams.home.name);
        const apiAway = normalize(fixture.teams.away.name);
        
        // Tam eşleşme veya içerme kontrolü
        const homeMatch = apiHome.includes(homeNorm) || homeNorm.includes(apiHome) || 
                          apiHome === homeNorm;
        const awayMatch = apiAway.includes(awayNorm) || awayNorm.includes(apiAway) ||
                          apiAway === awayNorm;
        
        return homeMatch && awayMatch;
      });

      if (foundMatch) {
        matchedMatches.push({
          extracted,
          fixtureId: foundMatch.fixture.id,
          homeTeam: foundMatch.teams.home.name,
          awayTeam: foundMatch.teams.away.name,
          league: foundMatch.league.name,
          date: foundMatch.fixture.date,
          status: foundMatch.fixture.status.long
        });
        console.log(`   ✅ ${foundMatch.teams.home.name} vs ${foundMatch.teams.away.name}`);
      } else {
        unmatchedMatches.push(extracted);
        console.log(`   ❌ Eşleşmedi: ${extracted.homeTeam} vs ${extracted.awayTeam}`);
      }
    }

    console.log(`\n🎯 Sonuç: ${matchedMatches.length}/${extractedMatches.length} maç eşleştirildi`);

    // ========== ADIM 4: Her Maç İçin İstatistik Çek ==========
    console.log('\n📊 ADIM 4: Maç istatistikleri çekiliyor...');
    
    for (let match of matchedMatches) {
      try {
        const statsResponse = await axios.get(
          'https://v3.football.api-sports.io/fixtures/statistics',
          {
            params: {
              fixture: match.fixtureId
            },
            headers: {
              'x-apisports-key': FOOTBALL_API_KEY
            },
            timeout: 10000
          }
        );

        const statistics = statsResponse.data?.response || [];
        
        if (statistics.length > 0) {
          match.statistics = {
            home: {},
            away: {}
          };

          // İstatistikleri parse et
          statistics.forEach((team, idx) => {
            const key = idx === 0 ? 'home' : 'away';
            team.statistics.forEach(stat => {
              match.statistics[key][stat.type] = stat.value;
            });
          });

          console.log(`   ✅ ${match.homeTeam}: istatistikler alındı`);
        } else {
          match.statistics = null;
          console.log(`   ⚠️ ${match.homeTeam}: istatistik yok`);
        }

        // Rate limit için kısa bekleme
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (statsError) {
        console.error(`   ❌ ${match.homeTeam}: istatistik hatası`);
        match.statistics = null;
      }
    }

    // ========== ADIM 5: Gemini ile Gerçek Veriye Dayalı Tahmin ==========
    console.log('\n🤖 ADIM 5: Gemini ile akıllı tahminler yapılıyor...');
    
    if (matchedMatches.length > 0) {
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
      
      const matchesText = matchedMatches.map((m, idx) => {
        let text = `${idx + 1}. ${m.homeTeam} vs ${m.awayTeam}
   Lig: ${m.league}
   Tarih: ${new Date(m.date).toLocaleDateString('tr-TR')}`;

        if (m.statistics) {
          text += `\n   📊 İSTATİSTİKLER:`;
          text += `\n      Ev Sahibi: Şut: ${m.statistics.home['Shots on Goal'] || 0}, Korner: ${m.statistics.home['Corner Kicks'] || 0}, Kart: ${m.statistics.home['Yellow Cards'] || 0}`;
          text += `\n      Deplasman: Şut: ${m.statistics.away['Shots on Goal'] || 0}, Korner: ${m.statistics.away['Corner Kicks'] || 0}, Kart: ${m.statistics.away['Yellow Cards'] || 0}`;
        } else {
          text += `\n   ⚠️ Canlı istatistik yok - genel form ve lig durumuna göre tahmin yap`;
        }

        return text;
      }).join('\n\n');

      const bulkPredictionPrompt = `Sen PROFESYONEL bir futbol analisti ve istatistik uzmanısın.

Aşağıdaki maçlar için "${predictionType}" tahmini yap.

${matchesText}

TAHMİN YÖNTEMİ:
1. İstatistikler varsa: Gerçek verilere dayalı objektif analiz yap
2. İstatistik yoksa: Takım formu, lig durumu, head-to-head geçmişe göre tahmin et
3. Her zaman mantıklı ve savunulabilir tahminler yap

ÇIKTI FORMATI (JSON):
{
  "predictions": [
    {
      "matchIndex": 0,
      "homeTeam": "Takım adı",
      "awayTeam": "Takım adı",
      "prediction": "tahminin",
      "confidence": 50-85,
      "reasoning": "İstatistik ve verilere dayalı açıklama (max 150 karakter)"
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

ÖNEMLİ:
- matchIndex 0'dan başla (0, 1, 2...)
- confidence 50-85 arası olsun (çok yüksek güven verme)
- reasoning'de kullandığın istatistikleri belirt
- SADECE JSON yanıt ver`;

      try {
        const predictionResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
          {
            contents: [{
              parts: [{ text: bulkPredictionPrompt }]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 4000,
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
            console.error('⚠️ Tahmin parse hatası:', predParseError.message);
            matchedMatches.forEach(m => {
              if (!m.prediction) {
                m.prediction = 'Tahmin yapılamadı';
                m.confidence = 50;
                m.reasoning = '';
              }
            });
          }
        }
      } catch (predError) {
        console.error('⚠️ Tahmin hatası:', predError.message);
        matchedMatches.forEach(m => {
          m.prediction = 'Tahmin yapılamadı';
          m.confidence = 50;
          m.reasoning = '';
        });
      }
    }

    // ========== SONUÇ ==========
    console.log('\n✅ ANALİZ TAMAMLANDI!');
    console.log(`   📊 ${extractedMatches.length} maç tespit edildi`);
    console.log(`   ✅ ${matchedMatches.length} maç eşleştirildi`);
    console.log(`   ❌ ${unmatchedMatches.length} maç eşleşmedi\n`);

    res.json({
      success: true,
      message: `${matchedMatches.length} maç başarıyla analiz edildi`,
      extractedMatches,
      matchedMatches,
      unmatchedMatches,
      analysisType
    });

  } catch (error) {
    console.error('❌ KUPON ANALİZ HATASI:', error.message);
    console.error('Stack:', error.stack);
    
    // Hata durumunda kredi iadesi
    if (creditsDeducted && firebaseInitialized) {
      const { userId, creditsToDeduct } = req.body || {};
      if (userId && creditsToDeduct) {
        try {
          await refundCreditsToUser(userId, parseInt(creditsToDeduct), 'Analiz hatası - otomatik iade');
          console.log(`♻️ Kredi iade edildi`);
        } catch (refundError) {
          console.error('❌ Kredi iadesi hatası:', refundError.message);
        }
      }
    }
    
    const errorMessage = error.message || 'Bilinmeyen hata';
    const errorDetails = error.response?.data?.error?.message || errorMessage;
    
    res.status(500).json({ 
      error: 'Görsel analizi yapılamadı',
      details: errorDetails,
      message: 'Lütfen daha küçük bir görsel deneyin veya görsel formatını kontrol edin'
    });
  }
});

module.exports = router;
