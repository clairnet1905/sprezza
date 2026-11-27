// Tenues : sauvegardées, constructeur manuel, modèles capsule, préparation de valise, historique.
import { html, raw, setHTML } from '../lib/html.js';
import { icon, toast, options, emptyState, confirmDialog, fmtDate, todayISO, openModal, swatch } from '../components/ui.js';
import { store, pid, garments as loadGarments, outfits as loadOutfits, wearlog as loadWearlog, hydratePhotos, prefs as loadPrefs } from '../state.js';
import { OCCASIONS, OCCASION_BY_ID } from '../data/occasions.js';
import { ROLE_LABELS, isEveryday } from '../data/taxonomy.js';
import { CAPSULE } from '../data/capsule.js';
import { scoreOutfit } from '../domain/scoring.js';
import { recommend, roleOf, isAvailable, comboKey } from '../domain/recommend.js';
import { allTemplateStatuses, capsuleState, packList } from '../domain/wardrobe-logic.js';
import { manualWeather } from '../domain/weather.js';
import { colorHex, colorName } from '../domain/colors.js';
import { pieceRow, piecesList, criteriaView, scoreBadge, outfitMannequin, idsToPieces, saveOutfit, wearOutfit, addToCalendar, MODE_NAME } from './shared.js';
import { navigate } from '../app.js';

const ROLES = ['top', 'bottom', 'layer', 'outer', 'shoes', 'belt'];

export async function render(main, params, query) {
  const [a] = params;
  const tabs = html`<nav class="tabs" aria-label="Sections tenues">${[['', 'Mes tenues'], ['new', 'Créer'], ['templates', '30 modèles'], ['travel', 'Valise'], ['history', 'Historique']].map(([id, l]) => html`<a href="#/outfits${id ? '/' + id : ''}" ${(a || '') === id ? raw('aria-current="page"') : ''}>${l}</a>`)}</nav>`;
  const head = html`<div class="page-head"><div class="eyebrow">Tenues</div><h1>Mes tenues</h1></div>${tabs}`;
  if (a === 'new') return renderBuilder(main, head, query);
  if (a === 'templates') return renderTemplates(main, head);
  if (a === 'travel') return renderTravel(main, head);
  if (a === 'history') return renderHistory(main, head);
  if (a) return renderDetail(main, a);
  return renderList(main, head);
}

async function renderList(main, head) {
  const [outs, all] = await Promise.all([loadOutfits(), loadGarments()]);
  const st = { fav: false, occ: '' };
  setHTML(main, html`${head}
    ${outs.length ? html`<div class="row" style="margin-bottom:12px"><label class="check"><input type="checkbox" id="ofav"> Favoris uniquement</label><select id="oocc" style="width:auto" aria-label="Filtrer par occasion">${options(OCCASIONS.map((o) => [o.id, o.name]), '', { empty: 'Toutes occasions' })}</select></div><div class="grid-wide" id="olist"></div>`
    : emptyState('Aucune tenue sauvegardée', 'Sauvegardez une proposition du styliste du jour ou composez une tenue à partir de vos pièces.', html`<a class="btn btn-primary" href="#/outfits/new">${icon('plus')} Créer une tenue</a><a class="btn" href="#/today">Styliste du jour</a>`)}`);
  if (!outs.length) return;
  const draw = () => {
    const list = outs.filter((o) => (!st.fav || o.favorite) && (!st.occ || o.occasionId === st.occ)).sort((x, y) => (y.updatedAt || '').localeCompare(x.updatedAt || ''));
    setHTML(main.querySelector('#olist'), list.length ? list.map((o) => {
      const p = idsToPieces(o.garmentIds, all);
      return html`<a class="card card-link" href="#/outfits/${o.id}"><div class="row-between"><span class="eyebrow">${OCCASION_BY_ID[o.occasionId]?.name || 'Libre'}</span>${o.favorite ? html`<span class="tag tag-gold">Favori</span>` : ''}</div>
        <h3>${o.name}</h3><div class="row" style="gap:4px">${piecesList(p).map(([, g]) => swatch(g.color?.hex, g.color?.name))}</div>
        <p class="small muted" style="margin-top:6px">${piecesList(p).map(([, g]) => g.name).join(' · ') || 'Pièces supprimées'}</p>
        ${o.missingItems?.length ? html`<p class="small" style="color:var(--warn)">${o.missingItems.join(' · ')}</p>` : ''}</a>`;
    }) : html`<p class="muted">Aucune tenue pour ce filtre.</p>`);
  };
  main.querySelector('#ofav').onchange = (e) => { st.fav = e.target.checked; draw(); };
  main.querySelector('#oocc').onchange = (e) => { st.occ = e.target.value; draw(); };
  draw();
}

