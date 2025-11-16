// Lig çevirileri
export const leagueTranslations: { [key: string]: string } = {
  'World Cup': 'Dünya Kupası',
  'UEFA Champions League': 'Şampiyonlar Ligi',
  'UEFA Europa League': 'Avrupa Ligi',
  'UEFA Europa Conference League': 'Konferans Ligi',
  'Premier League': 'İngiltere Premier Lig',
  'La Liga': 'İspanya La Liga',
  'Serie A': 'İtalya Serie A',
  'Bundesliga': 'Almanya Bundesliga',
  'Ligue 1': 'Fransa Ligue 1',
  'Eredivisie': 'Hollanda Eredivisie',
  'Primeira Liga': 'Portekiz Primeira Liga',
  'Super Lig': 'Süper Lig',
  'Championship': 'İngiltere Championship',
  'FA Cup': 'İngiltere FA Kupası',
  'Copa del Rey': 'İspanya Kral Kupası',
  'Coppa Italia': 'İtalya Kupası',
  'DFB Pokal': 'Almanya Kupası',
  'Coupe de France': 'Fransa Kupası',
  'Turkish Cup': 'Türkiye Kupası',
  'Liga MX': 'Meksika Liga',
  'MLS': 'ABD MLS',
  'Brasileirão': 'Brezilya Ligi',
  'Argentine Liga': 'Arjantin Ligi',
  'Saudi Pro League': 'Suudi Arabistan Ligi',
  'A-League': 'Avustralya Ligi',
  'J1 League': 'Japonya J1 Ligi',
  'K League 1': 'Güney Kore K Ligi',
  'Chinese Super League': 'Çin Süper Ligi',
  'Belgium First Division A': 'Belçika Birinci Ligi',
  'Scottish Premiership': 'İskoçya Premier Ligi',
  'Russian Premier League': 'Rusya Premier Ligi',
  'Ukrainian Premier League': 'Ukrayna Premier Ligi',
  'Greek Super League': 'Yunanistan Süper Ligi',
  'Swiss Super League': 'İsviçre Süper Ligi',
  'Austrian Bundesliga': 'Avusturya Bundesliga',
  'Danish Superliga': 'Danimarka Süper Ligi',
  'Swedish Allsvenskan': 'İsveç Allsvenskan',
  'Norwegian Eliteserien': 'Norveç Eliteserien',
  'Czech First League': 'Çek Birinci Ligi',
  'Romanian Liga 1': 'Romanya Liga 1',
  'Croatian First League': 'Hırvatistan Birinci Ligi',
  'Serbian SuperLiga': 'Sırbistan Süper Ligi',
  'Bulgarian First League': 'Bulgaristan Birinci Ligi',
  'UEFA Nations League': 'UEFA Uluslar Ligi',
  'European Championship': 'Avrupa Şampiyonası',
  'FIFA World Cup': 'FIFA Dünya Kupası',
  'Copa America': 'Copa America',
  'Africa Cup of Nations': 'Afrika Uluslar Kupası',
  'Asian Cup': 'Asya Kupası',
  'CONCACAF Gold Cup': 'CONCACAF Altın Kupası',
  'Friendlies': 'Hazırlık Maçları',
  'International Friendlies': 'Uluslararası Hazırlık Maçları',
  'Club Friendlies': 'Kulüp Hazırlık Maçları',
  'UEFA Youth League': 'UEFA Gençler Ligi',
  'UEFA Women\'s Champions League': 'UEFA Kadınlar Şampiyonlar Ligi',
};

