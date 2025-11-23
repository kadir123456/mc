// server.js - DÜZELTİLMİŞ VERSİYON (DOĞRU MAÇ EŞLEŞTİRME + GERÇEK İSTATİSTİKLER)
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const admin = require('firebase-admin');
require('dotenv').config();

// ==================== FIREBASE ADMIN INIT ====================
let firebaseInitialized = false;
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.VITE_FIREBASE_DATABASE_URL
  });
  
  firebaseInitialized = true;
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed:', error.message);
}

const app = express();
const PORT = process.env.PORT || 3001;

// ==================== CORS AYARLARI ====================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==================== BODY PARSER ====================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ==================== GELİŞMİŞ EŞLEŞTİRME FONKSİYONLARI ====================

/**
 * ✅ Yaygın takım kısaltmaları ve alternatifleri
 */
const TEAM_ALIASES = {
  // Türk Takımları
  'galatasaray': ['galatasaray', 'galatasaray sk', 'gala', 'gs', 'g.saray', 'cim bom'],
  'fenerbahce': ['fenerbahce', 'fenerbahçe', 'fener', 'fb', 'f.bahce', 'f.bahçe'],
  'besiktas': ['besiktas', 'beşiktaş', 'bjk', 'kartal'],
  'trabzonspor': ['trabzonspor', 'trabzon', 'ts'],
  'basaksehir': ['basaksehir', 'başakşehir', 'istanbul basaksehir', 'ibfk'],
  'antalyaspor': ['antalyaspor', 'antalya'],
  'konyaspor': ['konyaspor', 'konya'],
  'sivasspor': ['sivasspor', 'sivas'],
  'alanyaspor': ['alanyaspor', 'alanya'],
  'kasimpasa': ['kasimpasa', 'kasımpaşa'],
  'kayserispor': ['kayserispor', 'kayseri'],
  'rizespor': ['rizespor', 'rize', 'caykur rizespor'],
  'gaziantep': ['gaziantep', 'gaziantep fk'],
  'hatayspor': ['hatayspor', 'hatay'],
  'samsunspor': ['samsunspor', 'samsun'],
  'pendikspor': ['pendikspor', 'pendik'],
  'bodrumspor': ['bodrumspor', 'bodrum'],
  'eyupspor': ['eyupspor', 'eyüpspor', 'eyup', 'eyüp'],
  'goztepe': ['goztepe', 'göztepe'],
  
  // İngiliz Takımları
  'manchester city': ['manchester city', 'man city', 'm. city', 'mc', 'city'],
  'manchester united': ['manchester united', 'man united', 'man utd', 'm. united', 'mu', 'united'],
  'liverpool': ['liverpool', 'liv', 'lfc'],
  'chelsea': ['chelsea', 'che', 'cfc'],
  'arsenal': ['arsenal', 'ars', 'afc', 'gunners'],
  'tottenham': ['tottenham', 'tottenham hotspur', 'spurs', 'tot'],
  'newcastle': ['newcastle', 'newcastle united', 'nufc'],
  'aston villa': ['aston villa', 'villa', 'avfc'],
  'west ham': ['west ham', 'west ham united', 'whu', 'hammers'],
  'brighton': ['brighton', 'brighton hove albion', 'bha'],
  'wolves': ['wolves', 'wolverhampton', 'wolverhampton wanderers'],
  'everton': ['everton', 'eve', 'efc', 'toffees'],
  'crystal palace': ['crystal palace', 'palace', 'cpfc'],
  'fulham': ['fulham', 'ful', 'ffc'],
  'brentford': ['brentford', 'bre', 'bees'],
  'nottingham forest': ['nottingham forest', 'nottm forest', 'forest', 'nffc'],
  'bournemouth': ['bournemouth', 'afc bournemouth', 'bou'],
  'leicester': ['leicester', 'leicester city', 'lei', 'lcfc'],
  'leeds': ['leeds', 'leeds united', 'lufc'],
  'southampton': ['southampton', 'saints', 'sou'],
  'ipswich': ['ipswich', 'ipswich town'],
  
  // İspanyol Takımları
  'real madrid': ['real madrid', 'r. madrid', 'r madrid', 'madrid', 'rma', 'real'],
  'barcelona': ['barcelona', 'barca', 'barça', 'fcb', 'blaugrana'],
  'atletico madrid': ['atletico madrid', 'atletico', 'atl. madrid', 'atl madrid', 'atleti'],
  'sevilla': ['sevilla', 'sev', 'sfc'],
  'real sociedad': ['real sociedad', 'sociedad', 'rso'],
  'real betis': ['real betis', 'betis', 'rbb'],
  'villarreal': ['villarreal', 'vil', 'yellow submarine'],
  'athletic bilbao': ['athletic bilbao', 'athletic', 'bilbao', 'ath bilbao'],
  'valencia': ['valencia', 'val', 'vcf'],
  'getafe': ['getafe', 'get'],
  'osasuna': ['osasuna', 'osa', 'ca osasuna'],
  'celta vigo': ['celta vigo', 'celta', 'rc celta'],
  'mallorca': ['mallorca', 'rcd mallorca'],
  'girona': ['girona', 'girona fc'],
  'las palmas': ['las palmas', 'ud las palmas'],
  'alaves': ['alaves', 'deportivo alaves'],
  'rayo vallecano': ['rayo vallecano', 'rayo'],
  'espanyol': ['espanyol', 'rcd espanyol'],
  'leganes': ['leganes', 'cd leganes'],
  'valladolid': ['valladolid', 'real valladolid'],
  
  // Alman Takımları
  'bayern munich': ['bayern munich', 'bayern', 'b. münih', 'b. munich', 'bayern munchen', 'fcb', 'bavaria'],
  'borussia dortmund': ['borussia dortmund', 'dortmund', 'bvb'],
  'rb leipzig': ['rb leipzig', 'leipzig', 'rbl'],
  'bayer leverkusen': ['bayer leverkusen', 'leverkusen', 'b. leverkusen', 'b04'],
  'eintracht frankfurt': ['eintracht frankfurt', 'frankfurt', 'sge', 'eintracht'],
  'wolfsburg': ['wolfsburg', 'vfl wolfsburg', 'wob'],
  'freiburg': ['freiburg', 'sc freiburg', 'scf'],
  'union berlin': ['union berlin', 'union', '1. fc union berlin'],
  'hoffenheim': ['hoffenheim', 'tsg hoffenheim', 'tsg'],
  'werder bremen': ['werder bremen', 'bremen', 'werder', 'svw'],
  'mainz': ['mainz', 'mainz 05', '1. fsv mainz 05'],
  'augsburg': ['augsburg', 'fc augsburg', 'fca'],
  'borussia monchengladbach': ['borussia monchengladbach', 'gladbach', 'bmg', 'm\'gladbach', 'monchengladbach'],
  'vfb stuttgart': ['vfb stuttgart', 'stuttgart', 'vfb'],
  'koln': ['koln', 'köln', '1. fc koln', '1. fc köln', 'cologne'],
  'heidenheim': ['heidenheim', '1. fc heidenheim'],
  'darmstadt': ['darmstadt', 'sv darmstadt 98'],
  'bochum': ['bochum', 'vfl bochum'],
  'st pauli': ['st pauli', 'st. pauli', 'fc st. pauli'],
  'holstein kiel': ['holstein kiel', 'kiel'],
  
  // İtalyan Takımları
  'inter milan': ['inter milan', 'inter', 'inter m.', 'internazionale'],
  'ac milan': ['ac milan', 'milan', 'acm', 'rossoneri'],
  'juventus': ['juventus', 'juve', 'jfc', 'old lady'],
  'napoli': ['napoli', 'ssc napoli', 'nap'],
  'as roma': ['as roma', 'roma', 'rom', 'giallorossi'],
  'lazio': ['lazio', 'ss lazio', 'laz'],
  'atalanta': ['atalanta', 'atalanta bc', 'ata'],
  'fiorentina': ['fiorentina', 'acf fiorentina', 'fio', 'viola'],
  'bologna': ['bologna', 'bologna fc', 'bol'],
  'torino': ['torino', 'torino fc', 'tor', 'toro'],
  'monza': ['monza', 'ac monza'],
  'genoa': ['genoa', 'genoa cfc', 'gen'],
  'udinese': ['udinese', 'udinese calcio', 'udi'],
  'cagliari': ['cagliari', 'cagliari calcio', 'cag'],
  'empoli': ['empoli', 'empoli fc', 'emp'],
  'verona': ['verona', 'hellas verona', 'hel'],
  'sassuolo': ['sassuolo', 'us sassuolo', 'sas'],
  'lecce': ['lecce', 'us lecce', 'lec'],
  'frosinone': ['frosinone', 'frosinone calcio', 'fro'],
  'salernitana': ['salernitana', 'us salernitana', 'sal'],
  'parma': ['parma', 'parma calcio'],
  'como': ['como', 'como 1907'],
  'venezia': ['venezia', 'venezia fc'],
  
  // Fransız Takımları
  'paris saint germain': ['paris saint germain', 'psg', 'paris', 'paris sg'],
  'marseille': ['marseille', 'olympique marseille', 'om'],
  'lyon': ['lyon', 'olympique lyon', 'ol', 'olympique lyonnais'],
  'monaco': ['monaco', 'as monaco', 'asm'],
  'lille': ['lille', 'losc lille', 'losc'],
  'nice': ['nice', 'ogc nice', 'ogcn'],
  'lens': ['lens', 'rc lens', 'rcl'],
  'rennes': ['rennes', 'stade rennais', 'srfc'],
  'strasbourg': ['strasbourg', 'rc strasbourg', 'rcsa'],
  'nantes': ['nantes', 'fc nantes', 'fcn'],
  'toulouse': ['toulouse', 'toulouse fc', 'tfc'],
  'montpellier': ['montpellier', 'montpellier hsc', 'mhsc'],
  'brest': ['brest', 'stade brestois', 'sb29'],
  'reims': ['reims', 'stade de reims', 'sdr'],
  'le havre': ['le havre', 'le havre ac', 'hac'],
  'clermont': ['clermont', 'clermont foot'],
  'metz': ['metz', 'fc metz'],
  'lorient': ['lorient', 'fc lorient'],
  
  // Portekiz Takımları
  'benfica': ['benfica', 'sl benfica', 'slb'],
  'fc porto': ['fc porto', 'porto', 'fcp'],
  'sporting': ['sporting', 'sporting cp', 'sporting lisbon', 'scp'],
  'braga': ['braga', 'sc braga', 'scb'],
  'guimaraes': ['guimaraes', 'vitoria guimaraes', 'vsc'],
  
  // Hollanda Takımları
  'ajax': ['ajax', 'afc ajax', 'ajax amsterdam'],
  'psv': ['psv', 'psv eindhoven'],
  'feyenoord': ['feyenoord', 'feyenoord rotterdam'],
  'az alkmaar': ['az alkmaar', 'az', 'alkmaar'],
  'twente': ['twente', 'fc twente'],
  
  // Diğer Önemli Takımlar
  'celtic': ['celtic', 'celtic fc', 'glasgow celtic'],
  'rangers': ['rangers', 'rangers fc', 'glasgow rangers'],
  'red bull salzburg': ['red bull salzburg', 'salzburg', 'rb salzburg'],
  'sturm graz': ['sturm graz', 'sk sturm graz'],
  'shakhtar donetsk': ['shakhtar donetsk', 'shakhtar', 'shaktar'],
  'dynamo kyiv': ['dynamo kyiv', 'dynamo kiev', 'dinamo kiev'],
  'spartak moscow': ['spartak moscow', 'spartak'],
  'zenit': ['zenit', 'zenit st petersburg'],
  'cska moscow': ['cska moscow', 'cska'],
  'olympiacos': ['olympiacos', 'olympiakos'],
  'panathinaikos': ['panathinaikos', 'pao'],
  'aek athens': ['aek athens', 'aek'],
  'paok': ['paok', 'paok thessaloniki'],
  'club brugge': ['club brugge', 'brugge', 'club bruges'],
  'anderlecht': ['anderlecht', 'rsc anderlecht'],
  'copenhagen': ['copenhagen', 'fc copenhagen', 'kobenhavn'],
  'malmo': ['malmo', 'malmö', 'malmo ff'],
  'young boys': ['young boys', 'bsc young boys'],
  'basel': ['basel', 'fc basel'],
  'slavia prague': ['slavia prague', 'slavia praha'],
  'sparta prague': ['sparta prague', 'sparta praha'],
  'viktoria plzen': ['viktoria plzen', 'plzen'],
  'legia warsaw': ['legia warsaw', 'legia warszawa'],
  'dinamo zagreb': ['dinamo zagreb', 'gnk dinamo zagreb'],
  'hajduk split': ['hajduk split', 'hajduk'],
  'red star belgrade': ['red star belgrade', 'crvena zvezda'],
  'partizan': ['partizan', 'partizan belgrade'],
  'steaua bucuresti': ['steaua bucuresti', 'fcsb', 'steaua'],
  'cfr cluj': ['cfr cluj', 'cluj'],
};

