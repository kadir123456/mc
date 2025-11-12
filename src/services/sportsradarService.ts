import axios from 'axios';
import { ref, get, set } from 'firebase/database';
import { database } from './firebase';
import { DetectedMatch } from './geminiVisionService';

const SPORTSRADAR_API_KEY = import.meta.env.VITE_SPORTSRADAR_API_KEY;
const SPORTSRADAR_BASE_URL = import.meta.env.VITE_SPORTSRADAR_API_BASE_URL;
const IS_TRIAL_MODE = import.meta.env.VITE_SPORTSRADAR_TRIAL_MODE === 'true';
const CACHE_EXPIRY_HOURS = 6;

export interface SportsradarMatchData {
  matchId: string;
  teamHome: string;
  teamAway: string;
  league: string;
  homeForm: string;
  awayForm: string;
  h2h: string;
  injuries: string;
  leaguePosition: string;
  dataSources: string[];
  confidenceScore: number;
  lastUpdated: number;
  sportsradarId?: string;
}

interface SportsradarTeamStats {
  teamId: string;
  teamName: string;
  recentMatches?: any[];
  standings?: any;
  injuries?: any[];
}

const getApiPath = (endpoint: string): string => {
  const trialSegment = IS_TRIAL_MODE ? '/trial' : '/official';
  return `${SPORTSRADAR_BASE_URL}/soccer${trialSegment}/v4/en${endpoint}`;
};

const makeApiRequest = async (endpoint: string, timeout = 15000): Promise<any> => {
  const url = getApiPath(endpoint);

  try {
    const response = await axios.get(url, {
      headers: {
        'accept': 'application/json',
        'x-api-key': SPORTSRADAR_API_KEY,
      },
      timeout,
    });

    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error(`❌ Sportsradar API hatası: ${error.response.status}`, error.response.data);
      throw new Error(`Sportsradar API hatası: ${error.response.status}`);
    }
    throw error;
  }
};

