// src/services/teamStatsService.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface TeamForm {
  teamId: number;
  teamName: string;
  logo: string;
  form: string; // "WWDLW" gibi
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
  played: number;
  lastFiveMatches: MatchResult[];
}

export interface MatchResult {
  date: string;
  opponent: string;
  result: 'W' | 'D' | 'L';
  score: string;
  isHome: boolean;
}

export interface HeadToHead {
  totalMatches: number;
  homeWins: number;
  awayWins: number;
  draws: number;
  lastMatches: {
    date: string;
    homeTeam: string;
    awayTeam: string;
    score: string;
    winner: string;
  }[];
}

export interface TeamStatistics {
  homeTeam: TeamForm;
  awayTeam: TeamForm;
  headToHead: HeadToHead;
  league: {
    id: number;
    name: string;
    country: string;
    season: number;
  };
}

export const teamStatsService = {
  /**
   * Takımın mevcut sezon istatistiklerini çeker
   */
  async getTeamStatistics(teamId: number, leagueId: number, season: number): Promise<TeamForm> {
    try {
      console.log(`📊 Takım istatistikleri çekiliyor: Team ${teamId}, League ${leagueId}, Season ${season}`);

      const response = await axios.get(`${API_BASE_URL}/api/football/teams/statistics`, {
        params: {
          team: teamId,
          league: leagueId,
          season: season
        },
        timeout: 15000
      });

      const data = response.data.response;

      if (!data) {
        throw new Error('Takım istatistikleri bulunamadı');
      }

      // Form string'i oluştur (son 5 maç)
      const form = data.form?.substring(0, 5) || 'N/A';

      // Son 5 maçı parse et
      const lastFiveMatches: MatchResult[] = [];
      if (data.fixtures?.played?.total > 0) {
        // Form string'inden son maçları oluştur (gerçek API'den gelebilir)
        for (let i = 0; i < Math.min(5, form.length); i++) {
          const result = form[i] as 'W' | 'D' | 'L';
          lastFiveMatches.push({
            date: '', // API'den gelecek
            opponent: '', // API'den gelecek
            result: result,
            score: '',
            isHome: i % 2 === 0
          });
        }
      }

      return {
        teamId: data.team.id,
        teamName: data.team.name,
        logo: data.team.logo,
        form: form,
        wins: data.fixtures?.wins?.total || 0,
        draws: data.fixtures?.draws?.total || 0,
        losses: data.fixtures?.loses?.total || 0,
        goalsFor: data.goals?.for?.total?.total || 0,
        goalsAgainst: data.goals?.against?.total?.total || 0,
        goalDifference: (data.goals?.for?.total?.total || 0) - (data.goals?.against?.total?.total || 0),
        points: (data.fixtures?.wins?.total || 0) * 3 + (data.fixtures?.draws?.total || 0),
        position: 0, // Puan durumundan gelecek
        played: data.fixtures?.played?.total || 0,
        lastFiveMatches: lastFiveMatches
      };

    } catch (error: any) {
      console.error('❌ Takım istatistikleri hatası:', error.message);
      throw new Error('Takım istatistikleri yüklenemedi');
    }
  },

  /**
   * İki takım arasındaki kafa kafaya geçmişi çeker
   */
  async getHeadToHead(homeTeamId: number, awayTeamId: number): Promise<HeadToHead> {
    try {
      console.log(`🔄 H2H çekiliyor: ${homeTeamId} vs ${awayTeamId}`);

      const response = await axios.get(`${API_BASE_URL}/api/football/fixtures/headtohead`, {
        params: {
          h2h: `${homeTeamId}-${awayTeamId}`,
          last: 10
        },
        timeout: 15000
      });

      const matches = response.data.response || [];

      let homeWins = 0;
      let awayWins = 0;
      let draws = 0;

      const lastMatches = matches.slice(0, 5).map((match: any) => {
        const homeGoals = match.goals.home;
        const awayGoals = match.goals.away;
        
        let winner = 'Draw';
        if (homeGoals > awayGoals) {
          homeWins++;
          winner = match.teams.home.name;
        } else if (awayGoals > homeGoals) {
          awayWins++;
          winner = match.teams.away.name;
        } else {
          draws++;
        }

        return {
          date: new Date(match.fixture.date).toLocaleDateString('tr-TR'),
          homeTeam: match.teams.home.name,
          awayTeam: match.teams.away.name,
          score: `${homeGoals} - ${awayGoals}`,
          winner: winner
        };
      });

      return {
        totalMatches: matches.length,
        homeWins,
        awayWins,
        draws,
        lastMatches
      };

    } catch (error: any) {
      console.error('❌ H2H hatası:', error.message);
      return {
        totalMatches: 0,
        homeWins: 0,
        awayWins: 0,
        draws: 0,
        lastMatches: []
      };
    }
  },

  /**
   * Puan durumundan takımın pozisyonunu bulur
   */
  async getStandingPosition(teamId: number, leagueId: number, season: number): Promise<number> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/football/standings`, {
        params: {
          league: leagueId,
          season: season
        },
        timeout: 15000
      });

      const standings = response.data.response?.[0]?.league?.standings?.[0] || [];
      const team = standings.find((t: any) => t.team.id === teamId);
      
      return team?.rank || 0;

    } catch (error) {
      console.error('❌ Puan durumu hatası:', error);
      return 0;
    }
  },

  /**
   * Maç için her iki takımın istatistiklerini çeker
   */
  async getMatchTeamStats(
    homeTeamId: number,
    awayTeamId: number,
    leagueId: number,
    season: number
  ): Promise<TeamStatistics> {
    try {
      console.log('📊 Maç için takım istatistikleri yükleniyor...');

      // Paralel istekler
      const [homeTeam, awayTeam, h2h, homePos, awayPos] = await Promise.all([
        this.getTeamStatistics(homeTeamId, leagueId, season),
        this.getTeamStatistics(awayTeamId, leagueId, season),
        this.getHeadToHead(homeTeamId, awayTeamId),
        this.getStandingPosition(homeTeamId, leagueId, season),
        this.getStandingPosition(awayTeamId, leagueId, season)
      ]);

      homeTeam.position = homePos;
      awayTeam.position = awayPos;

      return {
        homeTeam,
        awayTeam,
        headToHead: h2h,
        league: {
          id: leagueId,
          name: '',
          country: '',
          season: season
        }
      };

    } catch (error: any) {
      console.error('❌ Takım istatistikleri yükleme hatası:', error);
      throw new Error('İstatistikler yüklenemedi. Lütfen tekrar deneyin.');
    }
  }
};