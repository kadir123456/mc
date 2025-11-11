# Coupon Analyzer - Proje Detaylı Açıklama

## 🎯 Proje Amacı
Coupon Analyzer, kullanıcıların spor kuponlarını görsel olarak yükleyip yapay zeka destekli analiz alabilecekleri modern bir web platformudur. Platform, kullanıcı dostu arayüzü ve güvenli altyapısı ile kupon analizi hizmetini güvenilir bir şekilde sunar.

## 🔐 Veri Güvenliği

### Authentication & Authorization
- **Firebase Authentication** ile kurumsal düzeyde kimlik doğrulama
- Email/Şifre ve Google OAuth 2.0 desteği
- Her kullanıcı için benzersiz UID sistemi
- Şifreler Firebase tarafından hash'lenerek saklanır
- Session yönetimi Firebase SDK ile otomatik

### Database Security
- **Firebase Realtime Database** kullanımı
- Her kullanıcı verisi kendi UID'si altında izole
- Database Rules ile erişim kontrolü
- Sadece kullanıcı kendi verilerine erişebilir
- Real-time senkronizasyon ile tutarlı veri

### API Key Management
- Tüm API anahtarları environment variables'da
- Production'da Render.com secrets ile korunur
- Client-side'da asla sensitif key expose edilmez
- HTTPS zorunlu iletişim

### Data Privacy
- Kullanıcı görselleri Firebase Storage'da şifreli saklanır
- Kişisel veriler KVKK uyumlu işlenir
- Üçüncü taraflarla veri paylaşımı YOK
- Kullanıcı isterse hesap ve tüm veriler silinebilir

## ⚡ Site Hızı Optimizasyonları

### Frontend Performance
- **Vite** build tool ile ultra hızlı geliştirme
- Code splitting ile lazy loading
- Minified ve tree-shaken production build
- Gzip compression aktif (162KB compressed)
- Modern ES6+ kod optimizasyonları

### Image Optimization
- Client-side image resize (max 10MB)
- Base64 encoding ile direct upload
- Progressive image loading
- WebP format desteği

### Caching Strategy
- Firebase SDK built-in caching
- Browser localStorage kullanımı
- Static asset caching
- CDN distribution (Firebase hosting ile)

### Network Optimization
- HTTP/2 support
- Minimal API calls
- Batch operations where possible
- Real-time listeners optimize edilmiş

## 📊 SEO Uyumluluğu

### On-Page SEO
- Semantic HTML5 structure
- Descriptive meta tags
- Open Graph protocol support
- Twitter Card meta tags
- Canonical URLs
- Mobile-friendly responsive design
- Fast loading times (Core Web Vitals)

