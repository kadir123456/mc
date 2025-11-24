// routes/advancedImageAnalysis.js - Gelişmiş Görsel Analiz (v3.0 - İKİ AŞAMALI GEMİNİ + FUZZY MATCHING)
const express = require('express');
const axios = require('axios');
const router = express.Router();

// ==================== HELPER FUNCTIONS ====================

// Gemini JSON yanıtını güvenli şekilde parse et
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

// Takım ismi benzerlik skoru hesapla (Levenshtein Distance + Fuzzy Matching)
function calculateSimilarity(str1, str2) {
  const normalize = (str) => {
    return str
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[.-]/g, '')
      .replace(/ş/g, 's')
      .replace(/ç/g, 'c')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o');
  };
  
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  // Tam eşleşme
  if (s1 === s2) return 1.0;
  
  // İçerme kontrolü
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;
  
  // Levenshtein distance
  const matrix = Array(s2.length + 1).fill(null).map(() => 
    Array(s1.length + 1).fill(null)
  );
  
  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - (distance / maxLength);
}

// Gemini API helper fonksiyonu
async function callGeminiAPI(prompt, responseFormat = 'json', temperature = 0.3, GEMINI_API_KEY) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key bulunamadı');
  }

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature,
        maxOutputTokens: 8000,
        responseMimeType: responseFormat === 'json' ? 'application/json' : 'text/plain'
      }
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000
    }
  );

  return response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
}

// Gemini ile maç eşleştirme doğrulama
async function validateMatchWithGemini(extractedMatch, apiMatch, GEMINI_API_KEY) {
  try {
    const validationPrompt = `Bu iki takım çifti AYNI MAÇI mi temsil ediyor?

ÇİFT 1 (Kullanıcının görselden): ${extractedMatch.homeTeam} vs ${extractedMatch.awayTeam}
ÇİFT 2 (Football API'den): ${apiMatch.teams.home.name} vs ${apiMatch.teams.away.name}

KURALLAR:
- Takım isimleri farklı dillerde olabilir (Türkçe/İngilizce)
- Kısaltmalar kullanılmış olabilir
- Küçük yazım farklılıkları göz ardı edilebilir
- ANCAK farklı takımlar kesinlikle "false" olmalı

JSON yanıt ver:
{
  "isMatch": true/false,
  "confidence": 0-100,
  "reason": "kısa açıklama"
}`;

    const validationText = await callGeminiAPI(validationPrompt, 'json', 0.1, GEMINI_API_KEY);
    const validationData = parseGeminiJSON(validationText);
    
    return validationData.isMatch && validationData.confidence >= 75;
    
  } catch (error) {
    console.error('   ⚠️ Gemini doğrulama hatası:', error.message);
    return true; // Hata durumunda eşleşmeyi kabul et
  }
}

// ==================== YENİ ENDPOINT: /api/analyze-coupon-advanced ====================

