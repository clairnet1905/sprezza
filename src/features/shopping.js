// Shopping intelligent : partir du dressing, requêtes fiables, annuaire, liste d'envies, comparaison, budget.
import { html, raw, setHTML, safeUrl } from '../lib/html.js';
import { icon, toast, options, copyText, emptyState, confirmDialog, fmtEUR, fmtDate, openModal, readForm } from '../components/ui.js';
import { store, pid, garments as loadGarments, wishlist as loadWishlist } from '../state.js';
import { uid } from '../repositories/db.js';
import { RETAILERS, TIER_NAMES, CAT_NAMES, RETAILERS_NOTE, hostOf, priceCompareUrl, QUICK_SHOPS, SEARCH_VERIFIED_AT } from '../data/retailers.js';
import { ALL_COLORS, COLOR_BY_ID } from '../data/colors.js';
import { CATEGORIES, FITS } from '../data/taxonomy.js';
import { buildQuery, siteSearchUrl, shoppingUtility, totalCost, capsuleProgress, capsuleState } from '../domain/wardrobe-logic.js';
import { outfitsUnlocked } from '../domain/recommend.js';
import { navigate } from '../app.js';
import { GARMENT_COLORS } from '../data/colors.js';
import { SUB_INFO } from '../data/taxonomy.js';
import { swatch } from '../components/ui.js';
import { colorHex } from '../domain/colors.js';
import { piecesList } from './shared.js';

export async function render(main, params, query) {
  const tab = params[0] || 'search';
  setHTML(main, html`<div class="page-head"><div class="eyebrow">Shopping intelligent</div><h1>Shopping</h1>
    <p class="lede">Le point de départ est votre dressing : une pièce à acheter doit apporter une utilité claire, idéalement au moins trois tenues supplémentaires. Retouche, seconde main ou pièce existante d'abord.</p></div>
    <nav class="tabs" aria-label="Sections shopping">${[['check', 'Avant d\'acheter'], ['search', 'Rechercher'], ['wishlist', 'Liste d\'envies'], ['directory', 'Annuaire'], ['history', 'Achats']].map(([id, l]) => html`<a href="#/shopping/${id}" ${tab === id ? raw('aria-current="page"') : ''}>${l}</a>`)}</nav><div id="stab"></div>`);
  const box = main.querySelector('#stab');
  if (tab === 'wishlist') return renderWishlist(box, params[1]);
  if (tab === 'directory') return renderDirectory(box);
  if (tab === 'history') return renderHistory(box);
  if (tab === 'check') return renderCheck(box, query);
  return renderSearch(box, query);
}

const genderOf = () => (store.profile.kind === 'woman' ? 'femme' : store.profile.kind === 'child' ? 'enfant' : 'homme');
/** Requête courte pour les moteurs internes des boutiques (pièce + couleur + matière) : les budgets et tailles y nuisent. */
export function shortQuery({ category = '', color = '', material = '' }) {
  const c = color && COLOR_BY_ID[color] ? COLOR_BY_ID[color].name.toLowerCase() : '';
  const seen = new Set();
  return [category, c, material].join(' ').split(/\s+/).filter((w) => w && !seen.has(w.toLowerCase()) && seen.add(w.toLowerCase())).join(' ');
}
export function shopSearchUrl(r, q, g) { return r.search ? r.search(q, g) : siteSearchUrl(r.url, q); }
function quickShopButtons(sq, g, full) {
  return html`<a class="btn btn-sm btn-gold" href="${priceCompareUrl(`${sq} ${g}`)}" target="_blank" rel="noopener noreferrer">${icon('search')} Comparer les prix</a>${QUICK_SHOPS.map((n) => RETAILERS.find((r) => r.name === n)).filter(Boolean).map((r) => html`<a class="btn btn-sm" href="${shopSearchUrl(r, sq, g)}" target="_blank" rel="noopener noreferrer">${r.name}</a>`)}`;
}
function relevantRetailers({ budgetMax, category = '', kind = 'main' }) {
  const cat = category.toLowerCase();
  const audience = kind === 'woman' ? 'f' : kind === 'child' ? 'e' : 'h';
  const tiers = !budgetMax ? [1, 2, 3, 4] : budgetMax <= 60 ? [1, 2] : budgetMax <= 150 ? [1, 2, 3] : budgetMax <= 300 ? [2, 3, 4] : [3, 4, 5];
  const shoes = /chauss|mocassin|derb|richelieu|chelsea|botti|basket|sneaker/.test(cat);
  const tailoring = /costume|blazer|veste|pantalon habill|flanelle|cravate/.test(cat);
  const shirts = /chemise|oxford/.test(cat);
  return RETAILERS.map((r) => {
    let s = 0;
    if (!r.cats.includes(audience)) s -= 10;
    if (tiers.includes(r.tier)) s += 3; else s -= 2;
    if (shoes) s += r.cats.includes('s') ? 4 : -1;
    if (tailoring && r.cats.includes('t')) s += 3;
    if (shirts && /chemise/i.test(r.why)) s += 2;
    if (r.cats.includes('m')) s += 1;
    if (r.tier === 5) s -= 1; // le luxe sert d'inspiration, pas de nécessité d'achat
    return { r, s };
  }).filter((x) => x.s > 0 && !x.r.cats.includes('o')).sort((a, b) => b.s - a.s || a.r.name.localeCompare(b.r.name)).slice(0, 6).map((x) => x.r);
}

