// Calendrier : planifier des tenues, consulter l'historique, préparer plusieurs jours, export ICS sur action.
import { html, raw, setHTML } from '../lib/html.js';
import { icon, toast, options, openModal, fmtDate, todayISO, downloadFile, confirmDialog } from '../components/ui.js';
import { store, pid, garments as loadGarments, outfits as loadOutfits, calendar as loadCalendar, wearlog as loadWearlog, prefs as loadPrefs } from '../state.js';
import { uid } from '../repositories/db.js';
import { OCCASIONS, OCCASION_BY_ID } from '../data/occasions.js';
import { recommend } from '../domain/recommend.js';
import { manualWeather, seasonFromDate } from '../domain/weather.js';
import { buildICS } from '../domain/wardrobe-logic.js';
import { idsToPieces, piecesList, saveOutfit, wearOutfit, MODE_NAME, addToCalendar } from './shared.js';
import { parseICS, parseAgendaText, occasionForEvent, dayPlan } from '../domain/calendar-import.js';
import { navigate } from '../app.js';

let cursor = new Date();

export async function render(main) {
  const [cal, wl, outs, all] = await Promise.all([loadCalendar(), loadWearlog(), loadOutfits(), loadGarments()]);
  const y = cursor.getFullYear(); const m = cursor.getMonth();
  const first = new Date(y, m, 1); const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const today = todayISO();
  const outBy = Object.fromEntries(outs.map((o) => [o.id, o]));
  setHTML(main, html`
    <div class="page-head row-between"><div><div class="eyebrow">Calendrier</div><h1>Mes tenues planifiées</h1><p class="lede">Planifier par date et occasion, consulter l'historique de port, préparer plusieurs jours.</p></div>
      <div class="btn-row"><button class="btn btn-primary" id="week">📅 Préparer ma semaine</button><button class="btn" id="multi">${icon('calendar')} Plusieurs jours (choix libre)</button><button class="btn" id="ics">${icon('download')} Exporter (.ics)</button></div></div>
    <section class="card card-accent" style="margin-bottom:16px"><div class="row-between" style="align-items:flex-start;gap:12px"><div><div class="eyebrow">Mon agenda</div><h2 style="margin:0">Synchroniser mes rendez-vous</h2>
      <p class="small" style="margin:6px 0 0">Importez vos événements : SPREZZA reconnaît le type de rendez-vous (client, ménage, dîner, mariage…) et prépare la tenue de chaque jour, pour le plus exigeant de la journée.</p></div></div>
      <div class="btn-row" style="margin-top:10px"><label class="btn btn-primary" for="icsfile">${icon('upload')} Importer un fichier agenda (.ics)</label><input id="icsfile" type="file" accept=".ics,text/calendar" hidden><button class="btn btn-gold" id="gcal">${icon('calendar')} Google Agenda (Gmail)</button><button class="btn" id="agpaste">${icon('edit')} Coller mes rendez-vous</button></div>
      <details class="disclosure"><summary>Comment récupérer mon agenda ?</summary><ul class="ticks small">
        <li><strong>Google Agenda</strong> (sur ordinateur) : Paramètres → Importer et exporter → Exporter. Décompressez le fichier .zip et importez le .ics ici.</li>
        <li><strong>Outlook</strong> : Paramètres → Calendrier → Calendriers partagés → Publier → lien ICS ; ouvrez ce lien, il télécharge le fichier .ics.</li>
        <li><strong>iPhone</strong> : le plus simple est « Coller mes rendez-vous » : une ligne par rendez-vous, par exemple « 28/11 14h rendez-vous client Dupont », « demain 8h ménage bureaux », « samedi mariage de Léa ». Une invitation reçue par e-mail (.ics) peut aussi être enregistrée dans Fichiers puis importée.</li>
        <li>Vos événements restent sur cet appareil : ils ne sont envoyés à aucun service.</li></ul></details>
    </section>
    <div class="row-between" style="margin-bottom:10px"><button class="btn btn-sm" id="prev" aria-label="Mois précédent">←</button><h2 style="margin:0">${first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h2><button class="btn btn-sm" id="next" aria-label="Mois suivant">→</button></div>
    <div class="cal" role="grid" aria-label="Calendrier du mois">${['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => html`<div class="cal-dow" role="columnheader">${d}</div>`)}
      ${days.map((d) => { const iso = todayISO(d); const entries = cal.filter((c) => c.date === iso); const worn = wl.filter((w) => w.date === iso);
        return html`<button class="cal-day ${d.getMonth() !== m ? 'out' : ''} ${iso === today ? 'today' : ''}" data-day="${iso}" aria-label="${fmtDate(iso)} : ${entries.length} planifiée(s), ${worn.length} portée(s)"><span>${d.getDate()}</span>
          ${entries.slice(0, 2).map((e) => html`<span class="cal-dot ${e.status === 'worn' ? 'worn' : ''}">${e.status === 'worn' ? '✓ ' : ''}${e.title}</span>`)}${worn.length && !entries.length ? html`<span class="cal-dot worn">✓ portée</span>` : ''}</button>`; })}</div>
    <h2>À venir</h2>
    <div class="stack">${cal.filter((c) => c.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10).map((c) => html`<div class="card row-between"><div><div class="eyebrow">${fmtDate(c.date, { weekday: 'long', day: 'numeric', month: 'long' })}</div><strong>${c.title}</strong><p class="small muted">${piecesList(idsToPieces(outBy[c.outfitId]?.garmentIds, all)).map(([, g]) => g.name).join(' · ') || (c.outfitId ? 'Tenue supprimée' : `À compléter : ${c.note || 'pas encore de tenue'}`)}</p></div><button class="btn btn-sm" data-day="${c.date}">Ouvrir</button></div>`)}</div>
    ${!cal.some((c) => c.date >= today) ? html`<p class="muted">Rien de planifié. Ajoutez une tenue depuis le styliste du jour ou un jour du calendrier.</p>` : ''}`);
  main.querySelector('#prev').onclick = () => { cursor = new Date(y, m - 1, 1); render(main); };
  main.querySelector('#next').onclick = () => { cursor = new Date(y, m + 1, 1); render(main); };
  main.querySelectorAll('[data-day]').forEach((b) => b.onclick = () => dayModal(b.dataset.day, { cal, wl, outs, all, main }));
  main.querySelector('#icsfile').onchange = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const evs = parseICS(await f.text(), { from: new Date(), days: 60 });
    e.target.value = '';
    if (!evs.length) { toast('Aucun événement à venir (60 prochains jours) dans ce fichier'); return; }
    reviewEvents(evs, { all, cal, main });
  };
  // Préchargement : la fenêtre Google doit s'ouvrir tout de suite après le toucher (sinon Safari la bloque)
  let gClientId = ''; let gMod = null;
  store.repo.kvGet('google:clientId', '').then(async (v) => { gClientId = v || ''; if (gClientId) { gMod = await import('../services/google-calendar.js'); gMod.preloadGoogle(); } });
  main.querySelector('#gcal').onclick = async () => {
    if (!gClientId) { googleSetup(() => render(main)); return; }
    const btn = main.querySelector('#gcal'); btn.disabled = true; const label = btn.innerHTML; btn.textContent = 'Lecture de Google Agenda…';
    try {
      const m = gMod || await import('../services/google-calendar.js');
      const evs = await m.googleEvents(gClientId, { days: 60 });
      await store.repo.kvSet('google:lastSync', new Date().toISOString());
      if (!evs.length) toast('Aucun rendez-vous dans les 60 prochains jours de votre Google Agenda');
      else reviewEvents(evs, { all, cal, main });
    } catch (e) {
      openModal({ title: 'Google Agenda', body: html`<p>${e.message}</p><p class="small">Si c'est la première fois, vérifiez la configuration (identifiant client, adresse du site autorisée, votre adresse Gmail ajoutée comme testeur).</p><div class="btn-row"><button class="btn" data-cfg>Revoir la configuration</button></div>`,
        onMount(b, close) { b.querySelector('[data-cfg]').onclick = () => { close(); googleSetup(() => render(main)); }; } });
    } finally { btn.disabled = false; btn.innerHTML = label; }
  };
  main.querySelector('#agpaste').onclick = () => openModal({ title: 'Coller mes rendez-vous', body: html`<p class="small">Une ligne par rendez-vous : une date (28/11, 3 décembre, demain, lundi…), une heure si vous voulez, puis le rendez-vous.</p>
    <div class="field"><textarea id="agtext" rows="7" placeholder="28/11 14h rendez-vous client Dupont&#10;demain 8h ménage bureaux Mérignac&#10;samedi 20h dîner restaurant avec Léa&#10;12 décembre mariage de Paul"></textarea></div><button class="btn btn-primary" id="agok">Analyser</button>`,
    onMount(b, close) { b.querySelector('#agok').onclick = () => { const evs = parseAgendaText(b.querySelector('#agtext').value); if (!evs.length) { toast('Aucune date reconnue : commencez chaque ligne par une date (28/11, demain, lundi…)'); return; } close(); reviewEvents(evs, { all, cal, main }); }; } });
  main.querySelector('#ics').onclick = () => {
    const upcoming = cal.filter((c) => c.status === 'planned');
    if (!upcoming.length) { toast('Aucune tenue planifiée à exporter'); return; }
    downloadFile('sprezza-tenues.ics', buildICS(upcoming.map((c) => ({ ...c, description: piecesList(idsToPieces(outBy[c.outfitId]?.garmentIds, all)).map(([, g]) => g.name).join(', ') }))), 'text/calendar;charset=utf-8');
    toast('Fichier .ics généré — importez-le dans votre agenda');
  };
  main.querySelector('#multi').onclick = () => multiDay(main, all);
  main.querySelector('#week').onclick = async () => { const { openWeekPlanner } = await import('./week.js'); openWeekPlanner({ onDone: () => render(main) }); };
}

