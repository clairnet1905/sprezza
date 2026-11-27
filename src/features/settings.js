// Paramètres : export/import, gestion des données, confidentialité et consentements, thème, données de démonstration, suppression.
import { html, raw, setHTML } from '../lib/html.js';
import { icon, toast, options, confirmDialog, downloadFile, openModal } from '../components/ui.js';
import { store, saveSettings, saveProfile, pid } from '../state.js';
import { STORES, SCHEMA_VERSION, uid } from '../repositories/db.js';
import { validateExport } from '../domain/validate.js';
import { blobToDataURL, dataURLToBlob } from '../services/image.js';
import { aiStatus } from '../services/ai.js';
import { CAPSULE } from '../data/capsule.js';
import { COLOR_BY_ID, SEED_VERSION } from '../data/colors.js';
import { SUB_INFO } from '../data/taxonomy.js';
import { navigate } from '../app.js';

export async function render(main) {
  const ai = await aiStatus({ force: true });
  const counts = {};
  for (const s of Object.keys(STORES)) if (s !== 'tombstones') counts[s] = (await store.repo.all(s)).length;
  const est = navigator.storage?.estimate ? await navigator.storage.estimate().catch(() => null) : null;
  const persisted = navigator.storage?.persisted ? await navigator.storage.persisted().catch(() => false) : false;
  const c = store.profile.consents || {};
  const demoCount = (await store.repo.all('garments', (g) => g.demo)).length;
  setHTML(main, html`
    <div class="page-head"><div class="eyebrow">Paramètres</div><h1>Paramètres</h1><p class="lede">Local-first : vos données restent dans ce navigateur, sans compte. Pensez à exporter régulièrement.</p></div>
    <div class="callout callout-warn">Effacer les données du navigateur (ou désinstaller l'application sur iPhone) supprime aussi votre dressing. Exportez une sauvegarde régulièrement.</div>
    <section class="card" style="margin-top:14px"><h2 style="margin-top:0">Apparence</h2><div class="field"><label for="theme">Thème</label><select id="theme" style="max-width:280px">${options([['system', 'Selon l\'appareil'], ['light', 'Clair (ivoire)'], ['dark', 'Sombre']], store.settings.theme)}</select></div></section>
    <section class="card" style="margin-top:14px"><h2 style="margin-top:0">Confidentialité et consentements</h2>
      <p class="small muted">Profil concerné : ${store.profile.name}. Rien n'est transmis sans votre accord explicite.</p>
      <label class="check"><input type="checkbox" data-consent="weather" ${c.weather ? raw('checked') : ''}> Météo automatique (Open-Meteo : coordonnées arrondies de la ville, aucune donnée personnelle)</label>
      <label class="check"><input type="checkbox" data-consent="geoloc" ${c.geoloc ? raw('checked') : ''}> Localisation ponctuelle pour la météo (arrondie à ~1 km, jamais stockée en historique)</label>
      <label class="check"><input type="checkbox" data-consent="ai" ${c.ai ? raw('checked') : ''} ${store.profile.kind === 'child' ? raw('disabled') : ''}> Analyse IA des photos (envoi au fournisseur configuré sur le serveur, uniquement à chaque clic « Analyser avec l'IA »)</label>
      <p class="small">État de l'IA : ${ai.ai ? html`<span class="tag tag-ok">configurée</span> ${ai.provider || ''} ${ai.model || ''} — conservation : ${ai.retention || 'voir la politique du fournisseur'}` : html`<span class="tag">non configurée</span> ${ai.reason}`}</p>
      <details class="disclosure"><summary>Traitements et fournisseurs</summary><ul class="ticks small">
        <li>Stockage : IndexedDB local à ce navigateur (photos privées, miniatures, métadonnées EXIF supprimées par ré-encodage).</li>
        <li>Météo : Open-Meteo (open-meteo.com), uniquement après consentement.</li>
        <li>Polices : Google Fonts (Cormorant Garamond, Inter) — le navigateur contacte fonts.googleapis.com ; voir README pour l'auto-hébergement.</li>
        <li>IA : uniquement si un serveur SPREZZA avec clé est configuré ; la clé n'est jamais dans le navigateur.</li>
        <li>Aucune télémétrie, aucune publicité, aucun partage public. Liens externes ouverts sans référent.</li>
        <li>Cette application ne prétend pas à une conformité RGPD totale sans audit ; documenter traitements et fournisseurs avant toute mise en ligne publique.</li></ul></details></section>
    <section class="card" style="margin-top:14px" id="sync"><h2 style="margin-top:0">Synchronisation iPhone ↔ ordinateur</h2><div id="syncbox"><span class="loader"></span></div></section>
    <section class="card" style="margin-top:14px" id="apis"><h2 style="margin-top:0">Services gratuits connectés</h2><div id="apibox"></div></section>
    <section class="card" style="margin-top:14px"><h2 style="margin-top:0">Sauvegarde</h2>
      <label class="check"><input type="checkbox" id="withphotos"> Exporter aussi les photos (archive séparée, privée)</label>
      <div class="btn-row" style="margin-top:8px"><button class="btn btn-primary" id="export">${icon('download')} Exporter mes données (.json)</button><label class="btn" for="import">${icon('upload')} Importer une sauvegarde</label><input id="import" type="file" accept="application/json,.json" multiple class="sr-only"></div>
      <p class="hint">Format versionné (schemaVersion ${SCHEMA_VERSION}, seeds ${SEED_VERSION}). Import validé avec aperçu des conflits et confirmation avant écrasement.</p></section>
    <section class="card" style="margin-top:14px" id="photostore"><h2 style="margin-top:0">Photos : gagner de la place</h2>
      <p class="small muted">Les nouvelles photos sont enregistrées en <strong>WebP</strong> (≈ 25 à 35 % plus léger que le JPEG, même qualité) quand le navigateur le permet : Chrome, Edge, Firefox. Safari sur iPhone ne sait pas encore créer de WebP : il garde le JPEG, mais affiche très bien le WebP.</p>
      <p class="small" id="photostats"><span class="loader"></span></p>
      <div class="btn-row"><button class="btn" id="optimize">Optimiser mes photos existantes (WebP)</button></div>
      <p class="small muted" id="optmsg" aria-live="polite"></p></section>
    <section class="card" style="margin-top:14px"><h2 style="margin-top:0">Données</h2>
      <div class="table-wrap"><table><tbody>${Object.entries(counts).map(([k, n]) => html`<tr><td>${({ kv: 'Réglages et progression', profiles: 'Profils', garments: 'Vêtements', photos: 'Photos', outfits: 'Tenues', wearlog: 'Historique de port', calendar: 'Calendrier', wishlist: 'Liste d\'envies', palettes: 'Palettes', analyses: 'Analyses' })[k]}</td><td class="num">${n}</td></tr>`)}</tbody></table></div>
      <p class="small">${est ? `Espace utilisé : ${(est.usage / 1048576).toFixed(1)} Mo sur ${(est.quota / 1048576).toFixed(0)} Mo disponibles.` : ''} Stockage persistant : ${persisted ? 'accordé' : 'non accordé'}. ${store.repo.isMemory ? html`<strong style="color:var(--danger)">Stockage en mémoire uniquement (navigation privée ?)</strong>` : ''}</p>
      ${!persisted ? html`<button class="btn btn-sm" id="persist">Demander un stockage persistant</button>` : ''}</section>
    <section class="card" style="margin-top:14px"><h2 style="margin-top:0">Données de démonstration</h2>
      <p class="small">Un dressing d'exemple (pièces de la capsule, marquées « démo ») permet d'essayer le styliste. Elles sont clairement identifiées et supprimables.</p>
      <div class="btn-row"><button class="btn" id="demo" ${demoCount ? raw('disabled') : ''}>Charger la démonstration</button><button class="btn btn-danger" id="undemo" ${demoCount ? '' : raw('disabled')}>Supprimer la démonstration (${demoCount})</button></div></section>
    <section class="card" style="margin-top:14px;border-color:var(--danger)"><h2 style="margin-top:0">Supprimer toutes mes données</h2>
      <p class="small">Équivalent de la suppression du compte en mode local : tous les profils, vêtements, photos, tenues et réglages de cet appareil sont effacés. Exportez d'abord si besoin.</p>
      <button class="btn btn-danger" id="wipe">${icon('trash')} Tout supprimer</button></section>`);
  const $ = (s) => main.querySelector(s);
  $('#theme').onchange = (e) => saveSettings({ theme: e.target.value });
  renderSync(main.querySelector('#syncbox'));
  renderApis(main.querySelector('#apibox'));
  main.querySelectorAll('[data-consent]').forEach((cb) => cb.onchange = async () => { await saveProfile({ ...store.profile, consents: { ...store.profile.consents, [cb.dataset.consent]: cb.checked } }); toast(cb.checked ? 'Consentement enregistré' : 'Consentement retiré'); });
  $('#export').onclick = () => exportData($('#withphotos').checked);
  $('#import').onchange = (e) => importData([...e.target.files], main);
  $('#persist')?.addEventListener('click', async () => { const ok = await navigator.storage.persist(); toast(ok ? 'Stockage persistant accordé' : 'Refusé par le navigateur (installer l\'app sur l\'écran d\'accueil aide sur iPhone)'); navigate('#/settings'); });
  $('#demo').onclick = async () => { await loadDemo(); toast('Démonstration chargée'); navigate('#/wardrobe'); };
  $('#undemo').onclick = async () => {
    if (!(await confirmDialog({ title: 'Supprimer la démonstration ?', message: 'Seules les pièces marquées « démo » et les tenues qui en dépendent entièrement sont supprimées.', confirmLabel: 'Supprimer', danger: true }))) return;
    const demo = await store.repo.all('garments', (g) => g.demo);
    const ids = new Set(demo.map((g) => g.id));
    for (const g of demo) await store.repo.remove('garments', g.id);
    for (const o of await store.repo.all('outfits')) if (Object.values(o.garmentIds || {}).flat().filter(Boolean).every((id) => ids.has(id))) await store.repo.remove('outfits', o.id);
    const key = `capsule:${pid()}`; const cap = await store.repo.kvGet(key, null);
    if (cap?.items) { for (const [k, v] of Object.entries(cap.items)) if (ids.has(v.garmentId)) delete cap.items[k]; await store.repo.kvSet(key, cap); }
    toast('Démonstration supprimée'); navigate('#/settings');
  };
  setupPhotoStorage(main);
  $('#wipe').onclick = () => openModal({ title: 'Tout supprimer ?', body: html`<p>Action irréversible. Tapez <strong>SUPPRIMER</strong> pour confirmer.</p><input id="wconf" type="text" autocomplete="off"><div class="btn-row" style="margin-top:12px"><button class="btn btn-danger" data-ok>Supprimer définitivement</button></div>`,
    onMount(body, close) { body.querySelector('[data-ok]').onclick = async () => { if (body.querySelector('#wconf').value.trim() !== 'SUPPRIMER') { toast('Confirmation incorrecte'); return; } for (const s of Object.keys(STORES)) await store.repo.clear(s); close(); location.hash = '#/today'; location.reload(); }; } });
}