async function renderSearch(box, query) {
  const all = await loadGarments();
  const cap = await store.repo.kvGet(`capsule:${pid()}`, { level: 1, items: {} });
  const missing = capsuleProgress(cap.level || 1, capsuleState(cap.items || {}, all)).missing;
  const pre = query?.get('q') || '';
  const f = { category: pre, color: '', fit: '', material: '', budgetMin: '', budgetMax: '', size: '', season: '' };
  setHTML(box, html`<div class="grid-2" style="align-items:start">
    <form class="card" id="qform"><h3>Pièce recherchée</h3><div class="form-grid">
      <div class="field span-2"><label for="qcat">Pièce</label><input id="qcat" name="category" type="text" value="${pre}" placeholder="ex. pantalon"></div>
      <div class="field"><label for="qcolor">Couleur</label><select id="qcolor" name="color">${options(ALL_COLORS.map((c) => [c.id, c.name]), '', { empty: 'Indifférente' })}</select></div>
      <div class="field"><label for="qfit">Coupe</label><input id="qfit" name="fit" type="text" list="fits" placeholder="ex. droite légèrement fuselée"><datalist id="fits">${FITS.map(([, l]) => html`<option value="${l.toLowerCase()}">`)}<option value="taille mi-haute coupe droite légèrement fuselée"></datalist></div>
      <div class="field"><label for="qmat">Matière</label><input id="qmat" name="material" type="text" placeholder="ex. coton"></div>
      <div class="field"><label for="qsize">Taille / mesures</label><input id="qsize" name="size" type="text" placeholder="ex. 40 ou entrejambe 76"></div>
      <div class="field"><label for="qmin">Budget min (€ TTC)</label><input id="qmin" name="budgetMin" type="number" min="0"></div>
      <div class="field"><label for="qmax">Budget max (€ TTC)</label><input id="qmax" name="budgetMax" type="number" min="0"></div>
      <div class="field span-2"><label for="qseason">Saison</label><input id="qseason" name="season" type="text" placeholder="ex. mi-saison"></div>
    </div>
    <div class="callout" id="qout" aria-live="polite"></div>
    <div class="btn-row" style="margin-top:10px"><button class="btn btn-sm" type="button" id="qcopy">${icon('copy')} Copier la requête</button><button class="btn btn-sm btn-primary" type="button" id="qwish">${icon('heart')} Ajouter à ma liste d'envies</button><button class="btn btn-sm" type="button" id="qutil">Combien de tenues en plus ?</button></div>
    <p class="small" id="qutilout" aria-live="polite"></p></form>
    <div class="stack"><div class="card"><h3>Avant d'acheter</h3><ul class="ticks small"><li>Une retouche peut-elle suffire ? (ourlet, manches, taille)</li><li>Une pièce existante remplit-elle déjà ce rôle ?</li><li>Existe-t-elle en seconde main (Vinted, Vestiaire Collective) ?</li><li>Vérifier composition, coutures, tombé, poches qui ne tirent pas.</li></ul></div>
      ${missing.length ? html`<div class="card"><h3>Pièces capsule manquantes</h3><div class="chips">${missing.slice(0, 10).map((m) => html`<button class="chip" data-miss="${m.id}">${m.name}</button>`)}</div></div>` : ''}</div>
  </div>
  <section class="card card-accent" style="margin-top:18px"><h2 style="margin-top:0">Chercher partout en un geste</h2>
    <p class="small muted">Recherche courte <span id="shortq" class="mono"></span> ouverte directement dans chaque boutique. Le comparateur de prix montre les offres de plusieurs sites, triables par prix.</p>
    <div class="btn-row" id="quickshops"></div></section>
  <h2>Boutiques pertinentes</h2><p class="small muted">${RETAILERS_NOTE} Recherche directe pour les boutiques dont l'adresse de recherche a été vérifiée (${SEARCH_VERIFIED_AT}) ; pour les autres, recherche web limitée au site. Aucun scraping, aucune fausse page de résultats, aucun prix inventé.</p>
  <div class="grid-wide" id="rlist"></div>`);
  const $ = (s) => box.querySelector(s);
  const form = $('#qform');
  const q = () => { Object.assign(f, readForm(form)); return buildQuery({ ...f, gender: store.profile.kind === 'woman' ? 'femme' : store.profile.kind === 'child' ? 'enfant' : 'homme' }); };
  const draw = () => {
    const text = q();
    $('#qout').textContent = text ? `Requête : « ${text} »` : 'Décrivez la pièce : la requête se construit automatiquement.';
    const g = genderOf(); const sq = shortQuery(f);
    $('#shortq').textContent = sq ? `« ${sq} »` : '';
    setHTML($('#quickshops'), sq ? quickShopButtons(sq, g, text) : html`<span class="small muted">Indiquez la pièce recherchée.</span>`);
    const list = relevantRetailers({ budgetMax: Number(f.budgetMax) || null, category: f.category, kind: store.profile.kind });
    const second = RETAILERS.filter((r) => r.cats.includes('o'));
    setHTML($('#rlist'), [...list, ...second].map((r) => html`<article class="card"><div class="row-between"><span class="eyebrow">${TIER_NAMES[r.tier]}</span>${r.cats.includes('o') ? html`<span class="tag tag-ok">Seconde main</span>` : ''}</div><h3>${r.name}</h3><p class="small muted">${r.why}</p>
      <div class="btn-row"><a class="btn btn-sm" href="${safeUrl(r.url)}" target="_blank" rel="noopener noreferrer">${icon('external')} Site officiel</a>${text ? html`<a class="btn btn-sm" href="${shopSearchUrl(r, shortQuery(f), genderOf())}" target="_blank" rel="noopener noreferrer">${icon('search')} ${r.search ? `Rechercher chez ${r.name}` : `Rechercher sur ${hostOf(r.url)}`}</a>` : ''}</div>
      <p class="small muted" style="margin-top:6px">Prix, stock et livraison : à vérifier sur le site.</p></article>`));
  };
  form.addEventListener('input', draw);
  $('#qcopy').onclick = () => { const t = q(); if (t) copyText(t); };
  $('#qwish').onclick = async () => {
    const t = q(); if (!f.category) { toast('Indiquez la pièce recherchée'); return; }
    const w = await store.repo.put('wishlist', { id: uid('wish'), profileId: pid(), name: f.category, query: t, color: f.color || null, budgetMax: Number(f.budgetMax) || null, material: f.material, priority: 2, status: 'wanted', candidates: [] });
    toast('Ajouté à la liste d\'envies', { action: 'Voir', onAction: () => navigate(`#/shopping/wishlist/${w.id}`) });
  };
  $('#qutil').onclick = () => {
    q();
    if (!all.length) { $('#qutilout').textContent = 'Dressing vide : impossible de calculer les tenues débloquées.'; return; }
    const cat = guessCategory(f.category);
    if (!cat) { $('#qutilout').textContent = 'Type de pièce non reconnu pour le calcul (essayez « chino », « blazer », « mocassins »…).'; return; }
    const color = COLOR_BY_ID[f.color] || COLOR_BY_ID.navy;
    const n = outfitsUnlocked({ name: f.category, ...cat, color: { id: color.id, hex: color.hex, name: color.name }, material: f.material }, all);
    $('#qutilout').textContent = `${n} tenue(s) supplémentaire(s) avec votre dressing${f.color ? '' : ' (couleur marine supposée pour le calcul)'}. ${n >= 3 ? 'Achat utile.' : 'Moins de trois tenues : envisager une alternative ou une autre couleur.'}`;
  };
  box.querySelectorAll('[data-miss]').forEach((b) => b.onclick = () => { const m = missing.find((x) => x.id === +b.dataset.miss); $('#qcat').value = m.name.toLowerCase(); $('#qmat').value = m.material.toLowerCase(); $('#qmin').value = m.budget[0]; $('#qmax').value = m.budget[1]; $('#qcolor').value = m.color; draw(); });
  draw();
}

