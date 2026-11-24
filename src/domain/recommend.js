// Moteur de recommandations déterministe, testable sans LLM (A4).
// Contraintes dures → candidats top-K par rôle → combinaisons → note B18 → classement (bonus/malus distincts) → diversité.
import { AVAILABLE_STATES, SUB_INFO, ROLE_LABELS } from '../data/taxonomy.js';
import { OCCASION_BY_ID, OUTFIT_MODES } from '../data/occasions.js';
import { COLOR_TRAITS } from '../data/colors.js';
import { scoreOutfit, SUB_AFFINITY, garmentFormality, outfitFormality } from './scoring.js';
import { classifyHarmony, colorName } from './colors.js';
import { seasonFromDate } from './weather.js';

const TOP_K = 6;
const BELT_BOTTOMS = ['pantalon', 'pantalon-costume', 'chino', 'jean', 'flanelle', 'bermuda'];
const RAIN_BAD_SHOES = ['espadrilles', 'sandales', 'ballerines', 'bateau'];
const SUEDE = /daim|suède|suede/i;
const PROTECTIVE_SHOES = ['randonnee', 'bottines'];

export function roleOf(g) { return SUB_INFO[g.sub]?.role || ({ haut: 'top', bas: 'bottom', veste: 'layer', manteau: 'outer', chaussures: 'shoes', ceinture: 'belt', accessoire: 'accessory' })[g.category]; }
export function isAvailable(g) { return AVAILABLE_STATES.includes(g.availability || 'clean'); }
function warmthOf(g) { return g.warmth ?? SUB_INFO[g.sub]?.warmth ?? 2; }
function inSeason(g, season) { return !g.seasons?.length || g.seasons.includes(season); }
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const daysSince = (iso, now) => (iso ? (now - new Date(iso).getTime()) / 864e5 : Infinity);

/** Contexte environnemental normalisé. */
export function buildEnv({ weather, season, date = new Date(), prefs = {} }) {
  const s = season || seasonFromDate(date instanceof Date ? date : new Date(date));
  const feel = weather?.feel ?? ({ spring: 15, summer: 24, autumn: 13, winter: 7 })[s];
  const adjFeel = feel - (prefs.warmthBias || 0) * 2; // « trop chaud » → on raisonne comme s'il faisait plus chaud
  return {
    season: s, feel: adjFeel, rain: !!weather?.rain, windy: !!weather?.windy,
    cold: adjFeel < 11, veryCold: adjFeel < 4, hot: adjFeel >= 24, dropRisk: !!weather?.dropRisk, fromWeather: !!weather,
  };
}

/** Filtre dur par rôle, avec raisons d'exclusion pour l'explicabilité. */
export function hardFilter(garments, { occasion, env, profileId }) {
  const excluded = [];
  const pools = { top: [], bottom: [], layer: [], outer: [], shoes: [], belt: [], accessory: [] };
  for (const g of garments) {
    if (profileId && g.profileId && g.profileId !== profileId) continue;
    const role = roleOf(g);
    if (!role) continue;
    if (!isAvailable(g)) { excluded.push([g, 'indisponible (à laver, retouche ou indisponible)']); continue; }
    if (!inSeason(g, env.season) && !(env.cold && warmthOf(g) >= 3) && !(env.hot && warmthOf(g) <= 2)) { excluded.push([g, 'hors saison']); continue; }
    const f = garmentFormality(g);
    if (occasion && ['top', 'bottom', 'shoes'].includes(role)) {
      if (f < occasion.formality[0] - (occasion.strict ? 0 : 1) || f > occasion.formality[1] + 1) { excluded.push([g, `formalité ${f}/5 incompatible avec « ${occasion.name} »`]); continue; }
    }
    if (env.hot && ['top', 'bottom'].includes(role) && warmthOf(g) >= 4) { excluded.push([g, 'trop chaud pour la météo']); continue; }
    if (env.hot && role === 'outer') { excluded.push([g, 'manteau inutile par forte chaleur']); continue; }
    if (!env.hot && env.feel < 16 && ['short', 'bermuda', 'sandales', 'espadrilles'].includes(g.sub)) { excluded.push([g, 'trop léger pour la température']); continue; }
    pools[role].push(g);
  }
  // Pluie : exclure daim/espadrilles/sandales s'il existe une alternative.
  if (env.rain) {
    const ok = pools.shoes.filter((s) => !RAIN_BAD_SHOES.includes(s.sub) && !SUEDE.test(s.material || '') && (s.rainResistance ?? 1) >= 1);
    if (ok.length) { pools.shoes.filter((s) => !ok.includes(s)).forEach((s) => excluded.push([s, 'pluie prévue (daim, toile ou chaussures ouvertes)'])); pools.shoes = ok; }
  }
  // Montagne / activité : protection avant le style.
  if (occasion?.protection) {
    const ok = pools.shoes.filter((s) => PROTECTIVE_SHOES.includes(s.sub) || (s.tags || []).includes('protection'));
    pools.shoes.filter((s) => !ok.includes(s)).forEach((s) => excluded.push([s, 'chaussures non adaptées à l\'activité']));
    pools.shoes = ok;
  }
  return { pools, excluded };
}