async function exportData(withPhotos) {
  const stores = {};
  for (const s of Object.keys(STORES)) {
    if (s === 'photos') continue;
    stores[s] = await store.repo.all(s);
  }
  stores.kv = stores.kv.filter((r) => !/^(weather:|sync:|apikey:|pexels:|product:)/.test(r.key)); // jamais de jeton de session dans un export
  delete stores.tombstones;
  const stamp = new Date().toISOString().slice(0, 10);
  downloadFile(`sprezza-sauvegarde-${stamp}.json`, JSON.stringify({ app: 'sprezza', schemaVersion: SCHEMA_VERSION, seedVersion: SEED_VERSION, exportedAt: new Date().toISOString(), photosIncluded: false, stores }, null, 2));
  if (withPhotos) {
    const photos = [];
    for (const p of await store.repo.all('photos')) photos.push({ ...p, blob: p.blob ? await blobToDataURL(p.blob) : null, thumb: p.thumb ? await blobToDataURL(p.thumb) : null });
    downloadFile(`sprezza-photos-${stamp}.json`, JSON.stringify({ app: 'sprezza', schemaVersion: SCHEMA_VERSION, kind: 'photos', exportedAt: new Date().toISOString(), stores: { photos } }));
  }
  toast(withPhotos ? 'Deux fichiers exportés (données + photos privées)' : 'Sauvegarde exportée (sans photos)');
}