export function guessCategory(text) {
  const t = String(text || '').toLowerCase();
  const map = [[/col roul/, 'haut', 'col-roule'], [/polo/, 'haut', 'polo'], [/chemise.*lin|lin.*chemise/, 'haut', 'chemise-lin'], [/chemise|oxford/, 'haut', 'chemise'], [/pull|mérinos|cachemire/, 'haut', 'pull'], [/tee|t-shirt/, 'haut', 'tee-shirt'], [/sweat/, 'haut', 'sweat'],
    [/chino/, 'bas', 'chino'], [/jean/, 'bas', 'jean'], [/flanelle/, 'bas', 'flanelle'], [/bermuda/, 'bas', 'bermuda'], [/pantalon/, 'bas', 'pantalon'],
    [/blazer|veste/, 'veste', 'blazer'], [/surchemise/, 'veste', 'surchemise'], [/costume/, 'veste', 'veste-costume'], [/trench/, 'manteau', 'trench'], [/manteau|caban/, 'manteau', 'manteau'],
    [/mocassin/, 'chaussures', 'mocassins'], [/derb/, 'chaussures', 'derbies'], [/richelieu/, 'chaussures', 'richelieus'], [/chelsea/, 'chaussures', 'chelsea'], [/bottine/, 'chaussures', 'bottines'], [/basket|sneaker/, 'chaussures', 'baskets'], [/ceinture/, 'ceinture', 'ceinture-cuir']];
  const m = map.find(([re]) => re.test(t));
  return m ? { category: m[1], sub: m[2] } : null;
}

