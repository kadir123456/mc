import axios from 'axios';

// ✅ Backend aynı sunucuda çalışıyor, relatif URL kullan
const BACKEND_PROXY_URL = '';

// Cache
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 86400000; // 24 saat

interface TeamInfo {
  id: number;
  name: string;
  code?: string;
  country?: string;
  logo?: string;
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
  // ✅ BACKEND PROXY ÜZERİNDEN İSTEK
  async fetchWithCache<T>(endpoint: string, params: any = {}, cacheKey: string): Promise<T> {
    // Cache kontrolü
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`✅ Cache HIT: ${cacheKey}`);
      return cached.data;
    }

    console.log(`🌐 Backend Proxy Request: ${endpoint}`, params);

    try {
      // ✅ Backend proxy üzerinden istek
      const response = await axios.get(`${BACKEND_PROXY_URL}/api/football/${endpoint}`, {
        params,
        timeout: 30000,
      });

      console.log(`📊 API Response:`, response.data);

      if (!response.data || !response.data.response) {
        throw new Error('API yanıt verisi yok');
      }

      if (response.data.errors && response.data.errors.length > 0) {
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
        throw new Error('⚠️ API rate limit aşıldı. Lütfen bekleyin.');
      }
      if (error.response?.status === 401) {
        throw new Error('❌ API key geçersiz!');
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('⏱️ İstek zaman aşımına uğradı');
      }
      console.error('❌ API hatası:', error.response?.data || error.message);
      throw error;
    }
  },

  // ✅ LİG ID'Sİ BULMA (Düzeltildi)
  async findLeagueId(leagueName: string): Promise<number | null> {
    try {
      const leagueMap: { [key: string]: number } = {
        'premier league': 39,
        'la liga': 140,
        'bundesliga': 78,
        'serie a': 135,
        'ligue 1': 61,
        'süper lig': 203,
        'süperlig': 203,
        'champions league': 2,
        'uefa champions league': 2,
        'europa league': 3,
        'dünya kupası': 1,
        'world cup': 1,
        'wcq concacaf': 34,
        'concacaf nations league': 33,
        'concacaf': 34,
        'copa america': 9,
        'african cup': 31,
        'afcon': 31,
        'u21 avrupa şampiyonası': 848,
        'u21 euro': 848,
        'u19 euro': 847,
      };

      const normalized = leagueName.toLowerCase().trim().replace(/\s+/g, ' ');

      for (const [key, id] of Object.entries(leagueMap)) {
        if (normalized.includes(key) || key.includes(normalized)) {
          console.log(`✅ Lig bulundu (cache): ${leagueName} → ID: ${id}`);
          return id;
        }
      }

      console.log(`🔍 API'den lig aranıyor: ${leagueName}`);
      const data = await this.fetchWithCache<any[]>(
        'leagues',
        { search: leagueName, current: true },
        `league_search_${normalized}`
      );

      if (data && data.length > 0) {
        const leagueId = data[0].league.id;
        console.log(`✅ Lig bulundu (API): ${data[0].league.name} → ID: ${leagueId}`);
        return leagueId;
      }

      console.warn(`⚠️ Lig bulunamadı: ${leagueName}`);
      return null;
    } catch (error) {
      console.error('❌ Lig arama hatası:', error);
      return null;
    }
  },

  // ✅ TAKIM BULMA (Düzeltildi - daha iyi matching)
  async findTeam(teamName: string, leagueId?: number): Promise<TeamInfo | null> {
    try {
      console.log(`🔍 Takım aranıyor: ${teamName}${leagueId ? ` (Lig: ${leagueId})` : ''}`);

      const normalizedName = teamName
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/fc$/i, '')
        .replace(/^fc\s+/i, '')
        .replace(/\s+u21$/i, '')
        .replace(/\s+u19$/i, '')
        .trim();

      const searchTerms = [
        teamName,
        normalizedName,
        teamName.split(' ')[0],
        normalizedName.split(' ')[0]
      ];

      for (const searchTerm of searchTerms) {
        if (!searchTerm || searchTerm.length < 3) continue;

        const params: any = { search: searchTerm };
        if (leagueId) params.league = leagueId;

        try {
          const data = await this.fetchWithCache<any[]>(
            'teams',
            params,
            `team_${searchTerm}_${leagueId || 'global'}`
          );

          if (data && data.length > 0) {
            for (const item of data) {
              const team = item.team;
              const teamNameLower = team.name.toLowerCase();
              const searchLower = teamName.toLowerCase();

              if (
                teamNameLower.includes(searchLower) ||
                searchLower.includes(teamNameLower) ||
                teamNameLower.replace(/\s+/g, '') === searchLower.replace(/\s+/g, '')
              ) {
                console.log(`✅ Takım bulundu: ${team.name} (ID: ${team.id})`);
                return {
                  id: team.id,
                  name: team.name,
                  code: team.code,
                  country: team.country,
                  logo: team.logo,
                };
              }
            }

            const team = data[0].team;
            console.log(`✅ Takım bulundu (benzer): ${team.name} (ID: ${team.id})`);
            return {
              id: team.id,
              name: team.name,
              code: team.code,
              country: team.country,
              logo: team.logo,
            };
          }
        } catch (err) {
          console.warn(`Arama başarısız: ${searchTerm}`);
          continue;
        }
      }

      console.warn(`⚠️ Takım bulunamadı: ${teamName}`);
      return null;
    } catch (error) {
      console.error('❌ Takım arama hatası:', error);
      return null;
    }
  },

  // ✅ PUAN DURUMU
  async getTeamStanding(teamId: number, leagueId: number, season: number = 2024): Promise<any> {
    try {
      const data = await this.fetchWithCache<any[]>(
        'standings',
        { league: leagueId, season, team: teamId },
        `standings_${leagueId}_${season}_${teamId}`
      );

      if (!data || data.length === 0) return null;

      const standings = data[0]?.league?.standings;
      if (!standings || standings.length === 0) return null;

      for (const group of standings) {
        const teamStanding = group.find((s: any) => s.team.id === teamId);
        if (teamStanding) {
          console.log(`✅ Puan durumu: ${teamStanding.rank}. sıra, ${teamStanding.points} puan`);
          return teamStanding;
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Puan durumu hatası:', error);
      return null;
    }
  },

  // ✅ TAKIM FORMU
  async getTeamForm(teamId: number, last: number = 5): Promise<string> {
    try {
      const data = await this.fetchWithCache<any[]>(
        'fixtures',
        { team: teamId, last, status: 'FT' },
        `form_${teamId}_${last}`
      );

      if (!data || data.length === 0) {
        return 'Veri yok';
      }

      let wins = 0, draws = 0, losses = 0;
      let goalsFor = 0, goalsAgainst = 0;
      const formString: string[] = [];

      for (const fixture of data) {
        const isHome = fixture.teams.home.id === teamId;
        const teamGoals = isHome ? fixture.goals.home : fixture.goals.away;
        const opponentGoals = isHome ? fixture.goals.away : fixture.goals.home;

        goalsFor += teamGoals || 0;
        goalsAgainst += opponentGoals || 0;

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

      const result = `Son ${data.length}: ${formString.join('-')} (${wins}G ${draws}B ${losses}M) | ${goalsFor} attı, ${goalsAgainst} yedi`;
      console.log(`✅ Form: ${result}`);
      return result;
    } catch (error) {
      console.error('❌ Form hatası:', error);
      return 'Veri alınamadı';
    }
  },

  // ✅ HEAD TO HEAD
  async getH2H(team1Id: number, team2Id: number): Promise<string> {
    try {
      const data = await this.fetchWithCache<any[]>(
        'fixtures/headtohead',
        { h2h: `${team1Id}-${team2Id}`, last: 5 },
        `h2h_${team1Id}_${team2Id}`
      );

      if (!data || data.length === 0) {
        return 'H2H verisi yok';
      }

      const scores = data.map((fixture: any) => {
        const home = fixture.goals.home;
        const away = fixture.goals.away;
        return `${home}-${away}`;
      });

      let team1Wins = 0;
      data.forEach((fixture: any) => {
        const homeId = fixture.teams.home.id;
        const homeGoals = fixture.goals.home;
        const awayGoals = fixture.goals.away;

        if (homeId === team1Id && homeGoals > awayGoals) team1Wins++;
        if (homeId === team2Id && awayGoals > homeGoals) team1Wins++;
      });

      const result = `Son ${data.length}: ${scores.join(', ')} (Ev sahibi ${team1Wins} galibiyet)`;
      console.log(`✅ H2H: ${result}`);
      return result;
    } catch (error) {
      console.error('❌ H2H hatası:', error);
      return 'Veri alınamadı';
    }
  },

  // ✅ ANA FONKSİYON
  async getMatchData(
    homeTeam: string,
    awayTeam: string,
    league: string
  ): Promise<MatchStats | null> {
    try {
      console.log(`\n🏟️ === MAÇ ANALİZİ BAŞLIYOR ===`);
      console.log(`Ev Sahibi: ${homeTeam}`);
      console.log(`Deplasman: ${awayTeam}`);
      console.log(`Lig: ${league}\n`);

      const leagueId = await this.findLeagueId(league);

      let homeTeamInfo, awayTeamInfo;

      if (leagueId) {
        console.log(`\n🔍 Takımlar aranıyor (Lig ID: ${leagueId})...`);
        [homeTeamInfo, awayTeamInfo] = await Promise.all([
          this.findTeam(homeTeam, leagueId),
          this.findTeam(awayTeam, leagueId),
        ]);
      }

      if (!homeTeamInfo || !awayTeamInfo) {
        console.log(`\n🔍 Takımlar lig olmadan aranıyor...`);
        [homeTeamInfo, awayTeamInfo] = await Promise.all([
          this.findTeam(homeTeam),
          this.findTeam(awayTeam),
        ]);
      }

      if (!homeTeamInfo || !awayTeamInfo) {
        console.warn(`⚠️ Takımlar bulunamadı`);
        return {
          teamHome: homeTeam,
          teamAway: awayTeam,
          league,
          homeForm: 'Veri alınamadı',
          awayForm: 'Veri alınamadı',
          h2h: 'Veri alınamadı',
          injuries: 'Veri alınamadı',
          leaguePosition: 'Veri alınamadı',
          confidenceScore: 30,
          dataSources: ['Temel Analiz'],
        };
      }

      console.log(`\n✅ Takımlar bulundu!`);
      console.log(`Ev Sahibi: ${homeTeamInfo.name} (ID: ${homeTeamInfo.id})`);
      console.log(`Deplasman: ${awayTeamInfo.name} (ID: ${awayTeamInfo.id})`);

      console.log(`\n📊 İstatistikler çekiliyor...`);

      const [homeStanding, awayStanding, homeForm, awayForm, h2h] = await Promise.allSettled([
        leagueId ? this.getTeamStanding(homeTeamInfo.id, leagueId) : Promise.resolve(null),
        leagueId ? this.getTeamStanding(awayTeamInfo.id, leagueId) : Promise.resolve(null),
        this.getTeamForm(homeTeamInfo.id),
        this.getTeamForm(awayTeamInfo.id),
        this.getH2H(homeTeamInfo.id, awayTeamInfo.id),
      ]);

      const homeStandingData = homeStanding.status === 'fulfilled' ? homeStanding.value : null;
      const awayStandingData = awayStanding.status === 'fulfilled' ? awayStanding.value : null;
      const homeFormData = homeForm.status === 'fulfilled' ? homeForm.value : 'Veri yok';
      const awayFormData = awayForm.status === 'fulfilled' ? awayForm.value : 'Veri yok';
      const h2hData = h2h.status === 'fulfilled' ? h2h.value : 'H2H verisi yok';

      const leaguePosition = homeStandingData && awayStandingData
        ? `Ev: ${homeStandingData.rank}. sıra (${homeStandingData.points} puan) | Deplasman: ${awayStandingData.rank}. sıra (${awayStandingData.points} puan)`
        : 'Puan durumu yok';

      let confidence = 50;
      if (homeStandingData && awayStandingData) confidence += 15;
      if (homeFormData !== 'Veri yok' && homeFormData !== 'Veri alınamadı') confidence += 15;
      if (awayFormData !== 'Veri yok' && awayFormData !== 'Veri alınamadı') confidence += 10;
      if (h2hData !== 'H2H verisi yok' && h2hData !== 'Veri alınamadı') confidence += 10;

      console.log(`\n✅ === ANALİZ TAMAMLANDI ===`);
      console.log(`Güven Skoru: ${confidence}%`);
      console.log(`Veri Kaynakları: API-Football\n`);

      return {
        teamHome: homeTeamInfo.name,
        teamAway: awayTeamInfo.name,
        league,
        homeForm: homeFormData,
        awayForm: awayFormData,
        h2h: h2hData,
        injuries: 'Sakatlık verisi opsiyonel',
        leaguePosition,
        confidenceScore: confidence,
        dataSources: ['API-Football'],
      };
    } catch (error: any) {
      console.error('\n❌ === ANALİZ BAŞARISIZ ===');
      console.error(`Hata: ${error.message}\n`);

      return {
        teamHome: homeTeam,
        teamAway: awayTeam,
        league,
        homeForm: 'Hata',
        awayForm: 'Hata',
        h2h: 'Hata',
        injuries: 'Hata',
        leaguePosition: 'Hata',
        confidenceScore: 25,
        dataSources: ['Hata'],
      };
    }
  },
};

export default sportsradarService;