function unaryScore(g, role, mode, { occasion, env, prefs, now }) {
  let s = (SUB_AFFINITY[g.sub]?.[mode] ?? 0) * 1.4;
  if (occasion) s -= Math.abs(garmentFormality(g) - (occasion.target + (prefs.formalityBias || 0))) * 0.8;
  if (env.cold && ['top', 'layer', 'outer'].includes(role)) s += (warmthOf(g) - 2) * 0.4;
  if (env.hot) s -= (warmthOf(g) - 1) * 0.4;
  if (env.rain && (role === 'outer' || role === 'shoes')) s += (g.rainResistance ?? 0) * 0.6;
  if (g.favorite) s += 0.3;
  if (g.availability === 'worn') s -= 0.2;
  const d = daysSince(g.lastWornAt, now);
  if (d < 2) s -= 0.6; else if (d > 21) s += 0.3; // rotation du dressing
  if (prefs.dislikedFit?.[g.id]) s -= 2;
  if (mode === 'italian' && ['ecru', 'beige', 'chocolate', 'olive', 'taupe', 'navy', 'camel'].includes(g.color?.id)) s += 0.4;
  if (mode === 'classic' && ['navy', 'white', 'sky', 'mid-gray', 'light-gray', 'charcoal'].includes(g.color?.id)) s += 0.4;
  if (mode === 'modern' && ['black', 'charcoal', 'olive', 'white', 'ecru'].includes(g.color?.id)) s += 0.3;
  return s;
}
const topK = (list, fn, k = TOP_K) => list.map((g) => [g, fn(g)]).sort((a, b) => b[1] - a[1] || byId(a[0], b[0])).slice(0, k).map(([g]) => g);

function pickBelt(belts, bottom, shoes) {
  if (!bottom || !BELT_BOTTOMS.includes(bottom.sub) || !belts.length) return null;
  const sf = COLOR_TRAITS[shoes?.color?.id]?.family;
  const sorted = [...belts].sort((a, b) => {
    const am = (COLOR_TRAITS[a.color?.id]?.family === 'black') === (sf === 'black') ? 1 : 0;
    const bm = (COLOR_TRAITS[b.color?.id]?.family === 'black') === (sf === 'black') ? 1 : 0;
    return bm - am || byId(a, b);
  });
  return sorted[0];
}
export function comboKey(p) { return ['top', 'bottom', 'layer', 'outer', 'shoes'].map((r) => p[r]?.id || '-').join('|'); }

function needsLayer(occasion) { return occasion?.strict && occasion.formality[0] >= 5; }
function needsOuter(env) { return env.cold || env.rain || env.windy; }

/**
 * Recommande des tenues.
 * @param {object} input { garments, occasionId, weather, season, date, imposed: {role:garmentId}, prefs, profileId, offsets: {mode:n}, now }
 */
