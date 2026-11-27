// B9 — Colorimétrie. Données initiales versionnées (seed v1).
export const SEED_VERSION = '2026-11-24.1';

/** Palette principale (13 couleurs) — B9, ordre et valeurs conservés. */
export const MAIN_COLORS = [
  { id: 'navy', name: 'Marine', hex: '#22344E', associations: 'Écru, gris, ciel, camel', vigilance: 'Vérifier nuances si ton sur ton' },
  { id: 'ecru', name: 'Écru', hex: '#EFE8D7', associations: 'Marine, chocolat, olive, taupe', vigilance: 'Attention au contraste de blancs' },
  { id: 'beige', name: 'Beige', hex: '#C9B79C', associations: 'Marine, blanc, olive, chocolat', vigilance: 'Varier textures en camaïeu' },
  { id: 'chocolate', name: 'Chocolat', hex: '#563B2E', associations: 'Écru, beige, ciel, olive', vigilance: 'Éviter accumulation de bruns indistincts' },
  { id: 'charcoal', name: 'Anthracite', hex: '#393D42', associations: 'Gris, noir, blanc, bordeaux', vigilance: 'Équilibrer valeurs sombres' },
  { id: 'light-gray', name: 'Gris clair', hex: '#B8BBC0', associations: 'Marine, anthracite, chocolat', vigilance: 'Attention au manque de contraste' },
  { id: 'olive', name: 'Olive', hex: '#6C7350', associations: 'Écru, beige, marine, marron', vigilance: 'Éviter trop de couleurs saturées' },
  { id: 'sky', name: 'Bleu ciel', hex: '#A9C9DF', associations: 'Marine, écru, beige', vigilance: 'Belle alternative au blanc' },
  { id: 'camel', name: 'Camel', hex: '#B58B5B', associations: 'Marine, écru, chocolat', vigilance: 'Vérifier sous-ton' },
  { id: 'taupe', name: 'Taupe', hex: '#8F8176', associations: 'Crème, chocolat, marine', vigilance: 'Apporter texture/contraste' },
  { id: 'burgundy', name: 'Bordeaux', hex: '#702E3E', associations: 'Gris, marine, crème', vigilance: 'Accent plutôt qu\'accumulation' },
  { id: 'white', name: 'Blanc', hex: '#FAFAF7', associations: 'Marine, noir, olive', vigilance: 'Vigilance transparence/entretien' },
  { id: 'black', name: 'Noir', hex: '#161719', associations: 'Gris, blanc, écru, taupe', vigilance: 'Contraste élevé selon les pièces' },
];

/** Couleurs auxiliaires du générateur — B9. */
export const AUX_COLORS = [
  { id: 'mid-gray', name: 'Gris moyen', hex: '#777C84', aux: true },
  { id: 'cognac', name: 'Cognac', hex: '#995B36', aux: true },
  { id: 'mid-blue', name: 'Bleu moyen', hex: '#527397', aux: true },
  { id: 'suede-brown', name: 'Daim marron', hex: '#76583D', aux: true },
  { id: 'dark-brown', name: 'Marron très foncé', hex: '#38271E', aux: true },
];

export const ALL_COLORS = [...MAIN_COLORS, ...AUX_COLORS];

/**
 * Couleurs supplémentaires du dressing : pour enregistrer fidèlement toute pièce (y compris hors palette conseillée).
 * Elles ne s'ajoutent pas au générateur de couleurs (qui suit le guide), mais servent aux fiches, à l'import JSON et aux photos.
 */
