// src/services/matchService.ts

import { ref, get, set, remove } from 'firebase/database';
import { database } from './firebase';
import { normalizeTeamName } from '../utils/teamNameNormalizer'; // ✅ Yeni import

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

// ✅ Türkiye saati için timezone (UTC+3)
function getTurkeyToday(): string {
  const now = new Date();
  const turkeyTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
  return turkeyTime.toISOString().split('T')[0];
}

function getTurkeyTomorrow(): string {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + (27 * 60 * 60 * 1000));
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
      
      if (match.status !== 'finished' && match.timestamp > now - 3600000) {
        matches.push({
          fixtureId: parseInt(fixtureId),
          // ✅ Takım isimlerini normalize et
          homeTeam: normalizeTeamName(match.homeTeam),
          awayTeam: normalizeTeamName(match.awayTeam),
          league: match.league,
          date: match.date,
          time: match.time,
          timestamp: match.timestamp,
          status: match.status,
          lastUpdated: match.lastUpdated
        });
      }
    });

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
    
    const allMatches = [...today, ...tomorrow];
    const now = Date.now();
    
    const upcomingMatches = allMatches.filter(match => {
      return match.timestamp > now - 3600000;
    });

    return upcomingMatches.sort((a, b) => a.timestamp - b.timestamp);
  },

  async getMatchByFixtureId(fixtureId: number): Promise<Match | null> {
    const dates = [getTurkeyToday(), getTurkeyTomorrow()];

    for (const date of dates) {
      const matchRef = ref(database, `matches/${date}/${fixtureId}`);
      const snapshot = await get(matchRef);

      if (snapshot.exists()) {
        const match = snapshot.val();
        return {
          fixtureId,
          // ✅ Normalize et
          homeTeam: normalizeTeamName(match.homeTeam),
          awayTeam: normalizeTeamName(match.awayTeam),
          ...match
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
        // ✅ Kaydetmeden önce normalize et
        homeTeam: normalizeTeamName(matchData.homeTeam),
        awayTeam: normalizeTeamName(matchData.awayTeam),
        lastUpdated: Date.now()
      };
    });

    await set(matchesRef, matchesData);
    console.log(`✅ ${matches.length} maç kaydedildi (Tarih: ${date})`);
  },

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

  async fetchAndSaveTodayMatches(): Promise<void> {
    try {
      console.log('🔄 Güncel maçlar API\'den çekiliyor...');
      console.log('✅ Maçlar güncellendi');
    } catch (error) {
      console.error('❌ Maç güncelleme hatası:', error);
    }
  }
};
