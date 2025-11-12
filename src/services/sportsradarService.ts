import axios from 'axios';

const API_KEY = import.meta.env.VITE_SPORTSRADAR_API_KEY;
const API_BASE = import.meta.env.VITE_SPORTSRADAR_API_BASE_URL;
const TRIAL_MODE = import.meta.env.VITE_SPORTSRADAR_TRIAL_MODE === 'true';
const ACCESS_LEVEL = TRIAL_MODE ? 'trial' : 'production';
const LANGUAGE = 'en';

// Cache için rate limit koruma
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 300000; // 5 dakika (API TTL: 300s)

interface TeamInfo {
  id: string;
  name: string;
  abbreviation?: string;
  country?: string;
}

interface CompetitionInfo {
  id: string;
  name: string;
  category: {
    id: string;
    name: string;
    country_code: string;
  };
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
  // Rate limit korumalı API çağrısı
  async fetchWithCache<T>(endpoint: string, cacheKey: string): Promise<T> {
    // Cache kontrolü
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`✅ Sportsradar Cache HIT: ${cacheKey}`);
      return cached.data;
    }

    // Trial mode request limiti
    if (TRIAL_MODE && requestCache.size > 40) {
      console.warn('⚠️ Trial mode request limiti yaklaşıldı');
      throw new Error('Rate limit yaklaşıldı, lütfen bekleyin');
    }

    const url = `${API_BASE}/soccer/${ACCESS_LEVEL}/v4/${LANGUAGE}${endpoint}`;
    console.log(`🌐 Sportsradar Request: ${endpoint}`);

    try {
      const response = await axios.get(url, {
        params: { api_key: API_KEY },
        timeout: 30000,
        headers: { accept: 'application/json' },
      });

      // Cache'e kaydet
      requestCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('Rate limit aşıldı. Lütfen birkaç dakika bekleyin.');
      }
      if (error.response?.status === 404) {
        throw new Error('Veri bulunamadı');
      }
      console.error('Sportsradar API hatası:', error.response?.data || error.message);
      throw error;
    }
  },

  // 1. TÜM LİGLERİ ÇEK (Competitions)
  async getCompetitions(): Promise<CompetitionInfo[]> {
    try {
      const data = await this.fetchWithCache<any>(
        '/competitions.json',
        'all_competitions'
      );

      return data.competitions || [];
    } catch (error) {
      console.error('Ligler çekilemedi:', error);
      return [];
    }
  },

  // 2. LİG BULMA (Takım adından lig bul)
  async findCompetitionByTeamName(teamName: string): Promise<string | null> {
    try {
      const competitions = await this.getCompetitions();

      // Popüler ligleri önceliklendir
      const popularLeagues = [
        'sr:competition:8', // Premier League
        'sr:competition:23', // La Liga
        'sr:competition:17', // Bundesliga
        'sr:competition:34', // Serie A
        'sr:competition:53', // Ligue 1
        'sr:competition:7', // UEFA Champions League
        'sr:competition:679', // Turkish Super Lig
      ];

      for (const compId of popularLeagues) {
        const comp = competitions.find((c) => c.id === compId);
        if (comp) {
          try {
            const standings = await this.getSeasonStandings(compId);
            if (standings.some((s: any) => 
              s.competitor.name.toLowerCase().includes(teamName.toLowerCase())
            )) {
              return compId;
            }
          } catch (error) {
            continue;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Lig bulunamadı:', error);
      return null;
    }
  },

  // 3. PUAN DURUMU (Season Standings)
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
      console.error('Puan durumu çekilemedi:', error);
      return [];
    }
  },

  // 4. TAKIM BİLGİSİ BULMA
  async findTeamInStandings(
    teamName: string,
    competitionId: string
  ): Promise<{ team: TeamInfo; rank: number; points: number; played: number } | null> {
    try {
      const standings = await this.getSeasonStandings(competitionId);

      const normalizedName = teamName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      for (const standing of standings) {
        const apiTeamName = standing.competitor.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

        if (
          apiTeamName.includes(normalizedName) ||
          normalizedName.includes(apiTeamName)
        ) {
          return {
            team: {
              id: standing.competitor.id,
              name: standing.competitor.name,
              abbreviation: standing.competitor.abbreviation,
              country: standing.competitor.country,
            },
            rank: standing.rank,
            points: standing.points,
            played: standing.played,
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Takım bulunamadı:', error);
      return null;
    }
  },

  // 5. TAKIM SON MAÇLARI (Competitor Summaries)
  async getTeamRecentMatches(teamId: string): Promise<any[]> {
    try {
      const data = await this.fetchWithCache<any>(
        `/competitors/${teamId}/summaries.json`,
        `summaries_${teamId}`
      );

      return data.summaries?.slice(0, 5) || [];
    } catch (error) {
      console.error('Son maçlar çekilemedi:', error);
      return [];
    }
  },

  // 6. TAKIM FORMU HESAPLA
  async getTeamForm(teamId: string, teamName: string): Promise<string> {
    try {
      const matches = await this.getTeamRecentMatches(teamId);

      if (matches.length === 0) {
        return 'Son maç verisi yok';
      }

      let wins = 0,
        draws = 0,
        losses = 0;
      let goalsFor = 0,
        goalsAgainst = 0;
      const formString: string[] = [];

      for (const match of matches) {
        if (!match.sport_event_status || match.sport_event_status.status !== 'closed') {
          continue;
        }

        const homeTeam = match.sport_event.competitors.find((c: any) => c.qualifier === 'home');
        const awayTeam = match.sport_event.competitors.find((c: any) => c.qualifier === 'away');
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
      console.error('Form hesaplanamadı:', error);
      return 'Form verisi alınamadı';
    }
  },

  // 7. KAFA KAFAYA (H2H) - Competitor vs Competitor
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

      let team1Wins = 0,
        team2Wins = 0,
        draws = 0;

      data.last_meetings.slice(0, 5).forEach((match: any) => {
        const homeTeam = match.sport_event.competitors.find((c: any) => c.qualifier === 'home');
        const homeScore = match.sport_event_status?.home_score || 0;
        const awayScore = match.sport_event_status?.away_score || 0;

        const isTeam1Home = homeTeam.id === team1Id;
        const team1Score = isTeam1Home ? homeScore : awayScore;
        const team2Score = isTeam1Home ? awayScore : homeScore;

        if (team1Score > team2Score) team1Wins++;
        else if (team2Score > team1Score) team2Wins++;
        else draws++;
      });

      return `Son ${data.last_meetings.slice(0, 5).length} karşılaşma: ${scores.join(', ')} (${team1Wins}G ${draws}B ${team2Wins}M)`;
    } catch (error) {
      console.error('H2H çekilemedi:', error);
      return 'H2H verisi alınamadı';
    }
  },

  // 8. ANA FONKSİYON - MAÇ VERİSİ TOPLAMA
  async getMatchData(
    homeTeam: string,
    awayTeam: string,
    league: string
  ): Promise<MatchStats | null> {
    try {
      console.log(`🏟️ Sportsradar: ${homeTeam} vs ${awayTeam} (${league})`);

      // 1. Lig ID bul
      let competitionId = await this.findCompetitionByTeamName(homeTeam);
      
      if (!competitionId) {
        console.warn(`⚠️ ${homeTeam} için lig bulunamadı`);
        return null;
      }

      console.log(`✅ Lig bulundu: ${competitionId}`);

      // 2. Takımları bul
      const [homeTeamInfo, awayTeamInfo] = await Promise.all([
        this.findTeamInStandings(homeTeam, competitionId),
        this.findTeamInStandings(awayTeam, competitionId),
      ]);

      if (!homeTeamInfo || !awayTeamInfo) {
        console.warn('⚠️ Takımlar puan durumunda bulunamadı');
        return null;
      }

      console.log(`✅ Takımlar bulundu: ${homeTeamInfo.team.name} vs ${awayTeamInfo.team.name}`);

      // 3. Paralel veri çekme
      const [homeForm, awayForm, h2h] = await Promise.all([
        this.getTeamForm(homeTeamInfo.team.id, homeTeamInfo.team.name),
        this.getTeamForm(awayTeamInfo.team.id, awayTeamInfo.team.name),
        this.getH2H(homeTeamInfo.team.id, awayTeamInfo.team.id),
      ]);

      // 4. Güven skoru hesapla
      const confidence = this.calculateConfidence(
        homeForm,
        awayForm,
        h2h,
        homeTeamInfo.rank,
        awayTeamInfo.rank
      );

      console.log('✅ Sportsradar verisi başarıyla toplandı');

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
        dataSources: ['Sportsradar API (Resmi)'],
      };
    } catch (error) {
      console.error('❌ Sportsradar maç verisi hatası:', error);
      return null;
    }
  },

  // 9. GÜVEN SKORU HESAPLAMA
  calculateConfidence(
    homeForm: string,
    awayForm: string,
    h2h: string,
    homeRank: number,
    awayRank: number
  ): number {
    let score = 50; // Başlangıç

    // Form bazlı (+40 puan)
    const homeWins = (homeForm.match(/G/g) || []).length;
    const awayWins = (awayForm.match(/G/g) || []).length;
    score += (homeWins - awayWins) * 8;

    // Lig sıralaması (+20 puan)
    const rankDiff = awayRank - homeRank;
    score += Math.min(20, Math.max(-20, rankDiff * 2));

    // H2H verisi (+15 puan)
    if (h2h !== 'H2H verisi yok' && !h2h.includes('alınamadı')) {
      score += 15;
    }

    // Veri kalitesi kontrolü
    if (homeForm.includes('yok') || awayForm.includes('yok')) {
      score -= 20;
    }

    // 30-100 arası sınırla
    return Math.max(30, Math.min(100, Math.round(score)));
  },

  // Cache temizleme
  clearCache() {
    requestCache.clear();
    console.log('🗑️ Sportsradar cache temizlendi');
  },
};

export default sportsradarService;
