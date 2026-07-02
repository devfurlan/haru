// Geocodifica um endereço em texto livre para lat/lng via Nominatim (OpenStreetMap,
// grátis, sem chave). Best-effort: retorna null se não achar ou a request falhar - o
// caller trata como "sem coordenadas". Nominatim exige User-Agent identificável e
// limita ~1 req/s, ok porque só roda quando o dono salva o endereço no painel.
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'br');
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Demandae/1.0 (agendamento; https://demandae.app)' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const hit = data[0];
    const lat = Number(hit?.lat);
    const lng = Number(hit?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