### Technical SEO
- Clean URL structure
- Sitemap.xml (production'da eklenecek)
- Robots.txt configuration
- Schema.org structured data
- SSL/HTTPS enforced
- 404 error handling

### Content SEO
- Descriptive page titles
- Meta descriptions
- Alt tags for images
- Internal linking structure
- Breadcrumb navigation
- User-focused content

## 📝 Kod Yapısı Detayları

### 1. Services Layer (/src/services/)

#### firebase.ts
**Amaç:** Firebase bağlantısı ve konfigürasyonu
- Firebase SDK initialization
- Auth, Database, Storage instances
- Environment variables integration
- Single source of truth for Firebase

#### authService.ts
**Amaç:** Kimlik doğrulama işlemleri
- **registerWithEmail:** Yeni kullanıcı kaydı, 1 kredi hediye
- **loginWithEmail:** Email/şifre ile giriş
- **loginWithGoogle:** Google OAuth flow
- **logout:** Güvenli çıkış
- **getUserData:** Kullanıcı bilgilerini çek
- **updateCredits:** Kredi güncelleme
- **addTransaction:** İşlem kaydı oluştur

#### analysisService.ts
**Amaç:** Görsel analiz ve Gemini AI entegrasyonu
- **analyzeImageWithGemini:** 
  - Base64 image Gemini API'ye gönder
  - Detaylı prompt ile analiz iste
  - JSON response parse et
  - Hata yönetimi
- **saveCouponAnalysis:** Analizi Firebase'e kaydet
- **getUserAnalyses:** Kullanıcı geçmişini çek

#### pytrService.ts
**Amaç:** PyTR ödeme entegrasyonu
- **Paket tanımları:** 5/20/50 görsel paketleri
- **createPaymentOrder:** Ödeme başlat
- **verifyPayment:** Ödeme doğrula
- **handleWebhook:** Webhook events işle

### 2. Context Layer (/src/context/)

#### AuthContext.tsx
**Amaç:** Global authentication state
- Firebase auth listener
- User state management
- Loading states
- Logout function
- RefreshUser for credit updates
- Provider pattern ile app-wide access

### 3. Components Layer (/src/components/)

#### ImageUpload.tsx
**Amaç:** Görsel yükleme ve analiz UI
- File input handling
- Image preview
- Validation (type, size)
- Gemini API call
- Credit check
- Success/error handling
- Loading states

#### PricingPlans.tsx
**Amaç:** Kredi paketleri gösterimi
- 3 paket card layout
- Popular badge
- PyTR payment flow
- Package selection
- Price display

#### UserAnalyses.tsx
**Amaç:** Analiz geçmişi gösterimi
- List view - tüm analizler
- Detail view - tek analiz detayı
- Match breakdown
- Confidence scores
- Recommendations display

### 4. Pages Layer (/src/pages/)

#### Register.tsx
**Amaç:** Kayıt sayfası
- Form validation
- Email/password fields
- Google OAuth button
- Terms agreement checkbox
- Error handling
- Navigation after success

#### Login.tsx
**Amaç:** Giriş sayfası
- Login form
- Remember me (optional)
- Google OAuth
- Error messages
- Redirect to dashboard

#### Dashboard.tsx
**Amaç:** Ana kontrol paneli
- Tab navigation (4 tabs)
- User info display
- Credit balance
- Logout button
- Component switching

#### PaymentSuccess.tsx
**Amaç:** Ödeme sonrası sayfa
- Order verification
- Success message
- Auto-redirect to dashboard
- Loading state

### 5. Types Layer (/src/types/)

#### index.ts
**Amaç:** TypeScript type definitions
- User interface
- Package interface
- CouponAnalysis interface
- MatchAnalysis interface
- Transaction interface
- Type safety across app

### 6. App.tsx
**Amaç:** Ana routing ve auth protection
- React Router setup
- Protected routes
- Auth check
- Loading states
- Navigation structure

## 🔒 Kullanım Şartları & Politikalar

### Kullanım Şartları Özeti
1. **Yaş Sınırı:** 18 yaş ve üzeri
2. **Analiz Hizmeti:** Sadece bilgilendirme amaçlıdır
3. **Sorumluluk:** Kullanıcı kararlarından sorumlu değiliz
4. **Kredi Sistemi:** Krediler iade edilemez
5. **Hesap Güvenliği:** Kullanıcı sorumluluğundadır
6. **Yasak Davranışlar:** Hile, spam, kötüye kullanım yasak
7. **İçerik Hakları:** Yüklenen içerikler kullanıcıya aittir
8. **Hizmet Değişiklikleri:** Değişiklik yapma hakkımız saklıdır

### Gizlilik Politikası Özeti
1. **Toplanan Veriler:**
   - Email, ad, profil foto
   - Yüklenen görsel içerikleri
   - Analiz sonuçları
   - İşlem geçmişi
   
2. **Veri Kullanımı:**
   - Hizmet sunumu
   - Analiz iyileştirme
   - İstatistiksel amaçlar
   
3. **Veri Paylaşımı:**
   - Üçüncü taraflarla paylaşılmaz
   - Gemini API: Sadece analiz için
   - PyTR: Sadece ödeme için
   
4. **Veri Güvenliği:**
   - Firebase encryption
   - HTTPS iletişim
   - Regular backups
   
5. **Kullanıcı Hakları:**
   - Veri görüntüleme
   - Veri düzeltme
   - Veri silme (hesap kapatma)
   - İtiraz etme

## 💳 Ödeme Bilgileri

### PyTR Ödeme Sistemi
- **Platform:** PyTR (Türkiye'nin ödeme altyapısı)
- **Güvenlik:** PCI DSS compliant
- **Desteklenen Yöntemler:**
  - Kredi kartı (Visa, Mastercard)
  - Banka kartı
  - Havale/EFT

### Paketler ve Fiyatlandırma
```
5 Görsel Araması   →  99 TL
20 Görsel Araması  → 299 TL (En Popüler)
50 Görsel Araması  → 499 TL
```

### Ödeme Akışı
1. Kullanıcı paket seçer
2. PyTR payment gateway'e yönlendirilir
3. Güvenli ödeme formu
4. Ödeme onayı
5. Webhook ile bildilir
6. Krediler otomatik yüklenir
7. Başarı sayfasına redirect

### İade Politikası
- Kullanılmamış krediler 14 gün içinde iade edilebilir
- Kullanılan krediler iade edilemez
- İade talebi destek üzerinden

## 🤖 Gemini AI Analizi

### Teknoloji
Platform, **Google Gemini 1.5 Flash** modelini kullanır. Bu model:
- Multi-modal (görsel + metin anlayışı)
- Hızlı response time
- Yüksek accuracy
- Cost-effective

### Analiz Süreci
1. Kullanıcı kupon görselini yükler
2. Görsel base64'e encode edilir
3. Detaylı prompt ile Gemini'ye gönderilir
4. AI görseli analiz eder:
   - Takım isimlerini okur
   - Ligleri tanır
   - Oranları inceler
5. Faktör analizi yapar:
   - Takım performansları
   - Yaralı/cezalı oyuncular
   - Hava koşulları
   - Geçmiş karşılaşmalar
6. JSON format response döner
7. Sonuçlar kullanıcıya sunulur

### Analiz Çıktıları
- **MS1/MS2/Beraberlik** tahmini
- **Alt/Üst** analizi
- **Handicap** önerileri
- **Güven skorları** (0-100)
- **Oran değerlendirmesi**
- **Özel öneriler**

### Önemli Not
Gemini AI kullanımı açıkça belirtilmez çünkü:
- Kullanıcı deneyimi odaklı
- Platform branding'i ön planda
- AI sadece bir tool, value platformda
- "Akıllı Analiz" olarak sunulur

## 📞 Destek & İletişim

### Destek Kanalları
1. **Email:** bilwininc@gmail.com
2. **İletişim Formu:** /contact sayfası
3. **Sık Sorulan Sorular:** /faq sayfası
4. **Canlı Destek:** (İleride eklenecek)

### Response Times
- Email: 24-48 saat
- Kritik sorunlar: 6 saat
- Genel sorular: 48 saat

### Destek Konuları
- Teknik sorunlar
- Ödeme problemleri
- Hesap işlemleri
- Genel sorular
- Öneriler ve geri bildirim

## 👨‍💼 Site Yapımcısı

### Bilwin Inc. 2025
**Web:** www.bilwin.inc (varsayılan)
**Email:** bilwininc@gmail.com
**Copyright:** © 2025 Bilwin Inc. Tüm hakları saklıdır.

### Teknoloji Stack
- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS
- Backend: Firebase (Auth, Database, Storage)
- AI: Google Gemini 1.5 Flash
- Payment: PyTR API
- Hosting: Render.com

### Versiyon
**v1.0.0** - Initial Release (2025)

## ✅ Kod Kalite Kontrolü

### Güvenlik
✅ XSS koruması (React default escaping)
✅ CSRF token yönetimi
✅ SQL Injection riski YOK (NoSQL)
✅ API key encryption
✅ HTTPS enforced
✅ Input validation
✅ Error boundary handling

### Performance
✅ Lazy loading
✅ Code splitting
✅ Memoization (where needed)
✅ Debouncing (search/input)
✅ Image optimization
✅ Minimal re-renders
✅ Efficient database queries

### Best Practices
✅ TypeScript type safety
✅ ESLint configuration
✅ Consistent code style
✅ Component modularity
✅ DRY principle
✅ SOLID principles
✅ Error handling
✅ Loading states
✅ User feedback (toasts/alerts)

### Testing (Önerilen - Henüz eklenmedi)
⚠️ Unit tests
⚠️ Integration tests
⚠️ E2E tests
⚠️ Performance tests

## 🚀 Deployment Checklist

✅ Environment variables configured
✅ Firebase project setup
✅ Gemini API key active
✅ PyTR merchant account
✅ Build successful
✅ Database rules configured
✅ CORS settings correct
✅ Domain DNS configured (production)
✅ SSL certificate active
✅ Error monitoring setup (optional)
✅ Analytics integrated (optional)

## 📊 Metrics & Analytics (İleride)

- User registration rate
- Active users
- Analysis completion rate
- Payment conversion rate
- Average session duration
- Popular analysis times
- Credit usage patterns
- Error rates

## 🔄 Gelecek Geliştirmeler

1. **Özellik Geliştirmeleri:**
   - Mobil app (React Native)
   - Push notifications
   - Email verification
   - Password reset
   - Profile customization
   - Analysis comparison
   - Historical data trends

2. **AI Geliştirmeleri:**
   - Daha detaylı analiz
   - Geçmiş performans tracking
   - Personalized recommendations
   - Success rate tracking

3. **Sosyal Özellikler:**
   - Analysis sharing
   - User comments
   - Community predictions
   - Leaderboards

4. **Premium Features:**
   - Unlimited analyses
   - Priority support
   - Advanced statistics
   - Export to PDF
   - API access

## 📄 Lisans
Proprietary - © 2025 Bilwin Inc.
