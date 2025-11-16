// src/utils/teamNameNormalizer.ts

/**
 * ✅ Akıllı Takım İsmi Normalizasyonu
 * API'den gelen resmi isimleri Türkiye'deki bahis sitelerinde 
 * kullanılan formata dönüştürür (Nesine.com gibi)
 */

// Kısaltmalar ve gereksiz kelimeler
const PREFIXES_TO_REMOVE = [
  'FC', 'CF', 'CD', 'SK', 'SV', 'AC', 'AS', 'SS',
  'AFC', 'BFC', 'CFC', 'DFC', 'EFC', 'RFC', 'VfB', 'VfL',
  'TSG', 'FSV', 'BSC', 'SC', 'FK', 'IFK', 'GIF',
  'Real', 'Club', 'Deportivo', 'Racing', 'Sporting',
  'Royal', 'Standard', 'Athletic'
];

const SUFFIXES_TO_REMOVE = [
  'FC', 'CF', 'United', 'City', 'Town', 'Hotspur',
  'Wanderers', 'Rovers', 'Albion', 'Athletic',
  'Utd', 'München', 'Munchen'
];

// Özel durumlar (Nesine.com formatı)
const SPECIAL_CASES: { [key: string]: string } = {
  // Premier League
  'Manchester United': 'Manchester Utd',
  'Man United': 'Manchester Utd',
  'Man Utd': 'Manchester Utd',
  'Manchester City': 'Manchester City',
  'Man City': 'Manchester City',
  'Tottenham Hotspur': 'Tottenham',
  'Brighton & Hove Albion': 'Brighton',
  'Brighton and Hove Albion': 'Brighton',
  'Nottingham Forest': "Nott'm Forest",
  'Sheffield United': 'Sheffield Utd',
  'West Ham United': 'West Ham',
  'Newcastle United': 'Newcastle',
  'Leicester City': 'Leicester',
  'Wolverhampton Wanderers': 'Wolves',
  'Wolverhampton': 'Wolves',
  'AFC Bournemouth': 'Bournemouth',
  
  // La Liga (Nesine.com formatı)
  'FC Barcelona': 'Barcelona',
  'Barcelona': 'Barcelona',
  'Atlético Madrid': 'Atletico Madrid',
  'Atletico Madrid': 'Atletico Madrid',
  'Athletic Club': 'Ath Bilbao B', // Nesine'de böyle
  'Athletic Bilbao': 'Ath Bilbao B',
  'RCD Mallorca': 'Mallorca',
  'Cádiz CF': 'Cadiz',
  'Cadiz': 'Cadiz',
  'UD Almería': 'Almeria',
  'Almeria': 'Almeria',
  'Deportivo Alavés': 'Alaves',
  'Deportivo Alaves': 'Alaves',
  'UD Las Palmas': 'Las Palmas',
  'Las Palmas': 'Las Palmas',
  'Deportivo La Coruna': 'Dep. La Coruna',
  'Deportivo La Coruña': 'Dep. La Coruna',
  
  // Bundesliga
  'Bayern München': 'Bayern Münih',
  'Bayern Munich': 'Bayern Münih',
  'FC Bayern München': 'Bayern Münih',
  'Borussia Dortmund': 'Dortmund',
  'Bayer 04 Leverkusen': 'Leverkusen',
  'Borussia Mönchengladbach': "M'gladbach",
  'TSG 1899 Hoffenheim': 'Hoffenheim',
  '1. FC Köln': 'Köln',
  'FC Köln': 'Köln',
  'Eintracht Frankfurt': 'Frankfurt',
  '1. FSV Mainz 05': 'Mainz',
  
  // Serie A (Nesine.com formatı)
  'Inter Milan': 'Inter',
  'Inter': 'Inter',
  'Internazionale': 'Inter',
  'AC Milan': 'Milan',
  'Milan': 'Milan',
  'Hellas Verona': 'Verona',
  'Juventus': 'Juventus',
  'AS Roma': 'Roma',
  'Roma': 'Roma',
  'SSC Napoli': 'Napoli',
  'Napoli': 'Napoli',
  'SS Lazio': 'Lazio',
  'Lazio': 'Lazio',
  
  // Ligue 1
  'Paris Saint-Germain': 'PSG',
  'Paris Saint Germain': 'PSG',
  'Olympique Marseille': 'Marsilya',
  'Olympique Lyonnais': 'Lyon',
  'AS Monaco': 'Monaco',
  
  // Türkiye
  'Istanbul Basaksehir': 'Başakşehir',
  'İstanbul Başakşehir': 'Başakşehir',
  'Adana Demirspor': 'Adana Demir',
  'Gaziantep FK': 'Gaziantep',
  
  // Ulusal Takımlar (Nesine.com formatı)
  'England': 'İngiltere',
  'Turkey': 'Türkiye',
  'France': 'Fransa',
  'Germany': 'Almanya',
  'Spain': 'İspanya',
  'Italy': 'İtalya',
  'Portugal': 'Portekiz',
  'Netherlands': 'Hollanda',
  'Belgium': 'Belçika',
  'Croatia': 'Hırvatistan',
  'Serbia': 'Sırbistan',
  'Norway': 'Norveç',
  'Sweden': 'İsveç',
  'Denmark': 'Danimarka',
  'Switzerland': 'İsviçre',
  'Austria': 'Avusturya',
  'Czech Republic': 'Çek Cumhuriyeti',
  'Poland': 'Polonya',
  'Ukraine': 'Ukrayna',
  'Russia': 'Rusya',
  'Greece': 'Yunanistan',
  'Albania': 'Arnavutluk',
  'Northern Ireland': 'Kuzey İrlanda',
  'Republic of Ireland': 'İrlanda',
  'Scotland': 'İskoçya',
  'Wales': 'Galler',
  'Iceland': 'İzlanda',
  'Montenegro': 'Karadağ',
  'Bosnia-Herzegovina': 'Bosna-Hersek',
  'Slovakia': 'Slovakya',
  'Slovenia': 'Slovenya',
  'Romania': 'Romanya',
  'Bulgaria': 'Bulgaristan',
  'Hungary': 'Macaristan',
  'Finland': 'Finlandiya',
  'Latvia': 'Letonya',
  'Lithuania': 'Litvanya',
  'Estonia': 'Estonya',
  'Kazakhstan': 'Kazakistan',
  'Azerbaijan': 'Azerbaycan',
  'Georgia': 'Gürcistan',
  'Armenia': 'Ermenistan',
  'Moldova': 'Moldova',
  'Luxembourg': 'Lüksemburg',
  'Malta': 'Malta',
  'Gibraltar': 'Cebelitarık',
  'Andorra': 'Andorra',
  'Nigeria': 'Nijerya',
  'Democratic Republic of the Congo': 'Demokratik Kongo C.',
  'DR Congo': 'Demokratik Kongo C.',
  'PSV Eindhoven': 'PSV',
  'Feyenoord Rotterdam': 'Feyenoord',
  'Red Bull Salzburg': 'Salzburg',
  'RB Salzburg': 'Salzburg',
  'Rapid Wien': 'Rapid Viyana',
  'Sporting CP': 'Sporting',
  'Sporting Lisbon': 'Sporting',
  'Benfica Lisbon': 'Benfica',
  'FC Porto': 'Porto',
};

