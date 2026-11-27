// Inspiration photo : Unsplash (licence Unsplash) ou Pexels (licence Pexels), selon la clé gratuite disponible.
// Les clés personnelles sont saisies dans Paramètres ; elles restent dans les données privées (jamais dans le code publié).
// Unsplash impose : affichage depuis ses serveurs (hotlink) et crédit « Photo de X sur Unsplash » avec liens UTM.
import { store } from '../state.js';

const API = 'https://api.pexels.com/v1/search';
const CACHE_DAYS = 7;

const EN_COLORS = { navy: 'navy', ecru: 'cream', beige: 'beige', chocolate: 'brown', charcoal: 'charcoal', 'light-gray': 'light grey', olive: 'olive', sky: 'light blue', camel: 'camel', taupe: 'taupe', burgundy: 'burgundy', white: 'white', black: 'black', 'mid-gray': 'grey', cognac: 'cognac', 'mid-blue': 'blue', 'suede-brown': 'brown suede', 'dark-brown': 'dark brown', forest: 'forest green', 'bottle-green': 'bottle green', green: 'green', sage: 'sage green', khaki: 'khaki', indigo: 'indigo denim', 'royal-blue': 'royal blue', petrol: 'teal', turquoise: 'turquoise', red: 'red', rust: 'rust', terracotta: 'terracotta', orange: 'orange', mustard: 'mustard', yellow: 'yellow', 'pale-pink': 'pale pink', pink: 'pink', lavender: 'lavender', purple: 'purple', sand: 'sand', silver: 'silver', gold: 'gold' };
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

export const PROVIDERS = {
  unsplash: { name: 'Unsplash', site: 'https://unsplash.com/?utm_source=sprezza&utm_medium=referral', license: 'https://unsplash.com/license', signup: 'https://unsplash.com/oauth/applications/new' },
  pexels: { name: 'Pexels', site: 'https://www.pexels.com/', license: 'https://www.pexels.com/license/', signup: 'https://www.pexels.com/api/' },
};
export const getKey = (provider = 'pexels') => store.repo.kvGet(`apikey:${provider}`, '');
export const setKey = (k, provider = 'pexels') => store.repo.kvSet(`apikey:${provider}`, String(k || '').trim());
const utm = (u) => `${u}${u.includes('?') ? '&' : '?'}utm_source=sprezza&utm_medium=referral`;

/** Recherche Unsplash (photos portrait), normalisée au même format que Pexels. */
async function searchUnsplash(query, apiKey, perPage, signal) {
  const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait&content_filter=high`, { headers: { Authorization: `Client-ID ${apiKey}`, 'Accept-Version': 'v1' }, signal, referrerPolicy: 'no-referrer', credentials: 'omit' });
  if (r.status === 401 || r.status === 403) throw Object.assign(new Error('Clé Unsplash refusée : vérifiez-la dans Paramètres'), { code: 'badkey' });
  if (r.status === 429) throw new Error('Limite Unsplash atteinte (50 recherches/heure en mode démo) : réessayez plus tard');
  if (!r.ok) throw new Error(`Unsplash : erreur ${r.status}`);
  const data = await r.json();
  return (data.results || []).filter((p) => /^https:\/\/images\.unsplash\.com\//.test(p.urls?.small || '')).map((p) => ({
    id: p.id, page: utm(p.links.html), alt: p.alt_description || '', photographer: p.user?.name || 'Photographe', photographerUrl: utm(p.user?.links?.html || 'https://unsplash.com'),
    thumb: p.urls.small, large: p.urls.regular, avgColor: p.color, provider: 'unsplash',
  }));
}

export async function searchPhotos(query, { perPage = 6, key, provider } = {}) {
  const prov = provider || ((await getKey('unsplash')) ? 'unsplash' : 'pexels');
  const apiKey = key ?? (await getKey(prov));
  if (!apiKey) throw Object.assign(new Error('Clé gratuite Unsplash ou Pexels manquante'), { code: 'nokey' });
  const cacheKey = `pexels:${prov}:${query}`;
  if (!key) {
    const cached = await store.repo.kvGet(cacheKey, null);
    if (cached && Date.now() - cached.at < CACHE_DAYS * 864e5) return cached.photos;
  }
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 10000);
  let photos;
  try {
    if (prov === 'unsplash') photos = await searchUnsplash(query, apiKey, perPage, ctrl.signal);
    else {
      const r = await fetch(`${API}?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait`, { headers: { Authorization: apiKey }, signal: ctrl.signal, referrerPolicy: 'no-referrer', credentials: 'omit' });
      if (r.status === 401 || r.status === 403) throw Object.assign(new Error('Clé Pexels refusée : vérifiez-la dans Paramètres'), { code: 'badkey' });
      if (r.status === 429) throw new Error('Limite Pexels atteinte (200 recherches/heure) : réessayez plus tard');
      if (!r.ok) throw new Error(`Pexels : erreur ${r.status}`);
      const data = await r.json();
      photos = (data.photos || []).filter((p) => /^https:\/\/images\.pexels\.com\//.test(p.src?.medium || '')).map((p) => ({
        id: p.id, page: p.url, alt: p.alt || '', photographer: p.photographer, photographerUrl: p.photographer_url,
        thumb: p.src.medium, large: p.src.large2x || p.src.large, avgColor: p.avg_color, provider: 'pexels',
      }));
    }
  } catch (e) { if (e.name === 'AbortError') throw new Error('Le service photo ne répond pas'); if (e instanceof TypeError) throw new Error('Réseau indisponible'); throw e; }
  finally { clearTimeout(t); }
  if (!key) await store.repo.kvSet(cacheKey, { at: Date.now(), photos });
  return photos;
}