router.post('/api/analyze-coupon-advanced', async (req, res) => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 GELİŞMİŞ KUPON ANALİZİ BAŞLATILIYOR (v3.0)');
    console.log('='.repeat(80));

    const { image, userId, creditsToDeduct, analysisType } = req.body;
    
    // ENV değişkenleri
    const GEMINI_API_KEY = process.env.EMERGENT_LLM_KEY || process.env.VITE_GEMINI_API_KEY;
    const FOOTBALL_API_KEY = process.env.VITE_FOOTBALL_API_KEY;

    console.log('\n📋 PARAMETRE KONTROLÜ:');
    console.log(`   ├─ userId: ${userId || 'YOK'}`);
    console.log(`   ├─ creditsToDeduct: ${creditsToDeduct || 'YOK'}`);
    console.log(`   ├─ analysisType: ${analysisType || 'hepsi'}`);
    console.log(`   ├─ GEMINI_API_KEY: ${GEMINI_API_KEY ? '✅ MEVCUT' : '❌ EKSİK'}`);
    console.log(`   └─ FOOTBALL_API_KEY: ${FOOTBALL_API_KEY ? '✅ MEVCUT' : '❌ EKSİK'}`);

    // Validasyonlar
    if (!GEMINI_API_KEY) {
      console.error('\n❌ HATA: Gemini API key bulunamadı');
      return res.status(500).json({ error: 'Gemini API key yapılandırılmamış' });
    }

    if (!FOOTBALL_API_KEY) {
      console.error('\n❌ HATA: Football API key bulunamadı');
      return res.status(500).json({ error: 'Football API key yapılandırılmamış' });
    }

    if (!image || typeof image !== 'string' || image.length === 0) {
      console.error('\n❌ HATA: Görsel parametresi eksik veya geçersiz');
      return res.status(400).json({ 
        error: 'Görsel bulunamadı',
        details: 'Lütfen geçerli bir görsel yükleyin'
      });
    }

    // Base64 temizleme
    let base64Data = image;
    if (image.includes('base64,')) {
      base64Data = image.split('base64,')[1];
    }
    
    if (!base64Data || base64Data.length < 100) {
      console.error('\n❌ HATA: Geçersiz görsel formatı');
      throw new Error('Geçersiz görsel formatı');
    }
    
    console.log(`\n📏 Görsel bilgileri:`);
    console.log(`   └─ Boyut: ${(base64Data.length / 1024 / 1024).toFixed(2)} MB`);

    // MIME type tespiti
    let mimeType = 'image/jpeg';
    if (image.startsWith('data:image/png')) {
      mimeType = 'image/png';
    } else if (image.startsWith('data:image/webp')) {
      mimeType = 'image/webp';
    }
    console.log(`   └─ Format: ${mimeType}`);

    // ========== ADIM 1: Gemini ile Takım İsimlerini Çıkar ve Normalize Et ==========
    console.log('\n' + '─'.repeat(80));
    console.log('📋 ADIM 1: GEMİNİ İLE TAKIM İSİMLERİNİ ÇIKARMA VE NORMALİZE ETME');
    console.log('─'.repeat(80));
    
    const extractResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            {
              text: `Bu futbol kuponu görselindeki maçların takım isimlerini çıkar ve NORMALIZE ET.

ÇOK ÖNEMLİ KURALLAR:
1. Takım isimlerini TAM ve DOĞRU ULUSLARARASI İSİMLERİYLE yaz
2. Kısaltmaları düzelt ve resmi İngilizce isimlerini kullan:
   - "GS" / "Gala" -> "Galatasaray"
   - "FB" / "Fener" -> "Fenerbahce"  
   - "BJK" / "Beşiktaş" -> "Besiktas"
   - "TS" / "Trabzon" -> "Trabzonspor"
   - "Man Utd" / "Man United" -> "Manchester United"
   - "Man City" -> "Manchester City"
   - "Bayern" -> "Bayern Munich"
   - "PSG" -> "Paris Saint Germain"
   - "Real" -> "Real Madrid"
   - "Barca" -> "Barcelona"
3. Türkçe karakterleri İngilizce'ye çevir (ş->s, ç->c, ı->i, ğ->g, ü->u, ö->o)
4. Takım isimlerini Football API'de bulunabilecek şekilde normalize et
5. Şehir isimleri varsa tam takım adını ekle

JSON Formatı:
{
  "matches": [
    {
      "homeTeam": "Ev sahibi takım (orijinal görsel)",
      "awayTeam": "Deplasman takım (orijinal görsel)",
      "normalizedHome": "Arama için optimize edilmiş İngilizce isim",
      "normalizedAway": "Arama için optimize edilmiş İngilizce isim"
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
          maxOutputTokens: 3000,
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
      console.error('\n❌ HATA: Gemini yanıtı alınamadı');
      throw new Error('Gemini yanıtı alınamadı');
    }

    let extractedData;
    try {
      extractedData = parseGeminiJSON(extractText);
    } catch (parseError) {
      console.error('\n❌ HATA: Gemini yanıtı parse edilemedi:', parseError.message);
      throw new Error('Görsel işlenirken hata oluştu');
    }

    const extractedMatches = extractedData.matches || [];
    
    console.log(`\n✅ Gemini analizi tamamlandı:`);
    console.log(`   └─ Bulunan maç sayısı: ${extractedMatches.length}`);
    
    if (extractedMatches.length > 0) {
      console.log('\n📊 Çıkarılan maçlar:');
      extractedMatches.forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.homeTeam} vs ${m.awayTeam}`);
        console.log(`      └─ Normalized: ${m.normalizedHome} vs ${m.normalizedAway}`);
      });
    }

    if (extractedMatches.length === 0) {
      console.log('\n⚠️ UYARI: Görselde hiç maç bulunamadı');
      return res.json({
        success: true,
        message: 'Görselde maç bulunamadı.',
        extractedMatches: [],
        matchedMatches: [],
        analysisType
      });
    }

