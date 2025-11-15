# 🧪 API TEST REHBER

## 🔍 Sorunu Teşhis Etmek İçin

### 1. Health Check
```
https://aikupon.com/api/health
```

**Kontrol edin:**
- `footballApiConfigured`: true mi?
- `footballApiKeyPreview`: "MISSING" mı yoksa key'in ilk 10 karakteri mi?

### 2. Football API Test (YENİ!)
```
https://aikupon.com/api/test-football-api
```

**Bu endpoint:**
- API key'i test eder
- Gerçek API çağrısı yapar
- Detaylı response döner
- Hataları gösterir

**Başarılı Response:**
```json
{
  "success": true,
  "status": 200,
  "fixturesCount": 45,
  "results": 45,
  "errors": null,
  "sampleFixture": {
    "fixture": {...},
    "teams": {...}
  }
}
```

**Başarısız Response (Key Geçersiz):**
```json
{
  "error": "Request failed with status code 401",
  "response": {
    "message": "Invalid API Key"
  },
  "status": 401
}
```

**Başarısız Response (Rate Limit):**
```json
{
  "error": "Request failed with status code 429",
  "response": {
    "message": "Too Many Requests"
  },
  "status": 429
}
```

## 🎯 Olası Sorunlar ve Çözümleri

### Sorun 1: footballApiConfigured: false
**Çözüm:**
- Render.com Environment'ta `VITE_FOOTBALL_API_KEY` var mı kontrol et
- Tam key adını kontrol et (büyük/küçük harf)
- Redeploy yap

### Sorun 2: 401 Unauthorized
**Çözüm:**
- API key yanlış veya expired
- API-Football dashboard'dan yeni key al
- Key'i Render'a ekle

### Sorun 3: 429 Rate Limit
**Çözüm:**
- Günlük limit dolmuş (100 istek)
- Yarın sıfırlanır
- Veya ücretli plana geç

### Sorun 4: 200 OK ama fixturesCount: 0
**Çözüm:**
- Bugün gerçekten maç yok olabilir
- Farklı bir tarih dene:
  ```
  https://aikupon.com/api/test-football-api?date=2025-11-16
  ```

### Sorun 5: fixturesCount > 0 ama bültende yok
**Çözüm:**
- Firebase'e yazma sorunu
- Logs'da "Firebase'e kaydedildi" mesajını ara
- Firebase console'da `matches/{date}` kontrol et

## 📊 Render Logs Kontrol

Deploy olduktan sonra:

```
Render Dashboard → Logs
```

**Aranacak mesajlar:**

✅ **Başarılı:**
```
🔑 Using API Key: abc123xyz4...
📅 Fetching matches for dates: 2025-11-15 and 2025-11-16

📊 TODAY RESPONSE:
   Status: 200
   Response length: 45
   Errors: none
   First match: { home: {...}, away: {...} }

✅ Firebase'e kaydedildi: 23 maç (2025-11-15)
🎉 TOPLAM KAYDEDİLEN MAÇ: 58
```

❌ **Başarısız:**
```
🔑 Using API Key: abc123xyz4...
⚠️  Bugün için API'den maç gelmedi
🎉 TOPLAM KAYDEDİLEN MAÇ: 0
```

## 🔧 Manuel Test Adımları

1. **Deploy bekle** (2-3 dakika)

2. **Health check:**
   ```bash
   curl https://aikupon.com/api/health
   ```

3. **API test:**
   ```bash
   curl https://aikupon.com/api/test-football-api
   ```

4. **Logs kontrol:**
   - Render Dashboard → Logs
   - Son 50 satırı oku

5. **Sonuç:**
   - ✅ fixturesCount > 0 → API çalışıyor
   - ❌ 401/403 → Key yanlış
   - ❌ 429 → Rate limit
   - ❌ 0 fixtures → Bugün maç yok

## 💡 Pro Tips

1. **API Key Test (Browser):**
   ```
   https://v3.football.api-sports.io/fixtures?date=2025-11-15
   Header: x-apisports-key: YOUR_KEY
   ```

2. **Firebase Manual Check:**
   - Firebase Console → Realtime Database
   - `matches/2025-11-15` path'ine bak
   - Varsa: Backend çalışıyor, frontend sorunu
   - Yoksa: Backend yazamıyor

3. **Force Refresh:**
   ```
   https://aikupon.com/api/trigger-match-fetch?force=true
   ```

---

**Son Güncelleme:** 15 Kasım 2025  
**Test Endpoint Eklendi:** ✅