async function renderWishlist(box, focusId) {
  const [list, all] = await Promise.all([loadWishlist(), loadGarments()]);
  const wanted = list.filter((w) => w.status === 'wanted').sort((a, b) => a.priority - b.priority || (a.createdAt || '').localeCompare(b.createdAt || ''));
  const profile = store.profile;
  const est = (w) => { const totals = (w.candidates || []).map(totalCost).filter((x) => x !== null); return totals.length ? Math.min(...totals) : w.budgetMax || null; };
  const total = wanted.reduce((a, w) => a + (est(w) || 0), 0);
  const unknown = wanted.filter((w) => est(w) === null).length;
  setHTML(box, html`
    <div class="grid-3"><div class="card"><div class="stat">${wanted.length}</div><div class="stat-label">envies actives</div></div>
      <div class="card"><div class="stat">${fmtEUR(total)}</div><div class="stat-label">total estimé${unknown ? ` (${unknown} sans estimation)` : ''}</div></div>
      <div class="card"><div class="stat">${profile.monthlyBudget ? fmtEUR(profile.monthlyBudget) : '—'}</div><div class="stat-label">budget mensuel facultatif (<a href="#/profile">profil</a>)</div>${profile.monthlyBudget && total > profile.monthlyBudget ? html`<p class="small" style="color:var(--warn)">Le total dépasse le budget mensuel.</p>` : ''}</div></div>
    <div class="btn-row" style="margin:14px 0"><button class="btn btn-primary" id="wadd">${icon('plus')} Ajouter une envie</button></div>
    ${wanted.length ? html`<div class="stack">${wanted.map((w) => wishCard(w, est(w), focusId === w.id))}</div>` : emptyState('Aucune envie', 'Ajoutez une pièce depuis « Rechercher » ou ici. Pas d\'achat automatique : vous gardez la main.', '')}`);
  box.querySelector('#wadd').onclick = () => editWish(null, box);
  box.querySelectorAll('[data-wact]').forEach((b) => b.onclick = async () => {
    const w = list.find((x) => x.id === b.dataset.id);
    const act = b.dataset.wact;
    if (act === 'edit') editWish(w, box);
    else if (act === 'cand') editCandidate(w, null, box);
    else if (act === 'prio') { await store.repo.put('wishlist', { ...w, priority: w.priority === 1 ? 3 : w.priority - 1 }); renderWishlist(box); }
    else if (act === 'drop') { if (await confirmDialog({ title: 'Retirer cette envie ?', message: `« ${w.name} » sera retirée de la liste (conservée dans l'historique).`, confirmLabel: 'Retirer' })) { await store.repo.put('wishlist', { ...w, status: 'dropped', droppedAt: new Date().toISOString() }); renderWishlist(box); } }
    else if (act === 'bought') purchase(w, box);
    else if (act === 'util') {
      const cat = guessCategory(w.name); const out = box.querySelector(`[data-uout="${w.id}"]`);
      if (!cat || !all.length) { out.textContent = !all.length ? 'Dressing vide.' : 'Type de pièce non reconnu.'; return; }
      const c = COLOR_BY_ID[w.color] || COLOR_BY_ID.navy;
      const n = outfitsUnlocked({ name: w.name, ...cat, color: { id: c.id, hex: c.hex, name: c.name }, material: w.material }, all);
      const best = (w.candidates || [])[0];
      const u = shoppingUtility({ unlocked: n, fitKnown: best ? !!best.size : null, price: best ? totalCost(best) : null, budgetMax: w.budgetMax, materialOk: best?.material ? true : null, shippingOk: best ? best.returnsInfo ? true : null : null });
      await store.repo.put('wishlist', { ...w, utility: { unlocked: n, score: u.score, assessedWeight: u.assessedWeight, at: new Date().toISOString() } });
      renderWishlist(box, w.id);
    }
  });
  box.querySelectorAll('[data-cedit]').forEach((b) => b.onclick = () => { const w = list.find((x) => x.id === b.dataset.w); editCandidate(w, w.candidates.find((c) => c.id === b.dataset.cedit), box); });
  box.querySelectorAll('[data-cdel]').forEach((b) => b.onclick = async () => { const w = list.find((x) => x.id === b.dataset.w); await store.repo.put('wishlist', { ...w, candidates: w.candidates.filter((c) => c.id !== b.dataset.cdel) }); renderWishlist(box, w.id); });
}