export const EXTRA_COLORS = [
  { id: 'forest', name: 'Vert forêt', hex: '#2F4A3A', extra: true },
  { id: 'bottle-green', name: 'Vert bouteille', hex: '#1F3B2D', extra: true },
  { id: 'green', name: 'Vert', hex: '#3E7B4F', extra: true },
  { id: 'sage', name: 'Vert sauge', hex: '#9CAF94', extra: true },
  { id: 'khaki', name: 'Kaki', hex: '#8B8658', extra: true },
  { id: 'indigo', name: 'Indigo (denim brut)', hex: '#2E3F66', extra: true },
  { id: 'royal-blue', name: 'Bleu roi', hex: '#2F4DA0', extra: true },
  { id: 'petrol', name: 'Bleu pétrole', hex: '#1F5662', extra: true },
  { id: 'turquoise', name: 'Turquoise', hex: '#3AA6A0', extra: true },
  { id: 'red', name: 'Rouge', hex: '#B23A3A', extra: true },
  { id: 'rust', name: 'Rouille', hex: '#A0522D', extra: true },
  { id: 'terracotta', name: 'Terracotta', hex: '#C0683F', extra: true },
  { id: 'orange', name: 'Orange', hex: '#D9822B', extra: true },
  { id: 'mustard', name: 'Moutarde', hex: '#C9A227', extra: true },
  { id: 'yellow', name: 'Jaune', hex: '#E5C84A', extra: true },
  { id: 'pale-pink', name: 'Rose pâle', hex: '#F0D3D6', extra: true },
  { id: 'pink', name: 'Rose', hex: '#E3A5B3', extra: true },
  { id: 'lavender', name: 'Lavande', hex: '#B7A6D3', extra: true },
  { id: 'purple', name: 'Violet', hex: '#5E3A6E', extra: true },
  { id: 'sand', name: 'Sable', hex: '#D6C3A0', extra: true },
  { id: 'silver', name: 'Argent / acier', hex: '#C0C0C4', extra: true },
  { id: 'gold', name: 'Doré', hex: '#C8A24A', extra: true },
];
/** Toutes les couleurs possibles d'une pièce (palette du guide + auxiliaires + supplémentaires). */
export const GARMENT_COLORS = [...ALL_COLORS, ...EXTRA_COLORS];
export const COLOR_BY_ID = Object.fromEntries(GARMENT_COLORS.map((c) => [c.id, c]));

/** Familles utiles aux règles (neutres, chaleur, famille de cuir). */
export const COLOR_TRAITS = {
  navy: { family: 'blue', temp: 'cold', neutral: true },
  ecru: { family: 'cream', temp: 'warm', neutral: true },
  beige: { family: 'cream', temp: 'warm', neutral: true },
  chocolate: { family: 'brown', temp: 'warm', neutral: true },
  charcoal: { family: 'gray', temp: 'cold', neutral: true },
  'light-gray': { family: 'gray', temp: 'cold', neutral: true },
  olive: { family: 'green', temp: 'warm', neutral: true },
  sky: { family: 'blue', temp: 'cold', neutral: false },
  camel: { family: 'brown', temp: 'warm', neutral: true },
  taupe: { family: 'brown', temp: 'warm', neutral: true },
  burgundy: { family: 'red', temp: 'warm', neutral: false },
  white: { family: 'white', temp: 'cold', neutral: true },
  black: { family: 'black', temp: 'cold', neutral: true },
  'mid-gray': { family: 'gray', temp: 'cold', neutral: true },
  cognac: { family: 'brown', temp: 'warm', neutral: false },
  'mid-blue': { family: 'blue', temp: 'cold', neutral: false },
  'suede-brown': { family: 'brown', temp: 'warm', neutral: true },
  'dark-brown': { family: 'brown', temp: 'warm', neutral: true },
  forest: { family: 'green', temp: 'cold', neutral: true }, 'bottle-green': { family: 'green', temp: 'cold', neutral: false }, green: { family: 'green', temp: 'cold', neutral: false },
  sage: { family: 'green', temp: 'cold', neutral: false }, khaki: { family: 'green', temp: 'warm', neutral: true }, indigo: { family: 'blue', temp: 'cold', neutral: true },
  'royal-blue': { family: 'blue', temp: 'cold', neutral: false }, petrol: { family: 'blue', temp: 'cold', neutral: false }, turquoise: { family: 'blue', temp: 'cold', neutral: false },
  red: { family: 'red', temp: 'warm', neutral: false }, rust: { family: 'brown', temp: 'warm', neutral: false }, terracotta: { family: 'red', temp: 'warm', neutral: false },
  orange: { family: 'orange', temp: 'warm', neutral: false }, mustard: { family: 'yellow', temp: 'warm', neutral: false }, yellow: { family: 'yellow', temp: 'warm', neutral: false },
  'pale-pink': { family: 'pink', temp: 'warm', neutral: false }, pink: { family: 'pink', temp: 'warm', neutral: false }, lavender: { family: 'purple', temp: 'cold', neutral: false },
  purple: { family: 'purple', temp: 'cold', neutral: false }, sand: { family: 'cream', temp: 'warm', neutral: true }, silver: { family: 'gray', temp: 'cold', neutral: true },
  gold: { family: 'yellow', temp: 'warm', neutral: false },
};

