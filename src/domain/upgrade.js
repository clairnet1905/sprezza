// « À remplacer » : une pièce qui ne vous satisfait pas → la même, en mieux. Selon la raison (coupe, qualité, usure,
// couleur, taille, élégance) : recherche améliorée, gamme de prix, boutiques du bon niveau, points à vérifier avant d'acheter.
import { SUB_INFO } from '../data/taxonomy.js';
import { RETAILERS } from '../data/retailers.js';
import { COLOR_BY_ID } from '../data/colors.js';
import { siteSearchUrl } from './wardrobe-logic.js';

export const REPLACE_REASONS = [
  ['quality', 'Matière ou qualité décevante'],
  ['worn', 'Usée (délavée, bouloches, déformée)'],
  ['fit', 'La coupe ne me va pas'],
  ['size', 'Mauvaise taille'],
  ['color', 'La couleur ne me plaît pas'],
  ['style', 'Pas assez élégante'],
];

/** Ce qui fait la qualité de chaque type de pièce : la matière à chercher et les points à vérifier. */
export const UPGRADE_SPEC = {
  chemise: { better: 'coton Oxford ou popeline 100 % coton', checks: ['100 % coton, pas de polyester', 'Col qui tient seul (entoilé), pointes nettes', 'Coutures fines et serrées, rayures alignées aux coutures', 'Boutons solidement cousus (idéalement en nacre)'] },
  'chemise-lin': { better: '100 % lin lavé', checks: ['100 % lin (pas de mélange polyester)', 'Tissage dense, peu transparent', 'Col qui garde sa forme'] },
  polo: { better: 'maille coton fil d\'Écosse ou mérinos', checks: ['Coton fil d\'Écosse ou mérinos, pas d\'acrylique', 'Col qui garde sa forme (pas de col qui roule)', 'Maille dense et régulière, bas côtelé'] },
  'polo-sport': { better: 'coton piqué épais', checks: ['Coton piqué épais (au moins 200 g/m² si indiqué)', 'Col et poignets côtelés qui ne gondolent pas', 'Pas de grand logo'] },
  'tee-shirt': { better: 'coton peigné épais col côtelé', checks: ['Coton peigné ou bio, épais (180 g/m² ou plus)', 'Col côtelé serré qui ne se déforme pas', 'Coutures latérales droites'] },
  pull: { better: 'mérinos ou laine d\'agneau 100 %', checks: ['100 % laine (mérinos, agneau, cachemire) : pas d\'acrylique ni de polyester', 'Maille dense : on ne voit pas à travers', 'Bords côtelés qui reviennent en place'] },
  'col-roule': { better: 'mérinos extra-fin 100 %', checks: ['100 % mérinos ou cachemire', 'Col qui tient replié', 'Maille fine et dense'] },
  cardigan: { better: 'laine ou coton épais', checks: ['Laine ou coton, pas d\'acrylique', 'Boutons solides, boutonnières nettes'] },
  sweat: { better: 'molleton coton épais bouclette', checks: ['Coton majoritaire (80 % ou plus)', 'Molleton épais, intérieur bouclette', 'Bords côtelés solides'] },
  chino: { better: 'coton sergé épais', checks: ['Coton sergé épais, 2 % d\'élasthanne maximum', 'Ceinture qui tient sans se rouler', 'Coutures doubles à l\'entrejambe, pas de fils qui dépassent'] },
  jean: { better: 'denim brut 100 % coton', checks: ['Denim 100 % coton ou 1 % d\'élasthanne maximum', 'Toile épaisse (12–14 oz si indiqué)', 'Rivets et coutures solides, teinte unie sans délavage artificiel'] },
  pantalon: { better: 'laine ou laine mélangée, pli marqué', checks: ['Laine majoritaire (ou laine mélangée), pas de polyester brillant', 'Pli marqué au milieu, tombé droit', 'Doublure aux genoux ou à la ceinture (signe de qualité)'] },
  flanelle: { better: 'flanelle 100 % laine', checks: ['100 % laine', 'Tissu chaud et mat', 'Pli net'] },
  'pantalon-costume': { better: 'laine peignée', checks: ['100 % laine', 'Même tissu que la veste'] },
  blazer: { better: 'laine, veste demi-entoilée', checks: ['Laine (ou laine/lin en été)', 'Veste entoilée ou demi-entoilée, pas thermocollée : en pinçant le devant, on sent 3 couches distinctes', 'Épaules naturelles, revers qui roulent sans pli cassé', 'Manches qui laissent voir 1 cm de chemise'] },
  'veste-costume': { better: 'laine peignée, veste demi-entoilée', checks: ['100 % laine', 'Entoilée ou demi-entoilée', 'Épaules nettes, sans creux'] },
  surchemise: { better: 'toile de coton épaisse ou laine', checks: ['Coton épais ou laine', 'Coutures solides, boutons bien cousus'] },
  'veste-daim': { better: 'daim de veau souple', checks: ['Daim souple et uniforme', 'Doublure cousue', 'Coutures régulières'] },
  'veste-cuir': { better: 'cuir pleine fleur', checks: ['Cuir pleine fleur (pas de simili ni PU)', 'Fermeture éclair métal solide'] },
  manteau: { better: 'laine majoritaire (70 % ou plus)', checks: ['Au moins 70 % laine (idéal laine/cachemire)', 'Doublure complète', 'Épaules nettes, longueur couvrant la veste'] },
  caban: { better: 'drap de laine épais', checks: ['Laine majoritaire, drap épais', 'Boutons solides'] },
  trench: { better: 'gabardine de coton serrée', checks: ['Gabardine de coton dense (déperlante)', 'Ceinture et pattes bien cousues', 'Doublure amovible = plus de saisons'] },
  parka: { better: 'parka déperlante doublée', checks: ['Tissu déperlant, coutures étanchées', 'Capuche réglable', 'Fermeture solide'] },
  doudoune: { better: 'garnissage duvet', checks: ['Duvet (et pas seulement polyester) ou isolation de marque', 'Coutures sans fuite de plumes'] },
  mocassins: { better: 'cuir pleine fleur, semelle cousue', checks: ['Cuir pleine fleur (ou daim) : pas de cuir reconstitué', 'Semelle cousue (Blake ou Goodyear), ressemelable', 'Intérieur en cuir'] },
  derbies: { better: 'cuir pleine fleur, semelle Goodyear', checks: ['Cuir pleine fleur', 'Semelle cousue Goodyear ou Blake (ressemelable)', 'Intérieur et première en cuir'] },
  richelieus: { better: 'cuir pleine fleur, semelle Goodyear', checks: ['Cuir pleine fleur, bout lisse', 'Semelle cousue Goodyear ou Blake', 'Intérieur en cuir'] },
  chelsea: { better: 'cuir ou daim, semelle cousue', checks: ['Cuir pleine fleur ou daim épais', 'Élastiques solides', 'Semelle cousue ou gomme de qualité'] },
  bottines: { better: 'cuir pleine fleur, semelle cousue', checks: ['Cuir pleine fleur', 'Semelle cousue, ressemelable'] },
  baskets: { better: 'baskets cuir pleine fleur minimalistes', checks: ['Cuir pleine fleur (pas de synthétique)', 'Semelle cousue (type Margom), pas seulement collée', 'Pas de logo voyant'] },
  'ceinture-cuir': { better: 'cuir pleine fleur d\'une seule pièce', checks: ['Une seule épaisseur de cuir pleine fleur (pas de cuir reconstitué collé)', 'Boucle en métal massif'] },
  'tee-shirt-travail': { better: 'polo ou tee-shirt de travail lavable 60 °C', checks: ['Lavable à 60 °C', 'Coton majoritaire ou polycoton résistant', 'Coutures renforcées'], work: true },
  'pantalon-travail': { better: 'pantalon de travail stretch renforcé', checks: ['Genoux renforcés', 'Tissu stretch qui ne se déchire pas', 'Lavable à 60 °C'], work: true },
  'chaussures-travail': { better: 'chaussures de travail antidérapantes légères', checks: ['Semelle antidérapante (norme SRC si indiquée)', 'Légères et fermées', 'Lavables ou faciles à nettoyer'], work: true },
  'veste-travail': { better: 'softshell déperlante', checks: ['Déperlante, coupe-vent', 'Poches zippées'], work: true },
};
const DEFAULT_SPEC = { better: 'matière naturelle de qualité', checks: ['Matière naturelle majoritaire', 'Coutures régulières et solides', 'Bon tombé sur vous'] };