// Türkçe karakter dönüşümleri
const TURKISH_CHAR_MAP: { [key: string]: string } = {
  'ç': 'c', 'Ç': 'C',
  'ğ': 'g', 'Ğ': 'G',
  'ı': 'i', 'I': 'I',
  'ö': 'o', 'Ö': 'O',
  'ş': 's', 'Ş': 'S',
  'ü': 'u', 'Ü': 'U',
  'İ': 'I',
  'é': 'e', 'è': 'e', 'ê': 'e',
  'á': 'a', 'à': 'a', 'â': 'a',
  'ó': 'o', 'ò': 'o', 'ô': 'o',
  'ú': 'u', 'ù': 'u', 'û': 'u',
  'ñ': 'n', 'Ñ': 'N',
  'ä': 'a', 'Ä': 'A',
  'ö': 'o', 'Ö': 'O',
  'ü': 'u', 'Ü': 'U',
  'ß': 'ss',
};

/**
 * Türkçe karakterleri normalize et
 */
function normalizeTurkish(text: string): string {
  return text.split('').map(char => TURKISH_CHAR_MAP[char] || char).join('');
}

/**
 * Takım ismini temizle ve normalize et
 */
export function normalizeTeamName(teamName: string): string {
  // 1. Özel durumları kontrol et
  const normalized = normalizeTurkish(teamName);
  if (SPECIAL_CASES[teamName]) {
    return SPECIAL_CASES[teamName];
  }
  if (SPECIAL_CASES[normalized]) {
    return SPECIAL_CASES[normalized];
  }

  let cleanName = teamName.trim();

  // 2. Parantez içindeki bilgileri kaldır
  // Örn: "Bayern München (Amt.)" → "Bayern München"
  cleanName = cleanName.replace(/\s*\([^)]*\)/g, '').trim();

  // 3. Başındaki gereksiz kelimeleri kaldır
  for (const prefix of PREFIXES_TO_REMOVE) {
    // "FC Barcelona" → "Barcelona"
    const regex = new RegExp(`^${prefix}\\s+`, 'i');
    cleanName = cleanName.replace(regex, '').trim();
  }

  // 4. Sonundaki gereksiz kelimeleri kaldır
  for (const suffix of SUFFIXES_TO_REMOVE) {
    // "Manchester United" → "Manchester Utd" (özel durum değilse)
    // "Dortmund FC" → "Dortmund"
    const regex = new RegExp(`\\s+${suffix}$`, 'i');
    cleanName = cleanName.replace(regex, '').trim();
  }

  // 5. Çift boşlukları temizle
  cleanName = cleanName.replace(/\s{2,}/g, ' ').trim();

  // 6. Rakamları kaldır (19, 04, 1899 gibi)
  // Ancak sadece takımın sonundaysa
  cleanName = cleanName.replace(/\s+\d{2,4}$/, '').trim();

  // 7. Şehir + takım ismi ise kısalt
  // Örn: "Real Madrid CF" → "Real Madrid"
  // "RB Leipzig" → "RB Leipzig" (kalsın)
  
  // 8. Maksimum 20 karakter (opsiyonel - Nesine.com limiti)
  if (cleanName.length > 25) {
    const words = cleanName.split(' ');
    if (words.length > 1) {
      // İlk kelimenin ilk harfi + son kelime
      // "Borussia Mönchengladbach" → "B. Mönchengladbach"
      cleanName = words[0].charAt(0) + '. ' + words[words.length - 1];
    } else {
      // Tek kelimeyse kes
      cleanName = cleanName.substring(0, 25);
    }
  }

  return cleanName.trim();
}

