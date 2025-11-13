// 🧪 API-FOOTBALL HIZLI TEST (CONSOLE'A YAPIŞTIR)
// Siteye git → F12 → Console → Yapıştır + Enter

console.clear();
console.log('🧪 API-FOOTBALL TEST BAŞLIYOR...\n');

// ADIM 1: API KEY KONTROLÜ
console.log('1️⃣ API Key Kontrolü:');
const key = '7bcf406e41beede8a40aee7405da2026';
const url = 'https://v3.football.api-sports.io';
console.log(key ? '   ✅ API Key var' : '   ❌ API Key yok');
console.log('');

// ADIM 2: API STATUS TEST
console.log('2️⃣ API Status Test:');
fetch(`${url}/status`, {
  headers: {
    'x-rapidapi-host': 'v3.football.api-sports.io',
    'x-rapidapi-key': key
  }
})
.then(r => r.json())
.then(data => {
  if (data.errors && Object.keys(data.errors).length > 0) {
    console.error('   ❌ HATA:', data.errors);
    console.error('   ❌ API KEY GEÇERSİZ VEYA SÜRESİ DOLMUŞ!');
  } else {
    console.log('   ✅ API Çalışıyor!');
    console.log('   📊 Kalan istek:', data.response?.requests?.current || 0, '/', data.response?.requests?.limit_day || 100);
    console.log('   📊 Plan:', data.response?.subscription?.plan || 'Free');
  }
  console.log('');

  // ADIM 3: LİG ARAMA TEST
  console.log('3️⃣ Lig Arama Test (Premier League):');
  return fetch(`${url}/leagues?name=Premier League&current=true`, {
    headers: {
      'x-rapidapi-host': 'v3.football.api-sports.io',
      'x-rapidapi-key': key
    }
  });
})
.then(r => r.json())
.then(data => {
  if (data.response?.length > 0) {
    console.log('   ✅ Lig bulundu:', data.response[0].league.name);
    console.log('   📊 Lig ID:', data.response[0].league.id);
  } else {
    console.log('   ❌ Lig bulunamadı');
  }
  console.log('');

  // ADIM 4: TAKIM ARAMA TEST
  console.log('4️⃣ Takım Arama Test (Manchester United):');
  return fetch(`${url}/teams?search=Manchester United&league=39`, {
    headers: {
      'x-rapidapi-host': 'v3.football.api-sports.io',
      'x-rapidapi-key': key
    }
  });
})
.then(r => r.json())
.then(data => {
  if (data.response?.length > 0) {
    console.log('   ✅ Takım bulundu:', data.response[0].team.name);
    console.log('   📊 Takım ID:', data.response[0].team.id);
  } else {
    console.log('   ❌ Takım bulunamadı');
  }
  console.log('');

  // ADIM 5: MAÇ VERİSİ TEST
  console.log('5️⃣ Maç Verisi Test (Man Utd son 5 maç):');
  return fetch(`${url}/fixtures?team=33&last=5`, {
    headers: {
      'x-rapidapi-host': 'v3.football.api-sports.io',
      'x-rapidapi-key': key
    }
  });
})
.then(r => r.json())
.then(data => {
  if (data.response?.length > 0) {
    console.log(`   ✅ ${data.response.length} maç bulundu:`);
    data.response.slice(0, 3).forEach((m, i) => {
      console.log(`      ${i+1}. ${m.teams.home.name} ${m.goals.home}-${m.goals.away} ${m.teams.away.name}`);
    });
  } else {
    console.log('   ❌ Maç bulunamadı');
  }
  console.log('');

  // ADIM 6: H2H TEST
  console.log('6️⃣ H2H Test (Man Utd vs Liverpool):');
  return fetch(`${url}/fixtures/headtohead?h2h=33-34&last=5`, {
    headers: {
      'x-rapidapi-host': 'v3.football.api-sports.io',
      'x-rapidapi-key': key
    }
  });
})
.then(r => r.json())
.then(data => {
  if (data.response?.length > 0) {
    console.log(`   ✅ ${data.response.length} H2H maçı bulundu:`);
    data.response.slice(0, 3).forEach((m, i) => {
      console.log(`      ${i+1}. ${m.teams.home.name} ${m.goals.home}-${m.goals.away} ${m.teams.away.name}`);
    });
  } else {
    console.log('   ❌ H2H bulunamadı');
  }
  console.log('');
  console.log('✅ TEST TAMAMLANDI!');
  console.log('');
  console.log('📌 SONUÇ:');
  console.log('   Tüm testler başarılıysa → API çalışıyor ✅');
  console.log('   Hata varsa → Render.com Environment Variables kontrol et');
})
.catch(err => {
  console.error('');
  console.error('❌ HATA:', err.message);
  console.error('');
  console.error('OLASI SEBEPLER:');
  console.error('1. API Key yanlış veya süresi dolmuş');
  console.error('2. Render.com Environment Variables eksik');
  console.error('3. Rate limit aşıldı (100 istek/gün)');
  console.error('4. Internet bağlantı sorunu');
});
