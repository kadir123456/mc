import axios from 'axios';

const API_KEY = import.meta.env.VITE_SPORTSRADAR_API_KEY;
const API_BASE_URL = import.meta.env.VITE_SPORTSRADAR_API_BASE_URL;
const TRIAL_MODE = import.meta.env.VITE_SPORTSRADAR_TRIAL_MODE === 'true';

// Cache için rate limit koruma
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 saat

interface TeamInfo {
  id: string;
  name: string;
  country: string;
}

interface MatchStats {
  teamHome: string;
  teamAway: string;
  league: string;
  homeForm: string; // "W-W-D-L-W"
  awayForm: string;
  h2h: string;
  injuries: string;
  leaguePosition: string;
  confidenceScore: number;
  dataSources: string[];
}

interface Competition {
  id: string;
  name: string;
  category: {
    id: string;
    name: string;
  };
}

const sportsradarService = {
  // Rate limit koruması ile API çağrısı
  async fetchWithCache<T>(url: string, cacheKey: string): Promise<T> {
    // Cache kontrolü
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`✅ Cache HIT: ${cacheKey}`);
      return cached.data;
    }

    // Trial mode'da request limiti kontrolü
    if (TRIAL_MODE && requestCache.size > 50) {
      console.warn('⚠️ Trial mode request limiti yaklaşıldı, cache kullanılıyor');
      throw new Error('Request limit yaklaşıldı');
    }

    console.log(`🌐 API Request: ${url}`);
    
    try {
      const response = await axios.get(url, {
        params: { api_key: API_KEY },
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
        throw new Error('Rate limit aşıldı. Lütfen birkaç dakika bekleyin.');
      }
      throw error;
    }
  },

  // 1. Takım arama (isimden ID bulma)
  async searchTeam(teamName: string, league?: string): Promise<TeamInfo | null> {
    try {
      // Türkçe karakterleri normalize et
      const normalizedName = teamName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

      // Önce ligleri çek
      const competitions = await this.fetchWithCache<any>(
        `${API_BASE_URL}/soccer/trial/v4/en/competitions.json`,
        'competitions'
      );

      // Takımları ara
      for (const comp of competitions.competitions || []) {
        try {
          const standings = await this.fetchWithCache<any>(
            `${API_BASE_URL}/soccer/trial/v4/en/competitions/${comp.id}/standings.json`,
            `standings_${comp.id}`
          );

          for (const standing of standings.standings || []) {
            for (const team of standing.groups?.[0]?.team_standings || []) {
              const apiTeamName = team.team.name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');

              if (
                apiTeamName.includes(normalizedName) ||
                normalizedName.includes(apiTeamName)
              ) {
                return {
                  id: team.team.id,
                  name: team.team.name,
                  country: team.team.country,
                };
              }
            }
          }
        } catch (error) {
          console.warn(`Lig atlandı: ${comp.name}`);
          continue;
        }
      }

      console.warn(`⚠️ Takım bulunamadı: ${teamName}`);
      return null;
    } catch (error) {
      console.error('Takım arama hatası:', error);
      return null;
    }
  },

  // 2. Takım son maçları (Form)
  async getTeamForm(teamId: string): Promise<string> {
    try {
      const results = await this.fetchWithCache<any>(
        `${API_BASE_URL}/soccer/trial/v4/en/teams/${teamId}/results.json`,
        `results_${teamId}`
      );

      if (!results.results || results.results.length === 0) {
        return 'Veri yok';
      }

      const last5 = results.results.slice(0, 5);
      let wins = 0,
        draws = 0,
        losses = 0;
      let goalsFor = 0,
        goalsAgainst = 0;
      const formString: string[] = [];

      for (const match of last5) {
        const isHome = match.sport_event.competitors[0].id === teamId;
        const teamScore = isHome
          ? match.sport_event_status.home_score
          : match.sport_event_status.away_score;
        const opponentScore = isHome
          ? match.sport_event_status.away_score
          : match.sport_event_status.home_score;

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

      return `Son 5: ${formString.join('-')} (${wins}G ${draws}B ${losses}M) | ${goalsFor} gol attı, ${goalsAgainst} yedi`;
    } catch (error) {
      console.error('Form hatası:', error);
      return 'Form verisi alınamadı';
    }
  },

  // 3. Kafa Kafaya (H2H)
  async getH2H(team1Id: string, team2Id: string): Promise<string> {
    try {
      const results = await this.fetchWithCache<any>(
        `${API_BASE_URL}/soccer/trial/v4/en/teams/${team1Id}/results.json`,
        `results_${team1Id}`
      );

      if (!results.results) {
        return 'H2H verisi yok';
      }

      // İki takım arasındaki maçları filtrele
      const h2hMatches = results.results
        .filter((match: any) => {
          const competitors = match.sport_event.competitors;
          return (
            competitors.some((c: any) => c.id === team1Id) &&
            competitors.some((c: any) => c.id === team2Id)
          );
        })
        .slice(0, 5);

      if (h2hMatches.length === 0) {
        return 'H2H verisi yok';
      }

      const scores = h2hMatches.map((match: any) => {
        const isTeam1Home = match.sport_event.competitors[0].id === team1Id;
        const team1Score = isTeam1Home
          ? match.sport_event_status.home_score
          : match.sport_event_status.away_score;
        const team2Score = isTeam1Home
          ? match.sport_event_status.away_score
          : match.sport_event_status.home_score;
        return `${team1Score}-${team2Score}`;
      });

      return `Son ${h2hMatches.length} karşılaşma: ${scores.join(', ')}`;
    } catch (error) {
      console.error('H2H hatası:', error);
      return 'H2H verisi alınamadı';
    }
  },

  // 4. Lig sıralaması
  async getLeaguePosition(teamId: string, competitionId: string): Promise<string> {
    try {
      const standings = await this.fetchWithCache<any>(
        `${API_BASE_URL}/soccer/trial/v4/en/competitions/${competitionId}/standings.json`,
        `standings_${competitionId}`
      );

      for (const standing of standings.standings || []) {
        for (const team of standing.groups?.[0]?.team_standings || []) {
          if (team.team.id === teamId) {
            return `${team.rank}. sıra (${team.points} puan, ${team.played} maç)`;
          }
        }
      }

      return 'Sıralama verisi yok';
    } catch (error) {
      console.error('Sıralama hatası:', error);
      return 'Sıralama verisi alınamadı';
    }
  },

  // 5. KAPSAMLI MAÇ ANALİZİ (ANA FONKSYON)
  async getMatchData(
    homeTeam: string,
    awayTeam: string,
    league: string
  ): Promise<MatchStats | null> {
    try {
      console.log(`🏟️ Sportsradar'dan veri çekiliyor: ${homeTeam} vs ${awayTeam}`);

      // 1. Takım ID'lerini bul
      const homeTeamInfo = await this.searchTeam(homeTeam, league);
      const awayTeamInfo = await this.searchTeam(awayTeam, league);

      if (!homeTeamInfo || !awayTeamInfo) {
        console.warn('⚠️ Takımlar bulunamadı');
        return null;
      }

      console.log(`✅ Takımlar bulundu: ${homeTeamInfo.name} vs ${awayTeamInfo.name}`);

      // 2. Paralel veri çekme (hızlandırma)
      const [homeForm, awayForm, h2h] = await Promise.all([
        this.getTeamForm(homeTeamInfo.id),
        this.getTeamForm(awayTeamInfo.id),
        this.getH2H(homeTeamInfo.id, awayTeamInfo.id),
      ]);

      // 3. Güven skoru hesapla
      const confidence = this.calculateConfidence(homeForm, awayForm, h2h);

      console.log('✅ Sportsradar verisi başarıyla çekildi');

      return {
        teamHome: homeTeamInfo.name,
        teamAway: awayTeamInfo.name,
        league,
        homeForm,
        awayForm,
        h2h,
        injuries: 'Sakatlık verisi şu an mevcut değil', // Trial sürümünde yok
        leaguePosition: 'Sıralama verisi hesaplanıyor',
        confidenceScore: confidence,
        dataSources: ['Sportsradar API (Resmi)'],
      };
    } catch (error) {
      console.error('❌ Sportsradar hatası:', error);
      return null;
    }
  },

  // Güven skoru hesaplama
  calculateConfidence(homeForm: string, awayForm: string, h2h: string): number {
    let score = 50; // Başlangıç

    // Form bazlı
    const homeWins = (homeForm.match(/G/g) || []).length;
    const awayWins = (awayForm.match(/G/g) || []).length;
    score += (homeWins - awayWins) * 8;

    // H2H verisi varsa
    if (h2h !== 'H2H verisi yok') {
      score += 15;
    }

    // Veri kalitesi kontrolü
    if (homeForm.includes('Veri yok') || awayForm.includes('Veri yok')) {
      score -= 20;
    }

    // 0-100 arası sınırla
    return Math.max(30, Math.min(100, Math.round(score)));
  },

  // Cache temizleme (opsiyonel)
  clearCache() {
    requestCache.clear();
    console.log('🗑️ Cache temizlendi');
  },
};

export default sportsradarService;
