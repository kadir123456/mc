# Coupon Analyzer - Nesine Kuponu Analiz Platformu

Modern ve mobil uyumlu web uygulaması. Kullanıcılar Nesine.com'dan aldıkları kupon görsellerini yükleyip akıllı analiz sistemi ile detaylı değerlendirme alabilirler.

## 🚀 Özellikler

- ✅ Email/Şifre ve Google OAuth ile güvenli giriş
- ✅ Görsel yükleme ve yapay zeka destekli analiz
- ✅ Kredi sistemi ve güvenli ödeme (PyTR)
- ✅ Detaylı maç tahmini ve istatistikler
- ✅ Kullanıcı geçmişi ve analiz kayıtları
- ✅ Mobil uyumlu responsive tasarım
- ✅ SEO optimize edilmiş sayfa yapısı

## 🛠 Teknoloji Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router DOM
- **Auth:** Firebase Authentication
- **Database:** Firebase Realtime Database
- **Storage:** Firebase Storage
- **AI:** Google Gemini 1.5 Flash API
- **Payment:** PyTR API
- **Hosting:** Render.com

## 📦 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Development sunucusunu başlat
npm run dev

# Production build
npm run build
```

## 🔐 Environment Variables

`.env` dosyasını oluşturun ve aşağıdaki değerleri doldurun:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=

VITE_GEMINI_API_KEY=

VITE_PYTR_API_KEY=
VITE_PYTR_MERCHANT_ID=
VITE_PYTR_API_URL=https://api.pytr.io
```

## 📁 Proje Yapısı

```
src/
├── components/         # UI bileşenleri (Footer, ImageUpload, vb.)
├── context/            # React Context (AuthContext)
├── pages/              # Sayfa bileşenleri (Login, Dashboard, vb.)
├── services/           # API servisleri (Firebase, Gemini, PyTR)
├── types/              # TypeScript tip tanımlamaları
└── App.tsx             # Ana uygulama ve routing
```

## 💳 Kredi Paketleri

- 5 Görsel Araması → 99 TL
- 20 Görsel Araması → 299 TL (En Popüler)
- 50 Görsel Araması → 499 TL

## 📱 Sayfa Akışı

1. **Kayıt/Giriş** → Email/Şifre veya Google ile
2. **Dashboard** → Görsel yükle, kredi al, geçmişi görüntüle
3. **Analiz** → Kupon görseli yükle ve analiz sonuçlarını al
4. **Ödeme** → PyTR ile güvenli ödeme

## 🔒 Güvenlik

- Firebase Authentication ile kurumsal düzeyde kimlik doğrulama
- Şifreler hash'lenerek saklanır
- HTTPS zorunlu iletişim
- Environment variables ile API key koruması
- Database rules ile veri izolasyonu

## ⚡ Performance

- Vite build tool ile hızlı development
- Code splitting ve lazy loading
- Gzip compression (166KB compressed)
- Firebase caching stratejisi

## 📊 SEO

- Semantic HTML5
- Meta tags ve Open Graph
- Mobile-friendly responsive design
- Clean URL structure
- Fast loading times

## 📄 Yasal

- 18 yaş ve üzeri kullanıcılar
- Kullanım Şartları ve Gizlilik Politikası mevcut
- KVKK uyumlu veri işleme
- Analiz sonuçları sadece bilgilendirme amaçlıdır

## 📞 İletişim

- **Email:** bilwininc@gmail.com
- **Geliştirici:** bilwin.inc
- **Copyright:** © 2025 bilwin.inc

## 📝 Detaylı Dokümantasyon

Daha fazla bilgi için:
- `PROJECT_INFO.md` - Kod detayları, güvenlik, SEO açıklamaları
- `SETUP.md` - Adım adım kurulum rehberi

## 📄 Lisans

Proprietary - © 2025 bilwin.inc
