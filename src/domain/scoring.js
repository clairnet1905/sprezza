// Grille B18 sur 100 : coupe/proportions 25, couleurs 20, raffinement 20, style 10, occasion 10, chaussures/accessoires 10, présentation 5.
// Un critère non évaluable vaut null et n'est jamais complété artificiellement.
import { GRID } from '../data/guide.js';
import { NOBLE_MATERIALS, CONDITIONS, SUB_INFO } from '../data/taxonomy.js';
import { COLOR_TRAITS } from '../data/colors.js';
import { paletteNote, classifyHarmony } from './colors.js';

export const COVERAGE_THRESHOLD = 70;
export const GRID_MAX = Object.fromEntries(GRID.map((c) => [c.id, c.max]));

const FIT_VALUE = { regular: 1, tapered: 1, slim: 0.75, relaxed: 0.85, oversize: 0.55 };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round1 = (v) => Math.round(v * 10) / 10;

export const MODE_STYLES = {
  italian: ['italian', 'smart-casual', 'quiet', 'mediterranean'],
  classic: ['business-casual', 'british', 'ivy', 'business-formal', 'sartorial', 'french', 'old-money', 'japanese'],
  modern: ['casual-chic', 'contemporary', 'scandi', 'smart-casual'],
};

/** Affinité d'une sous-catégorie avec chaque mode de proposition. */
export const SUB_AFFINITY = {
  polo: { italian: 2, classic: 0.5, modern: 0.5 }, 'polo-sport': { italian: 0, classic: 0, modern: 1 }, chemise: { italian: 1, classic: 2, modern: 0.5 }, 'chemise-lin': { italian: 2, classic: 0.5, modern: 1 },
  pull: { italian: 1.2, classic: 1, modern: 1 }, 'col-roule': { italian: 1.5, classic: 0.5, modern: 1.5 }, cardigan: { italian: 1, classic: 1, modern: 0.5 }, 'tee-shirt': { italian: -1, classic: -1.5, modern: 2 },
  sweat: { italian: -2, classic: -2, modern: 1 }, polaire: { italian: -2, classic: -2, modern: 0.5 },
  pantalon: { italian: 2, classic: 2, modern: 0 }, 'pantalon-costume': { italian: 0.5, classic: 1.5, modern: -1 }, chino: { italian: 1.2, classic: 1.5, modern: 1 }, jean: { italian: 0, classic: 0.3, modern: 2 },
  flanelle: { italian: 1, classic: 2, modern: 0 }, bermuda: { italian: 1, classic: 0.5, modern: 1 }, short: { italian: -0.5, classic: -1, modern: 1 }, jogging: { italian: -2, classic: -2, modern: 0.5 }, 'pantalon-technique': { italian: -1, classic: -1, modern: 0.5 }, jupe: { italian: 1, classic: 1, modern: 1 },
  blazer: { italian: 1.5, classic: 2, modern: 0.5 }, 'veste-costume': { italian: 1, classic: 1.5, modern: -0.5 }, surchemise: { italian: 0.8, classic: 0, modern: 2 }, 'veste-daim': { italian: 1.5, classic: 0.5, modern: 1.5 },
  'veste-cuir': { italian: 0.5, classic: 0, modern: 1.5 }, 'veste-denim': { italian: -0.5, classic: -0.5, modern: 1.5 }, 'veste-technique': { italian: -1, classic: -1, modern: 0.5 }, 'cardigan-epais': { italian: 0.5, classic: 0.5, modern: 1 },
  manteau: { italian: 1.5, classic: 1.5, modern: 0.8 }, trench: { italian: 1, classic: 1.5, modern: 1 }, caban: { italian: 1, classic: 1, modern: 1 }, parka: { italian: -0.5, classic: -0.5, modern: 1 }, doudoune: { italian: -1, classic: -1, modern: 0.8 }, impermeable: { italian: 0, classic: 0, modern: 1 },
  mocassins: { italian: 2, classic: 1, modern: 0.3 }, derbies: { italian: 1, classic: 2, modern: 0.8 }, richelieus: { italian: 0.5, classic: 2, modern: -1 }, chelsea: { italian: 1, classic: 0.8, modern: 1.5 }, bottines: { italian: 0.8, classic: 0.8, modern: 1.5 },
  baskets: { italian: -0.5, classic: -1, modern: 2 }, espadrilles: { italian: 1, classic: -0.5, modern: 1 }, sandales: { italian: -0.5, classic: -1, modern: 1 }, bateau: { italian: 0.5, classic: 1, modern: 0.5 }, randonnee: { italian: -1, classic: -1, modern: 0 }, ballerines: { italian: 1, classic: 1, modern: 1 },
};