/**
 * ✅ Takım ismi normalize et + alias kontrolü
 */
function normalizeTeamName(name) {
  let normalized = name
    .toLowerCase()
    .trim()
    // Türkçe karakterleri dönüştür
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c')
    // Yaygın ön/son ekleri kaldır
    .replace(/^fc\s+/i, '')
    .replace(/\s+fc$/i, '')
    .replace(/^cf\s+/i, '')
    .replace(/\s+cf$/i, '')
    .replace(/^sc\s+/i, '')
    .replace(/\s+sc$/i, '')
    .replace(/^ac\s+/i, '')
    .replace(/\s+ac$/i, '')
    .replace(/^as\s+/i, '')
    .replace(/\s+as$/i, '')
    .replace(/^ssc\s+/i, '')
    .replace(/\s+ssc$/i, '')
    .replace(/^sk\s+/i, '')
    .replace(/\s+sk$/i, '')
    // Yaş kategorileri normalize et
    .replace(/\s+u-?21$/i, ' u21')
    .replace(/\s+u-?19$/i, ' u19')
    .replace(/\s+u-?20$/i, ' u20')
    .replace(/\s+u-?23$/i, ' u23')
    // Özel karakterleri temizle
    .replace(/[.,\-_'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return normalized;
}

/**
 * ✅ Alias eşleşmesi kontrol et
 */
function findTeamByAlias(teamName) {
  const normalized = normalizeTeamName(teamName);
  
  for (const [canonical, aliases] of Object.entries(TEAM_ALIASES)) {
    for (const alias of aliases) {
      const normalizedAlias = normalizeTeamName(alias);
      if (normalized === normalizedAlias || 
          normalized.includes(normalizedAlias) || 
          normalizedAlias.includes(normalized)) {
        return canonical;
      }
    }
  }
  return null;
}

/**
 * ✅ İki string arasındaki benzerlik skoru (0-100)
 */
function calculateSimilarity(str1, str2) {
  const s1 = normalizeTeamName(str1);
  const s2 = normalizeTeamName(str2);
  
  // Tam eşleşme
  if (s1 === s2) return 100;
  
  // Alias kontrolü
  const alias1 = findTeamByAlias(str1);
  const alias2 = findTeamByAlias(str2);
  
  if (alias1 && alias2 && alias1 === alias2) return 95;
  if (alias1 && normalizeTeamName(alias1) === s2) return 95;
  if (alias2 && normalizeTeamName(alias2) === s1) return 95;
  
  // Biri diğerini tam içeriyor
  if (s1.includes(s2)) {
    return Math.round((s2.length / s1.length) * 90);
  }
  if (s2.includes(s1)) {
    return Math.round((s1.length / s2.length) * 90);
  }
  
  // Kelime bazlı eşleşme
  const words1 = s1.split(/\s+/).filter(w => w.length > 2);
  const words2 = s2.split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  let matchedWords = 0;
  
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2) {
        matchedWords++;
        break;
      } else if (w1.includes(w2) || w2.includes(w1)) {
        matchedWords += 0.7;
        break;
      } else if (w1.length > 3 && w2.length > 3 && w1.substring(0, 3) === w2.substring(0, 3)) {
        matchedWords += 0.5;
        break;
      }
    }
  }
  
  const maxWords = Math.max(words1.length, words2.length);
  return Math.round((matchedWords / maxWords) * 85);
}

