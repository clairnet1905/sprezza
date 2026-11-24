// Académie de l'élégance : 20 chapitres, 15 styles, écoles notées, photothèque, recherche, progression, favoris, quiz.
import { html, raw, setHTML, highlight } from '../lib/html.js';
import { icon, toast, swatch, emptyState } from '../components/ui.js';
import { mannequinSVG } from '../components/mannequin.js';
import { store } from '../state.js';
import { uid } from '../repositories/db.js';
import { CHAPTERS, QUIZ } from '../data/chapters.js';
import * as G from '../data/guide.js';
import { STYLES, STYLE_BY_ID, CLOSE_STYLES, TRADITIONS, TRADITIONS_NOTE, ITALY_CITIES, SCHOOL_CRITERIA, SCHOOLS, SCHOOLS_NOTE, SPECIALISTS, PRIORITIES, PRINCIPLE_CLASSES, TOP5_BY_OCCASION, IDENTITY_MIX, SIGNATURE_OUTFITS } from '../data/styles.js';
import { OCCASIONS, OCCASION_NOTES, PRIORITY_VISUALS } from '../data/occasions.js';
import { MAIN_COLORS, PALETTES_20, COLOR_RULES, FACE_COLOR_NOTE, ITALIAN_SIGNATURES } from '../data/colors.js';
import { CAPSULE, TEMPLATES, CAPSULE_NOTE } from '../data/capsule.js';
import { PHOTOS, PHOTO_BY_ID, GALLERIES, STYLE_PHOTO_BRIEFS, PHOTO_QUERIES, PHOTO_CHECKLIST, RIGHTS_LABELS } from '../data/photos.js';
import { colorHex } from '../domain/colors.js';
import { checkImageFile, loadBitmap, processImage } from '../services/image.js';
import { navigate } from '../app.js';

const PROGRESS_KEY = 'academy';
const getProgress = () => store.repo.kvGet(PROGRESS_KEY, { read: {}, favorites: [], last: null, quiz: {} });
const setProgress = (p) => store.repo.kvSet(PROGRESS_KEY, p);

const tbl = (head, rows, { num = [] } = {}) => html`<div class="table-wrap"><table><thead><tr>${head.map((h, i) => html`<th class="${num.includes(i) ? 'num' : ''}">${h}</th>`)}</tr></thead><tbody>${rows.map((r) => html`<tr>${r.map((c, i) => html`<td class="${num.includes(i) ? 'num' : ''}">${c}</td>`)}</tr>`)}</tbody></table></div>`;
const fr = (n) => String(n).replace('.', ',');
const todo = (label) => html`<span class="tag tag-warn" title="Rubrique non renseignée par le guide initial : à compléter avec une source vérifiable (annexe D), jamais inventée">${label || 'À compléter et sourcer'}</span>`;

export async function render(main, params, query) {
  const [a, b] = params;
  if (a === 'ch' && b) return renderChapter(main, b);
  if (a === 'style' && b) return renderStyle(main, b);
  if (a === 'schools') return renderSchools(main);
  if (a === 'photos') return renderPhotos(main);
  if (a === 'search') return renderSearch(main, query.get('q') || '');
  return renderIndex(main);
}

// ------------------------------------------------------------- Sommaire
async function renderIndex(main) {
  const p = await getProgress();
  const readCount = Object.keys(p.read).length;
  const last = p.last && CHAPTERS.find((c) => c.id === p.last.id);
  setHTML(main, html`
    <div class="page-head"><div class="eyebrow">Académie de l'élégance</div><h1>Développer son regard</h1>
      <p class="lede">Une formation progressive : vingt chapitres, quinze styles, les grandes écoles et une photothèque sourcée. Les notes sont des évaluations éditoriales argumentées, pas des sondages.</p></div>
    <form class="row" id="sform" role="search" style="margin-bottom:16px;flex-wrap:nowrap"><label for="sq" class="sr-only">Rechercher dans l'Académie</label><input id="sq" type="search" placeholder="Rechercher : sprezzatura, ourlet, marine, mariage…"><button class="btn" type="submit">${icon('search')}<span class="sr-only">Rechercher</span></button></form>
    <div class="grid-3">
      <div class="card"><div class="stat">${readCount}/20</div><div class="stat-label">chapitres lus</div><div class="progress" style="margin-top:10px"><span style="width:${raw(readCount * 5)}%"></span></div></div>
      <div class="card">${last ? html`<div class="eyebrow">Reprendre la lecture</div><a href="#/academy/ch/${last.id}"><h3>${last.n}. ${last.title}</h3></a>` : html`<div class="eyebrow">Commencer</div><a href="#/academy/ch/introduction"><h3>1. L'art de bien s'habiller</h3></a>`}</div>
      <div class="card"><div class="eyebrow">Explorer</div><div class="btn-row"><a class="btn btn-sm" href="#/academy/ch/styles">15 styles</a><a class="btn btn-sm" href="#/academy/schools">Comparer les écoles</a><a class="btn btn-sm" href="#/academy/photos">Photothèque</a></div></div>
    </div>
    ${p.favorites.length ? html`<h2>Mes favoris</h2><div class="chips">${p.favorites.map((f) => { const c = CHAPTERS.find((x) => x.id === f); const s = STYLE_BY_ID[f]; return c ? html`<a class="chip" href="#/academy/ch/${c.id}">${icon('heart', { filled: true })} ${c.title}</a>` : s ? html`<a class="chip" href="#/academy/style/${s.id}">${icon('heart', { filled: true })} ${s.name}</a>` : ''; })}</div>` : ''}
    <h2>Sommaire</h2>
    <ol class="clean grid-wide">${CHAPTERS.map((c) => html`<li><a class="card card-link" href="#/academy/ch/${c.id}"><div class="row-between"><span class="eyebrow">Chapitre ${c.n} · ${c.src}</span>${p.read[c.id] ? html`<span class="tag tag-ok">${icon('check')} lu</span>` : ''}</div><h3>${c.title}</h3><p class="small muted">${c.summary}</p></a></li>`)}</ol>`);
  main.querySelector('#sform').onsubmit = (e) => { e.preventDefault(); const q = main.querySelector('#sq').value.trim(); if (q) navigate(`#/academy/search?q=${encodeURIComponent(q)}`); };
}

