# Gemini 1.5 Pro + Google Search Grounding Entegrasyonu

## Genel Bakış

Bu proje, **Gemini 1.5 Pro** modelini kullanarak bahis kuponu analizleri yapmaktadır. Sistem, **Google Search Grounding** özelliğini kullanarak gerçek zamanlı verilerle analizler sunar ve **Firebase Realtime Database** üzerinde akıllı önbellekleme yapar.

## Temel Özellikler

### 1. Üç Aşamalı Analiz Sistemi

#### Adım 1: OCR ve Maç Tespiti
- Kullanıcının yüklediği kupon görselinden maç bilgileri çıkarılır
- Takım isimleri, ligler, oranlar tespit edilir
- Her maç için benzersiz `matchId` oluşturulur

#### Adım 2: Akıllı Önbellekleme ve Veri Toplama
- Her tespit edilen maç için Firebase cache kontrolü yapılır
- **Cache HIT**: Veri 24 saatten yeniyse cache'den kullanılır (API tasarrufu)
- **Cache MISS**: Gemini Google Search ile gerçek zamanlı veri toplar
  - Son 5 maç sonuçları
  - Kafa kafaya (H2H) istatistikler
  - Sakatlık ve kadro haberleri
  - Lig sıralaması
- Toplanan veriler Firebase'e kaydedilir

#### Adım 3: Final Analiz ve Skorlama
- Ağırlık sistemi ile analiz:
  - Son Form: %40
  - H2H: %25
  - Sakatlık: %15
  - Lig Sıralaması: %10
  - İç/Dış Saha: %10
- Sadece 70+ güven skorlu maçlar önerilir
- Risk seviyesi belirlenir

### 2. Google Search Grounding

```typescript
tools: [
  {
    googleSearch: {}
  }
]
```

Bu özellik sayesinde:
- Gemini gerçek zamanlı Google araması yapar
- Güvenilir kaynaklardan veri toplar
- Grounding metadata ile kaynak URL'leri döner
- Confidence skorları hesaplanır

### 3. Firebase Realtime Database Yapısı

```
/match_cache
  /{matchId}
    - teamHome: string
    - teamAway: string
    - league: string
    - homeForm: string
    - awayForm: string
    - h2h: string
    - injuries: string
    - leaguePosition: string
    - lastUpdated: number
    - dataSources: string[]
    - confidenceScore: number

/analyses
  /{analysisId}
    - userId: string
    - imageUrl: string
    - uploadedAt: number
    - analysis: object
    - status: string

/users
  /{userId}
    /analyses
      /{analysisId}: string
```

## Teknik Detaylar

### Model ve Konfigürasyon

```typescript
const GEMINI_MODEL = 'gemini-1.5-pro';
const CACHE_EXPIRY_HOURS = 24;

// OCR için
generationConfig: {
  temperature: 0.1,
  topK: 20,
  topP: 0.8,
  maxOutputTokens: 2048
}

// Veri toplama için (Google Search aktif)
generationConfig: {
  temperature: 0.2,
  topK: 20,
  topP: 0.8,
  maxOutputTokens: 4096
}

// Final analiz için
generationConfig: {
  temperature: 0.3,
  topK: 32,
  topP: 0.9,
  maxOutputTokens: 4096
}
```

### Prompt Stratejisi

#### 1. OCR Prompt
- Sadece maç bilgilerini çıkar
- Analiz yapma
- JSON formatında döndür

#### 2. Data Collection Prompt
- Spesifik arama terimleri belirt
- MUTLAKA Google Search kullanmasını iste
- Yapılandırılmış veri formatı talep et
- Kaynak URL'lerini isteme (grounding metadata'dan gelir)

#### 3. Final Analysis Prompt
- Toplanan gerçek verileri sun
- Ağırlık sistemini açıkça belirt
- Güven skoru threshold'u belirt (70+)
- Risk uyarılarını isteme

## Kullanıcı Arayüzü

### ImageUpload Component
- Multi-step progress bar
- Her adımın durumunu gösterir:
  1. ✓ Görsel yükleniyor (10%)
  2. ⟳ Maçlar tespit ediliyor (30%)
  3. ⟳ Gerçek zamanlı veriler toplanıyor (60%)
  4. ✓ Analiz tamamlanıyor (100%)

