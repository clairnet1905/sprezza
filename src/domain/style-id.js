// Quel style porte-t-on ? Reconnaît l'école (italienne, française, britannique…) d'une tenue d'après ses pièces,
// et vérifie, pour chaque style choisi, ce que le dressing possède déjà et ce qu'il faudrait acheter. Règles pures, testées.
import { STYLE_BY_ID } from '../data/styles.js';
import { SUB_INFO } from '../data/taxonomy.js';
import { COLOR_BY_ID } from '../data/colors.js';
import { deltaE } from './colors.js';
import { outfitFormality } from './scoring.js';

/** Nom court affiché sur la tenue (« Style italien »…) et pays/origine. */
export const STYLE_LABEL = {
  italian: ['italien', 'Italie'], french: ['français', 'France'], british: ['britannique', 'Royaume-Uni'], ivy: ['américain (Ivy)', 'États-Unis'],
  japanese: ['japonais', 'Japon'], scandi: ['scandinave', 'Scandinavie'], mediterranean: ['méditerranéen', 'Méditerranée'],
  'old-money': ['Old Money', 'esthétique anglo-américaine'], quiet: ['luxe discret', 'esthétique italienne'], 'smart-casual': ['Smart casual', 'code international'],
  'casual-chic': ['Casual chic', 'code international'], 'business-casual': ['Business casual', 'code professionnel'], 'business-formal': ['Business formel', 'code professionnel'],
  sartorial: ['Sartorial', 'tradition du tailoring'], contemporary: ['classique contemporain', 'classiques modernisés'],
  workwear: ['workwear soigné', 'tenue de travail'],
};

/**
 * Signature de chaque style : types de pièces (points), couleurs typiques, matières, niveau d'habillage.
 * Repris des fiches du guide (styles.js) : vêtements, couleurs, matières, chaussures.
 */
