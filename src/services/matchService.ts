import { ref, get, set, remove, query, orderByChild, equalTo } from 'firebase/database';
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

      if (match.status === 'finished') return;
      if (match.timestamp < now - 600000) return;

      matches.push({
        fixtureId: parseInt(fixtureId),
        ...match
      });
    });

    return matches
      .filter(m => m.status === 'scheduled' || m.status === 'live')
      .sort((a, b) => {
        if (a.status === 'live' && b.status !== 'live') return -1;
        if (a.status !== 'live' && b.status === 'live') return 1;
        return a.timestamp - b.timestamp;
      });
  },

  async getTodayMatches(): Promise<Match[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getMatchesByDate(today);
  },

  async getTomorrowMatches(): Promise<Match[]> {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return this.getMatchesByDate(tomorrow);
  },

  async getAllUpcomingMatches(): Promise<Match[]> {
    const today = await this.getTodayMatches();
    const tomorrow = await this.getTomorrowMatches();
    return [...today, ...tomorrow];
  },

  async getMatchByFixtureId(fixtureId: number): Promise<Match | null> {
    const dates = [
      new Date().toISOString().split('T')[0],
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    ];

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
      matchesData[fixtureId.toString()] = matchData;
    });

    await set(matchesRef, matchesData);
  },

  async cleanFinishedMatches(): Promise<void> {
    const dates = [
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    ];

    for (const date of dates) {
      const matchesRef = ref(database, `matches/${date}`);
      const snapshot = await get(matchesRef);

      if (snapshot.exists()) {
        const matchesData = snapshot.val();
        const updates: { [key: string]: null } = {};

        Object.keys(matchesData).forEach(fixtureId => {
          const match = matchesData[fixtureId];
          if (match.status === 'finished' || match.timestamp < Date.now() - 3600000) {
            updates[fixtureId] = null;
          }
        });

        if (Object.keys(updates).length > 0) {
          for (const fixtureId of Object.keys(updates)) {
            await remove(ref(database, `matches/${date}/${fixtureId}`));
          }
        }
      }
    }
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
  }
};
