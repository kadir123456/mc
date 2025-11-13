# 🔧 API-FOOTBALL ENTEGRASYONU

**Tarih**: 13 Kasım 2025
**API**: API-Football v3.9.3
**URL**: https://v3.football.api-sports.io
**Durum**: 🔄 HAZIR (API Key gerekli)

---

## 📋 ÖNEMLİ BİLGİLER

### API Limitleri:

```
Free Plan:
- 100 istek/gün
- Rate Limit: 10 istek/dakika
- Timezone: Destekli
- Cache: Önerilen (24 saat)
```

### Kullandığımız Endpointler:

```
1. /leagues       → Lig bilgisi
2. /teams         → Takım bilgisi (search ile)
3. /fixtures      → Maç bilgisi
4. /standings     → Puan durumu
5. /fixtures/statistics → Maç istatistikleri (opsiyonel)
6. /fixtures/headtohead → H2H (opsiyonel)
```

### Başlıklar (Headers):

```javascript
{
  'x-apisports-key': 'YOUR_API_KEY_HERE'
}
```

**ÖNEMLİ:** Sadece `x-apisports-key` başlığı kullanılmalı. Ekstra başlık eklenirse API hata verir!

---

## 🔑 API KEY KURULUMU

### Adım 1: API Key Alın

1. https://www.api-football.com adresine gidin
2. Ücretsiz hesap oluşturun
3. Dashboard'dan API Key'inizi kopyalayın

### Adım 2: .env Dosyasına Ekleyin

`.env` dosyanıza ekleyin:

```env
VITE_API_FOOTBALL_KEY=your_api_key_here
```

### Adım 3: Render.com'a Ekleyin

Render.com Dashboard → Environment Variables:

```
Key: VITE_API_FOOTBALL_KEY
Value: your_api_key_here
```

---

## 📊 SİSTEMİMİZDEKİ KULLANIM

### Günlük İstek Tahminleri:

```
3 maç analizi × 10 kullanıcı = 30 analiz/gün

Her analiz için:
- OCR (Gemini): 1 istek (ücretsiz - bizim API)
- Maç tespiti: 0 istek (cache'ten)
- Her maç için:
  1. findLeagueId → 1 istek (ilk kez) sonra cache
  2. findTeam (home) → 1 istek (ilk kez) sonra cache
  3. findTeam (away) → 1 istek (ilk kez) sonra cache
  4. getTeamStanding (home) → 1 istek
  5. getTeamStanding (away) → 1 istek
  6. getTeamForm (home) → 1 istek
  7. getTeamForm (away) → 1 istek
  8. getH2H → 1 istek (opsiyonel)
  9. getInjuries (home) → 1 istek (opsiyonel)
  10. getInjuries (away) → 1 istek (opsiyonel)

İLK KEZ: 3 maç × 10 istek = 30 istek ✅
CACHE İLE: 3 maç × 5 istek = 15 istek ✅✅

Günlük: 10 kullanıcı × 15 istek = 150 istek
LIMIT: 100 istek/gün ❌

ÇÖZÜM: Cache + IP bazlı rate limiting
```

### Cache Stratejisi:

```typescript
// Firebase Realtime Database
{
  "api_football_cache": {
    "leagues": {
      "Premier League": { id: 39, ... },
      "La Liga": { id: 140, ... }
    },
    "teams": {
      "Manchester United": { id: 33, ... },
      "Barcelona": { id: 529, ... }
    },
    "standings": {
      "39_2024": { ... } // leagueId_season
    },
    "form": {
      "33_5": { ... } // teamId_lastN
    },
    "h2h": {
      "33_34": { ... } // team1Id_team2Id
    }
  }
}
```

**Cache Süresi:**
- Ligler: 7 gün (nadiren değişir)
- Takımlar: 30 gün (nadiren değişir)
- Puan durumu: 24 saat
- Form: 24 saat
- H2H: 7 gün

---

## 🎯 API KULLANIM ÖRNEKLERİ

### 1. Lig Arama

```javascript
// Lig adını ID'ye çevir
const response = await fetch(
  'https://v3.football.api-sports.io/leagues?name=premier league&current=true',
  {
    headers: {
      'x-apisports-key': API_KEY
    }
  }
);

// Response:
{
  "response": [
    {
      "league": {
        "id": 39,
        "name": "Premier League",
        "country": "England",
        "logo": "https://media.api-sports.io/football/leagues/39.png"
      },
      "country": {
        "name": "England",
        "code": "GB",
        "flag": "https://media.api-sports.io/flags/gb.svg"
      },
      "seasons": [...]
    }
  ]
}
```