// ------------------------------------------------------------- Chapitre
async function renderChapter(main, id) {
  const c = CHAPTERS.find((x) => x.id === id);
  if (!c) { setHTML(main, emptyState('Chapitre introuvable', '', html`<a class="btn" href="#/academy">Sommaire</a>`)); return; }
  const p = await getProgress();
  p.last = { id, at: new Date().toISOString() }; await setProgress(p);
  const prev = CHAPTERS[c.n - 2]; const next = CHAPTERS[c.n];
  const isFav = p.favorites.includes(id);
  setHTML(main, html`<a href="#/academy" class="small">← Sommaire</a>
    <article><header class="page-head" style="margin-top:8px"><div class="eyebrow">Chapitre ${c.n} · ${c.src}</div><h1>${c.title}</h1><p class="lede">${c.summary}</p>
      <div class="btn-row"><button class="btn btn-sm" id="fav">${icon('heart', { filled: isFav })} ${isFav ? 'Favori' : 'Ajouter aux favoris'}</button><button class="btn btn-sm ${p.read[id] ? '' : 'btn-primary'}" id="read">${icon('check')} ${p.read[id] ? 'Lu' : 'Marquer comme lu'}</button></div></header>
    <hr class="rule">
    <div class="chapter-body">${chapterBody(id)}</div>
    ${QUIZ[id] ? html`<section class="card" style="margin-top:24px"><div class="eyebrow">Quiz facultatif</div>${QUIZ[id].map((q, qi) => html`<fieldset data-q="${qi}"><legend>${q.q}</legend>${q.a.map((ans, ai) => html`<label class="check"><input type="radio" name="q${qi}" value="${ai}" ${p.quiz[`${id}:${qi}`] === ai ? raw('checked') : ''}> ${ans}</label>`)}<p class="small" data-fb aria-live="polite"></p></fieldset>`)}</section>` : ''}
    <nav class="row-between" style="margin-top:24px" aria-label="Chapitres">${prev ? html`<a class="btn" href="#/academy/ch/${prev.id}">← ${prev.title}</a>` : html`<span></span>`}${next ? html`<a class="btn" href="#/academy/ch/${next.id}">${next.title} →</a>` : ''}</nav></article>`);
  main.querySelector('#fav').onclick = async () => { const q = await getProgress(); q.favorites = q.favorites.includes(id) ? q.favorites.filter((f) => f !== id) : [...q.favorites, id]; await setProgress(q); navigate(`#/academy/ch/${id}`); };
  main.querySelector('#read').onclick = async () => { const q = await getProgress(); if (q.read[id]) delete q.read[id]; else q.read[id] = new Date().toISOString(); await setProgress(q); toast(q.read[id] ? 'Chapitre marqué comme lu' : 'Marqué non lu'); navigate(`#/academy/ch/${id}`); };
  main.querySelectorAll('[data-q]').forEach((fs) => {
    const qi = +fs.dataset.q; const q = QUIZ[id][qi];
    const show = (v) => { const fb = fs.querySelector('[data-fb]'); fb.textContent = v === q.ok ? 'Exact.' : `Pas tout à fait : la bonne réponse est « ${q.a[q.ok]} ».`; fb.style.color = v === q.ok ? 'var(--ok)' : 'var(--warn)'; };
    if (p.quiz[`${id}:${qi}`] !== undefined) show(p.quiz[`${id}:${qi}`]);
    fs.querySelectorAll('input').forEach((inp) => inp.onchange = async () => { const v = +inp.value; show(v); const pr = await getProgress(); pr.quiz[`${id}:${qi}`] = v; await setProgress(pr); });
  });
  main.querySelectorAll('[data-photo-ref]').forEach((el) => hydrateRef(el));
  bindRefUploads(main);
}

