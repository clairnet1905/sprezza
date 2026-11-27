// Composants et actions partagés entre écrans (cartes, propositions, sauvegarde, port).
import { html, raw } from '../lib/html.js';
import { icon, swatch, toast, todayISO, scoreLabel10 } from '../components/ui.js';
import { garmentGlyph, mannequinSVG } from '../components/mannequin.js';
import { ROLE_LABELS, ROLE_ORDER, AVAILABILITY, CATEGORY_BY_ID, SUB_INFO } from '../data/taxonomy.js';
import { OUTFIT_MODES, OCCASION_BY_ID } from '../data/occasions.js';
import { store, pid } from '../state.js';
import { uid } from '../repositories/db.js';
import { roleOf, isAvailable, comboKey } from '../domain/recommend.js';
import { colorHex, colorName } from '../domain/colors.js';
import { afterWear } from '../domain/care.js';
import { inspirationQuery, genderWord } from '../services/pexels.js';

/** Bloc « Inspiration : photos réelles » (chargé à la demande, voir app.js). */
export function inspireBlock(query, label = 'Inspiration : photos réelles similaires') {
  return html`<details class="disclosure"><summary>${label}</summary><div style="margin-top:8px"><button type="button" class="btn btn-sm" data-inspire="${query}">${icon('search')} Afficher des photos</button> <span class="small muted">Recherche : « ${query} »</span><div class="inspire-out" aria-live="polite"></div></div></details>`;
}

export const AVAIL_LABEL = Object.fromEntries(AVAILABILITY.map(([id, l]) => [id, l]));
export const MODE_NAME = Object.fromEntries(OUTFIT_MODES.map((m) => [m.id, m.name]));

export function garmentThumb(g, cls = 'g-thumb') {
  return html`<div class="${cls}">${g.photoIds?.length ? html`<img data-photo="${g.photoIds[0]}" alt="${g.name}" loading="lazy">` : garmentGlyph(roleOf(g), g.color?.hex)}</div>`;
}

export function garmentCard(g, { versatility } = {}) {
  const avail = isAvailable(g);
  return html`<a class="g-card" href="#/wardrobe/${g.id}">
    ${garmentThumb(g)}
    ${!avail ? html`<span class="g-badge tag tag-warn">${AVAIL_LABEL[g.availability]}</span>` : ''}
    ${g.favorite ? html`<span class="g-fav" aria-label="Favori" style="color:var(--champagne-ink)">${icon('heart', { filled: true })}</span>` : ''}
    <div class="g-body"><div class="g-title">${g.name}</div>
      <div class="g-meta">${g.color?.hex ? swatch(g.color.hex, g.color.name) : ''}<span>${g.color?.name || ''}</span><span>· ${SUB_INFO[g.sub]?.name || CATEGORY_BY_ID[g.category]?.name || ''}</span></div>
      ${typeof versatility === 'number' ? html`<div class="g-meta"><span class="tag ${versatility === 0 ? 'tag-warn' : ''}" title="Nombre de tenues de base possibles avec le reste du dressing">${versatility} tenue${versatility > 1 ? 's' : ''}</span>${g.tags?.includes('à compléter') ? html`<span class="tag">à compléter</span>` : ''}</div>` : ''}
    </div></a>`;
}

export function pieceRow(role, g, { actions = '' } = {}) {
  if (!g) return '';
  return html`<div class="piece">
    <div class="mini-thumb">${g.photoIds?.length ? html`<img data-photo="${g.photoIds[0]}" alt="" loading="lazy">` : garmentGlyph(roleOf(g), g.color?.hex)}</div>
    <div class="piece-info"><div class="piece-role">${ROLE_LABELS[role] || role}</div><div class="piece-name">${g.name}</div>
      <div class="g-meta">${g.color?.hex ? swatch(g.color.hex) : ''}<span>${g.color?.name || ''}${g.material ? ` · ${g.material}` : ''}</span></div></div>
    ${actions}</div>`;
}

