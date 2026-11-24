// Calendrier : planifier des tenues, consulter l'historique, préparer plusieurs jours, export ICS sur action.
import { html, raw, setHTML } from '../lib/html.js';
import { icon, toast, options, openModal, fmtDate, todayISO, downloadFile, confirmDialog } from '../components/ui.js';
import { store, pid, garments as loadGarments, outfits as loadOutfits, calendar as loadCalendar, wearlog as loadWearlog, prefs as loadPrefs } from '../state.js';
import { uid } from '../repositories/db.js';
import { OCCASIONS, OCCASION_BY_ID } from '../data/occasions.js';
import { recommend } from '../domain/recommend.js';
import { manualWeather, seasonFromDate } from '../domain/weather.js';
import { buildICS } from '../domain/wardrobe-logic.js';
import { idsToPieces, piecesList, saveOutfit, wearOutfit, MODE_NAME } from './shared.js';
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
      <div class="btn-row"><button class="btn btn-primary" id="multi">${icon('calendar')} Préparer plusieurs jours</button><button class="btn" id="ics">${icon('download')} Exporter (.ics)</button></div></div>
    <div class="row-between" style="margin-bottom:10px"><button class="btn btn-sm" id="prev" aria-label="Mois précédent">←</button><h2 style="margin:0">${first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h2><button class="btn btn-sm" id="next" aria-label="Mois suivant">→</button></div>
    <div class="cal" role="grid" aria-label="Calendrier du mois">${['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => html`<div class="cal-dow" role="columnheader">${d}</div>`)}
      ${days.map((d) => { const iso = todayISO(d); const entries = cal.filter((c) => c.date === iso); const worn = wl.filter((w) => w.date === iso);
        return html`<button class="cal-day ${d.getMonth() !== m ? 'out' : ''} ${iso === today ? 'today' : ''}" data-day="${iso}" aria-label="${fmtDate(iso)} : ${entries.length} planifiée(s), ${worn.length} portée(s)"><span>${d.getDate()}</span>
          ${entries.slice(0, 2).map((e) => html`<span class="cal-dot ${e.status === 'worn' ? 'worn' : ''}">${e.status === 'worn' ? '✓ ' : ''}${e.title}</span>`)}${worn.length && !entries.length ? html`<span class="cal-dot worn">✓ portée</span>` : ''}</button>`; })}</div>
    <h2>À venir</h2>
    <div class="stack">${cal.filter((c) => c.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10).map((c) => html`<div class="card row-between"><div><div class="eyebrow">${fmtDate(c.date, { weekday: 'long', day: 'numeric', month: 'long' })}</div><strong>${c.title}</strong><p class="small muted">${piecesList(idsToPieces(outBy[c.outfitId]?.garmentIds, all)).map(([, g]) => g.name).join(' · ') || 'Tenue supprimée'}</p></div><button class="btn btn-sm" data-day="${c.date}">Ouvrir</button></div>`)}</div>
    ${!cal.some((c) => c.date >= today) ? html`<p class="muted">Rien de planifié. Ajoutez une tenue depuis le styliste du jour ou un jour du calendrier.</p>` : ''}`);
  main.querySelector('#prev').onclick = () => { cursor = new Date(y, m - 1, 1); render(main); };
  main.querySelector('#next').onclick = () => { cursor = new Date(y, m + 1, 1); render(main); };
  main.querySelectorAll('[data-day]').forEach((b) => b.onclick = () => dayModal(b.dataset.day, { cal, wl, outs, all, main }));
  main.querySelector('#ics').onclick = () => {
    const upcoming = cal.filter((c) => c.status === 'planned');
    if (!upcoming.length) { toast('Aucune tenue planifiée à exporter'); return; }
    downloadFile('style-studio-tenues.ics', buildICS(upcoming.map((c) => ({ ...c, description: piecesList(idsToPieces(outBy[c.outfitId]?.garmentIds, all)).map(([, g]) => g.name).join(', ') }))), 'text/calendar;charset=utf-8');
    toast('Fichier .ics généré — importez-le dans votre agenda');
  };
  main.querySelector('#multi').onclick = () => multiDay(main, all);
}

function dayModal(iso, { cal, wl, outs, all, main }) {
  const entries = cal.filter((c) => c.date === iso); const worn = wl.filter((w) => w.date === iso);
  const by = Object.fromEntries(all.map((g) => [g.id, g])); const outBy = Object.fromEntries(outs.map((o) => [o.id, o]));
  openModal({ title: fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), body: html`
    ${entries.length ? html`<h4>Planifié</h4>${entries.map((c) => html`<div class="card-flat" style="margin-bottom:8px"><div class="row-between"><strong>${c.title}</strong><span class="tag ${c.status === 'worn' ? 'tag-ok' : ''}">${c.status === 'worn' ? 'Portée' : 'Planifiée'}</span></div>
      <p class="small">${piecesList(idsToPieces(outBy[c.outfitId]?.garmentIds, all)).map(([, g]) => g.name).join(' · ') || 'Tenue supprimée'}</p>
      <div class="btn-row">${c.status !== 'worn' ? html`<button class="btn btn-sm btn-primary" data-wear="${c.id}">Je la porte</button>` : ''}${outBy[c.outfitId] ? html`<a class="btn btn-sm" href="#/outfits/${c.outfitId}">Voir</a>` : ''}<button class="btn btn-sm btn-ghost" data-rm="${c.id}">${icon('trash')} Retirer</button></div></div>`)}` : ''}
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
