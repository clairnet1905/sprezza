// « Avant d'acheter » : faut-il acheter cette pièce ? Verdict argumenté à partir du dressing réel.
import { recommend, roleOf, buildEnv, hardFilter, workKitStatus, bestOccasionFor } from './recommend.js';
import { versatility } from './review.js';
import { colorHex, hexToRgb } from './colors.js';
import { SUB_INFO } from '../data/taxonomy.js';
import { COLOR_TRAITS } from '../data/colors.js';
import { CAPSULE } from '../data/capsule.js';
import { WORK_KIT } from '../data/workwear.js';
import { wardrobeGaps, occasionCoverage, AUDIT_OCCASIONS } from './audit.js';

const WEAR_ROLES = ['top', 'bottom', 'layer', 'outer', 'shoes'];
const dist = (a, b) => { const x = hexToRgb(colorHex(a)); const y = hexToRgb(colorHex(b)); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };
/** Ports par an estimés selon le type de pièce (pour le coût par port). */
const WEARS_PER_YEAR = { top: 25, bottom: 35, shoes: 60, layer: 30, outer: 45, belt: 120, accessory: 60 };
const CAPSULE_SUB = { 'col roulé': 'col-roule', costume: 'veste-costume', ceinture: 'ceinture-cuir' };
/** Budget de référence pour ce type (capsule ou kit de travail). */
function refBudget(sub) {
  const items = [...CAPSULE.filter((c) => (CAPSULE_SUB[c.sub] || c.sub) === sub), ...WORK_KIT.filter((k) => k.sub === sub)];
  if (!items.length) return null;
  return [Math.min(...items.map((c) => c.budget[0])), Math.max(...items.map((c) => c.budget[1]))];
}

/**
 * @param {{sub, color, material?, price?, name?}} cand pièce envisagée (type et couleur obligatoires)
 * @returns {{verdict:'buy'|'think'|'skip', label, reasons:Array<{tone:'ok'|'warn'|'bad', text}>, similar, pairs, examples, gapsClosed, occasionsBetter, costPerWear}}
 */