### UserAnalyses Component
- Genişletilebilir maç kartları
- Her maç için:
  - Tahmin oranları ve güven skorları
  - Gerçek veriler (Form, H2H, Sakatlık, Lig)
  - Veri kalitesi göstergesi
  - Kaynak sayısı
  - Son güncelleme zamanı
- "Gerçek Zamanlı Veri Analizi" badge'i

## Performans Optimizasyonları

### 1. Akıllı Cache
- 24 saatlik cache süresi
- Cache hit rate: ~60-70% (tahmin)
- API maliyet tasarrufu: %60+

### 2. Batch Processing
- Birden fazla maç için tek analiz çağrısı
- Token kullanımı optimizasyonu

### 3. Paylaşımlı Cache
- Match cache tüm kullanıcılar tarafından paylaşılır
- Popüler maçlar için yüksek cache hit

## Güvenlik

### Firebase Security Rules

```json
{
  "match_cache": {
    "$matchId": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  },
  "analyses": {
    "$analysisId": {
      ".read": "auth != null && data.child('userId').val() === auth.uid",
      ".write": "auth != null && (!data.exists() || data.child('userId').val() === auth.uid)"
    }
  }
}
```

Detaylı kurallar için: `FIREBASE_SECURITY_RULES.md`

## API Kullanımı

### Örnek Flow

```typescript
// 1. Görsel yükle
const base64 = imageFile.toBase64();

// 2. Analiz başlat
const analysis = await analysisService.analyzeImageWithGemini(base64);

// 3. Sonuçları kaydet
await analysisService.saveCouponAnalysis(userId, {
  imageUrl: preview,
  analysis,
  status: 'completed'
});

// 4. Kredi düş
await authService.updateCredits(userId, credits - 1);
```

## Geliştirme Notları

### Console Logları
Sistem detaylı console log'ları içerir:
- `🔍 Adım 1: Görselden maçları tespit ediliyor...`
- `✅ X maç tespit edildi`
- `📦 Adım 2: Cache kontrolü yapılıyor...`
- `✅ Cache HIT: TeamA vs TeamB (X.Xh önce)`
- `🆕 Cache MISS: TeamA vs TeamB - İlk kez veri çekiliyor...`
- `🧠 Adım 3: Final analiz yapılıyor...`
- `✅ Analiz tamamlandı!`

### Hata Yönetimi
- API timeout: User friendly mesaj
- Veri bulunamadı: "Veri bulunamadı" yerine null döner
- Cache hatası: Fallback olarak yeni veri çeker

## Sonraki Adımlar

### Potansiyel İyileştirmeler
1. **Streaming Response**: Kullanıcı sonuçları canlı görsün
2. **Proaktif Cache**: Popüler maçları önceden cache'le
3. **A/B Testing**: Farklı prompt versiyonlarını test et
4. **Analytics**: Cache hit rate, analiz başarı oranı tracking
5. **Admin Dashboard**: API kullanım metrikleri

### Monitoring
- Gemini API usage tracking
- Cache performance metrics
- User satisfaction scoring
- Error rate monitoring

## Önemli Notlar

1. **Gemini API Key**: `.env` dosyasında `VITE_GEMINI_API_KEY` olarak tanımlı
2. **Model**: `gemini-2.0-flash-exp` kullanılıyor (en iyi sonuçlar için)
3. **Cache**: Firebase Realtime Database, manuel temizlik gerekebilir
4. **Rate Limiting**: Gemini API limitleri için retry logic eklenebilir

## Lisans ve Sorumluluk

Bu sistem gerçek zamanlı verilerle çalışır ancak:
- ✅ Veri kalitesi güvenilir kaynaklara bağlıdır
- ✅ Confidence skorları dikkate alınmalıdır
- ⚠️ Sistem garanti vermez, analiz amaçlıdır
- ⚠️ Kullanıcılar kendi kararlarından sorumludur

## İletişim

Sorular için: [GitHub Issues](https://github.com/username/repo/issues)
