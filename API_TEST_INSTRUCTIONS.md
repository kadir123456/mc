# 🧪 API-FOOTBALL TEST KILAVUZU

Bu dosya API-Football entegrasyonunu test etmek için hazırlanmıştır.

---

## 🚀 HIZLI TEST

### Adım 1: Siteye Git
```
https://aikupon.com
```

### Adım 2: Console'u Aç
- **Windows/Linux**: `F12` veya `Ctrl + Shift + J`
- **Mac**: `Cmd + Option + J`

### Adım 3: Test Kodunu Yapıştır

**ÖNEMLİ**: Aşağıdaki kodu **OLDUĞU GİBİ** console'a yapıştır:

```javascript
// 🧪 API-FOOTBALL HIZLI TEST
console.clear();
console.log('🧪 TEST BAŞLIYOR...\n');

const key = '7bcf406e41beede8a40aee7405da2026';
const url = 'https://v3.football.api-sports.io';

console.log('1️⃣ API Key:', key ? '✅ VAR' : '❌ YOK');

fetch(`${url}/status`, {
  headers: {
    'x-rapidapi-host': 'v3.football.api-sports.io',
    'x-rapidapi-key': key
  }
})
.then(r => r.json())
.then(data => {
  console.log('\n2️⃣ API Status:');
  if (data.errors && Object.keys(data.errors).length > 0) {
    console.error('❌ HATA:', data.errors);
    console.error('❌ API KEY GEÇERSİZ!');
  } else {
    console.log('✅ API Çalışıyor!');
    console.log('📊 Kalan:', data.response?.requests?.current || 0, '/', data.response?.requests?.limit_day || 100);
  }

  console.log('\n3️⃣ Lig Test (Premier League):');
  return fetch(`${url}/leagues?name=Premier League&current=true`, {
    headers: { 'x-rapidapi-host': 'v3.football.api-sports.io', 'x-rapidapi-key': key }
  });
})
.then(r => r.json())
.then(data => {
  console.log(data.response?.length > 0 ? '✅ Lig bulundu' : '❌ Lig bulunamadı');

  console.log('\n4️⃣ Takım Test (Man Utd):');
  return fetch(`${url}/teams?search=Manchester United&league=39`, {
    headers: { 'x-rapidapi-host': 'v3.football.api-sports.io', 'x-rapidapi-key': key }
  });
})
.then(r => r.json())
.then(data => {
  console.log(data.response?.length > 0 ? '✅ Takım bulundu' : '❌ Takım bulunamadı');

  console.log('\n5️⃣ Maç Test:');
  return fetch(`${url}/fixtures?team=33&last=3`, {
    headers: { 'x-rapidapi-host': 'v3.football.api-sports.io', 'x-rapidapi-key': key }
  });
})
.then(r => r.json())
.then(data => {
  if (data.response?.length > 0) {
    console.log(`✅ ${data.response.length} maç bulundu:`);
    data.response.forEach((m, i) => {
      console.log(`   ${i+1}. ${m.teams.home.name} ${m.goals.home}-${m.goals.away} ${m.teams.away.name}`);
    });
  } else {
    console.log('❌ Maç bulunamadı');
  }

  console.log('\n✅ TEST TAMAMLANDI!\n');
})
.catch(err => {
  console.error('\n❌ HATA:', err.message);
  console.error('\nSEBEP:');
  console.error('- API Key yanlış');
  console.error('- Rate limit aşıldı');
  console.error('- Render.com ENV eksik');
});
```

---

## 📊 BEKLENEN ÇIKTI

### ✅ BAŞARILI:

```
🧪 TEST BAŞLIYOR...

1️⃣ API Key: ✅ VAR

2️⃣ API Status:
✅ API Çalışıyor!
📊 Kalan: 23 / 100

3️⃣ Lig Test (Premier League):
✅ Lig bulundu

4️⃣ Takım Test (Man Utd):
✅ Takım bulundu

5️⃣ Maç Test:
✅ 3 maç bulundu:
   1. Manchester United 2-1 Arsenal
   2. Liverpool 0-0 Manchester United
   3. Manchester United 3-2 Chelsea

✅ TEST TAMAMLANDI!
```

### ❌ BAŞARISIZ (API Key Geçersiz):

```
🧪 TEST BAŞLIYOR...

1️⃣ API Key: ✅ VAR

2️⃣ API Status:
❌ HATA: { token: "Invalid key" }
❌ API KEY GEÇERSİZ!

❌ HATA: Network Error
```

### ❌ BAŞARISIZ (Rate Limit):

```
🧪 TEST BAŞLIYOR...

1️⃣ API Key: ✅ VAR

2️⃣ API Status:
✅ API Çalışıyor!
📊 Kalan: 100 / 100

❌ HATA: 429 Too Many Requests
```

---

## 🔍 HATA GİDERME