export function criteriaView(score, { compact = false } = {}) {
  return html`<div class="criteria">${score.criteria.map((c) => html`<div class="crit ${c.score === null ? 'crit-na' : ''}">
    <span>${c.name}${c.estimated ? html` <span class="tag" title="Estimé à partir des informations saisies, non observé">estimé</span>` : ''}</span>
    <span class="num">${c.score === null ? 'non évaluable' : `${String(c.score).replace('.', ',')} / ${c.max}`}</span>
    <div class="crit-bar" aria-hidden="true"><span style="width:${raw(c.score === null ? 0 : Math.round((c.score / c.max) * 100))}%"></span></div>
    ${!compact && c.reason ? html`<span class="small muted" style="grid-column:1/-1">${c.reason}</span>` : ''}</div>`)}</div>`;
}

export function scoreBadge(score) {
  if (score.score100 !== null && score.score100 !== undefined) {
    return html`<div class="score"><div class="score-num">${score.score100}<small>/100</small></div><div class="small muted">${scoreLabel10(score.score100 / 10)}</div><div class="small muted">couverture ${score.assessedWeight}/100</div></div>`;
  }
  if (score.scoreRange) return html`<div class="score"><div class="score-num" style="font-size:26px">${score.scoreRange[0]}–${score.scoreRange[1]}<small>/100</small></div><div class="small muted">plage : ${score.assessedWeight}/100 points évaluables</div></div>`;
  return html`<div class="score"><div class="small muted">Note non calculable</div></div>`;
}

export function piecesList(pieces) {
  return ROLE_ORDER.flatMap((role) => {
    if (role === 'accessory') return (pieces.accessories || []).map((a) => [role, a]);
    return pieces[role] ? [[role, pieces[role]]] : [];
  });
}

export function outfitMannequin(pieces, label) {
  const jacket = pieces.layer || pieces.outer;
  const tie = (pieces.accessories || []).find((a) => a.sub === 'cravate');
  return mannequinSVG({ top: pieces.top?.color?.hex, pants: pieces.bottom?.color?.hex, shoe: pieces.shoes?.color?.hex, jacket: jacket?.color?.hex, belt: pieces.belt?.color?.hex, tie: tie?.color?.hex, label: label || 'Schéma des couleurs de la tenue' });
}

/** Carte de proposition (Aujourd'hui, Tenues, Avec quoi le porter). */
/** Encadré « La pièce qui manque à cette tenue » : une pièce non possédée qui l'améliorerait. */
export function upgradeBlock(u) {
  if (!u) return '';
  const c = u.item;
  const q = `${c.name.toLowerCase()} homme ${c.material.toLowerCase()}`;
  return html`<div class="callout upgrade" style="margin-top:10px"><div class="row" style="gap:10px;align-items:flex-start">
    ${swatch(colorHex(c.color), colorName(c.color))}
    <div style="flex:1"><div class="eyebrow">La pièce qui manque à cette tenue</div>
      <div><strong>${c.name}</strong> <span class="small muted">· ${c.material} · ${c.budget[0]}–${c.budget[1]} €</span></div>
      <div class="small">${u.text}</div>
      <div class="btn-row" style="margin-top:6px"><a class="btn btn-sm" href="#/shopping?q=${encodeURIComponent(q)}">${icon('search')} La chercher</a><a class="btn btn-sm btn-ghost" href="#/capsule">Voir ma capsule</a></div>
      <div class="small muted">Suggestion d'achat : vous ne l'avez pas dans votre dressing.</div></div></div></div>`;
}