async function renderDetail(main, id) {
  const o = await store.repo.get('outfits', id);
  if (!o || o.profileId !== pid()) { setHTML(main, emptyState('Tenue introuvable', '', html`<a class="btn" href="#/outfits">Retour</a>`)); return; }
  const [all, wl, p0] = await Promise.all([loadGarments(), loadWearlog(), loadPrefs()]);
  const p = idsToPieces(o.garmentIds, all);
  const occ = OCCASION_BY_ID[o.occasionId];
  const sc = scoreOutfit(p, { occasion: occ, mode: o.mode, prefs: p0 });
  const unavailable = piecesList(p).filter(([, g]) => !isAvailable(g));
  const ids = Object.values(o.garmentIds || {}).flat().filter(Boolean).sort().join('|');
  const worn = wl.filter((w) => w.outfitId === o.id || (ids && [...(w.garmentIds || [])].sort().join('|') === ids));
  setHTML(main, html`<a href="#/outfits" class="small">← Mes tenues</a>
    <div class="page-head row-between" style="margin-top:8px"><div><div class="eyebrow">${occ?.name || 'Tenue libre'}${o.mode ? ` · ${MODE_NAME[o.mode]}` : ''}</div><h1>${o.name}</h1></div>${scoreBadge(sc)}</div>
    ${unavailable.length ? html`<div class="callout callout-warn">Non portable immédiatement : ${unavailable.map(([, g]) => g.name).join(', ')} indisponible(s).</div>` : ''}
    <div class="grid-2" style="align-items:start;margin-top:12px">
      <div class="stack"><div class="piece-list">${piecesList(p).map(([r, g]) => pieceRow(r, g))}${(o.missingItems || []).map((m) => html`<div class="piece piece-missing"><div class="piece-info"><div class="piece-role">Manquant</div><div class="piece-name">${m}</div></div></div>`)}</div>
        <div class="btn-row"><button class="btn btn-primary" id="wear" ${unavailable.length ? raw('disabled') : ''}>${icon('check')} Je porte cette tenue</button><button class="btn" id="fav">${icon('heart', { filled: o.favorite })} ${o.favorite ? 'Retirer des favoris' : 'Favori'}</button><button class="btn" id="cal">${icon('calendar')} Planifier</button><button class="btn" id="ren">${icon('edit')} Renommer</button><button class="btn btn-danger" id="del">${icon('trash')} Supprimer</button></div>
        <div class="card"><h3>Note recalculée (grille B18)</h3>${criteriaView(sc)}${o.score ? html`<p class="small muted" style="margin-top:8px">Note à la sauvegarde : ${o.score.score100 ?? (o.score.scoreRange ? o.score.scoreRange.join('–') : '—')}/100.</p>` : ''}</div>
        <div class="card"><h3>Historique de port</h3>${worn.length ? html`<ul class="clean small">${worn.map((w) => html`<li>${fmtDate(w.date)}${w.occasionId ? ` — ${OCCASION_BY_ID[w.occasionId]?.name}` : ''}</li>`)}</ul>` : html`<p class="small muted">Jamais portée.</p>`}</div>
      </div>
      <div><div class="mannequin-wrap">${outfitMannequin(p)}</div><div class="schema-label">Schéma — pas une photographie</div></div>
    </div>`);
  hydratePhotos(main);
  const $ = (s) => main.querySelector(s);
  $('#wear').onclick = async () => { await wearOutfit(p, { occasionId: o.occasionId, outfitId: o.id }); navigate(`#/outfits/${o.id}`); };
  $('#fav').onclick = async () => { await store.repo.put('outfits', { ...o, favorite: !o.favorite }); navigate(`#/outfits/${o.id}`); };
  $('#cal').onclick = () => openModal({ title: 'Planifier cette tenue', body: html`<div class="field"><label for="cd">Date</label><input id="cd" type="date" value="${todayISO()}"></div><button class="btn btn-primary" data-ok>Ajouter</button>`, onMount(b, close) { b.querySelector('[data-ok]').onclick = async () => { await addToCalendar(p, { date: b.querySelector('#cd').value, occasionId: o.occasionId, title: o.name, outfitId: o.id }); close(); }; } });
  $('#ren').onclick = () => openModal({ title: 'Renommer', body: html`<div class="field"><label for="nn">Nom</label><input id="nn" type="text" value="${o.name}"></div><button class="btn btn-primary" data-ok>Enregistrer</button>`, onMount(b, close) { b.querySelector('[data-ok]').onclick = async () => { await store.repo.put('outfits', { ...o, name: b.querySelector('#nn').value || o.name }); close(); navigate(`#/outfits/${o.id}`); }; } });
  $('#del').onclick = async () => { if (await confirmDialog({ title: 'Supprimer cette tenue ?', message: 'Les vêtements restent dans le dressing ; seule la tenue est supprimée.', confirmLabel: 'Supprimer', danger: true })) { await store.repo.remove('outfits', o.id); toast('Tenue supprimée'); navigate('#/outfits'); } };
}

