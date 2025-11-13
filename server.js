import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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
    console.log('⚠️  Firebase Admin not configured (optional)');
  }
} catch (error) {
  console.log('⚠️  Firebase Admin initialization skipped:', error.message);
}

// CORS ayarları
app.use(cors());
app.use(express.json());

// API credentials
const SPORTSRADAR_API_KEY = process.env.VITE_SPORTSRADAR_API_KEY;
const SPORTSRADAR_API_BASE = process.env.VITE_SPORTSRADAR_API_BASE_URL || 'https://api.sportradar.com';
const FOOTBALL_API_KEY = process.env.VITE_FOOTBALL_API_KEY;

let lastMatchFetch = 0;
const FETCH_INTERVAL = 24 * 60 * 60 * 1000;

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    sportsradarConfigured: !!SPORTSRADAR_API_KEY
  });
});

// Sportsradar Proxy Endpoint
app.get('/api/sportsradar-proxy', async (req, res) => {
  try {
    const { endpoint } = req.query;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint parametresi gerekli' });
    }

    if (!SPORTSRADAR_API_KEY) {
      return res.status(500).json({ error: 'Sportsradar API key yapılandırılmamış' });
    }

    const url = `${SPORTSRADAR_API_BASE}/soccer/trial/v4/en${endpoint}`;
    console.log('🌐 Proxy Request:', url);

    const response = await axios.get(url, {
      params: { api_key: SPORTSRADAR_API_KEY },
      timeout: 30000,
      headers: {
        'Accept': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Proxy hatası:', error.response?.data || error.message);
    
    const status = error.response?.status || 500;
    const errorData = error.response?.data || { message: error.message };
    
    res.status(status).json({
      error: 'API hatası',
      details: errorData,
      endpoint: req.query.endpoint
    });
  }
});

// Static files (React build)
app.use(express.static(join(__dirname, 'dist')));

// React routing (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

async function fetchAndCacheMatches() {
  if (!firebaseDb || !FOOTBALL_API_KEY) {
    console.log('⚠️  Match fetching disabled (Firebase or API key missing)');
    return;
  }

  try {
    console.log('🔄 Fetching today and tomorrow matches...');

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

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
      fixtures.forEach(fixture => {
        const matchTime = new Date(fixture.fixture.date);
        matches[fixture.fixture.id] = {
          homeTeam: fixture.teams.home.name,
          awayTeam: fixture.teams.away.name,
          league: fixture.league.name,
          date: date,
          time: matchTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          timestamp: matchTime.getTime(),
          status: fixture.fixture.status.short === 'FT' ? 'finished' :
                  fixture.fixture.status.short === 'LIVE' ? 'live' : 'scheduled',
          lastUpdated: Date.now()
        };
      });
      return matches;
    };

    if (todayData.data?.response?.length > 0) {
      const todayMatches = processMatches(todayData.data.response, today);
      await firebaseDb.ref(`matches/${today}`).set(todayMatches);
      console.log(`✅ Saved ${Object.keys(todayMatches).length} matches for ${today}`);
    }

    if (tomorrowData.data?.response?.length > 0) {
      const tomorrowMatches = processMatches(tomorrowData.data.response, tomorrow);
      await firebaseDb.ref(`matches/${tomorrow}`).set(tomorrowMatches);
      console.log(`✅ Saved ${Object.keys(tomorrowMatches).length} matches for ${tomorrow}`);
    }

    await cleanFinishedMatches();
    lastMatchFetch = Date.now();

  } catch (error) {
    console.error('❌ Match fetch error:', error.message);
  }
}

async function cleanFinishedMatches() {
  if (!firebaseDb) return;

  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await firebaseDb.ref(`matches/${yesterday}`).remove();
    console.log(`🧹 Cleaned up matches from ${yesterday}`);
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
  }
}

app.get('/api/trigger-match-fetch', async (req, res) => {
  if (Date.now() - lastMatchFetch < 3600000) {
    return res.json({
      message: 'Match data is fresh',
      lastFetch: new Date(lastMatchFetch).toISOString(),
      nextFetch: new Date(lastMatchFetch + FETCH_INTERVAL).toISOString()
    });
  }

  await fetchAndCacheMatches();
  res.json({ message: 'Match fetch triggered', timestamp: Date.now() });
});

setInterval(fetchAndCacheMatches, FETCH_INTERVAL);

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Sportsradar API: ${SPORTSRADAR_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
  console.log(`⚽ Football API: ${FOOTBALL_API_KEY ? 'Configured ✅' : 'Missing ❌'}`);
  console.log(`🔥 Firebase: ${firebaseDb ? 'Connected ✅' : 'Disabled ❌'}`);

  if (firebaseDb && FOOTBALL_API_KEY) {
    console.log('🔄 Starting initial match fetch...');
    await fetchAndCacheMatches();
  }
});