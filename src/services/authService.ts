import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, googleProvider, database } from './firebase';
import { User } from '../types';

export const authService = {
  async registerWithEmail(email: string, password: string, displayName: string) {
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
    };

    await set(ref(database, `users/${userCredential.user.uid}`), userData);
    return userCredential.user;
  },

  async loginWithEmail(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await set(ref(database, `users/${userCredential.user.uid}/lastLogin`), Date.now());
    return userCredential.user;
  },

  async loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const userRef = ref(database, `users/${user.uid}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
      const userData: User = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        credits: 1,
        totalSpent: 0,
        createdAt: Date.now(),
        lastLogin: Date.now(),
      };
      await set(userRef, userData);
    } else {
      await set(ref(database, `users/${user.uid}/lastLogin`), Date.now());
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
};
