// SPREZZA — point d'entrée : routeur hash, navigation, enregistrement PWA.
import { html, setHTML, raw } from './lib/html.js';
import { icon, toast, openModal } from './components/ui.js';
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
    document.title = title ? `${title} — SPREZZA` : 'SPREZZA — Mon styliste personnel';
    if (!location.hash.includes('keep')) window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
    sessionStorage.removeItem('sprezza:reloaded');
  } catch (e) {
    console.error(e);
    // Module introuvable pendant une mise à jour (ancienne et nouvelle version qui se croisent) : un rechargement suffit.
    if (/dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(e.message) && !sessionStorage.getItem('sprezza:reloaded')) {
      sessionStorage.setItem('sprezza:reloaded', '1'); location.reload(); return;
    }
    setHTML(main, html`<div class="callout callout-danger"><strong>Une erreur est survenue.</strong> <span>${e.message}</span><div class="btn-row" style="margin-top:10px"><button class="btn btn-sm" id="retry">Réessayer</button></div></div>`);
    main.querySelector('#retry').onclick = () => { sessionStorage.removeItem('sprezza:reloaded'); location.reload(); };
  }
}
export function navigate(hash) { if (location.hash === hash) route(); else location.hash = hash; }
export function rerender() { route(); }

async function boot() {
  try { await initStore(); }
  catch (e) { setHTML(document.getElementById('main'), html`<div class="callout callout-danger">Stockage local indisponible : ${e.message}</div>`); return; }
  if (store.repo.isMemory) toast('Stockage du navigateur indisponible : vos données ne seront pas conservées après fermeture.', { timeout: 9000 });
  await handleAuthRedirect();
  document.addEventListener('click', onInspireClick);
  window.addEventListener('hashchange', route);
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => import('./state.js').then((m) => m.applyTheme()));
  route();
  setupSync();
  // Demande au navigateur de ne jamais effacer les données (accordé surtout quand l'app est installée)
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) navigator.storage.persist().catch(() => {}); } catch { /* navigateur ancien */ }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    setupUpdates();
  }
}

/**
 * Mises à jour : une fenêtre restée ouverte (ordinateur, app installée) garde l'ancien code en mémoire.
 * On vérifie à chaque retour sur l'app et toutes les 30 min ; dès qu'une version est prête, bandeau « Mettre à jour »
 * (ou rechargement discret si l'app est en arrière-plan).
 */
function setupUpdates() {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const check = () => reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    window.addEventListener('online', check);
    setInterval(check, 30 * 60 * 1000);
  }).catch((e) => console.warn('Service worker non enregistré', e));
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // première installation : rien à recharger
    const editing = /\/(new|edit)\b/.test(location.hash) || document.querySelector('dialog[open], .modal');
    if (document.visibilityState === 'hidden' && !editing) { location.reload(); return; }
    if (document.getElementById('update-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'update-bar'; bar.className = 'update-bar'; bar.setAttribute('role', 'status');
    bar.innerHTML = '<span>Nouvelle version de SPREZZA disponible.</span><button class="btn btn-sm btn-gold" type="button">Mettre à jour</button>';
    bar.querySelector('button').onclick = () => location.reload();
    document.body.appendChild(bar);
  });
}

/** Version installée (nom du cache du service worker). */
export async function appVersion() {
  try { const n = (await caches.keys()).map((k) => Number(k.match(/^sprezza-v(\d+)$/)?.[1])).filter(Boolean); return n.length ? `v${Math.max(...n)}` : 'inconnue'; } catch { return 'inconnue'; }
}
/** Force la recherche d'une mise à jour puis recharge. */
export async function forceUpdate() {
  const reg = await navigator.serviceWorker?.getRegistration();
  await reg?.update().catch(() => {});
  location.reload();
}

/** Photos d'inspiration Pexels, à la demande (délégation : fonctionne dans tous les écrans). */
async function onInspireClick(e) {
  const btn = e.target.closest('[data-inspire]');
  if (!btn) return;
  const out = btn.parentElement.querySelector('.inspire-out');
  setHTML(out, html`<p class="small"><span class="loader"></span> Recherche…</p>`);
  try {
    const { searchPhotos, PROVIDERS } = await import('./services/pexels.js');
    const photos = await searchPhotos(btn.dataset.inspire);
    setHTML(out, photos.length ? html`<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr));margin-top:10px">${photos.map((ph) => html`<figure style="margin:0"><a href="${ph.page}" target="_blank" rel="noopener noreferrer" class="g-thumb" style="border-radius:10px;display:block" title="Voir la photo originale"><img src="${ph.thumb}" alt="${ph.alt || 'Photo d\'inspiration'}" loading="lazy" referrerpolicy="no-referrer"></a><figcaption class="small muted" style="margin-top:4px">Photo : <a href="${ph.photographerUrl}" target="_blank" rel="noopener noreferrer">${ph.photographer}</a> sur <a href="${PROVIDERS[ph.provider || 'pexels'].site}" target="_blank" rel="noopener noreferrer">${PROVIDERS[ph.provider || 'pexels'].name}</a></figcaption></figure>`)}</div><p class="small muted">Photos réelles sous licence libre (Unsplash ou Pexels) : des pistes d'association, à adapter à vos proportions.</p>` : html`<p class="small muted">Aucune photo trouvée pour cette association.</p>`);
    btn.textContent = 'Actualiser';
  } catch (err) {
    setHTML(out, html`<p class="small callout ${err.code ? '' : 'callout-warn'}">${err.message}${err.code ? html` — <a href="#/settings">ajouter ma clé gratuite</a>` : ''}</p>`);
  }
}