export function garmentFormality(g) {
  if (g?.formality) return g.formality;
  return SUB_INFO[g?.sub]?.formality ?? 3;
}
export function garmentStyles(g) {
  if (g.styles?.length) return g.styles;
  const aff = SUB_AFFINITY[g.sub] || {};
  return Object.entries(aff).filter(([, v]) => v >= 1).flatMap(([mode]) => MODE_STYLES[mode]);
}
function isNoble(material) {
  const m = String(material || '').toLowerCase();
  return NOBLE_MATERIALS.some((n) => m.includes(n));
}
export function outfitFormality(p) {
  const parts = [p.top, p.bottom, p.layer, p.shoes].filter(Boolean).map(garmentFormality);
  if (!parts.length) return null;
  const tie = (p.accessories || []).some((a) => a.sub === 'cravate') ? 0.5 : 0;
  return clamp(parts.reduce((a, b) => a + b, 0) / parts.length + (p.layer ? 0.3 : 0) + tie, 1, 5);
}

/**
 * Évalue une tenue composée de pièces du dressing.
 * @returns {{criteria: Array, score100: number|null, scoreRange: [number,number]|null, assessedWeight: number, score10: number|null}}
 */
export function scoreOutfit(p, ctx = {}) {
  const main = [p.top, p.bottom, p.layer, p.outer].filter(Boolean);
  const all = [...main, p.shoes, p.belt, ...(p.accessories || [])].filter(Boolean);
  const crit = {};
  const reasons = {};

  // 1. Coupe et proportions (estimée à partir des informations saisies, jamais « observée »)
  const fits = main.filter((g) => g.fit);
  if (fits.length) {
    const disliked = ctx.prefs?.dislikedFit || {};
    const vals = fits.map((g) => (disliked[g.id] ? 0.35 : FIT_VALUE[g.fit] ?? 0.8));
    crit.fit = (vals.reduce((a, b) => a + b, 0) / vals.length) * 25;
    reasons.fit = `Estimée à partir des coupes saisies (${fits.length}/${main.length} pièces) ; non observée sans photo portée.`;
  } else { crit.fit = null; reasons.fit = 'Coupe non renseignée : critère non évaluable sans photo portée ni information de coupe.'; }

  // 2. Couleurs
  const ids = { top: p.top?.color?.id, bottom: p.bottom?.color?.id, jacket: (p.layer || p.outer)?.color?.id, shoe: p.shoes?.color?.id, belt: p.belt?.color?.id };
  if (ids.top && ids.bottom) {
    const pn = paletteNote(ids);
    let s = ((pn.note - 5) / 5) * 20;
    const patterned = all.filter((g) => g.pattern && g.pattern !== 'Uni').length;
    if (patterned > 1) s -= 2 * (patterned - 1);
    crit.colors = clamp(s, 0, 20);
    const h = classifyHarmony(Object.values(ids));
    reasons.colors = `${h.name} — ${pn.notes[0] || h.text}${patterned > 1 ? ' Plusieurs motifs : une pièce dominante suffit.' : ''}`;
  } else { crit.colors = null; reasons.colors = 'Couleurs du haut ou du bas inconnues.'; }

  // 3. Élégance et raffinement : cohérence de formalité + matières (si connues) + motifs/logos
  const forms = [p.top, p.bottom, p.layer, p.shoes].filter(Boolean).map(garmentFormality);
  if (forms.length >= 2) {
    const mean = forms.reduce((a, b) => a + b, 0) / forms.length;
    const spread = Math.sqrt(forms.reduce((a, b) => a + (b - mean) ** 2, 0) / forms.length);
    const coherence = clamp(1 - spread / 1.6, 0, 1);
    const withMat = all.filter((g) => g.material);
    const matScore = withMat.length ? withMat.filter((g) => isNoble(g.material)).length / withMat.length : null;
    const logos = all.some((g) => (g.tags || []).some((t) => /logo/i.test(t)));
    const v = matScore === null ? coherence : 0.55 * coherence + 0.45 * (0.5 + matScore / 2);
    crit.refinement = clamp(v * 20 - (logos ? 3 : 0), 0, 20);
    reasons.refinement = `Cohérence de formalité ${Math.round(coherence * 100)} %${matScore === null ? ' (matières non renseignées)' : `, matières nobles ${Math.round(matScore * 100)} %`}${logos ? ', logo visible signalé' : ''}.`;
  } else { crit.refinement = null; reasons.refinement = 'Trop peu de pièces pour évaluer.'; }

  // 4. Cohérence du style
  const target = ctx.mode ? MODE_STYLES[ctx.mode] : ctx.targetStyles;
  if (target?.length && main.length) {
    const pieces = [p.top, p.bottom, p.layer, p.shoes].filter(Boolean);
    const ok = pieces.filter((g) => garmentStyles(g).some((s) => target.includes(s))).length;
    crit.style = (ok / pieces.length) * 10;
    reasons.style = `${ok}/${pieces.length} pièces cohérentes avec le style visé.`;
  } else { crit.style = null; reasons.style = 'Aucun style cible défini.'; }

  // 5. Adaptation à l'occasion
  const occ = ctx.occasion;
  const of = outfitFormality(p);
  if (occ && of !== null) {
    const target = clamp(occ.target + (ctx.prefs?.formalityBias || 0), occ.formality[0], occ.formality[1]);
    let s = 10 - Math.abs(of - target) * 3.2;
    if (occ.strict && of < occ.formality[0] - 0.25) s = Math.min(s, 2);
    crit.occasion = clamp(s, 0, 10);
    reasons.occasion = `Formalité ${round1(of)}/5 pour une cible ${round1(target)}/5 (${occ.name})${occ.strict ? ', dress code à respecter' : ''}.`;
  } else { crit.occasion = null; reasons.occasion = 'Occasion non définie.'; }

  // 6. Chaussures et accessoires
  if (p.shoes) {
    let s = 10 - Math.abs(garmentFormality(p.shoes) - (of ?? 3)) * 2.5;
    const notes = [];
    if (ctx.weather?.rain && (p.shoes.rainResistance ?? 1) < 2) { s -= 3; notes.push('peu adaptées à la pluie'); }
    if (p.belt) {
      const sf = COLOR_TRAITS[p.shoes.color?.id]?.family; const bf = COLOR_TRAITS[p.belt.color?.id]?.family;
      if (sf && bf && (sf === 'black') !== (bf === 'black')) { s -= 1.5; notes.push('ceinture et chaussures de cuirs différents'); }
      else notes.push('ceinture harmonisée');
    }
    const extra = (p.accessories || []).filter((a) => !['lunettes-vue', 'montre', 'montre-connectee', 'bracelet-montre'].includes(a.sub));
    if (extra.length > 2) { s -= 2; notes.push('accessoires nombreux'); }
    if ((p.accessories || []).some((a) => a.sub === 'montre-connectee') && (outfitFormality(p) ?? 3) >= 4.5) notes.push('montre connectée : un bracelet cuir ou métal la rend plus discrète');
    crit.shoes = clamp(s, 0, 10);
    reasons.shoes = notes.length ? `Chaussures ${notes.join(', ')}.` : 'Chaussures cohérentes avec la formalité.';
  } else { crit.shoes = null; reasons.shoes = 'Aucune paire disponible : critère non évaluable.'; }

  // 7. Présentation générale (état connu)
  const cond = all.filter((g) => g.condition);
  if (cond.length) {
    const map = Object.fromEntries(CONDITIONS.map(([id, , v]) => [id, v]));
    const avg = cond.reduce((a, g) => a + (map[g.condition] ?? 4), 0) / cond.length;
    const wornPenalty = all.some((g) => g.availability === 'worn') ? 0.5 : 0;
    crit.presentation = clamp(avg - wornPenalty, 0, 5);
    reasons.presentation = `État renseigné pour ${cond.length}/${all.length} pièces${wornPenalty ? ' ; une pièce déjà portée' : ''}.`;
  } else { crit.presentation = null; reasons.presentation = 'État des pièces non renseigné.'; }

  return finalizeCriteria(crit, reasons, { estimated: { fit: true, presentation: true } });
}

/** Construit la structure de sortie commune (moteur local et IA) à partir des scores bruts. */
export function finalizeCriteria(crit, reasons = {}, { estimated = {}, threshold = COVERAGE_THRESHOLD } = {}) {
  const criteria = GRID.map((c) => {
    const raw = crit[c.id];
    const score = raw === null || raw === undefined || Number.isNaN(raw) ? null : round1(clamp(raw, 0, c.max));
    return { id: c.id, name: c.name, max: c.max, score, reason: reasons[c.id] || '', estimated: !!estimated[c.id] && score !== null };
  });
  const assessed = criteria.filter((c) => c.score !== null);
  const assessedWeight = assessed.reduce((a, c) => a + c.max, 0);
  const got = assessed.reduce((a, c) => a + c.score, 0);
  const missing = 100 - assessedWeight;
  const normalized = assessedWeight ? Math.round((got / assessedWeight) * 100) : null;
  const precise = assessedWeight >= threshold;
  return {
    criteria,
    assessedWeight,
    score100: precise ? normalized : null,
    scoreRange: assessedWeight && !precise ? [Math.round(got), Math.round(got + missing)] : null,
    normalized,
    score10: precise && normalized !== null ? round1(normalized / 10) : null,
  };
}
