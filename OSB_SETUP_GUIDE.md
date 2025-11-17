# 🎯 SHOPIER OSB ENTEGRASYONU - KURULUM REHBERİ

## ✅ Yapılan İşlemler

### 1. Backend'e OSB Endpoint'i Eklendi
- **Dosya:** `/app/server.js`
- **Endpoint:** `POST /api/shopier/osb`
- **Özellikler:**
  - ✅ HMAC-SHA256 hash doğrulaması
  - ✅ Base64 decode + JSON parse
  - ✅ Email ile kullanıcı bulma
  - ✅ Otomatik kredi ekleme
  - ✅ Tekrar işlem önleme (orderid kontrolü)
  - ✅ Test modu desteği
  - ✅ Başarısız ödeme kayıtları
  - ✅ Bilinmeyen fiyat kayıtları

### 2. PHP Kodu Node.js'e Çevrildi
Orijinal PHP kodunuz:
```php
$hash=hash_hmac('sha256',$_POST['res'].$username,$key,false);
$json_result=base64_decode($_POST['res']);
$array_result=json_decode($json_result,true);
```

Node.js karşılığı:
```javascript
const hash = crypto
  .createHmac('sha256', OSB_PASSWORD)
  .update(encodedData + OSB_USERNAME)
  .digest('hex');
const jsonResult = Buffer.from(encodedData, 'base64').toString('utf-8');
const orderData = JSON.parse(jsonResult);
```

---

## 🔧 RENDER.COM ENVIRONMENT VARIABLES

Render Dashboard → Environment → Add Environment Variable

**Şu 2 değişkeni ekleyin:**

```bash
SHOPIER_OSB_USERNAME=c885314b8d8f484f29bc908290090836
SHOPIER_OSB_PASSWORD=ee4a40d58d710549b35a7ce8824038d7
```

⚠️ **ÖNEMLI:** Bu değerleri ekledikten sonra "Save Changes" yapın ve Render otomatik deploy edecektir.

---

## 🌐 SHOPIER PANEL AYARLARI

### 1. Shopier Dashboard'a Giriş
https://www.shopier.com → Giriş Yap

### 2. OSB Ayarlarına Git
**Entegrasyonlar → Modül Yönetimi → OSB (Otomatik Sipariş Bildirimi)**

### 3. OSB Ayarlarını Yapın

**Bildirim URL:**
```
https://aikupon.com/api/shopier/osb
```

**Protokol:** HTTPS

**Aktif/Pasif:** Aktif

⚠️ **DİKKAT:**
- URL'nin sonunda `/` olmamalı
- `https://` ile başlamalı (http değil)
- Tam olarak yukarıdaki gibi olmalı
- `/api/shopier/osb` endpoint'i kullanılmalı

### 4. OSB Kullanıcı Bilgilerini Doğrulayın
Shopier panelinde görünen OSB credentials:
```
OSB Kullanıcı Adı: c885314b8d8f484f29bc908290090836
OSB Şifresi: ee4a40d58d710549b35a7ce8824038d7
```

Bu değerler Render environment variables ile eşleşmeli!

---

## 🔄 ÖDEME AKIŞI

1. **Kullanıcı Paket Seçer**
   - aikupon.com → Giriş → Kredi Al
   - Paket kartına tıklar

2. **Shopier'a Yönlendirme**
   - Kullanıcı Shopier ödeme sayfasına yönlendirilir
   - Email otomatik doldurulur

3. **Ödeme Tamamlanır**
   - Kullanıcı kredi kartı/havale ile ödeme yapar
   - Shopier ödemesi onaylar

4. **OSB Bildirimi**
   - Shopier otomatik olarak `POST https://aikupon.com/api/shopier/osb` adresine bildirim gönderir
   - Bildirim şu verileri içerir:
     - `res`: Base64 encoded sipariş verileri
     - `hash`: HMAC-SHA256 doğrulama hash'i

5. **Backend İşlemi**
   - Hash doğrulanır
   - Email ile kullanıcı bulunur
   - Fiyata göre kredi belirlenir
   - Firebase'e kredi eklenir
   - İşlem kaydedilir

6. **Tamamlandı**
   - Kullanıcının hesabına kredi otomatik yüklenir
   - Dashboard'da yeni bakiye görünür

---

## 📊 PAKET FİYATLARI