async function importData(files, main) {
  for (const file of files) {
    let data;
    try { data = JSON.parse(await file.text()); } catch { toast(`${file.name} : JSON illisible`); continue; }
    const existing = {};
    for (const s of Object.keys(STORES)) existing[s] = await store.repo.all(s);
    let preview;
    try { preview = validateExport(data, existing); } catch (e) { openModal({ title: 'Import refusé', body: html`<p>${file.name}</p><ul class="ticks">${(e.issues || [e.message]).map((i) => html`<li>${i}</li>`)}</ul>` }); continue; }
    await new Promise((resolve) => openModal({ title: `Importer ${file.name}`, body: html`<p class="small muted">Exporté le ${new Date(data.exportedAt).toLocaleString('fr-FR')}. Aperçu :</p>
      <div class="table-wrap"><table><thead><tr><th>Données</th><th class="num">Total</th><th class="num">Nouveaux</th><th class="num">Conflits</th><th class="num">Doublons</th></tr></thead><tbody>${preview.map((p) => html`<tr><td>${p.store}${p.ignored ? ' (ignoré)' : ''}</td><td class="num">${p.count}</td><td class="num">${p.newRows ?? '—'}</td><td class="num">${p.conflicts ?? '—'}</td><td class="num">${p.dupes ?? '—'}</td></tr>`)}</tbody></table></div>
      <fieldset><legend>En cas de conflit</legend><label class="check"><input type="radio" name="mode" value="keep" checked> Conserver mes données actuelles</label><label class="check"><input type="radio" name="mode" value="overwrite"> Écraser avec la sauvegarde</label></fieldset>
      <div class="btn-row"><button class="btn btn-primary" data-ok>Importer</button><button class="btn" data-close>Annuler</button></div>`,
    onMount(body, close) {
      body.querySelector('[data-ok]').onclick = async () => {
        const mode = body.querySelector('input[name="mode"]:checked').value;
        let n = 0;
        for (const [s, rows] of Object.entries(data.stores)) {
          if (!(s in STORES)) continue;
          const key = STORES[s].keyPath; const have = new Set(existing[s].map((r) => r[key])); const seen = new Set();
          for (const r of rows) {
            if (seen.has(r[key])) continue; seen.add(r[key]);
            if (have.has(r[key]) && mode === 'keep') continue;
            const rec = { ...r };
            if (s === 'photos') { try { rec.blob = rec.blob ? dataURLToBlob(rec.blob) : null; rec.thumb = rec.thumb ? dataURLToBlob(rec.thumb) : null; } catch { continue; } }
            if (s === 'kv') await store.repo.put('kv', rec, { silent: true }); else await store.repo.put(s, rec, { silent: true });
            n++;
          }
        }
        close(); toast(`${n} enregistrement(s) importé(s)`); resolve();
        location.reload();
      };
      body.querySelector('[data-close]').addEventListener('click', resolve);
    } }));
  }
  void main;
}