const findTeamByName = async (teamName: string): Promise<string | null> => {
  try {
    console.log(`🔍 Sportsradar: "${teamName}" aranıyor...`);

    const competitions = await makeApiRequest('/competitions.json');

    if (!competitions?.competitions) {
      return null;
    }

    for (const competition of competitions.competitions.slice(0, 20)) {
      try {
        const standings = await makeApiRequest(`/competitions/${competition.id}/standings.json`);

        if (standings?.standings) {
          for (const group of standings.standings) {
            for (const teamData of group.groups || []) {
              for (const team of teamData.team_standings || []) {
                if (team.team?.name?.toLowerCase().includes(teamName.toLowerCase())) {
                  console.log(`✅ Takım bulundu: ${team.team.name} (ID: ${team.team.id})`);
                  return team.team.id;
                }
              }
            }
          }
        }
      } catch (error) {
        continue;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return null;
  } catch (error: any) {
    console.error('❌ Takım arama hatası:', error.message);
    return null;
  }
};

const getTeamStats = async (teamId: string, teamName: string): Promise<SportsradarTeamStats | null> => {
  try {
    console.log(`📊 Sportsradar: ${teamName} için istatistikler alınıyor...`);

    const teamProfile = await makeApiRequest(`/teams/${teamId}/profile.json`, 20000);

    if (!teamProfile) {
      return null;
    }

    return {
      teamId,
      teamName,
      recentMatches: teamProfile.results || [],
      standings: teamProfile.rankings?.[0] || null,
      injuries: teamProfile.squad?.filter((p: any) => p.type === 'injured') || [],
    };
  } catch (error: any) {
    console.error(`❌ ${teamName} istatistik hatası:`, error.message);
    return null;
  }
};

const formatRecentForm = (matches: any[]): string => {
  if (!matches || matches.length === 0) {
    return 'Form bilgisi yok';
  }

  const last5 = matches.slice(0, 5);
  const results = last5.map((m: any) => {
    if (m.outcome === 'win') return 'G';
    if (m.outcome === 'loss') return 'K';
    return 'B';
  });

  const wins = results.filter(r => r === 'G').length;
  const draws = results.filter(r => r === 'B').length;
  const losses = results.filter(r => r === 'K').length;

  const goalsScored = last5.reduce((sum, m) => sum + (m.home_score || 0) + (m.away_score || 0), 0);

  return `Son 5: ${results.join('-')} (${wins}G ${draws}B ${losses}K) | ${goalsScored} gol`;
};

const formatInjuries = (injuries: any[]): string => {
  if (!injuries || injuries.length === 0) {
    return 'Sakatlık bilgisi yok';
  }

  return `${injuries.length} oyuncu sakat`;
};

const formatStandings = (standings: any): string => {
  if (!standings) {
    return 'Lig sıralaması bilgisi yok';
  }

  return `${standings.rank || '?'}. sıra | ${standings.points || 0} puan`;
};

export const sportsradarService = {
  async fetchMatchData(match: DetectedMatch): Promise<SportsradarMatchData> {
    const cacheKey = `sportsradar_cache/${match.league}/${match.teamHome}_${match.teamAway}`.replace(/[.#$[\]]/g, '_');

    try {
      const cacheRef = ref(database, cacheKey);
      const snapshot = await get(cacheRef);

      if (snapshot.exists()) {
        const cached = snapshot.val() as SportsradarMatchData;
        const hoursSinceUpdate = (Date.now() - cached.lastUpdated) / (1000 * 60 * 60);

        if (hoursSinceUpdate < CACHE_EXPIRY_HOURS) {
          console.log(`✅ Sportsradar Cache HIT: ${match.teamHome} vs ${match.teamAway}`);
          return cached;
        }
      }

      console.log(`🌐 Sportsradar: ${match.teamHome} vs ${match.teamAway} için canlı veri çekiliyor...`);
      console.warn('⚠️ Not: Trial API kullanılıyor - Kadın futbolu ve bazı ligler desteklenmiyor');

      const homeTeamId = await findTeamByName(match.teamHome);
      const awayTeamId = await findTeamByName(match.teamAway);

      let homeStats: SportsradarTeamStats | null = null;
      let awayStats: SportsradarTeamStats | null = null;

      if (homeTeamId) {
        homeStats = await getTeamStats(homeTeamId, match.teamHome);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (awayTeamId) {
        awayStats = await getTeamStats(awayTeamId, match.teamAway);
      }

      const homeForm = homeStats ? formatRecentForm(homeStats.recentMatches || []) : 'Veri bulunamadı';
      const awayForm = awayStats ? formatRecentForm(awayStats.recentMatches || []) : 'Veri bulunamadı';
      const homeInjuries = homeStats ? formatInjuries(homeStats.injuries || []) : 'Veri bulunamadı';
      const awayInjuries = awayStats ? formatInjuries(awayStats.injuries || []) : 'Veri bulunamadı';
      const homePosition = homeStats ? formatStandings(homeStats.standings) : 'Veri bulunamadı';
      const awayPosition = awayStats ? formatStandings(awayStats.standings) : 'Veri bulunamadı';

      const confidenceScore = (homeStats && awayStats) ? 90 : (homeStats || awayStats) ? 60 : 30;

      const matchData: SportsradarMatchData = {
        matchId: match.matchId,
        teamHome: match.teamHome,
        teamAway: match.teamAway,
        league: match.league,
        homeForm,
        awayForm,
        h2h: 'Kafa kafaya veri (Sportsradar API sınırlaması nedeniyle şu an mevcut değil)',
        injuries: `Ev Sahibi: ${homeInjuries} | Deplasman: ${awayInjuries}`,
        leaguePosition: `Ev Sahibi: ${homePosition} | Deplasman: ${awayPosition}`,
        dataSources: ['Sportsradar Soccer API'],
        confidenceScore,
        lastUpdated: Date.now(),
      };

      await set(cacheRef, matchData);
      console.log(`✅ Sportsradar: ${match.teamHome} vs ${match.teamAway} verileri cache'lendi`);

      return matchData;

    } catch (error: any) {
      console.error(`❌ Sportsradar hatası: ${match.teamHome} vs ${match.teamAway}`, error.message);

      return {
        matchId: match.matchId,
        teamHome: match.teamHome,
        teamAway: match.teamAway,
        league: match.league,
        homeForm: 'Sportsradar API hatası',
        awayForm: 'Sportsradar API hatası',
        h2h: 'Sportsradar API hatası',
        injuries: 'Sportsradar API hatası',
        leaguePosition: 'Sportsradar API hatası',
        dataSources: [],
        confidenceScore: 0,
        lastUpdated: Date.now(),
      };
    }
  },

  async fetchAllMatches(matches: DetectedMatch[]): Promise<SportsradarMatchData[]> {
    console.log(`🔄 Sportsradar: ${matches.length} maç için veri toplama başlıyor...`);

    const results: SportsradarMatchData[] = [];

    for (const match of matches) {
      const data = await this.fetchMatchData(match);
      results.push(data);

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`✅ Sportsradar: Tüm maçlar için veri toplama tamamlandı`);
    return results;
  },
};
