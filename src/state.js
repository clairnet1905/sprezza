// État applicatif partagé : dépôt, profil actif, paramètres, URLs de photos.
import { Repository, uid } from './repositories/db.js';
import { IDENTITY_MIX } from './data/styles.js';
import { SyncService } from './services/sync.js';

export const store = {
  repo: null,
  settings: null,
  profile: null,
  profiles: [],
};

export function defaultProfile(kind = 'main') {
  const base = {
    id: kind === 'main' ? 'profile_main' : uid('profile'),
    kind, name: kind === 'main' ? 'Mon profil' : kind === 'woman' ? 'Profil femme' : 'Profil enfant',
    height: kind === 'main' ? 163 : null, weightMin: kind === 'main' ? 60 : null, weightMax: kind === 'main' ? 63 : null,
    measures: {}, preferredFits: kind === 'main' ? ['tapered', 'regular'] : [], brandSizes: [],
    styleMix: kind === 'main' ? IDENTITY_MIX.map((m) => ({ ...m })) : [],
    budgets: {}, monthlyBudget: null,
    city: kind === 'main' ? { name: 'Bordeaux', admin: 'Nouvelle-Aquitaine', lat: 44.84, lon: -0.58, tz: 'Europe/Paris' } : null,
    locale: 'fr-FR', currency: 'EUR', units: 'metric',
    context: kind === 'main' ? 'Dirige une entreprise de nettoyage : visites de locaux et rendez-vous clients.' : '',
    goals: kind === 'main' ? 'Paraître chic, masculin, naturel, soigné, moderne, raffiné et professionnel sans ostentation.' : '',
    consents: { weather: false, geoloc: false, ai: false },
  };
  return base;
}

export async function initStore() {
  // Nom de base conservé depuis « Style Studio » pour ne perdre aucune donnée existante.
  store.repo = await Repository.create('style-studio');
  store.sync = new SyncService(store.repo);
  store.settings = await store.repo.kvGet('settings', { theme: 'system', activeProfileId: 'profile_main', onboarded: false });
  store.profiles = await store.repo.all('profiles');
  if (!store.profiles.length) {
    const p = await store.repo.put('profiles', defaultProfile('main'));
    store.profiles = [p];
  }
  store.profile = store.profiles.find((p) => p.id === store.settings.activeProfileId) || store.profiles.find((p) => p.kind === 'main') || store.profiles[0];
  applyTheme();
  return store;
}

export async function saveSettings(patch) {
  store.settings = { ...store.settings, ...patch };
  await store.repo.kvSet('settings', store.settings);
  applyTheme();
}
export async function saveProfile(profile) {
  const saved = await store.repo.put('profiles', profile);
  store.profiles = await store.repo.all('profiles');
  if (store.profile?.id === saved.id) store.profile = saved;
  return saved;
}
export async function switchProfile(id) {
  const p = store.profiles.find((x) => x.id === id);
  if (!p) return;
  store.profile = p;
  await saveSettings({ activeProfileId: id });
}

export function applyTheme() {
  const t = store.settings?.theme || 'system';
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#141716' : '#1F3D2F');
}

// ---------- Données du profil actif ----------
export const pid = () => store.profile.id;
export const garments = () => store.repo.all('garments', (g) => g.profileId === pid());
export const outfits = () => store.repo.all('outfits', (o) => o.profileId === pid());
export const wearlog = () => store.repo.all('wearlog', (o) => o.profileId === pid());
export const calendar = () => store.repo.all('calendar', (o) => o.profileId === pid());
export const wishlist = () => store.repo.all('wishlist', (o) => o.profileId === pid());
export const palettes = () => store.repo.all('palettes', (o) => o.profileId === pid());
export const analyses = () => store.repo.all('analyses', (o) => o.profileId === pid());
export const prefs = async () => store.repo.kvGet(`prefs:${pid()}`, { formalityBias: 0, warmthBias: 0, dislikedFit: {}, likedCombos: [], history: [] });
export const savePrefs = (p) => store.repo.kvSet(`prefs:${pid()}`, p);

// ---------- Photos : URLs d'objets mises en cache ----------
const urlCache = new Map();
export async function photoURL(photoId, { thumb = true } = {}) {
  if (!photoId) return null;
  const key = `${photoId}:${thumb}`;
  if (urlCache.has(key)) return urlCache.get(key);
  const rec = await store.repo.get('photos', photoId);
  if (!rec) return null;
  const blob = thumb ? rec.thumb || rec.blob : rec.blob;
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(key, url);
  return url;
}
export function forgetPhotoURL(photoId) {
  for (const k of [...urlCache.keys()]) if (k.startsWith(photoId + ':')) { URL.revokeObjectURL(urlCache.get(k)); urlCache.delete(k); }
}
/** Remplit les <img data-photo="id"> d'un conteneur (chargement paresseux). */
export async function hydratePhotos(root) {
  // Photos découpées dans le mannequin habillé (SVG) : si la photo manque, la couleur de la pièce reste visible.
  const svgImgs = root.querySelectorAll('image[data-photo]');
  await Promise.all([...svgImgs].map(async (im) => {
    const url = await photoURL(im.getAttribute('data-photo'), { thumb: true });
    if (url) im.setAttribute('href', url); else im.remove();
  }));
  const imgs = root.querySelectorAll('img[data-photo]');
  await Promise.all([...imgs].map(async (img) => {
    const url = await photoURL(img.dataset.photo, { thumb: img.dataset.full === undefined });
    if (url) img.src = url; else img.replaceWith(Object.assign(document.createElement('span'), { className: 'small muted', textContent: 'Photo indisponible' }));
  }));
}