### Sorun 1: "API KEY GEÇERSİZ"

**Sebep**: API key yanlış veya süresi dolmuş

**Çözüm**:
1. https://dashboard.api-football.com → API Keys
2. Yeni key oluştur
3. Render.com → Environment → `VITE_API_SPORTS_KEY` güncelle
4. Manual Deploy

---

### Sorun 2: "Rate limit aşıldı (429)"

**Sebep**: Günlük 100 istek limiti doldu

**Çözüm**:
- Yarın tekrar dene
- VEYA Pro plan al (500 istek/gün)
- Cache kullanımını artır

---

### Sorun 3: "Network Error"

**Sebep**: CORS veya internet problemi

**Çözüm**:
- Tarayıcı console'unu yenile (F5)
- VPN kapalıysa aç
- Farklı tarayıcı dene

---

### Sorun 4: "API Key yok"

**Sebep**: Render.com Environment Variables eksik

**Çözüm**:
```
Render.com Dashboard:
→ Servis seç (aikupon)
→ Environment sekmesi
→ Add Environment Variable
   Key: VITE_API_SPORTS_KEY
   Value: 7bcf406e41beede8a40aee7405da2026
→ Save
→ Manual Deploy
```

---

## 📝 DETAYLI TEST

Daha kapsamlı test için `API_TEST_CONSOLE.js` dosyasını kullan:

```javascript
// API_TEST_CONSOLE.js içeriğini kopyala-yapıştır
// 7 farklı endpoint test edilir:
// 1. Status
// 2. Leagues
// 3. Teams
// 4. Fixtures
// 5. H2H
// 6. Injuries
// 7. Standings
```

---

## 🎯 SIK KARŞILAŞILAN SORULAR

### S: Test başarılı ama site çalışmıyor?

**C**: Render.com Environment Variables'ı kontrol et:
```
VITE_API_SPORTS_KEY = 7bcf406e41beede8a40aee7405da2026
VITE_API_SPORTS_BASE_URL = https://v3.football.api-sports.io
```

### S: "Lig bulunamadı" hatası alıyorum?

**C**: Küçük ligler API'de olmayabilir. Test için:
- ✅ Premier League (İngiltere)
- ✅ La Liga (İspanya)
- ✅ Bundesliga (Almanya)
- ✅ Serie A (İtalya)
- ❌ Lüksemburg U21 (yok)
- ❌ Bermuda Ligi (yok)

### S: Cache ne işe yarıyor?

**C**: Aynı maç için tekrar API isteği atmaz:
- ✅ 24 saat cache
- ✅ Rate limit koruma
- ✅ Hız artışı

---

## 🚀 PRODUCTION TEST

Siteyi deploy ettikten sonra:

1. **Login ol**
2. **Console aç (F12)**
3. **Kupon yükle (Premier League tercih et)**
4. **Console loglarını izle**

**Başarılı loglar:**
```
🏟️ === MAÇ ANALİZİ BAŞLIYOR ===
Ev Sahibi: Manchester United
Deplasman: Liverpool

✅ Lig bulundu (cache): Premier League → ID: 39
🌐 API-Football Request: /teams { search: 'Manchester United', league: 39 }
✅ Takım bulundu: Manchester United (ID: 33)
🌐 API-Football Request: /teams { search: 'Liverpool', league: 39 }
✅ Takım bulundu: Liverpool (ID: 34)
🌐 API-Football Request: /fixtures { team: 33, last: 5 }
✅ Form verisi alındı
🌐 API-Football Request: /fixtures/headtohead { h2h: '33-34', last: 5 }
✅ H2H verisi alındı

✅ === ANALİZ TAMAMLANDI ===
Güven Skoru: 90%
Veri Kaynakları: API-Football
```

**Başarısız loglar:**
```
🏟️ === MAÇ ANALİZİ BAŞLIYOR ===
Ev Sahibi: Lüksemburg U21
Deplasman: İzlanda U21

❌ Lig bulunamadı: U21 Avrupa Elemeleri
❌ Maç verisi alınamadı: Lüksemburg U21 vs İzlanda U21

⚠️ 1 maç atlandı: Lüksemburg U21 vs İzlanda U21
✅ 2 maç için veri alındı, analiz devam ediyor...
```

---

## 📞 DESTEK

Hala sorun mu yaşıyorsun?

1. **Console screenshot al** (F12 açık, tüm loglar görünsün)
2. **Hata mesajını kopyala**
3. **Bana gönder**

Özellikle şunları görmem lazım:
- ✅ "API-Football Request" logları var mı?
- ✅ "API Response" logları var mı?
- ❌ Hangi adımda hata oluyor?
- ❌ Hata kodu nedir? (401, 429, 500, vb.)

---

**Hazırlayan**: AI Assistant
**Tarih**: 13 Kasım 2025
**Versiyon**: 1.0