export function evaluatePurchase(cand, garments = [], { date = new Date(), weather = null } = {}) {
  const info = SUB_INFO[cand.sub];
  if (!info || !cand.color) return null;
  const hypo = { id: '__candidate', name: cand.name || info.name, category: info.category, sub: cand.sub, color: { id: cand.color }, material: cand.material || '', price: cand.price ?? null, availability: 'clean' };
  const role = roleOf(hypo);
  const gs = garments.map((g) => ({ ...g, availability: 'clean' }));
  const reasons = [];
  const add = (tone, text) => reasons.push({ tone, text });

  // 1. Doublons
  const similar = gs.filter((g) => g.sub === cand.sub && g.color?.id && dist(g.color.id, cand.color) < 60);
  const sameish = gs.filter((g) => roleOf(g) === role && g.sub !== cand.sub && g.color?.id && dist(g.color.id, cand.color) < 40 && COLOR_TRAITS[g.color.id]?.family === COLOR_TRAITS[cand.color]?.family && Math.abs((SUB_INFO[g.sub]?.formality ?? 3) - info.formality) <= 1);
  const worn = similar.filter((g) => ['worn', 'damaged'].includes(g.condition));
  if (similar.length && worn.length === similar.length) add('ok', `Remplace ${similar.map((g) => g.name).join(', ')} (usée) : un remplacement est justifié.`);
  else if (similar.length) add('bad', `Vous avez déjà presque la même pièce : ${similar.map((g) => g.name).join(', ')}.`);
  else if (sameish.length) add('warn', `Proche de ce que vous avez : ${sameish.slice(0, 2).map((g) => g.name).join(', ')} (même couleur, même usage).`);

  // 2. Combinaisons avec le dressing
  const v = versatility([...gs, hypo]);
  const pairs = v[hypo.id] ?? 0;
  if (WEAR_ROLES.includes(role)) {
    if (['layer', 'outer'].includes(role) && pairs >= 8) add('ok', `Se porte par-dessus ${pairs} de vos tenues : elle va avec presque tout.`);
    else if (pairs >= 8) add('ok', `S'associe très bien : ${pairs} tenues harmonieuses avec ce que vous avez déjà.`);
    else if (pairs >= 3) add('ok', `${pairs} tenues harmonieuses avec votre dressing.`);
    else if (pairs > 0) add('warn', `Seulement ${pairs} tenue${pairs > 1 ? 's' : ''} possible${pairs > 1 ? 's' : ''} avec votre dressing : peu de pièces vont avec.`);
    else add('bad', 'Ne s\'accorde avec aucune de vos pièces actuelles (couleur ou style) : elle resterait au placard.');
  }

  // 3. Manques comblés
  const before = wardrobeGaps(gs); const after = new Set(wardrobeGaps([...gs, hypo]).map((g) => g.id));
  const gapsClosed = before.filter((g) => !after.has(g.id));
  gapsClosed.forEach((g) => add('ok', `Comble un manque ${g.level === 'high' ? 'prioritaire' : g.level === 'mid' ? 'important' : ''} : ${g.text.toLowerCase()}.`));

  // 4. Occasions améliorées (moteur de tenues)
  const cov = occasionCoverage(gs, { date, weather }).rows;
  const occasionsBetter = [];
  for (const row of cov) {
    const r = recommend({ garments: [...gs, hypo], occasionId: row.id, date, weather, noUpgrade: true });
    const o = r.options[0];
    if (o && WEAR_ROLES.some((k) => o.pieces[k]?.id === hypo.id) && (o.score.normalized ?? 0) > (row.best ?? 0)) occasionsBetter.push({ name: row.name, from: row.best, to: o.score.normalized });
  }
  if (occasionsBetter.length) add('ok', `Améliore vos tenues : ${occasionsBetter.slice(0, 3).map((x) => `${x.name} (${x.from ?? '—'} → ${x.to}/100)`).join(', ')}.`);

  // 5. Travail (ménage)
  const kitItem = WORK_KIT.find((k) => k.uses.includes(cand.sub));
  if (kitItem && ['tee-shirt-travail', 'pantalon-travail', 'chaussures-travail', 'veste-travail'].includes(cand.sub)) {
    const k = workKitStatus(gs).find((x) => x.item.id === kitItem.id);
    if (!k.ok) add('ok', `Complète votre tenue de travail (${k.have.length}/${k.item.qty} ${k.item.name.toLowerCase()}).`);
    else add('warn', 'Votre kit de travail a déjà assez de pièces de ce type.');
  }

  // 6. Saison
  const env = buildEnv({ weather, date });
  if (role !== 'belt' && role !== 'accessory') {
    const { excluded } = hardFilter([hypo], { occasion: null, env });
    if (excluded.length) add('warn', `Pas pour tout de suite : ${excluded[0][1]}. Achat à faire plutôt en fin de saison (soldes) si besoin.`);
  }

  // 7. Prix
  let costPerWear = null;
  if (cand.price) {
    costPerWear = Math.round((cand.price / ((WEARS_PER_YEAR[role] || 30) * 2)) * 100) / 100; // sur deux ans
    const ref = refBudget(cand.sub);
    if (ref && cand.price > ref[1] * 1.3) add('warn', `Prix élevé pour ce type de pièce (repère ${ref[0]}–${ref[1]} €) : vérifiez la matière et la fabrication.`);
    else if (ref && cand.price <= ref[1]) add('ok', `Prix dans le repère habituel (${ref[0]}–${ref[1]} €).`);
    add(costPerWear <= 2 ? 'ok' : 'warn', `Environ ${String(costPerWear).replace('.', ',')} € par port sur deux ans.`);
  }

  // Exemples de tenues avec la pièce
  const occ = bestOccasionFor(hypo);
  const ex = recommend({ garments: [...gs, hypo], occasionId: occ, date, weather, imposed: { [role]: hypo.id }, noUpgrade: true });
  const examples = WEAR_ROLES.includes(role) ? ex.options.filter((o) => (o.score.normalized ?? 0) >= 60).slice(0, 3).map((o) => ({ pieces: o.pieces, score: o.score.normalized, occasion: occ })) : [];

  // Verdict
  const strongGap = gapsClosed.some((g) => g.level !== 'low');
  let verdict;
  if (similar.length && worn.length !== similar.length) verdict = strongGap ? 'think' : 'skip';
  else if (WEAR_ROLES.includes(role) && pairs === 0) verdict = 'skip';
  else if (strongGap || pairs >= 8 || occasionsBetter.length >= 2 || (kitItem && reasons.some((r) => /Complète votre tenue de travail/.test(r.text)))) verdict = 'buy';
  else if (pairs >= 3 || occasionsBetter.length || gapsClosed.length) verdict = 'think';
  else verdict = 'skip';
  if (verdict === 'buy' && cand.price && reasons.some((r) => /Prix élevé/.test(r.text))) verdict = 'think';
  // Une pièce de base qui comble un manque devrait être neutre : une couleur affirmée en premier achat ouvre peu de tenues.
  if (verdict === 'buy' && strongGap && !COLOR_TRAITS[cand.color]?.neutral && !similar.length) {
    verdict = 'think';
    add('warn', 'Comme première pièce de ce type, une couleur neutre (marine, gris, beige, marron) irait avec bien plus de tenues ; celle-ci viendra mieux en deuxième.');
  }
  const label = { buy: 'Achat conseillé', think: 'À réfléchir', skip: 'Je ne l\'achèterais pas' }[verdict];
  return { verdict, label, reasons, similar, pairs, examples, gapsClosed, occasionsBetter, costPerWear, hypo, occasions: AUDIT_OCCASIONS.length };
}