/**
 * ✅ YENİ: En iyi maç eşleşmesini bul
 * Her iki takım da minimum %60 benzerlik sağlamalı
 */
function findBestMatch(extractedHome, extractedAway, fixtures) {
  const MIN_SIMILARITY = 55; // Minimum benzerlik skoru
  let bestMatch = null;
  let bestScore = 0;
  
  console.log(`🔍 Eşleşme aranıyor: "${extractedHome}" vs "${extractedAway}"`);
  
  for (const fixture of fixtures) {
    const apiHome = fixture.teams.home.name;
    const apiAway = fixture.teams.away.name;
    
    const homeScore = calculateSimilarity(extractedHome, apiHome);
    const awayScore = calculateSimilarity(extractedAway, apiAway);
    
    // Her iki takım da minimum skoru geçmeli
    if (homeScore >= MIN_SIMILARITY && awayScore >= MIN_SIMILARITY) {
      const totalScore = (homeScore + awayScore) / 2;
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMatch = {
          fixture,
          score: totalScore,
          homeScore,
          awayScore
        };
      }
    }
  }
  
  if (bestMatch) {
    console.log(`   ✅ Eşleşti: ${bestMatch.fixture.teams.home.name} vs ${bestMatch.fixture.teams.away.name} (Skor: ${bestMatch.score.toFixed(0)}%)`);
  } else {
    console.log(`   ❌ Eşleşme bulunamadı`);
  }
  
  return bestMatch;
}

