// Profil : mesures facultatives, coupes, tailles par marque, identité de style, budgets, ville, profils familiaux, préférences apprises.
import { html, raw, setHTML } from '../lib/html.js';
import { icon, toast, options, confirmDialog, readForm } from '../components/ui.js';
import { store, saveProfile, switchProfile, defaultProfile, prefs as loadPrefs, savePrefs } from '../state.js';
import { FITS, CATEGORIES } from '../data/taxonomy.js';
import { IDENTITY_MIX } from '../data/styles.js';
import { MEASURES_TO_CHECK } from '../data/guide.js';
import { navigate } from '../app.js';

const BODY_MEASURES = [['chest', 'Tour de poitrine'], ['waist', 'Tour de taille'], ['hips', 'Tour de hanches'], ['shoulders', 'Largeur d\'épaules'], ['inseam', 'Entrejambe'], ['arm', 'Longueur de bras'], ['neck', 'Tour de cou'], ['shoe', 'Pointure (EU)']];

export async function render(main) {
  const p = store.profile;
  const prefs = await loadPrefs();
  const mix = p.styleMix?.length ? p.styleMix : IDENTITY_MIX.map((m) => ({ ...m }));
  const sum = mix.reduce((a, m) => a + m.pct, 0);
  setHTML(main, html`
    <div class="page-head"><div class="eyebrow">Profil</div><h1>${p.name}</h1><p class="lede">Tout est modifiable et facultatif. Taille et poids seuls ne déterminent ni la morphologie, ni la carnation, ni une taille commerciale.</p></div>
    <form id="pform" class="stack">
    <fieldset><legend>Identité</legend><div class="form-grid">
      <div class="field"><label for="pname">Nom du profil</label><input id="pname" name="name" type="text" value="${p.name}"></div>
      <div class="field"><label for="pkind">Type</label><select id="pkind" name="kind" ${p.kind === 'main' ? raw('disabled') : ''}>${options([['main', 'Profil principal'], ['woman', 'Femme'], ['child', 'Enfant']], p.kind)}</select></div>
      <div class="field"><label for="pheight">Taille (cm)</label><input id="pheight" name="height" type="number" min="50" max="230" value="${p.height ?? ''}"></div>
      <div class="field"><label>Poids (kg, facultatif)</label><div class="row" style="flex-wrap:nowrap"><input name="weightMin" type="number" min="10" max="250" value="${p.weightMin ?? ''}" aria-label="Poids minimum"><span>–</span><input name="weightMax" type="number" min="10" max="250" value="${p.weightMax ?? ''}" aria-label="Poids maximum"></div></div>
      <div class="field span-2"><label for="pctx">Contexte (activité, contraintes)</label><textarea id="pctx" name="context">${p.context || ''}</textarea></div>
      <div class="field span-2"><label for="pgoals">Objectifs</label><textarea id="pgoals" name="goals">${p.goals || ''}</textarea></div>
    </div>
    <div class="callout small">La taille de ${p.height || '—'} cm ne fixe automatiquement aucune taille (S, M…). Mesures à vérifier avant tout achat : ${MEASURES_TO_CHECK.join(' ; ')}.</div></fieldset>
    <fieldset><legend>Mesures facultatives (cm)</legend><div class="form-grid">${BODY_MEASURES.map(([k, l]) => html`<div class="field"><label for="bm-${k}">${l}</label><input id="bm-${k}" name="bm_${k}" type="number" min="0" step="0.5" inputmode="decimal" value="${p.measures?.[k] ?? ''}"></div>`)}</div></fieldset>
    <fieldset><legend>Coupes préférées</legend><div class="chips">${FITS.map(([id, l]) => html`<label class="chip"><input type="checkbox" name="preferredFits" data-multi value="${id}" ${p.preferredFits?.includes(id) ? raw('checked') : ''}> ${l}</label>`)}</div></fieldset>
    <fieldset><legend>Tailles selon les marques</legend><div id="bsizes">${(p.brandSizes || []).map((b, i) => sizeRow(b, i))}</div><button type="button" class="btn btn-sm" id="addsize">${icon('plus')} Ajouter une taille</button></fieldset>
    <fieldset><legend>Mon identité de style</legend><p class="small muted">Mélange créatif (non scientifique) proposé par le guide : Italian Contemporary Classic. Total actuel : <strong id="mixsum">${sum}</strong> %.</p>
      ${mix.map((m, i) => html`<div class="field"><label for="mx${i}">${m.name} : <output id="omx${i}">${m.pct}</output> %</label><input id="mx${i}" type="range" min="0" max="100" step="5" value="${m.pct}" data-mix="${i}"></div>`)}
      <div class="card-flat" aria-hidden="true" id="mixchart">${mixChart(mix)}</div></fieldset>
    <fieldset><legend>Budgets (facultatifs, €)</legend><div class="form-grid">
      <div class="field"><label for="pmb">Budget mensuel</label><input id="pmb" name="monthlyBudget" type="number" min="0" value="${p.monthlyBudget ?? ''}"></div>
      ${CATEGORIES.map((c) => html`<div class="field"><label for="bud-${c.id}">${c.name} (max par pièce)</label><input id="bud-${c.id}" name="bud_${c.id}" type="number" min="0" value="${p.budgets?.[c.id] ?? ''}"></div>`)}</div>
      <p class="hint">Aucun budget global n'est imposé.</p></fieldset>
    <fieldset><legend>Lieu et langue</legend><div class="form-grid">
      <div class="field"><label for="pcity">Ville</label><input id="pcity" name="cityName" type="text" value="${p.city?.name || ''}"><p class="hint">Coordonnées : ${p.city?.lat ? `${p.city.lat}, ${p.city.lon}` : 'à définir depuis « Aujourd\'hui » › Changer de ville'}.</p></div>
      <div class="field"><label for="plang">Langue · devise · unités</label><input id="plang" type="text" value="Français (France) · EUR · métrique" disabled></div></div></fieldset>
    <button class="btn btn-primary" type="submit">${icon('check')} Enregistrer le profil</button>
    </form>
    <h2>Ce que l'application a appris</h2>
    <div class="card"><ul class="clean">
      <li class="row-between" style="padding:6px 0">Ajustement de formalité : ${fmtBias(prefs.formalityBias)} <button class="btn btn-sm btn-ghost" data-reset="formalityBias">Réinitialiser</button></li>
      <li class="row-between" style="padding:6px 0">Ajustement de chaleur : ${fmtBias(prefs.warmthBias)} <button class="btn btn-sm btn-ghost" data-reset="warmthBias">Réinitialiser</button></li>
      <li class="row-between" style="padding:6px 0">Tenues aimées : ${prefs.likedCombos?.length || 0} <button class="btn btn-sm btn-ghost" data-reset="likedCombos">Oublier</button></li>
      ${Object.entries(prefs.dislikedFit || {}).map(([id, name]) => html`<li class="row-between" style="padding:6px 0">Coupe à revoir : ${name} <button class="btn btn-sm btn-ghost" data-unfit="${id}">Retirer</button></li>`)}
    </ul>${prefs.history?.length ? html`<details class="disclosure"><summary>Historique des retours (${prefs.history.length})</summary><ul class="ticks small">${prefs.history.slice().reverse().map((h) => html`<li>${new Date(h.at).toLocaleDateString('fr-FR')} — ${h.label}</li>`)}</ul></details>` : ''}</div>
    <h2>Profils familiaux (facultatifs)</h2>
    <p class="small muted">Profils séparés : dressing, tenues et préférences ne se mélangent pas. Profil enfant : traitement local uniquement, aucun transfert photo vers l'IA, aucune reconnaissance faciale.</p>
    <div class="stack">${store.profiles.map((x) => html`<div class="card row-between"><div><strong>${x.name}</strong> <span class="tag">${({ main: 'principal', woman: 'femme', child: 'enfant' })[x.kind]}</span>${x.id === p.id ? html` <span class="tag tag-ok">actif</span>` : ''}</div>
      <div class="btn-row">${x.id !== p.id ? html`<button class="btn btn-sm" data-switch="${x.id}">Activer</button>` : ''}${x.kind !== 'main' ? html`<button class="btn btn-sm btn-danger" data-delprof="${x.id}">${icon('trash')}</button>` : ''}</div></div>`)}</div>
    <div class="btn-row" style="margin-top:10px"><button class="btn" data-newprof="woman">${icon('plus')} Profil femme</button><button class="btn" data-newprof="child">${icon('plus')} Profil enfant</button></div>`);
  const $ = (s) => main.querySelector(s);
  $('#addsize').onclick = () => { const div = document.createElement('div'); setHTML(div, sizeRow({}, Date.now())); $('#bsizes').appendChild(div.firstElementChild); bindSizeRows(); };
  const bindSizeRows = () => main.querySelectorAll('[data-rmsize]').forEach((b) => b.onclick = () => b.closest('.size-row').remove());
  bindSizeRows();
  main.querySelectorAll('[data-mix]').forEach((inp) => inp.oninput = () => { mix[+inp.dataset.mix].pct = +inp.value; $(`#omx${inp.dataset.mix}`).textContent = inp.value; $('#mixsum').textContent = mix.reduce((a, m) => a + m.pct, 0); setHTML($('#mixchart'), mixChart(mix)); });
  $('#pform').onsubmit = async (e) => {
    e.preventDefault();
    const v = readForm(e.target);
    const sizes = [...main.querySelectorAll('.size-row')].map((r) => ({ brand: r.querySelector('[data-s="brand"]').value.trim(), category: r.querySelector('[data-s="category"]').value, size: r.querySelector('[data-s="size"]').value.trim() })).filter((s) => s.brand && s.size);
    const updated = { ...p, name: v.name || p.name, kind: p.kind === 'main' ? 'main' : v.kind, height: v.height, weightMin: v.weightMin, weightMax: v.weightMax, context: v.context, goals: v.goals,
      measures: Object.fromEntries(BODY_MEASURES.map(([k]) => [k, v[`bm_${k}`]])), preferredFits: v.preferredFits || [], brandSizes: sizes, styleMix: mix,
      monthlyBudget: v.monthlyBudget, budgets: Object.fromEntries(CATEGORIES.map((c) => [c.id, v[`bud_${c.id}`]])),
      city: v.cityName && v.cityName !== p.city?.name ? { name: v.cityName } : p.city };
    if (updated.kind === 'child') updated.consents = { ...updated.consents, ai: false };
    await saveProfile(updated);
    toast(v.cityName && v.cityName !== p.city?.name ? 'Profil enregistré — validez la ville depuis « Aujourd\'hui » pour la météo' : 'Profil enregistré');
    navigate('#/profile');
  };
  main.querySelectorAll('[data-reset]').forEach((b) => b.onclick = async () => { const pr = await loadPrefs(); pr[b.dataset.reset] = b.dataset.reset === 'likedCombos' ? [] : 0; pr.history = [...(pr.history || []), { at: new Date().toISOString(), label: `Réinitialisation : ${b.dataset.reset}` }]; await savePrefs(pr); navigate('#/profile'); });
  main.querySelectorAll('[data-unfit]').forEach((b) => b.onclick = async () => { const pr = await loadPrefs(); delete pr.dislikedFit[b.dataset.unfit]; await savePrefs(pr); navigate('#/profile'); });
  main.querySelectorAll('[data-switch]').forEach((b) => b.onclick = async () => { await switchProfile(b.dataset.switch); toast(`Profil actif : ${store.profile.name}`); navigate('#/profile'); });
  main.querySelectorAll('[data-newprof]').forEach((b) => b.onclick = async () => { const np = defaultProfile(b.dataset.newprof); await saveProfile(np); toast(`${np.name} créé`); navigate('#/profile'); });
  main.querySelectorAll('[data-delprof]').forEach((b) => b.onclick = async () => {
    const x = store.profiles.find((y) => y.id === b.dataset.delprof);
    if (!(await confirmDialog({ title: `Supprimer « ${x.name} » ?`, message: 'Le profil, ses vêtements, photos, tenues, analyses et préférences seront supprimés de cet appareil. Action irréversible.', confirmLabel: 'Supprimer', danger: true }))) return;
    for (const store2 of ['garments', 'outfits', 'wearlog', 'calendar', 'wishlist', 'palettes', 'analyses', 'photos']) {
      const rows = await store.repo.all(store2, (r) => r.profileId === x.id);
      for (const r of rows) await store.repo.remove(store2, r.id);
    }
    for (const k of [`prefs:${x.id}`, `capsule:${x.id}`, `today:${x.id}`]) await store.repo.remove('kv', k);
    await store.repo.remove('profiles', x.id);
    store.profiles = await store.repo.all('profiles');
    if (store.profile.id === x.id) await switchProfile('profile_main');
    toast('Profil supprimé'); navigate('#/profile');
  });
}

function fmtBias(v) { if (!v) return 'aucun'; return `${v > 0 ? '+' : ''}${String(v).replace('.', ',')}`; }
function sizeRow(b, i) {
  return html`<div class="size-row form-grid" style="grid-template-columns:1fr 1fr 1fr auto;align-items:end"><div class="field"><label for="sb${i}">Marque</label><input id="sb${i}" data-s="brand" type="text" value="${b.brand || ''}"></div>
    <div class="field"><label for="sc${i}">Catégorie</label><select id="sc${i}" data-s="category">${options(CATEGORIES.map((c) => [c.id, c.name]), b.category || 'haut')}</select></div>
    <div class="field"><label for="ss${i}">Taille</label><input id="ss${i}" data-s="size" type="text" value="${b.size || ''}"></div>
    <button type="button" class="btn btn-sm btn-ghost" data-rmsize aria-label="Retirer cette taille" style="margin-bottom:14px">${icon('trash')}</button></div>`;
}
function mixChart(mix) {
  return html`${mix.map((m) => html`<div class="bar-row"><span>${m.name}</span><div class="bar-track"><span style="width:${raw(m.pct)}%"></span></div><span class="num">${m.pct} %</span></div>`)}`;
}
