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
    // IP ban kontrolü devre dışı (Firebase permission sorunları için)
    return { banned: false };
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
