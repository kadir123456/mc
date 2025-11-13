import admin from 'firebase-admin';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

let firebaseDb = null;

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

  if (serviceAccount.project_id) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.VITE_FIREBASE_DATABASE_URL
    });
    firebaseDb = admin.database();
    console.log('✅ Firebase Admin initialized');
  } else {
    console.log('❌ Firebase Service Account not found in environment');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  process.exit(1);
}

const FOOTBALL_API_KEY = process.env.VITE_FOOTBALL_API_KEY;

if (!FOOTBALL_API_KEY) {
  console.error('❌ Football API key not found');
  process.exit(1);
}

async function fetchAndCacheMatches() {
  try {
    console.log('🔄 Fetching matches from Football API...\n');

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`📅 Today: ${today}`);
    console.log(`📅 Tomorrow: ${tomorrow}\n`);

    const [todayData, tomorrowData] = await Promise.all([
      axios.get('https://v3.football.api-sports.io/fixtures', {
        headers: {
          'x-rapidapi-host': 'v3.football.api-sports.io',
          'x-rapidapi-key': FOOTBALL_API_KEY
        },
        params: { date: today },
        timeout: 15000
      }),
      axios.get('https://v3.football.api-sports.io/fixtures', {
        headers: {
          'x-rapidapi-host': 'v3.football.api-sports.io',
          'x-rapidapi-key': FOOTBALL_API_KEY
        },
        params: { date: tomorrow },
        timeout: 15000
      })
    ]);

    const processMatches = (fixtures, date) => {
      const matches = {};
      let count = 0;
      let skipped = 0;

      fixtures.forEach(fixture => {
        const status = fixture.fixture.status.short;
        const matchTime = new Date(fixture.fixture.date);
        const now = Date.now();

        if (status === 'FT' || status === 'AET' || status === 'PEN' || matchTime.getTime() < now - 3600000) {
          skipped++;
          return;
        }

        if (count >= 50) {
          return;
        }

        matches[fixture.fixture.id] = {
          homeTeam: fixture.teams.home.name,
          awayTeam: fixture.teams.away.name,
          league: fixture.league.name,
          date: date,
          time: matchTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          timestamp: matchTime.getTime(),
          status: status === 'LIVE' || status === '1H' || status === '2H' ? 'live' : 'scheduled',
          lastUpdated: Date.now()
        };
        count++;
      });

      console.log(`   ✓ Processed: ${count} matches`);
      console.log(`   ⏭ Skipped: ${skipped} finished/old matches`);
      return matches;
    };

    let totalSaved = 0;

    if (todayData.data?.response?.length > 0) {
      console.log(`\n📊 Today's matches (${today}):`);
      const todayMatches = processMatches(todayData.data.response, today);
      await firebaseDb.ref(`matches/${today}`).set(todayMatches);
      totalSaved += Object.keys(todayMatches).length;
      console.log(`   💾 Saved to Firebase: ${Object.keys(todayMatches).length} matches`);
    } else {
      console.log(`\n⚠️  No matches found for today (${today})`);
    }

    if (tomorrowData.data?.response?.length > 0) {
      console.log(`\n📊 Tomorrow's matches (${tomorrow}):`);
      const tomorrowMatches = processMatches(tomorrowData.data.response, tomorrow);
      await firebaseDb.ref(`matches/${tomorrow}`).set(tomorrowMatches);
      totalSaved += Object.keys(tomorrowMatches).length;
      console.log(`   💾 Saved to Firebase: ${Object.keys(tomorrowMatches).length} matches`);
    } else {
      console.log(`\n⚠️  No matches found for tomorrow (${tomorrow})`);
    }

    console.log(`\n✅ TOTAL SAVED: ${totalSaved} matches`);
    console.log('\n🎉 Match fetch completed successfully!');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Match fetch error:', error.message);
    if (error.response) {
      console.error('   API Response:', error.response.status, error.response.statusText);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

fetchAndCacheMatches();