function dayModal(iso, { cal, wl, outs, all, main }) {
  const entries = cal.filter((c) => c.date === iso); const worn = wl.filter((w) => w.date === iso);
  const by = Object.fromEntries(all.map((g) => [g.id, g])); const outBy = Object.fromEntries(outs.map((o) => [o.id, o]));
  openModal({ title: fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), body: html`
    ${entries.length ? html`<h4>Planifié</h4>${entries.map((c) => html`<div class="card-flat" style="margin-bottom:8px"><div class="row-between"><strong>${c.title}</strong><span class="tag ${c.status === 'worn' ? 'tag-ok' : ''}">${c.status === 'worn' ? 'Portée' : 'Planifiée'}</span></div>
      <p class="small">${piecesList(idsToPieces(outBy[c.outfitId]?.garmentIds, all)).map(([, g]) => g.name).join(' · ') || (c.outfitId ? 'Tenue supprimée' : `À compléter : ${c.note || 'pas encore de tenue'}`)}</p>
      <div class="btn-row">${c.status !== 'worn' && c.outfitId ? html`<button class="btn btn-sm btn-primary" data-wear="${c.id}">Je la porte</button>` : ''}${outBy[c.outfitId] ? html`<a class="btn btn-sm" href="#/outfits/${c.outfitId}">Voir</a>` : ''}<button class="btn btn-sm btn-ghost" data-rm="${c.id}">${icon('trash')} Retirer</button></div></div>`)}` : ''}
    ${worn.length ? html`<h4>Historique de port</h4><ul class="ticks small">${worn.map((w) => html`<li>${(w.garmentIds || []).map((id) => by[id]?.name).filter(Boolean).join(' · ')}${w.occasionId ? ` — ${OCCASION_BY_ID[w.occasionId]?.name}` : ''}</li>`)}</ul>` : ''}
    <h4>Planifier une tenue</h4>
    <div class="field"><label for="po">Tenue sauvegardée</label><select id="po">${options(outs.map((o) => [o.id, o.name]), '', { empty: outs.length ? 'Choisir…' : 'Aucune tenue sauvegardée' })}</select></div>
    <div class="field"><label for="pocc">Occasion</label><select id="pocc">${options(OCCASIONS.map((o) => [o.id, o.name]), 'daily')}</select></div>
    <div class="btn-row"><button class="btn btn-primary" id="padd">Planifier cette tenue</button><button class="btn" id="pgen">Proposer automatiquement</button></div><p class="small muted" id="pmsg"></p>`,
  onMount(body, close) {
    const refresh = () => { close(); render(main); };
    body.querySelectorAll('[data-rm]').forEach((b) => b.onclick = async () => { await store.repo.remove('calendar', b.dataset.rm); refresh(); });
    body.querySelectorAll('[data-wear]').forEach((b) => b.onclick = async () => { const c = entries.find((x) => x.id === b.dataset.wear); await wearOutfit(idsToPieces(outBy[c.outfitId]?.garmentIds, all), { date: iso, occasionId: c.occasionId, outfitId: c.outfitId }); refresh(); });
    body.querySelector('#padd').onclick = async () => {
      const oid = body.querySelector('#po').value; if (!oid) { body.querySelector('#pmsg').textContent = 'Choisissez une tenue.'; return; }
      const occ = body.querySelector('#pocc').value;
      await store.repo.put('calendar', { id: uid('cal'), profileId: pid(), date: iso, occasionId: occ, outfitId: oid, title: outBy[oid].name, status: 'planned' });
      toast('Tenue planifiée'); refresh();
    };
    body.querySelector('#pgen').onclick = async () => {
      const occ = body.querySelector('#pocc').value;
      const r = recommend({ garments: all, occasionId: occ, season: seasonFromDate(new Date(iso + 'T12:00:00')), weather: null, prefs: await loadPrefs(), profileId: pid(), date: new Date(iso + 'T12:00:00') });
      if (!r.options.length) { body.querySelector('#pmsg').textContent = r.info.missing.map((x) => x.text).join(' ') || 'Dressing insuffisant.'; return; }
      const o = r.options[0];
      const saved = await saveOutfit(o.pieces, { mode: o.mode, occasionId: occ, score: o.score, source: 'calendar' });
      await store.repo.put('calendar', { id: uid('cal'), profileId: pid(), date: iso, occasionId: occ, outfitId: saved.id, title: `${MODE_NAME[o.mode]} — ${OCCASION_BY_ID[occ].name}`, status: 'planned' });
      refresh();
    };
  } });
}

