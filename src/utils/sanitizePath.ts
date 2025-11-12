export function sanitizePath(input: string): string {
  if (!input) return '';

  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/gi, 'i')
    .replace(/Ş/gi, 's')
    .replace(/Ğ/gi, 'g')
    .replace(/Ü/gi, 'u')
    .replace(/Ö/gi, 'o')
    .replace(/Ç/gi, 'c')
    .replace(/[.\#\$\[\]]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function createSafeCacheKey(league: string, teamHome: string, teamAway: string): string {
  const safeLeague = sanitizePath(league);
  const safeTeamHome = sanitizePath(teamHome);
  const safeTeamAway = sanitizePath(teamAway);

  return `match_cache/${safeLeague}/${safeTeamHome}_vs_${safeTeamAway}`;
}

export function safeJsonParse<T = any>(jsonString: string, fallback: T): T {
  try {
    const parsed = JSON.parse(jsonString);
    return parsed as T;
  } catch (error: any) {
    console.error('JSON parse hatası:', error.message);
    console.error('Ham veri (ilk 200 karakter):', jsonString.substring(0, 200));
    return fallback;
  }
}

export function extractJsonFromText(text: string): string | null {
  if (!text || typeof text !== 'string') {
    console.error('extractJsonFromText: Geçersiz input');
    return null;
  }

  const cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .replace(/\[cite:\s*\d+\]/g, '')
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.warn('extractJsonFromText: JSON bulunamadı');
    console.log('Temizlenmiş metin (ilk 300 karakter):', cleaned.substring(0, 300));
    return null;
  }

  return jsonMatch[0];
}