/** Dressing de démonstration : pièces de la capsule, marquées demo:true et tag « démo ». */
export async function loadDemo() {
  const pick = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 19, 20, 26, 30];
  const subMap = { blazer: 'blazer', chemise: 'chemise', polo: 'polo', pull: 'pull', 'col roulé': 'col-roule', chino: 'chino', pantalon: 'pantalon', jean: 'jean', mocassins: 'mocassins', baskets: 'baskets', manteau: 'manteau', surchemise: 'surchemise', derbies: 'derbies', ceinture: 'ceinture-cuir', chelsea: 'chelsea', trench: 'trench' };
  const rain = { 15: 2, 19: 2, 26: 1, 30: 3, 10: 1 };
  const seasons = { 'Printemps/été': ['spring', 'summer'], 'Automne/hiver': ['autumn', 'winter'], 'Été': ['summer'], 'Mi-saison': ['spring', 'autumn'] };
  const cap = await store.repo.kvGet(`capsule:${pid()}`, { level: 1, items: {} });
  for (const id of pick) {
    const c = CAPSULE.find((x) => x.id === id); const col = COLOR_BY_ID[c.color]; const sub = subMap[c.sub]; const info = SUB_INFO[sub];
    const gid = uid('g');
    await store.repo.put('garments', { id: gid, profileId: pid(), demo: true, name: `${c.name} (démo)`, category: c.category, sub, color: { id: col.id, name: col.name, hex: col.hex }, color2: null, pattern: 'Uni', material: c.material, fit: ['bas', 'veste'].includes(c.category) ? 'tapered' : 'regular', seasons: seasons[c.season] || [], styles: [], tags: ['démo'], measures: {}, formality: info.formality, warmth: Math.max(1, info.warmth), comfort: 3, rainResistance: rain[id] ?? (c.material.includes('daim') || c.material.includes('Daim') ? 0 : 1), windResistance: c.category === 'manteau' ? 2 : 0, condition: 'very-good', availability: 'clean', photoIds: [] }, { silent: true });
    cap.items[id] = { owned: true, garmentId: gid };
  }
  await store.repo.kvSet(`capsule:${pid()}`, cap);
}

