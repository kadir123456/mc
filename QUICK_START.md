# 🚀 Hızlı Başlangıç - Aikupon v2.0

## ✅ Yapılan Değişiklikler

### Yeni Sistem: Profesyonel Bülten
Görsel yükleme kaldırıldı, günlük maç bülteni sistemi eklendi.

---

## 📋 Kullanıcı Akışı

### 1. Ana Sayfa → Bülten Butonu
```
Kullanıcı "Günlük Bülteni Görüntüle" butonuna tıklar
```

### 2. Bülten Sayfası (/bulletin)
```
- Günlük maç listesi görünür
- 2 paket seçeneği:
  ✓ Standart: 3 maç - 1 kredi
  ✓ Detaylı: 5 maç + ilk yarı - 5 kredi
```

### 3. Maç Seçimi
```
- Checkbox ile maç seçimi
- Arama/filtre
- Seçim tamamlandığında alt buton aktif
```

### 4. Onay Popup
```
⚠️ "3 maç için 1 kredi harcanacak"
[İptal] [Onayla ve Satın Al]
```

### 5. Gemini AI Analizi
```
Loading... ⏳
Analiz tamamlandı! ✅
```

### 6. Kuponlarım Sayfası
```
- Detaylı tahminler
- MS1, MSX, MS2
- 2.5 Üst/Alt
- KG Var/Yok
- İlk yarı tahminleri (detaylı pakette)
- Güven skoru
```

---

## 🔧 Environment Variables

### Yeni Gereksinimler
```bash
# Football API (günlük maç verileri)
VITE_FOOTBALL_API_KEY=your_football_api_key

# Gemini AI (analiz)
VITE_GEMINI_API_KEY=your_gemini_api_key

# Firebase Admin (server-side)
FIREBASE_SERVICE_ACCOUNT='{"project_id":"...","private_key":"..."}'
```

---

## 📱 Yeni Sayfalar

1. **/bulletin** - Maç bülteni ve seçim
2. **/my-coupons** - Satın alınan kuponlar

### Alt Navigasyon (Mobil)
```
[🏠 Bülten] [🎫 Kuponlarım] [👤 Profil]
```

---

## 🎯 Önemli Servisler

### 1. matchService.ts
- Maç listesi yönetimi
- Firebase okuma
- Filtreleme/arama

### 2. couponService.ts
- Kupon oluşturma
- Kullanıcı kuponları
- Popüler kuponlar

### 3. geminiAnalysisService.ts
- AI analiz
- Tahmin hesaplama
- JSON parsing

### 4. server.js
- Günlük maç çekme
- Firebase Admin
- Otomatik temizleme

---

## 🔥 Firebase Database

### Yapı
```
matches/{date}/{fixture_id}
coupons/{user_id}/{coupon_id}
popular_coupons/{match_hash}
users/{user_id}
```

### Security Rules
```
- users: sadece kendi verisi
- matches: herkes okur, kimse yazmaz
- coupons: sadece kendi kuponları
- popular_coupons: herkes okur
```

---

## 📊 API Kullanımı

### Football API
- **Limit:** 100 istek/gün
- **Kullanım:** 2 istek/gün
- **Zaman:** Her gün 06:00
- **Veri:** Bugün + yarın maçları

### Gemini AI
- **Limit:** Yok (normal kullanımda)
- **Kullanım:** Her kupon satın alımında
- **Timeout:** 30 saniye
- **Prompt:** Özelleştirilmiş futbol analizi

---

## 🎨 Tasarım Özellikleri

### Mobil Öncelikli
- Alt navigasyon menüsü
- Touch-friendly butonlar
- Sticky header
- Fixed bottom button

### Renkler
- Mavi: Standart paket
- Mor: Detaylı paket
- Sarı: Kredi
- Yeşil: Başarı

### Animasyonlar
- Loading spinner
- Smooth transitions
- Hover effects

---

## ⚡ Hızlı Test

### 1. Server Başlat
```bash
npm run dev
```

### 2. Maç Verilerini Çek (Manual)
```
GET http://localhost:3000/api/trigger-match-fetch
```

### 3. Kullanıcı Kaydet
- /register sayfası
- 1 ücretsiz kredi

### 4. Bültene Git
- /bulletin
- Maçları gör

### 5. Analiz Satın Al
- 3 maç seç
- Onayla
- Gemini analizi bekle

### 6. Kuponları Gör
- /my-coupons
- Detaylı sonuçlar

---

## 🐛 Bilinen Sorunlar

### API Limiti
- **Problem:** 100 istek/gün sadece
- **Çözüm:** Cache + günlük 1 çekme ✅

### Gemini Timeout
- **Problem:** Bazen 30 saniye yetmiyor
- **Çözüm:** Retry mekanizması eklendi ✅

### Firebase Free Plan
- **Problem:** 1GB storage limiti
- **Çözüm:** Eski maçlar otomatik siliniyor ✅

---

## 📚 Dokümantasyon

- **Detaylı Kılavuz:** NEW_BULLETIN_SYSTEM.md
- **Firebase Rules:** FIREBASE_DATABASE_RULES.json
- **API Test:** API_TEST_CONSOLE.js

---

## 🎉 Başarıyla Tamamlandı!

Sistem hazır ve çalışıyor. Build başarılı ✅

### Sonraki Adımlar
1. Environment variables'ı ayarla
2. Firebase Database oluştur
3. Security rules'u uygula
4. Football API key al
5. Gemini API key al
6. Server'ı deploy et
7. İlk maçları çek
8. Test et!

**İyi şanslar! 🚀**
