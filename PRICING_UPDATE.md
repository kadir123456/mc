# 💰 Fiyatlandırma Güncellemesi - v2.0

## 📊 Yeni Paket Yapısı

### ✅ Güncel Paketler

| Paket | Fiyat | Kredi | Standart Kupon | Detaylı Kupon | Kredi/TL |
|-------|-------|-------|----------------|---------------|----------|
| **Başlangıç** | 99 TL | 5 | 5 adet | 1 adet | 19.8 TL |
| **Standart** 🔥 | 199 TL | 12 | 12 adet | 2 adet | 16.6 TL |
| **Profesyonel** | 399 TL | 30 | 30 adet | 6 adet | 13.3 TL |
| **Expert** 💎 | 999 TL | 100 | 100 adet | 20 adet | 10.0 TL |

### 🎁 İlk Kayıt Bonusu
- **1 Ücretsiz Kredi** her yeni kullanıcıya
- 1 standart kupon (3 maç) analizi yapabilir
- Sistemi test etme fırsatı

---

## 📈 Maliyet Analizi

### Aylık Sabit Giderler
```
Render.com (Hosting):     2,100 TL/ay
Football API:                  0 TL (free 100/gün)
Gemini AI:                     0 TL (free tier)
Firebase Database:             0 TL (free spark)
────────────────────────────────────
TOPLAM:                    2,100 TL/ay
```

### Break-Even Hesabı
```
Minimum Satış: 22 paket/ay (99 TL x 22 = 2,178 TL)
Hedef: 50-100 paket/ay
```

### Gelir Projeksiyonu (Aylık)

**Konservatif Senaryo (50 paket):**
```
10 x Başlangıç (99 TL)    =    990 TL
20 x Standart (199 TL)     =  3,980 TL
15 x Profesyonel (399 TL)  =  5,985 TL
5 x Expert (999 TL)        =  4,995 TL
────────────────────────────────────
TOPLAM:                      15,950 TL
Gider:                       -2,100 TL
────────────────────────────────────
KAR:                         13,850 TL/ay
```

**İyimser Senaryo (100 paket):**
```
20 x Başlangıç             =  1,980 TL
40 x Standart              =  7,960 TL
30 x Profesyonel           = 11,970 TL
10 x Expert                =  9,990 TL
────────────────────────────────────
TOPLAM:                      31,900 TL
Gider:                       -2,100 TL
────────────────────────────────────
KAR:                         29,800 TL/ay
```

---

## 🎯 Değişiklik Özeti

### ❌ Eski Sistem
```
- 5 Görsel Araması:  99 TL
- 20 Görsel Araması: 299 TL (POPÜLER)
- 50 Görsel Araması: 499 TL
```

### ✅ Yeni Sistem
```
- Başlangıç (5 kredi):        99 TL
- Standart (12 kredi):       199 TL (POPÜLER)
- Profesyonel (30 kredi):    399 TL
- Expert (100 kredi):        999 TL (EN AVANTAJLI)
```

### 🔄 Değişiklikler
1. **Kredi sistemi** güncellendi (görsel → kredi)
2. **2 yeni paket** eklendi (Profesyonel, Expert)
3. **Bonus krediler** kaldırıldı (daha net fiyatlama)
4. **İlk kayıt bonusu** eklendi (1 kredi)
5. **Paket isimleri** daha profesyonel

---

## 🎨 UI Değişiklikleri

### Dashboard
- ❌ "Görsel Yükle" tab kaldırıldı
- ❌ "Geçmiş" tab kaldırıldı
- ✅ "Bültene Git" butonu eklendi
- ✅ Hoş geldiniz mesajı eklendi

### Pricing Plans
- ✅ 4 paket gösterimi (2 sütun → 4 sütun)
- ✅ Kredi açıklamaları güncellendi
- ✅ İlk kayıt bonusu bilgisi eklendi
- ✅ Standart/Detaylı kupon sayıları gösterimi

### Home Page
- ✅ "Bülteni Görüntüle" butonu
- ✅ Sistem açıklamaları güncellendi
- ✅ Görsel yükleme referansları kaldırıldı

---

## 📱 Kullanıcı Akışı

### 1. Kayıt
```
Kullanıcı kayıt olur
↓
Otomatik 1 kredi verilir
↓
Dashboard'a yönlendirilir
```

