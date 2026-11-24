// Taxonomie du dressing (A3). Les valeurs par défaut de formalité/chaleur sont des points de départ modifiables.

export const CATEGORIES = [
  { id: 'haut', name: 'Haut', role: 'top', subs: [
    ['chemise', 'Chemise', 3, 2], ['chemise-lin', 'Chemise en lin', 3, 1], ['polo', 'Polo en maille', 3, 2], ['polo-sport', 'Polo piqué', 2, 2],
    ['pull', 'Pull', 3, 3], ['col-roule', 'Col roulé', 3, 3], ['cardigan', 'Cardigan', 3, 3], ['tee-shirt', 'Tee-shirt', 2, 1], ['sweat', 'Sweat', 1, 3], ['polaire', 'Polaire', 1, 4],
  ] },
  { id: 'bas', name: 'Bas', role: 'bottom', subs: [
    ['pantalon', 'Pantalon habillé', 4, 3], ['pantalon-costume', 'Pantalon de costume', 5, 3], ['chino', 'Chino', 3, 2], ['jean', 'Jean', 2, 3],
    ['flanelle', 'Pantalon flanelle', 4, 4], ['bermuda', 'Bermuda', 2, 1], ['short', 'Short', 1, 1], ['jogging', 'Jogging', 1, 2], ['pantalon-technique', 'Pantalon technique', 1, 3], ['jupe', 'Jupe', 3, 2],
  ] },
  { id: 'veste', name: 'Veste', role: 'layer', subs: [
    ['blazer', 'Blazer', 4, 3], ['veste-costume', 'Veste de costume', 5, 3], ['surchemise', 'Surchemise', 2, 3], ['veste-daim', 'Veste en daim', 3, 3],
    ['veste-cuir', 'Veste en cuir', 3, 3], ['veste-denim', 'Veste en denim', 2, 3], ['veste-technique', 'Veste technique', 1, 4], ['cardigan-epais', 'Gilet/cardigan épais', 2, 3],
  ] },
  { id: 'manteau', name: 'Manteau', role: 'outer', subs: [
    ['manteau', 'Manteau laine', 4, 5], ['trench', 'Trench', 3, 3], ['caban', 'Caban', 3, 4], ['parka', 'Parka', 2, 5], ['doudoune', 'Doudoune', 2, 5], ['impermeable', 'Imperméable', 2, 2],
  ] },
  { id: 'chaussures', name: 'Chaussures', role: 'shoes', subs: [
    ['mocassins', 'Mocassins', 3, 2], ['derbies', 'Derbies', 4, 2], ['richelieus', 'Richelieus', 5, 2], ['chelsea', 'Chelsea', 3, 3], ['bottines', 'Bottines', 3, 3],
    ['baskets', 'Baskets minimalistes', 2, 2], ['espadrilles', 'Espadrilles', 2, 1], ['sandales', 'Sandales', 1, 1], ['bateau', 'Chaussures bateau', 2, 1], ['randonnee', 'Chaussures de randonnée', 1, 4], ['ballerines', 'Ballerines', 3, 1],
  ] },
  { id: 'ceinture', name: 'Ceinture', role: 'belt', subs: [['ceinture-cuir', 'Ceinture cuir', 4, 0], ['ceinture-tressee', 'Ceinture tressée', 2, 0], ['ceinture-toile', 'Ceinture toile', 2, 0]] },
  { id: 'accessoire', name: 'Accessoire', role: 'accessory', subs: [
    ['cravate', 'Cravate', 5, 0], ['pochette', 'Pochette', 4, 0], ['montre', 'Montre classique', 3, 0], ['montre-connectee', 'Montre connectée (Apple Watch…)', 2, 0], ['bracelet-montre', 'Bracelet de montre', 3, 0], ['lunettes-vue', 'Lunettes de vue', 3, 0], ['echarpe', 'Écharpe', 3, 2], ['lunettes', 'Lunettes', 2, 0], ['sac', 'Sac', 3, 0], ['bonnet', 'Bonnet', 1, 2], ['parapluie', 'Parapluie', 3, 0],
  ] },
];
export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
export const SUB_INFO = Object.fromEntries(CATEGORIES.flatMap((c) => c.subs.map(([id, name, formality, warmth]) => [id, { id, name, formality, warmth, category: c.id, role: c.role }])));
export const ROLE_LABELS = { top: 'Haut', bottom: 'Bas', layer: 'Veste', outer: 'Manteau', shoes: 'Chaussures', belt: 'Ceinture', accessory: 'Accessoire' };
export const ROLE_ORDER = ['outer', 'layer', 'top', 'bottom', 'belt', 'shoes', 'accessory'];

