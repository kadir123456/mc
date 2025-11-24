// utils.js - Ortak Fonksiyonlar (GÜNCELLENMİŞ VERSİYON)
const admin = require('firebase-admin');

// Firebase Admin SDK Initialization
let firebaseInitialized = false;

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.VITE_FIREBASE_DATABASE_URL
    });
  }
  
  firebaseInitialized = true;
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed:', error.message);
}

// Gemini JSON yanıtını güvenli şekilde parse et
function parseGeminiJSON(text) {
  if (!text) {
    throw new Error('Boş yanıt');
  }
  
  try {
    // Markdown kod bloklarını temizle
    let cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // JSON'u bul
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON bulunamadı');
    }
    
    // Parse et
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
    
  } catch (error) {
    console.error('❌ JSON parse hatası:', error.message);
    console.error('📄 Ham yanıt:', text.substring(0, 500));
    throw new Error(`JSON parse hatası: ${error.message}`);
  }
}

// YENİ: Takım ismi benzerlik skoru hesapla (Levenshtein Distance)
function calculateSimilarity(str1, str2) {
  const normalize = (str) => {
    return str
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[.-]/g, '')
      .replace(/ş/g, 's')
      .replace(/ç/g, 'c')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o');
  };
  
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  // Tam eşleşme
  if (s1 === s2) return 1.0;
  
  // İçerme kontrolü
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;
  
  // Levenshtein distance
  const matrix = Array(s2.length + 1).fill(null).map(() => 
    Array(s1.length + 1).fill(null)
  );
  
  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - (distance / maxLength);
}

// YENİ: Ev/deplasman performans analizi
function analyzeHomeAwayPerformance(matches, teamId) {
  let homeStats = { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, matches: 0 };
  let awayStats = { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, matches: 0 };
  
  matches.forEach(match => {
    if (match.fixture.status.short !== 'FT') return;
    
    const isHome = match.teams.home.id === teamId;
    const teamGoals = isHome ? match.goals.home : match.goals.away;
    const oppGoals = isHome ? match.goals.away : match.goals.home;
    
    const stats = isHome ? homeStats : awayStats;
    stats.matches++;
    stats.goalsFor += teamGoals;
    stats.goalsAgainst += oppGoals;
    
    if (teamGoals > oppGoals) stats.wins++;
    else if (teamGoals === oppGoals) stats.draws++;
    else stats.losses++;
  });
  
  return { homeStats, awayStats };
}

// YENİ: BTTS (Both Teams To Score) analizi
function analyzeBTTS(matches, teamId) {
  let bttsCount = 0;
  let cleanSheets = 0;
  let validMatches = 0;
  
  matches.forEach(match => {
    if (match.fixture.status.short !== 'FT') return;
    
    const isHome = match.teams.home.id === teamId;
    const teamGoals = isHome ? match.goals.home : match.goals.away;
    const oppGoals = isHome ? match.goals.away : match.goals.home;
    
    validMatches++;
    
    if (teamGoals > 0 && oppGoals > 0) bttsCount++;
    if (oppGoals === 0) cleanSheets++;
  });
  
  return {
    bttsCount,
    bttsPercentage: validMatches > 0 ? Math.round((bttsCount / validMatches) * 100) : 0,
    cleanSheets,
    cleanSheetPercentage: validMatches > 0 ? Math.round((cleanSheets / validMatches) * 100) : 0
  };
}

// YENİ: Güvenilirlik skoru hesapla
function calculateReliabilityScore(match) {
  let score = 0;
  const stats = match.statistics;
  
  // H2H verisi var mı? (20 puan)
  if (stats.h2h.totalMatches >= 5) {
    score += 20;
  } else if (stats.h2h.totalMatches >= 3) {
    score += 10;
  }
  
  // Form farkı belirgin mi? (30 puan)
  const homeFormPoints = stats.home.formPoints || 0;
  const awayFormPoints = stats.away.formPoints || 0;
  const formDiff = Math.abs(homeFormPoints - awayFormPoints);
  
  if (formDiff >= 15) score += 30;
  else if (formDiff >= 10) score += 20;
  else if (formDiff >= 5) score += 10;
  
  // Ev sahibi formu güçlü mü? (25 puan)
  if (stats.home.wins >= 7) score += 25;
  else if (stats.home.wins >= 5) score += 15;
  else if (stats.home.wins >= 3) score += 5;
  
  // Deplasman formu zayıf mı? (25 puan)
  if (stats.away.losses >= 6) score += 25;
  else if (stats.away.losses >= 4) score += 15;
  else if (stats.away.losses >= 2) score += 5;
  
  return Math.min(score, 100);
}

// Kullanıcıya kredi iade et
async function refundCreditsToUser(userId, credits, reason) {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }
  
  const db = admin.database();
  const userRef = db.ref(`users/${userId}`);
  
  // Transaction ile güvenli kredi iadesi
  await userRef.transaction((user) => {
    if (user) {
      user.credits = (user.credits || 0) + credits;
      return user;
    }
    return user;
  });
  
  // Transaction kaydı oluştur
  const transactionRef = db.ref(`users/${userId}/transactions`).push();
  await transactionRef.set({
    type: 'refund',
    credits: credits,
    reason: reason,
    status: 'completed',
    createdAt: Date.now(),
    timestamp: new Date().toISOString()
  });
  
  console.log(`💰 ${credits} kredi ${userId} kullanıcısına iade edildi: ${reason}`);
}

// Email ile kullanıcı bul
async function findUserByEmail(email) {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }
  
  const db = admin.database();
  const usersRef = db.ref('users');
  const snapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
  
  if (!snapshot.exists()) {
    return null;
  }
  
  const userData = snapshot.val();
  const userId = Object.keys(userData)[0];
  return { userId, ...userData[userId] };
}

// Kullanıcıya kredi ekle
async function addCreditsToUser(userId, credits, orderId, amount) {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }
  
  const db = admin.database();
  const userRef = db.ref(`users/${userId}`);
  
  // Transaction ile güvenli kredi ekleme
  await userRef.transaction((user) => {
    if (user) {
      user.credits = (user.credits || 0) + credits;
      user.totalSpent = (user.totalSpent || 0) + amount;
      return user;
    }
    return user;
  });
  
  // Transaction kaydı oluştur
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
  
  console.log(`💰 ${credits} kredi ${userId} kullanıcısına eklendi`);
}

// Kullanıcıdan kredi düş
async function deductCreditsFromUser(userId, credits, analysisType) {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }
  
  const db = admin.database();
  const userRef = db.ref(`users/${userId}`);
  
  // Önce mevcut krediyi kontrol et
  const snapshot = await userRef.once('value');
  const userData = snapshot.val();
  
  if (!userData) {
    throw new Error('Kullanıcı bulunamadı');
  }
  
  const currentCredits = userData.credits || 0;
  
  if (currentCredits < credits) {
    throw new Error(`Yetersiz kredi. Mevcut: ${currentCredits}, Gerekli: ${credits}`);
  }
  
  // Transaction ile güvenli kredi düşürme
  await userRef.transaction((user) => {
    if (user && user.credits >= credits) {
      user.credits = user.credits - credits;
      return user;
    }
    return user;
  });
  
  // Transaction kaydı oluştur
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
}

module.exports = {
  firebaseInitialized,
  parseGeminiJSON,
  calculateSimilarity,
  analyzeHomeAwayPerformance,
  analyzeBTTS,
  calculateReliabilityScore,
  refundCreditsToUser,
  findUserByEmail,
  addCreditsToUser,
  deductCreditsFromUser
};