function chapterBody(id) {
  switch (id) {
    case 'introduction': return html`<p class="lede">${G.INTRO.text}</p>${tbl(['Notion', 'Définition'], G.INTRO.definitions)}<p>${G.INTRO.closing}</p>
      <h2>Ce que vous apprendrez</h2><p>Reconnaître ce qui fonctionne dans une tenue, ce qui manque et ce qui peut être amélioré ; composer à partir de vos propres vêtements ; décider vite et bien selon l'occasion et la météo.</p>`;
    case 'ecoles': return html`<p>${TRADITIONS_NOTE}</p>${tbl(['École', 'Histoire et philosophie', 'Coupes et palette', 'Matières, chaussures, accessoires', 'Atouts', 'Limites', 'Références'], TRADITIONS.map((t) => [html`<strong>${t.name}</strong>${t.heritage ? html`<br><span class="tag">héritage historique</span>` : ''}`, t.history, t.cuts, t.materials, t.pros, t.cons, t.refs || todo()]))}
      <h3>Réputation, influence et adaptation au quotidien</h3><p>Ces rubriques de l'annexe D (§2, points 9, 11 et 12) sont couvertes par les colonnes « Atouts » et « Limites » et par la grille du chapitre 4 (critères Influence et Vie quotidienne). Pour la Corée du Sud et l'Espagne, les références sont ${todo('à compléter et sourcer')}.</p>`;
    case 'italie': return html`<p class="lede">${G.ITALY_TEXT.intro}</p>${tbl(['Ville', 'Approche', 'Références'], ITALY_CITIES.map((c) => [html`<strong>${c.city}</strong>`, c.approach, c.refs]))}<p class="small muted">${G.ITALY_TEXT.regional}</p>
      <div class="grid-2"><div class="card"><h3>Sprezzatura</h3><p>${G.ITALY_TEXT.sprezzatura}</p></div><div class="card"><h3>Bella Figura</h3><p>${G.ITALY_TEXT.bellaFigura}</p></div></div>
      <h2>Quatre combinaisons signatures</h2><div class="grid-2">${ITALIAN_SIGNATURES.map((s) => html`<div class="card"><div class="swatch-bar" style="height:26px">${s.colors.map((cid) => raw(`<span style="background:${colorHex(cid)}"></span>`))}</div><h4 style="margin-top:8px">${s.name}</h4><p class="small">${s.text}</p></div>`)}</div>
      <div class="callout" style="margin-top:16px"><strong>${G.ITALY_TEXT.lesson}</strong></div>
      <h3>Comparaison et objectivité</h3><p>Comparée aux Français (simplicité, chic urbain) et aux Britanniques (structure, précision), l'école italienne se distingue par sa polyvalence décontractée. Sa première place dans la grille (chapitre 4) reflète ces critères, pas une supériorité universelle : la France pourrait arriver en tête pour la haute couture féminine, le Royaume-Uni pour le costume traditionnel.</p>
      ${refCards(['C1-01', 'C1-05'])}`;
    case 'top5-ecoles': return html`<p>${SCHOOLS_NOTE}</p>${schoolsTable(SCHOOL_CRITERIA.map((c) => c.max))}
      <h3>Pourquoi chaque critère</h3><ul class="ticks">${SCHOOL_CRITERIA.map((c) => html`<li><strong>${c.name} (${c.max}) :</strong> ${c.why}</li>`)}</ul>
      <ul class="ticks">${SCHOOLS.map((s) => html`<li><strong>${s.name} ${s.total} :</strong> ${s.summary}</li>`)}</ul>
      <a class="btn" href="#/academy/schools">Comparateur interactif (pondérations modifiables)</a>`;
    case 'styles': return html`<p>Notes E/P = élégance/polyvalence sur 10 (notes éditoriales du guide initial). Budget indicatif, pas une obligation d'achat.</p>
      <div class="grid-wide">${STYLES.map((s) => html`<a class="card card-link" href="#/academy/style/${s.id}"><div class="row-between"><span class="eyebrow">${s.origin}</span><span class="tag tag-gold">E ${fr(s.e)} · P ${fr(s.p)}</span></div><h3>${s.name}</h3><div class="row">${s.colors.map((cid) => swatch(colorHex(cid)))}</div><p class="small muted" style="margin-top:6px">${s.garments}</p></a>`)}</div>
      <h2>Styles proches : ce qui les différencie</h2>${tbl(['Styles', 'Différence'], CLOSE_STYLES.map((c) => [html`<a href="#/academy/style/${c.a}">${STYLE_BY_ID[c.a].name}</a> / <a href="#/academy/style/${c.b}">${STYLE_BY_ID[c.b].name}</a>`, c.diff]))}`;
    case 'specialistes': return html`${tbl(['Référence', 'Approche pédagogique (synthèse, pas citation)'], SPECIALISTS)}
      <h2>Priorités éditoriales (sur 10)</h2>${PRIORITIES.map(([n, v]) => html`<div class="bar-row"><span>${n}</span><div class="bar-track" aria-hidden="true"><span style="width:${raw(v * 10)}%"></span></div><span class="num">${fr(v)}</span></div>`)}
      <p class="small muted">Ces notes ne sont pas une enquête statistique. GQ, Permanent Style, The Rake et autres publications servent à documenter les principes, sans prétendre qu'une majorité de spécialistes a voté.</p>
      <h2>Distinguer</h2>${tbl(['Catégorie', 'Exemples'], PRINCIPLE_CLASSES.map((p) => [p.name, p.items]))}
      <h2>Sources de formation et culture vestimentaire</h2>${tbl(['Source', 'Utilité', 'Lien'], G.SOURCES.map(([n, url, u]) => [n, u, html`<a href="${url}" target="_blank" rel="noopener noreferrer">${new URL(url).hostname} ${icon('external')}</a>`]))}<p class="small muted">${G.SOURCES_NOTE}</p>`;
    case 'occasions': return html`<ul class="ticks">${OCCASION_NOTES.map((n) => html`<li>${n}</li>`)}</ul>
      ${tbl(['Occasion', 'Italien', 'Classique international', 'Moderne décontracté'], OCCASIONS.map((o) => [html`<strong>${o.name}</strong>`, ...o.outfits]))}
      <p class="small muted">Chaque tenue se complète dans l'application par la veste, le manteau si nécessaire, les chaussures, la ceinture et les accessoires selon la météo réelle : utilisez le <a href="#/today">styliste du jour</a> avec vos pièces.</p>
      <h3>Dix références visuelles prioritaires (briefs C2)</h3><ul class="ticks">${PRIORITY_VISUALS.map((v) => html`<li>${v} ${todo('photo à sélectionner')}</li>`)}</ul>`;
    case 'masculin': return html`${tbl(['Pièce', 'Coupe, matière et conseils'], G.MENSWEAR.map(([a, b]) => [html`<strong>${a}</strong>`, b]))}<p>${G.MENSWEAR_NOTE}</p>
      <h2>Banal ou élégant : mêmes pièces, autre résultat</h2>${tbl(['Tenue banale', 'Tenue élégante', 'Pourquoi'], G.BANAL_VS_ELEGANT.map((r) => [r.banal, r.elegant, r.why]))}`;
    case 'morphologie': return html`<p class="lede">${G.MORPHO_INTRO}</p>${tbl(['Élément', 'Point de départ'], G.MORPHO)}
      <h2>Schéma : longueur du haut et taille visuelle</h2><p class="small muted">Deux silhouettes de même taille. Il s'agit d'un haut casual, pas d'une règle pour veste de costume.</p>${proportionSchema()}
      <h2>Trois ourlets</h2>${hemSchema()}
      <h2>Trois silhouettes qui allongent</h2><div class="grid-3">${[['Camaïeu beige', '#C9B79C', '#BFA98A', '#76583D'], ['Marine ton sur ton', '#2B3F5C', '#22344E', '#38271E'], ['Chemise rentrée, taille structurée', '#FAFAF7', '#777C84', '#563B2E']].map(([n, t, b, s]) => html`<div class="card"><div class="mannequin-wrap">${mannequinSVG({ top: t, pants: b, shoe: s, belt: n.includes('rentrée') ? '#563B2E' : null, label: `Schéma : ${n}` })}</div><p class="small" style="text-align:center;margin-top:6px">${n}</p></div>`)}</div>
      <ul class="ticks">${G.MORPHO_TIPS.map((t) => html`<li>${t}</li>`)}</ul>
      <div class="callout">Mesures à vérifier avant tout achat : ${G.MEASURES_TO_CHECK.join(' ; ')}. Le profil 1,63 m ne fixe automatiquement aucune taille commerciale.</div>`;
    case 'couleurs': return html`<div class="grid-wide">${MAIN_COLORS.map((c) => html`<div class="card"><div class="row">${swatch(c.hex, c.name, 'swatch-lg')}<div><strong>${c.name}</strong><div class="mono small muted">${c.hex}</div></div></div><p class="small" style="margin-top:8px"><strong>Associations :</strong> ${c.associations}. <strong>Vigilance :</strong> ${c.vigilance}.</p></div>`)}</div>
      <h2>Cinq règles</h2>${tbl(['Règle', 'Principe'], COLOR_RULES.map((r) => [r.title, r.text]))}<p class="small muted">${FACE_COLOR_NOTE}</p>
      <h2>20 palettes intemporelles</h2>${tbl(['N°', 'Palette', 'Couleurs', 'Note /10'], PALETTES_20.map((p) => [p.n, p.name, html`<span class="row" style="gap:3px">${p.hex.map((h) => swatch(h))}</span>`, fr(p.note)]), { num: [0, 3] })}
      <a class="btn btn-primary" href="#/colors">Ouvrir le générateur interactif</a>`;
    case 'feminin': return html`<p class="lede">${G.WOMEN_INTRO}</p>${tbl(['Style', 'Élégance /10', 'Tenue et raison visuelle'], G.WOMEN_STYLES.map(([a, b, c]) => [a, fr(b), c]), { num: [1] })}
      <h2>Associations</h2><ul class="ticks">${G.WOMEN_COMBOS.map((c) => html`<li>${c}</li>`)}</ul><p>${G.WOMEN_NOTE}</p>
      <p class="small">Robes, jupes, chemisiers, sacs et bijoux : rubriques détaillées de l'annexe D §9 ${todo('à approfondir avec photos sourcées')} — voir les briefs « Femme » de la photothèque.</p>`;
    case 'enfants': return html`<p class="lede">${G.KIDS_INTRO}</p>${tbl(['Occasion', 'Garçon', 'Fille'], G.KIDS)}
      <p class="small muted">Profils enfants : traitement local privilégié, pas de reconnaissance faciale, pas de partage public, pas de transfert photo vers l'IA par défaut.</p>
      ${galleryLinks(GALLERIES.filter((g) => g[0].startsWith('Jacadi')))}`;
    case 'accessible': return html`<p class="lede">${G.ACCESSIBLE_INTRO}</p>${tbl(['Pièce', 'Budget indicatif (non vérifié produit par produit)'], G.BUDGETS.map(([a, b]) => [a, b]))}
      ${tbl(['Gamme', 'Marques'], G.BRAND_TIERS)}<p>${G.QUALITY_CHECKS}</p>
      <h2>Ce qui compte plus que le prix</h2><div class="chips">${G.PRICE_FACTORS.map((f) => html`<span class="tag">${f}</span>`)}</div>`;
    case 'capsule': return html`<p>${CAPSULE_NOTE}</p>${tbl(['ID', 'Pièce', 'Matière', 'Saison', 'Budget', 'Priorité'], CAPSULE.map((c) => [c.id, html`${swatch(colorHex(c.color))} ${c.name}`, c.material, c.season, `${c.budget[0]}–${c.budget[1]} €`, c.priority]), { num: [0] })}
      <h2>30 modèles de tenues</h2>${tbl(['N°', 'Nom', 'Pièces'], TEMPLATES.map((t) => [t.n, t.name, t.ids.map((i) => CAPSULE.find((c) => c.id === i).name).join(', ') + (t.note ? ` — ${t.note}` : '')]), { num: [0] })}
      <a class="btn btn-primary" href="#/capsule">Ma capsule interactive</a>`;
    case 'erreurs': return html`${tbl(['Erreur', 'Correction'], G.ERRORS.map(([e, c], i) => [`${i + 1}. ${e}`, c]))}<p>${G.ERRORS_NOTE}</p>
      <h2>Comparaison visuelle : l'ourlet</h2>${hemSchema()}`;
    case 'saisons': return html`${tbl(['Saison', 'Matières, couleurs', 'Quotidien', 'Professionnel', 'Décontracté', 'Habillé'], G.SEASONS.map((s) => [html`<strong>${s.name}</strong>`, html`${s.materials} ; ${s.colorsText}`, s.daily, s.pro, s.casual, s.dressy]))}<p>${G.SEASONS_NOTE}</p>`;
    case 'top5-occasions': return html`${tbl(['Catégorie', '1', '2', '3', '4', '5'], TOP5_BY_OCCASION.map(([cat, list]) => [html`<strong>${cat}</strong>`, ...list.map(([s, n]) => `${s} ${fr(n)}`)]))}
      <p>Ces classements n'ont pas vocation à imposer un style unique. La pertinence varie selon activité, secteur professionnel, météo, préférence et dress code : un style excellent pour un mariage (Sartorial) est peu polyvalent au quotidien (polyvalence 7,5/10).</p>`;
    case 'photos': return html`<p>Les photographies réelles sont référencées avec leur source originale. Une URL d'image publique et un crédit ne constituent pas une autorisation de republication : par défaut, l'application affiche une carte texte et un lien vers la publication originale.</p>
      <a class="btn btn-primary" href="#/academy/photos">Ouvrir la photothèque complète</a>${refCards(PHOTOS.slice(0, 3).map((p) => p.id))}`;
    case 'mon-style': return html`<p>Proposition de mélange créatif (non scientifique), modifiable dans votre <a href="#/profile">profil</a> :</p>
      <div class="card">${IDENTITY_MIX.map((m) => html`<div class="bar-row"><span>${m.name}</span><div class="bar-track" aria-hidden="true"><span style="width:${raw(m.pct * 2)}%"></span></div><span class="num">${m.pct} %</span></div>`)}</div>
      <h2>Six tenues signatures</h2><div class="grid-3">${SIGNATURE_OUTFITS.map((s) => html`<div class="card"><div class="eyebrow">${s.n}</div><h4>${s.name}</h4><div class="swatch-bar" style="height:20px">${s.colors.map((cid) => raw(`<span style="background:${colorHex(cid)}"></span>`))}</div><p class="small" style="margin-top:6px">${s.text}</p></div>`)}</div>
      <h2>Grille d'évaluation de mes tenues</h2>${tbl(['Critère', 'Points'], [...G.GRID.map((c) => [c.name, c.max]), [html`<strong>Total</strong>`, html`<strong>100</strong>`]], { num: [1] })}
      ${tbl(['Note /10', 'Interprétation de la tenue (pas de la personne)'], G.GRID_SCALE)}<p>${G.GRID_NOTE}</p>
      <a class="btn" href="#/analysis">Analyser une tenue</a>`;
    case 'conclusion': return html`${tbl(['Question', 'Réponse éditoriale'], G.CONCLUSION_QA)}
      <h2>Les dix commandements</h2><ol>${G.COMMANDMENTS.map((c) => html`<li style="margin-bottom:6px;font-family:var(--serif);font-size:19px">${c}</li>`)}</ol>
      <p>${G.CONCLUSION_TEXT}</p><blockquote class="hero" style="margin:20px 0"><p class="serif-italic" style="font-size:24px;margin:0">${G.CONCLUSION_QUOTE}</p></blockquote>
      <h2>Réponses aux dix questions finales</h2>${tbl(['Question', 'Réponse'], G.D20_ANSWERS)}`;
    default: return '';
  }
}

