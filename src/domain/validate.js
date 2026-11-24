// Validation stricte des sorties IA (équivalent Zod, sans dépendance) et des imports.
// Toute réponse invalide, tout score hors limites ou toute pièce inexistante est interceptée.
import { GRID } from '../data/guide.js';
import { COVERAGE_THRESHOLD } from './scoring.js';
import { SCHEMA_VERSION, STORES } from '../repositories/db.js';

const HEX = /^#[0-9A-Fa-f]{6}$/;
const isStr = (v) => typeof v === 'string';
const isStrArr = (v) => Array.isArray(v) && v.every(isStr);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export class ValidationError extends Error {
  constructor(issues) { super(`Réponse invalide : ${issues.join(' ; ')}`); this.issues = issues; }
}

/**
 * Valide et normalise la sortie IA d'analyse.
 * @param {unknown} input objet ou chaîne JSON
 * @param {{ownedIds?: string[]}} ctx identifiants réellement présents dans le dressing
 */
export function validateAnalysis(input, { ownedIds = [] } = {}) {
  let o = input;
  if (isStr(o)) { try { o = JSON.parse(o); } catch { throw new ValidationError(['JSON illisible']); } }
  const issues = [];
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new ValidationError(['objet JSON attendu']);
  const arrFields = ['style', 'observations', 'strengths', 'improvements', 'alternatives', 'recommendedShoeTypes', 'ownedItemIds', 'missingItems', 'uncertainties'];
  for (const f of arrFields) if (o[f] !== undefined && !isStrArr(o[f])) issues.push(`${f} doit être une liste de textes`);
  if (o.palette !== undefined) {
    if (!Array.isArray(o.palette)) issues.push('palette doit être une liste');
    else o.palette.forEach((p, i) => {
      if (!p || !isStr(p.name) || !HEX.test(p.hex || '')) issues.push(`palette[${i}] invalide (nom + HEX)`);
      if (p && p.confidence !== undefined && (!isNum(p.confidence) || p.confidence < 0 || p.confidence > 1)) issues.push(`palette[${i}].confidence hors [0,1]`);
    });
  }
  if (!Array.isArray(o.criteria)) issues.push('criteria manquant');
  const gridMax = Object.fromEntries(GRID.map((c) => [c.id, c.max]));
  const criteria = [];
  if (Array.isArray(o.criteria)) {
    const seen = new Set();
    for (const c of o.criteria) {
      if (!c || !isStr(c.id) || !(c.id in gridMax)) { issues.push(`critère inconnu : ${c?.id}`); continue; }
      if (seen.has(c.id)) { issues.push(`critère dupliqué : ${c.id}`); continue; }
      seen.add(c.id);
      if (c.max !== undefined && c.max !== gridMax[c.id]) issues.push(`${c.id}.max doit valoir ${gridMax[c.id]}`);
      if (c.score !== null && c.score !== undefined) {
        if (!isNum(c.score)) issues.push(`${c.id}.score non numérique`);
        else if (c.score < 0 || c.score > gridMax[c.id]) issues.push(`${c.id}.score hors limites (0–${gridMax[c.id]})`);
      }
      if (c.confidence !== undefined && !['low', 'medium', 'high'].includes(c.confidence)) issues.push(`${c.id}.confidence invalide`);
      criteria.push({ id: c.id, max: gridMax[c.id], score: isNum(c.score) ? c.score : null, reason: isStr(c.reason) ? c.reason : '', confidence: c.confidence || null });
    }
  }
  const unknown = (o.ownedItemIds || []).filter((id) => !ownedIds.includes(id));
  if (unknown.length) issues.push(`pièces inexistantes dans le dressing : ${unknown.join(', ')}`);
  // Cohérence des totaux annoncés
  const assessed = criteria.filter((c) => c.score !== null);
  const assessedWeight = assessed.reduce((a, c) => a + c.max, 0);
  if (o.assessedWeight !== undefined && o.assessedWeight !== assessedWeight) issues.push(`assessedWeight incohérent (${o.assessedWeight} ≠ ${assessedWeight})`);
  if (o.score100 !== null && o.score100 !== undefined) {
    if (!isNum(o.score100) || o.score100 < 0 || o.score100 > 100) issues.push('score100 hors limites');
    else if (assessedWeight < COVERAGE_THRESHOLD) issues.push('score100 précis interdit sous le seuil de couverture');
  }
  if (issues.length) throw new ValidationError(issues);
  const got = assessed.reduce((a, c) => a + c.score, 0);
  const precise = assessedWeight >= COVERAGE_THRESHOLD;
  return {
    style: o.style || [], observations: o.observations || [], palette: o.palette || [],
    criteria: GRID.map((g) => criteria.find((c) => c.id === g.id) || { id: g.id, max: g.max, score: null, reason: 'Non évalué', confidence: null }),
    assessedWeight,
    score100: precise && assessedWeight ? Math.round((got / assessedWeight) * 100) : null,
    scoreRange: !precise && assessedWeight ? [Math.round(got), Math.round(got + 100 - assessedWeight)] : null,
    strengths: o.strengths || [], improvements: o.improvements || [], alternatives: o.alternatives || [],
    recommendedShoeTypes: o.recommendedShoeTypes || [], ownedItemIds: o.ownedItemIds || [], missingItems: o.missingItems || [],
    uncertainties: o.uncertainties || [], photoAdvice: isStr(o.photoAdvice) ? o.photoAdvice : null,
  };
}

/** Valide un export JSON SPREZZA avant import ; renvoie l'aperçu des conflits. */
export function validateExport(data, existing = {}) {
  const issues = [];
  if (!data || typeof data !== 'object') throw new ValidationError(['fichier non reconnu']);
  if (!['sprezza', 'style-studio'].includes(data.app)) issues.push('ce fichier ne provient pas de SPREZZA');
  if (!isNum(data.schemaVersion)) issues.push('schemaVersion manquant');
  else if (data.schemaVersion > SCHEMA_VERSION) issues.push(`version ${data.schemaVersion} plus récente que l'application (${SCHEMA_VERSION})`);
  if (!data.stores || typeof data.stores !== 'object') issues.push('données absentes');
  if (issues.length) throw new ValidationError(issues);
  const preview = [];
  for (const [store, rows] of Object.entries(data.stores)) {
    if (!(store in STORES)) { preview.push({ store, ignored: true, count: Array.isArray(rows) ? rows.length : 0 }); continue; }
    if (!Array.isArray(rows)) throw new ValidationError([`${store} doit être une liste`]);
    const key = STORES[store].keyPath;
    const ids = new Set((existing[store] || []).map((r) => r[key]));
    const seen = new Set(); let conflicts = 0; let dupes = 0;
    for (const r of rows) {
      if (!r || typeof r !== 'object' || r[key] === undefined) throw new ValidationError([`${store} : enregistrement sans identifiant`]);
      if (seen.has(r[key])) dupes++; seen.add(r[key]);
      if (ids.has(r[key])) conflicts++;
    }
    preview.push({ store, count: rows.length, conflicts, dupes, newRows: rows.length - conflicts - dupes });
  }
  return preview;
}
