// Bilan du dressing : couverture par occasion, vrais manques, achats les plus utiles, pièces sous-utilisées.
// Règles pures et explicables, calculées sur le dressing réel (aucune pièce inventée).
import { recommend, roleOf, hardFilter, buildEnv } from './recommend.js';
import { versatility } from './review.js';
import { garmentFormality } from './scoring.js';
import { paletteNote, colorHex, hexToRgb } from './colors.js';
import { SUB_INFO } from '../data/taxonomy.js';
import { CAPSULE } from '../data/capsule.js';
import { OCCASION_BY_ID } from '../data/occasions.js';

export const AUDIT_OCCASIONS = ['daily', 'office', 'client', 'restaurant', 'walk', 'elegant-dinner', 'city', 'date'];
const WEAR_ROLES = ['top', 'bottom', 'layer', 'outer', 'shoes'];
const BELT_BOTTOMS = ['pantalon', 'pantalon-costume', 'chino', 'jean', 'flanelle', 'bermuda'];
const warmth = (g) => g.warmth ?? SUB_INFO[g.sub]?.warmth ?? 2;
const hexDist = (a, b) => { const x = hexToRgb(colorHex(a)); const y = hexToRgb(colorHex(b)); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
const goodPair = (top, bottom) => top.color?.id && bottom.color?.id && Math.abs(garmentFormality(top) - garmentFormality(bottom)) <= 2
  && (paletteNote({ top: top.color.id, bottom: bottom.color.id }).note >= 8.2);
const lower = (s) => String(s || '').toLowerCase();
const CAPSULE_SUB = { 'col roulé': 'col-roule' };

/** Le bilan raisonne sur tout ce que l'on possède, même au lavage ou rangé pour la saison. */
const owned = (garments) => garments.filter((g) => WEAR_ROLES.includes(roleOf(g)) || ['belt', 'accessory'].includes(roleOf(g))).map((g) => ({ ...g, availability: 'clean' }));

/**
 * Vrais manques, déduits du dressing (pas d'une liste type).
 * @returns {Array<{id, level:'high'|'mid'|'low', text, why, fix?:{role, subs?:string[], colors?:string[], warm?:boolean}}>}
 */
export function wardrobeGaps(garments) {
  const gs = owned(garments);
  const by = Object.fromEntries([...WEAR_ROLES, 'belt'].map((r) => [r, gs.filter((g) => roleOf(g) === r)]));
  const gaps = [];
  const add = (id, level, text, why, fix) => gaps.push({ id, level, text, why, fix });
  // Base : de quoi faire des tenues tous les jours
  if (by.top.length < 4) add('few-tops', 'high', `Seulement ${by.top.length} haut${by.top.length > 1 ? 's' : ''}`, 'Il faut au moins 4–5 hauts pour tenir une semaine sans répéter.', { role: 'top' });
  if (by.bottom.length < 3) add('few-bottoms', 'high', `Seulement ${by.bottom.length} bas`, 'Trois bas de couleurs différentes suffisent à multiplier les tenues.', { role: 'bottom' });
  if (by.shoes.length < 2) add('few-shoes', 'high', `Seulement ${by.shoes.length} paire${by.shoes.length > 1 ? 's' : ''} de chaussures`, 'Une paire décontractée et une paire en cuir couvrent presque toutes les occasions.', { role: 'shoes' });
  // Froid / chaleur / pluie
  if (!by.outer.length) add('no-coat', 'high', 'Aucun manteau', 'Sous 11 °C ressentis (de novembre à mars à Bordeaux), une couche extérieure est indispensable.', { role: 'outer' });
  const warmTops = by.top.filter((g) => warmth(g) >= 3);
  if (by.top.length && !warmTops.length) add('no-warm-top', 'high', 'Aucun haut chaud (pull, col roulé)', 'En hiver, une chemise seule sous le manteau ne suffit pas.', { role: 'top', subs: ['pull', 'col-roule'], warm: true });
  const lightTops = by.top.filter((g) => warmth(g) <= 2 && g.sub !== 'chemise' || ['polo', 'tee-shirt', 'chemise-lin'].includes(g.sub));
  if (by.top.length && !lightTops.length) add('no-light-top', 'mid', 'Aucun haut léger (polo, tee-shirt, lin)', 'Pour les journées au-dessus de 22 °C.', { role: 'top', subs: ['polo', 'tee-shirt'] });
  const rainShoes = by.shoes.filter((s) => (s.rainResistance ?? 0) >= 2 || (['derbies', 'chelsea', 'bottines', 'richelieus'].includes(s.sub) && !/daim|suède|suede|nubuck|toile/i.test(s.material || '')));
  if (by.shoes.length && !rainShoes.length) add('no-rain-shoes', 'mid', 'Aucune paire pour la pluie', 'Le daim, la toile et les chaussures ouvertes souffrent de la pluie : une paire en cuir lisse suffit.', { role: 'shoes', subs: ['derbies', 'chelsea'] });
  const rainOuter = by.outer.filter((o) => (o.rainResistance ?? 0) >= 2 || ['trench', 'impermeable', 'parka'].includes(o.sub));
  if (by.outer.length && !rainOuter.length) add('no-rain-coat', 'low', 'Aucune couche déperlante (trench, imperméable)', 'Un manteau en laine se mouille ; un trench couvre la mi-saison pluvieuse.', { role: 'outer', subs: ['trench'] });
  // Habillé
  if (by.bottom.length && !by.bottom.some((g) => garmentFormality(g) >= 4)) add('no-dress-trousers', 'mid', 'Aucun pantalon habillé', 'Pour les rendez-vous clients et les dîners, un pantalon en laine (gris) fait mieux qu\'un chino.', { role: 'bottom', subs: ['pantalon'] });
  if (!by.layer.some((g) => garmentFormality(g) >= 4)) add('no-blazer', 'mid', 'Aucune veste habillée (blazer)', 'C\'est la pièce qui fait passer une tenue de « correcte » à « élégante » : clients, dîners, sorties.', { role: 'layer', subs: ['blazer'] });
  if (by.shoes.length && !by.shoes.some((g) => garmentFormality(g) >= 4)) add('no-dress-shoes', 'mid', 'Aucune chaussure habillée (derbies, richelieus)', 'Des mocassins ou des baskets ne suffisent pas pour les occasions habillées.', { role: 'shoes', subs: ['derbies'] });
  if (by.bottom.some((g) => BELT_BOTTOMS.includes(g.sub)) && !by.belt.length) add('no-belt', 'low', 'Aucune ceinture', 'Pantalons à passants sans ceinture : la tenue paraît inachevée. Une ceinture en cuir marron suffit.', { role: 'belt' });
  // Associations : bas qui ne vont avec presque aucun haut
  for (const b of by.bottom) {
    const partners = by.top.filter((t) => goodPair(t, b));
    if (by.top.length >= 2 && partners.length <= 1) add(`lonely-${b.id}`, 'mid', `${b.name} : ${partners.length ? 'un seul haut' : 'aucun haut'} ne va vraiment avec`, partners.length ? `Seul « ${partners[0].name} » s'accorde bien : ce bas revient donc toujours avec la même tenue.` : 'Ce bas ne peut pas former de tenue harmonieuse avec vos hauts actuels.', { role: 'top', forBottom: b.id });
    const warmPartners = warmTops.filter((t) => goodPair(t, b));
    if (warmTops.length && partners.length >= 2 && !warmPartners.length) add(`cold-${b.id}`, 'low', `Aucun haut chaud qui va avec ${lower(b.name)}`, 'En hiver ce bas ne pourra se porter qu\'avec une chemise sous le manteau.', { role: 'top', forBottom: b.id, warm: true });
  }
  const order = { high: 0, mid: 1, low: 2 };
  return gaps.sort((a, b) => order[a.level] - order[b.level]);
}

/** Nombre total de tenues de base (haut + bas + chaussures) harmonieuses. */
export function outfitCount(garments) {
  const gs = owned(garments);
  const v = versatility(gs);
  return gs.filter((g) => roleOf(g) === 'bottom').reduce((a, g) => a + (v[g.id] || 0), 0);
}

/** Couverture de chaque occasion dans les conditions données (tenues réellement distinctes et ce qui manque). */
export function occasionCoverage(garments, { date = new Date(), weather = null, occasions = AUDIT_OCCASIONS } = {}) {
  const gs = owned(garments);
  const seen = new Set();
  const rows = occasions.map((id) => {
    const r = recommend({ garments: gs, occasionId: id, date, weather, noUpgrade: true });
    for (const o of r.options) {
      for (const role of WEAR_ROLES) if (o.pieces[role]) seen.add(o.pieces[role].id);
      for (const alts of Object.values(o.alternatives || {})) for (const a of alts) if (a.garment) seen.add(a.garment.id);
    }
    const good = r.options.filter((o) => !o.duplicate && (o.score.normalized ?? 0) >= 70);
    const missing = [...new Set([...r.info.missing.map((m) => m.text), ...r.options.flatMap((o) => o.missing || [])])];
    return { id, name: OCCASION_BY_ID[id].name, distinct: r.info.distinct ?? r.options.length, good: good.length, best: r.options[0]?.score?.normalized ?? null, bestPieces: r.options[0]?.pieces || null, missing, excluded: r.info.excluded };
  });
  return { rows, seen };
}

/** Pièces jamais proposées, avec la raison la plus probable. */
export function underused(garments, coverage) {
  const v = versatility(owned(garments));
  const out = [];
  for (const g of garments) {
    if (!WEAR_ROLES.includes(roleOf(g))) continue;
    if (coverage.seen.has(g.id)) continue;
    const reasons = coverage.rows.flatMap((r) => r.excluded.filter(([x]) => x.id === g.id).map(([, why]) => why));
    let why;
    if (reasons.some((x) => /hors saison/.test(x))) why = 'Hors saison en ce moment : elle reviendra avec la bonne saison.';
    else if (reasons.some((x) => /trop chaud|trop léger/.test(x))) why = 'Pas adaptée à la température actuelle.';
    else if (v[g.id] === 0) why = 'Ne s\'accorde avec aucune autre pièce (couleur ou formalité) : voir les achats qui la rendraient utile.';
    else if (reasons.length && reasons.every((x) => /formalité/.test(x))) why = 'Trop habillée ou trop décontractée pour les occasions courantes.';
    else why = 'Toujours devancée par des pièces mieux assorties : vérifiez sa couleur, sa coupe et son état sur la fiche.';
    out.push({ g, why, versatility: v[g.id] ?? 0, seasonal: /saison|température/.test(why) });
  }
  return out.sort((a, b) => Number(a.seasonal) - Number(b.seasonal));
}

/** Pièces clés : hauts, bas et chaussures les plus combinables (vestes et manteaux vont avec presque tout). */
export function keyPieces(garments, n = 5) {
  const gs = owned(garments);
  const v = versatility(gs);
  const cnt = (r) => gs.filter((g) => roleOf(g) === r).length;
  // Part des tenues possibles pour ce rôle (une paire de chaussures va mécaniquement avec plus de combinaisons).
  const max = { top: cnt('bottom') * cnt('shoes'), bottom: cnt('top') * cnt('shoes'), shoes: cnt('top') * cnt('bottom') };
  const share = (g) => (v[g.id] || 0) / Math.max(1, max[roleOf(g)]);
  return garments.filter((g) => ['top', 'bottom', 'shoes'].includes(roleOf(g)) && (v[g.id] ?? 0) > 0)
    .sort((a, b) => share(b) - share(a) || v[b.id] - v[a.id] || a.name.localeCompare(b.name)).slice(0, n).map((g) => ({ g, count: v[g.id], share: Math.round(share(g) * 100) }));
}

/**
 * Achats les plus utiles : pièces de la capsule non possédées (ni quasi-doublon), portables en ce moment,
 * classées par amélioration réelle des tenues proposées pour chaque occasion, puis manques comblés.
 */
export function bestBuys(garments, { n = 5, gaps = wardrobeGaps(garments), coverage = null, date = new Date(), weather = null, shortlist = 12 } = {}) {
  const gs = owned(garments);
  const cov = coverage || occasionCoverage(garments, { date, weather }).rows;
  const env = buildEnv({ weather, date });
  const v0 = versatility(gs);
  const base = gs.filter((g) => roleOf(g) === 'bottom').reduce((a, g) => a + (v0[g.id] || 0), 0);
  const pre = [];
  for (const c of CAPSULE) {
    if (!WEAR_ROLES.includes(c.role) && c.role !== 'belt') continue;
    const sub = CAPSULE_SUB[c.sub] || (c.role === 'belt' ? 'ceinture-cuir' : c.sub);
    if (gs.some((x) => x.sub === sub && (x.color?.id === c.color || c.role === 'outer' || hexDist(x.color?.id, c.color) < 70))) continue;
    const hypo = { id: `__buy_${c.id}`, name: c.name, category: c.category, sub, color: { id: c.color }, material: c.material, availability: 'clean' };
    // Pas d'achat hors saison (ex. bermuda en novembre) : même filtre que pour les tenues du jour.
    if (c.role !== 'belt') { const { pools } = hardFilter([hypo], { occasion: null, env }); if (!pools[c.role].length) continue; }
    const with1 = [...gs, hypo];
    const v1 = versatility(with1);
    const added = Math.max(0, with1.filter((g) => roleOf(g) === 'bottom').reduce((a, g) => a + (v1[g.id] || 0), 0) - base);
    const closedIds = new Set(wardrobeGaps(with1).map((x) => x.id));
    const closes = gaps.filter((x) => !closedIds.has(x.id));
    const weight = closes.reduce((a, x) => a + gapWeight(x, env), 0);
    pre.push({ c, hypo, with1, added, closes, weight, quick: weight + Math.min(added, 30) / 3 });
  }
  // Évaluation fine (moteur de tenues) sur une présélection, pour rester rapide sur téléphone.
  const out = [];
  for (const p of pre.sort((a, b) => b.quick - a.quick).slice(0, shortlist)) {
    const better = [];
    let gain = 0;
    if (p.c.role !== 'belt') for (const row of cov) {
      const r = recommend({ garments: p.with1, occasionId: row.id, date, weather, noUpgrade: true });
      const good = r.options.filter((o) => !o.duplicate && (o.score.normalized ?? 0) >= 70).length;
      const best = r.options[0]?.score?.normalized ?? null;
      const usedInBest = r.options[0] && WEAR_ROLES.some((k) => r.options[0].pieces[k]?.id === p.hypo.id);
      const dBest = usedInBest && best !== null ? best - (row.best ?? 0) : 0;
      const dGood = good - row.good;
      if (dBest > 0 || dGood > 0) { gain += Math.max(0, dBest) + Math.max(0, dGood) * 4; better.push({ name: row.name, from: row.best, to: usedInBest ? best : row.best, dGood }); }
    }
    if (gain < 3 && !p.weight) continue; // amélioration marginale : on ne pousse pas à acheter
    out.push({ item: p.c, added: p.added, closes: p.closes, better, gain, why: buyWhy(p.added, p.closes, better) });
  }
  // Sélection gloutonne : un manque déjà comblé par un achat mieux classé ne compte plus pour les suivants.
  const picked = []; const done = new Set();
  const value = (b) => b.gain + b.closes.filter((x) => !done.has(x.id)).reduce((a, x) => a + gapWeight(x, env), 0) + Math.min(b.added, 30) / 10;
  while (picked.length < n && out.length) {
    out.sort((a, b) => value(b) - value(a) || a.item.budget[0] - b.item.budget[0]);
    const b = out.shift();
    if (b.gain < 3 && !b.closes.some((x) => !done.has(x.id))) continue;
    b.score = value(b); b.closes.forEach((x) => done.add(x.id)); picked.push(b);
  }
  return picked;
}
/** Poids d'un manque : plus urgent quand la saison le rend concret (manteau par temps froid, haut léger par forte chaleur). */
function gapWeight(x, env) {
  let w = ({ high: 12, mid: 7, low: 3 })[x.level];
  if (env.cold && ['no-coat', 'no-warm-top'].includes(x.id)) w += 10;
  if (env.hot && x.id === 'no-light-top') w += 10;
  if (!env.cold && x.id === 'no-coat') w -= 4;
  return w;
}
function buyWhy(added, closes, better) {
  const parts = [];
  const up = better.filter((b) => b.to > b.from).sort((a, b) => (b.to - b.from) - (a.to - a.from)).slice(0, 3);
  if (up.length) parts.push(`améliore ${up.map((b) => `${b.name} (${b.from} → ${b.to}/100)`).join(', ')}`);
  const more = better.filter((b) => b.dGood > 0 && !(b.to > b.from)).slice(0, 3);
  if (more.length) parts.push(`plus de bonnes tenues pour ${more.map((b) => b.name).join(', ')}`);
  if (closes.length) parts.push(`comble : ${closes.map((x) => lower(x.text)).join(' ; ')}`);
  if (!parts.length && added) parts.push(`${added} nouvelle${added > 1 ? 's' : ''} association${added > 1 ? 's' : ''} avec ce que vous avez déjà`);
  return parts.join(' · ');
}

/** Bilan complet. */
export function wardrobeAudit(garments, { date = new Date(), weather = null } = {}) {
  const gaps = wardrobeGaps(garments);
  const coverage = occasionCoverage(garments, { date, weather });
  return {
    total: garments.length,
    outfits: outfitCount(garments),
    gaps, coverage: coverage.rows,
    underused: underused(garments, coverage),
    keys: keyPieces(garments),
    buys: bestBuys(garments, { gaps, coverage: coverage.rows, date, weather }),
  };
}