function schoolsTable(weights, sortKey = 'total') {
  const rows = SCHOOLS.map((s) => {
    const recalculated = Math.round(SCHOOL_CRITERIA.reduce((a, c, i) => a + (s.scores[c.id] / c.max) * weights[i], 0) / weights.reduce((a, b) => a + b, 0) * 100 * 10) / 10;
    return { s, recalculated };
  }).sort((a, b) => (sortKey === 'recalc' ? b.recalculated - a.recalculated : sortKey === 'total' ? b.s.total - a.s.total : b.s.scores[sortKey] - a.s.scores[sortKey]));
  return html`<div class="table-wrap"><table><thead><tr><th>Critère</th><th class="num">Max</th>${rows.map((r) => html`<th class="num">${r.s.name}</th>`)}</tr></thead><tbody>
    ${SCHOOL_CRITERIA.map((c) => html`<tr><td><button class="sort" data-sort="${c.id}" title="Trier par ce critère">${c.name}</button></td><td class="num">${c.max}</td>${rows.map((r) => html`<td class="num">${r.s.scores[c.id]}</td>`)}</tr>`)}
    <tr><td><button class="sort" data-sort="total"><strong>Note historique (guide)</strong></button></td><td class="num">100</td>${rows.map((r) => html`<td class="num"><strong>${r.s.total}</strong></td>`)}</tr>
    <tr><td><button class="sort" data-sort="recalc">Note recalculée (vos pondérations)</button></td><td class="num">100</td>${rows.map((r) => html`<td class="num">${fr(r.recalculated)}</td>`)}</tr>
  </tbody></table></div>`;
}

