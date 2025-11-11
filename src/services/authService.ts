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
    const userIP = await ipService.getUserIP();

    const ipBanCheck = await ipService.checkIPBanned(userIP);
    if (ipBanCheck.banned) {
      throw new Error(ipBanCheck.reason || 'Bu IP adresi yasaklanmıştır.');
    }

    const isDuplicateIP = await ipService.checkDuplicateIP(userIP);
    if (isDuplicateIP) {
      throw new Error('Bu IP adresinden zaten bir hesap oluşturulmuş. Birden fazla hesap oluşturulamaz.');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });

    const userData: User = {
      uid: userCredential.user.uid,
      email,
      displayName,
      credits: 1,
      totalSpent: 0,
      createdAt: Date.now(),
      lastLogin: Date.now(),
      isBanned: false,
      registrationIP: userIP,
      lastIP: userIP,
    };

    await set(ref(database, `users/${userCredential.user.uid}`), userData);
    return userCredential.user;
  },

  async loginWithEmail(email: string, password: string) {
    const userIP = await ipService.getUserIP();

    const ipBanCheck = await ipService.checkIPBanned(userIP);
    if (ipBanCheck.banned) {
      throw new Error(ipBanCheck.reason || 'Bu IP adresi yasaklanmıştır.');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    const userRef = ref(database, `users/${userCredential.user.uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      const userData = snapshot.val();
      if (userData.isBanned) {
        await signOut(auth);
        throw new Error(userData.bannedReason || 'Hesabınız askıya alınmıştır.');
      }
    }

    await set(ref(database, `users/${userCredential.user.uid}/lastLogin`), Date.now());
    await set(ref(database, `users/${userCredential.user.uid}/lastIP`), userIP);
    return userCredential.user;
  },

  async loginWithGoogle() {
    const userIP = await ipService.getUserIP();

    const ipBanCheck = await ipService.checkIPBanned(userIP);
    if (ipBanCheck.banned) {
      throw new Error(ipBanCheck.reason || 'Bu IP adresi yasaklanmıştır.');
    }

    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const userRef = ref(database, `users/${user.uid}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      const isDuplicateIP = await ipService.checkDuplicateIP(userIP);
      if (isDuplicateIP) {
        await signOut(auth);
        throw new Error('Bu IP adresinden zaten bir hesap oluşturulmuş. Birden fazla hesap oluşturulamaz.');
      }

      const userData: User = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        credits: 1,
        totalSpent: 0,
        createdAt: Date.now(),
        lastLogin: Date.now(),
        isBanned: false,
        registrationIP: userIP,
        lastIP: userIP,
      };
      await set(userRef, userData);
    } else {
      const userData = snapshot.val();
      if (userData.isBanned) {
        await signOut(auth);
        throw new Error(userData.bannedReason || 'Hesabınız askıya alınmıştır.');
      }
      await set(ref(database, `users/${user.uid}/lastLogin`), Date.now());
      await set(ref(database, `users/${user.uid}/lastIP`), userIP);
    }

    return user;
  },

  async logout() {
    await signOut(auth);
  },

  async getUserData(uid: string): Promise<User | null> {
    const userRef = ref(database, `users/${uid}`);
    const snapshot = await get(userRef);
    return snapshot.val();
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
};