export const STYLE_SIGNS = {
  italian: { subs: { polo: 3, mocassins: 3, 'veste-daim': 2, blazer: 1.5, 'chemise-lin': 1.5, pantalon: 1.5, chino: 1, cardigan: 1, chemise: 0.5 }, colors: ['beige', 'ecru', 'white', 'navy', 'chocolate', 'olive', 'camel', 'suede-brown', 'cognac'], mat: /maille|m[ée]rinos|lin\b|daim|cachemire/, form: [2.6, 4] },
  french: { subs: { jean: 3, trench: 3, bottines: 2, chelsea: 2, blazer: 1.5, caban: 2, chemise: 1.5, 'col-roule': 1, 'tee-shirt': 1, pull: 1, ballerines: 2 }, colors: ['black', 'white', 'navy', 'mid-gray', 'camel', 'charcoal'], mat: /coton|laine|soie/, form: [2.2, 3.8], accent: 'black' },
  british: { subs: { flanelle: 3, richelieus: 2, derbies: 2, cravate: 2, blazer: 1.5, 'veste-costume': 1, manteau: 1, caban: 1, chemise: 1, parapluie: 1, chelsea: 1 }, colors: ['chocolate', 'mid-gray', 'charcoal', 'forest', 'bottle-green', 'navy', 'sky', 'burgundy', 'dark-brown'], mat: /tweed|flanelle|laine peign|velours/, form: [3.3, 5] },
  ivy: { subs: { chino: 3, bateau: 3, 'ceinture-tressee': 2, 'polo-sport': 2, pull: 1.5, mocassins: 1.5, chemise: 1, cardigan: 1, blazer: 1 }, colors: ['navy', 'beige', 'sky', 'white', 'burgundy', 'khaki', 'forest'], mat: /oxford|coton/, form: [2, 3.5] },
  japanese: { subs: { surchemise: 3, 'veste-denim': 2.5, chino: 2, jean: 1.5, derbies: 1.5, chemise: 1, blazer: 1 }, colors: ['navy', 'indigo', 'olive', 'khaki', 'ecru', 'mid-gray', 'white'], mat: /denim|toile|oxford|velours/, form: [2, 3.5] },
  scandi: { subs: { 'col-roule': 2.5, manteau: 2, baskets: 2, pull: 1, pantalon: 1, 'tee-shirt': 1, chelsea: 1 }, colors: ['charcoal', 'light-gray', 'mid-gray', 'black', 'white', 'taupe'], mat: /laine|coton/, form: [2, 3.5], mono: true },
  quiet: { subs: { 'col-roule': 2, polo: 2, cardigan: 2, 'veste-daim': 2, mocassins: 1.5, pantalon: 1.5, pull: 1 }, colors: ['taupe', 'ecru', 'chocolate', 'camel', 'beige', 'sand', 'dark-brown'], mat: /cachemire|m[ée]rinos|daim|laine/, form: [2.8, 4], noLogo: true },
  'old-money': { subs: { pull: 2, chino: 2, mocassins: 2, chemise: 1.5, blazer: 1.5, bateau: 1, 'polo-sport': 1 }, colors: ['navy', 'ecru', 'white', 'sky', 'beige', 'forest'], mat: /coton|laine|torsad/, form: [2.5, 3.8] },
  'smart-casual': { subs: { polo: 2, chino: 2, baskets: 2, blazer: 1, mocassins: 1, pantalon: 1, chemise: 0.5 }, colors: ['beige', 'navy', 'white', 'ecru'], mat: /coton|m[ée]rinos/, form: [2.4, 3.4] },
  'casual-chic': { subs: { jean: 2, pull: 2, bottines: 2, 'veste-cuir': 2, baskets: 1.5, chelsea: 1.5, caban: 1, manteau: 1, 'tee-shirt': 1 }, colors: ['navy', 'light-gray', 'mid-blue', 'indigo', 'chocolate'], mat: /coton|laine|cuir/, form: [1.8, 3] },
  'business-casual': { subs: { blazer: 3, chemise: 2, chino: 2, pantalon: 2, derbies: 2, mocassins: 1, 'ceinture-cuir': 1 }, colors: ['navy', 'white', 'sky', 'beige', 'mid-gray'], mat: /laine|coton/, form: [3.2, 4.2] },
  'business-formal': { subs: { 'veste-costume': 4, 'pantalon-costume': 3, cravate: 3, richelieus: 2, chemise: 1.5 }, colors: ['navy', 'white', 'charcoal', 'black', 'sky'], mat: /laine|popeline/, form: [4.2, 5] },
  sartorial: { subs: { pochette: 3, 'veste-costume': 2, blazer: 2, pantalon: 2, richelieus: 1.5, cravate: 1 }, colors: ['navy', 'mid-gray', 'charcoal', 'white', 'sky'], mat: /laine|flanelle/, form: [3.8, 5] },
  mediterranean: { subs: { 'chemise-lin': 4, espadrilles: 3, bermuda: 2, sandales: 1, polo: 1, pantalon: 1 }, colors: ['taupe', 'white', 'ecru', 'sand', 'sky', 'beige'], mat: /lin\b|seersucker/, form: [1.5, 3], summer: true },
  contemporary: { subs: { jean: 2, pull: 2, bottines: 2, surchemise: 1.5, chelsea: 1.5, 'veste-daim': 1, chemise: 1, blazer: 1 }, colors: ['ecru', 'indigo', 'chocolate', 'olive', 'navy'], mat: /velours|tweed|daim|denim/, form: [2.5, 3.6] },
};

const ROLES = ['outer', 'layer', 'top', 'bottom', 'shoes', 'belt'];
/** Couleur d'une pièce rapprochée d'une liste (identique, sinon teinte proche). */
function colorIn(g, list) {
  const id = g?.color?.id; if (!id) return false;
  if (list.includes(id)) return true;
  const hex = g.color.hex || COLOR_BY_ID[id]?.hex; if (!hex) return false;
  return list.some((c) => COLOR_BY_ID[c] && deltaE(hex, COLOR_BY_ID[c].hex) < 14);
}
const subName = (s) => (SUB_INFO[s]?.name || s).toLowerCase();

