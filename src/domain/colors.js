// Règles pures de colorimétrie : suggestPalette, harmonies, couleur la plus proche.
import {
  ALL_COLORS, COLOR_BY_ID, COLOR_TRAITS, ORIGINAL_MATRIX, MATRIX_BASE_IDS, ADDED_BOTTOM_RULES, PALETTES_20, DEFAULT_BELT_FOR_SHOE,
} from '../data/colors.js';

export const HEX_RE = /^#[0-9A-F]{6}$/i;

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrastRatio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
/** Couleur de texte lisible sur un fond donné. */
export function inkOn(hex) { return contrastRatio(hex, '#161719') >= contrastRatio(hex, '#FFFFFF') ? '#161719' : '#FFFFFF'; }

function rgbToLab([r, g, b]) {
  const f = (c) => { c /= 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92; };
  const [R, G, B] = [f(r), f(g), f(b)];
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let y = (R * 0.2126 + G * 0.7152 + B * 0.0722);
  let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const g3 = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  [x, y, z] = [g3(x), g3(y), g3(z)];
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
export function deltaE(hexA, hexB) {
  const a = rgbToLab(hexToRgb(hexA)); const b = rgbToLab(hexToRgb(hexB));
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
/** Couleur nommée la plus proche. La proximité numérique n'est pas une certitude stylistique. */
export function nearestColor(hex, pool = ALL_COLORS) {
  if (!HEX_RE.test(hex)) return null;
  let best = null;
  for (const c of pool) { const d = deltaE(hex, c.hex); if (!best || d < best.distance) best = { ...c, distance: d }; }
  best.confidence = best.distance < 8 ? 'élevée' : best.distance < 18 ? 'moyenne' : 'faible';
  return best;
}
export function colorIdFromHex(hex) {
  const exact = ALL_COLORS.find((c) => c.hex.toUpperCase() === String(hex).toUpperCase());
  return exact ? exact.id : nearestColor(hex)?.id;
}
export function colorName(id) { return COLOR_BY_ID[id]?.name || id; }
export function colorHex(id) { return COLOR_BY_ID[id]?.hex || '#999999'; }

const entry = (id, extra = {}) => ({ id, name: COLOR_BY_ID[id].name, hex: COLOR_BY_ID[id].hex, ...extra });

/** Table des bas disponibles : matrice originale (comportement exact) + règles ajoutées. */
export function bottomTable() {
  const rows = ORIGINAL_MATRIX.map((m) => {
    const id = MATRIX_BASE_IDS[m.name];
    const tops = m.tops.map(([name, hex], i) => ({ id: colorIdFromHex(hex), name, hex, rank: i }));
    const jacket = { id: colorIdFromHex(m.jacket[1]), name: m.jacket[0], hex: m.jacket[1] };
    const shoe = { id: colorIdFromHex(m.shoe[1]), name: m.shoe[0], hex: m.shoe[1] };
    return { id, name: m.name, hex: m.hex, tops, jacket, shoe, origin: 'matrix' };
  });
  for (const [id, r] of Object.entries(ADDED_BOTTOM_RULES)) {
    rows.push({ id, name: COLOR_BY_ID[id].name, hex: COLOR_BY_ID[id].hex, tops: r.tops.map((t, i) => entry(t, { rank: i })), jacket: entry(r.jacket), shoe: entry(r.shoe), belt: entry(r.belt), origin: 'rule', why: r.why });
  }
  return rows;
}
const BOTTOMS = bottomTable();
export const BOTTOM_IDS = BOTTOMS.map((b) => b.id);

function seasonFit(id, season) {
  const t = COLOR_TRAITS[id] || {};
  const light = luminance(colorHex(id)) > 0.45;
  if (season === 'summer') return light ? 1 : t.family === 'black' || id === 'charcoal' ? -1 : 0;
  if (season === 'winter' || season === 'autumn') return ['chocolate', 'camel', 'olive', 'burgundy', 'charcoal', 'navy', 'ecru'].includes(id) ? 1 : id === 'white' ? -0.5 : 0;
  return 0;
}

/**
 * Fonction pure du générateur de couleurs.
 * @param {string} baseColorId identifiant de couleur (ex. 'beige')
 * @param {'bottom'|'top'} category 'bottom' = partir du pantalon (matrice), 'top' = association inverse (partir de mon haut)
 * @param {{season?:string, contrast?:'low'|'high', ownedColors?:Record<string,string[]>, sort?:'original'|'context'}} context
 */
export function suggestPalette(baseColorId, category = 'bottom', context = {}) {
  const base = COLOR_BY_ID[baseColorId];
  if (!base) throw new Error(`Couleur inconnue : ${baseColorId}`);
  const owned = context.ownedColors || {};
  const scoreItem = (item, role) => {
    let s = 0; const reasons = [];
    if (context.season) { const f = seasonFit(item.id, context.season); s += f; if (f > 0) reasons.push('adapté à la saison'); if (f < 0) reasons.push('moins adapté à la saison'); }
    const c = contrastRatio(item.hex, base.hex);
    if (context.contrast === 'high') s += c > 4 ? 1 : 0;
    if (context.contrast === 'low') s += c < 2.2 ? 1 : 0;
    reasons.push(c > 4 ? 'contraste marqué' : c < 2.2 ? 'contraste doux (camaïeu)' : 'contraste modéré');
    if ((owned[role] || []).includes(item.id)) { s += 1.5; reasons.push('présent dans mon dressing'); }
    return { ...item, contextScore: s, reasons };
  };

  if (category === 'bottom') {
    const row = BOTTOMS.find((b) => b.id === baseColorId);
    let tops = row.tops.map((t) => scoreItem(t, 'top'));
    if (context.sort === 'context') tops = [...tops].sort((a, b) => b.contextScore - a.contextScore || a.rank - b.rank);
    const topIds = new Set(tops.map((t) => t.id));
    const lessSuited = ALL_COLORS.filter((c) => !topIds.has(c.id) && c.id !== baseColorId && !c.aux)
      .map((c) => ({ ...entry(c.id), why: lessSuitedReason(c.id, baseColorId) }));
    const belt = row.belt || entry(DEFAULT_BELT_FOR_SHOE[row.shoe.id] || 'chocolate');
    return { base: entry(baseColorId), category, origin: row.origin, why: row.why || null, tops, jacket: row.jacket, shoe: row.shoe, belt, lessSuited };
  }

  // Association inverse : bas compatibles avec ce haut
  const matches = [];
  for (const b of BOTTOMS) {
    const t = b.tops.find((x) => x.id === baseColorId);
    if (t) matches.push({ ...entry(b.id), name: b.name, hex: b.hex, rank: t.rank + (b.origin === 'rule' ? 5 : 0), origin: b.origin, jacket: b.jacket, shoe: b.shoe });
  }
  matches.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  let bottoms = matches.map((m) => scoreItem(m, 'bottom'));
  if (context.sort === 'context') bottoms = [...bottoms].sort((a, b) => b.contextScore - a.contextScore || a.rank - b.rank);
  const first = bottoms[0];
  return {
    base: entry(baseColorId), category, origin: 'reverse', bottoms,
    jacket: first?.jacket || null, shoe: first?.shoe || null,
    belt: first ? entry(DEFAULT_BELT_FOR_SHOE[first.shoe.id] || 'chocolate') : null,
    lessSuited: [],
  };
}

export function lessSuitedReason(topId, bottomId) {
  const a = COLOR_TRAITS[topId] || {}; const b = COLOR_TRAITS[bottomId] || {};
  if (topId === bottomId) return 'Ton sur ton strict : possible si les textures diffèrent nettement.';
  if (a.family === b.family) return 'Même famille de couleur : risque de manque de séparation ; varier les textures.';
  if ((topId === 'black' && b.family === 'brown') || (bottomId === 'black' && a.family === 'brown')) return 'Noir et brun : association possible mais plus délicate dans un vestiaire classique.';
  if (!a.neutral && !b.neutral) return 'Deux couleurs affirmées : elles se concurrencent, à réserver aux tenues maîtrisées.';
  if (contrastRatio(colorHex(topId), colorHex(bottomId)) > 12) return 'Contraste très dur : possible mais moins dans l\'esprit italien doux.';
  return 'Association possible, mais non retenue parmi les conseils prioritaires pour l\'objectif classique.';
}

/** Type d'harmonie d'une sélection (monochrome, camaïeu, contraste, complémentaire atténuée…). */
export function classifyHarmony(ids) {
  const list = ids.filter(Boolean);
  if (list.length < 2) return { id: 'single', name: 'Couleur unique', text: 'Ajouter une seconde pièce pour évaluer l\'harmonie.' };
  const fam = list.map((id) => COLOR_TRAITS[id]?.family);
  const lum = list.map((id) => luminance(colorHex(id)));
  const spread = Math.max(...lum) - Math.min(...lum);
  const hasBlue = fam.includes('blue'); const hasWarmBrown = list.some((id) => ['cognac', 'camel', 'chocolate', 'suede-brown', 'dark-brown', 'taupe'].includes(id));
  if (new Set(fam).size === 1) return { id: 'monochrome', name: 'Monochrome', text: 'Continuité d\'une couleur : la profondeur vient des textures.' };
  const warmNeutrals = fam.every((f) => ['cream', 'brown', 'white'].includes(f));
  if (warmNeutrals && spread < 0.65) return { id: 'camaieu', name: 'Camaïeu', text: 'Nuances proches : varier maille, lin, daim pour la profondeur.' };
  if (hasBlue && hasWarmBrown) return { id: 'complementary', name: 'Complémentaire atténuée', text: 'Bleu et brun-orangé atténués (marine/cognac, marine/camel) : équilibre chaud/froid.' };
  if (spread >= 0.45) return { id: 'contrast', name: 'Contraste', text: 'Séparation nette entre clair et foncé, comme marine avec crème.' };
  return { id: 'soft', name: 'Contraste modéré', text: 'Neutres associés avec un contraste mesuré.' };
}

/** Note indicative /10 d'une association (pas un score d'élégance de la personne). */
/**
 * Accord haut/bas hors des listes de la matrice : on raisonne avec les principes (neutres, contraste, couleurs affirmées)
 * au lieu de pénaliser d'office une association correcte (ex. pull taupe sur chino beige).
 */
function genericPair(top, bottom, notes) {
  const tt = COLOR_TRAITS[top] || {}; const bt = COLOR_TRAITS[bottom] || {};
  const lt = luminance(colorHex(top)); const lb = luminance(colorHex(bottom));
  const ratio = (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05);
  if (top === bottom) { notes.push('Même couleur en haut et en bas : un camaïeu demande des matières différentes.'); return -0.2; }
  if (tt.neutral && bt.neutral) {
    if (ratio >= 1.6) { notes.push('Deux neutres bien contrastés : association sûre.'); return 0.5; }
    notes.push('Deux neutres proches : camaïeu doux, jouer sur les matières.'); return 0.3;
  }
  if (tt.neutral || bt.neutral) { notes.push('Une couleur affirmée équilibrée par un neutre.'); return ratio >= 1.4 ? 0.3 : 0.1; }
  notes.push('Haut absent des conseils prioritaires pour ce bas.'); return -0.6;
}

export function paletteNote({ bottom, top, jacket, shoe, belt }) {
  const ids = [top, bottom, jacket, shoe].filter(Boolean);
  const hexes = new Set(ids.map((id) => colorHex(id).toUpperCase()));
  const matched = PALETTES_20.filter((p) => p.hex.filter((h) => hexes.has(h.toUpperCase())).length >= 3 || (ids.length <= 3 && p.hex.every((h) => hexes.has(h.toUpperCase()))));
  const notes = [];
  let n = 8.4;
  // Bas hors table (nouvelles couleurs, denim indigo…) : on prend la ligne de la couleur la plus proche.
  const dist = (a, b) => { const x = hexToRgb(colorHex(a)); const y = hexToRgb(colorHex(b)); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
  let row = BOTTOMS.find((b) => b.id === bottom);
  if (!row && bottom) { const near = [...BOTTOMS].sort((a, b) => dist(a.id, bottom) - dist(b.id, bottom))[0]; if (near && dist(near.id, bottom) < 60) row = near; }
  if (row && top) {
    let t = row.tops.find((x) => x.id === top);
    let approx = false;
    if (!t) { const near = row.tops.filter((x) => x.id).sort((a, b) => dist(a.id, top) - dist(b.id, top))[0]; if (near && dist(near.id, top) < 45) { t = near; approx = true; } }
    if (t) { n += 0.9 - t.rank * 0.1 - (approx ? 0.2 : 0); notes.push(`Haut conseillé n° ${t.rank + 1} pour ce bas (${row.origin === 'matrix' ? 'matrice du guide' : 'règle ajoutée'}${approx ? ', teinte proche' : ''}).`); }
    else n += genericPair(top, bottom, notes);
    if (shoe && row.shoe.id === shoe) { n += 0.3; notes.push('Chaussures recommandées par la matrice.'); }
    if (jacket && row.jacket.id === jacket) { n += 0.2; notes.push('Veste recommandée par la matrice.'); }
  } else if (top && bottom) n += genericPair(top, bottom, notes);
  const nonNeutral = ids.filter((id) => COLOR_TRAITS[id] && !COLOR_TRAITS[id].neutral);
  if (nonNeutral.length > 1) { n -= 0.4 * (nonNeutral.length - 1); notes.push('Plusieurs couleurs affirmées : elles se concurrencent.'); }
  if (shoe && belt) {
    const sf = COLOR_TRAITS[shoe]?.family; const bf = COLOR_TRAITS[belt]?.family;
    if ((sf === 'black') !== (bf === 'black')) { n -= 0.3; notes.push('Ceinture et chaussures de familles différentes (repère formel, pas une obligation).'); }
  }
  if (matched.length) { const best = Math.max(...matched.map((p) => p.note)); n = Math.max(n, best); notes.push(`Correspond à la palette n° ${matched[0].n} « ${matched[0].name} » (${String(best).replace('.', ',')}/10).`); }
  return { note: Math.round(Math.max(5, Math.min(9.9, n)) * 10) / 10, notes, matched: matched.map((p) => p.n) };
}

export function isValidHex(h) { return HEX_RE.test(h); }