// ==================== KREDİ FONKSİYONLARI ====================

async function deductCreditsFromUser(userId, credits, analysisType) {
  if (!firebaseInitialized) throw new Error('Firebase not initialized');
  
  const db = admin.database();
  const userRef = db.ref(`users/${userId}`);
  
  const snapshot = await userRef.once('value');
  const userData = snapshot.val();
  
  if (!userData) throw new Error('Kullanıcı bulunamadı');
  
  const currentCredits = userData.credits || 0;
  
  if (currentCredits < credits) {
    throw new Error(`Yetersiz kredi. Mevcut: ${currentCredits}, Gerekli: ${credits}`);
  }
  
  await userRef.transaction((user) => {
    if (user && user.credits >= credits) {
      user.credits = user.credits - credits;
      return user;
    }
    return user;
  });
  
  const transactionRef = db.ref(`users/${userId}/transactions`).push();
  await transactionRef.set({
    type: 'analysis',
    credits: -credits,
    analysisType: analysisType,
    status: 'completed',
    createdAt: Date.now(),
    timestamp: new Date().toISOString()
  });
  
  console.log(`💳 ${credits} kredi düşüldü: ${userId}`);
  return currentCredits - credits;
}

async function refundCreditsToUser(userId, credits, reason) {
  if (!firebaseInitialized) throw new Error('Firebase not initialized');
  
  const db = admin.database();
  const userRef = db.ref(`users/${userId}`);
  
  await userRef.transaction((user) => {
    if (user) {
      user.credits = (user.credits || 0) + credits;
      return user;
    }
    return user;
  });
  
  const transactionRef = db.ref(`users/${userId}/transactions`).push();
  await transactionRef.set({
    type: 'refund',
    credits: credits,
    reason: reason,
    status: 'completed',
    createdAt: Date.now(),
    timestamp: new Date().toISOString()
  });
  
  console.log(`💰 ${credits} kredi iade edildi: ${userId} - ${reason}`);
}

function parseGeminiJSON(text) {
  if (!text) throw new Error('Boş yanıt');
  
  let cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON bulunamadı');
  
  return JSON.parse(jsonMatch[0]);
}

async function findUserByEmail(email) {
  if (!firebaseInitialized) throw new Error('Firebase not initialized');
  
  const db = admin.database();
  const usersRef = db.ref('users');
  const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
  
  if (!snapshot.exists()) return null;
  
  const userData = snapshot.val();
  const odUserId = Object.keys(userData)[0];
  return { odUserId, ...userData[odUserId] };
}

async function addCreditsToUser(userId, credits, orderId, amount) {
  if (!firebaseInitialized) throw new Error('Firebase not initialized');
  
  const db = admin.database();
  const userRef = db.ref(`users/${userId}`);
  
  await userRef.transaction((user) => {
    if (user) {
      user.credits = (user.credits || 0) + credits;
      user.totalSpent = (user.totalSpent || 0) + amount;
      return user;
    }
    return user;
  });
  
  const transactionRef = db.ref(`users/${userId}/transactions`).push();
  await transactionRef.set({
    type: 'purchase',
    credits: credits,
    amount: amount,
    orderId: orderId,
    status: 'completed',
    provider: 'shopier',
    createdAt: Date.now(),
    timestamp: new Date().toISOString()
  });
  
  console.log(`💰 ${credits} kredi eklendi: ${userId}`);
}

// ==================== İSTATİSTİK FONKSİYONLARI ====================

/**
 * ✅ Takım ID'si ile form istatistiği çek
 */