Backend'de tanımlı fiyat-kredi eşleştirmesi:

| Paket | Fiyat | Kredi | Shopier URL |
|-------|-------|-------|-------------|
| Başlangıç | 99₺ | 5 | bilwininc/41271482 |
| Standart | 189₺ | 10 | bilwininc/41271535 |
| Profesyonel | 449₺ | 25 | bilwininc/41271562 |
| Expert | 799₺ | 50 | bilwininc/41271593 |

---

## 🧪 TEST ETME

### 1. OSB Endpoint Testi (Manuel)

Render'da deploy edildikten sonra:

```bash
curl -X POST https://aikupon.com/api/shopier/osb \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "res=TEST_DATA&hash=TEST_HASH"
```

**Beklenen Yanıt:** 
- Credentials varsa: "Invalid hash" (hash yanlış olduğu için)
- Credentials yoksa: "OSB credentials not configured"

### 2. Gerçek Ödeme Testi

**Test Modu (Shopier Test Kartı):**
1. aikupon.com → Giriş Yap
2. Dashboard → Kredi Al
3. Bir paket seç (örn: 99₺ - 5 Kredi)
4. Shopier'a yönlendirileceksiniz
5. Test kartı bilgileri:
   ```
   Kart No: 4111 1111 1111 1111
   Son Kullanma: 12/25
   CVV: 123
   ```
6. Ödemeyi tamamla
7. Dashboard'a dön ve kredilerin eklendiğini kontrol et

---

## 🔍 LOG KONTROL

### Render.com Logs

Render Dashboard → Logs sekmesi → Arama yapın:

**Başarılı OSB İşlemi:**
```
✅ OSB hash doğrulandı
✅ Kullanıcı bulundu
💳 İşlenecek: 99₺ → 5 kredi
💰 5 kredi {userId} kullanıcısına eklendi
✅ OSB ödemesi işlendi
🎉 BAŞARILI
```

**Başarısız OSB İşlemi:**
```
❌ OSB hash doğrulama hatası
❌ Kullanıcı bulunamadı
❌ Bilinmeyen paket fiyatı
```

### Firebase Console

Firebase Console → Realtime Database

**Kontrol Edilecek Yerler:**
1. `users/{userId}/credits` - Kredi bakiyesi güncellenmiş mi?
2. `users/{userId}/transactions` - Transaction kaydı oluşturulmuş mu?
3. `processed_orders/{orderid}` - Sipariş işlenmiş olarak kaydedilmiş mi?
4. `failed_osb_payments` - Başarısız ödemeler (varsa)
5. `unknown_osb_prices` - Bilinmeyen fiyatlar (varsa)

---

## ⚠️ SORUN GİDERME

### Krediler Eklenmiyor

**Kontrol Listesi:**
1. ✅ Render environment variables eklenmiş mi?
   - `SHOPIER_OSB_USERNAME`
   - `SHOPIER_OSB_PASSWORD`

2. ✅ Shopier panelinde OSB aktif mi?
   - Bildirim URL doğru mu?
   - Protokol HTTPS mi?

3. ✅ Firebase bağlantısı çalışıyor mu?
   - Render logs: `Firebase: Connected ✅`

4. ✅ Kullanıcı Firebase'de var mı?
   - Shopier'da girilen email aikupon.com'daki ile aynı mı?
   - Email küçük harflerle mi yazılmış?

**Debug Adımları:**
1. Render logs'u kontrol et
2. Firebase Console'da kullanıcıyı ara
3. `failed_osb_payments` kaydına bak
4. Shopier panel → Siparişler → Bildirim durumu

### "Kullanıcı Bulunamadı" Hatası

**Sebep:** Shopier'da girilen email Firebase'de kayıtlı değil.

**Çözüm:**
1. Firebase Console → Authentication veya Realtime Database → users
2. Kullanıcının email'ini kontrol et
3. Shopier'da AYNI email'i kullan
4. Email'ler küçük harf olmalı (test@example.com ✅, Test@Example.com ❌)

**Alternatif:** 
Manuel kredi ekleme için `failed_osb_payments` kaydını kontrol edin.

### "Bilinmeyen Paket Fiyatı" Hatası

**Sebep:** Gelen fiyat backend'de tanımlı değil (99, 189, 449, 799₺ olmalı)