/** Qualité d'une matière, de 1 (synthétique bas de gamme) à 5 (noble). Estimation à partir du texte de la fiche. */
export function materialScore(material = '') {
  const m = String(material).toLowerCase();
  if (!m.trim()) return null;
  if (/simili|pu\b|polyur|reconstitu|synth[ée]tique|acrylique/.test(m)) return 1;
  let s = 2.5;
  if (/cachemire|vicu|pleine fleur/.test(m)) s = 5;
  else if (/m[ée]rinos|laine|wool|flanelle|tweed|lin\b|daim|cuir|soie/.test(m)) s = 4;
  else if (/oxford|popeline|peign|fil d.[ée]cosse|selvedge|brut|gabardine/.test(m)) s = 3.5;
  else if (/coton|cotton|denim/.test(m)) s = 3;
  const poly = m.match(/(\d+)\s*%\s*(polyester|polyamide|viscose|acrylique|nylon)/);
  if (poly && +poly[1] >= 30) s = Math.min(s, 2);
  else if (/polyester|viscose/.test(m) && !/\d+\s*%/.test(m)) s = Math.min(s, 2.5);
  return s;
}

/** Mot-clé court pour la barre de recherche des boutiques (une recherche trop longue n'y trouve rien). */
const SHORT = { chemise: 'oxford', 'chemise-lin': 'lin', polo: 'mérinos', 'polo-sport': 'piqué', 'tee-shirt': 'coton épais', pull: 'mérinos', 'col-roule': 'mérinos', cardigan: 'laine', sweat: 'coton', chino: 'coton', jean: 'brut', pantalon: 'laine', flanelle: 'laine', blazer: 'laine', 'veste-costume': 'laine', surchemise: 'laine', manteau: 'laine', caban: 'laine', trench: 'coton', mocassins: 'cuir', derbies: 'cuir', richelieus: 'cuir', chelsea: 'daim', bottines: 'cuir', baskets: 'cuir', 'ceinture-cuir': 'cuir' };
/** Spécialité des boutiques : on garde celles qui vendent vraiment ce type de pièce. */
const SPECIALTY = { haut: /polo|maille|chemise|basique|m[ée]rinos|oxford|classique|casual|lin|vestiaire/i, bas: /pantalon|chino|denim|jean|classique|casual|vestiaire|basique/i, veste: /tailoring|blazer|veste|classique|vestiaire|italien/i, manteau: /manteau|tailoring|classique|vestiaire|basique/i, chaussures: /chaussure|mocassin|derbies|richelieu|chelsea|basket/i, ceinture: /ceinture|chaussure|cuir/i };
const ONLY = (why) => (why.match(/^(Chemises|Chaussures|Tailoring)/i) || [])[1]?.toLowerCase();
const TIER_FOR = (price, work) => (work ? [1, 2] : !price ? [2, 3] : price < 40 ? [2, 3] : price < 120 ? [3] : [3, 4]);

