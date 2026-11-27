// Styles et raisons propres à chaque événement : le nom du style, l'idée et les explications
// dépendent de l'occasion ET des pièces réellement choisies (plus de phrases identiques partout).
import { SUB_INFO } from '../data/taxonomy.js';

/** Groupe d'occasion, pour le vocabulaire. */
export const GROUP = {
  client: 'business', 'pro-meeting': 'business', office: 'business', 'important-meeting': 'business', interview: 'business',
  restaurant: 'evening', 'elegant-dinner': 'evening', date: 'evening', 'chic-party': 'evening', birthday: 'evening',
  wedding: 'ceremony', religious: 'ceremony',
  daily: 'casual', walk: 'casual', cafe: 'casual', city: 'casual', travel: 'casual', home: 'casual',
  sea: 'summer', mountain: 'outdoor', 'work-cleaning': 'work', 'client-work': 'clientwork',
};
const groupOf = (occ) => GROUP[occ?.id] || 'casual';

/**
 * Trois styles par événement, du plus adapté au moins attendu. `mode` = moteur de proposition utilisé.
 */
export const LOOKS = {
  client: [['classic', 'Business sobre', 'Inspirer confiance : lignes nettes, couleurs calmes.'], ['italian', 'Italien décontracté chic', 'Sérieux mais chaleureux : on parle affaires sans rigidité.'], ['modern', 'Smart moderne', 'Actuel et soigné, pour un client jeune ou créatif.']],
  'pro-meeting': [['classic', 'Rendez-vous professionnel', 'Crédible dès la poignée de main.'], ['italian', 'Élégance italienne', 'Assurance tranquille, matières nobles.'], ['modern', 'Moderne sobre', 'Net et contemporain.']],
  office: [['classic', 'Bureau classique', 'Soigné toute la journée, confortable assis.'], ['italian', 'Bureau à l\'italienne', 'Polo maille ou chemise ouverte : décontraction maîtrisée.'], ['modern', 'Bureau moderne', 'Simple, propre, sans cravate.']],
  'important-meeting': [['classic', 'Réunion décisive', 'Le niveau le plus habillé, sans fausse note.'], ['italian', 'Autorité italienne', 'Costume souple, présence calme.'], ['modern', 'Moderne habillé', 'Sobre et précis.']],
  interview: [['classic', 'Entretien : valeur sûre', 'Rassurer, ne pas distraire.'], ['italian', 'Entretien soigné', 'Élégant sans en faire trop.'], ['modern', 'Entretien secteur créatif', 'Professionnel mais actuel.']],
  restaurant: [['italian', 'Dîner à l\'italienne', 'Tons chauds, mailles fines : élégant sans effort.'], ['modern', 'Soirée moderne', 'Teintes sombres, lignes simples.'], ['classic', 'Classique du soir', 'Chemise et veste, l\'élégance qui ne se trompe pas.']],
  'elegant-dinner': [['italian', 'Soirée habillée', 'Veste obligatoire, matières riches.'], ['classic', 'Dîner classique', 'Le soir appelle plus de sombre et plus de structure.'], ['modern', 'Noir moderne', 'Monochrome sombre, très net.']],
  date: [['italian', 'Rendez-vous charme', 'Soigné, chaleureux, pas guindé.'], ['modern', 'Décontracté séduisant', 'Simple et bien coupé.'], ['classic', 'Gentleman', 'Classique, attentionné.']],
  birthday: [['italian', 'Fête détendue', 'Festif sans se déguiser.'], ['modern', 'Moderne festif', 'Confortable, une touche de couleur.'], ['classic', 'Classique convivial', 'Propre et accueillant.']],
  'chic-party': [['classic', 'Soirée chic', 'Le dress code avant tout.'], ['italian', 'Glamour italien', 'Costume sombre, allure souple.'], ['modern', 'Chic contemporain', 'Sombre et minimal.']],
  wedding: [['classic', 'Invité de mariage', 'Habillé sans voler la vedette.'], ['italian', 'Mariage à l\'italienne', 'Costume souple, teintes de saison.'], ['modern', 'Mariage moderne', 'Sobre et lumineux.']],
  religious: [['classic', 'Cérémonie', 'Respect et sobriété.'], ['italian', 'Cérémonie élégante', 'Discret et soigné.'], ['modern', 'Cérémonie sobre', 'Simple et net.']],
  daily: [['italian', 'Quotidien élégant', 'Facile à porter, toujours soigné.'], ['modern', 'Quotidien moderne', 'Confort et lignes nettes.'], ['classic', 'Quotidien classique', 'Les basiques bien assortis.']],
  walk: [['modern', 'Promenade décontractée', 'Confort pour marcher, allure gardée.'], ['italian', 'Promenade chic', 'Le week-end à l\'italienne : mailles et tons doux.'], ['classic', 'Casual soigné', 'Décontracté mais net.']],
  cafe: [['modern', 'Café entre amis', 'Simple et sympathique.'], ['italian', 'Terrasse à l\'italienne', 'Décontracté chic.'], ['classic', 'Casual classique', 'Propre, sans effort apparent.']],
  city: [['italian', 'Ville à l\'italienne', 'Élégance de tous les jours.'], ['modern', 'Ville moderne', 'Pratique et actuel.'], ['classic', 'Ville classique', 'Sobre et bien coupé.']],
  travel: [['modern', 'Voyage confortable', 'Souple pour rester assis, net à l\'arrivée.'], ['italian', 'Voyage chic', 'Mailles et couches faciles.'], ['classic', 'Voyage classique', 'Pièces qui ne froissent pas.']],
  home: [['modern', 'Maison confortable', 'Doux et pratique.'], ['italian', 'Maison soignée', 'Confort sans négligé.'], ['classic', 'Maison simple', 'Basiques propres.']],
  sea: [['italian', 'Riviera', 'Lin, tons clairs, légèreté.'], ['modern', 'Bord de mer moderne', 'Simple et frais.'], ['classic', 'Bord de mer classique', 'Polo et bateau.']],
  mountain: [['modern', 'Montagne pratique', 'Chaleur et sécurité d\'abord.'], ['italian', 'Montagne chic', 'Mailles chaudes, cuir robuste.'], ['classic', 'Montagne classique', 'Couches efficaces.']],
  'client-work': [['italian', 'Pro polyvalent', 'Net pour le client, pratique pour travailler : une seule tenue pour la journée.'], ['modern', 'Smart pratique', 'Polo, chino foncé, baskets nettes : sobre et efficace.'], ['classic', 'Sobre et efficace', 'Chemise ou polo, une couche à enfiler pour le rendez-vous.']],
  'work-cleaning': [['modern', 'Travail propre et net', 'Pratique, sombre, impeccable devant les clients.'], ['italian', 'Travail soigné', 'Une touche de style sans risque pour vos belles pièces.'], ['classic', 'Uniforme sobre', 'Deux couleurs, toujours assorti.']],
};
export function looksFor(occ) { return (LOOKS[occ?.id] || LOOKS.daily).map(([mode, name, idea]) => ({ mode, name, idea })); }

