# 🛒 Shopier Ödeme Entegrasyonu

## ✅ Tamamlanan İşlemler

### 1. Backend Entegrasyonu
- ✅ Shopier callback endpoint eklendi: `/api/shopier/callback`
- ✅ Firebase Admin SDK entegrasyonu
- ✅ Otomatik kredi yükleme sistemi
- ✅ Transaction kayıt sistemi
- ✅ Email ile kullanıcı bulma
- ✅ Güvenli API Key doğrulama

### 2. Frontend Entegrasyonu
- ✅ ShopierPayment component'i oluşturuldu
- ✅ 4 paket kartı ile modern UI tasarımı
- ✅ Shopier linklerine direkt yönlendirme
- ✅ PaymentSuccess sayfası güncellendi
- ✅ Başarılı/başarısız ödeme durumları

### 3. Paket Yapılandırması
```javascript
Paket 1: 5 kredi  → 99₺  → https://www.shopier.com/bilwininc/41271482
Paket 2: 10 kredi → 189₺ → https://www.shopier.com/bilwininc/41271535 (En Popüler)
Paket 3: 25 kredi → 449₺ → https://www.shopier.com/bilwininc/41271562
Paket 4: 50 kredi → 799₺ → https://www.shopier.com/bilwininc/41271593
```

---

## 🔧 Shopier Panel Ayarları

### ENTEGRASYONLAR > MODÜL YÖNETİMİ > MODÜL AYARLARI

**GERİ DÖNÜŞ URL (Callback URL):**
```
https://aikupon.com/api/shopier/callback
```

⚠️ **ÖNEMLİ:** Bu URL'i Shopier panelinde "GERİ DÖNÜŞ URL (1)" alanına eklemelisiniz!

**API KULLANICI:**
```
3b9d7f8a811d5b0034c6f670f2b37311
```

**API ŞİFRE:**
```
5536639175758c69ce1ef57c730f7a84
```

---

## 📋 Environment Variables

### Backend (.env)
```bash
# Shopier API Configuration
SHOPIER_API_USER=3b9d7f8a811d5b0034c6f670f2b37311
SHOPIER_API_SECRET=5536639175758c69ce1ef57c730f7a84

# Firebase Service Account (Gerekli!)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
VITE_FIREBASE_DATABASE_URL=https://aviator-90c8b-default-rtdb.firebaseio.com/
```

### Render.com
Render.com dashboard'unda **Environment** bölümüne şu değişkenleri ekleyin:
```
SHOPIER_API_USER=3b9d7f8a811d5b0034c6f670f2b37311
SHOPIER_API_SECRET=5536639175758c69ce1ef57c730f7a84
```

---

## 🔄 Ödeme Akışı

### 1. Kullanıcı Paket Seçer
- Dashboard → Kredi Al sekmesi
- 4 paket kartı görüntülenir
- Kullanıcı istediği pakete tıklar

### 2. Shopier'a Yönlendirme
```javascript
// ShopierPayment.tsx
const handlePurchase = (packageId: string) => {
  // Ödeme bilgilerini localStorage'a kaydet
  localStorage.setItem('shopier_pending_payment', JSON.stringify({
    packageId,
    userId: user.uid,
    credits: pkg.searches,
    price: pkg.price,
    timestamp: Date.now()
  }));
  
  // Shopier sayfasına yönlendir
  window.location.href = pkg.shopierUrl;
};
```

### 3. Kullanıcı Shopier'da Ödeme Yapar
- Shopier güvenli ödeme sayfası açılır
- Kredi kartı, banka kartı veya havale ile ödeme yapılır
- Ödeme başarılı/başarısız durumu belirlenir

### 4. Shopier Backend'e Webhook Gönderir
```javascript
// Backend server.js
POST /api/shopier/callback
{
  platform_order_id: "123456",
  order_id: "shop_789",
  buyer_email: "user@example.com",
  total_order_value: "99",
  status: "1", // 1 = başarılı
  API_key: "3b9d7f8a811d5b0034c6f670f2b37311"
}
```

### 5. Backend Otomatik Kredi Yükler
```javascript
// 1. API Key doğrula
// 2. Email ile kullanıcıyı bul
// 3. Fiyata göre kredi miktarını belirle
// 4. Firebase'de kullanıcıya kredi ekle
// 5. Transaction kaydı oluştur
```

### 6. Kullanıcı Başarı Sayfasına Yönlendirilir
```
https://your-domain.com/payment-success?status=1&platform_order_id=123456
```

---

## 💾 Firebase Veri Yapısı

### Kullanıcı Verisi
```json
{
  "users": {
    "user_uid_123": {
      "email": "user@example.com",
      "credits": 15,
      "totalSpent": 288,
      "transactions": {
        "txn_1": {
          "type": "purchase",
          "credits": 10,
          "amount": 189,
          "orderId": "shop_789",
          "status": "completed",
          "provider": "shopier",
          "createdAt": 1234567890,
          "timestamp": "2025-01-10T12:00:00.000Z"
        }
      }
    }
  }
}
```

