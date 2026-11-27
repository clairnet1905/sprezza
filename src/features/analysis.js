// Analyse de tenue : IA (serveur, consentement) ou questionnaire manuel + règles locales, toujours disponible.
import { html, raw, setHTML } from '../lib/html.js';
import { icon, toast, options, emptyState, fmtDate, confirmDialog, swatch } from '../components/ui.js';
import { store, pid, garments as loadGarments, analyses as loadAnalyses, prefs as loadPrefs, hydratePhotos } from '../state.js';
import { uid } from '../repositories/db.js';
import { OCCASIONS, OCCASION_BY_ID } from '../data/occasions.js';
import { GARMENT_COLORS as ALL_COLORS, COLOR_BY_ID } from '../data/colors.js';
import { STYLE_OPTS } from '../data/taxonomy.js';
import { GRID, ERRORS } from '../data/guide.js';
import { finalizeCriteria, COVERAGE_THRESHOLD } from '../domain/scoring.js';
import { paletteNote, classifyHarmony, suggestPalette, BOTTOM_IDS } from '../domain/colors.js';
import { recommend } from '../domain/recommend.js';
import { checkImageFile, loadBitmap, processImage, blobToDataURL, renderToCanvas, canvasToBlob } from '../services/image.js';
import { aiStatus, analyzeRemote } from '../services/ai.js';
import { criteriaView, scoreBadge, proposalCard } from './shared.js';

const Q = {
  fit: [['shoulders', 'Les coutures d\'épaules tombent-elles au bon endroit ?'], ['ease', 'Aisance naturelle (ni plis de tension, ni excès de tissu) ?'], ['hem', 'Ourlet sans accumulation de plis (légère cassure au plus) ?'], ['toplength', 'Longueur du haut maîtrisée (ne raccourcit pas les jambes) ?'], ['sleeves', 'Manches au niveau du poignet ?']],
  refinement: [['materials', 'Matières de qualité visibles (laine, coton dense, lin, cuir…) ?'], ['patterns', 'Au plus une pièce à motif dominante ?'], ['logos', 'Logos absents ou discrets ?']],
  shoes: [['shoeclean', 'Chaussures propres et entretenues ?'], ['shoefit', 'Chaussures adaptées à la formalité de la tenue ?'], ['belt', 'Ceinture harmonisée avec les chaussures (si portée) ?']],
  presentation: [['pressed', 'Vêtements défroissés/repassés ?'], ['clean', 'Pièces propres, sans bouloches ?']],
};
const FIX = { shoulders: ERRORS[4], ease: ERRORS[0], hem: ERRORS[2], toplength: ERRORS[1], sleeves: ERRORS[3], materials: ERRORS[16], patterns: ERRORS[8], logos: ERRORS[9], shoeclean: ERRORS[10], shoefit: ERRORS[17], belt: ERRORS[12], pressed: ERRORS[14], clean: ERRORS[15] };
const ANS = [['', 'Je ne sais pas / invisible'], ['yes', 'Oui'], ['partial', 'En partie'], ['no', 'Non']];
const VAL = { yes: 1, partial: 0.5, no: 0 };

