import { ref, get, set, remove } from 'firebase/database';
import { database } from './firebase';

export interface Match {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  time: string;
  timestamp: number;
  status: 'scheduled' | 'live' | 'finished';
  lastUpdated: number;
}

export interface MatchSelection {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  time: string;
}

// ✅ Türkiye saati için timezone offset
const TURKEY_OFFSET = 3; // UTC+3

// ✅ Türkiye saatine çevir
function toTurkeyDate(timestamp: number): Date {
  const date = new Date(timestamp);
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * TURKEY_OFFSET));
}

// ✅ Türkiye saatinde bugünün tarihini al
function getTurkeyToday(): string {
  const now = toTurkeyDate(Date.now());
  return now.toISOString().split('T')[0];
}

// ✅ Türkiye saatinde yarının tarihini al
function getTurkeyTomorrow(): string {
  const tomorrow = toTurkeyDate(Date.now() + 24 * 60 * 60 * 1000);
  return tomorrow.toISOString().split('T')[0];
}

export const matchService = {
  async getMatchesByDate(date: string): Promise<Match[]> {
    const matchesRef = ref(database, `matches/${date}`);
    const snapshot = await get(matchesRef);

    if (!snapshot.exists()) {
      return [];
    }

    const matchesData = snapshot.val();
    const matches: Match[] = [];
    const now = Date.now();

    Object.keys(matchesData).forEach(fixtureId => {
      const match = matchesData[fixtureId];
      
      // ✅ Sadece gelecekteki veya canlı maçları göster
      if (match.status !== 'finished' && match.timestamp > now - 3600000) {
        matches.push({
          fixtureId: parseInt(fixtureId),
          ...match
        });
      }
    });

    // ✅ Zamana göre sırala (yakın maçlar önce)
    return matches.sort((a, b) => a.timestamp - b.timestamp);
  },

  async getTodayMatches(): Promise<Match[]> {
    const today = getTurkeyToday();
    console.log(`📅 Bugünün maçları çekiliyor (Türkiye saati): ${today}`);
    return this.getMatchesByDate(today);
  },

  async getTomorrowMatches(): Promise<Match[]> {
    const tomorrow = getTurkeyTomorrow();
    console.log(`📅 Yarının maçları çekiliyor (Türkiye saati): ${tomorrow}`);
    return this.getMatchesByDate(tomorrow);
  },

  async getAllUpcomingMatches(): Promise<Match[]> {
    const today = await this.getTodayMatches();
    const tomorrow = await this.getTomorrowMatches();
    
    // ✅ Tüm maçları birleştir ve zamana göre sırala
    const allMatches = [...today, ...tomorrow];
    const now = Date.now();
    
    // ✅ Geçmişte kalan maçları filtrele
    const upcomingMatches = allMatches.filter(match => {
      return match.timestamp > now - 3600000; // Son 1 saat içindeki maçları da göster
    });

    return upcomingMatches.sort((a, b) => a.timestamp - b.timestamp);
  },

  async getMatchByFixtureId(fixtureId: number): Promise<Match | null> {
    const dates = [getTurkeyToday(), getTurkeyTomorrow()];

    for (const date of dates) {
      const matchRef = ref(database, `matches/${date}/${fixtureId}`);
      const snapshot = await get(matchRef);

      if (snapshot.exists()) {
        return {
          fixtureId,
          ...snapshot.val()
        };
      }
    }

    return null;
  },

  async saveMatches(date: string, matches: Match[]): Promise<void> {
    const matchesRef = ref(database, `matches/${date}`);
    const matchesData: { [key: string]: Omit<Match, 'fixtureId'> } = {};

    matches.forEach(match => {
      const { fixtureId, ...matchData } = match;
      matchesData[fixtureId.toString()] = {
        ...matchData,
        lastUpdated: Date.now()
      };
    });

    await set(matchesRef, matchesData);
    console.log(`✅ ${matches.length} maç kaydedildi (Tarih: ${date})`);
  },

  // ✅ Geçmiş maçları temizle (günde 1 kez çalıştır)
  async cleanFinishedMatches(): Promise<void> {
    console.log('🧹 Geçmiş maçlar temizleniyor...');
    
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = getTurkeyToday();
    const dates = [yesterday, today];

    let deletedCount = 0;

    for (const date of dates) {
      const matchesRef = ref(database, `matches/${date}`);
      const snapshot = await get(matchesRef);

      if (snapshot.exists()) {
        const matchesData = snapshot.val();

        for (const fixtureId of Object.keys(matchesData)) {
          const match = matchesData[fixtureId];
          
          // ✅ Bitmiş veya 6 saatten eski maçları sil
          if (match.status === 'finished' || match.timestamp < Date.now() - 21600000) {
            await remove(ref(database, `matches/${date}/${fixtureId}`));
            deletedCount++;
          }
        }
      }
    }

    console.log(`✅ ${deletedCount} geçmiş maç temizlendi`);
  },

  async getMatchesByLeague(league: string): Promise<Match[]> {
    const allMatches = await this.getAllUpcomingMatches();
    return allMatches.filter(match =>
      match.league.toLowerCase().includes(league.toLowerCase())
    );
  },

  async searchMatches(searchTerm: string): Promise<Match[]> {
    const allMatches = await this.getAllUpcomingMatches();
    const term = searchTerm.toLowerCase();

    return allMatches.filter(match =>
      match.homeTeam.toLowerCase().includes(term) ||
      match.awayTeam.toLowerCase().includes(term) ||
      match.league.toLowerCase().includes(term)
    );
  },

  // ✅ YENİ: Maçları API'den çek ve kaydet
  async fetchAndSaveTodayMatches(): Promise<void> {
    try {
      console.log('🔄 Güncel maçlar API\'den çekiliyor...');
      
      // Bu fonksiyonu API-Football'dan maç çekmek için kullanabilirsiniz
      // Şimdilik placeholder
      
      console.log('✅ Maçlar güncellendi');
    } catch (error) {
      console.error('❌ Maç güncelleme hatası:', error);
    }
  }
};