export function recommend(input) {
  const { garments = [], occasionId = 'daily', weather = null, prefs = {}, imposed = {}, offsets = {}, profileId } = input;
  const now = input.now ?? Date.now();
  const occasion = OCCASION_BY_ID[occasionId] || OCCASION_BY_ID.daily;
  const env = buildEnv({ weather, season: input.season, date: input.date || new Date(now), prefs });
  const { pools, excluded } = hardFilter(garments, { occasion, env, profileId });
  // Pièces imposées / gardées
  const forced = {};
  for (const [role, id] of Object.entries(imposed)) {
    if (!id) continue;
    const g = garments.find((x) => x.id === id);
    if (g && isAvailable(g)) { forced[role] = g; if (!pools[role].includes(g)) pools[role].push(g); }
  }
  const info = { counts: Object.fromEntries(Object.entries(pools).map(([k, v]) => [k, v.length])), excluded, env, occasion, missing: [] };
  const required = ['top', 'bottom', 'shoes'];
  const missingRoles = required.filter((r) => !pools[r].length);
  if (needsLayer(occasion) && !pools.layer.some((g) => garmentFormality(g) >= 4)) info.missing.push({ role: 'layer', text: `Une veste habillée (blazer ou veste de costume) est attendue pour « ${occasion.name} ».` });
  if (needsOuter(env) && !pools.outer.length) info.missing.push({ role: 'outer', text: env.rain ? 'Aucun manteau/trench déperlant disponible pour la pluie.' : 'Aucun manteau disponible pour le froid ou le vent.' });
  if (occasion.protection && !pools.shoes.length) info.missing.push({ role: 'shoes', text: 'Chaussures adaptées à l\'activité (randonnée, bottines) indispensables : sécurité avant le style.' });
  if (missingRoles.length) {
    missingRoles.forEach((r) => info.missing.push({ role: r, text: `Aucune pièce « ${ROLE_LABELS[r]} » disponible et compatible.` }));
    return { options: [], backup: null, info, combos: 0 };
  }
  const ctxBase = { occasion, env, prefs, now };
  const results = [];
  let combos = 0;
  const seen = new Set();
  for (const mode of OUTFIT_MODES.map((m) => m.id)) {
    const cand = (role, k) => (forced[role] ? [forced[role]] : topK(pools[role], (g) => unaryScore(g, role, mode, ctxBase), k));
    const tops = cand('top'); const bottoms = cand('bottom'); const shoes = cand('shoes');
    const layersAll = cand('layer', 3);
    const layerOpts = forced.layer ? [forced.layer] : needsLayer(occasion) ? layersAll.filter((g) => garmentFormality(g) >= 4) : [null, ...layersAll];
    const outerOpts = forced.outer ? [forced.outer] : needsOuter(env) && pools.outer.length ? cand('outer', 2) : [null];
    const scored = [];
    for (const top of tops) for (const bottom of bottoms) for (const sh of shoes) for (const layer of (layerOpts.length ? layerOpts : [null])) for (const outer of outerOpts) {
      if (layer && top && layer.id === top.id) continue;
      const belt = forced.belt || pickBelt(pools.belt, bottom, sh);
      const accessories = [];
      if (occasion.formality[0] >= 5 || (occasion.target >= 5 && mode === 'classic')) {
        const tie = pools.accessory.find((a) => a.sub === 'cravate');
        if (tie && top?.sub === 'chemise') accessories.push(tie);
      }
      const pieces = { top, bottom, layer, outer, shoes: sh, belt, accessories };
      const sc = scoreOutfit(pieces, { ...ctxBase, mode, weather: env });
      const base = sc.normalized ?? 50;
      let rank = base;
      const bonus = [];
      const pieceList = [top, bottom, layer, outer, sh].filter(Boolean);
      const reuse = pieceList.filter((g) => daysSince(g.lastWornAt, now) > 14).length;
      if (reuse) { rank += reuse * 0.8; bonus.push(`+${(reuse * 0.8).toFixed(1)} réutilisation de pièces peu portées`); }
      const recent = pieceList.filter((g) => daysSince(g.lastWornAt, now) < 2).length;
      if (recent) { rank -= recent * 2; bonus.push(`−${recent * 2} pièces portées très récemment`); }
      const aff = pieceList.reduce((a, g) => a + (SUB_AFFINITY[g.sub]?.[mode] ?? 0), 0);
      rank += aff * 1.5;
      if (prefs.likedCombos?.includes(comboKey(pieces))) { rank += 3; bonus.push('+3 tenue aimée'); }
      if (needsOuter(env) && !outer) { rank -= 4; bonus.push('−4 couche extérieure manquante'); }
      scored.push({ pieces, score: sc, rank: Math.round(rank * 100) / 100, bonus, mode });
      combos++;
    }
    scored.sort((a, b) => b.rank - a.rank || comboKey(a.pieces).localeCompare(comboKey(b.pieces)));
    results.push({ mode, list: scored });
  }
  // Diversité : chaque mode prend sa meilleure tenue distincte des précédentes (≥ 2 pièces différentes si possible).
  const options = [];
  const chosen = [];
  const diff = (a, b) => ['top', 'bottom', 'shoes', 'layer'].filter((r) => (a[r]?.id || '') !== (b[r]?.id || '')).length;
  for (const { mode, list } of results) {
    const offset = offsets[mode] || 0;
    let pick = null; let level = 2;
    for (level = 2; level >= 1 && !pick; level--) {
      const valid = list.filter((c) => chosen.every((o) => diff(c.pieces, o) >= level) && !seen.has(comboKey(c.pieces)));
      if (valid.length) pick = valid[offset % valid.length];
    }
    if (!pick && list.length) { pick = list[offset % list.length]; pick.duplicate = true; }
    if (!pick) continue;
    chosen.push(pick.pieces); seen.add(comboKey(pick.pieces));
    options.push(decorate(pick, { occasion, env, pools, list, ctxBase }));
  }
  const distinct = new Set(options.map((o) => comboKey(o.pieces))).size;
  info.distinct = distinct;
  if (distinct < 3) info.note = `Le dressing disponible permet ${distinct} combinaison${distinct > 1 ? 's' : ''} réellement distincte${distinct > 1 ? 's' : ''} pour cette occasion (${combos} combinaisons évaluées).`;
  const backup = (env.rain || env.dropRisk || env.cold) && options[0] ? buildBackup(options[0], pools, env) : null;
  return { options, backup, info, combos };
}