async function renderBuilder(main, head, query) {
  const all = await loadGarments();
  const avail = all.filter(isAvailable);
  const sel = { acc: avail.filter((g) => roleOf(g) === 'accessory' && isEveryday(g)).map((g) => g.id) }; ROLES.forEach((r) => { const q = query.get(r); if (q && avail.some((g) => g.id === q)) sel[r] = q; });
  let occasionId = query.get('occasion') || 'daily';
  setHTML(main, html`${head}
    <p class="lede">Sélectionnez une pièce par rôle parmi vos vêtements disponibles ; la note se met à jour instantanément.</p>
    ${!avail.length ? emptyState('Aucune pièce disponible', 'Ajoutez des vêtements ou marquez-les disponibles.', html`<a class="btn btn-primary" href="#/wardrobe/new">Ajouter une pièce</a>`) : html`
    <div class="grid-split">
      <div class="stack">
        <div class="field"><label for="bocc">Occasion</label><select id="bocc">${options(OCCASIONS.map((o) => [o.id, o.name]), occasionId)}</select></div>
        ${(() => { const acc = avail.filter((g) => roleOf(g) === 'accessory'); return acc.length ? html`<fieldset><legend>Accessoires</legend><div class="chips">${acc.map((g) => html`<button type="button" class="chip" data-acc="${g.id}" aria-pressed="${!!sel.acc?.includes(g.id)}">${swatch(g.color?.hex)} ${g.name}</button>`)}</div></fieldset>` : ''; })()}
        ${ROLES.map((r) => { const list = avail.filter((g) => roleOf(g) === r); return html`<fieldset><legend>${ROLE_LABELS[r]}</legend>${list.length ? html`<div class="chips">${r !== 'top' && r !== 'bottom' ? html`<button type="button" class="chip" data-role="${r}" data-id="" aria-pressed="${!sel[r]}">Aucun</button>` : ''}${list.map((g) => html`<button type="button" class="chip" data-role="${r}" data-id="${g.id}" aria-pressed="${sel[r] === g.id}">${swatch(g.color?.hex)} ${g.name}</button>`)}</div>` : html`<p class="small muted">Aucune pièce disponible.</p>`}</fieldset>`; })}
      </div>
      <div class="stack split-aside"><div class="card card-accent" id="bprev"></div></div>
    </div>`}`);
  if (!avail.length) return;
  const by = Object.fromEntries(all.map((g) => [g.id, g]));
  const draw = async () => {
    const p = { accessories: (sel.acc || []).map((id) => by[id]).filter(Boolean) }; ROLES.forEach((r) => { if (sel[r]) p[r] = by[sel[r]]; });
    const sc = scoreOutfit(p, { occasion: OCCASION_BY_ID[occasionId], prefs: await loadPrefs(), targetStyles: null });
    const ready = p.top && p.bottom;
    setHTML(main.querySelector('#bprev'), html`<div class="row-between"><h3>Aperçu</h3>${ready ? scoreBadge(sc) : ''}</div>
      <div class="mannequin-wrap">${outfitMannequin(p)}</div><div class="schema-label">Schéma — pas une photographie</div>
      ${ready ? html`<details class="disclosure" open><summary>Détail de la note</summary>${criteriaView(sc, { compact: true })}</details>` : html`<p class="small muted">Choisissez au moins un haut et un bas.</p>`}
      <div class="field" style="margin-top:10px"><label for="bname">Nom de la tenue</label><input id="bname" type="text" placeholder="ex. Rendez-vous client d'automne"></div>
      <div class="btn-row"><button class="btn btn-primary" id="bsave" ${ready ? '' : raw('disabled')}>${icon('heart')} Sauvegarder</button><button class="btn" id="bwear" ${ready ? '' : raw('disabled')}>Je porte cette tenue</button></div>`);
    main.querySelector('#bsave')?.addEventListener('click', async () => { const o = await saveOutfit(p, { name: main.querySelector('#bname').value || undefined, occasionId, score: sc, source: 'manual' }); navigate(`#/outfits/${o.id}`); });
    main.querySelector('#bwear')?.addEventListener('click', () => wearOutfit(p, { occasionId }));
  };
  main.querySelectorAll('[data-role]').forEach((b) => b.onclick = () => { sel[b.dataset.role] = b.dataset.id || undefined; main.querySelectorAll(`[data-role="${b.dataset.role}"]`).forEach((x) => x.setAttribute('aria-pressed', x === b)); draw(); });
  main.querySelectorAll('[data-acc]').forEach((b) => b.onclick = () => { sel.acc = sel.acc || []; const id = b.dataset.acc; sel.acc = sel.acc.includes(id) ? sel.acc.filter((x) => x !== id) : [...sel.acc, id]; b.setAttribute('aria-pressed', sel.acc.includes(id)); draw(); });
  main.querySelector('#bocc').onchange = (e) => { occasionId = e.target.value; draw(); };
  draw();
}