async function renderSchools(main) {
  const weights = SCHOOL_CRITERIA.map((c) => c.max);
  let sortKey = 'total';
  setHTML(main, html`<a href="#/academy" class="small">← Académie</a>
    <div class="page-head" style="margin-top:8px"><div class="eyebrow">Comparateur interactif</div><h1>Les cinq écoles</h1><p class="lede">Modifiez les pondérations : la note recalculée s'affiche à côté de la note historique du guide, qui n'est jamais écrasée.</p></div>
    <div class="grid-2" style="align-items:start"><div class="card"><h3>Pondérations</h3>${SCHOOL_CRITERIA.map((c, i) => html`<div class="field"><label for="w${i}">${c.name} : <output id="ow${i}">${weights[i]}</output> (guide : ${c.max})</label><input type="range" id="w${i}" min="0" max="30" value="${weights[i]}" data-w="${i}"></div>`)}<button class="btn btn-sm" id="wreset">Rétablir les pondérations du guide</button></div>
      <div><div id="stable"></div><div class="callout small">${SCHOOLS_NOTE}</div></div></div>`);
  const draw = () => {
    setHTML(main.querySelector('#stable'), schoolsTable(weights, sortKey));
    main.querySelectorAll('[data-sort]').forEach((b) => b.onclick = () => { sortKey = b.dataset.sort; draw(); });
  };
  main.querySelectorAll('[data-w]').forEach((inp) => inp.oninput = () => { weights[+inp.dataset.w] = +inp.value; main.querySelector(`#ow${inp.dataset.w}`).textContent = inp.value; draw(); });
  main.querySelector('#wreset').onclick = () => navigate('#/academy/schools');
  draw();
}