/**
 * Toplu normalizasyon (maç listesi için)
 */
export function normalizeMatchTeams(matches: any[]): any[] {
  return matches.map(match => ({
    ...match,
    homeTeam: normalizeTeamName(match.homeTeam),
    awayTeam: normalizeTeamName(match.awayTeam)
  }));
}

/**
 * Maç başlığı oluştur (Nesine.com formatı)
 */
export function formatMatchTitle(homeTeam: string, awayTeam: string): string {
  const home = normalizeTeamName(homeTeam);
  const away = normalizeTeamName(awayTeam);
  return `${home} - ${away}`;
}

// Test fonksiyonu (development için)
export function testNormalizer() {
  const testCases = [
    'FC Barcelona',
    'Manchester United FC',
    'Bayern München (Amt.)',
    'Borussia Mönchengladbach',
    'TSG 1899 Hoffenheim',
    'Real Madrid CF',
    'Paris Saint-Germain',
    'Inter Milan',
    'Galatasaray SK',
    'Fenerbahçe SK',
    'RB Leipzig',
    'Sporting CP',
    'Brighton & Hove Albion',
    'Nottingham Forest FC',
    '1. FC Köln',
    'Athletic Club Bilbao'
  ];

  console.log('🧪 Takım İsmi Normalizasyon Testi:\n');
  testCases.forEach(name => {
    console.log(`"${name}" → "${normalizeTeamName(name)}"`);
  });
}
