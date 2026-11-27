// Moteur de recommandations déterministe, testable sans LLM (A4).
// Contraintes dures → candidats top-K par rôle → combinaisons → note B18 → classement (bonus/malus distincts) → diversité.
import { AVAILABLE_STATES, SUB_INFO, ROLE_LABELS, isEveryday } from '../data/taxonomy.js';
import { OCCASION_BY_ID, OUTFIT_MODES } from '../data/occasions.js';
import { COLOR_TRAITS } from '../data/colors.js';
import { scoreOutfit, SUB_AFFINITY, garmentFormality, outfitFormality } from './scoring.js';
import { classifyHarmony, colorName, luminance, colorHex, hexToRgb } from './colors.js';
import { seasonFromDate, climateFeel } from './weather.js';
import { CAPSULE } from '../data/capsule.js';
import { WORK_KIT, WORK_PRICE_CAP } from '../data/workwear.js';
import { looksFor, explainOutfit } from './explain.js';

const TOP_K = 6;
const BELT_BOTTOMS = ['pantalon', 'pantalon-costume', 'chino', 'jean', 'flanelle', 'bermuda'];
const RAIN_BAD_SHOES = ['espadrilles', 'sandales', 'ballerines', 'bateau'];
const SUEDE = /daim|suède|suede/i;
const PROTECTIVE_SHOES = ['randonnee', 'bottines'];
const WORK_SHOES = ['chaussures-travail', 'baskets', 'randonnee'];
const FRAGILE = /cachemire|mérinos|merinos|laine|soie|\blin\b|daim|suède|suede|nubuck|velours|flanelle|tweed/i;
/** Pourquoi une pièce ne convient pas au ménage (null si elle convient). */
export function workwearIssue(g, role = roleOf(g)) {
  if (['accessory', 'belt'].includes(role)) return null;
  if (FRAGILE.test(`${g.material || ''} ${g.composition || ''}`)) return 'matière fragile pour le ménage (laine, lin, daim…)';
  if (garmentFormality(g) >= 4) return 'trop habillée pour le ménage';
  if (['chemise', 'chemise-lin', 'polo', 'col-roule', 'cardigan'].includes(g.sub)) return 'peu pratique pour le ménage (à garder pour la ville)';
  if (role === 'shoes' && !WORK_SHOES.includes(g.sub) && !(g.tags || []).some((t) => /travail|sécurité|securite|antidérapant/i.test(t))) return 'chaussures non adaptées au ménage (fermées et antidérapantes)';
  if ((g.price ?? 0) > (WORK_PRICE_CAP[role] ?? 50)) return `pièce trop chère pour le ménage (plus de ${WORK_PRICE_CAP[role] ?? 50} €) : gardez-la pour la ville`;
  return null;
}
/** Kit de travail : ce que l'on a déjà (pièces dédiées ou ordinaires qui conviennent) et ce qui manque. */
export function workKitStatus(garments = []) {
  return WORK_KIT.map((k) => {
    const have = garments.filter((g) => k.uses.includes(g.sub) && !workwearIssue(g) && (k.sub === g.sub || !['white', 'ecru', 'beige', 'sky', 'light-gray', 'stone', 'sand'].includes(g.color?.id)));
    return { item: k, have, missing: Math.max(0, k.qty - have.length), ok: have.length >= k.qty };
  });
}

export function roleOf(g) { return SUB_INFO[g.sub]?.role || ({ haut: 'top', bas: 'bottom', veste: 'layer', manteau: 'outer', chaussures: 'shoes', ceinture: 'belt', accessoire: 'accessory' })[g.category]; }
export function isAvailable(g) { return AVAILABLE_STATES.includes(g.availability || 'clean'); }
function warmthOf(g) { return g.warmth ?? SUB_INFO[g.sub]?.warmth ?? 2; }
function inSeason(g, season) { return !g.seasons?.length || g.seasons.includes(season); }
/**
 * Caractère propre à chaque occasion : pièces attendues (bonus) ou déplacées (malus), envie d'une veste,
 * goût pour les teintes sombres du soir. Sans cela, le style (italien…) l'emportait et toutes les occasions
 * proches donnaient la même tenue.
 */