/** 20 palettes intemporelles — ordre et notes du guide conservés. */
export const PALETTES_20 = [
  { n: 1, name: 'Marine + écru + marron', hex: ['#22344E', '#EFE8D7', '#563B2E'], note: 9.8 },
  { n: 2, name: 'Chocolat + crème + camel', hex: ['#563B2E', '#EFE8D7', '#B58B5B'], note: 9.8 },
  { n: 3, name: 'Bleu ciel + marine + beige', hex: ['#A9C9DF', '#22344E', '#C9B79C'], note: 9.6 },
  { n: 4, name: 'Olive + écru + marron', hex: ['#6C7350', '#EFE8D7', '#563B2E'], note: 9.7 },
  { n: 5, name: 'Anthracite + gris clair + noir', hex: ['#393D42', '#B8BBC0', '#161719'], note: 9.5 },
  { n: 6, name: 'Camel + marine + blanc', hex: ['#B58B5B', '#22344E', '#FAFAF7'], note: 9.6 },
  { n: 7, name: 'Taupe + crème + chocolat', hex: ['#8F8176', '#EFE8D7', '#563B2E'], note: 9.7 },
  { n: 8, name: 'Blanc + marine + cognac', hex: ['#FAFAF7', '#22344E', '#995B36'], note: 9.5 },
  { n: 9, name: 'Bordeaux + gris + marine', hex: ['#702E3E', '#B8BBC0', '#22344E'], note: 9.2 },
  { n: 10, name: 'Beige + olive + crème', hex: ['#C9B79C', '#6C7350', '#EFE8D7'], note: 9.4 },
  { n: 11, name: 'Noir + écru + anthracite', hex: ['#161719', '#EFE8D7', '#393D42'], note: 9.3 },
  { n: 12, name: 'Marine + gris + bordeaux', hex: ['#22344E', '#B8BBC0', '#702E3E'], note: 9.4 },
  { n: 13, name: 'Bleu ciel + écru + cognac', hex: ['#A9C9DF', '#EFE8D7', '#995B36'], note: 9.5 },
  { n: 14, name: 'Marron + gris clair + écru', hex: ['#563B2E', '#B8BBC0', '#EFE8D7'], note: 9.3 },
  { n: 15, name: 'Beige + taupe + crème', hex: ['#C9B79C', '#8F8176', '#EFE8D7'], note: 9.7 },
  { n: 16, name: 'Marine + bleu moyen + bleu ciel', hex: ['#22344E', '#527397', '#A9C9DF'], note: 9.3 },
  { n: 17, name: 'Olive + marine + beige', hex: ['#6C7350', '#22344E', '#C9B79C'], note: 9.2 },
  { n: 18, name: 'Bordeaux + crème + chocolat', hex: ['#702E3E', '#EFE8D7', '#563B2E'], note: 9.4 },
  { n: 19, name: 'Noir + gris + blanc', hex: ['#161719', '#B8BBC0', '#FAFAF7'], note: 9.2 },
  { n: 20, name: 'Camel + chocolat + écru', hex: ['#B58B5B', '#563B2E', '#EFE8D7'], note: 9.7 },
];
export const PALETTES_NOTE = 'Notes stylistiques indicatives pour un vestiaire classique. Les palettes 2 et 20, proches, sont volontairement conservées comme dans le guide, avec rôles/ordre différents. Palette de base personnelle : marine, écru, beige, marron foncé, puis gris et olive.';

