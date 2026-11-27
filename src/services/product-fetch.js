// Lecture d'une page produit à partir de son lien, via Jina Reader (gratuit, sans clé, compatible navigateur).
// Seul le lien de l'article est envoyé (aucune donnée personnelle). Certains sites bloquent toute lecture automatique :
// on le dit clairement et on se rabat sur le texte du lien.
import { store } from '../state.js';

const READER = 'https://r.jina.ai/';
const CACHE_DAYS = 7;
const BLOCKED = /access denied|security checkpoint|just a moment|captcha|attention required|forbidden|robot|^\s*(&nbsp;)?\s*$/i;

async function read(url, engine) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 45000);
  try {
    const headers = { Accept: 'application/json', 'X-Locale': 'fr-FR' };
    if (engine) headers['X-Engine'] = engine;
    const r = await fetch(READER + url, { headers, signal: ctrl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (r.status === 429) throw new Error('trop de lectures en peu de temps, réessayez dans une minute');
    const body = await r.json().catch(() => null);
    const d = body?.data || {};
    return { title: d.title || '', description: d.description || '', content: d.content || '' };
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('la page met trop de temps à répondre');
    if (e instanceof TypeError) throw new Error('réseau indisponible');
    throw e;
  } finally { clearTimeout(t); }
}
const usable = (p) => p && p.content.length > 300 && !BLOCKED.test(p.title);

/** @returns {Promise<{title:string, description:string, content:string}>} */
export async function fetchProductPage(url) {
  const key = `product:${url}`;
  const cached = await store.repo.kvGet(key, null);
  if (cached && Date.now() - cached.at < CACHE_DAYS * 864e5) return cached.page;
  let page = await read(url);
  if (!usable(page)) page = await read(url, 'browser'); // second essai avec un vrai navigateur (sites protégés)
  if (!usable(page)) { await new Promise((r) => setTimeout(r, 2500)); page = await read(url, 'browser'); } // certains sites bloquent par intermittence
  if (!usable(page)) throw Object.assign(new Error('ce site bloque la lecture automatique de ses pages'), { code: 'blocked' });
  await store.repo.kvSet(key, { at: Date.now(), page: { title: page.title, description: page.description.slice(0, 1500), content: page.content.slice(0, 60000) } });
  return page;
}