### 2. Takım Arama

```javascript
// Takım adını ID'ye çevir
const response = await fetch(
  'https://v3.football.api-sports.io/teams?search=manchester united',
  {
    headers: {
      'x-apisports-key': API_KEY
    }
  }
);

// Response:
{
  "response": [
    {
      "team": {
        "id": 33,
        "name": "Manchester United",
        "code": "MUN",
        "country": "England",
        "logo": "https://media.api-sports.io/football/teams/33.png"
      },
      "venue": {
        "id": 556,
        "name": "Old Trafford",
        "city": "Manchester"
      }
    }
  ]
}
```

### 3. Puan Durumu

```javascript
const response = await fetch(
  'https://v3.football.api-sports.io/standings?league=39&season=2024&team=33',
  {
    headers: {
      'x-apisports-key': API_KEY
    }
  }
);

// Response:
{
  "response": [
    {
      "league": {
        "id": 39,
        "name": "Premier League",
        "standings": [
          [
            {
              "rank": 3,
              "team": {
                "id": 33,
                "name": "Manchester United"
              },
              "points": 45,
              "goalsDiff": 12,
              "all": {
                "played": 20,
                "win": 13,
                "draw": 6,
                "lose": 1
              }
            }
          ]
        ]
      }
    }
  ]
}
```

### 4. Takım Formu

```javascript
const response = await fetch(
  'https://v3.football.api-sports.io/fixtures?team=33&last=5',
  {
    headers: {
      'x-apisports-key': API_KEY
    }
  }
);

// Response: Son 5 maç
{
  "response": [
    {
      "fixture": { ... },
      "teams": { home: {...}, away: {...} },
      "goals": { home: 2, away: 1 }, // W
      "score": { ... }
    },
    // ... 4 maç daha
  ]
}
```

### 5. Head to Head

```javascript
const response = await fetch(
  'https://v3.football.api-sports.io/fixtures/headtohead?h2h=33-34&last=5',
  {
    headers: {
      'x-apisports-key': API_KEY
    }
  }
);
```

---

## 🚨 ÖZEL DURUMLAR

### 1. Küçük Ligler (Lüksemburg U21 gibi)

```javascript
// API-Football'da olmayabilir
const leagues = await searchLeague('U21 Avrupa Şampiyonası Elemeleri');

if (!leagues || leagues.length === 0) {
  // Veri yok
  throw new Error('Bu lig API-Football\'da bulunmuyor. Büyük ligleri deneyin.');
}
```

**Desteklenen Ligler:**
- Premier League ✅
- La Liga ✅
- Bundesliga ✅
- Serie A ✅
- Ligue 1 ✅
- Champions League ✅
- Europa League ✅
- Dünya Kupası ✅
- Euro ✅
- Ulusal Ligler (çoğu) ✅
- U21/U19 (bazı ülkeler) ⚠️
- Küçük ligler ❌

### 2. Fuzzy Matching

```javascript
// Kullanıcı: "Manchester"
// API: "Manchester United"

const searchTerm = 'manchester';
const teams = await searchTeam(searchTerm);

// Eşleştirme:
// - Tam eşleşme: "Manchester United" ✅
// - Kısmi eşleşme: "Manchester City" ✅
// - Benzer: "Manchester..." ✅
```

### 3. Alternatif Takım İsimleri

```javascript
// Kullanıcıdan: "Man United"
// API'de: "Manchester United"

const TEAM_ALIASES = {
  'Man United': 'Manchester United',
  'Man City': 'Manchester City',
  'Barça': 'Barcelona',
  'Real': 'Real Madrid',
  'Bayern': 'Bayern Munich'
};
```

---

## 📈 RATE LIMITING KORUMASI

### Client-Side Rate Limiting:

```typescript
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestCount = 0;
  private windowStart = Date.now();

  async request<T>(fn: () => Promise<T>): Promise<T> {
    // 10 istek/dakika kontrolü
    if (this.requestCount >= 10) {
      const elapsed = Date.now() - this.windowStart;
      if (elapsed < 60000) {
        // Bekle
        await new Promise(resolve =>
          setTimeout(resolve, 60000 - elapsed)
        );
        this.requestCount = 0;
        this.windowStart = Date.now();
      }
    }

    this.requestCount++;
    return fn();
  }
}
```