/** Ce qu'apporte une pièce, selon le type d'événement. */
const WHY = {
  blazer: { business: 'structure la silhouette : la tenue devient professionnelle', evening: 'habille la soirée sans cravate', casual: 'porté décontracté, il donne de l\'allure sans en faire trop', ceremony: 'indispensable pour le respect du code' },
  'veste-costume': { business: 'le niveau d\'habillage attendu, sans discussion', evening: 'apporte la structure d\'une vraie tenue du soir', ceremony: 'le minimum attendu pour la cérémonie', casual: 'portée seule, elle devient un blazer élégant' },
  surchemise: { casual: 'couche intermédiaire décontractée, plus soignée qu\'un sweat', work: 'protège et reste nette', business: 'plus détendue qu\'un blazer' },
  'veste-daim': { evening: 'texture chaude et riche, parfaite le soir', casual: 'texture qui donne du caractère' },
  chemise: { business: 'la base de la tenue professionnelle', evening: 'nette et lumineuse près du visage', casual: 'col ouvert, elle reste soignée', ceremony: 'indispensable sous la veste' },
  'chemise-lin': { summer: 'respire par la chaleur', casual: 'froissé élégant de l\'été' },
  polo: { business: 'plus doux qu\'une chemise, toujours correct', casual: 'le compromis parfait entre confort et allure', evening: 'maille fine, élégante sans chemise' },
  'polo-sport': { casual: 'sportif et propre', work: 'pratique, se lave facilement et reste net' },
  pull: { casual: 'chaleur et douceur', business: 'sur une chemise, élégant et chaud', evening: 'maille fine qui adoucit la tenue' },
  'col-roule': { evening: 'remplace chemise et cravate avec élégance le soir', business: 'sous un blazer, moderne et sérieux', casual: 'chaud et net' },
  'tee-shirt': { casual: 'la base simple et propre', work: 'pratique et facile à changer' },
  'tee-shirt-travail': { work: 'conçu pour le travail : résistant, lavable à haute température' },
  sweat: { casual: 'confort assumé', work: 'chaud et sans risque pour vos belles pièces' },
  polaire: { work: 'chaleur légère pour les locaux froids', outdoor: 'isolation légère et respirante' },
  chino: { casual: 'polyvalent : ni trop habillé ni trop détendu', business: 'business casual par excellence', work: 'net et confortable', evening: 'plus détendu qu\'un pantalon de laine' },
  pantalon: { business: 'le pantalon habillé fait le sérieux de la tenue', evening: 'tombé élégant pour le soir', ceremony: 'tenue correcte exigée' },
  'pantalon-costume': { business: 'complète la veste : effet costume', ceremony: 'le niveau attendu', evening: 'très habillé' },
  flanelle: { business: 'texture d\'hiver chic', evening: 'chaude et raffinée' },
  jean: { casual: 'décontracté et solide', evening: 'foncé, il passe le soir avec une belle veste', work: 'résistant' },
  jogging: { work: 'liberté de mouvement pour se baisser et porter', casual: 'confort maximal' },
  'pantalon-travail': { work: 'poches pratiques, genoux renforcés, résiste aux produits' },
  'pantalon-technique': { work: 'souple et résistant', outdoor: 'sèche vite, protège' },
  bermuda: { summer: 'frais et soigné', casual: 'l\'été sans négligé' },
  mocassins: { casual: 'élégance sans lacets', business: 'souples et soignés', evening: 'élégants pour un dîner' },
  derbies: { business: 'chaussure de référence pour le travail', evening: 'habillent la tenue', ceremony: 'respectent le code' },
  richelieus: { business: 'les plus habillées : réunion importante', ceremony: 'parfaites pour la cérémonie' },
  chelsea: { evening: 'élégantes le soir, faciles à porter', casual: 'allure et confort', business: 'moderne et soigné' },
  bottines: { casual: 'robustes pour marcher', outdoor: 'tiennent bien le pied' },
  baskets: { casual: 'confort pour marcher', work: 'fermées et confortables toute la journée' },
  'chaussures-travail': { work: 'antidérapantes : la sécurité sur les sols mouillés' },
  manteau: { all: 'garde au chaud sans casser la ligne de la tenue' },
  trench: { all: 'léger mais couvrant, élégant par temps frais ou humide' },
  caban: { all: 'chaud et marin' },
  parka: { all: 'protection contre le froid et la pluie' },
  doudoune: { all: 'chaleur maximale' },
  'veste-travail': { work: 'protège et se lave en machine' },
};
const lc = (s) => String(s || '').toLowerCase();
/** Petite variation stable (même jour + même tenue = même phrase ; un autre jour, une autre tournure). */
function pickVariant(list, seed) {
  let h = 2166136261; for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return list[(h >>> 0) % list.length];
}

