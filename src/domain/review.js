// Polyvalence et revue du dressing : règles pures, explicables, testables.
// Le verdict est une suggestion argumentée ; la décision appartient toujours à l'utilisateur.
import { roleOf } from './recommend.js';
import { garmentFormality } from './scoring.js';
import { paletteNote } from './colors.js';
import { COLOR_TRAITS } from '../data/colors.js';

const MIN_NOTE = 8.2; // association de couleurs jugée « bonne » par la grille couleur
const neutral = (id) => !!COLOR_TRAITS[id]?.neutral;
/** Bonne association : conseillée par la matrice, ou deux neutres sans couleur concurrente (ex. anthracite + gris). */
const goodColors = (ids) => { const n = paletteNote(ids).note; return n >= MIN_NOTE || (neutral(ids.top) && neutral(ids.bottom) && n >= 7.6); };
const okFormality = (...gs) => { const f = gs.map(garmentFormality); return Math.max(...f) - Math.min(...f) <= 2; };

/**
 * Nombre de tenues de base (haut + bas + chaussures, avec ou sans veste) auxquelles chaque pièce participe.
 * @returns {Record<string, number|null>} null pour les pièces non concernées (ceinture, accessoires)
 */
export function versatility(garments) {
  const by = { top: [], bottom: [], shoes: [], layer: [], outer: [] };
  for (const g of garments) { const r = roleOf(g); if (by[r]) by[r].push(g); }
  const count = Object.fromEntries(garments.map((g) => [g.id, ['top', 'bottom', 'shoes', 'layer', 'outer'].includes(roleOf(g)) ? 0 : null]));
  const combos = [];
  for (const t of by.top) for (const b of by.bottom) {
    if (!t.color?.id || !b.color?.id || !okFormality(t, b)) continue;
    for (const s of by.shoes) {
      if (!okFormality(t, b, s)) continue;
      if (!goodColors({ top: t.color.id, bottom: b.color.id, shoe: s.color?.id })) continue;
      combos.push([t, b, s]);
      count[t.id]++; count[b.id]++; count[s.id]++;
    }
  }
  for (const j of [...by.layer, ...by.outer]) {
    for (const [t, b, s] of combos) {
      if (!okFormality(t, b, j)) continue;
      if (goodColors({ top: t.color.id, bottom: b.color.id, shoe: s.color?.id, jacket: j.color?.id })) count[j.id]++;
    }
  }
  return count;
}

export const VERDICTS = {
  key: { label: 'Pièce clé', tone: 'tag-gold' },
  keep: { label: 'Garder', tone: 'tag-ok' },
  alter: { label: 'Retoucher / entretenir', tone: 'tag-warn' },
  think: { label: 'À réfléchir', tone: '' },
  give: { label: 'Donner ou vendre', tone: 'tag-danger' },
};

/**
 * Verdict suggéré pour une pièce.
 * @param {object} g vêtement
 * @param {{versatility:number|null, keyThreshold:number, dislikedFit?:Record<string,string>, total:number, now?:number}} ctx
 */
export function reviewGarment(g, { versatility: v, keyThreshold = 6, dislikedFit = {}, total = 0, now = Date.now() }) {
  const reasons = []; const missing = [];
  const days = (iso) => (iso ? Math.floor((now - new Date(iso).getTime()) / 864e5) : null);
  const sinceWorn = days(g.lastWornAt); const age = days(g.createdAt || g.purchaseDate);
  if (!g.condition) missing.push('état');
  if (!g.fit && ['top', 'bottom', 'layer', 'outer'].includes(roleOf(g))) missing.push('coupe');
  if (v !== null && v !== undefined) reasons.push(v === 0 ? 'Aucune tenue complète possible avec le reste du dressing' : `Participe à ${v} tenue${v > 1 ? 's' : ''} possible${v > 1 ? 's' : ''}`);
  if (g.wearCount) reasons.push(`Portée ${g.wearCount} fois${sinceWorn !== null ? `, la dernière il y a ${sinceWorn} jour${sinceWorn > 1 ? 's' : ''}` : ''}`);
  else if (age !== null && age > 60) reasons.push('Jamais portée depuis son ajout');

  let verdict = 'keep';
  const versatile = v !== null && v !== undefined && v >= 3;
  if (g.availability === 'alteration') { verdict = 'alter'; reasons.push('Actuellement en retouche'); }
  else if (g.condition === 'damaged') { verdict = versatile ? 'alter' : 'give'; reasons.push(versatile ? 'Abîmée mais très utile : réparer avant de remplacer' : 'Abîmée et peu combinable'); }
  else if (dislikedFit[g.id]) { verdict = versatile ? 'alter' : 'give'; reasons.push(versatile ? 'Coupe signalée « ne me va pas » : une retouche peut la sauver' : 'Coupe signalée « ne me va pas » et peu combinable'); }
  else if (g.condition === 'worn') { verdict = 'alter'; reasons.push('Usée : entretenir (défroisser, défeutrer, cirer) ou prévoir son remplacement'); }
  else if (v === 0 && total >= 6) { verdict = 'think'; reasons.push('Pièce isolée : ne s\'associe à rien pour l\'instant ; garder seulement si un achat ciblé la rend utile'); }
  else if (sinceWorn !== null && sinceWorn > 365 && (v ?? 0) <= 2) { verdict = 'give'; reasons.push('Plus d\'un an sans être portée et peu combinable'); }
  else if (!g.wearCount && age !== null && age > 365 && (v ?? 0) <= 2) { verdict = 'give'; reasons.push('Jamais portée en un an et peu combinable'); }
  else if (v !== null && v !== undefined && v >= keyThreshold) verdict = 'key';
  if (g.tags?.some((t) => /logo/i.test(t)) && verdict === 'keep') reasons.push('Logo visible : discrétion si objectif classique');
  return { verdict, reasons, missing, decision: g.review?.verdict || null };
}

/** Seuil « pièce clé » : le quart le plus polyvalent du dressing (au moins 4 tenues). */
export function keyThresholdOf(vmap) {
  const vals = Object.values(vmap).filter((x) => typeof x === 'number' && x > 0).sort((a, b) => b - a);
  if (!vals.length) return Infinity;
  return Math.max(4, vals[Math.floor(vals.length / 4)] || vals[0]);
}
