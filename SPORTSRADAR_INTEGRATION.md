# Sportsradar API Entegrasyon Dokümantasyonu

## Proje Yapısı

```
project/
├── src/
│   ├── services/
│   │   ├── sportsradarService.ts       # YENİ: Sportsradar API servisi
│   │   ├── couponAnalysisOrchestrator.ts # Güncellendi
│   │   ├── geminiAnalysisService.ts    # Güncellendi
│   │   ├── geminiVisionService.ts      # Gemini Vision OCR
│   │   ├── googleSearchService.ts      # ESKİ: Artık kullanılmıyor
│   │   ├── analysisService.ts          # ESKİ servis
│   │   ├── authService.ts
│   │   ├── firebase.ts
│   │   └── pytrService.ts
│   ├── components/
│   ├── pages/
│   └── types/
├── .env
└── package.json
```

## Sistem Akışı

### 1. Görsel Yükleme ve Analiz
```
Kullanıcı Görseli Yükler
    ↓
Gemini Vision API (OCR)
    ↓
Maç Bilgileri Tespit Edilir
    ↓
Sportsradar API (Canlı Veri)
    ↓
Gemini Analysis (Final Analiz)
    ↓
Kullanıcıya Sonuç
```

### 2. Sportsradar API Entegrasyonu

#### Environment Variables (Render.com)
```env
VITE_SPORTSRADAR_API_KEY=your_40_character_api_key
VITE_SPORTSRADAR_API_BASE_URL=https://api.sportradar.com
VITE_SPORTSRADAR_TRIAL_MODE=true
```

#### API Özellikleri
- **Endpoint**: `/soccer/trial/v4/en/` (trial mode)
- **Endpoint**: `/soccer/official/v4/en/` (production mode)
- **Authentication**: Header `x-api-key`
- **Rate Limiting**: Otomatik bekleme süreleri eklendi (500ms-1000ms)
- **Cache**: 6 saat Firebase Realtime Database

#### Desteklenen Veriler
1. **Takım Arama**: `competitions.json` ve `standings.json` kullanılarak
2. **Son 5 Maç**: Team profile API
3. **Lig Sıralaması**: Standings API
4. **Sakatlık Bilgisi**: Squad API

### 3. Cache Sistemi

#### Firebase Realtime Database Yapısı
```
sportsradar_cache/
  ├── {league}/
  │   └── {teamHome}_{teamAway}/
  │       ├── matchId
  │       ├── teamHome
  │       ├── teamAway
  │       ├── league
  │       ├── homeForm
  │       ├── awayForm
  │       ├── h2h
  │       ├── injuries
  │       ├── leaguePosition
  │       ├── dataSources
  │       ├── confidenceScore
  │       └── lastUpdated
```

**Cache Süresi**: 6 saat
**Avantajlar**:
- API çağrı sayısını azaltır
- Rate limit koruması
- Hızlı yanıt süreleri

### 4. Bilinen Sorunlar ve Çözümler

#### Sorun 1: "Permission denied" Hatası
**Sebep**: Trial API key yeterli izinlere sahip değil
**Çözüm**:
```typescript
// sportsradarService.ts içinde fallback mekanizması var
return {
  homeForm: 'Sportsradar API hatası',
  awayForm: 'Sportsradar API hatası',
  // ...
  confidenceScore: 0,
};
```

#### Sorun 2: Kadın Futbolu Desteği
**Sebep**: Trial API bazı ligleri desteklemiyor
**Çözüm**: Production API key gerekli veya alternatif veri kaynağı

#### Sorun 3: Firebase Storage Base64 Hatası
**Sebep**: Base64 URL'ler geçersiz format
**Çözüm**: Görsel yükleme mantığı güncellendi (aşağıda detay)

### 5. API Kullanım Örnekleri

#### Takım Arama
```typescript
const teamId = await findTeamByName('Manchester United');
```

#### Takım İstatistikleri
```typescript
const stats = await getTeamStats(teamId, 'Manchester United');
// Returns: { recentMatches, standings, injuries }
```

#### Tam Maç Analizi
```typescript
const matchData = await sportsradarService.fetchMatchData(match);
console.log(matchData.homeForm);
console.log(matchData.confidenceScore);
```

### 6. Performans Optimizasyonları

#### Rate Limiting Koruması
```typescript
// Her takım aramasından sonra 100ms bekleme
await new Promise(resolve => setTimeout(resolve, 100));

// Her istatistik çekiminden sonra 500ms bekleme
await new Promise(resolve => setTimeout(resolve, 500));

// Maçlar arası 1000ms bekleme
await new Promise(resolve => setTimeout(resolve, 1000));
```

#### Paralel İşlem Engelleme
```typescript
// Maçlar sırayla işlenir (paralel değil)
for (const match of matches) {
  const data = await this.fetchMatchData(match);
  results.push(data);
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

### 7. Hata Yönetimi

#### API Hataları
```typescript
try {
  const response = await makeApiRequest(endpoint);
  return response.data;
} catch (error) {
  if (error.response) {
    console.error(`Sportsradar API hatası: ${error.response.status}`);
  }
  // Fallback verileri döndür
  return fallbackData;
}
```

#### Timeout Yönetimi
```typescript
const response = await axios.get(url, {
  timeout: 15000, // 15 saniye
});
```

## Deployment Notları

### Render.com Environment Variables
1. Dashboard → Environment sekmesi
2. Aşağıdaki değişkenleri ekle:
   ```
   VITE_SPORTSRADAR_API_KEY=XXXXX
   VITE_SPORTSRADAR_API_BASE_URL=https://api.sportradar.com
   VITE_SPORTSRADAR_TRIAL_MODE=true
   ```
3. Save Changes
4. Deploy Again

### Production'a Geçiş
1. `VITE_SPORTSRADAR_TRIAL_MODE=false` yap
2. Production API key kullan
3. URL otomatik olarak `/official/` path'ine geçer

## Test Senaryoları

### Manuel Test
1. Bir kupon görseli yükle
2. Console'da şu logları kontrol et:
   ```
   🔍 Sportsradar: "TeamName" aranıyor...
   ✅ Takım bulundu: TeamName (ID: xxx)
   📊 Sportsradar: TeamName için istatistikler alınıyor...
   ✅ Sportsradar: HomeTeam vs AwayTeam verileri cache'lendi
   ```

### Hata Testleri
1. Geçersiz API key ile test
2. Rate limit aşımı testi
3. Timeout testi
4. Cache testi (aynı maçı 2 kez analiz et)

## API Limitleri (Trial Mode)

- **Requests/day**: Sınırlı (dokümantasyona bakın)
- **Requests/second**: 1 (kod içinde kontrol ediliyor)
- **Supported Leagues**: Premier League, La Liga, Bundesliga, Serie A, Ligue 1
- **Women's Football**: Desteklenmiyor olabilir

## İletişim ve Destek

Sorun yaşarsanız:
1. Console loglarını kontrol edin
2. Firebase Realtime Database'i kontrol edin
3. API key izinlerini kontrol edin
4. Sportsradar dokümantasyonuna bakın: https://developer.sportradar.com/

## Güncelleme Geçmişi

- **v1.0** (2025-01-12): Sportsradar API entegrasyonu tamamlandı
  - Google Search yerine Sportsradar API kullanılıyor
  - 6 saatlik cache sistemi
  - Rate limiting koruması
  - Fallback mekanizmaları