async function renderTemplates(main, head) {
  const [all, cap] = await Promise.all([loadGarments(), store.repo.kvGet(`capsule:${pid()}`, { level: 1, items: {} })]);
  const statuses = allTemplateStatuses(capsuleState(cap.items, all), all);
  setHTML(main, html`${head}
    <p class="lede">Les 30 modèles de la garde-robe capsule (B13). Ce sont des modèles, distincts de vos tenues : un modèle devient « Portable » seulement si toutes ses pièces sont reliées à une fiche du dressing et disponibles. Reliez les pièces dans <a href="#/capsule">Capsule</a>.</p>
    <p class="small"><span class="tag tag-ok">${statuses.filter((s) => s.portable).length} portables</span> <span class="tag">${statuses.filter((s) => !s.portable).length} en inspiration</span></p>
    <div class="grid-wide">${statuses.map((s) => html`<article class="card"><div class="row-between"><span class="eyebrow">Modèle ${s.tpl.n} · ${OCCASION_BY_ID[s.tpl.occasion]?.name}</span><span class="tag ${s.portable ? 'tag-ok' : s.label === 'Pièce indisponible' ? 'tag-warn' : ''}">${s.label}</span></div>
      <h3>${s.tpl.name}</h3>
      <div class="swatch-bar" style="height:22px">${s.parts.map((p) => raw(`<span style="background:${colorHex(p.item.color)}"></span>`))}</div>
      <ul class="clean small" style="margin-top:8px">${s.parts.map((p) => html`<li class="row" style="gap:6px;padding:2px 0">${p.status === 'ready' ? icon('check') : ''}<span>${p.item.name}${p.garment ? html` → <a href="#/wardrobe/${p.garment.id}">${p.garment.name}</a>` : ''}</span>${p.status === 'unavailable' ? html`<span class="tag tag-warn">indisponible</span>` : p.status === 'missing' ? html`<span class="tag">non possédé</span>` : p.status === 'owned-unlinked' ? html`<span class="tag">à relier</span>` : ''}</li>`)}</ul>
      ${s.tpl.note ? html`<p class="small muted">${s.tpl.note}${s.tpl.n === 18 ? ` Suggestion par règles : ${CAPSULE.filter((c) => c.role === 'shoes').slice(0, 2).map((c) => c.name).join(' ou ')}.` : ''}</p>` : ''}
      ${s.portable ? html`<button class="btn btn-sm btn-primary" data-save="${s.tpl.n}">Enregistrer comme tenue</button>` : ''}</article>`)}</div>`);
  main.querySelectorAll('[data-save]').forEach((b) => b.onclick = async () => {
    const s = statuses.find((x) => x.tpl.n === +b.dataset.save);
    const p = { accessories: [] };
    s.parts.forEach(({ item, garment }) => { if (item.role === 'suit') { p.layer = garment; } else if (item.role === 'accessory') p.accessories.push(garment); else p[item.role] = garment; });
    const o = await saveOutfit(p, { name: `${s.tpl.name} (modèle ${s.tpl.n})`, occasionId: s.tpl.occasion, source: 'template' });
    navigate(`#/outfits/${o.id}`);
  });
}