// ------------------------------------------------------------- Fiche style
async function renderStyle(main, id) {
  const s = STYLE_BY_ID[id];
  if (!s) { setHTML(main, emptyState('Style introuvable', '', html`<a class="btn" href="#/academy/ch/styles">Les 15 styles</a>`)); return; }
  const p = await getProgress();
  const isFav = p.favorites.includes(id);
  const close = CLOSE_STYLES.filter((c) => c.a === id || c.b === id);
  const brief = STYLE_PHOTO_BRIEFS[id];
  const v = (x) => (x === null || x === undefined ? todo() : x);
  setHTML(main, html`<a href="#/academy/ch/styles" class="small">← Les 15 styles</a>
    <div class="page-head" style="margin-top:8px"><div class="eyebrow">${s.fr}</div><h1>${s.name}</h1>
      <div class="row"><span class="tag tag-gold">Élégance ${fr(s.e)}/10</span><span class="tag tag-gold">Polyvalence ${fr(s.p)}/10</span><span class="tag">notes éditoriales du guide</span><button class="btn btn-sm" id="fav">${icon('heart', { filled: isFav })} ${isFav ? 'Favori' : 'Ajouter aux favoris'}</button></div></div>
    <div class="grid-2" style="align-items:start">
      <div class="card"><dl class="small" style="display:grid;grid-template-columns:auto 1fr;gap:8px 14px;margin:0">
        ${[['Définition', s.definition], ['Origine', s.origin], ['Philosophie', s.philosophy], ['Formalité', s.formality], ['Vêtements', s.garments], ['Couleurs', html`${s.colors.map((c) => swatch(colorHex(c)))} ${s.colorsText}`], ['Matières', s.materials], ['Chaussures', s.shoes], ['Accessoires', s.accessories], ['Occasions', s.occasions], ['Erreurs à éviter', s.mistakes], ['Budget', s.budget], ['Créateurs / références', s.creators]].map(([k, val]) => html`<dt class="muted">${k}</dt><dd style="margin:0">${v(val)}</dd>`)}
      </dl></div>
      <div><div class="mannequin-wrap">${mannequinSVG({ top: colorHex(s.colors[1] || s.colors[0]), pants: colorHex(s.colors[0]), shoe: '#563B2E', jacket: s.modeAffinity === 'classic' ? colorHex(s.colors[0] === 'navy' ? 'navy' : 'charcoal') : null, label: `Schéma de palette ${s.name}` })}</div><div class="schema-label">Schéma de palette — pas une photographie</div></div>
    </div>
    ${close.length ? html`<h2>Styles proches</h2>${tbl(['Comparer avec', 'Différence'], close.map((c) => { const other = c.a === id ? c.b : c.a; return [html`<a href="#/academy/style/${other}">${STYLE_BY_ID[other].name}</a>`, c.diff]; }))}` : ''}
    <h2>Références photographiques</h2>
    ${brief?.photos?.length ? refCards(brief.photos) : html`<div class="callout callout-warn">Aucune photographie validée pour ce style à ce jour : le lot de références n'est pas complet. Brief de recherche ci-dessous.</div>`}
    ${brief ? html`<div class="card" style="margin-top:14px"><div class="eyebrow">Brief C2 · statut needs_review</div><p><strong>Tenue cible :</strong> ${brief.brief}</p><p class="small">Liens d'origine du guide (non revérifiés individuellement) :</p><ul class="ticks small">${brief.links.map((l) => html`<li><a href="${l}" target="_blank" rel="noopener noreferrer">${new URL(l).hostname}</a></li>`)}</ul></div>` : ''}
    <div class="btn-row" style="margin-top:16px"><a class="btn" href="#/colors">Essayer la palette</a><a class="btn" href="#/today">Styliste du jour</a></div>`);
  main.querySelector('#fav').onclick = async () => { const q = await getProgress(); q.favorites = q.favorites.includes(id) ? q.favorites.filter((f) => f !== id) : [...q.favorites, id]; await setProgress(q); navigate(`#/academy/style/${id}`); };
  main.querySelectorAll('[data-photo-ref]').forEach((el) => hydrateRef(el));
  bindRefUploads(main);
}

// ------------------------------------------------------------- Photothèque
function refCards(ids) {
  return html`<div class="grid-wide" style="margin-top:12px">${ids.map((pid2) => PHOTO_BY_ID[pid2]).filter(Boolean).map((ph) => html`<article class="card ref-card">
    <div class="ref-frame" data-photo-ref="${ph.id}" role="img" aria-label="${ph.alt}">
      <span class="eyebrow">Photographie réelle · ${ph.id}</span><span class="serif-italic" style="font-size:18px">${ph.alt}</span>
      <span class="tag tag-warn">${RIGHTS_LABELS[ph.rights]}</span>
      <a class="btn btn-sm" href="${ph.sourcePageUrl}" target="_blank" rel="noopener noreferrer">Voir la photo sur la source ${icon('external')}</a>
    </div>
    <h4>${ph.title}</h4>
    <p class="small muted">Source : <a href="${ph.sourcePageUrl}" target="_blank" rel="noopener noreferrer">${ph.sourceLabel}</a> · Crédit : ${ph.credit} · photographe : ${ph.photographer || 'non identifié'} · vérifiée le ${ph.verifiedAt}</p>
    <p class="small"><strong>Visible :</strong> ${ph.visible}</p><p class="small"><strong>Analyse :</strong> ${ph.analysis}</p><p class="small"><strong>Version accessible :</strong> ${ph.accessibleAlternative}</p>
    ${ph.counterpoint ? html`<p class="small callout callout-warn">Contrepoint : ne pas classer automatiquement comme élégance italienne classique.</p>` : ''}
    <div class="btn-row"><label class="btn btn-sm btn-ghost" for="up-${ph.id}">Fournir une image dont je détiens les droits</label><input type="file" id="up-${ph.id}" class="sr-only" accept="image/*" data-refupload="${ph.id}"></div>
  </article>`)}</div>`;
}
async function hydrateRef(el) {
  const own = await store.repo.get('photos', `ref_${el.dataset.photoRef}`);
  if (!own) return;
  const url = URL.createObjectURL(own.thumb || own.blob);
  setHTML(el, html`<img src="${url}" alt="${PHOTO_BY_ID[el.dataset.photoRef]?.alt || ''} (image fournie par l'utilisateur)"><span class="tag" style="position:absolute">Image fournie par l'utilisateur</span>`);
  el.style.position = 'relative'; el.style.padding = '0';
}
function bindRefUploads(root) {
  root.querySelectorAll('[data-refupload]').forEach((inp) => inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    if (!confirm('Confirmez-vous détenir les droits sur cette image ? Elle restera privée sur cet appareil.')) return;
    try {
      await checkImageFile(f); const out = await processImage(await loadBitmap(f));
      await store.repo.put('photos', { id: `ref_${inp.dataset.refupload}`, ownerId: 'reference', blob: out.blob, thumb: out.thumbBlob, mime: 'image/jpeg', rights: 'user_owned', private: true, refFor: inp.dataset.refupload, uploadedAt: new Date().toISOString() });
      toast('Image enregistrée (droits : fournie par l\'utilisateur)');
      hydrateRef(root.querySelector(`[data-photo-ref="${inp.dataset.refupload}"]`));
    } catch (e) { toast(e.message); }
  });
}
const galleryLinks = (list) => tbl(['Référence', 'Usage', 'Lien'], list.map(([n, url, u]) => [n, u, html`<a href="${url}" target="_blank" rel="noopener noreferrer">Ouvrir ${icon('external')}</a>`]));