function multiDay(main, all) {
  openModal({ title: 'Préparer plusieurs jours', body: html`<p class="small muted">Sans météo réelle, la saison et la température saisie servent de base ; vérifiez la veille.</p>
    <div class="form-grid"><div class="field"><label for="md">Premier jour</label><input id="md" type="date" value="${todayISO()}"></div><div class="field"><label for="mn">Nombre de jours</label><input id="mn" type="number" min="1" max="14" value="5"></div>
    <div class="field"><label for="mt">Température ressentie prévue (°C)</label><input id="mt" type="number" value="14"></div><div class="field"><label for="mo">Occasion principale</label><select id="mo">${options(OCCASIONS.map((o) => [o.id, o.name]), 'client')}</select></div>
    <label class="check"><input type="checkbox" id="mw" checked> Week-end : occasion « Promenade »</label></div>
    <button class="btn btn-primary" id="mgo">Planifier</button><p class="small" id="mmsg" aria-live="polite"></p>`,
  onMount(body, close) {
    body.querySelector('#mgo').onclick = async () => {
      const startIso = body.querySelector('#md').value; const n = Math.max(1, Math.min(14, +body.querySelector('#mn').value || 1));
      const prefs = await loadPrefs(); const weather = manualWeather({ temp: +body.querySelector('#mt').value });
      let done = 0; const lastUsed = {};
      for (let i = 0; i < n; i++) {
        const d = new Date(startIso + 'T12:00:00'); d.setDate(d.getDate() + i); const iso = todayISO(d);
        const weekend = [0, 6].includes(d.getDay()) && body.querySelector('#mw').checked;
        const occ = weekend ? 'walk' : body.querySelector('#mo').value;
        lastUsed[occ] = (lastUsed[occ] ?? -1) + 1;
        const r = recommend({ garments: all, occasionId: occ, weather, prefs, profileId: pid(), offsets: { italian: lastUsed[occ], classic: lastUsed[occ], modern: lastUsed[occ] }, date: d });
        const o = r.options[lastUsed[occ] % Math.max(1, r.options.length)];
        if (!o) continue;
        const saved = await saveOutfit(o.pieces, { mode: o.mode, occasionId: occ, score: o.score, source: 'calendar', name: `${OCCASION_BY_ID[occ].name} — ${fmtDate(iso, { day: 'numeric', month: 'short' })}` });
        await store.repo.put('calendar', { id: uid('cal'), profileId: pid(), date: iso, occasionId: occ, outfitId: saved.id, title: `${MODE_NAME[o.mode]} — ${OCCASION_BY_ID[occ].name}`, status: 'planned' });
        done++;
      }
      if (!done) { body.querySelector('#mmsg').textContent = 'Dressing insuffisant pour planifier : ajoutez des pièces.'; return; }
      toast(`${done} jour(s) planifié(s)`); close(); render(main);
    };
  } });
  void confirmDialog; void navigate;
}


