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

export function translateLeague(leagueName: string): string {
  return leagueTranslations[leagueName] || leagueName;
}

export function formatMatchTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul'
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