/**
 * Style reconnu d'une tenue.
 * @returns {{id, label, origin, name, why, score, second}|null}
 */
export function identifyStyle(pieces, { occasion = null, mode = null, month = null } = {}) {
  if (!pieces) return null;
  if (occasion?.workwear === true) return { id: 'workwear', label: STYLE_LABEL.workwear[0], origin: STYLE_LABEL.workwear[1], name: 'Workwear soigné', why: 'pratique, lavable et propre devant les clients', score: 0, second: null };
  const list = [...ROLES.map((r) => pieces[r]), ...(pieces.accessories || [])].filter(Boolean);
  if (!list.length) return null;
  const of = outfitFormality(pieces);
  const ids = list.map((g) => g.color?.id).filter(Boolean);
  const res = Object.entries(STYLE_SIGNS).map(([id, s]) => {
    let score = 0; const hits = [];
    for (const g of list) {
      const pts = s.subs[g.sub] || 0;
      if (pts) { score += pts; hits.push([pts + (colorIn(g, s.colors) ? 1 : 0), subName(g.sub)]); }
      if (colorIn(g, s.colors) && ['top', 'bottom', 'layer', 'outer', 'shoes'].includes(SUB_INFO[g.sub]?.role)) score += 0.8;
      if (s.mat && g.material && s.mat.test(String(g.material).toLowerCase())) score += 0.8;
    }
    if (of !== null) { const [lo, hi] = s.form; score += of >= lo && of <= hi ? 2 : -Math.min(4, 2 * Math.max(lo - of, of - hi)); }
    if (s.accent && ids.includes(s.accent)) score += 1;
    if (s.mono && new Set(ids).size <= 2) score += 1;
    if (s.summer && month !== null && (month < 4 || month > 8)) score -= 3;
    if (mode && STYLE_BY_ID[id]?.modeAffinity === mode) score += 0.6;
    return { id, score, hits: hits.sort((a, b) => b[0] - a[0]) };
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const best = res[0];
  const s = STYLE_SIGNS[best.id];
  const cols = [...new Set(list.filter((g) => colorIn(g, s.colors)).map((g) => COLOR_BY_ID[g.color.id]?.name?.toLowerCase() || g.color.name))].slice(0, 2);
  const parts = [...new Set(best.hits.map((h) => h[1]))].slice(0, 2);
  if (cols.length) parts.push(`tons ${cols.join(' et ')}`);
  const [label, origin] = STYLE_LABEL[best.id];
  return { id: best.id, label, origin, name: STYLE_BY_ID[best.id]?.fr || label, why: parts.join(', ') || 'équilibre général de la tenue', score: Math.round(best.score * 10) / 10, second: res[1] && res[1].score > best.score - 1 ? res[1].id : null };
}

/**
 * Les pièces qui font chaque style (4 à 5 par style). `subs` : types acceptés ; `colors` : couleurs acceptées (vide = toutes).
 * Budgets indicatifs en France, pas des offres.
 */
export const STYLE_KITS = {
  italian: [
    { name: 'Polo en maille', subs: ['polo'], colors: ['navy', 'beige', 'ecru', 'white', 'chocolate'], budget: [35, 90], material: 'Maille coton ou mérinos', why: 'la pièce signature italienne : plus doux qu\'une chemise, plus chic qu\'un tee-shirt' },
    { name: 'Pantalon habillé ou chino clair', subs: ['pantalon', 'chino'], colors: ['beige', 'ecru', 'white', 'mid-gray', 'chocolate', 'olive'], budget: [45, 110], material: 'Laine ou coton', why: 'jambe nette, tons doux' },
    { name: 'Mocassins marron', subs: ['mocassins'], colors: ['chocolate', 'suede-brown', 'cognac', 'dark-brown'], budget: [80, 180], material: 'Cuir ou daim', why: 'la chaussure italienne par excellence' },
    { name: 'Veste souple (blazer non structuré ou daim)', subs: ['blazer', 'veste-daim'], colors: [], budget: [100, 250], material: 'Laine texturée ou daim', why: 'épaules naturelles, allure décontractée' },
    { name: 'Chemise en lin', subs: ['chemise-lin'], colors: ['white', 'sky', 'ecru'], budget: [30, 80], material: 'Lin', why: 'l\'été à l\'italienne, col ouvert' },
  ],
  french: [
    { name: 'Jean droit brut', subs: ['jean'], colors: ['navy', 'indigo', 'mid-blue', 'black'], budget: [40, 100], material: 'Denim', why: 'la base du chic français' },
    { name: 'Chemise blanche', subs: ['chemise'], colors: ['white'], budget: [30, 70], material: 'Coton', why: 'simple et lumineuse' },
    { name: 'Blazer noir ou marine', subs: ['blazer'], colors: ['black', 'navy', 'charcoal'], budget: [100, 250], material: 'Laine', why: 'structure sobre sur un jean' },
    { name: 'Bottines ou Chelsea', subs: ['bottines', 'chelsea'], colors: [], budget: [90, 180], material: 'Cuir ou daim', why: 'la chaussure de ville française' },
    { name: 'Trench beige', subs: ['trench'], colors: ['beige', 'camel', 'sand', 'khaki'], budget: [100, 250], material: 'Gabardine', why: 'le manteau parisien de mi-saison' },
  ],
  british: [
    { name: 'Pantalon en flanelle grise', subs: ['flanelle', 'pantalon'], colors: ['mid-gray', 'charcoal', 'light-gray'], budget: [60, 140], material: 'Flanelle', why: 'le pantalon anglais d\'hiver' },
    { name: 'Veste en tweed ou blazer marron', subs: ['blazer', 'veste-costume'], colors: ['chocolate', 'dark-brown', 'forest', 'mid-gray', 'olive'], budget: [120, 280], material: 'Tweed', why: 'la texture britannique' },
    { name: 'Chemise bleu ciel ou blanche', subs: ['chemise'], colors: ['sky', 'white'], budget: [30, 70], material: 'Coton Oxford', why: 'classique sous une veste' },
    { name: 'Derbies ou brogues', subs: ['derbies', 'richelieus'], colors: ['chocolate', 'dark-brown', 'black', 'cognac'], budget: [90, 200], material: 'Cuir', why: 'chaussures solides et habillées' },
    { name: 'Cravate en laine ou soie', subs: ['cravate'], colors: [], budget: [25, 60], material: 'Laine ou soie', why: 'la finition anglaise' },
  ],
  ivy: [
    { name: 'Chemise Oxford bleue', subs: ['chemise'], colors: ['sky', 'white'], budget: [30, 70], material: 'Coton Oxford', why: 'la chemise universitaire américaine' },
    { name: 'Chino beige', subs: ['chino'], colors: ['beige', 'khaki', 'sand', 'ecru'], budget: [35, 80], material: 'Coton', why: 'la base Ivy' },
    { name: 'Pull col rond ou torsadé', subs: ['pull', 'cardigan'], colors: ['navy', 'burgundy', 'forest', 'ecru'], budget: [40, 90], material: 'Laine ou coton', why: 'sur la chemise Oxford' },
    { name: 'Mocassins ou chaussures bateau', subs: ['mocassins', 'bateau'], colors: [], budget: [70, 160], material: 'Cuir', why: 'les chaussures preppy' },
    { name: 'Ceinture tressée', subs: ['ceinture-tressee'], colors: [], budget: [20, 50], material: 'Cuir ou toile', why: 'le détail américain' },
  ],
  japanese: [
    { name: 'Surchemise', subs: ['surchemise', 'veste-denim'], colors: ['olive', 'navy', 'indigo', 'ecru', 'khaki'], budget: [40, 110], material: 'Toile ou denim', why: 'la couche japonaise, robuste et soignée' },
    { name: 'Chino kaki ou olive', subs: ['chino', 'pantalon'], colors: ['olive', 'khaki', 'beige'], budget: [35, 90], material: 'Coton', why: 'la couleur Ametora' },
    { name: 'Jean brut', subs: ['jean'], colors: ['navy', 'indigo'], budget: [50, 120], material: 'Denim brut', why: 'le denim de qualité est au cœur du style' },
    { name: 'Chemise Oxford blanche', subs: ['chemise'], colors: ['white', 'sky'], budget: [30, 70], material: 'Coton Oxford', why: 'précision des classiques' },
    { name: 'Derbies marron', subs: ['derbies', 'mocassins'], colors: [], budget: [80, 180], material: 'Cuir', why: 'chaussures robustes et nettes' },
  ],
  scandi: [
    { name: 'Col roulé gris ou noir', subs: ['col-roule'], colors: ['charcoal', 'mid-gray', 'light-gray', 'black'], budget: [40, 90], material: 'Mérinos', why: 'la pièce minimaliste par excellence' },
    { name: 'Pantalon gris droit', subs: ['pantalon', 'chino', 'flanelle'], colors: ['mid-gray', 'charcoal', 'light-gray', 'black'], budget: [45, 110], material: 'Laine ou coton', why: 'lignes épurées' },
    { name: 'Manteau anthracite', subs: ['manteau', 'caban'], colors: ['charcoal', 'black', 'mid-gray'], budget: [150, 350], material: 'Laine', why: 'silhouette nette en hiver' },
    { name: 'Baskets minimalistes', subs: ['baskets'], colors: ['white', 'black', 'light-gray'], budget: [60, 130], material: 'Cuir', why: 'sobres, sans logo' },
  ],
  quiet: [
    { name: 'Pull ou col roulé (cachemire idéal)', subs: ['pull', 'col-roule', 'cardigan'], colors: ['taupe', 'ecru', 'camel', 'beige', 'chocolate'], budget: [70, 180], material: 'Cachemire ou mérinos', why: 'la matière avant tout, sans logo' },
    { name: 'Polo en maille fine', subs: ['polo'], colors: ['ecru', 'taupe', 'chocolate', 'beige', 'navy'], budget: [40, 100], material: 'Maille fine', why: 'luxe discret au quotidien' },
    { name: 'Pantalon taupe ou écru', subs: ['pantalon', 'chino'], colors: ['taupe', 'ecru', 'beige', 'chocolate', 'sand'], budget: [50, 120], material: 'Laine ou coton', why: 'tons neutres et chauds' },
    { name: 'Mocassins en daim', subs: ['mocassins'], colors: ['suede-brown', 'chocolate', 'taupe', 'dark-brown'], budget: [90, 200], material: 'Daim', why: 'chaussure fine et discrète' },
    { name: 'Veste en daim', subs: ['veste-daim'], colors: [], budget: [150, 350], material: 'Daim', why: 'la texture noble du style' },
  ],
  'old-money': [
    { name: 'Pull torsadé', subs: ['pull', 'cardigan'], colors: ['ecru', 'navy', 'white', 'forest'], budget: [45, 110], material: 'Laine', why: 'la pièce signature' },
    { name: 'Chino écru', subs: ['chino', 'pantalon'], colors: ['ecru', 'beige', 'white', 'sand'], budget: [35, 90], material: 'Coton', why: 'clair et net' },
    { name: 'Chemise blanche ou ciel', subs: ['chemise'], colors: ['white', 'sky'], budget: [30, 70], material: 'Coton Oxford', why: 'sous le pull' },
    { name: 'Mocassins', subs: ['mocassins', 'bateau'], colors: [], budget: [80, 180], material: 'Cuir', why: 'la chaussure du style' },
  ],
  'smart-casual': [
    { name: 'Polo en maille beige ou marine', subs: ['polo'], colors: ['beige', 'navy', 'ecru', 'white'], budget: [35, 90], material: 'Maille', why: 'le cœur du smart casual' },
    { name: 'Pantalon ou chino marine ou beige', subs: ['chino', 'pantalon'], colors: ['navy', 'beige', 'mid-gray'], budget: [35, 90], material: 'Coton', why: 'polyvalent' },
    { name: 'Baskets sobres', subs: ['baskets'], colors: ['white', 'light-gray', 'black'], budget: [60, 130], material: 'Cuir', why: 'détente sans négligé' },
    { name: 'Blazer non structuré', subs: ['blazer'], colors: [], budget: [100, 220], material: 'Laine ou coton', why: 'à ajouter pour monter d\'un cran' },
  ],
  'casual-chic': [
    { name: 'Jean droit', subs: ['jean'], colors: [], budget: [40, 100], material: 'Denim', why: 'la base' },
    { name: 'Pull gris', subs: ['pull', 'col-roule'], colors: ['light-gray', 'mid-gray', 'navy', 'ecru'], budget: [40, 90], material: 'Laine', why: 'chaleur et allure' },
    { name: 'Bottines ou derbies', subs: ['bottines', 'chelsea', 'derbies'], colors: [], budget: [90, 180], material: 'Cuir', why: 'remplacent les baskets pour plus de chic' },
    { name: 'Manteau marine ou veste en cuir', subs: ['manteau', 'caban', 'veste-cuir'], colors: [], budget: [150, 350], material: 'Laine ou cuir', why: 'la pièce raffinée qui élève la tenue' },
  ],
  'business-casual': [
    { name: 'Blazer marine', subs: ['blazer'], colors: ['navy'], budget: [100, 250], material: 'Laine', why: 'la base du bureau' },
    { name: 'Chemise blanche ou ciel', subs: ['chemise'], colors: ['white', 'sky'], budget: [30, 70], material: 'Coton', why: 'nette sous la veste' },
    { name: 'Chino beige ou pantalon gris', subs: ['chino', 'pantalon', 'flanelle'], colors: ['beige', 'mid-gray', 'charcoal', 'navy'], budget: [40, 110], material: 'Coton ou laine', why: 'professionnel sans costume' },
    { name: 'Derbies', subs: ['derbies', 'mocassins'], colors: [], budget: [80, 180], material: 'Cuir', why: 'chaussures professionnelles' },
    { name: 'Ceinture cuir marron', subs: ['ceinture-cuir'], colors: [], budget: [25, 60], material: 'Cuir', why: 'assortie aux chaussures' },
  ],
  'business-formal': [
    { name: 'Costume marine ou anthracite', subs: ['veste-costume'], colors: ['navy', 'charcoal', 'mid-gray'], budget: [200, 450], material: 'Laine', why: 'obligatoire pour ce code' },
    { name: 'Chemise blanche habillée', subs: ['chemise'], colors: ['white', 'sky'], budget: [35, 80], material: 'Popeline', why: 'sous le costume' },
    { name: 'Cravate sombre', subs: ['cravate'], colors: [], budget: [25, 60], material: 'Soie', why: 'attendue en formel' },
    { name: 'Richelieus noirs', subs: ['richelieus'], colors: ['black', 'dark-brown'], budget: [100, 200], material: 'Cuir', why: 'les chaussures les plus habillées' },
  ],
  sartorial: [
    { name: 'Veste bien coupée', subs: ['veste-costume', 'blazer'], colors: [], budget: [200, 450], material: 'Laine', why: 'la coupe est tout' },
    { name: 'Pantalon à pinces', subs: ['pantalon', 'flanelle', 'pantalon-costume'], colors: [], budget: [60, 150], material: 'Laine', why: 'tombé travaillé' },
    { name: 'Pochette', subs: ['pochette'], colors: [], budget: [15, 45], material: 'Soie ou lin', why: 'la signature sartoriale' },
    { name: 'Richelieus', subs: ['richelieus'], colors: [], budget: [100, 200], material: 'Cuir', why: 'chaussures nobles' },
  ],
  mediterranean: [
    { name: 'Chemise en lin', subs: ['chemise-lin'], colors: ['white', 'ecru', 'sky', 'taupe'], budget: [30, 80], material: 'Lin', why: 'respire par la chaleur' },
    { name: 'Pantalon écru léger', subs: ['pantalon', 'chino'], colors: ['ecru', 'white', 'sand', 'beige'], budget: [40, 90], material: 'Lin ou coton', why: 'clair et frais' },
    { name: 'Espadrilles ou mocassins daim', subs: ['espadrilles', 'mocassins'], colors: [], budget: [30, 150], material: 'Toile ou daim', why: 'l\'été méditerranéen' },
    { name: 'Bermuda beige', subs: ['bermuda'], colors: ['beige', 'ecru', 'sand', 'navy'], budget: [30, 60], material: 'Coton ou lin', why: 'pour les vrais jours de chaleur' },
  ],
  contemporary: [
    { name: 'Veste texturée', subs: ['blazer', 'surchemise', 'veste-daim'], colors: [], budget: [100, 250], material: 'Laine, velours ou daim', why: 'la texture donne le caractère' },
    { name: 'Pull écru', subs: ['pull', 'col-roule'], colors: ['ecru', 'white', 'beige'], budget: [40, 90], material: 'Laine', why: 'clair et chaleureux' },
    { name: 'Jean brut', subs: ['jean'], colors: ['navy', 'indigo'], budget: [50, 120], material: 'Denim brut', why: 'la base moderne' },
    { name: 'Bottines', subs: ['bottines', 'chelsea'], colors: [], budget: [90, 180], material: 'Cuir ou daim', why: 'la chaussure du style' },
  ],
};

/** Les 5 grandes écoles du guide (Top 5). */
export const SCHOOL_STYLES = ['italian', 'french', 'british', 'ivy', 'japanese'];

/** Quelle fiche du dressing joue ce rôle dans le style ? Couleur identique ou proche ; sinon même type (couleur « à revoir »). */
export function kitMatch(item, garments) {
  const same = garments.filter((g) => item.subs.includes(g.sub));
  const exact = same.find((g) => !item.colors.length || colorIn(g, item.colors));
  if (exact) return { garment: exact, quality: 2 };
  return same[0] ? { garment: same[0], quality: 1 } : null;
}

/**
 * Pour chaque style choisi : pièces possédées, pièces à acheter, pourcentage prêt.
 * @param {Array<{id, pct?}>} styles
 */
export function styleCoverage(garments, styles) {
  const usable = garments || []; // une pièce à laver reste possédée
  return styles.filter((s) => STYLE_KITS[s.id]).map((s) => {
    const items = STYLE_KITS[s.id].map((it) => ({ ...it, match: kitMatch(it, usable) }));
    const owned = items.filter((i) => i.match?.quality === 2).length;
    const near = items.filter((i) => i.match?.quality === 1).length;
    const pctReady = Math.round(((owned + near * 0.5) / items.length) * 100);
    const [label, origin] = STYLE_LABEL[s.id];
    return { id: s.id, weight: s.pct ?? null, label, origin, name: STYLE_BY_ID[s.id]?.fr || label, items, owned, near, total: items.length, pctReady, toBuy: items.filter((i) => !i.match), status: pctReady >= 80 ? 'ready' : pctReady >= 50 ? 'partial' : 'missing' };
  });
}