function wishCard(w, est, open) {
  const cands = w.candidates || [];
  return html`<article class="card" id="w-${w.id}"><div class="row-between"><div><span class="tag ${w.priority === 1 ? 'tag-gold' : ''}">Priorité ${w.priority}</span> ${w.utility ? html`<span class="tag">utilité ${w.utility.score ?? '—'}/100 · ${w.utility.unlocked} tenue(s)</span>` : ''}<h3 style="margin-top:6px">${w.name}</h3>
      <p class="small muted">${w.query || ''}${w.budgetMax ? ` · budget ${fmtEUR(w.budgetMax)}` : ''} · estimation ${est !== null ? fmtEUR(est) : 'inconnue'}</p></div></div>
    <div class="btn-row"><button class="btn btn-sm" data-wact="cand" data-id="${w.id}">${icon('plus')} Produit à comparer</button><button class="btn btn-sm" data-wact="util" data-id="${w.id}">Score d'utilité</button><button class="btn btn-sm" data-wact="prio" data-id="${w.id}">Changer priorité</button><button class="btn btn-sm" data-wact="edit" data-id="${w.id}">${icon('edit')}</button><button class="btn btn-sm btn-primary" data-wact="bought" data-id="${w.id}">Acheté</button><button class="btn btn-sm btn-ghost" data-wact="drop" data-id="${w.id}">Retirer</button></div>
    <div class="row small" style="gap:6px;margin-top:8px"><span class="muted">Chercher :</span>${quickShopButtons(shortQuery({ category: w.name, color: w.color, material: w.material }), genderOf())}</div>
    <p class="small muted" data-uout="${w.id}"></p>
    ${w.utility ? html`<p class="small">Score d'utilité (distinct de l'élégance) calculé sur ${w.utility.assessedWeight}/100 points connus ; critères inconnus signalés, pas supposés.</p>` : ''}
    <details class="disclosure" ${open || cands.length ? raw('open') : ''}><summary>Comparaison (${cands.length})</summary>
    ${cands.length ? html`<div class="table-wrap"><table><thead><tr><th>Produit</th><th class="num">Prix</th><th class="num">Livraison</th><th class="num">Retouches/taxes</th><th class="num">Total TTC</th><th>Retours</th><th>Taille dispo.</th><th>Vérifié</th><th></th></tr></thead><tbody>
      ${cands.map((c) => html`<tr><td>${c.url ? html`<a href="${safeUrl(c.url)}" target="_blank" rel="noopener noreferrer">${c.title}</a>` : c.title}<br><span class="small muted">${c.seller || ''}${c.secondHand ? ' · seconde main' : ''}${c.affiliate ? ' · lien affilié' : ''}</span></td>
        <td class="num">${fmtEUR(c.price)}</td><td class="num">${c.shipping !== null && c.shipping !== '' ? fmtEUR(c.shipping) : '?'}</td><td class="num">${fmtEUR((Number(c.alterations) || 0) + (Number(c.taxes) || 0))}</td><td class="num"><strong>${fmtEUR(totalCost(c))}</strong></td>
        <td class="small">${c.returnsInfo || '?'}</td><td class="small">${c.size || 'inconnue'}</td><td class="small">${c.verifiedAt ? fmtDate(c.verifiedAt) : 'à vérifier sur le site'}</td>
        <td><button class="btn btn-sm btn-ghost" data-cedit="${c.id}" data-w="${w.id}" aria-label="Modifier">${icon('edit')}</button><button class="btn btn-sm btn-ghost" data-cdel="${c.id}" data-w="${w.id}" aria-label="Supprimer">${icon('trash')}</button></td></tr>`)}</tbody></table></div>` : html`<p class="small muted">Ajoutez des produits trouvés sur les sites (saisie manuelle : titre, lien exact, prix relevé, livraison, retours). Aucune donnée n'est inventée.</p>`}
    </details></article>`;
}

function editWish(w, box) {
  openModal({ title: w ? 'Modifier l\'envie' : 'Nouvelle envie', body: html`<form id="wf"><div class="form-grid">
      <div class="field span-2"><label for="wn">Pièce *</label><input id="wn" name="name" type="text" required value="${w?.name || ''}"></div>
      <div class="field"><label for="wc">Couleur</label><select id="wc" name="color">${options(ALL_COLORS.map((c) => [c.id, c.name]), w?.color || '', { empty: 'Indifférente' })}</select></div>
      <div class="field"><label for="wb">Budget max (€)</label><input id="wb" name="budgetMax" type="number" min="0" value="${w?.budgetMax ?? ''}"></div>
      <div class="field"><label for="wm">Matière</label><input id="wm" name="material" type="text" value="${w?.material || ''}"></div>
      <div class="field"><label for="wp">Priorité</label><select id="wp" name="priority">${options([[1, '1 — haute'], [2, '2 — moyenne'], [3, '3 — basse']], w?.priority || 2)}</select></div>
      <div class="field span-2"><label for="wnotes">Notes</label><textarea id="wnotes" name="notes">${w?.notes || ''}</textarea></div></div>
      <button class="btn btn-primary" type="submit">Enregistrer</button></form>`,
  onMount(body, close) { body.querySelector('#wf').onsubmit = async (e) => { e.preventDefault(); const v = readForm(e.target); if (!v.name) return; await store.repo.put('wishlist', { ...(w || { id: uid('wish'), profileId: pid(), status: 'wanted', candidates: [] }), name: v.name, color: v.color || null, budgetMax: v.budgetMax, material: v.material, priority: Number(v.priority), notes: v.notes, query: w?.query || buildQuery({ category: v.name, color: v.color, material: v.material, budgetMax: v.budgetMax }) }); close(); renderWishlist(box); }; } });
}

function editCandidate(w, c, box) {
  openModal({ title: c ? 'Modifier le produit' : 'Produit à comparer', body: html`<p class="small muted">Saisie manuelle de données réellement relevées sur le site. Les champs inconnus restent vides et sont signalés comme « à vérifier ».</p><form id="cf"><div class="form-grid">
      <div class="field span-2"><label for="ct">Titre exact *</label><input id="ct" name="title" type="text" required value="${c?.title || ''}"></div>
      <div class="field span-2"><label for="cu">Lien produit exact</label><input id="cu" name="url" type="url" value="${c?.url || ''}" placeholder="https://"></div>
      <div class="field"><label for="cs">Vendeur</label><input id="cs" name="seller" type="text" value="${c?.seller || ''}"></div>
      <div class="field"><label for="cp">Prix TTC (€) *</label><input id="cp" name="price" type="number" min="0" step="0.01" value="${c?.price ?? ''}"></div>
      <div class="field"><label for="csh">Livraison (€)</label><input id="csh" name="shipping" type="number" min="0" step="0.01" value="${c?.shipping ?? ''}"></div>
      <div class="field"><label for="cal">Retouches (€)</label><input id="cal" name="alterations" type="number" min="0" step="0.01" value="${c?.alterations ?? ''}"></div>
      <div class="field"><label for="ctx">Taxes/droits import (€)</label><input id="ctx" name="taxes" type="number" min="0" step="0.01" value="${c?.taxes ?? ''}"></div>
      <div class="field"><label for="cr">Retours (conditions)</label><input id="cr" name="returnsInfo" type="text" value="${c?.returnsInfo || ''}" placeholder="ex. gratuits 30 j"></div>
      <div class="field"><label for="csz">Taille réellement disponible</label><input id="csz" name="size" type="text" value="${c?.size || ''}"></div>
      <div class="field"><label for="cmat">Matière (fiche produit)</label><input id="cmat" name="material" type="text" value="${c?.material || ''}"></div>
      <label class="check"><input type="checkbox" name="secondHand" ${c?.secondHand ? raw('checked') : ''}> Seconde main</label>
      <label class="check"><input type="checkbox" name="affiliate" ${c?.affiliate ? raw('checked') : ''}> Lien commercial affilié</label>
      <label class="check span-2"><input type="checkbox" name="verified" ${c?.verifiedAt ? raw('checked') : ''}> J'ai vérifié prix et disponibilité aujourd'hui</label></div>
      <p class="callout callout-danger hidden" id="cerr"></p><button class="btn btn-primary" type="submit">Enregistrer</button></form>`,
  onMount(body, close) { body.querySelector('#cf').onsubmit = async (e) => {
    e.preventDefault(); const v = readForm(e.target); const err = body.querySelector('#cerr');
    if (!v.title || v.price === null) { err.textContent = 'Titre et prix sont nécessaires.'; err.classList.remove('hidden'); return; }
    if (v.url && !/^https?:\/\//i.test(v.url)) { err.textContent = 'Lien http(s) attendu.'; err.classList.remove('hidden'); return; }
    const rec = { id: c?.id || uid('cand'), ...v, verifiedAt: v.verified ? new Date().toISOString() : null };
    delete rec.verified;
    const cands = c ? w.candidates.map((x) => (x.id === c.id ? rec : x)) : [...(w.candidates || []), rec];
    await store.repo.put('wishlist', { ...w, candidates: cands }); close(); renderWishlist(box, w.id);
  }; } });
}

function purchase(w, box) {
  openModal({ title: 'Achat effectué', body: html`<p class="small muted">Enregistrement manuel : SPREZZA n'effectue aucun achat.</p><div class="form-grid"><div class="field"><label for="pp">Prix payé (€)</label><input id="pp" type="number" min="0" step="0.01" value="${(w.candidates || [])[0] ? totalCost(w.candidates[0]) ?? '' : ''}"></div><div class="field"><label for="pd">Date</label><input id="pd" type="date" value="${new Date().toISOString().slice(0, 10)}"></div></div>
    <label class="check"><input type="checkbox" id="padd" checked> Créer la fiche dans mon dressing</label><button class="btn btn-primary" data-ok style="margin-top:10px">Enregistrer</button>`,
  onMount(body, close) { body.querySelector('[data-ok]').onclick = async () => {
    const price = Number(body.querySelector('#pp').value) || null;
    await store.repo.put('wishlist', { ...w, status: 'purchased', purchasedAt: body.querySelector('#pd').value, purchasePrice: price });
    close();
    if (body.querySelector('#padd').checked) { const cat = guessCategory(w.name); navigate(`#/wardrobe/new?name=${encodeURIComponent(w.name.replace(/\s*\(remplace .*\)$/, ''))}${cat ? `&category=${cat.category}` : ''}${price ? `&price=${price}` : ''}&wish=${w.id}${w.replacesId ? `&replaces=${w.replacesId}` : ''}`); }
    else renderWishlist(box);
  }; } });
}