export async function render(main) {
  const [ai, all, history] = await Promise.all([aiStatus(), loadGarments(), loadAnalyses()]);
  const consent = store.profile.consents?.ai; const isChild = store.profile.kind === 'child';
  const photos = []; // { url, blob, dataUrl? }
  setHTML(main, html`
    <div class="page-head"><div class="eyebrow">Analyse</div><h1>Analyser une tenue</h1>
      <p class="lede">Photo d'une tenue portée, de plusieurs alternatives ou de vêtements étalés. L'analyse évalue la tenue visible, jamais la personne ni son corps. Elle signale ce qui est invisible au lieu de le supposer.</p></div>
    <div class="callout ${ai.ai && consent && !isChild ? 'callout-info' : ''}">${ai.ai ? consent ? isChild ? 'Profil enfant : aucune photo n\'est transmise à l\'IA. Utilisez le questionnaire.' : 'IA configurée côté serveur : les photos seront envoyées au fournisseur IA uniquement quand vous cliquerez « Analyser avec l\'IA ».' : html`IA configurée mais consentement non donné (<a href="#/settings">Paramètres</a>). Le questionnaire manuel reste complet.` : html`Mode sans IA : ${ai.reason}. Le questionnaire manuel et les règles locales donnent une analyse structurée sur 100.`}</div>
    <section class="card" style="margin-top:14px"><h3>1. Photos (numérotées dans l'ordre)</h3>
      <div class="btn-row"><label class="btn" for="acam">${icon('camera')} Prendre une photo</label><input id="acam" type="file" accept="image/*" capture="environment" class="sr-only"><label class="btn" for="afile">${icon('upload')} Choisir des photos</label><input id="afile" type="file" multiple accept="image/*" class="sr-only"></div>
      <div class="row" id="athumbs" style="margin-top:10px"></div>
      <div class="form-grid" style="margin-top:12px"><div class="field"><label for="akind">Type</label><select id="akind">${options([['worn', 'Tenue portée'], ['flat', 'Vêtements étalés'], ['alts', 'Plusieurs alternatives à comparer']], 'worn')}</select></div>
        <div class="field"><label for="aocc">Occasion</label><select id="aocc">${options(OCCASIONS.map((o) => [o.id, o.name]), '', { empty: 'Non précisée' })}</select></div></div>
      <p class="hint">Conseil de prise de vue : en pied, lumière du jour, de face, chaussures visibles, sans contre-jour.</p></section>
    <div class="btn-row" style="margin:14px 0"><button class="btn btn-primary" id="amanual">Questionnaire manuel</button>${ai.ai && consent && !isChild ? html`<button class="btn btn-gold" id="aai">Analyser avec l'IA</button>` : ''}</div>
    <div id="aout"></div>
    ${history.length ? html`<h2>Analyses précédentes</h2><div class="stack">${history.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10).map((h) => html`<details class="card"><summary class="row-between" style="cursor:pointer"><span>${fmtDate(h.createdAt)} — ${OCCASION_BY_ID[h.occasionId]?.name || 'occasion non précisée'} · ${h.source === 'ai' ? 'IA' : 'questionnaire'}</span><strong>${h.result.score100 ?? (h.result.scoreRange ? h.result.scoreRange.join('–') : '—')}/100</strong></summary>${criteriaView({ criteria: h.result.criteria.map((c) => ({ ...c, name: GRID.find((g) => g.id === c.id)?.name })) })}<button class="btn btn-sm btn-ghost" data-hdel="${h.id}" style="margin-top:8px">${icon('trash')} Supprimer</button></details>`)}</div>` : ''}`);
  const $ = (s) => main.querySelector(s);
  const addFiles = async (files) => {
    for (const f of files) {
      if (photos.length >= 6) { toast('6 photos maximum'); break; }
      try { await checkImageFile(f); const bmp = await loadBitmap(f); const c = renderToCanvas(bmp, { maxSide: 1280 }); const blob = await canvasToBlob(c, 0.82); photos.push({ blob, url: URL.createObjectURL(blob) }); }
      catch (e) { toast(e.message); }
    }
    setHTML($('#athumbs'), photos.map((p, i) => html`<figure style="margin:0;text-align:center"><div class="mini-thumb" style="width:80px"><img src="${p.url}" alt="Photo ${i + 1}"></div><figcaption class="small">Photo ${i + 1} <button class="btn btn-sm btn-ghost" data-rm="${i}" aria-label="Retirer la photo ${i + 1}">×</button></figcaption></figure>`));
    main.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => { photos.splice(+b.dataset.rm, 1); addFiles([]); });
  };
  $('#acam').onchange = (e) => addFiles([...e.target.files]);
  $('#afile').onchange = (e) => addFiles([...e.target.files]);
  $('#amanual').onclick = () => manual(main, photos, all);
  $('#aai')?.addEventListener('click', () => runAI(main, photos, all));
  main.querySelectorAll('[data-hdel]').forEach((b) => b.onclick = async () => { if (await confirmDialog({ title: 'Supprimer cette analyse ?', message: 'Action irréversible.', confirmLabel: 'Supprimer', danger: true })) { await store.repo.remove('analyses', b.dataset.hdel); render(main); } });
}

function manual(main, photos, all) {
  const out = main.querySelector('#aout');
  const n = Math.max(1, photos.length);
  const colorOpts = ALL_COLORS.map((c) => [c.id, c.name]);
  setHTML(out, html`<form id="qform">${Array.from({ length: n }, (_, i) => html`<fieldset data-photo="${i}"><legend>${n > 1 ? `Photo ${i + 1}` : 'Votre tenue'}</legend>
    ${photos[i] ? html`<div class="mini-thumb" style="width:110px;margin-bottom:10px"><img src="${photos[i].url}" alt="Photo ${i + 1}"></div>` : ''}
    <div class="form-grid">
      <div class="field"><label>Couleur du haut</label><select data-k="top">${options(colorOpts, '', { empty: 'Inconnue' })}</select></div>
      <div class="field"><label>Couleur du bas</label><select data-k="bottom">${options(colorOpts, '', { empty: 'Inconnue' })}</select></div>
      <div class="field"><label>Veste (si portée)</label><select data-k="jacket">${options(colorOpts, '', { empty: 'Aucune / inconnue' })}</select></div>
      <div class="field"><label>Chaussures</label><select data-k="shoe">${options(colorOpts, '', { empty: 'Invisibles / inconnues' })}</select></div>
      <div class="field"><label>Style visé</label><select data-k="style">${options(STYLE_OPTS, '', { empty: 'Non précisé' })}</select></div>
      <div class="field"><label>Cohérence avec ce style</label><select data-k="stylefit">${options(ANS, '')}</select></div>
      <div class="field"><label>Formalité perçue</label><select data-k="formality">${options([[1, '1 — détente'], [2, '2 — décontracté'], [3, '3 — smart casual'], [4, '4 — business casual'], [5, '5 — formel']], '', { empty: 'Je ne sais pas' })}</select></div>
    </div>
    ${Object.entries(Q).map(([crit, qs]) => html`<p class="eyebrow" style="margin-top:10px">${GRID.find((g) => g.id === crit).name}</p>${qs.map(([k, q]) => html`<div class="field"><label>${q}</label><select data-k="${k}">${options(ANS, '')}</select></div>`)}`)}
  </fieldset>`)}<button class="btn btn-primary" type="submit">Calculer l'analyse</button></form>`);
  out.querySelector('#qform').onsubmit = async (e) => {
    e.preventDefault();
    const occasionId = main.querySelector('#aocc').value;
    const occ = OCCASION_BY_ID[occasionId];
    const results = [...out.querySelectorAll('[data-photo]')].map((fs) => {
      const v = Object.fromEntries([...fs.querySelectorAll('[data-k]')].map((el) => [el.dataset.k, el.value]));
      return evaluateManual(v, occ);
    });
    const best = results.length > 1 ? results.map((r, i) => [r, i]).sort((a, b) => (b[0].score.normalized ?? -1) - (a[0].score.normalized ?? -1))[0][1] : 0;
    const prefs = await loadPrefs();
    const variant = all.length ? recommend({ garments: all, occasionId: occasionId || 'daily', prefs, profileId: pid() }).options[0] : null;
    showResult(main, { results, best, variant, occasionId, source: 'manual', photos });
  };
}

/** Évaluation locale à partir du questionnaire : un critère sans réponse reste non évaluable. */
export function evaluateManual(v, occ) {
  const crit = {}; const reasons = {}; const improvements = []; const unknowns = []; const strengths = [];
  const score = (keys, max, id) => {
    const answered = keys.filter((k) => v[k]);
    keys.filter((k) => !v[k]).forEach((k) => unknowns.push(Q[id].find((q) => q[0] === k)[1]));
    if (answered.length < Math.min(2, keys.length)) { crit[id] = null; reasons[id] = 'Pas assez d\'éléments visibles ou connus.'; return; }
    const val = answered.reduce((a, k) => a + VAL[v[k]], 0) / answered.length;
    crit[id] = val * max; reasons[id] = `${answered.length}/${keys.length} points observés.`;
    answered.forEach((k) => { if (v[k] === 'no' || v[k] === 'partial') improvements.push(`${FIX[k][0]} → ${FIX[k][1]}`); else strengths.push(Q[id].find((q) => q[0] === k)[1].replace(' ?', '')); });
  };
  score(Q.fit.map((q) => q[0]), 25, 'fit');
  score(Q.refinement.map((q) => q[0]), 20, 'refinement');
  score(Q.shoes.map((q) => q[0]), 10, 'shoes');
  score(Q.presentation.map((q) => q[0]), 5, 'presentation');
  if (v.top && v.bottom) {
    const pn = paletteNote({ top: v.top, bottom: v.bottom, jacket: v.jacket || null, shoe: v.shoe || null });
    crit.colors = Math.max(0, Math.min(20, ((pn.note - 5) / 5) * 20));
    const h = classifyHarmony([v.top, v.bottom, v.jacket, v.shoe]);
    reasons.colors = `${h.name}. ${pn.notes[0] || h.text}`;
    if (pn.note >= 9) strengths.push(`Harmonie ${h.name.toLowerCase()} réussie`);
  } else { crit.colors = null; reasons.colors = 'Couleurs du haut et du bas nécessaires.'; unknowns.push('Couleurs du haut et du bas'); }
  if (v.style && v.stylefit) { crit.style = VAL[v.stylefit] * 10; reasons.style = `Cohérence déclarée avec ${STYLE_OPTS.find((s) => s[0] === v.style)?.[1]}.`; } else { crit.style = null; reasons.style = 'Style visé ou cohérence non précisés.'; }
  if (occ && v.formality) {
    const f = Number(v.formality); const d = Math.abs(f - occ.target);
    crit.occasion = Math.max(0, 10 - d * 3.2); if (occ.strict && f < occ.formality[0]) crit.occasion = Math.min(crit.occasion, 2);
    reasons.occasion = `Formalité ${f}/5 pour une cible ${occ.target}/5 (${occ.name}).`;
    if (f < occ.formality[0]) improvements.push(`Tenue inadaptée à l'occasion → ${ERRORS[17][1]} (formalité attendue ${occ.formality[0]}–${occ.formality[1]}/5)`);
  } else { crit.occasion = null; reasons.occasion = 'Occasion ou formalité non précisée.'; }
  const s = finalizeCriteria(crit, reasons);
  const shoes = [];
  if (v.bottom && BOTTOM_IDS.includes(v.bottom)) { const sp = suggestPalette(v.bottom, 'bottom'); shoes.push(`${sp.shoe.name} (matrice des couleurs pour un bas ${COLOR_BY_ID[v.bottom].name.toLowerCase()})`); }
  if (occ) shoes.push(occ.formality[0] >= 5 ? 'Richelieus noirs ou derbies sombres' : occ.target >= 4 ? 'Derbies ou mocassins en cuir marron' : occ.target <= 2 ? 'Baskets minimalistes ou bottines' : 'Mocassins marron foncé ou derbies');
  return { score: s, improvements: [...new Set(improvements)], strengths: [...new Set(strengths)], uncertainties: unknowns, recommendedShoeTypes: shoes, photoAdvice: s.assessedWeight < COVERAGE_THRESHOLD ? 'Trop d\'éléments invisibles : reprenez une photo en pied, de face, à la lumière du jour, chaussures visibles.' : null, colors: [v.top, v.bottom, v.jacket, v.shoe].filter(Boolean) };
}

async function runAI(main, photos, all) {
  const out = main.querySelector('#aout');
  if (!photos.length) { toast('Ajoutez au moins une photo'); return; }
  setHTML(out, html`<p><span class="loader"></span> Analyse IA en cours (time-out 60 s)…</p>`);
  try {
    const images = await Promise.all(photos.map((p) => blobToDataURL(p.blob)));
    const occasionId = main.querySelector('#aocc').value;
    const result = await analyzeRemote({ images, context: { kind: main.querySelector('#akind').value, occasion: OCCASION_BY_ID[occasionId]?.name || null, profile: { height: store.profile.height, goals: store.profile.goals } }, ownedItems: all.map((g) => ({ id: g.id, name: g.name, category: g.category, color: g.color?.name || '' })) });
    const prefs = await loadPrefs();
    const variant = all.length ? recommend({ garments: all, occasionId: occasionId || 'daily', prefs, profileId: pid() }).options[0] : null;
    const score = { ...result, criteria: result.criteria.map((c) => ({ ...c, name: GRID.find((g) => g.id === c.id).name })), normalized: result.score100 };
    showResult(main, { results: [{ score, improvements: result.improvements, strengths: result.strengths, uncertainties: result.uncertainties, recommendedShoeTypes: result.recommendedShoeTypes, photoAdvice: result.photoAdvice, observations: result.observations, alternatives: result.alternatives, owned: result.ownedItemIds.map((id) => all.find((g) => g.id === id)).filter(Boolean), palette: result.palette }], best: 0, variant, occasionId, source: 'ai', photos });
  } catch (e) {
    setHTML(out, html`<div class="callout callout-warn"><strong>Analyse IA impossible :</strong> ${e.message}${e.issues ? html`<ul class="ticks small">${e.issues.map((i) => html`<li>${i}</li>`)}</ul>` : ''}<p>La réponse n'a pas été utilisée. Le questionnaire manuel et les règles locales restent disponibles.</p><button class="btn btn-sm" id="fallback">Passer au questionnaire</button></div>`);
    out.querySelector('#fallback').onclick = () => manual(main, photos, all);
  }
}

function showResult(main, { results, best, variant, occasionId, source, photos }) {
  const out = main.querySelector('#aout');
  setHTML(out, html`
    ${results.length > 1 ? html`<div class="callout callout-info"><strong>Meilleur choix : photo ${best + 1}</strong> — note la plus élevée sur les critères évaluables (${results.map((r, i) => `photo ${i + 1} : ${r.score.score100 ?? (r.score.scoreRange ? r.score.scoreRange.join('–') : 'non calculable')}`).join(' · ')}).</div>` : ''}
    ${results.map((r, i) => html`<article class="card card-accent" style="margin-top:14px"><div class="proposal-head"><div><div class="eyebrow">${results.length > 1 ? `Photo ${i + 1}` : 'Résultat'} · ${source === 'ai' ? 'analyse IA validée' : 'questionnaire + règles locales'}</div><h3>Évaluation de la tenue</h3>
        ${r.colors?.length ? html`<div class="row">${r.colors.map((c) => swatch(COLOR_BY_ID[c]?.hex, COLOR_BY_ID[c]?.name))}</div>` : ''}${r.palette?.length ? html`<div class="row">${r.palette.map((p) => html`<span class="tag">${swatch(p.hex)} ${p.name}</span>`)}</div>` : ''}</div>${scoreBadge(r.score)}</div>
      ${r.score.score100 === null ? html`<p class="small callout callout-warn">Couverture ${r.score.assessedWeight}/100 : en dessous du seuil de ${COVERAGE_THRESHOLD} points, aucune note précise n'est calculée (plage affichée). Les critères non évaluables ne sont pas pénalisés.</p>` : ''}
      ${criteriaView(r.score)}
      ${r.observations?.length ? html`<h4 style="margin-top:12px">Observations</h4><ul class="ticks">${r.observations.map((o) => html`<li>${o}</li>`)}</ul>` : ''}
      ${r.strengths.length ? html`<h4 style="margin-top:12px">Ce qui fonctionne</h4><ul class="ticks">${r.strengths.map((s) => html`<li>${s}</li>`)}</ul>` : ''}
      ${r.improvements.length ? html`<h4>À améliorer (retouche ou association avant achat)</h4><ul class="ticks">${r.improvements.map((s) => html`<li>${s}</li>`)}</ul>` : ''}
      ${r.recommendedShoeTypes?.length ? html`<h4>Chaussures conseillées</h4><ul class="ticks">${r.recommendedShoeTypes.map((s) => html`<li>${s}</li>`)}</ul>` : ''}
      ${r.uncertainties?.length ? html`<details class="disclosure"><summary>Éléments invisibles ou non connus (${r.uncertainties.length})</summary><ul class="ticks small">${r.uncertainties.map((s) => html`<li>${s}</li>`)}</ul></details>` : ''}
      ${r.photoAdvice ? html`<div class="callout">${r.photoAdvice}</div>` : ''}
      ${r.owned?.length ? html`<p class="small">Pièces du dressing identifiées : ${r.owned.map((g) => g.name).join(', ')}</p>` : ''}
    </article>`)}
    ${variant ? html`<h2>Meilleure variante avec votre dressing</h2><p class="small muted">Proposée avant tout achat, pour ${OCCASION_BY_ID[occasionId || 'daily'].name.toLowerCase()}.</p>${proposalCard(variant, 0, { actions: false, title: 'Variante du dressing' })}` : html`<p class="small muted" style="margin-top:12px">Ajoutez vos vêtements au dressing pour obtenir une variante composée de pièces réelles.</p>`}
    <p class="small muted" style="margin-top:12px">Une note de style est une évaluation pédagogique de la tenue, pas un consensus ni une mesure de la valeur d'une personne. <a href="#/academy/ch/photos">Références photographiques</a></p>
    <button class="btn btn-primary" id="asave">${icon('check')} Enregistrer cette analyse</button>`);
  hydratePhotos(out);
  out.querySelector('#asave').onclick = async () => {
    const r = results[best];
    await store.repo.put('analyses', { id: uid('an'), profileId: pid(), source, occasionId: occasionId || null, photoCount: photos.length, version: 1, result: { criteria: r.score.criteria.map(({ id, max, score, reason }) => ({ id, max, score, reason })), score100: r.score.score100, scoreRange: r.score.scoreRange, assessedWeight: r.score.assessedWeight, improvements: r.improvements } });
    toast('Analyse enregistrée (sans les photos)');
  };
  void raw; void emptyState; void processImage;
}