function decorate(pick, { occasion, env, pools, list, ctxBase }) {
  const p = pick.pieces;
  const reasons = []; const warnings = []; const missing = [];
  const colorIds = [p.top, p.bottom, p.layer, p.outer, p.shoes].filter(Boolean).map((g) => g.color?.id).filter(Boolean);
  const h = classifyHarmony(colorIds);
  reasons.push(`${h.name} : ${[...new Set(colorIds)].map(colorName).join(', ')}. ${h.text}`);
  const of = outfitFormality(p);
  reasons.push(`Formalité ${of?.toFixed(1)}/5, adaptée à « ${occasion.name} » (plage ${occasion.formality[0]}–${occasion.formality[1]}).`);
  if (env.fromWeather || env.feel !== undefined) reasons.push(`Pensée pour un ressenti d'environ ${Math.round(env.feel)} °C${env.rain ? ', avec pluie' : ''}.`);
  if (env.rain && p.shoes && (p.shoes.rainResistance ?? 1) < 2) warnings.push('Pluie prévue : vos chaussures disponibles résistent peu à l\'eau. Privilégier une paire en cuir lisse avec semelle adaptée.');
  if (env.rain && p.outer && (p.outer.rainResistance ?? 0) < 2) warnings.push('Couche extérieure peu déperlante : prévoir un parapluie.');
  if (env.cold && !p.outer) warnings.push('Froid : aucune couche extérieure disponible dans le dressing.');
  if (occasion.strict) warnings.push('Dress code : les codes explicites de l\'événement priment sur cette proposition.');
  if (occasion.id === 'client') reasons.push('Tenue de représentation pour les rendez-vous clients ; elle ne remplace pas le vêtement de travail/protection lors d\'une intervention.');
  if (pick.duplicate) warnings.push('Combinaison proche d\'une autre proposition : le dressing compatible est limité.');
  if (needsLayer(occasion) && !p.layer) missing.push('Veste habillée (blazer ou costume)');
  if ((env.cold || env.rain) && !p.outer && !pools.outer.length) missing.push(env.rain ? 'Trench ou manteau déperlant' : 'Manteau en laine');
  if (occasion.formality[0] >= 5 && !(p.accessories || []).some((a) => a.sub === 'cravate')) missing.push('Cravate (si attendue par le dress code)');
  if (p.bottom && BELT_BOTTOMS.includes(p.bottom.sub) && !p.belt) missing.push('Ceinture assortie aux chaussures');
  // Alternatives par rôle : meilleures tenues qui ne diffèrent que par ce rôle.
  const alternatives = {};
  for (const role of ['top', 'bottom', 'layer', 'shoes']) {
    const alts = list.filter((c) => (c.pieces[role]?.id || null) !== (p[role]?.id || null) && ['top', 'bottom', 'layer', 'outer', 'shoes'].filter((r) => r !== role).every((r) => (c.pieces[r]?.id || null) === (p[r]?.id || null)))
      .slice(0, 3).map((c) => ({ garment: c.pieces[role], score: c.score.normalized, rank: c.rank }));
    if (alts.length) alternatives[role] = alts;
  }
  void ctxBase;
  return { ...pick, mode: pick.mode, reasons, warnings, missing, alternatives, harmony: h, palette: [...new Set(colorIds)] };
}

