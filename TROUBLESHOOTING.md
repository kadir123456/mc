# Sorun Giderme Kılavuzu

## Console'da Görülen Hatalar ve Çözümleri

### 1. ❌ Sportsradar hatası: Permission denied

**Sorun**: API anahtarı belirli liglere/takımlara erişim izni vermiyor.

**Sebep**:
- Trial API key ile kadın futbolu desteklenmiyor
- Bazı az bilinen ligler trial API'de yok
- API key yanlış yapılandırılmış

**Çözüm**:
```bash
# 1. API key'in doğru olduğundan emin ol
# Render.com → Environment → VITE_SPORTSRADAR_API_KEY kontrol et

# 2. Trial limitlerini gör
# https://developer.sportradar.com/docs/read/Home

# 3. Production key kullan (ücretsiz trial sonrası)
VITE_SPORTSRADAR_TRIAL_MODE=false
```

**Sistem Davranışı**:
- Hata olsa bile analiz devam eder
- Fallback verileri kullanılır:
  ```
  homeForm: 'Sportsradar API hatası'
  confidenceScore: 0
  ```
- Gemini Analysis hala çalışır

---

### 2. ⚠️ Firebase Storage: ERR_FAILED

**Sorun**: Base64 görsel URL'leri Firebase Storage'a yüklenemiyor.

**Sebep**:
- Geçersiz base64 format
- Firebase Storage kuralları kısıtlayıcı
- Storage quota dolmuş

**Çözüm**:
Kod güncellemesi yapıldı:
```typescript
// Artık hata olsa bile ID kaydediliyor
let imageUrl = analysisId;
if (base64Image.startsWith('data:image')) {
  try {
    await uploadString(imageRef, base64Image, 'data_url');
    imageUrl = imagePath;
  } catch (error) {
    // Fallback: Sadece ID kullan
    imageUrl = analysisId;
  }
}
```

**Manuel Kontrol**:
1. Firebase Console → Storage
2. Rules sekmesi:
   ```
   service firebase.storage {
     match /b/{bucket}/o {
       match /coupon_images/{userId}/{imageId} {
         allow write: if request.auth != null && request.auth.uid == userId;
         allow read: if request.auth != null;
       }
     }
   }
   ```

---

### 3. ⏱️ API Timeout Hataları

**Sorun**: Sportsradar API yanıt vermiyor.

**Sebep**:
- Yavaş internet bağlantısı
- API rate limiting
- Sunucu tarafı sorunlar

**Mevcut Korumalar**:
```typescript
// 15 saniye timeout
timeout: 15000

// Her istek arası bekleme
await new Promise(resolve => setTimeout(resolve, 500));
```

**Ekstra Çözüm**:
```typescript
// sportsradarService.ts içinde timeout süresini artır
const response = await axios.get(url, {
  timeout: 30000, // 15s → 30s
});
```

---

### 4. 🔄 Cache Sorunları

**Sorun**: Eski veriler gösteriliyor.

**Çözüm**:
```javascript
// Firebase Realtime Database Console'da:
// sportsradar_cache → Delete

// Veya programatik:
import { ref, remove } from 'firebase/database';
import { database } from './firebase';

await remove(ref(database, 'sportsradar_cache'));
```

**Cache Süresi Değiştirme**:
```typescript
// sportsradarService.ts
const CACHE_EXPIRY_HOURS = 6; // 6 saat → İstediğin değer
```

---

### 5. 🚫 CORS Hataları

**Sorun**: Browser CORS politikası engelliyor.

**Çözüm**:
Bu proje client-side çalıştığı için Sportsradar API'ye doğrudan browser'dan istek yapılıyor. CORS hatası alırsanız:

**Geçici Çözüm**:
1. Browser extension kullan: "CORS Unblock"
2. Chrome'u şu şekilde başlat:
   ```bash
   chrome.exe --disable-web-security --user-data-dir="C:/temp"
   ```

**Kalıcı Çözüm (Önerilen)**:
Backend proxy oluştur:
```typescript
// Backend API (Express.js)
app.get('/api/sportsradar/*', async (req, res) => {
  const url = `https://api.sportradar.com${req.params[0]}`;
  const response = await axios.get(url, {
    headers: { 'x-api-key': process.env.SPORTSRADAR_API_KEY }
  });
  res.json(response.data);
});
```

---

## Performans İyileştirmeleri

### Yavaş Analiz Süresi

**Sorun**: Analiz 30+ saniye sürüyor.

**Sebep**:
- Çok sayıda API çağrısı
- Takım bulunamıyor ve 20 lig taranıyor

**Çözüm 1**: Cache kullanımını artır
```typescript
// Cache süresini 24 saate çıkar
const CACHE_EXPIRY_HOURS = 24;
```

**Çözüm 2**: Paralel işlem (dikkatli!)
```typescript
// sportsradarService.ts → fetchAllMatches
const results = await Promise.all(
  matches.map(match => this.fetchMatchData(match))
);
// ⚠️ Rate limit riski var!
```

**Çözüm 3**: Takım ID'lerini manuel ekle
```typescript
// Popüler takımlar için ID mapping
const TEAM_IDS = {
  'Manchester United': 'sr:competitor:35',
  'Real Madrid': 'sr:competitor:2829',
  // ...
};
```

---

## Debug Araçları

### Console Log Seviyeleri

```typescript
// Detaylı loglama aktifleştir
localStorage.setItem('DEBUG', 'true');

// Sadece hataları göster
localStorage.setItem('DEBUG', 'errors');
```

### Firebase Realtime Database İzleme

```javascript
// Browser Console'da
import { ref, onValue } from 'firebase/database';
import { database } from './firebase';

onValue(ref(database, 'sportsradar_cache'), (snapshot) => {
  console.log('Cache güncellendi:', snapshot.val());
});
```

### Network İzleme

Chrome DevTools → Network sekmesi:
- `api.sportradar.com` filtrele
- Status kodlarını kontrol et:
  - `200`: Başarılı
  - `401`: API key hatası
  - `403`: Permission denied
  - `429`: Rate limit aşıldı
  - `504`: Timeout

---

## Sık Sorulan Sorular

### S: Kadın futbolu neden çalışmıyor?
**C**: Trial API kadın futbolunu desteklemiyor. Production key gerekli.

### S: Cache nasıl temizlenir?
**C**: Firebase Console → Realtime Database → `sportsradar_cache` → Delete

### S: API limitleri nedir?
**C**: Trial: ~1000 request/day. Production: Planınıza göre değişir.

### S: Birden fazla API key kullanabilir miyim?
**C**: Evet, farklı anahtarları environment variable ile değiştirebilirsiniz.

### S: Analiz sonuçları nerede saklanıyor?
**C**: Firebase Realtime Database → `analyses/` ve `users/{userId}/analyses/`

---

## İletişim

Çözemediğiniz sorunlar için:
1. Console loglarını tam olarak kaydedin
2. Firebase Database'i kontrol edin
3. API key izinlerini doğrulayın
4. Sportsradar support: https://developer.sportradar.com/support