// ========== ADIM 2: Football API'den Yaklaşan Maçları Al ==========
    console.log('\n' + '─'.repeat(80));
    console.log('⚽ ADIM 2: FOOTBALL API\'DEN YAKLAŞAN MAÇLARI ÇEKME');
    console.log('─'.repeat(80));
    
    console.log('\n🔍 API isteği gönderiliyor...');
    console.log(`   ├─ Endpoint: https://v3.football.api-sports.io/fixtures`);
    console.log(`   ├─ Parametre: date (bugün ve yarın)`);
    console.log(`   └─ Timeout: 20 saniye`);

    // Bugün ve yarının maçlarını çek
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`   ├─ Bugün: ${todayStr}`);
    console.log(`   └─ Yarın: ${tomorrowStr}`);
    
    // İki istek paralel olarak
    const [todayResponse, tomorrowResponse] = await Promise.all([
      axios.get('https://v3.football.api-sports.io/fixtures', {
        params: { date: todayStr },
        headers: {
          'x-rapidapi-host': 'v3.football.api-sports.io',
          'x-rapidapi-key': FOOTBALL_API_KEY
        },
        timeout: 20000
      }),
      axios.get('https://v3.football.api-sports.io/fixtures', {
        params: { date: tomorrowStr },
        headers: {
          'x-rapidapi-host': 'v3.football.api-sports.io',
          'x-rapidapi-key': FOOTBALL_API_KEY
        },
        timeout: 20000
      })
    ]);
    
    // Maçları birleştir
    const allFixtures = [
      ...(todayResponse.data.response || []),
      ...(tomorrowResponse.data.response || [])
    ];
    
    console.log(`\n✅ Football API yanıtı alındı:`);
    console.log(`   ├─ Bugün: ${todayResponse.data.response?.length || 0} maç`);
    console.log(`   ├─ Yarın: ${tomorrowResponse.data.response?.length || 0} maç`);
    console.log(`   └─ Toplam: ${allFixtures.length} maç`);

    if (allFixtures.length === 0) {
      console.error('\n❌ HATA: Football API\'den maç alınamadı');
      return res.json({
        success: false,
        message: 'Football API\'den maç bilgisi alınamadı.',
        extractedMatches,
        matchedMatches: [],
        analysisType
      });
    }

    // ========== ADIM 3: Akıllı Maç Eşleştirme (FUZZY MATCHING + GEMİNİ DOĞRULAMA) ==========
    console.log('\n' + '─'.repeat(80));
    console.log('🔗 ADIM 3: AKILLI MAÇ EŞLEŞTİRME (FUZZY MATCHING + GEMİNİ DOĞRULAMA)');
    console.log('─'.repeat(80));
    
    const matchedMatches = [];
    const unmatchedMatches = [];

    for (let idx = 0; idx < extractedMatches.length; idx++) {
      const extracted = extractedMatches[idx];
      const homeSearch = extracted.normalizedHome || extracted.homeTeam;
      const awaySearch = extracted.normalizedAway || extracted.awayTeam;
      
      console.log(`\n🔍 Maç ${idx + 1}/${extractedMatches.length}: ${homeSearch} vs ${awaySearch}`);

      // Fuzzy matching ile en iyi eşleşmeyi bul
      let bestMatch = null;
      let bestScore = 0;

      for (const fixture of allFixtures) {
        const apiHome = fixture.teams.home.name;
        const apiAway = fixture.teams.away.name;
        
        // Her iki takım için benzerlik skorları hesapla
        const homeSimilarity = calculateSimilarity(apiHome, homeSearch);
        const awaySimilarity = calculateSimilarity(apiAway, awaySearch);
        
        // Ortalama skor
        const avgScore = (homeSimilarity + awaySimilarity) / 2;
        
        // En az %75 benzerlik gerekli
        if (avgScore >= 0.75 && avgScore > bestScore) {
          bestScore = avgScore;
          bestMatch = {
            fixture,
            homeScore: homeSimilarity,
            awayScore: awaySimilarity,
            avgScore
          };
        }
      }

      if (bestMatch) {
        console.log(`   ├─ 📊 Fuzzy Match Bulundu:`);
        console.log(`   │  └─ ${bestMatch.fixture.teams.home.name} vs ${bestMatch.fixture.teams.away.name}`);
        console.log(`   ├─ 📈 Benzerlik Skorları:`);
        console.log(`   │  ├─ Ev Sahibi: %${(bestMatch.homeScore * 100).toFixed(0)}`);
        console.log(`   │  ├─ Deplasman: %${(bestMatch.awayScore * 100).toFixed(0)}`);
        console.log(`   │  └─ Ortalama: %${(bestMatch.avgScore * 100).toFixed(0)}`);
        
        // Gemini ile doğrula
        console.log(`   ├─ 🤖 Gemini ile doğrulanıyor...`);
        const isValid = await validateMatchWithGemini(extracted, bestMatch.fixture, GEMINI_API_KEY);
        
        if (isValid) {
          matchedMatches.push({
            extracted,
            fixtureId: bestMatch.fixture.fixture.id,
            homeTeam: bestMatch.fixture.teams.home.name,
            awayTeam: bestMatch.fixture.teams.away.name,
            homeTeamId: bestMatch.fixture.teams.home.id,
            awayTeamId: bestMatch.fixture.teams.away.id,
            league: bestMatch.fixture.league.name,
            leagueId: bestMatch.fixture.league.id,
            season: bestMatch.fixture.league.season,
            date: bestMatch.fixture.fixture.date,
            status: bestMatch.fixture.fixture.status.long,
            similarityScore: bestMatch.avgScore
          });
          console.log(`   └─ ✅ Gemini ONAYLADI - Eşleşme kabul edildi\n`);
        } else {
          unmatchedMatches.push(extracted);
          console.log(`   └─ ❌ Gemini ONAYLAMADI - Eşleşme reddedildi\n`);
        }
      } else {
        unmatchedMatches.push(extracted);
        console.log(`   └─ ❌ Fuzzy matching ile eşleşme bulunamadı (%75 altında)\n`);
      }
      
      // Rate limit için kısa bekleme
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // ========== SONUÇ ==========
    console.log('\n' + '='.repeat(80));
    console.log('✅ GELİŞMİŞ KUPON ANALİZİ TAMAMLANDI!');
    console.log('='.repeat(80));
    console.log(`\n📊 ÖZET:`);
    console.log(`   ├─ Görselden çıkarılan maç: ${extractedMatches.length}`);
    console.log(`   ├─ Başarıyla eşleştirilen: ${matchedMatches.length}`);
    console.log(`   └─ Eşleşmeyen: ${unmatchedMatches.length}`);
    console.log('\n' + '='.repeat(80) + '\n');

    res.json({
      success: true,
      message: `${matchedMatches.length} maç başarıyla analiz edildi`,
      extractedMatches,
      matchedMatches,
      unmatchedMatches,
      analysisType
    });

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ KUPON ANALİZ HATASI');
    console.error('='.repeat(80));
    console.error(`Hata: ${error.message}`);
    console.error(`Stack: ${error.stack}`);
    console.error('='.repeat(80) + '\n');
    
    const errorMessage = error.message || 'Bilinmeyen hata';
    const errorDetails = error.response?.data?.error?.message || errorMessage;
    
    res.status(500).json({ 
      error: 'Görsel analizi yapılamadı',
      details: errorDetails,
      message: 'Lütfen tekrar deneyin veya daha küçük bir görsel yükleyin'
    });
  }
});

module.exports = router;
