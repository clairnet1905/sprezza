// Lessive et entretien : règles pures et explicables. Repères généraux : l'étiquette du vêtement prime toujours.
import { SUB_INFO } from '../data/taxonomy.js';

/** Nombre de ports avant lavage conseillé (repères usuels, modifiables par pièce via washAfter). null = pas de lavage en machine. */
export const WASH_AFTER = {
  'tee-shirt': 1, chemise: 1, 'chemise-lin': 1, 'polo-sport': 1, polo: 2, sweat: 3, polaire: 4,
  pull: 5, 'col-roule': 4, cardigan: 5,
  chino: 4, jean: 8, pantalon: 6, 'pantalon-costume': 8, flanelle: 6, bermuda: 3, short: 2, jogging: 2, 'pantalon-technique': 5, jupe: 4,
  blazer: 12, 'veste-costume': 12, surchemise: 6, 'veste-denim': 10, 'cardigan-epais': 6,
  manteau: null, trench: null, caban: null, parka: null, doudoune: null, impermeable: null,
  echarpe: 10, bonnet: 6,
  'tee-shirt-travail': 1, 'pantalon-travail': 2, 'veste-travail': 8,
};
export const washAfter = (g) => (g.washAfter ?? WASH_AFTER[g.sub] ?? null);

/** Soins périodiques : tous les N ports. */
const CARE = [
  { id: 'polish', test: (g) => g.category === 'chaussures' && /cuir/i.test(g.material || '') && !/daim/i.test(g.material || ''), every: 8, label: 'Cirer et nourrir le cuir', how: 'Brosser, crème nourrissante de la teinte, cirage sur le bout, embauchoirs en bois.' },
  { id: 'suede', test: (g) => /daim|nubuck/i.test(g.material || ''), every: 10, label: 'Brosser et imperméabiliser le daim', how: 'Brosse à daim à sec, gomme pour les taches, spray imperméabilisant à 20 cm, laisser sécher.' },
  { id: 'sneakers', test: (g) => g.sub === 'baskets', every: 10, label: 'Nettoyer les baskets', how: 'Semelles à la brosse et au savon doux, lacets à part ; garder les baskets blanches vraiment blanches.' },
  { id: 'depill', test: (g) => ['pull', 'col-roule', 'cardigan', 'cardigan-epais', 'polo'].includes(g.sub) || /laine|mérinos|merinos|cachemire/i.test(g.material || ''), every: 15, label: 'Défeutrer (bouloches)', how: 'Peigne ou rasoir anti-bouloches, à plat, sans forcer ; plier les mailles plutôt que les suspendre.' },
  { id: 'press', test: (g) => ['blazer', 'veste-costume', 'pantalon-costume', 'flanelle', 'manteau'].includes(g.sub), every: 10, label: 'Défroisser / pressing léger', how: 'Vapeur ou pressing léger, brosse à vêtements après chaque port, cintre épaulé, repos 24 h entre deux ports.' },
  { id: 'proof', test: (g) => ['trench', 'impermeable', 'parka'].includes(g.sub), every: 25, label: 'Raviver l\'imperméabilisation', how: 'Spray imperméabilisant textile en début de saison humide (utile à Bordeaux), après nettoyage.' },
  { id: 'belt', test: (g) => g.category === 'ceinture' && /cuir/i.test(g.material || ''), every: 30, label: 'Nourrir le cuir de la ceinture', how: 'Crème incolore ou de la teinte, éviter de la laisser roulée serrée.' },
];

/** Conseils de lavage selon la matière (repères ; l'étiquette prime). */
export function washTips(g) {
  const m = String(g.material || '').toLowerCase();
  if (/cachemire|mérinos|merinos/.test(m)) return 'Lavage à la main ou programme laine 30 °C, essorage doux, séchage à plat. Aérer entre deux ports plutôt que laver.';
  if (/laine|flanelle|tweed/.test(m)) return 'Aérer et brosser après chaque port ; nettoyage à sec ou programme laine 30 °C si l\'étiquette l\'autorise. Jamais de sèche-linge.';
  if (/lin/.test(m)) return 'Machine 30–40 °C, séchage sur cintre ; repasser encore humide pour un froissé maîtrisé.';
  if (/denim|jean/.test(m) || g.sub === 'jean') return 'Laver rarement, retourné, à froid ou 30 °C ; séchage à l\'air pour garder la teinte du brut.';
  if (/soie/.test(m)) return 'Nettoyage à sec ou lavage main à froid ; repassage doux sur l\'envers.';
  if (/cuir|daim/.test(m)) return 'Ne se lave pas : brosser, nourrir, protéger ; laisser reposer 24 h entre deux ports avec embauchoirs.';
  if (/oxford|popeline|coton/.test(m) || ['chemise', 'tee-shirt', 'polo', 'chino'].includes(g.sub)) return 'Machine 30–40 °C, couleurs ensemble, cintre à la sortie de la machine ; repasser chemises et polos légèrement humides.';
  return 'Suivre l\'étiquette ; à défaut, programme délicat 30 °C et séchage à l\'air.';
}

/** État d'entretien d'une pièce. */
export function careStatus(g) {
  const after = washAfter(g);
  const since = g.wearsSinceWash || 0;
  const tasks = CARE.filter((c) => c.test(g)).map((c) => {
    const done = g.care?.[c.id] || { wears: 0 };
    const wearsSince = (g.wearCount || 0) - (done.atWearCount || 0);
    return { ...c, wearsSince, due: wearsSince >= c.every, lastAt: done.at || null };
  });
  return {
    washable: after !== null, washAfter: after, wearsSinceWash: since,
    washDue: after !== null && since >= after, toWash: g.availability === 'to-wash',
    tasks, dueTasks: tasks.filter((t) => t.due), tips: washTips(g),
    kind: SUB_INFO[g.sub]?.name || g.category,
  };
}

/** Mise à jour d'une pièce après un port (pure) : compteurs et passage automatique au panier si besoin. */
export function afterWear(g, { autoBasket = true } = {}) {
  const since = (g.wearsSinceWash || 0) + 1;
  const after = washAfter(g);
  const next = { ...g, wearsSinceWash: since };
  if (autoBasket && after !== null && since >= after) next.availability = 'to-wash';
  else if (g.availability === 'clean') next.availability = 'worn';
  return next;
}
/** Après lavage (pure). */
export function afterWash(g, at = new Date().toISOString()) {
  return { ...g, wearsSinceWash: 0, lastWashedAt: at, availability: 'clean' };
}
/** Soin effectué (pure). */
export function afterCare(g, taskId, at = new Date().toISOString()) {
  return { ...g, care: { ...(g.care || {}), [taskId]: { at, atWearCount: g.wearCount || 0 } } };
}