/**
 * Plan de remplacement : comment trouver la même pièce en mieux.
 * @param g — la fiche à remplacer ; reasons — clés de REPLACE_REASONS
 */
export function upgradePlan(g, reasons = [], { profile = {}, budgets = {} } = {}) {
  const spec = UPGRADE_SPEC[g.sub] || DEFAULT_SPEC;
  const kind = (SUB_INFO[g.sub]?.name || g.name).toLowerCase();
  const keepColor = !reasons.includes('color');
  const colorTxt = keepColor && g.color?.id ? (COLOR_BY_ID[g.color.id]?.name || g.color.name || '').toLowerCase() : '';
  const fitPref = profile.preferredFits?.[0];
  const fitTxt = reasons.includes('fit') ? ({ slim: 'coupe ajustée', regular: 'coupe droite', tapered: 'coupe droite fuselée', relaxed: 'coupe ample' })[fitPref] || 'coupe droite' : '';
  const gender = profile.kind === 'woman' ? 'femme' : 'homme';
  const query = [kind, gender, spec.better, colorTxt, fitTxt].filter(Boolean).join(' ');
  const shortQuery = [kind.replace(/\s(en|de)\s/g, ' ').replace(/\s(minimalistes|habillé|laine)$/, ''), SHORT[g.sub] || '', colorTxt].filter(Boolean).join(' ').replace(/\s+/g, ' ');
  const why = [];
  if (reasons.includes('quality') || reasons.includes('worn')) why.push(`Chercher en ${spec.better} : c'est ce qui fait la différence de tenue dans le temps.`);
  if (reasons.includes('worn')) why.push('En attendant, elle reste pour le quotidien et le travail, plus pour les rendez-vous.');
  if (reasons.includes('fit')) why.push(`Coupe : ${fitTxt || 'à choisir'}. Mesurez à plat une pièce qui vous va bien (épaules, poitrine, longueur, tour de taille, entrejambe) et comparez au guide des tailles avant de commander.`);
  if (reasons.includes('size')) {
    const bs = (profile.brandSizes || []).find((b) => g.brand && String(b.brand || '').toLowerCase() === String(g.brand).toLowerCase());
    why.push(bs ? `Taille : chez ${bs.brand} vous portez ${bs.size}${g.size ? ` (cette pièce : ${g.size})` : ''}.` : `Taille : ${g.size ? `celle-ci est en ${g.size} ; ` : ''}notez dans Profil la taille qui vous va pour chaque marque.`);
  }
  if (!keepColor) why.push('Couleur : prenez une teinte qui va avec le plus de pièces que vous avez déjà (marine, écru, gris, beige ou marron selon votre dressing). « Avant d\'acheter » le vérifiera.');
  if (reasons.includes('style')) why.push('Plus élégant : coupe plus nette, matière plus noble, couleur plus sobre, sans logo.');
  const old = g.price || null;
  const capBudget = budgets?.[g.category] || null;
  const lo = old ? Math.round(old * (spec.work ? 1 : 1.3)) : null; const hi = old ? Math.round(old * (spec.work ? 1.6 : 2.5)) : null;
  const priceRange = old ? [lo, capBudget ? Math.min(hi, capBudget) : hi] : null;
  const tiers = TIER_FOR(old, spec.work);
  const cat = g.category === 'chaussures' ? 's' : 'h';
  const spe = SPECIALTY[g.category] || /./;
  const fitsShop = (r) => { const only = ONLY(r.why); if (only === 'chemises') return /chemise/.test(g.sub); if (only === 'chaussures') return g.category === 'chaussures'; if (only === 'tailoring') return ['blazer', 'veste-costume', 'pantalon-costume', 'pantalon', 'flanelle'].includes(g.sub); return true; };
  const shops = RETAILERS.filter((r) => r.name !== 'Vinted' && tiers.includes(r.tier) && (r.cats.includes(cat) || r.cats.includes('m')) && (gender === 'homme' ? r.cats.includes('h') || r.cats.includes('m') || (cat === 's' && r.cats.includes('s')) : r.cats.includes('f')) && fitsShop(r))
    .map((r) => ({ r, score: (spe.test(r.why) ? 2 : 0) + (r.search ? 1 : 0) }))
    .sort((a, b) => b.score - a.score || b.r.tier - a.r.tier).slice(0, 6)
    .map(({ r }) => ({ name: r.name, why: r.why, tier: r.tier, url: r.search ? r.search(shortQuery, gender) : siteSearchUrl(r.url, shortQuery) }));
  const vinted = RETAILERS.find((r) => r.name === 'Vinted');
  if (vinted && !spec.work) shops.push({ name: 'Vinted', why: 'La même qualité d\'occasion, souvent 2 à 3 fois moins chère : vérifiez l\'état et les mesures', tier: 1, url: vinted.search(shortQuery), secondHand: true });
  return { query, shortQuery, better: spec.better, checks: spec.checks, why, priceRange, shops, googleShopping: `https://www.google.com/search?udm=28&q=${encodeURIComponent(query)}` };
}