const INTENT = {
  business: ['Pour {occ}, le but est d\'inspirer confiance sans paraître rigide.', 'Tenue de représentation : soignée, crédible, sans l\'austérité d\'un costume.', '{Occ} : sérieux et accessible à la fois.'],
  evening: ['Le soir, on monte d\'un cran : teintes plus profondes, belles matières.', '{Occ} : élégant sans paraître endimanché.', 'Pour {occ}, une allure soignée qui reste détendue.'],
  ceremony: ['Pour {occ}, le respect du code passe avant tout.', '{Occ} : habillé, sobre, sans voler la vedette.'],
  casual: ['Pour {occ}, confort et allure.', '{Occ} : décontracté mais jamais négligé.', 'Une tenue facile pour {occ}, qui reste soignée.'],
  summer: ['Pour {occ}, légèreté avant tout.'],
  outdoor: ['Pour {occ}, protection et confort d\'abord.'],
  clientwork: ['Une seule tenue pour le client et le travail : soignée au rendez-vous, pratique ensuite.', 'Rendez-vous client puis travail : on reste présentable sans craindre de se salir.'],
  work: ['Au travail : pratique, et impeccable devant les clients.', 'Tenue de travail propre et nette, sans risquer vos belles pièces.', 'Pour le ménage : des pièces qui ne craignent rien et restent soignées.'],
};
/** L'occasion dans une phrase (« pour le restaurant », « pour une rencontre client »). */
const OCC_PHRASE = {
  daily: 'la journée', city: 'une sortie en ville', walk: 'une promenade', restaurant: 'le restaurant', cafe: 'un café entre amis', date: 'un rendez-vous amoureux',
  'pro-meeting': 'un rendez-vous professionnel', office: 'le bureau', client: 'une rencontre client', 'important-meeting': 'une réunion importante', interview: 'un entretien d\'embauche',
  travel: 'un voyage', sea: 'la mer', mountain: 'la montagne', 'elegant-dinner': 'un dîner élégant', wedding: 'un mariage', religious: 'une cérémonie religieuse',
  birthday: 'un anniversaire', 'chic-party': 'une soirée chic', home: 'la maison', 'work-cleaning': 'le travail', 'client-work': 'une journée client + travail',
};
const cap = (t) => String(t || '').charAt(0).toUpperCase() + String(t || '').slice(1);