const CASUAL = { 'tee-shirt': 1.5, sweat: 1, pull: 1, jean: 2, chino: 1, pantalon: -1.5, 'pantalon-costume': -4, flanelle: -1, baskets: 2.5, bottines: 1, derbies: -1.5, richelieus: -3, surchemise: 2, 'veste-denim': 2, 'veste-cuir': 1, blazer: -1.5, 'veste-costume': -4, chemise: -0.5 };
const DRESSY = { chemise: 2, 'col-roule': 1.5, polo: -1, 'tee-shirt': -4, sweat: -5, polaire: -5, pantalon: 2, flanelle: 2, 'pantalon-costume': 1.5, chino: -0.5, jean: -2.5, derbies: 2, richelieus: 2, chelsea: 1, mocassins: 0.5, baskets: -4, blazer: 3, 'veste-costume': 2.5, 'veste-daim': 1, surchemise: -2 };
const BUSINESS = { chemise: 2.5, polo: 0.5, pull: 0.5, 'tee-shirt': -3, sweat: -5, pantalon: 2, 'pantalon-costume': 1.5, flanelle: 1.5, chino: 1, jean: -2.5, derbies: 2, richelieus: 1.5, mocassins: 1, baskets: -3, blazer: 3, 'veste-costume': 2, surchemise: -1.5 };
export const OCCASION_TASTE = {
  daily: { subs: { polo: 0.5, chino: 0.5, pull: 0.5 } },
  city: { subs: { pull: 1, 'col-roule': 1, jean: 1, chino: 0.5, chelsea: 1, bottines: 1, surchemise: 1, 'veste-daim': 1, blazer: 0.5 }, layer: 1 },
  walk: { subs: CASUAL },
  cafe: { subs: { ...CASUAL, chemise: 0.5, polo: 1, mocassins: 0.5, pantalon: -1 } },
  travel: { subs: { ...CASUAL, pull: 1.5, cardigan: 1 } },
  home: { subs: { ...CASUAL, jogging: 3, sweat: 2.5, 'tee-shirt': 2 }, layer: -2 },
  sea: { subs: { 'chemise-lin': 3, polo: 1.5, 'tee-shirt': 1.5, bermuda: 2, short: 1.5, chino: 1, espadrilles: 3, bateau: 2.5, sandales: 1.5, jean: -1 }, layer: -2 },
  office: { subs: { chemise: 1.5, pull: 1, polo: 0.5, cardigan: 0.5, pantalon: 1.5, flanelle: 1, chino: 1, derbies: 1.5, mocassins: 0.5, jean: -1, 'tee-shirt': -1.5, baskets: -1.5, sweat: -3 }, layer: 0.5 },
  restaurant: { subs: { 'col-roule': 2, chemise: 1, pull: 1, polo: 0.5, pantalon: 1, flanelle: 1, jean: 0.5, chelsea: 2, bottines: 1, mocassins: 1, 'tee-shirt': -1.5, sweat: -3, baskets: -1 }, dark: 1, layer: 0.5 },
  date: { subs: { chemise: 1.5, 'col-roule': 1.5, pull: 0.5, pantalon: 1, jean: 0.5, chelsea: 1.5, mocassins: 1, 'veste-daim': 1.5, blazer: 1, sweat: -4, 'tee-shirt': -1.5 }, dark: 0.8, layer: 1.5 },
  birthday: { subs: { polo: 1, chemise: 1, pull: 0.5, chino: 1, jean: 0.5, mocassins: 1, surchemise: 1 }, layer: 0.5 },
  client: { subs: BUSINESS, layer: 3 },
  'pro-meeting': { subs: BUSINESS, layer: 3 },
  'important-meeting': { subs: { ...BUSINESS, 'veste-costume': 3, 'pantalon-costume': 2.5, polo: -2, pull: -1 }, layer: 4 },
  interview: { subs: { ...BUSINESS, 'veste-costume': 3, 'pantalon-costume': 2.5, polo: -2 }, layer: 4 },
  'elegant-dinner': { subs: DRESSY, dark: 1.5, layer: 3 },
  'chic-party': { subs: { ...DRESSY, 'veste-costume': 3, 'pantalon-costume': 2.5 }, dark: 1.5, layer: 4 },
  wedding: { subs: { ...DRESSY, 'veste-costume': 3.5, 'pantalon-costume': 3 }, layer: 4 },
  religious: { subs: { ...DRESSY, 'veste-costume': 3.5, 'pantalon-costume': 3 }, layer: 4 },
  // Travail : propre et stylé mais pas cher — polo piqué, chino stretch foncé, baskets nettes ; couleurs sombres.
  'work-cleaning': { subs: { 'tee-shirt-travail': 3.5, 'polo-sport': 3.5, 'tee-shirt': 2.5, sweat: 1.5, polaire: 1.5, 'pantalon-travail': 4, chino: 2, 'pantalon-technique': 2.5, jogging: 0.5, jean: 1, 'chaussures-travail': 5, baskets: 2, randonnee: 0.5, 'veste-travail': 3, surchemise: 2.5, 'veste-technique': 1.5 }, dark: 1.5, light: -1.5, layer: 0 },
  mountain: { subs: { pull: 2, polaire: 2, 'pantalon-technique': 2, jean: 0.5, 'veste-technique': 2, parka: 1, doudoune: 1, chemise: -1, pantalon: -2 } },
};
const tasteOf = (occasion) => OCCASION_TASTE[occasion?.id] || {};
const isDark = (g) => luminance(colorHex(g?.color?.id)) < 0.12;
/** Bonus/malus d'une pièce pour l'occasion (sans la veste, gérée à part). */
export function occasionFit(g, occasion) {
  const t = tasteOf(occasion);
  const lum = g.color?.id ? luminance(colorHex(g.color.id)) : null;
  return (t.subs?.[g.sub] ?? 0) + (t.dark && lum !== null && lum < 0.12 ? t.dark * 0.6 : 0) + (t.light && lum !== null && lum > 0.45 && ['top', 'bottom'].includes(roleOf(g)) ? t.light : 0);
}
/** Note de classement hors historique de port : grille B18 + style du mode + attentes de l'occasion. */
export function styleRank(pieces, { mode, occasion, env, prefs = {} }, sc = null) {
  const score = sc || scoreOutfit(pieces, { occasion, env, prefs, mode, weather: env });
  const { top, bottom, layer, outer, shoes } = pieces;
  let rank = score.normalized ?? 50;
  rank += [top, bottom, layer, outer, shoes].filter(Boolean).reduce((a, g) => a + (SUB_AFFINITY[g.sub]?.[mode] ?? 0), 0) * 0.8;
  // L'occasion façonne la tenue : pièces attendues, veste souhaitée ou non, formalité visée.
  const taste = tasteOf(occasion);
  rank += [top, bottom, layer, shoes].filter(Boolean).reduce((a, g) => a + occasionFit(g, occasion), 0) * 2.5;
  if (taste.layer) rank += layer ? taste.layer * 1.5 : (taste.layer > 0 ? -taste.layer : 0);
  const ofr = outfitFormality(pieces);
  if (ofr !== null && occasion) rank -= Math.abs(ofr - (occasion.target + (prefs.formalityBias || 0))) * 3;
  return rank;
}
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const daysSince = (iso, now) => (iso ? (now - new Date(iso).getTime()) / 864e5 : Infinity);
/** Malus de rotation selon l'ancienneté du dernier port (une pièce portée hier ne revient pas aujourd'hui). */
export function recencyPenalty(g, now) {
  const d = daysSince(g.lastWornAt, now);
  return d < 1 ? 5 : d < 2 ? 3.5 : d < 4 ? 2 : d < 7 ? 1 : 0;
}
/** Pièce proposée ou portée ces derniers jours (historique de la semaine) : chaque apparition compte. */
function proposedPenalty(g, proposed, now) {
  const v = proposed?.[g.id]; if (!v) return 0;
  const last = g.lastWornAt ? new Date(g.lastWornAt).toDateString() : null;
  const dates = (Array.isArray(v) ? v : [v]).filter((at) => new Date(at).toDateString() !== last); // le dernier port est déjà compté
  // Chaque apparition des 7 derniers jours compte : deux pièces ne peuvent plus simplement alterner un jour sur deux.
  return dates.reduce((a, at) => a + recencyPenalty({ lastWornAt: at }, now) * 0.8 + (daysSince(at, now) < 7 ? 0.8 : 0), 0);
}
/** Variation du jour : petit écart stable pour une pièce et une date, pour que deux pièces presque équivalentes alternent. */
export function dayJitter(id, now) {
  const day = new Date(now); const key = `${id}|${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
  let h = 2166136261; for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

/** Contexte environnemental normalisé. */
export function buildEnv({ weather, season, date = new Date(), prefs = {} }) {
  const d = date instanceof Date ? date : new Date(date);
  const s = season || seasonFromDate(d);
  const feel = weather?.feel ?? (season ? ({ spring: 15, summer: 24, autumn: 13, winter: 7 })[s] : climateFeel(d));
  const adjFeel = feel - (prefs.warmthBias || 0) * 2; // « trop chaud » → on raisonne comme s'il faisait plus chaud
  return {
    season: s, feel: adjFeel, rain: !!weather?.rain, windy: !!weather?.windy,
    cold: adjFeel < 11, veryCold: adjFeel < 4, hot: adjFeel >= 24, mild: adjFeel < 16, dropRisk: !!weather?.dropRisk, fromWeather: !!weather,
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
    if (occasion?.workwear) { const why = workwearIssue(g, role); if (why) { excluded.push([g, why]); continue; } }
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

function unaryScore(g, role, mode, { occasion, env, prefs, now, proposed }) {
  let s = (SUB_AFFINITY[g.sub]?.[mode] ?? 0) * 0.9;
  if (occasion) s -= Math.abs(garmentFormality(g) - (occasion.target + (prefs.formalityBias || 0))) * 0.9;
  if (occasion) s += occasionFit(g, occasion) * 1.5;
  if (env.cold && ['top', 'layer', 'outer'].includes(role)) s += (warmthOf(g) - 2) * 0.4;
  if (env.hot) s -= (warmthOf(g) - 1) * 0.4;
  if (env.rain && (role === 'outer' || role === 'shoes')) s += (g.rainResistance ?? 0) * 0.6;
  if (g.favorite) s += 0.3;
  if (g.availability === 'worn') s -= 0.2;
  if (env.cold && role === 'top' && warmthOf(g) <= 2 && !['chemise'].includes(g.sub)) s -= 1; // polo/tee-shirt seul par temps froid
  if (env.cold && role === 'bottom' && warmthOf(g) <= 1) s -= 1.5;
  s -= (recencyPenalty(g, now) + proposedPenalty(g, proposed, now)) * 0.6; // rotation du dressing
  if (daysSince(g.lastWornAt, now) > 21) s += 0.3;
  s += dayJitter(g.id, now) * 0.6;
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
const fam = (g) => COLOR_TRAITS[g?.color?.id]?.family;
const mat = (g) => String(g?.material || '').toLowerCase();
/** Faut-il une cravate ? Codes habillés, ou classique avec veste. */
export function tieExpected(occasion, mode, p) {
  if (!p.top || !['chemise'].includes(p.top.sub)) return false;
  return occasion.formality[0] >= 4 || (occasion.target >= 4 && mode === 'classic' && !!p.layer);
}
/**
 * Accessoires : lunettes et montre connectée (portées tous les jours), montre classique pour le formel,
 * bracelet de montre assorti (cuir comme les chaussures, métal pour le formel, sport pour le décontracté), cravate si attendue.
 */
export function chooseAccessories(p, pool = [], occasion, mode) {
  const out = [];
  const form = outfitFormality({ ...p, accessories: [] }) ?? 3;
  // Lunettes et autres accessoires du quotidien (hors montres, gérées ci-dessous)
  for (const a of pool) if (isEveryday(a) && !['montre-connectee', 'montre'].includes(a.sub)) out.push(a);
  // Montre : classique si l'occasion est habillée et qu'on en possède une, sinon la montre connectée
  const classic = pool.filter((a) => a.sub === 'montre').sort(byId)[0];
  const smart = pool.filter((a) => a.sub === 'montre-connectee').sort(byId)[0];
  const watch = (form >= 4 && classic) ? classic : smart || classic;
  if (watch) out.push(watch);
  if (watch?.sub === 'montre-connectee') {
    const bands = pool.filter((a) => a.sub === 'bracelet-montre');
    if (bands.length) {
      const sf = fam(p.shoes);
      const score = (b) => {
        const m = mat(b); const leather = /cuir|daim/.test(m); const metal = /métal|metal|acier|milanais|titane|maillons/.test(m); const sport = /sport|silicone|fluoro|nylon|tissé|tisse|boucle/.test(m);
        let s2 = 0;
        if (form >= 3.5) s2 += metal ? 3 : leather ? 2.5 : sport ? -2 : 0;
        else if (form >= 2.5) s2 += leather ? 3 : metal ? 1.5 : sport ? 0 : 0.5;
        else s2 += sport ? 2 : leather ? 1 : 0.5;
        if (form >= 2.5 && leather && sf && ((fam(b) === 'black') === (sf === 'black'))) s2 += 1.5; // cuir assorti aux chaussures (tenues habillées)
        if (form >= 2.5 && leather && sf && ((fam(b) === 'black') !== (sf === 'black'))) s2 -= 1;
        return s2;
      };
      out.push([...bands].sort((a, b) => score(b) - score(a) || byId(a, b))[0]);
    }
  }
  // Cravate
  if (tieExpected(occasion, mode, p)) {
    const ties = pool.filter((a) => a.sub === 'cravate');
    const topHex = colorHex(p.top.color?.id);
    const score = (t) => (t.color?.id === p.top.color?.id ? -5 : 0) + (luminance(colorHex(t.color?.id)) < luminance(topHex) ? 2 : -1) + (['burgundy', 'navy', 'charcoal', 'chocolate'].includes(t.color?.id) ? 1 : 0) + (t.pattern && t.pattern !== 'Uni' && p.top.pattern && p.top.pattern !== 'Uni' ? -1 : 0);
    const tie = [...ties].sort((a, b) => score(b) - score(a) || byId(a, b))[0];
    if (tie) out.push(tie);
  }
  return out;
}

/** Explications des accessoires choisis. */
export function accessoryNotes(p, occasion, mode) {
  const notes = [];
  for (const a of p.accessories || []) {
    if (a.sub === 'bracelet-montre') notes.push(`Bracelet ${a.name.toLowerCase()} : ${/cuir|daim/.test(mat(a)) ? (fam(a) === 'black') === (fam(p.shoes) === 'black') ? 'cuir assorti aux chaussures' : 'cuir' : /métal|metal|acier|milanais|titane|maillons/.test(mat(a)) ? 'métal, sobre pour une tenue habillée' : 'adapté à une tenue décontractée'}.`);
    if (a.sub === 'cravate') notes.push(`Cravate ${a.color?.name?.toLowerCase() || ''} : plus sombre que la chemise, elle structure la tenue sans la surcharger.`);
    if (a.sub === 'lunettes-vue') notes.push(`Lunettes : monture ${a.color?.name?.toLowerCase() || ''}${fam(a) && fam(a) === fam(p.shoes) ? ', en écho au cuir des chaussures' : ''}.`);
  }
  if (tieExpected(occasion, mode, p) && !(p.accessories || []).some((a) => a.sub === 'cravate')) notes.push('Une cravate serait attendue pour cette occasion (aucune disponible dans le dressing).');
  return notes;
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
  const forcedNone = new Set(Object.entries(imposed).filter(([r, v]) => v === null && ['layer', 'outer'].includes(r)).map(([r]) => r)); // « sans veste » choisi
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
  if (occasion.workwear && !pools.shoes.length) info.missing.push({ role: 'shoes', text: 'Aucune paire fermée et antidérapante : des chaussures de travail (30–60 €) sont la pièce de sécurité du ménage.' });
  if (occasion.protection && !pools.shoes.length) info.missing.push({ role: 'shoes', text: 'Chaussures adaptées à l\'activité (randonnée, bottines) indispensables : sécurité avant le style.' });
  if (missingRoles.length) {
    missingRoles.forEach((r) => info.missing.push({ role: r, text: `Aucune pièce « ${ROLE_LABELS[r]} » disponible et compatible.` }));
    return { options: [], backup: null, info, combos: 0 };
  }
  const ctxBase = { occasion, env, prefs, now, proposed: input.proposed || null };
  const results = [];
  let combos = 0;
  const seen = new Set();
  for (const mode of looksFor(occasion).map((l) => l.mode)) { // styles choisis pour l'événement, du plus adapté au moins attendu
    const cand = (role, k) => (forced[role] ? [forced[role]] : topK(pools[role], (g) => unaryScore(g, role, mode, ctxBase), k));
    const tops = cand('top'); const bottoms = cand('bottom'); const shoes = cand('shoes');
    const layersAll = cand('layer', 3);
    const layerOpts = forcedNone.has('layer') ? [null] : forced.layer ? [forced.layer] : needsLayer(occasion) ? layersAll.filter((g) => garmentFormality(g) >= 4) : [null, ...layersAll];
    const outerOpts = forcedNone.has('outer') ? [null] : forced.outer ? [forced.outer] : needsOuter(env) && pools.outer.length ? cand('outer', 2) : env.mild && pools.outer.length ? [null, ...cand('outer', 2)] : [null];
    const scored = [];
    for (const top of tops) for (const bottom of bottoms) for (const sh of shoes) for (const layer of (layerOpts.length ? layerOpts : [null])) for (const outer of outerOpts) {
      if (layer && top && layer.id === top.id) continue;
      const belt = forced.belt || pickBelt(pools.belt, bottom, sh);
      const accessories = chooseAccessories({ top, bottom, layer, outer, shoes: sh, belt }, pools.accessory, occasion, mode);
      const pieces = { top, bottom, layer, outer, shoes: sh, belt, accessories };
      const sc = scoreOutfit(pieces, { ...ctxBase, mode, weather: env });
      const base = sc.normalized ?? 50;
      let rank = base;
      const bonus = [];
      const pieceList = [top, bottom, layer, outer, sh].filter(Boolean);
      const reuse = pieceList.filter((g) => daysSince(g.lastWornAt, now) > 14).length;
      if (reuse) { rank += reuse * 0.8; bonus.push(`+${(reuse * 0.8).toFixed(1)} réutilisation de pièces peu portées`); }
      const rec = pieceList.filter((g) => ['top', 'bottom', 'shoes'].includes(roleOf(g))).reduce((a, g) => a + recencyPenalty(g, now), 0);
      if (rec) { rank -= rec; bonus.push(`−${rec} pièces portées récemment (rotation)`); }
      const prop = pieceList.filter((g) => ['top', 'bottom', 'shoes'].includes(roleOf(g))).reduce((a, g) => a + proposedPenalty(g, input.proposed, now), 0);
      if (prop) { rank -= prop; bonus.push(`−${prop.toFixed(1)} déjà proposées ces derniers jours`); }
      rank += pieceList.reduce((a, g) => a + dayJitter(g.id, now), 0) * 1.2;
      if (env.cold) rank += [top, layer].filter(Boolean).reduce((a, g) => a + (warmthOf(g) - 2), 0) * 0.8;
      rank += styleRank(pieces, { mode, occasion, env, prefs }, sc) - base;
      if (prefs.likedCombos?.includes(comboKey(pieces))) { rank += 3; bonus.push('+3 tenue aimée'); }
      if (needsOuter(env) && !outer) { rank -= 4; bonus.push('−4 couche extérieure manquante'); }
      if (!needsOuter(env) && env.mild && outer) { const fit = env.feel < 14 && warmthOf(outer) <= 4 ? 1.5 : -2; rank += fit; if (fit > 0) bonus.push('+1.5 couche légère pour la fraîcheur'); }
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
  // « La pièce qui manque à cette tenue » (non possédée), sauf pour les calculs internes.
  if (!input.noUpgrade && !occasion.workwear) for (const o of options) o.upgrade = missingPieceFor(o, garments, { occasionId: occasion.id, weather, season: input.season, date: input.date || new Date(now), prefs });
  const distinct = new Set(options.map((o) => comboKey(o.pieces))).size;
  info.distinct = distinct;
  if (distinct < 3) info.note = `Le dressing disponible permet ${distinct} combinaison${distinct > 1 ? 's' : ''} réellement distincte${distinct > 1 ? 's' : ''} pour cette occasion (${combos} combinaisons évaluées).`;
  const backup = (env.rain || env.dropRisk || env.cold) && options[0] ? buildBackup(options[0], pools, env) : null;
  return { options, backup, info, combos };
}

const lowerFirst = (t) => String(t || '').charAt(0).toLowerCase() + String(t || '').slice(1);
function decorate(pick, { occasion, env, pools, list, ctxBase }) {
  const p = pick.pieces;
  const reasons = []; const warnings = []; const missing = [];
  const colorIds = [p.top, p.bottom, p.layer, p.outer, p.shoes].filter(Boolean).map((g) => g.color?.id).filter(Boolean);
  const h = classifyHarmony(colorIds);
  const day = new Date(ctxBase.now || Date.now()); const seed = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}|${comboKey(p)}`;
  const ex = explainOutfit(p, { occasion, env, mode: pick.mode, fitOf: (g) => occasionFit(g, occasion), seed });
  reasons.push(...ex.reasons);
  reasons.push(`Couleurs — ${lowerFirst(h.name)} : ${[...new Set(colorIds)].map(colorName).join(', ')}. ${h.text}`);
  const of = outfitFormality(p);
  if (of !== null && (of < occasion.formality[0] - 0.3 || of > occasion.formality[1] + 0.3)) reasons.push(`Niveau d'habillage ${of.toFixed(1)}/5 : un peu ${of < occasion.formality[0] ? 'en dessous' : 'au-dessus'} de ce qu'attend « ${occasion.name} » (${occasion.formality[0]}–${occasion.formality[1]}), faute de meilleure pièce disponible.`);
  if (env.rain && p.shoes && (p.shoes.rainResistance ?? 1) < 2) warnings.push('Pluie prévue : vos chaussures disponibles résistent peu à l\'eau. Privilégier une paire en cuir lisse avec semelle adaptée.');
  if (env.rain && p.outer && (p.outer.rainResistance ?? 0) < 2) warnings.push('Couche extérieure peu déperlante : prévoir un parapluie.');
  if (env.cold && !p.outer) warnings.push('Froid : aucune couche extérieure disponible dans le dressing.');
  if (occasion.strict) warnings.push('Dress code : les codes explicites de l\'événement priment sur cette proposition.');
  reasons.push(...accessoryNotes(p, occasion, pick.mode));
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
  return { ...pick, mode: pick.mode, title: ex.title, idea: ex.idea, reasons, warnings, missing, alternatives, harmony: h, palette: [...new Set(colorIds)] };
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
    const r = recommend({ garments: [...garments, g], occasionId: occ, imposed: { [role]: g.id }, season: hypo.season, noUpgrade: true });
    const keys = new Set(r.options.filter((o) => (o.score.normalized ?? 0) >= 60).map((o) => comboKey(o.pieces)));
    count += keys.size;
  }
  return count;
}