async function fetchTeamStatistics(teamId, teamName) {
  const FOOTBALL_API_KEY = process.env.API_FOOTBALL_KEY;
  if (!FOOTBALL_API_KEY || !teamId) return null;
  
  try {
    const response = await axios.get('https://v3.football.api-sports.io/fixtures', {
      params: { team: teamId, last: 5, status: 'FT' },
      headers: { 'x-apisports-key': FOOTBALL_API_KEY },
      timeout: 15000
    });
    
    const fixtures = response.data?.response || [];
    if (fixtures.length === 0) {
      return { form: 'Veri yok', goalsFor: 0, goalsAgainst: 0, wins: 0, draws: 0, losses: 0, formScore: 50 };
    }
    
    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
    const formString = [];
    
    fixtures.forEach(fixture => {
      const isHome = fixture.teams.home.id === teamId;
      const teamGoals = isHome ? (fixture.goals.home || 0) : (fixture.goals.away || 0);
      const oppGoals = isHome ? (fixture.goals.away || 0) : (fixture.goals.home || 0);
      
      goalsFor += teamGoals;
      goalsAgainst += oppGoals;
      
      if (teamGoals > oppGoals) { wins++; formString.push('G'); }
      else if (teamGoals === oppGoals) { draws++; formString.push('B'); }
      else { losses++; formString.push('M'); }
    });
    
    const formScore = Math.round(((wins * 3) + draws) / (fixtures.length * 3) * 100);
    
    return {
      form: `${formString.join('-')} (${wins}G ${draws}B ${losses}M) | ${goalsFor} attı, ${goalsAgainst} yedi`,
      goalsFor, goalsAgainst, wins, draws, losses, formScore
    };
  } catch (error) {
    console.error(`❌ ${teamName} istatistik hatası:`, error.message);
    return null;
  }
}

/**
 * ✅ H2H (kafa kafaya) istatistik çek
 */
async function fetchH2HStatistics(homeTeamId, awayTeamId) {
  const FOOTBALL_API_KEY = process.env.API_FOOTBALL_KEY;
  if (!FOOTBALL_API_KEY || !homeTeamId || !awayTeamId) return null;
  
  try {
    const response = await axios.get('https://v3.football.api-sports.io/fixtures/headtohead', {
      params: { h2h: `${homeTeamId}-${awayTeamId}`, last: 5 },
      headers: { 'x-apisports-key': FOOTBALL_API_KEY },
      timeout: 15000
    });
    
    const matches = response.data?.response || [];
    if (matches.length === 0) {
      return { homeWins: 0, draws: 0, awayWins: 0, totalGoals: 0, avgGoals: 0, matches: 0 };
    }
    
    let homeWins = 0, draws = 0, awayWins = 0, totalGoals = 0;
    
    matches.forEach(fixture => {
      const homeGoals = fixture.goals.home || 0;
      const awayGoals = fixture.goals.away || 0;
      totalGoals += homeGoals + awayGoals;
      
      const homeIsHome = fixture.teams.home.id === homeTeamId;
      const homeScore = homeIsHome ? homeGoals : awayGoals;
      const awayScore = homeIsHome ? awayGoals : homeGoals;
      
      if (homeScore > awayScore) homeWins++;
      else if (homeScore === awayScore) draws++;
      else awayWins++;
    });
    
    return {
      homeWins, draws, awayWins, totalGoals,
      avgGoals: (totalGoals / matches.length).toFixed(1),
      matches: matches.length
    };
  } catch (error) {
    console.error('❌ H2H istatistik hatası:', error.message);
    return null;
  }
}

/**
 * ✅ Maç için tüm istatistikleri topla
 */
async function collectMatchStatistics(homeTeamId, awayTeamId, homeTeamName, awayTeamName) {
  console.log(`📊 İstatistik: ${homeTeamName} vs ${awayTeamName}`);
  
  try {
    const [homeStats, awayStats, h2hStats] = await Promise.all([
      fetchTeamStatistics(homeTeamId, homeTeamName),
      fetchTeamStatistics(awayTeamId, awayTeamName),
      fetchH2HStatistics(homeTeamId, awayTeamId)
    ]);
    
    const homeGoalsAvg = homeStats ? (homeStats.goalsFor / 5) : 0;
    const awayGoalsAvg = awayStats ? (awayStats.goalsFor / 5) : 0;
    const avgGoalsPerMatch = (homeGoalsAvg + awayGoalsAvg).toFixed(1);
    
    return {
      homeForm: homeStats?.form || 'Veri yok',
      awayForm: awayStats?.form || 'Veri yok',
      homeFormScore: homeStats?.formScore || 50,
      awayFormScore: awayStats?.formScore || 50,
      homeGoalsFor: homeStats?.goalsFor || 0,
      homeGoalsAgainst: homeStats?.goalsAgainst || 0,
      awayGoalsFor: awayStats?.goalsFor || 0,
      awayGoalsAgainst: awayStats?.goalsAgainst || 0,
      h2hHomeWins: h2hStats?.homeWins || 0,
      h2hDraws: h2hStats?.draws || 0,
      h2hAwayWins: h2hStats?.awayWins || 0,
      h2hAvgGoals: h2hStats?.avgGoals || 0,
      h2hMatches: h2hStats?.matches || 0,
      avgGoalsPerMatch,
      dataQuality: homeStats && awayStats ? 85 : 40
    };
  } catch (error) {
    console.error('❌ İstatistik toplama hatası:', error.message);
    return null;
  }
}

// ==================== API ENDPOINTS ====================

// API-Football Proxy
app.get('/api/football/*', async (req, res) => {
  try {
    const endpoint = req.params[0];
    const API_KEY = process.env.API_FOOTBALL_KEY;
    
    if (!API_KEY) return res.status(500).json({ error: 'API key bulunamadı' });

    const response = await axios.get(
      `https://v3.football.api-sports.io/${endpoint}`,
      { params: req.query, headers: { 'x-apisports-key': API_KEY }, timeout: 30000 }
    );

    res.json(response.data);
  } catch (error) {
    console.error('❌ API hatası:', error.message);
    res.status(500).json({ error: 'API isteği başarısız' });
  }
});

// ==================== BÜLTEN ANALİZ ENDPOINT ====================

