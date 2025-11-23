## 📖 Proje Çalışma Mantığı (AI Kupon Analiz Platformu)

### 🎯 Projenin Amacı:
Bu bir **futbol bahis kuponu analiz platformu**. Kullanıcılar:
- Futbol maçlarını görüntüleyebilir
- AI ile kupon görseli analiz edebilir
- Maç tahminleri alabilir
- Kredi satın alarak analiz yapabilir

---

## 🏗️ Mimari Yapı

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   FRONTEND  │────────▶│   BACKEND   │────────▶│  EXTERNAL   │
│  React +    │  /api   │  Node.js +  │         │   SERVICES  │
│   Vite      │ (3000)  │  Express    │         │             │
│  TypeScript │         │   (8001)    │         │             │
└─────────────┘         └─────────────┘         └─────────────┘
                              │                        │
                              ▼                        ▼
                        ┌─────────────┐         • Gemini AI
                        │   MongoDB   │         • Football API
                        │             │         • Firebase
                        └─────────────┘         • Shopier Payment
```

---

## 🔄 Ana Akışlar

### 1️⃣ **Görsel Analiz Akışı** (ANA ÖZELLIK)

```
Kullanıcı Kupon Görseli Yükler
         ↓
Frontend: Base64'e çevir
         ↓
POST /api/analyze-coupon-image
{
  image: "base64...",
  userId: "xxx",
  creditsToDeduct: 1,
  analysisType: "hepsi"
}
         ↓
Backend: Kredi kontrol & düş
         ↓
ADIM 1: Gemini Vision AI (Google Search Grounding)
   → Görselden takım isimlerini çıkar
   → Web'den doğru takım adlarını bul
   → Lig bilgilerini araştır
         ↓
ADIM 2: Football API
   → Önümüzdeki 150 maçı al
   → Akıllı eşleştirme (fuzzy matching)
   → Takım isimlerini karşılaştır
         ↓
ADIM 3: Gemini Text AI (Google Search Grounding)
   → Her maç için web'den form araştır
   → H2H geçmişi, sakatlık, lig durumu
   → AI tahmin yap (1/X/2, Alt/Üst, vb)
         ↓
Frontend: Sonuçları göster
   → Tespit edilen maçlar
   → Eşleşen maçlar
   → AI tahminleri (güven skoru ile)
```

### 2️⃣ **Satın Alma Akışı**

```
Kullanıcı "Satın Al" Tıklar
         ↓
Frontend: shopierService.redirectToPayment()
         ↓
Yeni Sekme: Shopier Ödeme Sayfası
   → Kullanıcı ödeme yapar
         ↓
Shopier Webhook → Backend
POST /api/shopier/callback
         ↓
Backend:
   → Signature doğrula
   → Kullanıcıyı email ile bul
   → Firebase'e kredi ekle
   → Transaction kaydı oluştur
         ↓
Kullanıcı: Kredi yüklendi! ✅
```

### 3️⃣ **Bülten Analiz Akışı**

```
Kullanıcı Maçları Seçer
         ↓
POST /api/gemini/analyze
{
  matches: [...],
  userId: "xxx",
  creditsToDeduct: 1
}
         ↓
Backend: Kredi kontrol & düş
         ↓
Gemini AI:
   → Her maç için istatistik analizi
   → Tahmin üret (1/X/2)
   → Güven skoru hesapla
         ↓
Frontend: Tahminleri göster
```

---

## 💾 Veri Yapısı (Firebase Realtime Database)

```
users/
  └── {userId}/
       ├── email: "user@example.com"
       ├── credits: 10
       ├── totalSpent: 189
       ├── transactions/
       │    └── {transactionId}
       │         ├── type: "purchase" | "analysis" | "refund"
       │         ├── credits: 10
       │         ├── amount: 189
       │         ├── status: "completed"
       │         └── timestamp: "2025-11-23..."
       └── analyses/
            └── {analysisId}
                 ├── extractedMatches: [...]
                 ├── matchedMatches: [...]
                 ├── savedAt: 1732362000
                 └── previewUrl: "blob:..."
```

---

## 🔑 Kullanılan Teknolojiler

### Frontend:
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Router** - Navigation
- **Firebase SDK** - Auth & Database

### Backend:
- **Node.js** - Runtime
- **Express** - Web server
- **Firebase Admin SDK** - Database & Auth
- **Axios** - HTTP client
- **Multer** - File upload (kullanılmıyor artık)

### External APIs:
- **Gemini 2.0 Flash** - AI analiz (vision + text)
  - Google Search Grounding özelliği ile
- **Football API (API-Sports)** - Maç verileri
- **Firebase Realtime Database** - Kullanıcı verileri
- **Shopier** - Ödeme gateway

---

## 🔐 Kredi Sistemi

### Kredi Paketleri:
```
5 Kredi   →  99₺
10 Kredi  → 189₺  (Popüler)
25 Kredi  → 449₺
50 Kredi  → 799₺
```

### Kredi Kullanımı:
- **Görsel Analiz**: 1 kredi
- **Standart Analiz**: 1 kredi
- **Detaylı Analiz**: 5 kredi

### Güvenlik:
- Firebase Transaction ile kredi düşme (atomik)
- Hata durumunda otomatik kredi iadesi
- Transaction kaydı her işlemde

---

## 🚀 Test Senaryoları

Şimdi bu akışları test edebilirsiniz:

### ✅ Test 1: Satın Al Butonu
1. Frontend'e giriş yap
2. Profil → Kredi Satın Al
3. Bir paket seç
4. **Beklenen**: Sadece yeni sekme açılmalı (mevcut sekme değişmemeli)

### ✅ Test 2: Görsel Analiz
1. Görsel Analizi sayfasına git
2. Bir kupon görseli yükle (ekli görsel gibi)
3. "Analiz Et" butonuna tıkla
4. **Beklenen**: 
   - Gemini görseli analiz etsin
   - Maçlar çıkarılsın
   - Football API ile eşleştirilsin
   - AI tahminler üretilsin
   - F12 Console'da hata olmamalı

### ✅ Test 3: F12 Console
1. Tarayıcıda F12 aç
2. Görsel analiz yap
3. **Beklenen**:
   - ❌ 500 error OLMAMALI
   - ❌ JSON parse hatası OLMAMALI
   - ✅ Network tab'da 200 OK görmeli

---

Hazırsanız, **testing_agent** ile kapsamlı test yapabilirim! 🎯