async function renderTravel(main, head) {
  const all = await loadGarments();
  setHTML(main, html`${head}
    <p class="lede">Préparer une valise pour plusieurs jours : pièces mutualisées, liste à cocher, alternatives pluie/froid. Uniquement avec vos vêtements disponibles.</p>
    <form class="card" id="tform"><div class="form-grid">
      <div class="field"><label for="tdays">Nombre de jours</label><input id="tdays" type="number" min="1" max="14" value="3"></div>
      <div class="field"><label for="ttemp">Température ressentie prévue (°C)</label><input id="ttemp" type="number" value="14"></div>
      <label class="check"><input type="checkbox" id="train"> Pluie probable</label>
      <div class="field span-2"><span class="small muted">Occasions du séjour</span><div class="chips">${OCCASIONS.map((o) => html`<label class="chip"><input type="checkbox" data-occ value="${o.id}" ${['daily', 'client', 'restaurant'].includes(o.id) ? raw('checked') : ''}> ${o.name}</label>`)}</div></div>
    </div><button class="btn btn-primary" type="submit">${icon('suitcase')} Préparer la valise</button></form>
    <div id="tout" style="margin-top:16px"></div>`);
  main.querySelector('#tform').onsubmit = async (e) => {
    e.preventDefault();
    const days = Math.max(1, Math.min(14, +main.querySelector('#tdays').value || 1));
    const occs = [...main.querySelectorAll('[data-occ]:checked')].map((c) => c.value);
    if (!occs.length) { toast('Choisissez au moins une occasion'); return; }
    const weather = manualWeather({ temp: +main.querySelector('#ttemp').value, rain: main.querySelector('#train').checked });
    const prefs = await loadPrefs();
    const perDay = []; const plan = [];
    // Favorise la mutualisation : on garde le bas et les chaussures du premier jour lorsque c'est possible.
    let keep = {};
    for (let d = 0; d < days; d++) {
      const occ = occs[d % occs.length];
      let r = recommend({ garments: all, occasionId: occ, weather, prefs, imposed: keep, offsets: { italian: d, classic: d, modern: d }, profileId: pid() });
      if (!r.options.length && Object.keys(keep).length) r = recommend({ garments: all, occasionId: occ, weather, prefs, offsets: { italian: d }, profileId: pid() });
      const o = r.options[0];
      plan.push({ d, occ, o, backup: r.backup, missing: r.info.missing });
      if (o) { perDay.push([o.pieces.top, o.pieces.bottom, o.pieces.layer, o.pieces.outer, o.pieces.shoes, o.pieces.belt]); if (d === 0) keep = { bottom: o.pieces.bottom?.id, shoes: o.pieces.shoes?.id }; }
    }
    const pack = packList({ days, outfitsPerDay: perDay });
    const extra = plan.find((x) => x.backup?.changes?.length)?.backup;
    setHTML(main.querySelector('#tout'), !pack.total ? emptyState('Valise impossible', 'Le dressing disponible ne permet pas de composer de tenue pour ces occasions.', html`<a class="btn" href="#/wardrobe/new">Ajouter des pièces</a>`) : html`
      <div class="grid-2" style="align-items:start">
        <div class="card"><h3>Liste à cocher (${pack.total} pièces, ${pack.shared} mutualisées)</h3>
          <ul class="clean">${pack.items.map((i) => html`<li><label class="check"><input type="checkbox"> ${i.g.name} ${i.n > 1 ? html`<span class="tag tag-gold">${i.n} jours</span>` : ''}</label></li>`)}
          ${extra ? extra.changes.map((c) => html`<li><label class="check"><input type="checkbox"> ${c} <span class="tag">pluie/froid</span></label></li>`) : ''}
          <li><label class="check"><input type="checkbox"> Parapluie compact ${weather.rain ? '' : '(facultatif)'}</label></li></ul></div>
        <div class="stack">${plan.map((p) => html`<div class="card"><div class="eyebrow">Jour ${p.d + 1} · ${OCCASION_BY_ID[p.occ].name}</div>${p.o ? html`<p class="small">${piecesList(p.o.pieces).map(([, g]) => g.name).join(' · ')}</p>` : html`<p class="small muted">${p.missing.map((m) => m.text).join(' ')}</p>`}</div>`)}</div>
      </div>`);
  };
}