function renderDirectory(box) {
  const st = { cat: '', tier: '', q: '' };
  setHTML(box, html`<p class="small muted">${RETAILERS_NOTE}</p>
    <div class="row" style="margin-bottom:12px"><input type="search" id="dq" placeholder="Filtrer…" style="max-width:260px" aria-label="Filtrer les boutiques">
      <select id="dcat" style="width:auto" aria-label="Catégorie">${options(Object.entries(CAT_NAMES), '', { empty: 'Toutes catégories' })}</select>
      <select id="dtier" style="width:auto" aria-label="Gamme">${options(Object.entries(TIER_NAMES), '', { empty: 'Toutes gammes' })}</select></div>
    <div class="table-wrap"><table><thead><tr><th>Site</th><th>Gamme / raison d'explorer</th><th>Catégories</th><th></th></tr></thead><tbody id="dbody"></tbody></table></div>`);
  const draw = () => setHTML(box.querySelector('#dbody'), RETAILERS.filter((r) => (!st.cat || r.cats.includes(st.cat)) && (!st.tier || r.tier === +st.tier) && (!st.q || `${r.name} ${r.why}`.toLowerCase().includes(st.q.toLowerCase())))
    .map((r) => html`<tr><td><strong>${r.name}</strong><br><span class="small muted">${hostOf(r.url)}</span></td><td class="small">${TIER_NAMES[r.tier]} — ${r.why}</td><td class="small">${r.cats.map((c) => CAT_NAMES[c]).join(', ')}</td><td><a class="btn btn-sm" href="${safeUrl(r.url)}" target="_blank" rel="noopener noreferrer">${icon('external')} Ouvrir</a></td></tr>`));
  box.querySelector('#dq').oninput = (e) => { st.q = e.target.value; draw(); };
  box.querySelector('#dcat').onchange = (e) => { st.cat = e.target.value; draw(); };
  box.querySelector('#dtier').onchange = (e) => { st.tier = e.target.value; draw(); };
  draw();
  void CATEGORIES;
}

async function renderHistory(box) {
  const list = (await loadWishlist()).filter((w) => w.status !== 'wanted').sort((a, b) => (b.purchasedAt || b.droppedAt || '').localeCompare(a.purchasedAt || a.droppedAt || ''));
  const spent = list.filter((w) => w.status === 'purchased').reduce((a, w) => a + (w.purchasePrice || 0), 0);
  setHTML(box, list.length ? html`<p>Total des achats enregistrés : <strong>${fmtEUR(spent)}</strong></p><div class="table-wrap"><table><thead><tr><th>Pièce</th><th>Statut</th><th>Date</th><th class="num">Prix</th><th></th></tr></thead><tbody>
    ${list.map((w) => html`<tr><td>${w.name}${w.linkedGarmentId ? html` · <a href="#/wardrobe/${w.linkedGarmentId}">fiche</a>` : ''}</td><td>${w.status === 'purchased' ? 'Acheté' : 'Retiré'}</td><td>${fmtDate(w.purchasedAt || w.droppedAt)}</td><td class="num">${w.purchasePrice ? fmtEUR(w.purchasePrice) : '—'}</td><td><button class="btn btn-sm btn-ghost" data-restore="${w.id}">Remettre en envie</button></td></tr>`)}</tbody></table></div>`
    : emptyState('Aucun achat enregistré', 'Marquez une envie comme « Achetée » pour suivre votre budget.', ''));
  box.querySelectorAll('[data-restore]').forEach((b) => b.onclick = async () => { const w = list.find((x) => x.id === b.dataset.restore); await store.repo.put('wishlist', { ...w, status: 'wanted' }); renderHistory(box); });
}


