// Aujourd'hui — styliste du jour : occasion, météo (avec consentement) ou saisie manuelle, trois propositions.
import { html, raw, setHTML } from '../lib/html.js';
import { icon, toast, options, openModal, fmtDate, todayISO, emptyState } from '../components/ui.js';
import { store, pid, garments as loadGarments, prefs as loadPrefs, savePrefs, saveProfile, hydratePhotos } from '../state.js';
import { OCCASIONS, OCCASION_BY_ID, OCCASION_NOTES } from '../data/occasions.js';
import { STYLE_OPTS, ROLE_LABELS } from '../data/taxonomy.js';
import { recommend, roleOf, isAvailable, comboKey } from '../domain/recommend.js';
import { manualWeather, weatherSummary, isStale, seasonFromDate, SEASON_NAMES, climateFeel } from '../domain/weather.js';
import { forecast, geocode, currentPosition } from '../services/weather.js';
import { buildQuery } from '../domain/wardrobe-logic.js';
import { MODE_STYLES } from '../domain/scoring.js';
import { proposalCard, saveOutfit, wearOutfit, addToCalendar, piecesList, pieceRow, MODE_NAME, workKitBlock, openDressingPicker } from './shared.js';
import { navigate } from '../app.js';
import { renderDaily } from './daily.js';

const KEY = () => `today:${pid()}`;