async function renderPhotos(main) {
  const covered = STYLES.filter((s) => STYLE_PHOTO_BRIEFS[s.id]?.photos?.length).length;
  setHTML(main, html`<a href="#/academy" class="small">← Académie</a>
    <div class="page-head" style="margin-top:8px"><div class="eyebrow">Partie C</div><h1>Photothèque et sources</h1>
    <p class="lede">Neuf photographies réelles retrouvées (C1), vérifiées visuellement le 24 novembre 2026. Elles ne constituent pas une licence d'exploitation : affichage par carte et lien original. Aucune image générée n'est présentée comme photo.</p></div>
    <div class="callout callout-warn">Lot incomplet : ${covered}/15 styles disposent d'au moins une référence validée. Les autres restent des briefs en attente.</div>
    ${refCards(PHOTOS.map((p) => p.id))}
    <h2>Galeries vérifiées ou retrouvées (C2)</h2>${galleryLinks(GALLERIES)}
    <h2>Tableau des contenus à compléter</h2>
    ${tbl(['Style', 'Photos validées', 'Statut', 'Brief'], STYLES.map((s) => { const b = STYLE_PHOTO_BRIEFS[s.id]; return [html`<a href="#/academy/style/${s.id}">${s.name}</a>`, b?.photos?.join(', ') || '—', b?.photos?.length ? html`<span class="tag tag-ok">référencé</span>` : html`<span class="tag tag-warn">needs_review</span>`, b?.brief || '']; }))}
    <h3>Requêtes photographiques complémentaires (briefs, pas des photos)</h3>${tbl(['Groupe', 'Requêtes'], PHOTO_QUERIES)}
    <h3>Checklist de provenance</h3><div class="chips">${PHOTO_CHECKLIST.map((c) => html`<span class="tag">${c}</span>`)}</div>
    <p class="small muted" style="margin-top:12px">Ne pas contourner un paywall, une restriction d'accès, robots.txt ou une politique de site. Revalidation périodique recommandée ; en cas de lien mort, choisir une publication originale alternative et documenter le remplacement.</p>`);
  main.querySelectorAll('[data-photo-ref]').forEach((el) => hydrateRef(el));
  bindRefUploads(main);
  void uid;
}

