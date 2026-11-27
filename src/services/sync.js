// Synchronisation iPhone ↔ ordinateur via Supabase (offre gratuite), sans dépendance :
// Auth (e-mail + mot de passe), REST (table sprezza_records protégée par RLS) et Storage privé pour les photos.
// Stratégie : on récupère d'abord les changements distants, puis on envoie les changements locaux.
// En cas de conflit, la version la plus récente (updatedAt) l'emporte. Les suppressions voyagent via « tombstones ».
import { SYNC_CONFIG } from '../config.js';

const BUCKET = 'sprezza-photos';
const SYNCED_STORES = ['profiles', 'garments', 'photos', 'outfits', 'wearlog', 'calendar', 'wishlist', 'palettes', 'analyses', 'kv'];
const KV_SYNCED = /^(prefs:|capsule:|today:|academy$|apikey:)/;
const PAGE = 500;

/** Une ligne locale doit-elle être synchronisée ? (fonction pure, testée) */
export function shouldSync(store, rec, { childProfileIds = [], photos = true } = {}) {
  if (!SYNCED_STORES.includes(store)) return false;
  if (store === 'kv') return KV_SYNCED.test(rec.key);
  if (store === 'photos') {
    if (!photos) return false;
    if (rec.profileId && childProfileIds.includes(rec.profileId)) return false; // profil enfant : photos jamais envoyées
  }
  return true;
}
/** Faut-il appliquer la version distante ? La plus récente gagne ; égalité = distante (idempotent). */
export function remoteWins(local, remote) {
  if (!local) return true;
  const l = local.updatedAt || ''; const r = remote.updatedAt || '';
  return r >= l;
}
export const keyOf = (store, rec) => (store === 'kv' ? rec.key : rec.id);

export class SyncService {
  constructor(repo) {
    this.repo = repo;
    this.listeners = new Set();
    this.state = { status: 'idle', message: '', lastSync: null };
    this.running = null;
    this.timer = null;
  }
  onState(fn) { this.listeners.add(fn); fn(this.state); return () => this.listeners.delete(fn); }
  setState(patch) { this.state = { ...this.state, ...patch }; this.listeners.forEach((fn) => fn(this.state)); }

  async config() {
    const local = await this.repo.kvGet('sync:config', null);
    const url = (local?.url || SYNC_CONFIG.url || '').replace(/\/+$/, '');
    const anonKey = local?.anonKey || SYNC_CONFIG.anonKey || '';
    return { url, anonKey, configured: /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && anonKey.length > 20 };
  }
  async saveConfig({ url, anonKey }) { await this.repo.kvSet('sync:config', { url: url.trim(), anonKey: anonKey.trim() }); }
  session() { return this.repo.kvGet('sync:session', null); }
  prefs() { return this.repo.kvGet('sync:prefs', { photos: true, auto: true }); }
  savePrefs(p) { return this.repo.kvSet('sync:prefs', p); }

