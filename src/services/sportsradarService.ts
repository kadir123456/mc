import axios from 'axios';

// Render.com'da çalışan backend proxy URL'i
const PROXY_URL = '/api/sportsradar-proxy';

// Cache
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 300000; // 5 dakika

interface TeamInfo {
  id: string;
  name: string;
  abbreviation?: string;
  country?: string;
}

interface MatchStats {
  teamHome: string;
  teamAway: string;
  league: string;
  homeForm: string;
  awayForm: string;
  h2h: string;
  injuries: string;
  leaguePosition: string;
  confidenceScore: number;
  dataSources: string[];
}

const sportsradarService = {
  // PROXY ÜZERİNDEN API ÇAĞRISI
  async fetchWithCache<T>(endpoint: string, cacheKey: string): Promise<T> {
    // Cache kontrolü
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`✅ Cache HIT: ${cacheKey}`);
      return cached.data;
    }

    console.log(`🌐 Proxy Request: ${endpoint}`);

    try {
      const response = await axios.get(PROXY_URL, {
        params: { endpoint },
        timeout: 30000,
      });

      // Cache'e kaydet
      requestCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('Rate limit aşıldı. Lütfen bekleyin.');
      }
      console.error('Sportsradar hatası:', error.response?.data || error.message);
      throw error;
    }
  },

  // 1. LİGLERİ ÇEK
  async getCompetitions(): Promise<any[]> {
    try {
      const data = await this.fetchWithCache<any>('/competitions.json', 'all_competitions');
      return data.competitions || [];
    } catch (error) {
      console.error('Ligler çekilemedi:', error);
      return [];
    }
  },

  // 2. PUAN DURUMU
  async getSeasonStandings(competitionId: string): Promise<any[]> {
    try {
      const data = await this.fetchWithCache<any>(
        `/competitions/${competitionId}/standings.json`,
        `standings_${competitionId}`
      );
      if (data.standings && data.standings.length > 0) {
        return data.standings[0].groups[0].team_standings || [];
      }
      return [];
    } catch (error) {
      return [];
    }
  },

  // 3. TAKIM BULMA
  async findTeamInStandings(
    teamName: string,
    competitionId: string
  ): Promise<{ team: TeamInfo; rank: number; points: number; played: number } | null> {
    try {
      const standings = await this.getSeasonStandings(competitionId);
      const normalized = teamName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      for (const standing of standings) {
        const apiName = standing.competitor.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

        if (apiName.includes(normalized) || normalized.includes(apiName)) {
          return {
            team: {
              id: standing.competitor.id,
              name: standing.competitor.name,
              abbreviation: standing.competitor.abbreviation,
            },
            rank: standing.rank,
            points: standing.points,
            played: standing.played,
          };
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  },

  // 4. TAKIM SON MAÇLAR
  async getTeamRecentMatches(teamId: string): Promise<any[]> {
    try {
      const data = await this.fetchWithCache<any>(
        `/competitors/${teamId}/summaries.json`,
        `summaries_${teamId}`
      );
      return data.summaries?.slice(0, 5) || [];
    } catch (error) {
      return [];
    }
  },

  // 5. FORM HESAPLAMA
  async getTeamForm(teamId: string): Promise<string> {
    try {
      const matches = await this.getTeamRecentMatches(teamId);
      if (matches.length === 0) return 'Son maç verisi yok';

      let wins = 0, draws = 0, losses = 0;
      let goalsFor = 0, goalsAgainst = 0;
      const formString: string[] = [];

      for (const match of matches) {
        if (!match.sport_event_status || match.sport_event_status.status !== 'closed') continue;

        const homeTeam = match.sport_event.competitors.find((c: any) => c.qualifier === 'home');
        const isHome = homeTeam.id === teamId;
        const homeScore = match.sport_event_status.home_score;
        const awayScore = match.sport_event_status.away_score;
        const teamScore = isHome ? homeScore : awayScore;
        const opponentScore = isHome ? awayScore : homeScore;

        goalsFor += teamScore;
        goalsAgainst += opponentScore;

        if (teamScore > opponentScore) {
          wins++;
          formString.push('G');
        } else if (teamScore === opponentScore) {
          draws++;
          formString.push('B');
        } else {
          losses++;
          formString.push('M');
        }
      }

      return `Son ${matches.length}: ${formString.join('-')} (${wins}G ${draws}B ${losses}M) | ${goalsFor} gol attı, ${goalsAgainst} yedi`;
    } catch (error) {
      return 'Form verisi alınamadı';
    }
  },

  // 6. H2H
  async getH2H(team1Id: string, team2Id: string): Promise<string> {
    try {
      const data = await this.fetchWithCache<any>(
        `/competitors/${team1Id}/versus/${team2Id}/summaries.json`,
        `h2h_${team1Id}_${team2Id}`
      );

      if (!data.last_meetings || data.last_meetings.length === 0) {
        return 'H2H verisi yok';
      }

      const scores = data.last_meetings.slice(0, 5).map((match: any) => {
        const homeScore = match.sport_event_status?.home_score || 0;
        const awayScore = match.sport_event_status?.away_score || 0;
        return `${homeScore}-${awayScore}`;
      });

      return `Son ${data.last_meetings.slice(0, 5).length} karşılaşma: ${scores.join(', ')}`;
    } catch (error) {
      return 'H2H verisi alınamadı';
    }
  },

  // 7. ANA FONKSİYON
  async getMatchData(
    homeTeam: string,
    awayTeam: string,
    league: string
  ): Promise<MatchStats | null> {
    try {
      console.log(`🏟️ Sportsradar: ${homeTeam} vs ${awayTeam}`);

      // Popüler liglerde ara
      const popularLeagues = [
        'sr:competition:8',   // Premier League
        'sr:competition:23',  // La Liga
        'sr:competition:17',  // Bundesliga
        'sr:competition:34',  // Serie A
        'sr:competition:53',  // Ligue 1
        'sr:competition:679', // Türkiye Süper Lig
      ];

      let homeTeamInfo = null;
      let awayTeamInfo = null;
      let foundCompetition = null;

      for (const compId of popularLeagues) {
        try {
          homeTeamInfo = await this.findTeamInStandings(homeTeam, compId);
          if (homeTeamInfo) {
            awayTeamInfo = await this.findTeamInStandings(awayTeam, compId);
            if (awayTeamInfo) {
              foundCompetition = compId;
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }

      if (!homeTeamInfo || !awayTeamInfo) {
        console.warn('⚠️ Takımlar bulunamadı');
        return null;
      }

      console.log(`✅ Takımlar bulundu: ${homeTeamInfo.team.name} vs ${awayTeamInfo.team.name}`);

      const [homeForm, awayForm, h2h] = await Promise.all([
        this.getTeamForm(homeTeamInfo.team.id),
        this.getTeamForm(awayTeamInfo.team.id),
        this.getH2H(homeTeamInfo.team.id, awayTeamInfo.team.id),
      ]);

      const confidence = this.calculateConfidence(
        homeForm,
        awayForm,
        h2h,
        homeTeamInfo.rank,
        awayTeamInfo.rank
      );

      return {
        teamHome: homeTeamInfo.team.name,
        teamAway: awayTeamInfo.team.name,
        league,
        homeForm,
        awayForm,
        h2h,
        injuries: 'Sakatlık verisi trial sürümde mevcut değil',
        leaguePosition: `Ev: ${homeTeamInfo.rank}. sıra (${homeTeamInfo.points} puan) | Deplasman: ${awayTeamInfo.rank}. sıra (${awayTeamInfo.points} puan)`,
        confidenceScore: confidence,
        dataSources: ['Sportsradar API (Render.com Proxy)'],
      };
    } catch (error) {
      console.error('❌ Sportsradar hatası:', error);
      return null;
    }
  },

  calculateConfidence(
    homeForm: string,
    awayForm: string,
    h2h: string,
    homeRank: number,
    awayRank: number
  ): number {
    let score = 50;
    const homeWins = (homeForm.match(/G/g) || []).length;
    const awayWins = (awayForm.match(/G/g) || []).length;
    score += (homeWins - awayWins) * 8;
    const rankDiff = awayRank - homeRank;
    score += Math.min(20, Math.max(-20, rankDiff * 2));
    if (h2h !== 'H2H verisi yok' && !h2h.includes('alınamadı')) score += 15;
    if (homeForm.includes('yok') || awayForm.includes('yok')) score -= 20;
    return Math.max(30, Math.min(100, Math.round(score)));
  },

  clearCache() {
    requestCache.clear();
  },
};

export default sportsradarService;