app.post('/api/gemini/analyze', async (req, res) => {
  let creditsDeducted = false;
  const { matches, userId, creditsToDeduct } = req.body;
  
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini API key yok' });
    if (!matches || !Array.isArray(matches)) return res.status(400).json({ error: 'Geçersiz maç verisi' });

    // Kredi düşür
    if (userId && creditsToDeduct && firebaseInitialized) {
      await deductCreditsFromUser(userId, creditsToDeduct, creditsToDeduct === 5 ? 'detailed' : 'standard');
      creditsDeducted = true;
    }

    console.log(`🤖 Bülten analizi: ${matches.length} maç`);

    // İstatistik topla
    const matchesWithStats = [];
    for (const match of matches) {
      const stats = await collectMatchStatistics(match.homeTeamId, match.awayTeamId, match.homeTeam, match.awayTeam);
      matchesWithStats.push({ ...match, statistics: stats });
      await new Promise(r => setTimeout(r, 300));
    }

    const prompt = buildBulletinPrompt(matchesWithStats);
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 3000, responseMimeType: "application/json" }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 45000 }
    );

    const geminiText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!geminiText) throw new Error('Gemini yanıtı alınamadı');

    res.json(parseGeminiJSON(geminiText));

  } catch (error) {
    console.error('❌ Bülten analiz hatası:', error.message);
    if (creditsDeducted && firebaseInitialized && userId && creditsToDeduct) {
      await refundCreditsToUser(userId, creditsToDeduct, 'Analiz hatası');
    }
    res.status(500).json({ error: 'Analiz yapılamadı', details: error.message });
  }
});

function buildBulletinPrompt(matchesWithStats) {
  return `Sen PROFESYONEL futbol analistisin. GERÇEK VERİLERE DAYALI tahmin yap.

🎯 KURALLAR:
- Form skoru yüksek → MS1/MS2 yüksek
- Gol ort. >2.5 → 2.5 Üst
- H2H dominant → +10% bonus
- RASTGELE TAHMİN YAPMA!

📊 MAÇLAR:
${matchesWithStats.map((m, i) => {
  const s = m.statistics;
  if (!s || s.dataQuality < 50) return `${i + 1}. ${m.homeTeam} vs ${m.awayTeam}\n   ⚠️ Veri yok - güven <60`;
  return `${i + 1}. ${m.homeTeam} vs ${m.awayTeam}
   Form: Ev ${s.homeFormScore}/100, Dep ${s.awayFormScore}/100
   Gol Ort: ${s.avgGoalsPerMatch}/maç
   H2H: ${s.h2hMatches > 0 ? `Ev ${s.h2hHomeWins}G-${s.h2hDraws}B-Dep ${s.h2hAwayWins}G` : 'yok'}`;
}).join('\n\n')}

📤 JSON ÇIKTI:
{
  "analyses": [
    { "fixtureId": 123, "predictions": { "ms1": "45", "msX": "28", "ms2": "27", "over25": "65", "under25": "35", "btts": "55" }, "confidence": 72, "reasoning": "sebep" }
  ]
}`;
}

// ==================== GÖRSEL ANALİZ ENDPOINT (DÜZELTİLMİŞ) ====================