async function renderHistory(main, head) {
  const [wl, all] = await Promise.all([loadWearlog(), loadGarments()]);
  const by = Object.fromEntries(all.map((g) => [g.id, g]));
  const list = [...wl].sort((a, b) => b.date.localeCompare(a.date));
  setHTML(main, html`${head}${list.length ? html`<div class="table-wrap"><table><thead><tr><th>Date</th><th>Occasion</th><th>Pièces</th></tr></thead><tbody>
    ${list.map((w) => html`<tr><td>${fmtDate(w.date)}</td><td>${OCCASION_BY_ID[w.occasionId]?.name || '—'}</td><td>${(w.garmentIds || []).map((id) => by[id]?.name).filter(Boolean).join(' · ')}${w.removedNames?.length ? html` <span class="small muted">(supprimées : ${w.removedNames.join(', ')})</span>` : ''}</td></tr>`)}</tbody></table></div>
    <button class="btn btn-sm btn-danger" id="clearh">Effacer l'historique</button>`
    : emptyState('Aucun historique', 'Utilisez « Je porte cette tenue » pour suivre vos ports.', '')}`);
  main.querySelector('#clearh')?.addEventListener('click', async () => { if (await confirmDialog({ title: 'Effacer l\'historique de port ?', message: 'Les compteurs de port des pièces sont conservés. Action irréversible.', confirmLabel: 'Effacer', danger: true })) { for (const w of wl) await store.repo.remove('wearlog', w.id); navigate('#/outfits/history'); } });
  void colorName;
}