---

## 🎨 LOGO VE MEDYA

### Logo URL'leri:

```javascript
// Lig logosu
const leagueLogo = `https://media.api-sports.io/football/leagues/${leagueId}.png`;

// Takım logosu
const teamLogo = `https://media.api-sports.io/football/teams/${teamId}.png`;

// Ülke bayrağı
const countryFlag = `https://media.api-sports.io/flags/${countryCode}.svg`;

// Oyuncu fotoğrafı
const playerPhoto = `https://media.api-sports.io/football/players/${playerId}.png`;
```

**ÖNEMLİ:** Logo çağrıları günlük limitten sayılmaz! Ücretsiz.

---

## ✅ ENTEGRASYON KONTROL LİSTESİ

### Backend (sportsradarService.ts):

- [x] API URL güncelle: `https://v3.football.api-sports.io`
- [x] Header güncelle: `x-apisports-key`
- [x] Cache sistemi ekle (Firebase)
- [x] Rate limiter ekle
- [x] Error handling (404, 429, 500)
- [x] Timeout: 60 saniye
- [x] Retry mekanizması (3 deneme)

### Frontend:

- [x] Logo gösterimi ekle
- [x] Hata mesajları (küçük ligler için)
- [x] Alternatif takım isimleri
- [x] Fuzzy search

### Environment:

- [ ] `.env`: `VITE_API_FOOTBALL_KEY` ekle
- [ ] Render.com: Environment variable ekle
- [ ] Dashboard: API kullanımı izle

---

## 🧪 TEST SENARYOLARI

### Test 1: Premier League

```
Input: "Manchester United vs Liverpool"
League: "Premier League"

Expected:
✅ Lig bulundu (id: 39)
✅ Manchester United bulundu (id: 33)
✅ Liverpool bulundu (id: 34)
✅ Puan durumu alındı
✅ Form alındı
✅ H2H alındı
```

### Test 2: Küçük Lig

```
Input: "Lüksemburg U21 vs İzlanda U21"
League: "U21 Avrupa Şampiyonası Elemeleri"

Expected:
❌ Lig bulunamadı
→ Kredi iade edildi
→ Kullanıcıya bildirildi
```

### Test 3: Cache Hit

```
1. Analiz: Manchester United (cache MISS) → API
2. Analiz: Manchester United (cache HIT) → 0 API
```

---

## 🚀 DEPLOYMENT

### Güncel API Key ile Deploy:

```bash
# 1. API Key alın
Dashboard: https://dashboard.api-football.com

# 2. .env'e ekleyin
VITE_API_FOOTBALL_KEY=your_key_here

# 3. Render.com'a ekleyin
Settings → Environment → Add Variable

# 4. Deploy
git push origin main
```

---

## 📊 İZLEME

### Dashboard Kontrolleri:

```
Her gün kontrol et:
- Günlük istek sayısı (max 100)
- Rate limit aşımı (429 hataları)
- Başarısız istekler (5xx hataları)

Her hafta:
- Cache hit oranı (hedef: %70+)
- En çok kullanılan endpoint'ler
- Başarısız analiz sebepleri
```

### Log Örnekleri:

```
✅ Cache HIT: Manchester United form (0 API istek)
⚡ API çağrısı: /teams?search=Barcelona (1 istek)
❌ API hatası: /leagues?name=Lüksemburg U21 (404)
⚠️ Rate limit: 9/10 istek (1 dakika)
```

---

## 🎯 SONUÇ

### Güncel Durum:

```
✅ 3 maç limiti
✅ Cache sistemi (24 saat)
✅ Gemini fallback kaldırıldı
✅ API-Football standartları
✅ Rate limiting
✅ Error handling
✅ Kredi iade sistemi

🔄 YAPILACAK:
1. API Key ekle (.env)
2. sportsradarService.ts güncelle
3. Test et
4. Deploy et
```

### Beklenen Performans:

```
- İlk analiz: 30 istek (cache MISS)
- Sonraki analizler: 15 istek (cache HIT)
- Günlük kapasite: ~6-10 analiz
- Cache ile: ~20+ analiz
```

**ÖNEMLİ:** API-Football Free Plan ile başlayın. İhtiyaç duyarsanız Pro Plan'e yükseltin (100K istek/ay).

Dashboard: https://dashboard.api-football.com 🎯