app.post('/api/analyze-coupon-image', async (req, res) => {
  let creditsDeducted = false;
  const { image, userId, creditsToDeduct, analysisType } = req.body;
  
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const FOOTBALL_API_KEY = process.env.API_FOOTBALL_KEY;

    if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini API key yok' });
    if (!FOOTBALL_API_KEY) return res.status(500).json({ error: 'Football API key yok' });
    if (!image) return res.status(400).json({ error: 'Görsel bulunamadı' });
    if (!userId || !creditsToDeduct) return res.status(400).json({ error: 'Kullanıcı bilgisi eksik' });

    // Kredi düşür
    if (firebaseInitialized) {
      await deductCreditsFromUser(userId, parseInt(creditsToDeduct), 'image_analysis');
      creditsDeducted = true;
      console.log(`💰 ${creditsToDeduct} kredi düşüldü`);
    }

    console.log('🖼️ Görsel analizi başlıyor...');

    let base64Data = image;
    if (image.includes('base64,')) base64Data = image.split('base64,')[1];

    // ========== ADIM 1: Görselden maçları çıkar ==========
    console.log('📸 ADIM 1: OCR ile maçlar çıkarılıyor...');
    
    const extractResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            { text: `Bu görseldeki futbol maçlarını çıkar ve İNGİLİZCE tam isimlerine çevir.

⚠️ ÖNEMLİ KISALTMA VE ÇEVİRİ KURALLARI:

TÜRKÇE KISALTMALAR → İNGİLİZCE TAM İSİM:
- "G.Saray", "Galatasaray" → "Galatasaray"
- "F.Bahçe", "Fenerbahçe" → "Fenerbahce"  
- "Beşiktaş", "BJK" → "Besiktas"
- "Trabzonspor", "TS" → "Trabzonspor"
- "B. Münih", "Bayern" → "Bayern Munich"
- "R. Madrid", "Real M." → "Real Madrid"
- "Barcelona", "Barça" → "Barcelona"
- "M. City", "Man City" → "Manchester City"
- "M. United", "Man Utd" → "Manchester United"
- "Chelsea", "CHE" → "Chelsea"
- "Arsenal", "ARS" → "Arsenal"
- "Liverpool", "LIV" → "Liverpool"
- "Juventus", "Juve" → "Juventus"
- "Inter", "Inter M." → "Inter Milan"
- "Milan", "AC Milan" → "AC Milan"
- "PSG", "Paris" → "Paris Saint Germain"
- "Dortmund", "BVB" → "Borussia Dortmund"
- "Atletico M.", "Atl. Madrid" → "Atletico Madrid"
- "Sevilla", "SEV" → "Sevilla"
- "Porto", "FC Porto" → "FC Porto"
- "Benfica", "SL Benfica" → "Benfica"
- "Ajax", "AFC Ajax" → "Ajax"
- "Feyenoord" → "Feyenoord"
- "Leverkusen", "B. Leverkusen" → "Bayer Leverkusen"
- "Leipzig", "RB Leipzig" → "RB Leipzig"
- "Napoli", "SSC Napoli" → "Napoli"
- "Roma", "AS Roma" → "AS Roma"
- "Lazio", "SS Lazio" → "Lazio"

ÜLKE İSİMLERİ (MİLLİ TAKIM):
- "Türkiye" → "Turkey"
- "Almanya" → "Germany"
- "Fransa" → "France"
- "İngiltere" → "England"
- "İspanya" → "Spain"
- "İtalya" → "Italy"
- "Hollanda" → "Netherlands"
- "Portekiz" → "Portugal"
- "Belçika" → "Belgium"
- "Hırvatistan" → "Croatia"
- "Yunanistan" → "Greece"
- "İsveç" → "Sweden"
- "Norveç" → "Norway"
- "Danimarka" → "Denmark"
- "İsviçre" → "Switzerland"
- "Avusturya" → "Austria"
- "Polonya" → "Poland"
- "Ukrayna" → "Ukraine"
- "Rusya" → "Russia"
- "Çekya" → "Czech Republic"
- "Macaristan" → "Hungary"
- "Romanya" → "Romania"
- "Sırbistan" → "Serbia"
- "Brezilya" → "Brazil"
- "Arjantin" → "Argentina"
- "Meksika" → "Mexico"
- "ABD", "Amerika" → "USA"
- "Japonya" → "Japan"
- "G. Kore" → "South Korea"
- "Avustralya" → "Australia"
- "Mısır" → "Egypt"
- "Fas" → "Morocco"
- "Nijerya" → "Nigeria"
- "Kamerun" → "Cameroon"
- "Senegal" → "Senegal"
- "Gana" → "Ghana"
- "Cezayir" → "Algeria"
- "Tunus" → "Tunisia"
- "S. Arabistan" → "Saudi Arabia"
- "Katar" → "Qatar"
- "BAE" → "United Arab Emirates"
- "İran" → "Iran"

U21, U19, U20, U23 TAKIMLARI:
- "Türkiye U21" → "Turkey U21"
- "Almanya U21" → "Germany U21"
- Yaş kategorisini MUTLAKA koru!

KURALLAR:
1. Kısaltmaları AÇ ve TAM İNGİLİZCE isim yaz
2. Türkçe ülke isimlerini İngilizce'ye çevir
3. Takım bulunamazsa en yakın tahminini yaz
4. Okunamayan maçları ATLA

JSON formatı:
{
  "matches": [
    { "homeTeam": "Tam İngilizce İsim", "awayTeam": "Tam İngilizce İsim", "league": "Lig adı" }
  ]
}

SADECE JSON döndür.` },
            { inline_data: { mime_type: 'image/jpeg', data: base64Data } }
          ]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2000, responseMimeType: "application/json" }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 45000 }
    );

    const extractText = extractResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!extractText) throw new Error('Görsel okunamadı');

    const extractedData = parseGeminiJSON(extractText);
    const extractedMatches = extractedData.matches || [];
    
    console.log(`✅ ${extractedMatches.length} maç görselden çıkarıldı:`, extractedMatches.map(m => `${m.homeTeam} vs ${m.awayTeam}`));

    if (extractedMatches.length === 0) {
      if (creditsDeducted && firebaseInitialized) {
        await refundCreditsToUser(userId, parseInt(creditsToDeduct), 'Görselde maç bulunamadı');
      }
      return res.json({ success: true, message: 'Görselde maç bulunamadı. Krediniz iade edildi.', extractedMatches: [], matchedMatches: [] });
    }

    // ========== ADIM 2: API'den maçları al ==========
    console.log('🔍 ADIM 2: Football API\'den maçlar alınıyor...');
    
    const footballResponse = await axios.get(
      'https://v3.football.api-sports.io/fixtures',
      { params: { next: 150 }, headers: { 'x-apisports-key': FOOTBALL_API_KEY }, timeout: 20000 }
    );

    const allFixtures = footballResponse.data?.response || [];
    console.log(`📊 API'den ${allFixtures.length} maç alındı`);

    // ========== ADIM 3: GELİŞMİŞ EŞLEŞTİRME ==========
    console.log('🎯 ADIM 3: Gelişmiş maç eşleştirme...');
    
    const matchedMatches = [];
    const unmatchedMatches = [];

    for (const extracted of extractedMatches) {
      const bestMatch = findBestMatch(extracted.homeTeam, extracted.awayTeam, allFixtures);
      
      if (bestMatch && bestMatch.score >= 55) {
        matchedMatches.push({
          extracted,
          apiMatch: {
            fixtureId: bestMatch.fixture.fixture.id,
            homeTeam: bestMatch.fixture.teams.home.name,
            awayTeam: bestMatch.fixture.teams.away.name,
            homeTeamId: bestMatch.fixture.teams.home.id,
            awayTeamId: bestMatch.fixture.teams.away.id,
            league: bestMatch.fixture.league.name,
            date: bestMatch.fixture.fixture.date,
            status: bestMatch.fixture.fixture.status.long
          },
          matchScore: bestMatch.score
        });
      } else {
        unmatchedMatches.push(extracted);
      }
    }

    console.log(`🎯 ${matchedMatches.length}/${extractedMatches.length} maç eşleşti`);

    if (matchedMatches.length === 0) {
      if (creditsDeducted && firebaseInitialized) {
        await refundCreditsToUser(userId, parseInt(creditsToDeduct), 'Maçlar eşleştirilemedi');
      }
      return res.json({
        success: true,
        message: 'Görseldeki maçlar API\'de bulunamadı. Krediniz iade edildi.',
        extractedMatches,
        matchedMatches: [],
        unmatchedMatches
      });
    }

    // ========== ADIM 4: İstatistik topla ==========
    console.log('📊 ADIM 4: İstatistikler toplanıyor...');
    
    for (let i = 0; i < matchedMatches.length; i++) {
      const match = matchedMatches[i];
      const stats = await collectMatchStatistics(
        match.apiMatch.homeTeamId,
        match.apiMatch.awayTeamId,
        match.apiMatch.homeTeam,
        match.apiMatch.awayTeam
      );
      matchedMatches[i].statistics = stats;
      await new Promise(r => setTimeout(r, 400));
    }

    // ========== ADIM 5: AI Tahmin ==========
    console.log('🤖 ADIM 5: AI tahminleri...');
    
    const predictionPrompt = buildImagePredictionPrompt(matchedMatches, analysisType);
    
    const predictionResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: predictionPrompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 3000, responseMimeType: "application/json" }
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 45000 }
    );

    const predictionText = predictionResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (predictionText) {
      try {
        const predData = parseGeminiJSON(predictionText);
        const predictions = predData.predictions || [];
        
        predictions.forEach((pred, idx) => {
          if (idx < matchedMatches.length) {
            matchedMatches[idx].prediction = pred.prediction || 'Tahmin yapılamadı';
            matchedMatches[idx].confidence = pred.confidence || 50;
            matchedMatches[idx].reasoning = pred.reasoning || '';
          }
        });
        console.log(`✅ ${predictions.length} tahmin tamamlandı`);
      } catch (e) {
        console.error('⚠️ Tahmin parse hatası');
      }
    }

    res.json({
      success: true,
      message: `${matchedMatches.length} maç analiz edildi`,
      extractedMatches,
      matchedMatches,
      unmatchedMatches,
      analysisType
    });

  } catch (error) {
    console.error('❌ Görsel analiz hatası:', error.message);
    if (creditsDeducted && firebaseInitialized && userId && creditsToDeduct) {
      await refundCreditsToUser(userId, parseInt(creditsToDeduct), 'Analiz hatası');
    }
    res.status(500).json({ error: 'Görsel analizi yapılamadı', details: error.message });
  }
});