/** Vérifier les événements importés, ajuster l'occasion, puis planifier les tenues. */
async function reviewEvents(evs, { all, cal, main }) {
  const IMPORT_KEY = `calimport:${pid()}`;
  const done = (await store.repo.kvGet(IMPORT_KEY, {})) || {};
  const rows = evs.map((e) => ({ ...e, ...occasionForEvent(e), already: !!done[e.uid] }));
  const occOpts = OCCASIONS.map((o) => [o.id, o.name]);
  openModal({ title: `${rows.length} rendez-vous trouvé${rows.length > 1 ? 's' : ''}`, wide: true, body: html`<p class="small muted">Vérifiez le type de chaque rendez-vous : la tenue en dépend. Plusieurs rendez-vous le même jour : la tenue suit le plus habillé.</p>
    <div class="table-wrap"><table><thead><tr><th></th><th>Date</th><th>Rendez-vous</th><th>Occasion</th></tr></thead><tbody>
    ${rows.map((r, i) => html`<tr><td><input type="checkbox" data-sel="${i}" ${r.already ? '' : raw('checked')} aria-label="Planifier ${r.title}"></td>
      <td class="small">${fmtDate(r.date, { weekday: 'short', day: 'numeric', month: 'short' })}${r.time ? ` · ${r.time}` : ''}</td>
      <td>${r.title}${r.location ? html`<div class="small muted">${r.location}</div>` : ''}${r.already ? html`<div class="small muted">Déjà importé</div>` : ''}</td>
      <td><select data-occ="${i}" aria-label="Occasion pour ${r.title}">${options(occOpts, r.occasionId)}</select>${r.guessed ? html`<div class="small muted">à vérifier</div>` : ''}</td></tr>`)}
    </tbody></table></div>
    <div class="btn-row" style="margin-top:12px"><button class="btn btn-primary" id="evgo">${icon('calendar')} Préparer les tenues</button></div><p class="small" id="evmsg" aria-live="polite"></p>`,
  onMount(b, close) {
    b.querySelectorAll('[data-occ]').forEach((sel) => sel.onchange = () => { rows[+sel.dataset.occ].occasionId = sel.value; rows[+sel.dataset.occ].guessed = false; });
    b.querySelector('#evgo').onclick = async () => {
      const picked = rows.filter((r, i) => b.querySelector(`[data-sel="${i}"]`).checked);
      if (!picked.length) { toast('Sélectionnez au moins un rendez-vous'); return; }
      b.querySelector('#evgo').disabled = true; b.querySelector('#evmsg').textContent = 'Préparation des tenues…';
      const prefs = await loadPrefs();
      const plan = dayPlan(picked, (id) => OCCASION_BY_ID[id]?.target ?? 3);
      let n = 0; let skipped = 0; const incomplete = [];
      for (const d of plan) {
        const title = `${d.main.title}${d.others.length ? ` (+${d.others.length})` : ''}`;
        if (cal.some((c) => c.date === d.date && c.title === title)) { skipped++; continue; }
        const r = recommend({ garments: all, occasionId: d.main.occasionId, date: new Date(`${d.date}T09:00:00`), prefs, weather: null });
        const o = r.options[0];
        if (!o) { // pas de tenue complète : le rendez-vous est quand même noté, avec ce qui manque
          await store.repo.put('calendar', { id: uid('cal'), profileId: pid(), date: d.date, occasionId: d.main.occasionId, outfitId: null, title, status: 'planned', note: r.info.missing.map((x) => x.text).join(' ') || 'Pas de tenue complète dans le dressing pour cette occasion.' });
          incomplete.push(`${title} (${OCCASION_BY_ID[d.main.occasionId]?.name})`); continue;
        }
        await addToCalendar(o.pieces, { date: d.date, occasionId: d.main.occasionId, title, silent: true });
        n++;
      }
      for (const r of picked) done[r.uid] = r.date;
      await store.repo.kvSet(IMPORT_KEY, done);
      close();
      toast(`${n} tenue${n > 1 ? 's' : ''} préparée${n > 1 ? 's' : ''}${skipped ? ` · ${skipped} déjà prévue${skipped > 1 ? 's' : ''}` : ''}${incomplete.length ? ` · ${incomplete.length} sans tenue complète` : ''}`, { timeout: 6000 });
      if (incomplete.length) openModal({ title: 'Rendez-vous sans tenue complète', body: html`<p>Votre dressing n'a pas encore de quoi s'habiller pour :</p><ul class="ticks">${incomplete.map((x) => html`<li>${x}</li>`)}</ul><p class="small">Ils sont notés dans le calendrier. Le <a href="#/wardrobe/bilan">Bilan du dressing</a> indique quoi ajouter (et le kit de travail pour le ménage).</p>` });
      render(main);
    };
  } });
}