/** Matrice JSON originale du générateur — comportement initial exact (B9). */
export const ORIGINAL_MATRIX = [
  { name: 'Beige', hex: '#C9B79C', tops: [['Marine', '#22344E'], ['Blanc', '#FAFAF7'], ['Olive', '#6C7350'], ['Bleu ciel', '#A9C9DF'], ['Chocolat', '#563B2E']], jacket: ['Marine', '#22344E'], shoe: ['Marron foncé', '#563B2E'] },
  { name: 'Marine', hex: '#22344E', tops: [['Écru', '#EFE8D7'], ['Bleu ciel', '#A9C9DF'], ['Gris clair', '#B8BBC0'], ['Camel', '#B58B5B'], ['Blanc', '#FAFAF7']], jacket: ['Taupe', '#8F8176'], shoe: ['Cognac', '#995B36'] },
  { name: 'Écru', hex: '#EFE8D7', tops: [['Marine', '#22344E'], ['Chocolat', '#563B2E'], ['Olive', '#6C7350'], ['Taupe', '#8F8176'], ['Bleu ciel', '#A9C9DF']], jacket: ['Marine', '#22344E'], shoe: ['Daim marron', '#76583D'] },
  { name: 'Gris', hex: '#777C84', tops: [['Marine', '#22344E'], ['Blanc', '#FAFAF7'], ['Bordeaux', '#702E3E'], ['Noir', '#161719'], ['Bleu ciel', '#A9C9DF']], jacket: ['Marine', '#22344E'], shoe: ['Noir', '#161719'] },
  { name: 'Olive', hex: '#6C7350', tops: [['Écru', '#EFE8D7'], ['Marine', '#22344E'], ['Beige', '#C9B79C'], ['Blanc', '#FAFAF7'], ['Chocolat', '#563B2E']], jacket: ['Camel', '#B58B5B'], shoe: ['Marron', '#563B2E'] },
  { name: 'Noir', hex: '#161719', tops: [['Blanc', '#FAFAF7'], ['Gris clair', '#B8BBC0'], ['Écru', '#EFE8D7'], ['Anthracite', '#393D42'], ['Taupe', '#8F8176']], jacket: ['Anthracite', '#393D42'], shoe: ['Noir', '#161719'] },
  { name: 'Marron', hex: '#563B2E', tops: [['Écru', '#EFE8D7'], ['Bleu ciel', '#A9C9DF'], ['Beige', '#C9B79C'], ['Taupe', '#8F8176'], ['Marine', '#22344E']], jacket: ['Camel', '#B58B5B'], shoe: ['Marron foncé', '#38271E'] },
];
/** Correspondance des noms de la matrice originale vers les identifiants de couleurs. */
export const MATRIX_BASE_IDS = { Beige: 'beige', Marine: 'navy', 'Écru': 'ecru', Gris: 'mid-gray', Olive: 'olive', Noir: 'black', Marron: 'chocolate' };

/**
 * Règles ajoutées pour les couleurs absentes de la matrice originale (bas).
 * Marquées `origin: 'rule'` : ce sont des règles éditoriales de l'application,
 * dérivées des associations B9, non des données du guide initial.
 */