/**
 * Raisons propres à l'événement et aux pièces.
 * @returns {{title:string, idea:string, reasons:string[]}}
 */
export function explainOutfit(pieces, { occasion, env = {}, mode, fitOf = () => 0, seed = '' } = {}) {
  const g = groupOf(occasion);
  const look = looksFor(occasion).find((l) => l.mode === mode) || looksFor(occasion)[0];
  const roles = ['layer', 'outer', 'top', 'bottom', 'shoes'];
  const list = roles.map((r) => [r, pieces[r]]).filter(([, x]) => x);
  // Pièces clés : celles qui comptent le plus pour cet événement
  const ranked = [...list].sort((a, b) => fitOf(b[1]) - fitOf(a[1]));
  const why = (x) => { const w = WHY[x.sub] || {}; return w[g] || (g === 'clientwork' ? (w.business || w.work) : null) || w.all || w.casual || null; };
  const keyParts = ranked.filter(([r, x]) => why(x) && !(r === 'outer' && !env.cold && !env.rain)).slice(0, 2).map(([, x]) => `${x.name} : ${why(x)}`);
  const occName = OCC_PHRASE[occasion?.id] || lc(occasion?.name || 'la journée');
  const intent = pickVariant(INTENT[g] || INTENT.casual, `${seed}|${occasion?.id}|intent`).replace('{occ}', occName).replace('{Occ}', occasion?.name || 'La journée');
  const reasons = [`${cap(intent)} ${look.idea}`];
  if (keyParts.length) reasons.push(`Pièce${keyParts.length > 1 ? 's' : ''} clé${keyParts.length > 1 ? 's' : ''} — ${keyParts.join(' ; ')}.`);
  if (g === 'clientwork' && pieces.layer) reasons.push(`Pour le rendez-vous, enfilez : ${lc(pieces.layer.name)} ; à retirer pour travailler.`);
  // Météo : seulement quand elle change vraiment la tenue
  if (pieces.outer && (env.cold || env.rain)) reasons.push(`${pieces.outer.name} : ${env.rain ? 'pluie prévue' : `${Math.round(env.feel)} °C ressentis`}, ${WHY[pieces.outer.sub]?.all || 'pour rester au chaud'}.`);
  else if (env.hot) reasons.push(`Chaleur (${Math.round(env.feel)} °C) : matières légères, pas de couche superflue.`);
  return { title: look.name, idea: look.idea, reasons };
}
export const subName = (sub) => SUB_INFO[sub]?.name || sub;
