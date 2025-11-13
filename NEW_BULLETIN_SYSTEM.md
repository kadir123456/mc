# Yeni Bülten Sistemi - Kullanım Kılavuzu

## Sistem Özeti

Aikupon artık profesyonel bir maç bülteni sistemiyle çalışıyor. Kullanıcılar görsel yükleme yerine, günlük güncellenen maç listesinden seçim yaparak analiz satın alabilirler.

---

## Önemli Değişiklikler

### ✅ Eklenen Özellikler

1. **Günlük Maç Bülteni**
   - Her gün otomatik güncellenen maç listesi
   - Bugün ve yarının tüm maçları
   - Lig bazlı filtreleme
   - Arama fonksiyonu

2. **İki Analiz Paketi**
   - **Standart:** 3 maç - 1 kredi
   - **Detaylı:** 5 maç + ilk yarı analizi - 5 kredi

3. **Popüler Kuponlar**
   - En çok oynanan kombinasyonlar
   - Trend kuponlar (son 24 saat)
   - Hazır kupon seçenekleri

4. **Kuponlarım Sayfası**
   - Satın alınan tüm analizler
   - Detaylı tahmin yüzdeleri
   - Güven skorları
   - Kupon paylaşma

5. **Mobil Uyumlu Tasarım**
   - Alt navigasyon menüsü
   - Touch-friendly butonlar
   - Responsive tasarım

### ❌ Kaldırılan Özellikler

- Görsel yükleme (ImageUpload)
- Görsel analizi

---

## Teknik Detaylar

### Firebase Realtime Database Yapısı

```
firebase-db/
├─ matches/
│  └─ {date}/
│     └─ {fixture_id}/
│        ├─ homeTeam
│        ├─ awayTeam
│        ├─ league
│        ├─ date
│        ├─ time
│        ├─ timestamp
│        ├─ status
│        └─ lastUpdated
│
├─ users/
│  └─ {user_id}/
│     ├─ credits
│     └─ ... (mevcut alanlar)
│
├─ coupons/
│  └─ {user_id}/
│     └─ {coupon_id}/
│        ├─ matches[] (seçilen maçlar)
│        ├─ analysis[] (Gemini analizi)
│        ├─ type (standard/detailed)
│        ├─ creditsUsed
│        └─ purchasedAt
│
└─ popular_coupons/
   └─ {match_ids_hash}/
      ├─ matches[]
      ├─ playCount
      ├─ successRate
      └─ lastPlayed
```

### API Optimizasyonu

**Günlük İstek Limiti:** 100 istek (Football API Free Plan)

**Optimizasyon Stratejisi:**
- Günde 1 kez maç çekme (06:00)
- Firebase'de cache
- Bitmiş maçları otomatik temizleme
- 2 istek/gün (bugün + yarın)

**Toplam Yıllık İstek:** ~730 istek (limit içinde ✅)

### Servis Dosyaları

1. **matchService.ts** - Maç yönetimi
2. **couponService.ts** - Kupon işlemleri
3. **geminiAnalysisService.ts** - AI analiz
4. **server.js** - Otomatik maç çekme

### Yeni Sayfalar

1. **/bulletin** - Maç bülteni ve seçim
2. **/my-coupons** - Satın alınan analizler

### Yeni Bileşenler

1. **MatchBulletin.tsx** - Maç listesi ve seçim
2. **PopularCoupons.tsx** - Popüler kuponlar
3. **ConfirmationModal.tsx** - Satın alma onayı
4. **BottomNav.tsx** - Mobil navigasyon

---

## Kullanıcı Akışı

### 1. Kayıt/Giriş
- Kullanıcı kayıt olur (1 ücretsiz kredi)
- Giriş yapar

### 2. Bülten Görüntüleme
- `/bulletin` sayfasına gider
- Güncel maçları görür
- Analiz tipi seçer:
  - Standart (3 maç - 1 kredi)
  - Detaylı (5 maç - 5 kredi)

### 3. Maç Seçimi
- İstediği maçları seçer (checkbox)
- Arama/filtre kullanabilir
- Seçim tamamlandığında "Analiz Et" butonu aktif olur

### 4. Satın Alma Onayı
- Popup açılır
- Seçilen maçları görür
- Kredi miktarını onaylar
- "Onayla ve Satın Al" butonu

### 5. AI Analizi
- Gemini API maçları analiz eder
- Her maç için:
  - MS1, MSX, MS2 yüzdeleri
  - 2.5 Üst/Alt yüzdeleri
  - KG Var/Yok yüzdeleri
  - İlk yarı tahminleri (detaylı pakette)
  - Güven skoru (0-100)
  - Tavsiye

### 6. Sonuçları Görüntüleme
- "Kuponlarım" sayfasına yönlenir
- Detaylı analiz sonuçlarını görür
- Kuponu paylaşabilir

---

## Gemini Analiz Detayları

