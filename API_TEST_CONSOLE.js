// 🧪 API-FOOTBALL TEST KODU
// Browser Console (F12) açıp bu kodu yapıştır

console.clear();
console.log('🧪 ============================================');
console.log('🧪 API-FOOTBALL TEST BAŞLIYOR...');
console.log('🧪 ============================================\n');

// Test 1: Environment Variables
console.log('📋 TEST 1: Environment Variables Kontrolü');
console.log('─────────────────────────────────────────────');

const apiKey = import.meta.env.VITE_API_SPORTS_KEY || import.meta.env.VITE_API_FOOTBALL_KEY;
const baseUrl = import.meta.env.VITE_API_SPORTS_BASE_URL || 'https://v3.football.api-sports.io';

console.log('🔑 API Key:', apiKey ? `✅ VAR (${apiKey.substring(0, 10)}...)` : '❌ YOK');
console.log('🌐 Base URL:', baseUrl);

if (!apiKey) {
  console.error('❌ API KEY BULUNAMADI!');
  console.error('Render.com Environment Variables\'a ekle:');
  console.error('VITE_API_SPORTS_KEY = your_api_key');
  throw new Error('API key bulunamadı!');
}

console.log('\n');

// Test 2: API Status
console.log('📋 TEST 2: API Status Kontrolü');
console.log('─────────────────────────────────────────────');

(async () => {
  try {
    const statusResponse = await fetch(`${baseUrl}/status`, {
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': apiKey,
      },
    });

    const statusData = await statusResponse.json();

    if (statusResponse.ok) {
      console.log('✅ API Status:', statusResponse.status);
      console.log('📊 Account Info:', statusData.response);
      console.log('   - Plan:', statusData.response?.subscription?.plan || 'N/A');
      console.log('   - Kalan İstek:', statusData.response?.requests?.current || 0, '/', statusData.response?.requests?.limit_day || 0);
    } else {
      console.error('❌ API Status Hatası:', statusResponse.status);
      console.error('Hata:', statusData);
    }
  } catch (error) {
    console.error('❌ API Status Kontrolü Başarısız:', error.message);
  }

  console.log('\n');

  // Test 3: Leagues Endpoint
  console.log('📋 TEST 3: Leagues Endpoint Testi (Premier League)');
  console.log('─────────────────────────────────────────────');

  try {
    const leaguesResponse = await fetch(`${baseUrl}/leagues?name=Premier League&current=true`, {
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': apiKey,
      },
    });

    const leaguesData = await leaguesResponse.json();

    if (leaguesResponse.ok && leaguesData.response?.length > 0) {
      console.log('✅ Lig bulundu:', leaguesData.response[0].league.name);
      console.log('   - Lig ID:', leaguesData.response[0].league.id);
      console.log('   - Ülke:', leaguesData.response[0].country.name);
      console.log('   - Sezon:', leaguesData.response[0].seasons[0]?.year);
    } else {
      console.error('❌ Lig bulunamadı');
      console.error('Response:', leaguesData);
    }
  } catch (error) {
    console.error('❌ Leagues Endpoint Hatası:', error.message);
  }

  console.log('\n');

  // Test 4: Teams Endpoint
  console.log('📋 TEST 4: Teams Endpoint Testi (Manchester United)');
  console.log('─────────────────────────────────────────────');

  try {
    const teamsResponse = await fetch(`${baseUrl}/teams?search=Manchester United&league=39`, {
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': apiKey,
      },
    });

    const teamsData = await teamsResponse.json();

    if (teamsResponse.ok && teamsData.response?.length > 0) {
      const team = teamsData.response[0].team;
      console.log('✅ Takım bulundu:', team.name);
      console.log('   - Takım ID:', team.id);
      console.log('   - Ülke:', teamsData.response[0].venue?.city || 'N/A');
      console.log('   - Logo:', team.logo);
    } else {
      console.error('❌ Takım bulunamadı');
      console.error('Response:', teamsData);
    }
  } catch (error) {
    console.error('❌ Teams Endpoint Hatası:', error.message);
  }

  console.log('\n');

  // Test 5: Fixtures Endpoint (Manchester United vs Liverpool)
  console.log('📋 TEST 5: Fixtures Endpoint Testi (Manchester United maçları)');
  console.log('─────────────────────────────────────────────');

  try {
    const fixturesResponse = await fetch(`${baseUrl}/fixtures?team=33&last=5`, {
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': apiKey,
      },
    });

    const fixturesData = await fixturesResponse.json();

    if (fixturesResponse.ok && fixturesData.response?.length > 0) {
      console.log(`✅ ${fixturesData.response.length} maç bulundu:`);
      fixturesData.response.slice(0, 3).forEach((match, i) => {
        console.log(`   ${i + 1}. ${match.teams.home.name} ${match.goals.home} - ${match.goals.away} ${match.teams.away.name}`);
      });
    } else {
      console.error('❌ Maç bulunamadı');
      console.error('Response:', fixturesData);
    }
  } catch (error) {
    console.error('❌ Fixtures Endpoint Hatası:', error.message);
  }

  console.log('\n');

  // Test 6: H2H Endpoint
  console.log('📋 TEST 6: H2H Endpoint Testi (Man Utd vs Liverpool)');
  console.log('─────────────────────────────────────────────');

  try {
    const h2hResponse = await fetch(`${baseUrl}/fixtures/headtohead?h2h=33-34&last=5`, {
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': apiKey,
      },
    });

    const h2hData = await h2hResponse.json();

    if (h2hResponse.ok && h2hData.response?.length > 0) {
      console.log(`✅ ${h2hData.response.length} H2H maçı bulundu:`);
      h2hData.response.slice(0, 3).forEach((match, i) => {
        console.log(`   ${i + 1}. ${match.teams.home.name} ${match.goals.home} - ${match.goals.away} ${match.teams.away.name}`);
      });
    } else {
      console.error('❌ H2H verisi bulunamadı');
      console.error('Response:', h2hData);
    }
  } catch (error) {
    console.error('❌ H2H Endpoint Hatası:', error.message);
  }

  console.log('\n');

  // Test 7: Injuries Endpoint
  console.log('📋 TEST 7: Injuries Endpoint Testi (Man Utd sakatlıkları)');
  console.log('─────────────────────────────────────────────');

  try {
    const injuriesResponse = await fetch(`${baseUrl}/injuries?team=33&league=39`, {
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': apiKey,
      },
    });

    const injuriesData = await injuriesResponse.json();

    if (injuriesResponse.ok) {
      if (injuriesData.response?.length > 0) {
        console.log(`✅ ${injuriesData.response.length} sakatlık bulundu:`);
        injuriesData.response.slice(0, 3).forEach((injury, i) => {
          console.log(`   ${i + 1}. ${injury.player.name} - ${injury.player.reason}`);
        });
      } else {
        console.log('✅ Sakatlık yok (iyi haber!)');
      }
    } else {
      console.error('❌ Injuries verisi alınamadı');
      console.error('Response:', injuriesData);
    }
  } catch (error) {
    console.error('❌ Injuries Endpoint Hatası:', error.message);
  }

  console.log('\n');
  console.log('🧪 ============================================');
  console.log('🧪 TEST TAMAMLANDI!');
  console.log('🧪 ============================================');
})();