### 2. İlk Deneme
```
"Bültene Git" butonu
↓
3 maç seçer (standart)
↓
1 kredi harcar
↓
Analiz görür
```

### 3. Kredi Satın Alma
```
Dashboard → "Kredi Al"
↓
Paket seçer (örn: Standart 199 TL)
↓
Ödeme yapar
↓
12 kredi yüklenir
```

### 4. Kupon Oluşturma
```
Bülten → Maç seç
↓
Standart (3 maç, 1 kredi) VEYA
Detaylı (5 maç, 5 kredi)
↓
Onay popup
↓
Gemini AI analizi
↓
Kuponlarım'da görüntüle
```

---

## 💡 Fiyatlandırma Stratejisi

### Başlangıç (99 TL)
- **Hedef:** İlk alıcılar, test kullanıcıları
- **Strateji:** Düşük giriş bariyeri
- **Kar Marjı:** %100 (maliyet ~0)

### Standart (199 TL) - POPÜLER
- **Hedef:** Aktif kullanıcılar
- **Strateji:** En çok satış beklenen paket
- **Avantaj:** 12 kredi = haftalık kullanım
- **Kar Marjı:** %100

### Profesyonel (399 TL)
- **Hedef:** Düzenli kullanıcılar
- **Strateji:** Aylık kullanım için ideal
- **Avantaj:** %33 daha ucuz kredi
- **Kar Marjı:** %100

### Expert (999 TL) - EN AVANTAJLI
- **Hedef:** Power users, profesyoneller
- **Strateji:** Prestige pricing + ekonomiklik
- **Avantaj:** %50 daha ucuz kredi
- **Kar Marjı:** %100

---

## 📊 Pazar Karşılaştırması

### Rakip Analiz
```
Rakip A: 150 TL / 10 analiz = 15 TL/analiz
Rakip B: 200 TL / 15 analiz = 13.3 TL/analiz
Aikupon Başlangıç: 99 TL / 5 = 19.8 TL/analiz ❌
Aikupon Expert: 999 TL / 100 = 10 TL/analiz ✅
```

**Sonuç:** Expert paket en rekabetçi!

### Değer Önerisi
1. **Gemini AI:** Google'ın en gelişmiş AI'ı
2. **Detaylı Analiz:** İlk yarı + maç sonu
3. **Gerçek Veriler:** Football API'den günlük güncelleme
4. **Popüler Kuponlar:** Sosyal proof
5. **Mobil Uyumlu:** Her yerden erişim

---

## 🚀 Büyüme Planı

### Ay 1-2: Lansман
- Hedef: 20-30 paket/ay
- Odak: İlk kullanıcılar + feedback
- Marketing: Organik + influencer

### Ay 3-4: Büyüme
- Hedef: 50-75 paket/ay
- Odak: Kullanıcı deneyimi optimizasyonu
- Marketing: Paid ads + referral

### Ay 5-6: Ölçeklendirme
- Hedef: 100+ paket/ay
- Odak: Sadakat programı
- Marketing: Community building

---

## ⚠️ Risk Yönetimi

### API Limitleri
**Risk:** Football API free plan (100/gün)
**Çözüm:**
- Şu an: 2 istek/gün ✅
- Plan B: Paid plan $40/ay

### Yüksek Kullanım
**Risk:** Gemini API ücretli geçiş
**Maliye:** ~$0.001/request
**Etki:** 100 kupon/gün = $3/ay (126 TL)
**Çözüm:** Fiyatlara dahil ✅

### Worst Case Maliyet
```
Render:         2,100 TL
Football API:     168 TL (paid)
Gemini:           126 TL (high usage)
Firebase:          21 TL (blaze)
────────────────────────
TOPLAM:         2,415 TL/ay
```

**Break-even (worst case):** 25 paket/ay

---

## 📞 Sonuç

### ✅ Başarı Kriterleri
- Aylık 50+ paket satışı
- %80+ müşteri memnuniyeti
- <5% churn rate

### 📈 Beklenen Performans
```
Aylık Gelir: 15,000-30,000 TL
Aylık Gider: 2,100-2,415 TL
Net Kar: 12,600-27,600 TL
Kar Marjı: %80-90
```

**Sistem hazır ve karlı! 🚀**

---

**Son Güncelleme:** 13 Kasım 2025
**Döviz Kuru:** 1 USD = 42 TL
**Versiyon:** v2.0