### Standart Paket (3 maç - 1 kredi)
```
- MS1 (Ev sahibi kazanır): %X
- MSX (Beraberlik): %X
- MS2 (Deplasman kazanır): %X
- 2.5 ÜST (Toplam gol 3+): %X
- 2.5 ALT (Toplam gol 0-2): %X
- KG VAR (Karşılıklı gol): %X
- Tavsiye: "2.5 Üst + MS1"
- Güven Skoru: 75
```

### Detaylı Paket (5 maç - 5 kredi)
```
+ Yukarıdaki tüm tahminler
+ İLK YARI MS1: %X
+ İLK YARI MSX: %X
+ İLK YARI MS2: %X
+ Daha kapsamlı analiz
```

---

## Popüler Kuponlar Sistemi

### Nasıl Çalışır?
- Her kupon satın alımında Firebase'e kaydedilir
- Match ID kombinasyonları hash'lenir
- Play count artırılır
- En çok oynanan kuponlar listelenir

### Görüntüleme Kriterleri
- **Popüler:** En az 5 kez oynanmış
- **Trend:** Son 24 saatte en az 3 kez oynanmış

### Kullanıcı Avantajı
- Başkalarının ne oynadığını görebilir
- Hazır kupon kombinasyonları
- 5 kredi ile detaylı analiz

---

## Mobil Tasarım

### Alt Navigasyon
```
[Bülten] [Kuponlarım] [Profil]
```

### Responsive Özellikler
- Touch-friendly butonlar (min 44x44px)
- Bottom sheet tasarım
- Kolay checkbox seçimi
- Sticky header
- Fixed bottom navigation

### Optimizasyonlar
- Lazy loading
- Cache'lenen veriler
- Hızlı geçişler

---

## Firebase Security Rules

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "matches": {
      ".read": "auth != null",
      ".write": false
    },
    "coupons": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "popular_coupons": {
      ".read": "auth != null",
      ".write": false
    }
  }
}
```

---

## Deployment Checklist

### Environment Variables (.env)
```bash
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=

# Firebase Admin (Server)
FIREBASE_SERVICE_ACCOUNT=

# Football API
VITE_FOOTBALL_API_KEY=

# Gemini AI
VITE_GEMINI_API_KEY=
```

### Firebase Console
1. Realtime Database oluştur
2. Security Rules'u güncelle (FIREBASE_DATABASE_RULES.json)
3. Service Account key indir
4. Environment variable'a ekle

### Server Setup
1. Firebase Admin SDK initialize
2. Cron job başlat (günlük maç çekme)
3. API rate limit kontrol

---

## Test Senaryoları

### 1. Maç Bülteni
- [ ] Maçlar günlük güncelleniyor mu?
- [ ] Filtreleme çalışıyor mu?
- [ ] Arama çalışıyor mu?
- [ ] Seçim limiti doğru mu?

### 2. Satın Alma
- [ ] Popup açılıyor mu?
- [ ] Kredi düşüyor mu?
- [ ] Analiz kaydediliyor mu?
- [ ] Kuponlarım'da görünüyor mu?

### 3. Gemini Analiz
- [ ] API çağrısı başarılı mı?
- [ ] Yüzdeler doğru mu?
- [ ] JSON parse ediliyor mu?
- [ ] Hata durumları yönetiliyor mu?

### 4. Popüler Kuponlar
- [ ] Kuponlar listeleniyor mu?
- [ ] Play count artıyor mu?
- [ ] Trend hesaplaması doğru mu?

### 5. Mobil
- [ ] Alt navigasyon görünüyor mu?
- [ ] Touch çalışıyor mu?
- [ ] Responsive tasarım doğru mu?

---

## Bilinen Limitler

1. **API Limiti:** 100 istek/gün
   - Çözüm: Günde 1 kez çekme + cache

2. **Gemini API Timeout:** 30 saniye
   - Çözüm: Loading state + retry

3. **Firebase Free Plan:** 1GB storage
   - Çözüm: Eski maçları temizleme

4. **Rate Limiting:** Yok (eklenebilir)

---

## Gelecek Geliştirmeler

1. **Bildirimler**
   - Maç başlamadan bildirim
   - Analiz hazır bildirimi

2. **İstatistikler**
   - Başarı oranı takibi
   - Kupon performansı

3. **Sosyal Özellikler**
   - Kupon paylaşımı
   - Yorum sistemi

4. **Gelişmiş Filtreler**
   - Oran aralığı
   - Lig seçimi
   - Takım favorileri

5. **Admin Panel**
   - Manuel maç ekleme
   - Kullanıcı yönetimi
   - İstatistik görüntüleme

---

## Destek ve İletişim

Sorularınız için:
- Email: [İletişim sayfası]
- Documentation: Bu dosya
- Firebase Console: [Proje linki]

---

## Versiyon

**v2.0.0** - Bülten Sistemi
- Tarih: 2025-11-13
- Yeni özellikler eklendi
- Görsel yükleme kaldırıldı
- Mobil optimizasyon yapıldı