/** Configuration unique de Google Agenda : l'utilisateur crée son identifiant client OAuth (gratuit) et le colle ici. */
async function googleSetup(then) {
  const cur = await store.repo.kvGet('google:clientId', '');
  const origin = location.origin;
  openModal({ title: 'Relier Google Agenda (une seule fois)', wide: true, body: html`<p class="small">Google demande que chaque application déclare un « identifiant client ». C'est gratuit et prend environ 5 minutes, sur ordinateur, avec votre compte Gmail. Ensuite, un bouton suffit.</p>
    <ol class="small" style="padding-left:18px;line-height:1.55">
      <li>Ouvrez <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener">Google Cloud</a> et créez un projet (nom libre, ex. « SPREZZA »).</li>
      <li>Activez l'<a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noopener">API Google Calendar</a> (bouton « Activer »).</li>
      <li><a href="https://console.cloud.google.com/auth/branding" target="_blank" rel="noopener">Écran de consentement</a> : type « Externe », nom « SPREZZA », votre e-mail. Dans « Audience », laissez « En test » et <strong>ajoutez votre adresse Gmail comme utilisateur test</strong>.</li>
      <li><a href="https://console.cloud.google.com/auth/clients" target="_blank" rel="noopener">Clients</a> → « Créer un client » → type <strong>Application Web</strong> → « Origines JavaScript autorisées » : <code>${origin}</code> → Créer.</li>
      <li>Copiez l'<strong>ID client</strong> (il se termine par <code>.apps.googleusercontent.com</code>) et collez-le ci-dessous.</li>
    </ol>
    <div class="field"><label for="gcid">ID client Google</label><input id="gcid" value="${cur}" placeholder="123456789-abc….apps.googleusercontent.com" autocomplete="off"></div>
    <p class="small muted">Accès en <strong>lecture seule</strong> à votre agenda principal ; SPREZZA ne modifie rien et le jeton n'est jamais enregistré. Google affichera « application non validée » : c'est normal pour une application personnelle en test (« Continuer »). Vous pouvez retirer l'accès à tout moment dans votre compte Google.</p>
    <div class="btn-row"><button class="btn btn-primary" id="gsave">Enregistrer et se connecter</button>${cur ? html`<button class="btn btn-ghost" id="gforget">Oublier l'identifiant</button>` : ''}</div>`,
  onMount(b, close) {
    b.querySelector('#gsave').onclick = async () => {
      const v = b.querySelector('#gcid').value.trim();
      if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(v)) { toast('Collez l\'ID client complet (…apps.googleusercontent.com)'); return; }
      await store.repo.kvSet('google:clientId', v); close(); toast('Identifiant enregistré : touchez « Google Agenda (Gmail) » pour vous connecter'); then?.();
    };
    b.querySelector('#gforget')?.addEventListener('click', async () => { await store.repo.kvSet('google:clientId', ''); const { googleDisconnect } = await import('../services/google-calendar.js'); googleDisconnect(); close(); toast('Google Agenda déconnecté'); });
  } });
}