/**
 * L'article trouvé est-il vraiment mieux que la pièce à remplacer ?
 * @returns {Array<{tone:'ok'|'warn'|'bad', text}>}
 */
export function compareUpgrade(old, cand) {
  const out = [];
  const a = materialScore(old.material); const b = materialScore(cand.material);
  if (b !== null && a !== null) {
    if (b > a) out.push({ tone: 'ok', text: `Matière meilleure que votre ${old.name} (${cand.material} contre ${old.material}).` });
    else if (b < a) out.push({ tone: 'bad', text: `Matière moins bonne que votre ${old.name} (${cand.material} contre ${old.material}) : ce n'est pas un vrai remplacement.` });
    else out.push({ tone: 'warn', text: `Matière de même niveau que votre ${old.name} : vérifiez la coupe et les finitions, sinon ce sera la même déception.` });
  } else if (b !== null && b <= 2) out.push({ tone: 'bad', text: 'Matière synthétique ou bas de gamme : ce ne sera pas mieux.' });
  else if (b === null) out.push({ tone: 'warn', text: 'Matière inconnue : vérifiez la composition sur la fiche produit avant d\'acheter.' });
  if (old.price && cand.price) {
    if (cand.price < old.price * 0.8 && !(b > a)) out.push({ tone: 'warn', text: `Moins cher que l'ancienne (${old.price} €) sans matière meilleure : risque de la même qualité.` });
    else if (cand.price > old.price * 4) out.push({ tone: 'warn', text: `Plus de 4 fois le prix de l'ancienne : regardez aussi l'occasion (Vinted) pour la même qualité.` });
  }
  if (old.replace?.reasons?.includes('color') && cand.color && cand.color === old.color?.id) out.push({ tone: 'bad', text: 'Même couleur que la pièce dont la couleur ne vous plaisait pas.' });
  if (old.sub !== cand.sub) out.push({ tone: 'warn', text: `Ce n'est pas le même type de pièce (${SUB_INFO[cand.sub]?.name || cand.sub} au lieu de ${SUB_INFO[old.sub]?.name || old.sub}).` });
  return out;
}