export function proposalCard(opt, idx, { actions = true, title } = {}) {
  const p = opt.pieces;
  return html`<article class="card card-accent proposal" data-idx="${idx}">
    <div class="proposal-head"><div><div class="eyebrow">Option ${idx + 1}</div><h3>${title || MODE_NAME[opt.mode] || 'Tenue'}</h3>
      <div class="chips">${opt.palette.map((id) => html`<span class="tag">${swatch(colorHex(id))} ${colorName(id)}</span>`)}</div></div>
      ${scoreBadge(opt.score)}</div>
    <div class="grid-2" style="align-items:start">
      <div class="piece-list">${piecesList(p).map(([role, g]) => pieceRow(role, g, { actions: actions && role !== 'accessory' && role !== 'belt' ? html`<div class="row" style="gap:4px"><button class="btn btn-ghost btn-icon btn-sm" data-act="replace" data-role="${role}" aria-label="Remplacer cette pièce : ${g.name}" title="Remplacer cette pièce">${icon('swap')}</button><button class="btn btn-ghost btn-icon btn-sm" data-act="keep" data-role="${role}" data-id="${g.id}" aria-label="Garder cette pièce : ${g.name}" title="Garder cette pièce">${icon('lock')}</button></div>` : '' }))}
        ${opt.missing.map((m) => html`<div class="piece piece-missing"><div class="piece-info"><div class="piece-role">Manquant</div><div class="piece-name">${m}</div><div class="small muted">Non possédé — aucune pièce inventée.</div></div>${actions ? html`<a class="btn btn-sm" href="#/shopping?q=${encodeURIComponent(m)}">Chercher</a>` : ''}</div>`)}
      </div>
      <div><div class="mannequin-wrap">${outfitMannequin(p)}</div><div class="schema-label">Schéma — pas une photographie</div></div>
    </div>
    <ul class="ticks">${opt.reasons.map((r) => html`<li>${r}</li>`)}</ul>
    ${upgradeBlock(opt.upgrade)}
    ${opt.warnings.length ? html`<div class="callout callout-warn">${opt.warnings.map((w) => html`<div>${w}</div>`)}</div>` : ''}
    <details class="disclosure"><summary>Détail de la note (grille B18)</summary>${criteriaView(opt.score)}
      ${opt.bonus?.length ? html`<p class="small muted" style="margin-top:8px">Classement (distinct de la note d'élégance) : ${opt.bonus.join(' ; ')}</p>` : ''}</details>
    ${Object.keys(opt.alternatives || {}).length ? html`<details class="disclosure"><summary>Alternatives</summary>${Object.entries(opt.alternatives).map(([role, alts]) => html`<p class="small"><strong>${ROLE_LABELS[role]} :</strong> ${alts.map((a) => `${a.garment?.name || 'sans'}${a.score !== null ? ` (${a.score})` : ''}`).join(' · ')}</p>`)}</details>` : ''}
    ${inspireBlock(inspirationQuery(p, { gender: genderWord() }))}
    ${actions ? html`<div class="btn-row">
      <button class="btn btn-primary" data-act="wear">${icon('check')} Je porte cette tenue</button>
      <button class="btn" data-act="save">${icon('heart')} Sauvegarder</button>
      <button class="btn" data-act="other">${icon('rotate')} Autre combinaison</button>
      <button class="btn" data-act="calendar">${icon('calendar')} Ajouter au calendrier</button>
      <button class="btn" data-act="similar">${icon('search')} Chercher une pièce similaire</button>
    </div>
    <div class="row small" style="gap:6px"><span class="muted">Votre avis :</span>
      <button class="chip" data-fb="like">J'aime</button><button class="chip" data-fb="too-formal">Trop formel</button><button class="chip" data-fb="too-casual">Pas assez habillé</button><button class="chip" data-fb="too-warm">Trop chaud</button><button class="chip" data-fb="too-cold">Pas assez chaud</button><button class="chip" data-fb="no-fit">Ne me va pas</button></div>` : ''}
  </article>`;
}

// ---------- Actions persistantes ----------
export function piecesToIds(pieces) {
  const out = {};
  for (const role of ['top', 'bottom', 'layer', 'outer', 'shoes', 'belt']) if (pieces[role]) out[role] = pieces[role].id;
  out.accessories = (pieces.accessories || []).map((a) => a.id);
  return out;
}
export function idsToPieces(ids, garments) {
  const by = Object.fromEntries(garments.map((g) => [g.id, g]));
  const p = {};
  for (const role of ['top', 'bottom', 'layer', 'outer', 'shoes', 'belt']) if (ids?.[role] && by[ids[role]]) p[role] = by[ids[role]];
  p.accessories = (ids?.accessories || []).map((id) => by[id]).filter(Boolean);
  return p;
}

export async function saveOutfit(pieces, { name, occasionId, mode, score, source = 'generator', missing = [], favorite = false } = {}) {
  const rec = {
    id: uid('outfit'), profileId: pid(), name: name || `${MODE_NAME[mode] || 'Tenue'} — ${OCCASION_BY_ID[occasionId]?.name || 'Libre'}`,
    garmentIds: piecesToIds(pieces), key: comboKey(pieces), occasionId: occasionId || null, mode: mode || null, source,
    score: score ? { score100: score.score100, scoreRange: score.scoreRange, assessedWeight: score.assessedWeight } : null,
    missingItems: missing, favorite, palette: [...new Set(Object.values(pieces).flat().filter((g) => g && g.color).map((g) => g.color.id))],
  };
  await store.repo.put('outfits', rec);
  toast('Tenue sauvegardée');
  return rec;
}

export async function wearOutfit(pieces, { date = todayISO(), occasionId = null, outfitId = null } = {}) {
  const ids = Object.values(piecesToIds(pieces)).flat().filter(Boolean);
  await store.repo.put('wearlog', { id: uid('wear'), profileId: pid(), date, occasionId, outfitId, garmentIds: ids });
  const all = await store.repo.all('garments', (g) => ids.includes(g.id));
  const autoBasket = await store.repo.kvGet('pref:autobasket', true);
  const basketed = [];
  for (const g of all) {
    const next = afterWear({ ...g, lastWornAt: new Date(date + 'T12:00:00').toISOString(), wearCount: (g.wearCount || 0) + 1 }, { autoBasket });
    if (next.availability === 'to-wash' && g.availability !== 'to-wash') basketed.push(g.name);
    await store.repo.put('garments', next, { silent: true });
  }
  if (basketed.length) setTimeout(() => toast(`Panier à linge : ${basketed.join(', ')}`, { action: 'Voir', onAction: () => { location.hash = '#/wardrobe/care'; }, timeout: 7000 }), 1200);
  // Un calendrier planifié ce jour-là devient « porté »
  const cal = await store.repo.all('calendar', (c) => c.profileId === pid() && c.date === date && c.status === 'planned');
  for (const c of cal) await store.repo.put('calendar', { ...c, status: 'worn' });
  toast('Bonne journée — tenue enregistrée dans l\'historique');
}

export async function addToCalendar(pieces, { date, occasionId, title, outfitId = null } = {}) {
  let oid = outfitId;
  if (!oid) { const o = await saveOutfit(pieces, { occasionId, name: title, source: 'calendar' }); oid = o.id; }
  await store.repo.put('calendar', { id: uid('cal'), profileId: pid(), date, occasionId: occasionId || null, outfitId: oid, title: title || OCCASION_BY_ID[occasionId]?.name || 'Tenue', status: 'planned' });
  toast(`Ajouté au calendrier le ${new Date(date + 'T12:00:00').toLocaleDateString('fr-FR')}`);
}

/**
 * Suppression d'un vêtement — règle documentée :
 * 1. la fiche et toutes ses photos (et variantes) sont supprimées ;
 * 2. les tenues qui la référencent perdent ce rôle et reçoivent « Pièce supprimée : nom » dans missingItems ;
 * 3. les liens capsule et liste d'envies vers cette fiche sont retirés ; l'historique de port garde la date mais plus l'identifiant.
 */
export async function deleteGarment(g) {
  for (const ph of g.photoIds || []) await store.repo.remove('photos', ph);
  const outs = await store.repo.all('outfits', (o) => Object.values(o.garmentIds || {}).flat().includes(g.id));
  for (const o of outs) {
    const ids = { ...o.garmentIds };
    for (const k of Object.keys(ids)) {
      if (Array.isArray(ids[k])) ids[k] = ids[k].filter((x) => x !== g.id);
      else if (ids[k] === g.id) delete ids[k];
    }
    await store.repo.put('outfits', { ...o, garmentIds: ids, missingItems: [...(o.missingItems || []), `Pièce supprimée : ${g.name}`] }, { silent: true });
  }
  const capKey = `capsule:${g.profileId}`;
  const cap = await store.repo.kvGet(capKey, null);
  if (cap?.items) {
    let changed = false;
    for (const v of Object.values(cap.items)) if (v.garmentId === g.id) { delete v.garmentId; changed = true; }
    if (changed) await store.repo.kvSet(capKey, cap);
  }
  const wl = await store.repo.all('wearlog', (w) => (w.garmentIds || []).includes(g.id));
  for (const w of wl) await store.repo.put('wearlog', { ...w, garmentIds: w.garmentIds.filter((x) => x !== g.id), removedNames: [...(w.removedNames || []), g.name] }, { silent: true });
  const wish = await store.repo.all('wishlist', (w) => w.linkedGarmentId === g.id);
  for (const w of wish) await store.repo.put('wishlist', { ...w, linkedGarmentId: null }, { silent: true });
  await store.repo.remove('garments', g.id);
}