/** Sous-catégorie de l'app pour une pièce de la capsule (« col roulé » → col-roule). */
const hexDist = (a, b) => { const x = hexToRgb(colorHex(a)); const y = hexToRgb(colorHex(b)); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
const CAPSULE_SUB = { 'col roulé': 'col-roule' };
const ROLE_NAME = { top: 'le haut', bottom: 'le bas', layer: 'la veste', outer: 'le manteau', shoes: 'les chaussures' };
/**
 * « La pièce qui manque à cette tenue » : parmi les pièces de la capsule que l'on ne possède pas,
 * celle qui améliorerait le plus cette tenue pour cette occasion (remplacement ou ajout d'une veste/d'un manteau).
 * Pur et rapide : une évaluation par pièce candidate, pas de nouvelle recherche de combinaisons.
 * @returns {null | {item, role, replaces, before, after, gain, text}}
 */
export function missingPieceFor(option, garments = [], { occasionId = 'daily', weather = null, season, date, prefs = {}, minGain = 4 } = {}) {
  if (!option?.pieces) return null;
  const occasion = OCCASION_BY_ID[occasionId] || OCCASION_BY_ID.daily;
  const env = buildEnv({ weather, season, date: date || new Date(), prefs });
  const mode = option.mode || 'italian';
  const ctx = { mode, occasion, env, prefs };
  const owned = new Set(garments.map((g) => `${g.sub}|${g.color?.id}`));
  const before = styleRank(option.pieces, ctx);
  let best = null;
  const kit = occasion.workwear ? workKitStatus(garments) : null;
  for (const c of occasion.workwear ? WORK_KIT : CAPSULE) {
    if (!['top', 'bottom', 'layer', 'outer', 'shoes'].includes(c.role)) continue;
    const sub = CAPSULE_SUB[c.sub] || c.sub;
    if (kit) { if (kit.find((k) => k.item.id === c.id).ok) continue; } else
    if (owned.has(`${sub}|${c.color}`)) continue;
    // Quasi-doublon : même type dans une teinte très proche (noir/anthracite), ou un manteau de plus.
    if (!kit && garments.some((x) => x.sub === sub && (c.role === 'outer' || hexDist(x.color?.id, c.color) < 70))) continue;
    const g = { id: `__capsule_${c.id}`, name: c.name, category: c.category, sub, color: { id: c.color }, material: c.material, availability: 'clean' };
    // Mêmes contraintes que pour le dressing réel (saison, météo, formalité de l'occasion).
    const { pools } = hardFilter([g], { occasion, env });
    if (!pools[c.role].length) continue;
    if (c.role === 'outer' && !needsOuter(env)) continue;
    const old = option.pieces[c.role] || null;
    if (old && old.sub === sub && old.color?.id === c.color) continue;
    const pieces = { ...option.pieces, [c.role]: g };
    if (c.role === 'layer' && pieces.top && pieces.top.id === g.id) continue;
    const after = styleRank(pieces, ctx);
    const gain = after - before;
    if (gain >= minGain && (!best || gain > best.gain)) best = { item: c, role: c.role, replaces: old, before, after, gain, pieces };
  }
  if (!best) return null;
  const sc0 = option.score?.normalized; const sc1 = scoreOutfit(best.pieces, { occasion, env, prefs, mode, weather: env }).normalized;
  const why = [];
  if (!best.replaces && ['layer', 'outer'].includes(best.role)) why.push((tasteOf(occasion).layer || 0) > 0 && best.role === 'layer' ? `une veste est attendue pour « ${occasion.name} »` : 'elle complète la tenue');
  if (best.replaces && occasionFit({ sub: best.pieces[best.role].sub, color: best.pieces[best.role].color }, occasion) > (best.replaces ? occasionFit(best.replaces, occasion) : 0)) why.push(`plus juste pour « ${occasion.name} »`);
  if (sc0 != null && sc1 > sc0) why.push(`note ${sc0} → ${sc1}/100`);
  const text = `${best.replaces ? `À la place de ${best.replaces.name.toLowerCase()}` : `En ajoutant ${ROLE_NAME[best.role]}`}${why.length ? ` : ${why.join(', ')}` : ''}.`;
  return { item: best.item, role: best.role, replaces: best.replaces, gain: Math.round(best.gain * 10) / 10, scoreBefore: sc0 ?? null, scoreAfter: sc1 ?? null, text };
}
