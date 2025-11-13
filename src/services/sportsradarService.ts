import axios from 'axios';

// API-Football yapılandırması
const API_FOOTBALL_BASE_URL = import.meta.env.VITE_SPORTSRADAR_API_BASE_URL;
const API_FOOTBALL_KEY = import.meta.env.VITE_SPORTSRADAR_API_KEY;

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
  // API-FOOTBALL İSTEK YÖNTEMİ
  async fetchWithCache<T>(endpoint: string, params: any = {}, cacheKey: string): Promise<T> {
    // Cache kontrolü
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`✅ Cache HIT: ${cacheKey}`);
      return cached.data;
    }

    console.log(`🌐 API-Football Request: ${endpoint}`);

    try {
      const response = await axios.get(`${API_FOOTBALL_BASE_URL}${endpoint}`, {
        params,
        headers: {
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
          'x-rapidapi-key': API_FOOTBALL_KEY,
        },
        timeout: 30000,
      });

      if (!response.data || response.data.errors.length > 0) {
        throw new Error(`API Error: ${JSON.stringify(response.data.errors)}`);
      }

      // Cache'e kaydet
      requestCache.set(cacheKey, {
        data: response.data.response,
        timestamp: Date.now(),
      });

      return response.data.response;
    } catch (error: any) {
      if (error.response?.status === 429) {
        throw new Error('Rate limit aşıldı. Lütfen bekleyin.');
      }
      console.error('API-Football hatası:', error.response?.data || error.message);
      throw error;
    }
  },

  // 1. LİG ID'Sİ BULMA (isimle)
  async findLeagueId(leagueName: string): Promise<number | null> {
    try {
      // Popüler liglerin sabit ID'leri
      const leagueMap: { [key: string]: number } = {
        'premier league': 39,
        'la liga': 140,
        'bundesliga': 78,
        'serie a': 135,
        'ligue 1': 61,
        'süper lig': 203,
        'champions league': 2,
        'europa league': 3,
      };

      const normalized = leagueName.toLowerCase().trim();
      
      // Önce sabit listeden kontrol et
      for (const [key, id] of Object.entries(leagueMap)) {
        if (normalized.includes(key) || key.includes(normalized)) {
          return id;
        }
      }

      // Bulunamazsa API'den ara
      const data = await this.fetchWithCache<any[]>(
        '/v3/leagues',
        { name: leagueName, current: 'true' },
        `league_search_${normalized}`
      );

      if (data && data.length > 0) {
        return data[0].league.id;
      }

      return null;
    } catch (error) {
      console.error('Lig bulunamadı:', error);
      return null;
    }
  },

  // 2. TAKIM BULMA
  async findTeam(teamName: string, leagueId?: number): Promise<{ id: number; name: string } | null> {
    try {
      const params: any = { search: teamName };
      if (leagueId) params.league = leagueId;

      const data = await this.fetchWithCache<any[]>(
        '/v3/teams',
        params,
        `team_search_${teamName}_${leagueId || 'all'}`
      );

      if (!data || data.length === 0) return null;

      const normalized = teamName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // En iyi eşleşmeyi bul
      for (const item of data) {
        const apiName = item.team.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (apiName.includes(normalized) || normalized.includes(apiName)) {
          return {
            id: item.team.id,
            name: item.team.name,
          };
        }
      }

      // Tam eşleşme yoksa ilk sonucu döndür
      return {
        id: data[0].team.id,
        name: data[0].team.name,
      };
    } catch (error) {
      console.error('Takım bulunamadı:', error);
      return null;
    }
  },

  // 3. PUAN DURUMU
  async getTeamStanding(teamId: number, leagueId: number, season: number = 2024): Promise<any> {
    try {
      const data = await this.fetchWithCache<any[]>(
        '/v3/standings',
        { league: leagueId, season, team: teamId },
        `standings_${leagueId}_${season}_${teamId}`
      );

      if (!data || data.length === 0) return null;

      const standings = data[0].league.standings[0];
      const teamStanding = standings.find((s: any) => s.team.id === teamId);

      return teamStanding || null;
    } catch (error) {
      console.error('Puan durumu alınamadı:', error);
      return null;
    }
  },

  // 4. TAKIM FORMU (Son 5 maç)
  async getTeamForm(teamId: number, last: number = 5): Promise<string> {
    try {
      const data = await this.fetchWithCache<any[]>(
        '/v3/fixtures',
        { team: teamId, last },
        `form_${teamId}_${last}`
      );

      if (!data || data.length === 0) return 'Son maç verisi yok';

      let wins = 0, draws = 0, losses = 0;
      let goalsFor = 0, goalsAgainst = 0;
      const formString: string[] = [];

      for (const fixture of data) {
        const isHome = fixture.teams.home.id === teamId;
        const teamGoals = isHome ? fixture.goals.home : fixture.goals.away;
        const opponentGoals = isHome ? fixture.goals.away : fixture.goals.home;

        goalsFor += teamGoals;
        goalsAgainst += opponentGoals;

        if (teamGoals > opponentGoals) {
          wins++;
          formString.push('G');
        } else if (teamGoals === opponentGoals) {
          draws++;
          formString.push('B');
        } else {
          losses++;
          formString.push('M');
        }
      }

      return `Son ${data.length}: ${formString.join('-')} (${wins}G ${draws}B ${losses}M) | ${goalsFor} gol attı, ${goalsAgainst} yedi`;
    } catch (error) {
      console.error('Form alınamadı:', error);
      return 'Form verisi alınamadı';
    }
  },

  // 5. HEAD TO HEAD
  async getH2H(team1Id: number, team2Id: number): Promise<string> {
    try {
      const data = await this.fetchWithCache<any[]>(
        '/v3/fixtures/headtohead',
        { h2h: `${team1Id}-${team2Id}`, last: 5 },
        `h2h_${team1Id}_${team2Id}`
      );

      if (!data || data.length === 0) {
        return 'H2H verisi yok';
      }

      const scores = data.map((fixture: any) => {
        return `${fixture.goals.home}-${fixture.goals.away}`;
      });

      return `Son ${data.length} karşılaşma: ${scores.join(', ')}`;
    } catch (error) {
      console.error('H2H alınamadı:', error);
      return 'H2H verisi alınamadı';
    }
  },

  // 6. SAKATLIKLAR
  async getInjuries(teamId: number): Promise<string> {
    try {
      const data = await this.fetchWithCache<any[]>(
        '/v3/injuries',
        { team: teamId },
        `injuries_${teamId}`
      );

      if (!data || data.length === 0) {
        return 'Sakatlık bilgisi yok';
      }

      const injuries = data.slice(0, 3).map((inj: any) => {
        return `${inj.player.name} (${inj.player.reason})`;
      });

      return injuries.length > 0 ? `Sakatlıklar: ${injuries.join(', ')}` : 'Sakatlık bilgisi yok';
    } catch (error) {
      console.error('Sakatlık verisi alınamadı:', error);
      return 'Sakatlık verisi alınamadı';
    }
  },

  // 7. ANA FONKSİYON
  async getMatchData(
    homeTeam: string,
    awayTeam: string,
    league: string
  ): Promise<MatchStats | null> {
    try {
      console.log(`🏟️ API-Football: ${homeTeam} vs ${awayTeam}`);

      // Lig ID'sini bul
      const leagueId = await this.findLeagueId(league);
      if (!leagueId) {
        console.warn('⚠️ Lig bulunamadı');
        return null;
      }

      // Takımları bul
      const [homeTeamInfo, awayTeamInfo] = await Promise.all([
        this.findTeam(homeTeam, leagueId),
        this.findTeam(awayTeam, leagueId),
      ]);

      if (!homeTeamInfo || !awayTeamInfo) {
        console.warn('⚠️ Takımlar bulunamadı');
        return null;
      }

      console.log(`✅ Takımlar bulundu: ${homeTeamInfo.name} vs ${awayTeamInfo.name}`);

      // Paralel veri çekimi
      const [homeStanding, awayStanding, homeForm, awayForm, h2h, homeInjuries, awayInjuries] = 
        await Promise.all([
          this.getTeamStanding(homeTeamInfo.id, leagueId),
          this.getTeamStanding(awayTeamInfo.id, leagueId),
          this.getTeamForm(homeTeamInfo.id),
          this.getTeamForm(awayTeamInfo.id),
          this.getH2H(homeTeamInfo.id, awayTeamInfo.id),
          this.getInjuries(homeTeamInfo.id),
          this.getInjuries(awayTeamInfo.id),
        ]);

      const leaguePosition = homeStanding && awayStanding
        ? `Ev: ${homeStanding.rank}. sıra (${homeStanding.points} puan) | Deplasman: ${awayStanding.rank}. sıra (${awayStanding.points} puan)`
        : 'Puan durumu bilgisi yok';

      const injuries = `Ev: ${homeInjuries} | Deplasman: ${awayInjuries}`;

      const confidence = this.calculateConfidence(
        homeForm,
        awayForm,
        h2h,
        homeStanding?.rank || 10,
        awayStanding?.rank || 10
      );

      return {
        teamHome: homeTeamInfo.name,
        teamAway: awayTeamInfo.name,
        league,
        homeForm,
        awayForm,
        h2h,
        injuries,
        leaguePosition,
        confidenceScore: confidence,
        dataSources: ['API-Football (RapidAPI)'],
      };
    } catch (error) {
      console.error('❌ API-Football hatası:', error);
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