**Çözüm:**
1. `unknown_osb_prices` Firebase kaydını kontrol et
2. Shopier'da paket fiyatlarını kontrol et
3. Backend `/app/server.js` → `PRICE_TO_CREDITS` objesini kontrol et

### Hash Doğrulama Hatası

**Sebep:** 
- OSB credentials yanlış
- Shopier panelinde farklı credentials kullanılıyor

**Çözüm:**
1. Render environment variables'ı kontrol et
2. Shopier panel → OSB ayarları → Kullanıcı adı/şifre
3. İkisi eşleşmeli

---

## 📝 KONTROL LİSTESİ

### Backend
- [x] OSB endpoint eklendi (`/api/shopier/osb`)
- [x] HMAC-SHA256 hash doğrulaması
- [x] Base64 decode + JSON parse
- [x] Email ile kullanıcı bulma
- [x] Kredi ekleme (transaction ile)
- [x] Sipariş ID kontrolü (tekrar işlem önleme)
- [x] Test modu desteği
- [x] Başarısız ödeme kayıtları
- [x] Bilinmeyen fiyat kayıtları

### Environment Variables (Render)
- [ ] **SHOPIER_OSB_USERNAME eklenmeli** ⚠️
- [ ] **SHOPIER_OSB_PASSWORD eklenmeli** ⚠️
- [x] SHOPIER_API_USER (mevcut)
- [x] SHOPIER_API_SECRET (mevcut)
- [x] FIREBASE_SERVICE_ACCOUNT (mevcut)

### Shopier Panel
- [ ] **OSB Bildirim URL ayarlanmalı** ⚠️
- [ ] **OSB Aktif olmalı** ⚠️
- [x] OSB Credentials doğru
- [x] Paket linkleri aktif

### Test
- [ ] **Render'da deploy sonrası test edilmeli** ⚠️
- [ ] Shopier test kartı ile ödeme testi
- [ ] Kredilerin eklendiği doğrulanmalı

---

## 🎯 SONRAKI ADIMLAR

1. **Render.com'da Environment Variables Ekleyin** (5 dk)
   ```
   SHOPIER_OSB_USERNAME=c885314b8d8f484f29bc908290090836
   SHOPIER_OSB_PASSWORD=ee4a40d58d710549b35a7ce8824038d7
   ```

2. **Render'ın Deploy Etmesini Bekleyin** (2-3 dk)
   - Deploy tamamlanınca logs'ta göreceksiniz:
   - `💳 Shopier OSB: Configured ✅`

3. **Shopier Panel'de OSB Ayarlarını Yapın** (3 dk)
   - Bildirim URL: `https://aikupon.com/api/shopier/osb`
   - Aktif: ✅
   - Protokol: HTTPS

4. **Test Edin** (5 dk)
   - Shopier test kartı ile ödeme yapın
   - Dashboard'da kredilerin eklendiğini kontrol edin
   - Render logs'unda başarılı işlem mesajlarını görün

---

## 🔐 GÜVENLİK

OSB entegrasyonu şu güvenlik önlemlerini içerir:

1. **HMAC-SHA256 Hash Doğrulaması**
   - Her istek Shopier tarafından imzalanır
   - Backend hash'i doğrular
   - Sahte istekler reddedilir

2. **Environment Variables**
   - Hassas bilgiler kod içinde değil
   - Sadece Render environment'da
   - Git'e commit edilmez

3. **Tekrar İşlem Önleme**
   - Her orderid sadece bir kez işlenir
   - `processed_orders` Firebase node'unda saklanır

4. **Test Modu Kontrolü**
   - Test ödemeleri gerçek kredi eklemiyor
   - Production'da güvenlik sağlanıyor

---

## 📞 DESTEK

Sorun yaşarsanız kontrol edilecekler:

1. **Render Logs** - En önemli debug aracı
2. **Firebase Console** - Veri kontrol
3. **Shopier Panel** - OSB ayarları ve sipariş durumu
4. **Email Eşleşmesi** - En yaygın sorun

---

**✅ OSB ENTEGRASYONU: TAMAMLANDI**  
**📅 Tarih:** 17 Kasım 2025  
**🔧 Versiyon:** 2.0.0 (OSB Desteği)  
**💻 Dosya:** `/app/server.js` (satır 696-860)

**⚠️ SON ADIM:** Render.com'da environment variables ekleyin ve Shopier panelde OSB'yi aktif edin!
