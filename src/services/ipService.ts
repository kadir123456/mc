import { ref, get, set } from 'firebase/database';
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
      const bannedIPsRef = ref(database, 'bannedIPs/' + ip.replace(/\./g, '_'));
      const snapshot = await get(bannedIPsRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        return {
          banned: true,
          reason: data.reason || 'Bu IP adresi yasaklanmıştır.'
        };
      }

      return { banned: false };
    } catch (error) {
      console.error('IP kontrolü hatası:', error);
      // Hata durumunda kullanıcıyı engelleme (fail-open)
      return { banned: false };
    }
  },

  async checkDuplicateIP(ip: string): Promise<boolean> {
    // IP duplicate kontrolü devre dışı (Firebase permission sorunları için)
    return false;
  },

  async registerIP(ip: string, userId: string): Promise<void> {
    // IP kayıt devre dışı (Firebase permission sorunları için)
    return;
  }
};