  // ------------------------------------------------------------ HTTP
  async http(path, { method = 'GET', body, headers = {}, auth = true, raw = false, timeout = 30000 } = {}) {
    const cfg = await this.config();
    if (!cfg.configured) throw new Error('Synchronisation non configurée');
    const h = { apikey: cfg.anonKey, ...headers };
    if (auth) { const s = await this.validSession(); h.Authorization = `Bearer ${s.access_token}`; }
    if (body !== undefined && !(body instanceof Blob)) { h['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeout);
    let r;
    try { r = await fetch(cfg.url + path, { method, headers: h, body, signal: ctrl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' }); }
    catch (e) { throw new Error(e.name === 'AbortError' ? 'Délai dépassé (réseau)' : 'Réseau indisponible'); }
    finally { clearTimeout(t); }
    if (raw) return r;
    const text = await r.text();
    const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
    if (!r.ok) {
      const msg = data?.msg || data?.message || data?.error_description || data?.error || `Erreur ${r.status}`;
      throw Object.assign(new Error(translate(msg)), { status: r.status });
    }
    return data;
  }

  // ------------------------------------------------------------ Auth
  async signUp(email, password) {
    const d = await this.http('/auth/v1/signup', { method: 'POST', body: { email, password }, auth: false });
    if (d?.access_token) { await this.storeSession(d); return { confirmed: true }; }
    return { confirmed: false }; // e-mail de confirmation envoyé
  }
  async signIn(email, password) {
    const d = await this.http('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password }, auth: false });
    await this.storeSession(d);
  }
  /** E-mail de réinitialisation ; le lien ramène sur l'app (#access_token=…&type=recovery). */
  async requestPasswordReset(email) {
    const back = `${location.origin}${location.pathname}`;
    await this.http(`/auth/v1/recover?redirect_to=${encodeURIComponent(back)}`, { method: 'POST', body: { email }, auth: false });
  }
  async updatePassword(password) {
    await this.http('/auth/v1/user', { method: 'PUT', body: { password } });
  }
  async storeSession(d) {
    await this.repo.kvSet('sync:session', { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + (d.expires_in || 3600) * 1000, user: { id: d.user?.id, email: d.user?.email } });
  }
  async validSession() {
    const s = await this.session();
    if (!s) throw Object.assign(new Error('Non connecté'), { status: 401 });
    if (Date.now() < s.expires_at - 60000) return s;
    const d = await this.http('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh_token }, auth: false });
    await this.storeSession(d);
    return this.session();
  }
  async signOut() {
    try { await this.http('/auth/v1/logout', { method: 'POST' }); } catch { /* hors ligne : on oublie la session localement */ }
    await this.repo.remove('kv', 'sync:session', { tombstone: false });
    for (const k of ['sync:lastPull', 'sync:lastPush']) await this.repo.remove('kv', k, { tombstone: false });
    this.setState({ status: 'idle', message: 'Déconnecté', lastSync: null });
  }

  // ------------------------------------------------------------ Synchronisation
  sync({ reason = 'manuel' } = {}) {
    if (this.running) return this.running;
    this.running = this._sync(reason).finally(() => { this.running = null; });
    return this.running;
  }
  async _sync(reason) {
    const s = await this.session();
    if (!s || !(await this.config()).configured) return { skipped: true };
    if (!navigator.onLine) { this.setState({ status: 'offline', message: 'Hors ligne : synchronisation au retour du réseau' }); return { skipped: true }; }
    this.setState({ status: 'syncing', message: 'Synchronisation…' });
    try {
      const prefs = await this.prefs();
      const profiles = await this.repo.all('profiles');
      const opts = { childProfileIds: profiles.filter((p) => p.kind === 'child').map((p) => p.id), photos: prefs.photos };
      const pulled = await this.pull(s.user.id, opts);
      const pushed = await this.push(s.user.id, opts);
      const now = new Date().toISOString();
      await this.repo.kvSet('sync:lastSync', now);
      this.setState({ status: 'ok', message: `Synchronisé (${pulled} reçu${pulled > 1 ? 's' : ''}, ${pushed} envoyé${pushed > 1 ? 's' : ''})`, lastSync: now });
      return { pulled, pushed, reason };
    } catch (e) {
      this.setState({ status: 'error', message: e.status === 401 ? 'Session expirée : reconnectez-vous' : `Échec : ${e.message}` });
      if (e.status === 401) await this.repo.remove('kv', 'sync:session', { tombstone: false });
      throw e;
    }
  }

  async pull(userId, opts) {
    const since = await this.repo.kvGet('sync:lastPull', '1970-01-01T00:00:00Z');
    let count = 0; let maxTs = since; let offset = 0;
    for (;;) {
      const rows = await this.http(`/rest/v1/sprezza_records?select=store,key,data,deleted,synced_at&synced_at=gt.${encodeURIComponent(since)}&order=synced_at.asc&limit=${PAGE}&offset=${offset}`);
      for (const row of rows) {
        if (row.synced_at > maxTs) maxTs = row.synced_at;
        if (!SYNCED_STORES.includes(row.store)) continue;
        const local = await this.repo.get(row.store, row.key);
        if (row.deleted) {
          if (local && (local.updatedAt || '') > (row.data?.deletedAt || '')) continue; // recréé localement depuis
          if (local) { await this.repo.remove(row.store, row.key, { tombstone: false, silent: true }); count++; }
          continue;
        }
        if (!row.data || !remoteWins(local, row.data)) continue;
        if (!local) { // supprimé ici après la dernière version distante : la suppression l'emporte
          const tomb = await this.repo.get('tombstones', `${row.store}:${row.key}`);
          if (tomb && tomb.deletedAt >= (row.data.updatedAt || '')) continue;
        }
        const rec = { ...row.data };
        if (row.store === 'photos') {
          if (!opts.photos) continue;
          rec.blob = rec.hasBlob ? await this.download(`${userId}/${row.key}.jpg`) : null;
          rec.thumb = rec.hasThumb ? await this.download(`${userId}/${row.key}_t.jpg`) : null;
          delete rec.hasBlob; delete rec.hasThumb;
        }
        await this.repo.put(row.store, rec, { raw: true, silent: true });
        await this.repo.remove('tombstones', `${row.store}:${row.key}`, { tombstone: false, silent: true });
        count++;
      }
      if (rows.length < PAGE) break;
      offset += PAGE;
    }
    await this.repo.kvSet('sync:lastPull', maxTs);
    if (count) this.repo.emit('sync', 'pull', count);
    return count;
  }

  async push(userId, opts) {
    const since = await this.repo.kvGet('sync:lastPush', '');
    const startedAt = new Date().toISOString();
    const batch = [];
    for (const store of SYNCED_STORES) {
      for (const rec of await this.repo.all(store)) {
        if ((rec.updatedAt || '') <= since || !shouldSync(store, rec, opts)) continue;
        const key = keyOf(store, rec);
        let data = { ...rec };
        if (store === 'photos') {
          if (rec.blob) await this.upload(`${userId}/${key}.jpg`, rec.blob);
          if (rec.thumb) await this.upload(`${userId}/${key}_t.jpg`, rec.thumb);
          data = { ...rec, blob: undefined, thumb: undefined, originalBlob: undefined, originalThumb: undefined, hasBlob: !!rec.blob, hasThumb: !!rec.thumb };
        }
        batch.push({ user_id: userId, store, key, data: JSON.parse(JSON.stringify(data)), deleted: false });
      }
    }
    for (const t of await this.repo.all('tombstones')) {
      if (t.deletedAt <= since || !SYNCED_STORES.includes(t.store)) continue;
      if (t.store === 'kv' && !KV_SYNCED.test(t.key)) continue;
      if (await this.repo.get(t.store, t.key)) continue; // recréé depuis la suppression
      batch.push({ user_id: userId, store: t.store, key: t.key, data: { deletedAt: t.deletedAt }, deleted: true });
      if (t.store === 'photos') await this.http(`/storage/v1/object/${BUCKET}`, { method: 'DELETE', body: { prefixes: [`${userId}/${t.key}.jpg`, `${userId}/${t.key}_t.jpg`] } }).catch(() => {});
    }
    for (let i = 0; i < batch.length; i += PAGE) {
      await this.http('/rest/v1/sprezza_records?on_conflict=user_id,store,key', { method: 'POST', body: batch.slice(i, i + PAGE), headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } });
    }
    await this.repo.kvSet('sync:lastPush', startedAt);
    // Nettoyage des tombstones déjà propagées depuis plus de 60 jours
    const old = new Date(Date.now() - 60 * 864e5).toISOString();
    for (const t of await this.repo.all('tombstones')) if (t.deletedAt < old) await this.repo.remove('tombstones', t.id, { tombstone: false, silent: true });
    return batch.length;
  }

  upload(path, blob) {
    return this.http(`/storage/v1/object/${BUCKET}/${path}`, { method: 'POST', body: blob, headers: { 'Content-Type': blob.type || 'image/jpeg', 'x-upsert': 'true', 'Cache-Control': 'max-age=3600' }, timeout: 120000 });
  }
  async download(path) {
    const r = await this.http(`/storage/v1/object/authenticated/${BUCKET}/${path}`, { raw: true, timeout: 120000 });
    if (!r.ok) return null; // photo absente : la fiche reste utilisable
    return r.blob();
  }

  /**
   * Lien temporaire (15 min) vers une photo, pour la recherche visuelle Google Lens.
   * Un seul fichier, écrasé à chaque recherche et supprimé ensuite (clearLens).
   */
  async lensUrl(blob) {
    const s = await this.validSession();
    const path = `${s.user.id}/lens/current.jpg`;
    await this.upload(path, blob);
    const d = await this.http(`/storage/v1/object/sign/${BUCKET}/${path}`, { method: 'POST', body: { expiresIn: 900 } });
    const cfg = await this.config();
    return `${cfg.url}/storage/v1${d.signedURL || d.signedUrl}`;
  }
  async clearLens() {
    const s = await this.session(); if (!s) return;
    await this.http(`/storage/v1/object/${BUCKET}`, { method: 'DELETE', body: { prefixes: [`${s.user.id}/lens/current.jpg`] } }).catch(() => {});
  }

  /** Supprime toutes mes données en ligne (lignes + photos). Les données locales restent. */
  async deleteRemote() {
    const s = await this.validSession();
    await this.http(`/rest/v1/sprezza_records?user_id=eq.${s.user.id}`, { method: 'DELETE' });
    const files = await this.http(`/storage/v1/object/list/${BUCKET}`, { method: 'POST', body: { prefix: `${s.user.id}/`, limit: 10000 } }).catch(() => []);
    const names = (files || []).map((f) => `${s.user.id}/${f.name}`);
    if (names.length) await this.http(`/storage/v1/object/${BUCKET}`, { method: 'DELETE', body: { prefixes: names } });
    await this.clearLens();
    for (const k of ['sync:lastPull', 'sync:lastPush']) await this.repo.remove('kv', k, { tombstone: false });
  }

  /** Synchronisation automatique : au démarrage, au retour sur l'app, et quelques secondes après une modification. */
  async startAuto() {
    if (this.autoStarted) return;
    this.autoStarted = true;
    const kick = async (reason) => { const p = await this.prefs(); if (p.auto && (await this.session())) this.sync({ reason }).catch(() => {}); };
    this.repo.onChange(({ store, op, value }) => {
      if (op === 'pull' || store === 'sync' || store === 'tombstones') return;
      if (store === 'kv' && !KV_SYNCED.test(String(value?.key ?? value ?? ''))) return; // réglages locaux, météo, état de synchro
      clearTimeout(this.timer); this.timer = setTimeout(() => kick('modification'), 4000);
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') kick('retour'); });
    window.addEventListener('online', () => kick('réseau'));
    kick('démarrage');
  }
}

function translate(msg) {
  const m = String(msg);
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect';
  if (/Email not confirmed/i.test(m)) return 'Confirmez d\'abord votre e-mail (lien reçu par mail), puis reconnectez-vous';
  if (/already registered|already exists/i.test(m)) return 'Un compte existe déjà avec cet e-mail : connectez-vous';
  if (/New password should be different/i.test(m)) return 'Choisissez un mot de passe différent de l\'ancien';
  if (/rate limit|only request this after/i.test(m)) return 'Trop de demandes : attendez une minute avant de réessayer';
  if (/Password should be at least/i.test(m)) return 'Mot de passe trop court (8 caractères minimum conseillés)';
  if (/relation .* does not exist|sprezza_records/i.test(m)) return 'Base non initialisée : exécutez le script supabase/setup.sql';
  if (/Bucket not found/i.test(m)) return 'Stockage photo absent : exécutez le script supabase/setup.sql';
  return m;
}
