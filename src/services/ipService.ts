import { ref, get } from 'firebase/database';
import { database } from './firebase';

export const ipService = {
  async getUserIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('IP alınamadı:', error);
      return 'unknown';
    }
  },

  async checkIPBanned(ip: string): Promise<{ banned: boolean; reason?: string }> {
    if (ip === 'unknown') return { banned: false };

    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);

      if (!snapshot.exists()) return { banned: false };

      const users = snapshot.val();

      for (const userId in users) {
        const user = users[userId];

        if (user.isBanned && (user.registrationIP === ip || user.lastIP === ip)) {
          return {
            banned: true,
            reason: user.bannedReason || 'Hesabınız askıya alınmıştır.'
          };
        }
      }

      return { banned: false };
    } catch (error) {
      console.error('IP kontrolü hatası:', error);
      return { banned: false };
    }
  },

  async checkDuplicateIP(ip: string): Promise<boolean> {
    if (ip === 'unknown') return false;

    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);

      if (!snapshot.exists()) return false;

      const users = snapshot.val();

      for (const userId in users) {
        const user = users[userId];

        if (user.registrationIP === ip || user.lastIP === ip) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('IP duplikasyon kontrolü hatası:', error);
      return false;
    }
  }
};
