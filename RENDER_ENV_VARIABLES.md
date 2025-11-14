# 🔐 Render.com Environment Variables

## ✅ DOĞRU YAPILANDIRMA

Aşağıdaki environment variables'ları Render.com dashboard'unda **AYNEN** ekleyin:

```bash
# ⚠️ ÖNEMLİ: Değişken isimleri tam olarak aşağıdaki gibi olmalı!

# Firebase Configuration (Client)
VITE_FIREBASE_API_KEY=AIzaSyBfM817eR65uDCtOcR_RXAumhZ8pvWe1Js
VITE_FIREBASE_AUTH_DOMAIN=avia-32878.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=avia-32878
VITE_FIREBASE_STORAGE_BUCKET=avia-32878.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=755523009243
VITE_FIREBASE_APP_ID=1:755523009243:web:d300d50f85265ed79c6afe
VITE_FIREBASE_DATABASE_URL=https://avia-32878-default-rtdb.firebaseio.com

# Firebase Admin (Server) - ⚠️ EKLENMELİ!
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"avia-32878",...FULL_JSON_HERE...}

# Football API (Maç verileri için)
VITE_FOOTBALL_API_KEY=7bcf406e41beede8a40aee7405da2026

# Gemini AI (Analiz için)
VITE_GEMINI_API_KEY=AIzaSyDfWYboszxlGASAma0I7ODEKGA0Km-stsc

# Payment (Ödeme sistemi - opsiyonel)
VITE_PYTR_API_KEY=your_actual_pytr_api_key
VITE_PYTR_MERCHANT_ID=your_merchant_id
VITE_PYTR_API_URL=https://api.pytr.io
```

---

## ❌ SİLİNMESİ GEREKENLER

Bu değişkenler **KULLANILMIYOR** ve silinmeli:

```bash
# ❌ KULLANILMIYOR - Silin
VITE_API_FOOTBALL_KEY=7bcf406e41beede8a40aee7405da2026  # Yanlış isim
VITE_API_SPORTS_BASE_URL=https://v3.football.api-sports.io
VITE_API_SPORTS_KEY=7bcf406e41beede8a40aee7405da2026
VITE_SPORTSRADAR_API_BASE_URL=https://api-football-v1.p.rapidapi.com
```

---

## 🔑 EKSİK DEĞİŞKEN

### FIREBASE_SERVICE_ACCOUNT (Kritik!)

Bu değişken **mutlaka eklenmeli**. Yoksa server maçları Firebase'e kaydedemez.

#### Nasıl Alınır?

1. [Firebase Console](https://console.firebase.google.com) → `avia-32878` projenizi seçin
2. **Project Settings** (⚙️ ikonu) → **Service Accounts** sekmesi
3. **Generate new private key** butonuna tıklayın
4. JSON dosyası indirilir

#### Nasıl Eklenir?

JSON dosyasının **tüm içeriğini** tek satır olarak ekleyin:

```bash
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"avia-32878","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xyz@avia-32878.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xyz%40avia-32878.iam.gserviceaccount.com"}
```

⚠️ **DİKKAT:**
- Tüm JSON tek satırda olmalı
- Tırnak işaretleri (`"`) escape edilmemeli
- Yeni satırlar (`\n`) korunmalı

---

## 📋 SON LİSTE (Render.com'a Eklenecek)

### 1. Firebase Client (6 değişken)
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_DATABASE_URL
```

### 2. Firebase Server (1 değişken) ⚠️ EKSİK!
```
FIREBASE_SERVICE_ACCOUNT
```

### 3. APIs (2 değişken)
```
VITE_FOOTBALL_API_KEY
VITE_GEMINI_API_KEY
```

### 4. Payment (3 değişken - opsiyonel)
```
VITE_PYTR_API_KEY
VITE_PYTR_MERCHANT_ID
VITE_PYTR_API_URL
```

**TOPLAM:** 12 değişken (9 zorunlu + 3 opsiyonel)

---

## ✅ KONTROL LİSTESİ

Deploy öncesi kontrol edin:

- [ ] `VITE_FIREBASE_*` değişkenleri eklendi (7 adet)
- [ ] `FIREBASE_SERVICE_ACCOUNT` eklendi (**ÖNEMLİ!**)
- [ ] `VITE_FOOTBALL_API_KEY` eklendi (doğru isim)
- [ ] `VITE_GEMINI_API_KEY` eklendi
- [ ] Yanlış isimli değişkenler silindi (`VITE_API_FOOTBALL_KEY`, `VITE_API_SPORTS_*`, vb.)
- [ ] Firebase Realtime Database rules güncellendi
- [ ] Firebase Authentication - Google enabled

---

## 🚀 Deploy Sonrası

### 1. Maçları Çek
```bash
# Render.com Shell'de çalıştır:
node fetch-matches.js
```

### 2. Test Et
```bash
# Browser'da aç
https://your-app.onrender.com/bulletin

# Maçlar görünmeli ✅
```

### 3. Logs Kontrol Et
```bash
# Render.com → Logs
✅ Firebase Admin initialized
✅ Football API: Configured
✅ Saved X matches for today
```

---

## ❓ Sorun Giderme

### "Permission denied"
**Sebep:** Firebase rules yanlış veya `FIREBASE_SERVICE_ACCOUNT` eksik
**Çözüm:** Rules'u güncelle ve service account ekle

### "Maç bulunmuyor"
**Sebep:** Maçlar çekilmemiş
**Çözüm:** `node fetch-matches.js` çalıştır

### "VITE_FOOTBALL_API_KEY is not defined"
**Sebep:** Environment variable ismi yanlış
**Çözüm:** Tam olarak `VITE_FOOTBALL_API_KEY` olmalı (önceki: `VITE_API_FOOTBALL_KEY`)

---

## 📞 Özet

### ✅ Doğru Değişkenler
- `VITE_FIREBASE_*` (7 adet)
- `FIREBASE_SERVICE_ACCOUNT` (**EKSİK - Eklenmeli!**)
- `VITE_FOOTBALL_API_KEY` ✅
- `VITE_GEMINI_API_KEY` ✅
- `VITE_PYTR_*` (opsiyonel)

### ❌ Silinecek Değişkenler
- `VITE_API_FOOTBALL_KEY`
- `VITE_API_SPORTS_BASE_URL`
- `VITE_API_SPORTS_KEY`
- `VITE_SPORTSRADAR_API_BASE_URL`

### 🔑 Kritik Eksik
**FIREBASE_SERVICE_ACCOUNT** - Firebase Console'dan alınmalı!

---

**Son Güncelleme:** 13 Kasım 2025
**Status:** ⚠️ FIREBASE_SERVICE_ACCOUNT eksik, eklenmeli!