/** Après le lien « mot de passe oublié » : choisir le nouveau mot de passe. */
function askNewPassword() {
  openModal({ title: 'Nouveau mot de passe', body: html`<form id="npf"><p class="small">Choisissez votre nouveau mot de passe SPREZZA (8 caractères minimum).</p>
      <div class="field"><label for="np1">Nouveau mot de passe</label><input id="np1" type="password" autocomplete="new-password" minlength="8" required></div>
      <div class="field"><label for="np2">Confirmer</label><input id="np2" type="password" autocomplete="new-password" minlength="8" required></div>
      <p class="small" id="npmsg" role="alert"></p><button class="btn btn-primary" type="submit">Enregistrer</button></form>`,
  onMount(body, close) {
    body.querySelector('#npf').onsubmit = async (e) => {
      e.preventDefault();
      const a = body.querySelector('#np1').value; const b = body.querySelector('#np2').value; const msg = body.querySelector('#npmsg');
      if (a.length < 8) { msg.textContent = '8 caractères minimum.'; return; }
      if (a !== b) { msg.textContent = 'Les deux mots de passe ne sont pas identiques.'; return; }
      try { await store.sync.updatePassword(a); close(); toast('Mot de passe modifié. Sur vos autres appareils (dont l\'app de l\'écran d\'accueil), connectez-vous avec ce nouveau mot de passe.', { timeout: 10000 }); route(); }
      catch (err) { msg.textContent = err.message; }
    };
  } });
}

/** Retour depuis l'e-mail de confirmation Supabase (#access_token=… ou #error=…). */
async function handleAuthRedirect() {
  const h = location.hash.replace(/^#/, '');
  if (!/(^|&)(access_token|error)=/.test(h)) return;
  const p = new URLSearchParams(h);
  history.replaceState(null, '', location.pathname + '#/settings');
  if (p.get('error')) { toast(`Lien de confirmation invalide ou expiré : ${p.get('error_description') || p.get('error')}. Reconnectez-vous ou recréez le lien.`, { timeout: 9000 }); return; }
  try {
    const claims = JSON.parse(atob(p.get('access_token').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    await store.sync.storeSession({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: Number(p.get('expires_in')) || 3600, user: { id: claims.sub, email: claims.email } });
    if (p.get('type') === 'recovery') { setTimeout(askNewPassword, 600); return; }
    toast('E-mail confirmé : vous êtes connecté. Sur l\'app installée de l\'iPhone, connectez-vous aussi avec le même compte.', { timeout: 9000 });
  } catch { toast('E-mail confirmé. Connectez-vous dans Paramètres › Synchronisation.', { timeout: 9000 }); }
}

/** Indicateur discret dans l'en-tête et rafraîchissement de l'écran après réception de données. */
function setupSync() {
  const sync = store.sync;
  const box = document.getElementById('topbar-actions');
  sync.onState((st) => {
    if (!st.status || st.status === 'idle') { box.innerHTML = ''; return; }
    const label = { syncing: 'Synchronisation…', ok: 'Synchronisé', error: 'Synchro en échec', offline: 'Hors ligne' }[st.status] || '';
    setHTML(box, html`<a href="#/settings" class="tag ${st.status === 'ok' ? 'tag-ok' : st.status === 'error' ? 'tag-danger' : ''}" title="${st.message}">${st.status === 'syncing' ? raw('<span class="loader" style="width:12px;height:12px"></span>') : icon('rotate')} ${label}</a>`);
  });
  store.repo.onChange(async ({ store: s, op }) => {
    if (s !== 'sync' || op !== 'pull') return;
    store.profiles = await store.repo.all('profiles');
    store.profile = store.profiles.find((p) => p.id === store.profile?.id) || store.profile;
    const editing = /\/(new|edit|import)/.test(location.hash) || document.querySelector('.modal-backdrop');
    if (editing) toast('Nouvelles données reçues : elles apparaîtront à la fermeture du formulaire');
    else { route(); toast('Données mises à jour depuis vos autres appareils'); }
  });
  sync.startAuto();
}
boot();
