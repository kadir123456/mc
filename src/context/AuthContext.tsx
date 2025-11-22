import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { authService } from '../services/authService';
import { User } from '../types';
import { ref, set } from 'firebase/database';
import { database } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  authUser: any;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (authUser) {
      try {
        const userData = await authService.getUserData(authUser.uid);
        if (userData) {
          setUser(userData);
          console.log('✅ Kullanıcı verisi güncellendi:', userData.displayName);
        }
      } catch (error) {
        console.error('❌ Kullanıcı verisi güncellenemedi:', error);
      }
    }
  };

  useEffect(() => {
    console.log('🔄 Auth listener başlatıldı');

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Auth state değişti:', firebaseUser ? `✅ ${firebaseUser.email}` : '❌ Yok');

      if (firebaseUser) {
        try {
          // ✅ Firebase'den kullanıcı verilerini çek
          let userData = await authService.getUserData(firebaseUser.uid);
          
          // ✅ Eğer veri yoksa oluştur (Google login için)
          if (!userData) {
            console.warn('⚠️ Kullanıcı verisi bulunamadı, oluşturuluyor...');
            
            userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              credits: 5,
              totalSpent: 0,
              createdAt: Date.now(),
              lastLogin: Date.now(),
              isBanned: false,
              termsAcceptedAt: Date.now(),
              privacyAcceptedAt: Date.now(),
            };

            // Firebase'e kaydet
            await set(ref(database, `users/${firebaseUser.uid}`), userData);
            console.log('✅ Yeni kullanıcı verisi oluşturuldu');
          }

          console.log('✅ Kullanıcı yüklendi:', userData.displayName || userData.email);
          setUser(userData);
          setAuthUser(firebaseUser);
        } catch (error) {
          console.error('❌ Kullanıcı verisi alınamadı:', error);
          // Hata olsa bile auth user'ı set et
          setAuthUser(firebaseUser);
          setUser(null);
        }
      } else {
        console.log('❌ Kullanıcı çıkış yaptı');
        setUser(null);
        setAuthUser(null);
      }
      
      setLoading(false);
      console.log('✅ Loading durumu: false');
    });

    return () => {
      console.log('🔴 Auth listener kapatıldı');
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      console.log('🚪 Çıkış yapılıyor...');
      await authService.logout();
      setUser(null);
      setAuthUser(null);
      console.log('✅ Çıkış başarılı');
    } catch (error) {
      console.error('❌ Çıkış hatası:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, authUser, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
