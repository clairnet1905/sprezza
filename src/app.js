// Style Studio — point d'entrée : routeur hash, navigation, enregistrement PWA.
import { html, setHTML, raw } from './lib/html.js';
import { icon, toast } from './components/ui.js';
import { initStore, store, switchProfile } from './state.js';

const ROUTES = {
  today: () => import('./features/today.js'),
  wardrobe: () => import('./features/wardrobe.js'),
  outfits: () => import('./features/outfits.js'),
  colors: () => import('./features/colors.js'),
  academy: () => import('./features/academy.js'),
  analysis: () => import('./features/analysis.js'),
  shopping: () => import('./features/shopping.js'),
  favorites: () => import('./features/favorites.js'),
  calendar: () => import('./features/calendar.js'),
  capsule: () => import('./features/capsule.js'),
  profile: () => import('./features/profile.js'),
  settings: () => import('./features/settings.js'),
  more: () => import('./features/more.js'),
};
const TABS = [
  ['today', 'Aujourd\'hui', 'today'], ['wardrobe', 'Dressing', 'wardrobe'], ['colors', 'Couleurs', 'colors'], ['academy', 'Académie', 'academy'], ['more', 'Plus', 'more'],
];
export const SECONDARY = [
  ['outfits', 'Tenues', 'outfits'], ['analysis', 'Analyse IA', 'analysis'], ['shopping', 'Shopping', 'shopping'], ['capsule', 'Capsule', 'capsule'],
  ['favorites', 'Favoris', 'heart'], ['calendar', 'Calendrier', 'calendar'], ['profile', 'Profil', 'profile'], ['settings', 'Paramètres', 'settings'],
];
const MORE_ROUTES = new Set(SECONDARY.map((s) => s[0]).concat('more'));

let cleanup = null;
let renderToken = 0;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '') || 'today';
  const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  return { name: parts[0] || 'today', params: parts.slice(1), query: new URLSearchParams(qs || '') };
}

function renderNav(active) {
  const link = ([id, label, ic]) => html`<a href="#/${id}" ${active === id ? raw('aria-current="page"') : ''}>${icon(ic)}<span>${label}</span></a>`;
  const tabActive = MORE_ROUTES.has(active) ? 'more' : active;
  setHTML(document.getElementById('tab-nav'), TABS.map(([id, label, ic]) => html`<a href="#/${id}" ${tabActive === id ? raw('aria-current="page"') : ''}>${icon(ic)}<span>${label}</span></a>`));
  setHTML(document.getElementById('side-nav'), html`
    ${TABS.slice(0, 4).map(link)}
    <div class="nav-group">Plus</div>
    ${SECONDARY.map(link)}`);
  const profiles = store.profiles;
  setHTML(document.getElementById('profile-switch'), profiles.length > 1
    ? html`<label for="profile-select" style="color:inherit">Profil actif</label><select id="profile-select">${profiles.map((p) => html`<option value="${p.id}" ${p.id === store.profile.id ? raw('selected') : ''}>${p.name}</option>`)}</select>`
    : html`<span>${store.profile.name}</span>`);
  const sel = document.getElementById('profile-select');
  if (sel) sel.onchange = async () => { await switchProfile(sel.value); toast(`Profil actif : ${store.profile.name}`); route(); };
}

async function route() {
  const { name, params, query } = parseHash();
  const loader = ROUTES[name] || ROUTES.today;
  const token = ++renderToken;
  renderNav(ROUTES[name] ? name : 'today');
  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* ignore */ } }
  cleanup = null;
  const main = document.getElementById('main');
  try {
    const mod = await loader();
    if (token !== renderToken) return;
    main.innerHTML = '';
    cleanup = await mod.render(main, params, query);
    const title = main.querySelector('h1')?.textContent;
    document.title = title ? `${title} — Style Studio` : 'Style Studio — Mon styliste personnel';
    if (!location.hash.includes('keep')) window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  } catch (e) {
    console.error(e);
    setHTML(main, html`<div class="callout callout-danger"><strong>Une erreur est survenue.</strong> <span>${e.message}</span><div class="btn-row" style="margin-top:10px"><button class="btn btn-sm" id="retry">Réessayer</button></div></div>`);
    main.querySelector('#retry').onclick = route;
  }
}
export function navigate(hash) { if (location.hash === hash) route(); else location.hash = hash; }
export function rerender() { route(); }

async function boot() {
  try { await initStore(); }
  catch (e) { setHTML(document.getElementById('main'), html`<div class="callout callout-danger">Stockage local indisponible : ${e.message}</div>`); return; }
  if (store.repo.isMemory) toast('Stockage du navigateur indisponible : vos données ne seront pas conservées après fermeture.', { timeout: 9000 });
  window.addEventListener('hashchange', route);
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => import('./state.js').then((m) => m.applyTheme()));
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker non enregistré', e));
  }
}
boot();