export async function render(main) {
  const saved = await store.repo.kvGet(KEY(), {});
  const st = {
    occasionId: saved.occasionId || 'daily', place: saved.place || '', style: saved.style || '', dayOffset: 0,
    manual: saved.manual?.date === todayISO() ? saved.manual : { temp: climateFeel(new Date()), rain: false, wind: false, date: todayISO() }, imposed: {}, offsets: {}, weather: null, weatherError: null,
  };
  const all = await loadGarments();
  const profile = store.profile;
  const date = () => { const d = new Date(); d.setDate(d.getDate() + st.dayOffset); return d; };

  setHTML(main, html`
    <section class="hero">
      <div class="eyebrow">Styliste du jour · ${fmtDate(todayISO(), { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <h1>Comment s'habiller aujourd'hui ?</h1>
      <p class="serif-italic">L'élégance devient naturelle.</p>
      <p class="lede">${all.length ? `${all.filter(isAvailable).length} pièces disponibles dans votre dressing.` : 'Votre dressing est vide : ajoutez vos pièces pour des propositions réelles.'}</p>
    </section>
    <div id="daily" style="margin-bottom:26px"></div>
    <h2 id="all-h">Toutes les propositions</h2>
    <p class="small muted" style="margin-top:-6px">Choisissez une occasion, la météo ou une pièce imposée pour obtenir trois tenues détaillées.</p>
    <div class="grid-2" style="align-items:start">
      <section class="card" aria-labelledby="ctx-h"><h2 id="ctx-h" style="margin-top:0">Contexte</h2>
        <div class="field"><label for="occ">Occasion</label><select id="occ">${options(OCCASIONS.map((o) => [o.id, o.name]), st.occasionId)}</select><p class="hint" id="occnote"></p></div>
        <div class="form-grid">
          <div class="field"><label for="day">Jour</label><select id="day">${options([0, 1, 2, 3, 4, 5, 6].map((i) => { const d = new Date(); d.setDate(d.getDate() + i); return [i, i === 0 ? 'Aujourd\'hui' : i === 1 ? 'Demain' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' })]; }), 0)}</select></div>
          <div class="field"><label for="place">Lieu (facultatif)</label><input id="place" type="text" value="${st.place}" placeholder="ex. bureaux d'un client"></div>
          <div class="field"><label for="style">Style souhaité</label><select id="style">${options(STYLE_OPTS, st.style, { empty: 'Selon mon identité' })}</select></div>
          <div class="field"><label for="imposed">Pièce imposée</label><select id="imposed">${options(all.filter(isAvailable).map((g) => [g.id, `${g.name}`]), '', { empty: 'Aucune' })}</select></div>
        </div>
      </section>
      <section class="card" aria-labelledby="wx-h"><h2 id="wx-h" style="margin-top:0">Météo</h2><div id="wx"></div></section>
    </div>
    <div class="btn-row" style="margin:18px 0"><button class="btn btn-primary" id="go">${icon('star')} Proposer mes tenues</button><a class="btn" href="#/outfits/new">Composer moi-même</a></div>
    <div id="results" aria-live="polite"></div>`);

  const $ = (s) => main.querySelector(s);
  const occNote = () => { const o = OCCASION_BY_ID[$('#occ').value]; $('#occnote').textContent = [o.strict ? 'Dress code : les codes explicites de l\'événement priment.' : '', o.protection ? 'Activité : protection et confort avant le style.' : '', o.note || ''].filter(Boolean).join(' ') || `Formalité attendue ${o.formality[0]}–${o.formality[1]}/5.`; };
  $('#occ').onchange = () => { st.occasionId = $('#occ').value; occNote(); persist(); };
  occNote();
  $('#day').onchange = async () => { st.dayOffset = +$('#day').value; if (store.profile.consents?.weather) await loadWeather(); };
  $('#place').oninput = () => { st.place = $('#place').value; persist(); };
  $('#style').onchange = () => { st.style = $('#style').value; persist(); };
  $('#imposed').onchange = () => { const g = all.find((x) => x.id === $('#imposed').value); st.imposed = g ? { [roleOf(g)]: g.id } : {}; };
  const persist = () => store.repo.kvSet(KEY(), { occasionId: st.occasionId, place: st.place, style: st.style, manual: st.manual });

  // ---- Météo
  const wxBox = $('#wx');
  const renderWx = () => {
    const w = st.weather;
    const season = seasonFromDate(date());
    if (store.profile.consents?.weather) {
      setHTML(wxBox, html`
        ${w ? html`<p><strong>${w.place}</strong> — ${fmtDate(w.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p><p>${weatherSummary(w)}</p>
          <p class="small muted">Source : ${w.source} · relevé ${new Date(w.fetchedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}${isStale(w) ? ' · ancienne, à actualiser' : ''}</p>`
        : st.weatherError ? html`<div class="callout callout-warn">${st.weatherError}</div>` : html`<p class="muted"><span class="loader"></span> Chargement…</p>`}
        <div class="btn-row"><button class="btn btn-sm" id="wxref">${icon('rotate')} Actualiser</button><button class="btn btn-sm" id="wxcity">Changer de ville</button><button class="btn btn-sm btn-ghost" id="wxman">Saisie manuelle</button></div>`);
      $('#wxref').onclick = loadWeather; $('#wxcity').onclick = chooseCity; $('#wxman').onclick = () => { st.forceManual = true; renderManual(season); };
      if (st.forceManual) renderManual(season);
    } else renderManual(season);
  };
  const renderManual = (season) => {
    setHTML(wxBox, html`<p class="small muted">Saison : ${SEASON_NAMES[season]}. Aucune donnée météo n'est récupérée sans votre accord.</p>
      <div class="form-grid"><div class="field"><label for="mtemp">Température ressentie (°C)</label><input id="mtemp" type="number" inputmode="numeric" value="${st.manual.temp}"></div>
      <div class="field" style="display:flex;flex-direction:column;justify-content:flex-end"><label class="check"><input type="checkbox" id="mrain" ${st.manual.rain ? raw('checked') : ''}> Pluie prévue</label><label class="check"><input type="checkbox" id="mwind" ${st.manual.wind ? raw('checked') : ''}> Vent fort</label></div></div>
      ${store.profile.consents?.weather ? html`<button class="btn btn-sm" id="wxback">Revenir à la météo automatique</button>` : html`<button class="btn btn-sm" id="wxon">Activer la météo automatique</button>`}`);
    const upd = () => { st.manual = { temp: Number($('#mtemp').value || 0), rain: $('#mrain').checked, wind: $('#mwind').checked, date: todayISO() }; persist(); };
    ['#mtemp', '#mrain', '#mwind'].forEach((s) => $(s).addEventListener('change', upd));
    $('#wxon')?.addEventListener('click', askConsent);
    $('#wxback')?.addEventListener('click', () => { st.forceManual = false; renderWx(); });
  };
  const askConsent = () => openModal({ title: 'Activer la météo', body: html`<p>SPREZZA interroge <strong>Open-Meteo</strong> (service gratuit, sans compte) avec les coordonnées de la ville choisie (arrondies). Aucune donnée personnelle ni photo n'est envoyée. Vous pouvez désactiver ce choix dans Paramètres.</p>
      <div class="btn-row"><button class="btn btn-primary" data-ok>Activer</button><button class="btn" data-close>Plus tard</button></div>`,
    onMount(body, close) { body.querySelector('[data-ok]').onclick = async () => { await saveProfile({ ...store.profile, consents: { ...store.profile.consents, weather: true } }); close(); toast('Météo activée'); renderWx(); loadWeather(); }; } });
  const chooseCity = () => openModal({ title: 'Ville', body: html`<div class="field"><label for="cq">Rechercher une ville</label><input id="cq" type="search" value="${store.profile.city?.name || ''}"></div><div class="btn-row"><button class="btn btn-sm" id="cgo">${icon('search')} Rechercher</button>${store.profile.consents?.geoloc ? html`<button class="btn btn-sm" id="cgeo">Utiliser ma position</button>` : html`<button class="btn btn-sm" id="cgeo">Utiliser ma position (consentement)</button>`}</div><div id="cres" style="margin-top:10px"></div>`,
    onMount(body, close) {
      const pick = async (place) => { await saveProfile({ ...store.profile, city: place }); close(); toast(`Ville : ${place.name}`); loadWeather(); };
      body.querySelector('#cgo').onclick = async () => {
        const res = body.querySelector('#cres'); setHTML(res, html`<span class="loader"></span>`);
        try { const list = await geocode(body.querySelector('#cq').value); setHTML(res, list.length ? html`<div class="kbd-list">${list.map((p, i) => html`<button class="btn btn-sm" data-i="${i}">${p.name}, ${p.admin} (${p.country})</button>`)}</div>` : html`<p class="muted">Aucun résultat.</p>`); res.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => pick(list[+b.dataset.i])); }
        catch (e) { setHTML(res, html`<div class="callout callout-warn">${e.message}</div>`); }
      };
      body.querySelector('#cgeo').onclick = async () => {
        if (!store.profile.consents?.geoloc && !confirm('Autoriser l\'utilisation ponctuelle de votre position (arrondie à ~1 km) pour la météo ?')) return;
        try { await saveProfile({ ...store.profile, consents: { ...store.profile.consents, geoloc: true } }); pick(await currentPosition()); } catch (e) { toast(e.message); }
      };
    } });
  async function loadWeather() {
    if (!store.profile.city) { st.weatherError = 'Aucune ville définie.'; renderWx(); return; }
    st.weather = null; st.weatherError = null; renderWx();
    const cacheKey = `weather:${pid()}:${st.dayOffset}`;
    const cached = await store.repo.kvGet(cacheKey, null);
    if (cached && !isStale(cached) && cached.place?.startsWith(store.profile.city.name)) { st.weather = cached; renderWx(); return; }
    try { st.weather = await forecast(store.profile.city, { dayIndex: st.dayOffset }); await store.repo.kvSet(cacheKey, st.weather); }
    catch (e) { st.weatherError = `${e.message}. Utilisez la saisie manuelle ou réessayez.`; }
    renderWx();
  }
  renderWx();
  if (store.profile.consents?.weather) loadWeather();

  // ---- Génération
  let last = null;
  const results = $('#results');
  const run = async () => {
    const p = await loadPrefs();
    const useManual = !store.profile.consents?.weather || st.forceManual || !st.weather;
    const weather = useManual ? manualWeather({ ...st.manual, date: todayISO(date()) }) : st.weather;
    const fresh = await loadGarments();
    last = { res: recommend({ garments: fresh, occasionId: st.occasionId, weather, prefs: p, imposed: st.imposed, offsets: st.offsets, profileId: pid(), date: date() }), weather, garments: fresh };
    if (st.style) { const first = Object.entries(MODE_STYLES).find(([, list]) => list.includes(st.style))?.[0]; if (first) last.res.options.sort((a, b) => (b.mode === first) - (a.mode === first)); }
    show();
  };
  const show = () => {
    const { res, weather } = last;
    const occ = OCCASION_BY_ID[st.occasionId];
    if (!res.options.length) {
      setHTML(results, html`${emptyState(all.length ? 'Pas assez de pièces compatibles' : 'Aucune pièce dans le dressing', all.length ? 'Le styliste ne propose que des vêtements réellement possédés et disponibles.' : 'Aucun vêtement n\'est inventé. Ajoutez vos pièces, ou consultez les tenues du guide en mode inspiration.', html`<a class="btn btn-primary" href="#/wardrobe/new">${icon('plus')} Ajouter une pièce</a><a class="btn" href="#/outfits/templates">Modèles d'inspiration</a>`)}
        ${res.info.missing.length ? html`<div class="callout" style="margin-top:12px"><strong>Ce qui manque :</strong><ul class="ticks">${res.info.missing.map((m) => html`<li>${m.text}</li>`)}</ul></div>` : ''}
        ${occ.workwear ? workKitBlock(last.garments || all) : ''}
        <h2>Inspiration du guide — ${occ.name}</h2><div class="grid-3">${occ.outfits.map((t, i) => html`<div class="card"><div class="eyebrow">${['Élégance italienne', 'Classique international', 'Moderne décontracté'][i]}</div><p>${t}</p></div>`)}</div>`);
      return;
    }
    setHTML(results, html`
      <div class="row-between"><h2>Vos propositions — ${occ.name}</h2><span class="small muted">${weatherSummary(weather)} · ${weather.manual ? 'saisie manuelle' : weather.source}</span></div>
      ${res.info.note ? html`<div class="callout callout-info" style="margin-bottom:12px">${res.info.note}</div>` : ''}
      ${Object.keys(st.imposed).length ? html`<p class="small">Pièces gardées : ${Object.entries(st.imposed).map(([r, id]) => `${ROLE_LABELS[r]} — ${id ? last.garments.find((g) => g.id === id)?.name : 'aucune'}`).join(' · ')} <button class="btn btn-sm btn-ghost" id="unlock">Tout libérer</button></p>` : ''}
      ${occ.workwear ? workKitBlock(last.garments) : ''}
      <div class="stack">${res.options.map((o, i) => proposalCard(o, i))}</div>
      ${res.backup ? html`<section class="card" style="margin-top:16px"><div class="eyebrow">Plan B</div><h3>${res.backup.note}</h3>
        ${res.backup.changes.length ? html`<p class="small">Modifications par rapport à l'option 1 : ${res.backup.changes.join(' ; ')}.</p><div class="piece-list">${piecesList(res.backup.pieces).map(([r, g]) => pieceRow(r, g))}</div>` : ''}</section>` : ''}
      <details class="disclosure" style="margin-top:16px"><summary>Pourquoi ces choix ? (pièces écartées)</summary>
        <p class="small">${res.combos} combinaisons évaluées. Candidats : ${Object.entries(res.info.counts).filter(([, n]) => n).map(([r, n]) => `${ROLE_LABELS[r]} ${n}`).join(', ')}.</p>
        ${res.info.excluded.length ? html`<ul class="ticks small">${res.info.excluded.slice(0, 30).map(([g, why]) => html`<li>${g.name} : ${why}</li>`)}</ul>` : html`<p class="small muted">Aucune pièce écartée.</p>`}
        <ul class="ticks small">${OCCASION_NOTES.map((n) => html`<li>${n}</li>`)}</ul></details>`);
    hydratePhotos(results);
    results.querySelector('#unlock')?.addEventListener('click', () => { st.imposed = {}; run(); });
    results.querySelectorAll('.proposal').forEach((card) => {
      const opt = res.options[+card.dataset.idx];
      card.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act, opt, b)));
      // Toucher une pièce ouvre le dressing pour en choisir une autre
      card.querySelectorAll('.piece-list .piece[data-role]').forEach((row) => { if (!['top', 'bottom', 'layer', 'outer', 'shoes'].includes(row.dataset.role)) return; row.classList.add('piece-clickable'); row.addEventListener('click', (e) => { if (!e.target.closest('button, a')) replacePiece(row.dataset.role, opt); }); });
      card.querySelectorAll('[data-fb]').forEach((b) => b.addEventListener('click', () => feedback(b.dataset.fb, opt)));
    });
  };
  const act = async (action, opt, btn) => {
    const occ = st.occasionId;
    if (action === 'wear') { await wearOutfit(opt.pieces, { date: todayISO(date()), occasionId: occ }); run(); }
    else if (action === 'save') await saveOutfit(opt.pieces, { mode: opt.mode, occasionId: occ, score: opt.score, missing: opt.missing });
    else if (action === 'other') { st.offsets[opt.mode] = (st.offsets[opt.mode] || 0) + 1; run(); }
    else if (action === 'keep') { st.imposed[btn.dataset.role] = btn.dataset.id; toast('Pièce gardée pour les prochaines propositions'); run(); }
    else if (action === 'replace') replacePiece(btn.dataset.role, opt);
    else if (action === 'calendar') openModal({ title: 'Ajouter au calendrier', body: html`<div class="field"><label for="cd">Date</label><input id="cd" type="date" value="${todayISO(date())}"></div><button class="btn btn-primary" data-ok>Ajouter</button>`,
      onMount(body, close) { body.querySelector('[data-ok]').onclick = async () => { await addToCalendar(opt.pieces, { date: body.querySelector('#cd').value, occasionId: occ, title: `${MODE_NAME[opt.mode]} — ${OCCASION_BY_ID[occ].name}` }); close(); }; } });
    else if (action === 'similar') {
      const list = piecesList(opt.pieces).filter(([r]) => r !== 'accessory');
      openModal({ title: 'Chercher une pièce similaire', body: html`<p class="small muted">Choisissez la pièce à rechercher : la requête est construite à partir de sa fiche.</p><div class="kbd-list">${list.map(([r, g], i) => html`<button class="btn" data-i="${i}">${ROLE_LABELS[r]} — ${g.name}</button>`)}</div>`,
        onMount(body, close) { body.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => { const g = list[+b.dataset.i][1]; close(); navigate(`#/shopping?q=${encodeURIComponent(buildQuery({ category: g.name, color: g.color?.id, material: g.material, fit: '' }))}`); }); } });
    }
  };
  const replacePiece = (role, opt) => {
    openDressingPicker({ role, pieces: opt.pieces, garments: last.garments, occasion: OCCASION_BY_ID[st.occasionId], weather: last.weather, mode: opt.mode, onPick: (g) => {
      const keep = {}; for (const r of ['top', 'bottom', 'shoes', 'layer', 'outer']) if (opt.pieces[r] && r !== role) keep[r] = opt.pieces[r].id;
      st.imposed = { ...keep, [role]: g ? g.id : null }; toast('Pièce changée — note recalculée'); run();
    } });
  };
  const feedback = async (kind, opt) => {
    const p = await loadPrefs();
    const entry = { at: new Date().toISOString(), kind, key: comboKey(opt.pieces), label: '' };
    if (kind === 'like') { p.likedCombos = [...new Set([...(p.likedCombos || []), entry.key])]; entry.label = 'Tenue aimée : favorisée à l\'avenir'; }
    if (kind === 'too-formal') { p.formalityBias = Math.max(-2, (p.formalityBias || 0) - 0.5); entry.label = 'Formalité cible abaissée de 0,5'; }
    if (kind === 'too-casual') { p.formalityBias = Math.min(2, (p.formalityBias || 0) + 0.5); entry.label = 'Formalité cible relevée de 0,5'; }
    if (kind === 'too-warm') { p.warmthBias = Math.max(-3, (p.warmthBias || 0) - 0.5); entry.label = 'Préférence pour des tenues plus légères (≈ +1 °C ressenti)'; }
    if (kind === 'too-cold') { p.warmthBias = Math.min(3, (p.warmthBias || 0) + 0.5); entry.label = 'Préférence pour des tenues plus chaudes (≈ −1 °C ressenti)'; }
    if (kind === 'no-fit') {
      const list = piecesList(opt.pieces).filter(([r]) => ['top', 'bottom', 'layer', 'outer'].includes(r));
      openModal({ title: 'Quelle pièce ne vous va pas ?', body: html`<p class="small muted">La coupe de cette pièce sera notée « à revoir ». Réversible dans Profil.</p><div class="kbd-list">${list.map(([r, g], i) => html`<label class="check"><input type="checkbox" data-i="${i}"> ${ROLE_LABELS[r]} — ${g.name}</label>`)}</div><button class="btn btn-primary" data-ok style="margin-top:10px">Enregistrer</button>`,
        onMount(body, close) { body.querySelector('[data-ok]').onclick = async () => { const ids = [...body.querySelectorAll('[data-i]:checked')].map((c) => list[+c.dataset.i][1]); ids.forEach((g) => { p.dislikedFit = { ...(p.dislikedFit || {}), [g.id]: g.name }; }); p.history = [...(p.history || []), { ...entry, label: `Coupe à revoir : ${ids.map((g) => g.name).join(', ')}` }]; await savePrefs(p); close(); toast('Retour enregistré'); run(); }; } });
      return;
    }
    p.history = [...(p.history || []), entry].slice(-50);
    await savePrefs(p);
    toast(`${entry.label} — modifiable dans Profil`);
    if (kind !== 'like') run();
  };
  $('#go').onclick = run;
  renderDaily($('#daily'), { onShowAll: (occasionId) => { $('#occ').value = occasionId; st.occasionId = occasionId; occNote(); persist(); run().then(() => $('#all-h').scrollIntoView({ behavior: 'smooth' })); } });
}
