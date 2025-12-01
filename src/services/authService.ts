// src/services/authService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, googleProvider, database } from './firebase';
import { User } from '../types';
import { ipService } from './ipService';

export const authService = {
  async registerWithEmail(email: string, password: string, displayName: string) {
    try {
      // ✅ IP kontrolü - hata olsa bile devam et
      let userIP = 'unknown';
      try {
        userIP = await ipService.getUserIP();
        
        const ipBanCheck = await ipService.checkIPBanned(userIP);
        if (ipBanCheck.banned) {
          throw new Error(ipBanCheck.reason || 'Bu IP adresi yasaklanmıştır.');
        }

        const isDuplicateIP = await ipService.checkDuplicateIP(userIP);
        if (isDuplicateIP) {
          throw new Error('Bu IP adresinden zaten bir hesap oluşturulmuş. Birden fazla hesap oluşturulamaz.');
        }
      } catch (ipError) {
        console.warn('⚠️ IP kontrolü başarısız, devam ediliyor:', ipError);
        // IP hatası olsa bile kayda devam et
      }

      // ✅ Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });

      // ✅ User data kaydet
      const userData: User = {
        uid: userCredential.user.uid,
        email,
        displayName,
        credits: 4,
        totalSpent: 0,
        createdAt: Date.now(),
        lastLogin: Date.now(),
        isBanned: false,
        registrationIP: userIP,
        lastIP: userIP,
        termsAcceptedAt: Date.now(),
        privacyAcceptedAt: Date.now(),
      };

      await set(ref(database, `users/${userCredential.user.uid}`), userData);
      
      // IP kaydı (opsiyonel)
      try {
        await ipService.registerIP(userIP, userCredential.user.uid);
      } catch (err) {
        console.warn('⚠️ IP kaydı başarısız:', err);
      }

      return userCredential.user;
    } catch (error: any) {
      console.error('❌ Kayıt hatası:', error);
      throw error;
    }
  },

  async loginWithEmail(email: string, password: string) {
    try {
      // ✅ IP kontrolü - hata olsa bile devam et
      let userIP = 'unknown';
      try {
        userIP = await ipService.getUserIP();
        
        const ipBanCheck = await ipService.checkIPBanned(userIP);
        if (ipBanCheck.banned) {
          throw new Error(ipBanCheck.reason || 'Bu IP adresi yasaklanmıştır.');
        }
      } catch (ipError) {
        console.warn('⚠️ IP kontrolü başarısız, devam ediliyor:', ipError);
      }

      // ✅ Firebase login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // ✅ Ban kontrolü
      const userRef = ref(database, `users/${userCredential.user.uid}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        if (userData.isBanned) {
          await signOut(auth);
          throw new Error(userData.bannedReason || 'Hesabınız askıya alınmıştır.');
        }
      }

      // ✅ Son giriş zamanını güncelle
      try {
        await set(ref(database, `users/${userCredential.user.uid}/lastLogin`), Date.now());
        await set(ref(database, `users/${userCredential.user.uid}/lastIP`), userIP);
      } catch (err) {
        console.warn('⚠️ Son giriş güncellenemedi:', err);
      }

      return userCredential.user;
    } catch (error: any) {
      console.error('❌ Giriş hatası:', error);
      throw error;
    }
  },

  async loginWithGoogle() {
    try {
      // ✅ IP kontrolü - hata olsa bile devam et
      let userIP = 'unknown';
      try {
        userIP = await ipService.getUserIP();
        
        const ipBanCheck = await ipService.checkIPBanned(userIP);
        if (ipBanCheck.banned) {
          throw new Error(ipBanCheck.reason || 'Bu IP adresi yasaklanmıştır.');
        }
      } catch (ipError) {
        console.warn('⚠️ IP kontrolü başarısız, devam ediliyor:', ipError);
      }

      // ✅ Google popup
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = ref(database, `users/${user.uid}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        // ✅ Yeni kullanıcı - kaydet
        const userData: User = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          credits: 4,
          totalSpent: 0,
          createdAt: Date.now(),
          lastLogin: Date.now(),
          isBanned: false,
          registrationIP: userIP,
          lastIP: userIP,
          termsAcceptedAt: Date.now(),
          privacyAcceptedAt: Date.now(),
        };
        await set(userRef, userData);
        
        // IP kaydı (opsiyonel)
        try {
          await ipService.registerIP(userIP, user.uid);
        } catch (err) {
          console.warn('⚠️ IP kaydı başarısız:', err);
        }
      } else {
        // ✅ Mevcut kullanıcı - ban kontrolü
        const userData = snapshot.val();
        if (userData.isBanned) {
          await signOut(auth);
          throw new Error(userData.bannedReason || 'Hesabınız askıya alınmıştır.');
        }
        
        // Son giriş güncelle
        try {
          await set(ref(database, `users/${user.uid}/lastLogin`), Date.now());
          await set(ref(database, `users/${user.uid}/lastIP`), userIP);
        } catch (err) {
          console.warn('⚠️ Son giriş güncellenemedi:', err);
        }
      }

      return user;
    } catch (error: any) {
      console.error('❌ Google giriş hatası:', error);
      throw error;
    }
  },

  async logout() {
    await signOut(auth);
  },

  async getUserData(uid: string): Promise<User | null> {
    try {
      const userRef = ref(database, `users/${uid}`);
      const snapshot = await get(userRef);
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error('❌ Kullanıcı verisi alınamadı:', error);
      return null;
    }
  },

  async updateCredits(uid: string, credits: number) {
    await set(ref(database, `users/${uid}/credits`), credits);
  },

  async addTransaction(uid: string, transactionData: any) {
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await set(ref(database, `transactions/${transactionId}`), {
      ...transactionData,
      userId: uid,
      id: transactionId,
      createdAt: Date.now(),
    });
    return transactionId;
  },

  async resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  },

  async createPaymentRequest(paymentData: any) {
    const requestId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await set(ref(database, `payment_requests/${requestId}`), {
      ...paymentData,
      id: requestId,
      createdAt: Date.now(),
      status: 'pending'
    });
    return requestId;
  },
};