export const PATTERNS = ['Uni', 'Rayé', 'Carreaux', 'Pied-de-poule', 'Chevrons', 'Motif discret', 'Imprimé', 'Fair Isle', 'Torsadé'];
export const FITS = [['slim', 'Ajustée/slim'], ['regular', 'Droite/regular'], ['tapered', 'Droite légèrement fuselée'], ['relaxed', 'Ample/relaxed'], ['oversize', 'Oversize']];
export const SEASON_OPTS = [['spring', 'Printemps'], ['summer', 'Été'], ['autumn', 'Automne'], ['winter', 'Hiver']];
export const CONDITIONS = [['new', 'Neuf', 5], ['very-good', 'Très bon', 5], ['good', 'Bon', 4], ['worn', 'Usé', 2], ['damaged', 'Abîmé', 1]];
export const AVAILABILITY = [
  ['clean', 'Propre', true], ['worn', 'Porté (encore mettable)', true], ['to-wash', 'À laver', false], ['unavailable', 'Indisponible', false], ['alteration', 'En retouche', false], ['stored', 'Rangé (hors saison)', false],
];
export const AVAILABLE_STATES = AVAILABILITY.filter((a) => a[2]).map((a) => a[0]);
export const PHOTO_KINDS = [['single', 'Vêtement seul'], ['wardrobe', 'Plusieurs pièces (dressing)'], ['worn', 'Tenue portée']];
export const MATERIALS = ['Coton', 'Coton Oxford', 'Popeline', 'Lin', 'Laine', 'Laine peignée', 'Flanelle', 'Tweed', 'Mérinos', 'Cachemire', 'Soie', 'Denim', 'Velours côtelé', 'Gabardine', 'Daim', 'Cuir', 'Jersey', 'Polyester', 'Élasthanne', 'Polaire', 'Technique/membrane', 'Toile', 'Seersucker'];
export const NOBLE_MATERIALS = ['laine', 'mérinos', 'cachemire', 'lin', 'soie', 'flanelle', 'tweed', 'daim', 'cuir', 'oxford', 'popeline', 'gabardine'];
export const STYLE_OPTS = [
  ['italian', 'Italian Elegance'], ['french', 'French Chic'], ['british', 'British Classic'], ['sartorial', 'Sartorial'], ['old-money', 'Old Money'], ['quiet', 'Quiet Luxury'],
  ['smart-casual', 'Smart Casual'], ['business-casual', 'Business Casual'], ['business-formal', 'Business Formal'], ['ivy', 'Preppy/Ivy'], ['scandi', 'Minimalisme scandinave'],
  ['japanese', 'Classique japonais'], ['mediterranean', 'Chic méditerranéen'], ['casual-chic', 'Casual Chic'], ['contemporary', 'Contemporary Classic'],
];
export const MEASURE_FIELDS = [['shoulders', 'Épaules'], ['chest', 'Poitrine'], ['length', 'Longueur'], ['waist', 'Taille'], ['inseam', 'Entrejambe'], ['legOpening', 'Ouverture bas']];

/** Accessoires portés tous les jours par défaut (modifiable sur la fiche). */
export const EVERYDAY_SUBS = ['lunettes-vue', 'montre-connectee'];
export const isEveryday = (g) => (g.everyday ?? EVERYDAY_SUBS.includes(g.sub));