// ---------------------------------------------------------------- Avant d'acheter
const VERDICT_STYLE = { buy: ['tag-ok', 'check'], think: ['tag-warn', 'rotate'], skip: ['tag-danger', 'close'] };
async function renderCheck(box, query) {
  const all0 = await loadGarments();
  const replaced = query?.get('replace') ? all0.find((g) => g.id === query.get('replace')) : null;
  const all = replaced ? all0.filter((g) => g.id !== replaced.id) : all0; // l'ancienne pièce ne compte pas comme « doublon »
  const st = { cand: { sub: '', color: '', material: '', price: '', name: '', brand: '', url: '', ref: '' }, note: '', photo: null };
  setHTML(box, html`<section class="card card-accent">
    <h2 style="margin-top:0">Faut-il l'acheter ?</h2>
    ${replaced ? html`<div class="callout small" style="margin-bottom:10px">Pour remplacer <strong>${replaced.name}</strong>${replaced.material ? ` (${replaced.material})` : ''}${replaced.price ? `, ${replaced.price} €` : ''} : je vérifie aussi que l'article est vraiment mieux.</div>` : ''}
    <p class="small">Collez le <strong>lien</strong> de l'article, ou écrivez la <strong>marque, la référence et une description</strong> (ex. « Uniqlo pull col rond mérinos marine 39,90 € »). Une <strong>photo</strong> aide pour la couleur. SPREZZA compare avec votre dressing et vous dit si l'achat est utile.</p>
    <div class="field"><label for="pcin">Lien, marque, référence ou description</label><textarea id="pcin" rows="3" placeholder="https://… ou « Zara chino marron clair 0347/890 29,95 € »">${query?.get('q') || ''}</textarea></div>
    <div class="form-grid">
      <div class="field"><label for="pcphoto">Photo (facultatif)</label><input id="pcphoto" type="file" accept="image/*"></div>
      <div class="field"><label for="pcprice">Prix (€)</label><input id="pcprice" type="number" inputmode="decimal" step="0.01" min="0"></div>
    </div>
    <div class="btn-row"><button class="btn btn-primary" id="pcgo">${icon('search')} Analyser</button></div>
    <div id="pcout" style="margin-top:12px"></div></section>
    <div id="pcres"></div>`);
  const $ = (q) => box.querySelector(q);
  $('#pcphoto').onchange = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    try {
      const { processImage } = await import('../services/image.js');
      const bmp = await createImageBitmap(f);
      const r = await processImage(bmp);
      st.photo = URL.createObjectURL(r.thumbBlob);
      const d = r.dominant?.[0]; if (d?.nearestId) { st.photoColor = d.nearestId; if (!st.cand.color) st.cand.color = d.nearestId; }
      toast(d ? `Couleur estimée d'après la photo : ${d.nearestName} (à confirmer)` : 'Photo ajoutée');
      if (st.cand.sub) form(); 
    } catch { toast('Photo illisible'); }
  };
  $('#pcgo').onclick = async () => {
    const input = $('#pcin').value.trim();
    if (!input && !st.photo) { toast('Collez un lien, une référence ou ajoutez une photo'); return; }
    const { parseProduct, readerToText, urlWords } = await import('../domain/product-parse.js');
    let text = input; st.note = ''; let pageName = '';
    const photoColor = st.photoColor || '';
    st.cand = { sub: '', color: photoColor, material: '', price: '', name: '', brand: '', url: '', ref: '' }; // nouvelle analyse
    const url = (input.match(/https?:\/\/[^\s"'<>]+/) || [])[0];
    if (url) {
      setHTML($('#pcout'), html`<p class="small"><span class="loader"></span> Lecture de la page…</p>`);
      try { const { fetchProductPage } = await import('../services/product-fetch.js'); const page = await fetchProductPage(url); const r = readerToText(page); text = `${r.text}\n${input}`; pageName = r.name || ''; }
      catch (e) { st.note = `La boutique n'a pas laissé lire la page (${e.message}) : seules les informations du lien sont reprises. Complétez le type et la couleur ci-dessous.`; }
    }
    const p = parseProduct(text);
    Object.assign(st.cand, { sub: p.sub || '', color: p.color || photoColor, material: p.material || '', brand: p.brand || '', url: url || '', ref: p.ref || '', name: pageName });
    const price = Number($('#pcprice').value) || p.price || null; st.cand.price = price || '';
    if (price && !$('#pcprice').value) $('#pcprice').value = price;
    void urlWords;
    form();
  };
  const form = () => {
    const subs = CATEGORIES.filter((c) => !['accessoire'].includes(c.id)).map((c) => [c.name, c.subs.map(([id, name]) => [id, name])]);
    setHTML($('#pcout'), html`${st.note ? html`<div class="callout callout-warn small">${st.note}</div>` : ''}
      <div class="row" style="gap:12px;align-items:flex-start">${st.photo ? html`<img src="${st.photo}" alt="" style="width:90px;border-radius:10px">` : ''}
      <div style="flex:1"><p class="small muted" style="margin:0 0 6px">Vérifiez et corrigez si besoin :</p>
      <div class="form-grid">
        <div class="field"><label for="pcsub">Type</label><select id="pcsub"><option value="">— Choisir —</option>${subs.map(([cat, list]) => html`<optgroup label="${cat}">${list.map(([id, name]) => html`<option value="${id}" ${st.cand.sub === id ? raw('selected') : ''}>${name}</option>`)}</optgroup>`)}</select></div>
        <div class="field"><label for="pccol">Couleur</label><select id="pccol"><option value="">— Choisir —</option>${GARMENT_COLORS.map((c) => html`<option value="${c.id}" ${st.cand.color === c.id ? raw('selected') : ''}>${c.name}</option>`)}</select></div>
        <div class="field"><label for="pcmat">Matière</label><input id="pcmat" value="${st.cand.material}"></div>
      </div>${st.cand.brand || st.cand.ref ? html`<p class="small muted">${[st.cand.brand, st.cand.ref ? `réf. ${st.cand.ref}` : ''].filter(Boolean).join(' · ')}</p>` : ''}
      <button class="btn btn-primary" id="pceval">Donner mon avis</button></div></div>`);
    const ev = () => {
      st.cand.sub = $('#pcsub').value; st.cand.color = $('#pccol').value; st.cand.material = $('#pcmat').value.trim(); st.cand.price = Number($('#pcprice').value) || '';
      if (!st.cand.sub || !st.cand.color) { toast('Choisissez le type et la couleur'); return; }
      verdict();
    };
    $('#pceval').onclick = ev;
    if (st.cand.sub && st.cand.color) verdict();
  };
  const verdict = async () => {
    setHTML($('#pcres'), html`<p class="muted" style="margin-top:14px"><span class="loader"></span> Comparaison avec votre dressing…</p>`);
    await new Promise((r) => setTimeout(r, 30));
    const { evaluatePurchase } = await import('../domain/purchase.js');
    const c = st.cand;
    const r = evaluatePurchase({ sub: c.sub, color: c.color, material: c.material, price: c.price || null, name: c.name }, all, { date: new Date() });
    if (!r) return;
    if (replaced) {
      const { compareUpgrade } = await import('../domain/upgrade.js');
      const cmp = compareUpgrade(replaced, { sub: c.sub, color: c.color, material: c.material, price: c.price || null });
      r.reasons = [...cmp, ...r.reasons];
      if (cmp.some((x) => x.tone === 'bad') && r.verdict === 'buy') { r.verdict = 'think'; r.label = 'Pas vraiment mieux que votre pièce actuelle'; }
    }
    const [tone, ic] = VERDICT_STYLE[r.verdict];
    const nm = c.name || [c.brand, SUB_INFO[c.sub].name, COLOR_BY_ID[c.color]?.name.toLowerCase()].filter(Boolean).join(' ');
    const newUrl = `#/wardrobe/new?name=${encodeURIComponent(nm)}&sub=${c.sub}&color=${c.color}${c.price ? `&price=${c.price}` : ''}${c.material ? `&material=${encodeURIComponent(c.material)}` : ''}${c.brand ? `&brand=${encodeURIComponent(c.brand)}` : ''}${c.ref ? `&ref=${encodeURIComponent(c.ref)}` : ''}${c.url ? `&sourceUrl=${encodeURIComponent(c.url)}` : ''}${replaced ? `&replaces=${replaced.id}` : ''}`;
    setHTML($('#pcres'), html`<section class="card" style="margin-top:16px;border-left:4px solid var(${r.verdict === 'buy' ? '--ok' : r.verdict === 'think' ? '--warn' : '--danger'}, #999)">
      <div class="row" style="gap:10px;align-items:center">${swatch(colorHex(c.color))}<div><div class="eyebrow">Mon avis</div><h2 style="margin:0">${r.label}</h2></div><span class="tag ${tone}" style="margin-left:auto">${icon(ic)} ${r.verdict === 'buy' ? 'Oui' : r.verdict === 'think' ? 'Peut-être' : 'Non'}</span></div>
      <p class="small muted" style="margin:6px 0 0">${nm}${c.price ? ` · ${fmtEUR(c.price)}` : ''}</p>
      <ul class="clean" style="margin-top:10px">${r.reasons.map((x) => html`<li style="padding:5px 0;display:flex;gap:8px"><span class="tag ${x.tone === 'ok' ? 'tag-ok' : x.tone === 'warn' ? 'tag-warn' : 'tag-danger'}">${x.tone === 'ok' ? '+' : x.tone === 'warn' ? '!' : '−'}</span><span>${x.text}</span></li>`)}</ul>
      ${r.examples.length ? html`<h3>Avec quoi la porter</h3><ul class="clean small">${r.examples.map((e) => html`<li style="padding:4px 0">${piecesList(e.pieces).filter(([k]) => k !== 'accessory').map(([, g]) => (g.id === '__candidate' ? `★ ${nm}` : g.name)).join(' · ')} <span class="muted">(${e.score}/100)</span></li>`)}</ul>` : ''}
      <div class="btn-row" style="margin-top:12px">
        <a class="btn ${r.verdict === 'buy' ? 'btn-primary' : ''}" href="${newUrl}">${icon('plus')} Je l'ai acheté : créer la fiche</a>
        <button class="btn" id="pcwish">${icon('heart')} Ajouter à mes envies</button>
        ${c.ref || c.brand ? html`<a class="btn btn-ghost" target="_blank" rel="noopener" href="${safeUrl(`https://www.google.com/search?q=${encodeURIComponent([c.brand, c.ref, nm].filter(Boolean).join(' '))}`)}">Voir en ligne</a>` : ''}
      </div>
      <p class="small muted" style="margin-top:8px">Avis calculé sur votre dressing actuel, sans connaître la coupe ni la qualité réelle : vérifiez taille, composition et conditions de retour.</p></section>`);
    $('#pcwish').onclick = async () => {
      const w = await store.repo.put('wishlist', { id: uid('wish'), profileId: pid(), name: nm, query: [c.brand, nm].filter(Boolean).join(' '), color: c.color, budgetMax: c.price || null, material: c.material, priority: r.verdict === 'buy' ? 1 : 2, status: 'wanted', candidates: c.url ? [{ id: uid('cand'), url: c.url, seller: hostOf(c.url), price: c.price || null }] : [] });
      toast('Ajouté à la liste d\'envies', { action: 'Voir', onAction: () => navigate(`#/shopping/wishlist/${w.id}`) });
    };
  };
}