// ------------------------------------------------------------ Synchronisation (Supabase)
async function renderSync(box) {
  const sync = store.sync;
  const cfg = await sync.config();
  const session = await sync.session();
  const prefs = await sync.prefs();
  const last = await store.repo.kvGet('sync:lastSync', null);
  if (!cfg.configured) {
    setHTML(box, html`<p class="small">Pour retrouver le même dressing sur l'iPhone et l'ordinateur, SPREZZA utilise <strong>Supabase</strong> (offre gratuite). Une seule mise en place : créer le projet, exécuter le script <span class="mono">supabase/setup.sql</span>, puis coller ici l'adresse du projet et sa clé publique « anon ».</p>
      <form id="cfgf" class="form-grid"><div class="field span-2"><label for="surl">Adresse du projet (Project URL)</label><input id="surl" type="url" placeholder="https://xxxx.supabase.co" value="${cfg.url}"></div>
      <div class="field span-2"><label for="skey">Clé publique « anon » (jamais la clé service_role)</label><input id="skey" type="text" autocomplete="off" value="${cfg.anonKey}"></div>
      <button class="btn btn-primary" type="submit">Enregistrer la configuration</button></form><p class="small" id="cfgerr" role="alert"></p>`);
    box.querySelector('#cfgf').onsubmit = async (e) => {
      e.preventDefault();
      const url = box.querySelector('#surl').value.trim(); const anonKey = box.querySelector('#skey').value.trim();
      if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) { box.querySelector('#cfgerr').textContent = 'Adresse attendue : https://xxxx.supabase.co'; return; }
      if (/service_role/.test(atobSafe(anonKey))) { box.querySelector('#cfgerr').textContent = 'Ceci est la clé service_role : elle ne doit jamais être utilisée dans l\'app. Prenez la clé « anon public ».'; return; }
      await sync.saveConfig({ url, anonKey }); renderSync(box);
    };
    return;
  }
  if (!session) {
    setHTML(box, html`<p class="small">Créez votre compte SPREZZA une fois (sur n'importe quel appareil), puis connectez-vous avec le même e-mail sur l'iPhone et l'ordinateur. Vos données sont protégées par des règles d'accès : personne d'autre ne peut les lire.</p>
      <form id="authf" class="form-grid"><div class="field"><label for="semail">E-mail</label><input id="semail" type="email" autocomplete="username" required></div>
      <div class="field"><label for="spass">Mot de passe (8 caractères minimum)</label><input id="spass" type="password" autocomplete="current-password" minlength="8" required></div>
      <label class="check span-2"><input type="checkbox" id="sphotos" checked> Synchroniser aussi les photos des vêtements (stockage privé ; jamais celles d'un profil enfant)</label>
      <div class="btn-row span-2"><button class="btn btn-primary" type="submit" data-mode="in">Se connecter</button><button class="btn" type="submit" data-mode="up">Créer mon compte</button><button class="btn btn-ghost" type="button" id="forgot">Mot de passe oublié ?</button></div></form>
      <p class="small" id="autherr" role="alert" aria-live="polite"></p>
      <details class="disclosure"><summary>Configuration</summary><p class="small muted">Projet : ${cfg.url}</p><button class="btn btn-sm btn-ghost" id="resetcfg">Modifier la configuration</button></details>`);
    let mode = 'in';
    box.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; }));
    box.querySelector('#forgot').onclick = async () => {
      const email = box.querySelector('#semail').value.trim(); const out = box.querySelector('#autherr');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { out.textContent = 'Saisissez d\'abord votre e-mail dans le champ ci-dessus.'; box.querySelector('#semail').focus(); return; }
      out.textContent = 'Envoi…';
      try { await sync.requestPasswordReset(email); out.textContent = `Si un compte existe pour ${email}, un e-mail de réinitialisation vient d'être envoyé. Ouvrez le lien (sur n'importe quel appareil) pour choisir un nouveau mot de passe.`; }
      catch (err) { out.textContent = err.message; }
    };
    box.querySelector('#resetcfg').onclick = async () => { await store.repo.remove('kv', 'sync:config', { tombstone: false }); renderSync(box); };
    box.querySelector('#authf').onsubmit = async (e) => {
      e.preventDefault();
      const email = box.querySelector('#semail').value.trim(); const pass = box.querySelector('#spass').value;
      const out = box.querySelector('#autherr'); out.textContent = 'Un instant…';
      try {
        await sync.savePrefs({ ...prefs, photos: box.querySelector('#sphotos').checked });
        if (mode === 'up') {
          const r = await sync.signUp(email, pass);
          if (!r.confirmed) { out.textContent = 'Compte créé. Ouvrez l\'e-mail de confirmation (sur n\'importe quel appareil), puis revenez ici et cliquez « Se connecter ».'; return; }
        } else await sync.signIn(email, pass);
        out.textContent = 'Connecté. Première synchronisation…';
        await sync.sync({ reason: 'connexion' });
        renderSync(box);
      } catch (err) { out.textContent = err.message; }
    };
    return;
  }
  setHTML(box, html`<p>Connecté : <strong>${session.user.email}</strong></p>
    <p class="small muted" id="syncmsg">${sync.state.message || (last ? `Dernière synchronisation : ${new Date(last).toLocaleString('fr-FR')}` : 'Pas encore synchronisé')}</p>
    <label class="check"><input type="checkbox" id="sauto" ${prefs.auto ? raw('checked') : ''}> Synchronisation automatique (ouverture de l'app, retour sur l'app, après chaque modification)</label>
    <label class="check"><input type="checkbox" id="sphotos2" ${prefs.photos ? raw('checked') : ''}> Synchroniser les photos (stockage privé)</label>
    <div class="btn-row" style="margin-top:10px"><button class="btn btn-primary" id="snow">${icon('rotate')} Synchroniser maintenant</button><button class="btn" id="sout">Se déconnecter</button></div>
    <details class="disclosure" style="margin-top:10px"><summary>Données en ligne</summary><p class="small">Supprime toutes vos données et photos stockées en ligne. Les données de cet appareil restent intactes.</p><button class="btn btn-sm btn-danger" id="sdel">${icon('trash')} Supprimer mes données en ligne</button></details>`);
  const unsub = sync.onState((st) => { const m = box.querySelector('#syncmsg'); if (m) m.textContent = st.message || m.textContent; else unsub(); });
  box.querySelector('#sauto').onchange = async (e) => { await sync.savePrefs({ ...(await sync.prefs()), auto: e.target.checked }); };
  box.querySelector('#sphotos2').onchange = async (e) => { await sync.savePrefs({ ...(await sync.prefs()), photos: e.target.checked }); toast(e.target.checked ? 'Les photos seront synchronisées' : 'Les photos restent sur chaque appareil'); };
  box.querySelector('#snow').onclick = async () => { try { await sync.sync(); toast(sync.state.message); } catch (err) { toast(err.message); } renderSync(box); };
  box.querySelector('#sout').onclick = async () => { await sync.signOut(); renderSync(box); };
  box.querySelector('#sdel').onclick = async () => {
    if (!(await confirmDialog({ title: 'Supprimer mes données en ligne ?', message: 'Toutes les fiches et photos stockées sur Supabase seront définitivement supprimées. Vos appareils gardent leurs données locales ; une prochaine synchronisation les renverra en ligne.', confirmLabel: 'Supprimer en ligne', danger: true }))) return;
    try { await sync.deleteRemote(); toast('Données en ligne supprimées'); await sync.signOut(); renderSync(box); } catch (err) { toast(err.message); }
  };
}
function atobSafe(jwt) { try { return atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')); } catch { return ''; } }

// ------------------------------------------------------------ Services gratuits (clés personnelles)
async function renderApis(box) {
  const { getKey, setKey, searchPhotos, PROVIDERS } = await import('../services/pexels.js');
  const keys = { unsplash: await getKey('unsplash'), pexels: await getKey('pexels') };
  const mask = (k) => (k ? `${k.slice(0, 4)}…${k.slice(-4)}` : '');
  setHTML(box, html`<div class="table-wrap"><table><tbody>
      <tr><td><strong>Open-Meteo</strong><br><span class="small muted">Météo et recherche de ville</span></td><td>${store.profile.consents?.weather ? html`<span class="tag tag-ok">actif</span>` : html`<span class="tag">consentement requis</span>`}</td></tr>
      <tr><td><strong>Supabase</strong><br><span class="small muted">Synchronisation iPhone ↔ ordinateur</span></td><td>${(await store.sync.session()) ? html`<span class="tag tag-ok">connecté</span>` : html`<span class="tag">non connecté</span>`}</td></tr>
      ${['unsplash', 'pexels'].map((pv) => html`<tr><td><strong>${PROVIDERS[pv].name}</strong><br><span class="small muted">Photos réelles d'inspiration (licence libre)${pv === 'unsplash' ? ' — utilisé en priorité' : ''}</span></td><td>${keys[pv] ? html`<span class="tag tag-ok">clé enregistrée</span>` : html`<span class="tag">clé à ajouter</span>`}</td></tr>`)}
    </tbody></table></div>
    ${['unsplash', 'pexels'].map((pv) => html`<form class="form-grid" data-pv="${pv}" style="margin-top:12px"><div class="field span-2"><label for="k-${pv}">Clé ${PROVIDERS[pv].name} ${pv === 'unsplash' ? '(« Access Key »)' : ''}</label><input id="k-${pv}" type="text" autocomplete="off" spellcheck="false" placeholder="Collez votre clé ici" value="${mask(keys[pv])}"></div>
      <div class="btn-row span-2"><button class="btn btn-primary" type="submit">Enregistrer et tester</button>${keys[pv] ? html`<button class="btn btn-ghost" type="button" data-del="${pv}">Retirer</button>` : ''}<a class="btn" href="${PROVIDERS[pv].signup}" target="_blank" rel="noopener noreferrer">${icon('external')} Obtenir une clé gratuite</a></div>
      <p class="small span-2" data-msg aria-live="polite"></p></form>`)}
    <p class="hint">Une seule clé suffit. Les clés sont privées : elles restent dans vos données (synchronisées entre vos appareils via votre compte), jamais dans le code publié ni dans les exports.</p>`);
  box.querySelectorAll('form[data-pv]').forEach((f) => f.onsubmit = async (e) => {
    e.preventDefault();
    const pv = f.dataset.pv; const v = f.querySelector('input').value.trim(); const msg = f.querySelector('[data-msg]');
    if (!v || v.includes('…')) { msg.textContent = 'Collez la clé complète.'; return; }
    msg.textContent = 'Test en cours…';
    try { const photos = await searchPhotos('men navy blazer', { perPage: 1, key: v, provider: pv }); await setKey(v, pv); msg.textContent = `Clé valide (${photos.length ? 'photos reçues' : 'aucune photo'}).`; renderApis(box); }
    catch (err) { msg.textContent = err.message; }
  });
  box.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { await setKey('', b.dataset.del); renderApis(box); });
}

// ---------------------------------------------------------------- Photos : poids et conversion WebP
const MB = (n) => `${(n / 1048576).toFixed(1).replace('.', ',')} Mo`;
async function setupPhotoStorage(main) {
  const { supportsWebP, reencodeSmaller } = await import('../services/image.js');
  const $ = (q) => main.querySelector(q);
  const stats = async () => {
    const all = await store.repo.all('photos');
    let total = 0, webp = 0, n = 0;
    for (const p of all) for (const k of ['blob', 'thumb', 'originalBlob', 'originalThumb']) if (p[k]) { total += p[k].size; n++; if (p[k].type === 'image/webp') webp++; }
    $('#photostats').textContent = `${all.length} photo(s), ${MB(total)} au total sur cet appareil — ${webp}/${n} fichier(s) déjà en WebP.`;
    return all;
  };
  await stats();
  const ok = await supportsWebP();
  if (!ok) { $('#optimize').disabled = true; $('#optmsg').textContent = 'Ce navigateur ne sait pas créer de WebP (Safari/iPhone). Lancez l\'optimisation depuis l\'ordinateur (Chrome, Edge ou Firefox) : avec la synchronisation, les photos allégées arrivent ensuite sur l\'iPhone.'; }
  $('#optimize').onclick = async () => {
    const btn = $('#optimize'); btn.disabled = true;
    const all = await store.repo.all('photos');
    let saved = 0, done = 0;
    for (const p of all) {
      const next = { ...p }; let changed = false;
      for (const [k, q] of [['blob', 0.84], ['thumb', 0.78], ['originalBlob', 0.84], ['originalThumb', 0.78]]) {
        if (!p[k]) continue;
        try { const b = await reencodeSmaller(p[k], q); if (b) { saved += p[k].size - b.size; next[k] = b; changed = true; } } catch { /* photo illisible : laissée telle quelle */ }
      }
      if (changed) { next.mime = next.blob?.type || p.mime; await store.repo.put('photos', next); }
      done++; $('#optmsg').textContent = `Optimisation… ${done}/${all.length}`;
    }
    const { forgetPhotoURL } = await import('../state.js'); all.forEach((p) => forgetPhotoURL?.(p.id));
    $('#optmsg').textContent = saved > 0 ? `Terminé : ${MB(saved)} gagnés. Les photos allégées seront envoyées à vos autres appareils à la prochaine synchronisation.` : 'Terminé : vos photos étaient déjà optimisées.';
    btn.disabled = false; await stats();
  };
}