---

## 🔒 Güvenlik

### API Key Doğrulama
```javascript
// Backend'de API Key kontrolü
if (API_key !== process.env.SHOPIER_API_USER) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### Signature Verification (Gelişmiş)
```javascript
// Opsiyonel: Shopier signature doğrulama
const signature = crypto
  .createHash('sha256')
  .update(`${platform_order_id}${order_id}${SHOPIER_API_SECRET}`)
  .digest('hex');
```

### Firebase Transaction
```javascript
// Atomik kredi güncelleme
await userRef.transaction((user) => {
  if (user) {
    user.credits = (user.credits || 0) + credits;
    user.totalSpent = (user.totalSpent || 0) + amount;
    return user;
  }
  return user;
});
```

---

## 🧪 Test Etme

### 1. Local Test
```bash
# Backend'i başlat
cd backend
npm start

# Callback endpoint test
curl -X POST http://localhost:3001/api/shopier/callback \
  -H "Content-Type: application/json" \
  -d '{
    "platform_order_id": "test_123",
    "order_id": "shop_test",
    "buyer_email": "test@example.com",
    "total_order_value": "99",
    "status": "1",
    "API_key": "3b9d7f8a811d5b0034c6f670f2b37311"
  }'
```

### 2. Frontend Test
```bash
# Frontend'i başlat
npm run dev

# Dashboard'a git
# Kredi Al → Paket Seç
# Shopier'a yönlendirilmeli
```

### 3. Production Test
```bash
# Gerçek ödeme testi
1. Canlı sitede paket seç
2. Shopier'da test kartı ile ödeme yap
3. Callback'in çalıştığını backend logs'dan kontrol et
4. Kredilerin eklendiğini doğrula
```

---

## 📊 Monitoring

### Backend Logs
```javascript
console.log('📦 Shopier callback alındı:', req.body);
console.log('✅ Shopier ödeme doğrulandı');
console.log('💰 Kredi eklenmesi gerekiyor');
console.log('✅ Ödeme işlendi: 10 kredi -> user_123');
```

### Render.com Logs
```bash
# Render Dashboard → Logs sekmesi
# Arama: "Shopier callback"
```

---

## ❗ Önemli Notlar

### 1. Callback URL
- Shopier panelinde **mutlaka** callback URL'i ekleyin
- URL production domain'i olmalı (örn: `https://aikupon.onrender.com/api/shopier/callback`)
- `http://` değil `https://` kullanın

### 2. Email Eşleştirme
- Shopier'dan gelen `buyer_email` Firebase'deki kullanıcı email'i ile eşleşmeli
- Kullanıcı Shopier'da farklı email kullanırsa kredi eklenemez
- Bu durumu loglardan takip edin

### 3. Fiyat Mapping
```javascript
const PRICE_TO_CREDITS = {
  99: 5,
  189: 10,
  449: 25,
  799: 50
};
```
Paket fiyatları değişirse bu mapping'i güncelleyin!

### 4. Webhook Retry
- Shopier webhook'u başarısız olursa tekrar gönderir
- Backend her durumda `200 OK` döner (duplicate kredileri önlemek için)
- Kritik hatalar için ayrı alert sistemi kurun

---

## 🚀 Deployment Checklist

- [ ] Backend'e Shopier endpoint'i eklendi
- [ ] Frontend'e ShopierPayment component'i eklendi
- [ ] Environment variables eklendi (Render.com)
- [ ] Shopier panelinde callback URL ayarlandı
- [ ] Firebase Admin SDK çalışıyor
- [ ] Test ödeme yapıldı
- [ ] Krediler otomatik ekleniyor
- [ ] Logs kontrol edildi
- [ ] PaymentSuccess sayfası çalışıyor

---

## 🐛 Troubleshooting

### Problem: Krediler eklenmiyor
**Çözüm:**
1. Backend logs'u kontrol et
2. Firebase Admin SDK initialize oldu mu?
3. buyer_email Firebase'de var mı?
4. Shopier callback endpoint'e istek geliyor mu?

### Problem: Shopier callback gelmiyor
**Çözüm:**
1. Shopier panelinde callback URL doğru mu?
2. URL https ile mi başlıyor?
3. Backend çalışıyor mu?
4. CORS ayarları doğru mu?

### Problem: "Kullanıcı bulunamadı" hatası
**Çözüm:**
1. Shopier'da girilen email Firebase'deki ile aynı mı?
2. Firebase'de users/{uid}/email alanı var mı?
3. Email küçük harflerle mi yazıldı?

---

## 📞 Destek

Sorun yaşarsanız:
1. Backend logs'u kontrol edin
2. Shopier panelinde "Sipariş Detayları"nı inceleyin
3. Firebase Console'da kullanıcı verisini kontrol edin
4. bilwininc@gmail.com ile iletişime geçin

---

**Son Güncelleme:** {{ CURRENT_DATE }}
**Versiyon:** 1.0.0
**Status:** ✅ Entegrasyon tamamlandı
