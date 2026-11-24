// Rangement saisonnier (climat océanique bordelais) : deux grands changements de garde-robe.
// Printemps-été à partir du 15 avril, automne-hiver à partir du 15 octobre. Règles pures, testées.

export const PERIODS = {
  warm: { id: 'warm', name: 'Printemps-été', starts: [4, 15], seasons: ['spring', 'summer'] },
  cold: { id: 'cold', name: 'Automne-hiver', starts: [10, 15], seasons: ['autumn', 'winter'] },
};
const WINTER_SUBS = ['manteau', 'doudoune', 'parka', 'caban', 'flanelle', 'polaire', 'col-roule', 'bonnet', 'echarpe', 'cardigan-epais'];
const SUMMER_SUBS = ['short', 'bermuda', 'chemise-lin', 'espadrilles', 'sandales', 'bateau'];

/** Période en cours pour une date. */
export function periodAt(d = new Date()) {
  const md = (d.getMonth() + 1) * 100 + d.getDate();
  return md >= 415 && md < 1015 ? 'warm' : 'cold';
}
/** Date de début de la prochaine période et nombre de jours avant. */
export function nextChange(d = new Date()) {
  const cur = periodAt(d); const next = cur === 'warm' ? 'cold' : 'warm';
  const [m, day] = PERIODS[next].starts;
  let at = new Date(d.getFullYear(), m - 1, day);
  if (at <= d) at = new Date(d.getFullYear() + 1, m - 1, day);
  return { period: next, at, days: Math.ceil((at - d) / 864e5) };
}
/** Nombre de jours écoulés depuis le début de la période en cours. */
export function daysSinceChange(d = new Date()) {
  const cur = periodAt(d); const [m, day] = PERIODS[cur].starts;
  let at = new Date(d.getFullYear(), m - 1, day);
  if (at > d) at = new Date(d.getFullYear() - 1, m - 1, day);
  return Math.floor((d - at) / 864e5);
}

/** Une pièce est-elle réservée à la saison froide, chaude, ou toutes saisons ? */
export function seasonClass(g) {
  const s = g.seasons || [];
  if (s.length) {
    const warmOnly = s.every((x) => PERIODS.warm.seasons.includes(x));
    const coldOnly = s.every((x) => PERIODS.cold.seasons.includes(x));
    if (warmOnly && !coldOnly) return 'warm';
    if (coldOnly && !warmOnly) return 'cold';
    return 'all';
  }
  if (WINTER_SUBS.includes(g.sub) || (g.warmth ?? 0) >= 4) return 'cold';
  if (SUMMER_SUBS.includes(g.sub) || /\blin\b/i.test(g.material || '')) return 'warm';
  return 'all';
}

/**
 * Plan de changement de garde-robe vers une période.
 * @returns {{toStore: Array<{g, washFirst:boolean}>, toBringOut: Array, stored: Array}}
 */
export function seasonalPlan(garments, target) {
  const opposite = target === 'warm' ? 'cold' : 'warm';
  const stored = garments.filter((g) => g.availability === 'stored');
  return {
    toStore: garments.filter((g) => g.availability !== 'stored' && seasonClass(g) === opposite).map((g) => ({ g, washFirst: ['worn', 'to-wash'].includes(g.availability) })),
    toBringOut: stored.filter((g) => seasonClass(g) !== opposite),
    stored,
  };
}

/** Conseils de rangement selon la pièce. */
export function storageTip(g) {
  const m = String(g.material || '').toLowerCase();
  if (g.category === 'chaussures') return 'Nettoyer, nourrir le cuir, embauchoirs en bois, dans un sac en tissu ; jamais humides.';
  if (/cachemire|mérinos|merinos|laine|flanelle|tweed/.test(m) || ['pull', 'col-roule', 'cardigan'].includes(g.sub)) return 'Laver ou aérer, plier à plat, housse respirante avec cèdre ou lavande contre les mites.';
  if (['manteau', 'blazer', 'veste-costume', 'trench', 'caban'].includes(g.sub)) return 'Brosser, vider les poches, cintre épaulé et housse en coton respirante.';
  if (/lin/.test(m)) return 'Laver, sécher complètement, plier sans repasser ; housse respirante.';
  return 'Laver avant de ranger (les taches invisibles jaunissent), sécher complètement, ranger plié dans une boîte respirante.';
}
