// Inspiration photo via l'API Pexels (gratuite, licence Pexels : usage libre, crédit indiqué).
// La clé personnelle est saisie par l'utilisateur dans Paramètres ; elle reste dans ses données privées (jamais dans le code publié).
import { store } from '../state.js';

const API = 'https://api.pexels.com/v1/search';
const CACHE_DAYS = 7;

const EN_COLORS = { navy: 'navy', ecru: 'cream', beige: 'beige', chocolate: 'brown', charcoal: 'charcoal', 'light-gray': 'light grey', olive: 'olive', sky: 'light blue', camel: 'camel', taupe: 'taupe', burgundy: 'burgundy', white: 'white', black: 'black', 'mid-gray': 'grey', cognac: 'cognac', 'mid-blue': 'blue', 'suede-brown': 'brown suede', 'dark-brown': 'dark brown' };
const EN_SUBS = {
  chemise: 'shirt', 'chemise-lin': 'linen shirt', polo: 'knit polo', 'polo-sport': 'polo shirt', pull: 'sweater', 'col-roule': 'turtleneck', cardigan: 'cardigan', 'tee-shirt': 't-shirt', sweat: 'sweatshirt',
  pantalon: 'trousers', 'pantalon-costume': 'suit trousers', chino: 'chinos', jean: 'jeans', flanelle: 'flannel trousers', bermuda: 'shorts', short: 'shorts', jupe: 'skirt',
  blazer: 'blazer', 'veste-costume': 'suit', surchemise: 'overshirt', 'veste-daim': 'suede jacket', 'veste-cuir': 'leather jacket', 'veste-denim': 'denim jacket',
  manteau: 'wool coat', trench: 'trench coat', caban: 'peacoat', parka: 'parka',
  mocassins: 'loafers', derbies: 'derby shoes', richelieus: 'oxford shoes', chelsea: 'chelsea boots', bottines: 'boots', baskets: 'white sneakers', espadrilles: 'espadrilles',
};
export const enColor = (id) => EN_COLORS[id] || '';

/** Requête anglaise (meilleurs résultats Pexels) à partir des pièces d'une tenue. */
export function inspirationQuery(pieces, { gender = 'men' } = {}) {
  const part = (g) => (g ? `${enColor(g.color?.id)} ${EN_SUBS[g.sub] || ''}`.trim() : '');
  return [gender, part(pieces.layer || pieces.outer), part(pieces.top), part(pieces.bottom)].filter(Boolean).join(' ').replace(/\s+/g, ' ');
}
/** Requête à partir de couleurs seules (générateur de couleurs). */
export function colorsQuery({ top, bottom, jacket }, { gender = 'men' } = {}) {
  return [gender, jacket ? `${enColor(jacket)} blazer` : '', top ? `${enColor(top)} top` : '', bottom ? `${enColor(bottom)} trousers` : '', 'outfit'].filter(Boolean).join(' ');
}
export const genderWord = () => (store.profile?.kind === 'woman' ? 'women' : store.profile?.kind === 'child' ? 'kids' : 'men');

export const getKey = () => store.repo.kvGet('apikey:pexels', '');
export const setKey = (k) => store.repo.kvSet('apikey:pexels', String(k || '').trim());

export async function searchPhotos(query, { perPage = 6, key } = {}) {
  const apiKey = key ?? (await getKey());
  if (!apiKey) throw Object.assign(new Error('Clé Pexels manquante'), { code: 'nokey' });
  const cacheKey = `pexels:${query}`;
  if (!key) {
    const cached = await store.repo.kvGet(cacheKey, null);
    if (cached && Date.now() - cached.at < CACHE_DAYS * 864e5) return cached.photos;
  }
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 10000);
  let r;
  try { r = await fetch(`${API}?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait`, { headers: { Authorization: apiKey }, signal: ctrl.signal, referrerPolicy: 'no-referrer', credentials: 'omit' }); }
  catch (e) { throw new Error(e.name === 'AbortError' ? 'Pexels ne répond pas' : 'Réseau indisponible'); }
  finally { clearTimeout(t); }
  if (r.status === 401 || r.status === 403) throw Object.assign(new Error('Clé Pexels refusée : vérifiez-la dans Paramètres'), { code: 'badkey' });
  if (r.status === 429) throw new Error('Limite Pexels atteinte (200 recherches/heure) : réessayez plus tard');
  if (!r.ok) throw new Error(`Pexels : erreur ${r.status}`);
  const data = await r.json();
  const photos = (data.photos || []).filter((p) => /^https:\/\/images\.pexels\.com\//.test(p.src?.medium || '')).map((p) => ({
    id: p.id, page: p.url, alt: p.alt || '', photographer: p.photographer, photographerUrl: p.photographer_url,
    thumb: p.src.medium, large: p.src.large2x || p.src.large, avgColor: p.avg_color,
  }));
  if (!key) await store.repo.kvSet(cacheKey, { at: Date.now(), photos });
  return photos;
}