// Takım ismi çevirileri (popüler takımlar)
export const teamTranslations: { [key: string]: string } = {
  // Türkiye
  'Galatasaray': 'Galatasaray',
  'Fenerbahce': 'Fenerbahçe',
  'Besiktas': 'Beşiktaş',
  'Trabzonspor': 'Trabzonspor',
  
  // İspanya
  'Barcelona': 'Barselona',
  'Real Madrid': 'Real Madrid',
  'Atletico Madrid': 'Atletico Madrid',
  'Athletic Bilbao': 'Athletic Bilbao',
  'Sevilla': 'Sevilla',
  'Valencia': 'Valensiya',
  
  // İngiltere
  'Manchester United': 'Manchester United',
  'Manchester City': 'Manchester City',
  'Liverpool': 'Liverpool',
  'Chelsea': 'Chelsea',
  'Arsenal': 'Arsenal',
  'Tottenham': 'Tottenham',
  'Newcastle': 'Newcastle',
  'Leicester': 'Leicester',
  'West Ham': 'West Ham',
  'Everton': 'Everton',
  
  // Almanya
  'Bayern Munich': 'Bayern Münih',
  'Borussia Dortmund': 'Borussia Dortmund',
  'RB Leipzig': 'RB Leipzig',
  'Bayer Leverkusen': 'Bayer Leverkusen',
  
  // İtalya
  'Juventus': 'Juventus',
  'Inter Milan': 'Inter',
  'AC Milan': 'Milan',
  'Roma': 'Roma',
  'Napoli': 'Napoli',
  'Lazio': 'Lazio',
  
  // Fransa
  'Paris Saint Germain': 'Paris Saint-Germain',
  'PSG': 'PSG',
  'Marseille': 'Marsilya',
  'Lyon': 'Lyon',
  'Monaco': 'Monaco',
  
  // Avusturya
  'R. Wien': 'Rapid Viyana',
  'Rapid Wien': 'Rapid Viyana',
  'SV Austria Salzburg': 'Salzburg',
  'Sturm Graz': 'Sturm Graz',
  
  // Kısaltmalar
  'FC': '',
  'CF': '',
  'SK': '',
  'SV': '',
  '(Amt.)': '',
  '(Amt)': '',
};

export function translateLeague(leagueName: string): string {
  return leagueTranslations[leagueName] || leagueName;
}

// Takım ismini Türkçe'ye çevir
export function translateTeam(teamName: string): string {
  // Tam eşleşme kontrolü
  if (teamTranslations[teamName]) {
    return teamTranslations[teamName];
  }
  
  // Kısaltmaları temizle
  let cleanName = teamName;
  Object.keys(teamTranslations).forEach(key => {
    if (key.startsWith('(') || ['FC', 'CF', 'SK', 'SV'].includes(key)) {
      cleanName = cleanName.replace(key, '').trim();
    }
  });
  
  return cleanName;
}

export function formatMatchTime(timestamp: number): string {
  // ✅ Timestamp zaten UTC, direkt Türkiye saatine çevir
  const date = new Date(timestamp);
  
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Istanbul' // Türkiye saati (UTC+3)
  });
}

export function formatMatchDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (dateStr === today) return 'Bugün';
  if (dateStr === tomorrow) return 'Yarın';

  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long'
  });
}

// Maç durumu metni
export function getMatchStatusText(status: string): string {
  const statusMap: { [key: string]: string } = {
    'scheduled': 'Oynanacak',
    'live': '🔴 CANLI',
    'finished': 'Bitti',
    'postponed': 'Ertelendi',
    'cancelled': 'İptal',
    '1H': '🔴 İlk Yarı',
    '2H': '🔴 İkinci Yarı',
    'HT': 'Devre Arası',
    'FT': 'Maç Bitti',
    'AET': 'Uzatmalar Bitti',
    'PEN': 'Penaltılar',
  };
  
  return statusMap[status] || status;
}

// Canlı maç kontrolü
export function isMatchLive(status: string): boolean {
  return ['live', '1H', '2H', 'HT', 'ET', 'P'].includes(status);
}

// Maç bitmiş mi kontrolü
export function isMatchFinished(status: string): boolean {
  return ['FT', 'AET', 'PEN', 'finished'].includes(status);
}