function buildImagePredictionPrompt(matchedMatches, analysisType) {
  const typeMap = {
    'ilkYariSonucu': 'İLK YARI SONUCU',
    'macSonucu': 'MAÇ SONUCU',
    'karsilikliGol': 'KARŞILIKLI GOL',
    'altustu': '2.5 ALT/ÜST',
    'hepsi': 'TÜM TAHMİNLER'
  };
  
  return `Sen PROFESYONEL futbol analistisin. "${typeMap[analysisType] || 'MAÇ SONUCU'}" tahmini yap.

🎯 KURALLAR:
- GERÇEK VERİLERE göre tahmin
- Form yüksek → o takım avantajlı
- Gol ort. >2.5 → 2.5 Üst, <2.0 → Alt
- H2H dominant → +10% bonus
- Veri yoksa güven <60

📊 MAÇLAR:
${matchedMatches.map((m, i) => {
  const s = m.statistics;
  const hasStats = s && s.dataQuality >= 50;
  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MAÇ ${i + 1}: ${m.apiMatch.homeTeam} vs ${m.apiMatch.awayTeam}
Lig: ${m.apiMatch.league}
${hasStats ? `Form: Ev ${s.homeFormScore}/100, Dep ${s.awayFormScore}/100
Gol Ort: ${s.avgGoalsPerMatch}/maç
H2H: ${s.h2hMatches > 0 ? `Ev ${s.h2hHomeWins}G-${s.h2hDraws}B-Dep ${s.h2hAwayWins}G` : 'yok'}` : '⚠️ Veri yok'}`;
}).join('\n\n')}

📤 JSON:
{
  "predictions": [
    { "matchIndex": 0, "homeTeam": "${matchedMatches[0]?.apiMatch.homeTeam}", "awayTeam": "${matchedMatches[0]?.apiMatch.awayTeam}", "prediction": "MS1/MSX/MS2/2.5 Üst/Alt/KG Var", "confidence": 65, "reasoning": "Kısa sebep" }
  ]
}`;
}

// ==================== SHOPIER ====================

const PRICE_TO_CREDITS = { 99: 5, 189: 10, 449: 25, 799: 50 };

app.post('/api/shopier/callback', async (req, res) => {
  try {
    const { order_id, buyer_email, total_order_value, status, API_key } = req.body;
    if (API_key !== process.env.SHOPIER_API_USER) return res.status(401).json({ error: 'Unauthorized' });

    if (status === '1' || status === 1) {
      const user = await findUserByEmail(buyer_email);
      if (user) {
        const credits = PRICE_TO_CREDITS[parseInt(total_order_value)];
        if (credits) await addCreditsToUser(user.odUserId, credits, order_id, parseInt(total_order_value));
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Shopier hatası:', error);
    res.status(200).send('OK');
  }
});

// ==================== HEALTH CHECK ====================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    firebase: firebaseInitialized,
    gemini: !!process.env.GEMINI_API_KEY,
    football: !!process.env.API_FOOTBALL_KEY
  });
});

// ==================== SERVER START ====================

app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portunda çalışıyor`);
});