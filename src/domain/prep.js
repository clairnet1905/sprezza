// Préparer la veille (repassage, cirage, linge, accessoires, météo) et regrouper le linge par machine.
// Règles pures et testées ; l'étiquette de chaque vêtement prime toujours.
import { luminance, colorHex } from './colors.js';
import { washAfter } from './care.js';
import { howToWear } from './how-to-wear.js';

const IRON_TOP = ['chemise', 'chemise-lin', 'polo-sport'];
const PRESS_BOTTOM = ['pantalon', 'pantalon-costume', 'flanelle'];
const LEATHER_SHOES = ['derbies', 'richelieus', 'chelsea', 'bottines', 'mocassins'];

/**
 * Liste de préparation pour une tenue (veille au soir).
 * @returns {Array<{id, text, kind:'wash'|'iron'|'shoes'|'pack'|'weather'}>}
 */
export function prepChecklist(p, { occasion = null, env = {} } = {}) {
  const out = []; const f = occasion?.formality?.[0] ?? 2;
  const add = (id, kind, text) => out.push({ id, kind, text });
  const pieces = ['outer', 'layer', 'top', 'bottom', 'belt', 'shoes'].map((r) => p[r]).filter(Boolean);
  for (const g of pieces) if (g.availability === 'to-wash') add(`wash-${g.id}`, 'wash', `Laver ce soir : ${g.name} (au panier à linge), ou choisir une autre pièce`);
  if (p.top && IRON_TOP.includes(p.top.sub)) add(`iron-${p.top.id}`, 'iron', `Repasser ${p.top.name}${p.top.sub === 'chemise-lin' ? ' (encore légèrement humide, le lin se repasse mieux)' : ' : col, poignets puis le reste'}`);
  if (p.bottom && (PRESS_BOTTOM.includes(p.bottom.sub) || (p.bottom.sub === 'chino' && f >= 3))) add(`press-${p.bottom.id}`, 'iron', `${PRESS_BOTTOM.includes(p.bottom.sub) ? 'Marquer le pli' : 'Défroisser'} : ${p.bottom.name}`);
  for (const g of [p.layer, p.outer].filter(Boolean)) if (['blazer', 'veste-costume', 'manteau', 'caban'].includes(g.sub)) add(`brush-${g.id}`, 'iron', `Brosser et défroisser à la vapeur : ${g.name}, sur un cintre large`);
  if (p.shoes) {
    if (LEATHER_SHOES.includes(p.shoes.sub) && /daim|nubuck/i.test(p.shoes.material || '')) add(`shoes-${p.shoes.id}`, 'shoes', `Brosser le daim : ${p.shoes.name}`);
    else if (LEATHER_SHOES.includes(p.shoes.sub) && (f >= 3 || occasion?.id === 'client-work')) add(`shoes-${p.shoes.id}`, 'shoes', `Cirer ou lustrer : ${p.shoes.name}`);
    else if (p.shoes.sub === 'baskets') add(`shoes-${p.shoes.id}`, 'shoes', `Nettoyer les semelles : ${p.shoes.name}`);
  }
  const socks = howToWear(p, { occasion, env }).find((w) => w.role === 'shoes');
  if (socks) add('socks', 'pack', `Sortir les chaussettes : ${socks.short.toLowerCase()}`);
  if (p.belt) add(`belt-${p.belt.id}`, 'pack', `Sortir la ceinture : ${p.belt.name}`);
  for (const a of p.accessories || []) if (['cravate', 'pochette', 'montre'].includes(a.sub)) add(`acc-${a.id}`, 'pack', `Préparer : ${a.name}`);
  if (occasion?.id === 'client-work') add('bag', 'pack', 'Sac : la veste du rendez-vous sur un cintre, une tenue de travail de rechange si besoin');
  if (occasion?.workwear === true) add('bag', 'pack', 'Sac : chaussures de travail, gants, une tenue de rechange propre');
  if (env.rain) add('umbrella', 'weather', 'Pluie prévue : parapluie, et des chaussures qui supportent l\'eau');
  if (env.veryCold) add('scarf', 'weather', 'Grand froid : écharpe, gants et bonnet');
  else if (env.cold) add('scarf', 'weather', 'Froid : prévoir une écharpe');
  return out;
}

const DELICATE = /laine|m[ée]rinos|cachemire|flanelle|tweed|soie|angora|alpaga/i;
const NO_MACHINE = /cuir|daim|nubuck/i;
const isWork = (g) => /travail/.test(g.sub || '') || g.workwear === true;
const lum = (g) => luminance(g.color?.hex || colorHex(g.color?.id));

/** Le programme de machine d'une pièce. */
export function loadOf(g) {
  if (washAfter(g) === null || NO_MACHINE.test(g.material || '')) return 'dry';
  if (isWork(g)) return 'work';
  if (DELICATE.test(g.material || '')) return 'wool';
  if (g.sub === 'jean') return 'dark';
  return lum(g) > 0.3 ? 'light' : 'dark'; // deux machines comme à la maison : clairs d'un côté, foncés de l'autre
}
export const LOADS = {
  work: { name: 'Vêtements de travail', how: '40 °C (60 °C pour les pièces très sales), séparés de vos vêtements personnels' },
  light: { name: 'Clairs (blanc, écru, beige, ciel…)', how: '30–40 °C ; une lingette anti-décoloration si une pièce est neuve' },
  dark: { name: 'Foncés et jeans (marine, noir, olive…)', how: '30 °C, retournés sur l\'envers pour garder la teinte' },
  wool: { name: 'Laine et délicats', how: 'programme laine 30 °C ou à la main, séchage à plat' },
  dry: { name: 'Pressing ou à la main', how: 'pas de machine : pressing, brosse ou nettoyage local' },
};
/**
 * Machines à lancer avec le panier à linge.
 * @param {Set<string>|string[]} needed — pièces prévues dans les prochains jours (rendent la machine urgente)
 * @returns {Array<{id, name, how, items, urgent: string[], ready: boolean}>}
 */
export function laundryLoads(garments, { needed = [] } = {}) {
  const need = new Set(needed);
  const by = {};
  for (const g of garments.filter((x) => x.availability === 'to-wash')) (by[loadOf(g)] ||= []).push(g);
  return Object.keys(LOADS).filter((k) => by[k]).map((k) => {
    const items = by[k]; const urgent = items.filter((g) => need.has(g.id)).map((g) => g.name);
    return { id: k, ...LOADS[k], items, urgent, ready: k === 'dry' ? false : items.length >= 5 || urgent.length > 0 };
  }).sort((a, b) => b.urgent.length - a.urgent.length || Number(b.ready) - Number(a.ready) || b.items.length - a.items.length);
}