function buildBackup(option, pools, env) {
  const p = { ...option.pieces };
  const changes = [];
  const rainShoes = [...pools.shoes].sort((a, b) => (b.rainResistance ?? 0) - (a.rainResistance ?? 0) || byId(a, b))[0];
  if (rainShoes && rainShoes.id !== p.shoes?.id && (rainShoes.rainResistance ?? 0) > (p.shoes?.rainResistance ?? 0)) { p.shoes = rainShoes; changes.push(`Chaussures : ${rainShoes.name}`); }
  const protect = (g) => (env.rain ? (g.rainResistance ?? 0) * 10 + (g.warmth ?? 0) : (g.warmth ?? 0) * 10 + (g.rainResistance ?? 0));
  const outer = [...pools.outer].sort((a, b) => protect(b) - protect(a) || byId(a, b))[0];
  if (outer && outer.id !== p.outer?.id) { p.outer = outer; changes.push(`Couche extérieure : ${outer.name}`); }
  const warmTop = [...pools.top].sort((a, b) => (b.warmth ?? 2) - (a.warmth ?? 2) || byId(a, b))[0];
  if ((env.cold || env.dropRisk) && warmTop && (warmTop.warmth ?? 2) > (p.top?.warmth ?? 2)) { p.top = warmTop; changes.push(`Haut plus chaud : ${warmTop.name}`); }
  if (!changes.length) return { pieces: p, changes: [], note: 'Aucune pièce plus protectrice disponible dans le dressing : prévoir un parapluie ou une couche supplémentaire.' };
  return { pieces: p, changes, note: env.rain ? 'Tenue de secours en cas de pluie.' : 'Tenue de secours en cas de baisse de température.' };
}

/**
 * Pièces pour « Avec quoi le porter ? » : combinaisons du dressing contenant cette pièce.
 */
export function pairingsFor(garment, garments, opts = {}) {
  const role = roleOf(garment);
  if (!role || !['top', 'bottom', 'layer', 'outer', 'shoes'].includes(role)) return { options: [], info: { note: 'Pièce non combinable automatiquement.' } };
  return recommend({ ...opts, garments, imposed: { [role]: garment.id }, occasionId: opts.occasionId || bestOccasionFor(garment) });
}
export function bestOccasionFor(g) {
  const f = garmentFormality(g);
  return f >= 5 ? 'important-meeting' : f >= 4 ? 'client' : f >= 3 ? 'daily' : 'walk';
}

/** Nombre de nouvelles tenues qu'une pièce hypothétique ajouterait (utilité shopping). */
export function outfitsUnlocked(hypo, garments, { occasionIds = ['daily', 'client', 'restaurant', 'walk'] } = {}) {
  const g = { ...hypo, id: '__hypo__', availability: 'clean', profileId: undefined };
  const role = roleOf(g);
  if (!role) return 0;
  let count = 0;
  for (const occ of occasionIds) {
    const r = recommend({ garments: [...garments, g], occasionId: occ, imposed: { [role]: g.id }, season: hypo.season });
    const keys = new Set(r.options.filter((o) => (o.score.normalized ?? 0) >= 60).map((o) => comboKey(o.pieces)));
    count += keys.size;
  }
  return count;
}