// ------------------------------------------------------------- Recherche plein texte
let searchIndex = null;
function buildIndex() {
  const strip = (h) => { const d = document.createElement('div'); d.innerHTML = String(h); return d.textContent.replace(/\s+/g, ' '); };
  searchIndex = [
    ...CHAPTERS.map((c) => ({ href: `#/academy/ch/${c.id}`, title: `${c.n}. ${c.title}`, kind: 'Chapitre', text: `${c.title} ${c.summary} ${strip(chapterBody(c.id))}` })),
    ...STYLES.map((s) => ({ href: `#/academy/style/${s.id}`, title: s.name, kind: 'Style', text: Object.values(s).join(' ') })),
    ...PHOTOS.map((p) => ({ href: '#/academy/photos', title: p.title, kind: 'Photo', text: `${p.title} ${p.visible} ${p.analysis} ${p.accessibleAlternative}` })),
  ];
}
function renderSearch(main, q) {
  if (!searchIndex) buildIndex();
  const terms = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean);
  const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const hits = searchIndex.map((e) => {
    const t = norm(e.text);
    const ok = terms.every((term) => t.includes(term));
    if (!ok) return null;
    const i = t.indexOf(terms[0]);
    return { ...e, snippet: e.text.slice(Math.max(0, i - 70), i + 140), score: terms.reduce((a, term) => a + t.split(term).length - 1, 0) };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
  setHTML(main, html`<a href="#/academy" class="small">← Académie</a>
    <div class="page-head" style="margin-top:8px"><h1>Recherche</h1></div>
    <form class="row" id="sform" role="search" style="flex-wrap:nowrap"><label for="sq" class="sr-only">Rechercher</label><input id="sq" type="search" value="${q}"><button class="btn" type="submit">${icon('search')}<span class="sr-only">Rechercher</span></button></form>
    <p class="small muted" aria-live="polite">${hits.length} résultat(s) pour « ${q} »</p>
    <div class="stack">${hits.map((h) => html`<a class="card card-link search-hit" href="${h.href}"><span class="eyebrow">${h.kind}</span><h3>${h.title}</h3><p class="small muted">…${highlight(h.snippet, q.split(/\s+/)[0])}…</p></a>`)}</div>`);
  main.querySelector('#sform').onsubmit = (e) => { e.preventDefault(); navigate(`#/academy/search?q=${encodeURIComponent(main.querySelector('#sq').value.trim())}`); };
}

// ------------------------------------------------------------- Schémas pédagogiques (SVG, identifiés comme schémas)
function proportionSchema() {
  return html`<div class="grid-2"><figure class="card" style="margin:0"><div class="mannequin-wrap">${raw(`<svg viewBox="0 0 150 260" role="img" aria-label="Schéma : haut casual trop long, taille visuelle basse"><rect width="150" height="260" rx="12" fill="#99999910"/><path d="M48 15 L62 10 Q75 29 88 10 L102 15 L128 40 L112 65 L101 56 L106 150 L44 150 L49 56 L38 65 L22 40 Z" fill="#22344E"/><path d="M46 150 L104 150 L100 223 L80 223 L75 175 L70 223 L50 223 Z" fill="#C9B79C"/><path d="M50 234 Q40 237 37 245 L69 245 L69 233 Z M81 233 L81 245 L113 245 Q110 237 100 234 Z" fill="#563B2E"/><line x1="10" y1="150" x2="140" y2="150" stroke="#C9B37E" stroke-dasharray="3 3"/></svg>`)}</div><figcaption class="small" style="text-align:center;margin-top:6px">Haut trop long : jambes visuellement raccourcies</figcaption></figure>
    <figure class="card" style="margin:0"><div class="mannequin-wrap">${raw(`<svg viewBox="0 0 150 260" role="img" aria-label="Schéma : haut proportionné, taille visuelle remontée"><rect width="150" height="260" rx="12" fill="#99999910"/><path d="M48 15 L62 10 Q75 29 88 10 L102 15 L128 40 L112 65 L101 56 L104 106 L46 106 L49 56 L38 65 L22 40 Z" fill="#22344E"/><path d="M44 108 L106 108 L100 223 L80 223 L75 150 L70 223 L50 223 Z" fill="#C9B79C"/><path d="M50 234 Q40 237 37 245 L69 245 L69 233 Z M81 233 L81 245 L113 245 Q110 237 100 234 Z" fill="#563B2E"/><line x1="10" y1="107" x2="140" y2="107" stroke="#C9B37E" stroke-dasharray="3 3"/></svg>`)}</div><figcaption class="small" style="text-align:center;margin-top:6px">Haut proportionné : taille visuelle remontée</figcaption></figure></div>`;
}
function hemSchema() {
  const leg = (y, bunch) => `<path d="M30 10 L60 10 L58 ${y} L32 ${y} Z" fill="#777C84"/>${bunch ? '<path d="M32 118 q13 6 26 0 M32 124 q13 6 26 0" stroke="#555" fill="none"/>' : ''}<path d="M26 128 Q22 131 20 138 L62 138 L62 126 Z" fill="#38271E"/>`;
  return html`<div class="grid-3">${[['Sans cassure', 'net / moderne', 118, false], ['Légère cassure', 'premier choix', 126, false], ['Trop de plis', 'moins favorable à la ligne', 130, true]].map(([n, d, y, b]) => html`<figure class="card" style="margin:0;text-align:center"><div class="mannequin-wrap">${raw(`<svg viewBox="0 0 90 145" role="img" aria-label="Schéma d'ourlet : ${n}">${leg(y, b)}</svg>`)}</div><figcaption class="small"><strong>${n}</strong><br>${d}</figcaption></figure>`)}</div>`;
}