export const ADDED_BOTTOM_RULES = {
  charcoal: { tops: ['white', 'sky', 'light-gray', 'burgundy', 'ecru'], jacket: 'navy', shoe: 'black', belt: 'black', why: 'Anthracite : blanc, gris, noir et bordeaux sont listés en B9 ; le ciel adoucit l\'ensemble.' },
  'light-gray': { tops: ['navy', 'white', 'sky', 'burgundy', 'chocolate'], jacket: 'navy', shoe: 'dark-brown', belt: 'dark-brown', why: 'Gris clair : marine, anthracite, chocolat (B9) ; « blazer marine, chemise ciel, pantalon gris » (B2).' },
  camel: { tops: ['navy', 'white', 'ecru', 'chocolate', 'sky'], jacket: 'navy', shoe: 'dark-brown', belt: 'dark-brown', why: 'Camel : marine, écru, chocolat (B9) ; vérifier le sous-ton.' },
  taupe: { tops: ['ecru', 'navy', 'white', 'chocolate', 'sky'], jacket: 'navy', shoe: 'suede-brown', belt: 'chocolate', why: 'Taupe : crème, chocolat, marine (B9) ; apporter texture et contraste.' },
  white: { tops: ['navy', 'sky', 'olive', 'chocolate', 'beige'], jacket: 'navy', shoe: 'suede-brown', belt: 'chocolate', why: 'Blanc : marine, noir, olive (B9) ; registre estival, vigilance entretien.' },
  sky: { tops: ['navy', 'white', 'ecru', 'beige', 'chocolate'], jacket: 'navy', shoe: 'cognac', belt: 'cognac', why: 'Bas bleu ciel peu courant : marine, écru, beige (B9). Plutôt réservé à l\'été.' },
  burgundy: { tops: ['ecru', 'light-gray', 'navy', 'white', 'black'], jacket: 'charcoal', shoe: 'dark-brown', belt: 'dark-brown', why: 'Bordeaux en bas est un choix affirmé : à équilibrer par gris, marine ou crème (B9).' },
  'mid-blue': { tops: ['white', 'ecru', 'navy', 'light-gray', 'olive'], jacket: 'navy', shoe: 'suede-brown', belt: 'chocolate', why: 'Bleu moyen (proche d\'un denim) : bases claires et marine, cuir marron.' },
  cognac: { tops: ['navy', 'ecru', 'white', 'sky', 'olive'], jacket: 'navy', shoe: 'dark-brown', belt: 'dark-brown', why: 'Cognac en bas, rare : complémentaire atténuée avec le marine (B9, règle 4).' },
  'suede-brown': { tops: ['ecru', 'sky', 'navy', 'white', 'beige'], jacket: 'navy', shoe: 'dark-brown', belt: 'dark-brown', why: 'Brun moyen : mêmes principes que le marron (matrice « Marron »).' },
  'dark-brown': { tops: ['ecru', 'sky', 'beige', 'taupe', 'navy'], jacket: 'camel', shoe: 'black', belt: 'black', why: 'Brun très foncé : mêmes principes que le marron, chaussures plus sombres pour le contraste.' },
};

/** Ceinture par défaut selon les chaussures (repère formel, pas une obligation — B6). */
export const DEFAULT_BELT_FOR_SHOE = { black: 'black', charcoal: 'black', cognac: 'cognac', 'suede-brown': 'chocolate', chocolate: 'chocolate', 'dark-brown': 'dark-brown', white: 'chocolate', taupe: 'chocolate' };

export const COLOR_RULES = [
  { id: 'contrast', title: 'Contraste', text: 'Marine avec crème crée une séparation nette.' },
  { id: 'monochrome', title: 'Monochrome', text: 'Continuité d\'une couleur.' },
  { id: 'camaieu', title: 'Camaïeu', text: 'Nuances proches et profondeur par les textures.' },
  { id: 'complementary', title: 'Complémentaires', text: 'Bleu et orange ; préférer souvent des versions atténuées marine/cognac.' },
  { id: 'thermal', title: 'Équilibre thermique', text: 'Tons chauds et froids peuvent se mélanger, ex. marine/camel.' },
];
export const FACE_COLOR_NOTE = 'La couleur près du visage dépend de la carnation et des contrastes naturels, à déterminer sans inférence automatique hasardeuse.';

export const TEXTURES = [
  { id: 'smooth', name: 'Lisse (popeline, laine peignée)' },
  { id: 'knit', name: 'Maille' },
  { id: 'linen', name: 'Lin' },
  { id: 'flannel', name: 'Flanelle' },
  { id: 'suede', name: 'Daim' },
  { id: 'tweed', name: 'Tweed' },
  { id: 'denim', name: 'Denim' },
];

/** Signatures italiennes (B2). */
export const ITALIAN_SIGNATURES = [
  { name: 'Camaïeu beige, blanc, taupe', colors: ['beige', 'white', 'taupe'], text: 'Peu de contrastes agressifs, mais textures différentes.' },
  { name: 'Polo en maille écru et pantalon marine', colors: ['ecru', 'navy'], text: 'Une alternative à la chemise.' },
  { name: 'Olive, crème, marron', colors: ['olive', 'ecru', 'chocolate'], text: 'Palette naturelle, chaleureuse.' },
  { name: 'Blazer marine, chemise ciel, pantalon gris', colors: ['navy', 'sky', 'mid-gray'], text: 'Pièces dépareillées pour être élégant sans costume complet.' },
];
