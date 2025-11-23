// utils.js - Ortak Fonksiyonlar
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
  refundCreditsToUser,
  findUserByEmail,
  addCreditsToUser,
  deductCreditsFromUser
};
