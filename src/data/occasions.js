// B6 — Guide des occasions : 20 occasions × 3 tenues (Italien / Classique international / Moderne décontracté).
// Les métadonnées (formalité, contraintes) sont des paramètres de l'application pour le moteur de recommandations.
// formality: [min, max] sur l'échelle 1–5 des vêtements ; strict = dress code à respecter ; protection = sécurité/confort avant le style.

export const OCCASION_NOTES = [
  'Les vestes sont facultatives selon météo et dress code ; les codes explicites de l\'événement priment.',
  'Une ceinture marron avec chaussures marron et noire avec chaussures noires est un repère formel, pas une obligation universelle.',
  'Montre sobre ; manteau marine/camel si froid.',
  'Pour la montagne, sécurité thermique et chaussures adaptées à l\'activité priment.',
  'Pour le dirigeant d\'entreprise de nettoyage : Business Casual italien pour les visites clients (pas pour une intervention physique nécessitant un équipement adapté).',
];

export const OCCASIONS = [
  { id: 'daily', name: 'Quotidien', formality: [2, 4], target: 3, styles: ['italian', 'smart-casual', 'casual-chic'], outfits: ['Polo marine, chino crème, mocassins', 'Oxford bleue, chino beige, derbies', 'Tee-shirt écru, jean brut, baskets'] },
  { id: 'city', name: 'Sortie en ville', formality: [2, 4], target: 3, styles: ['italian', 'casual-chic', 'contemporary'], outfits: ['Pull fin taupe, pantalon marine, mocassins', 'Blazer marine, jean brut, derbies', 'Surchemise olive, jean, baskets'] },
  { id: 'walk', name: 'Promenade', formality: [1, 3], target: 2, styles: ['casual-chic', 'smart-casual'], outfits: ['Polo écru, chino olive, baskets', 'Pull marine, jean, bottines', 'Sweat uni, chino, baskets'] },
  { id: 'restaurant', name: 'Restaurant', formality: [3, 4], target: 3, styles: ['italian', 'smart-casual'], outfits: ['Polo chocolat, pantalon crème, mocassins', 'Chemise blanche, blazer, flanelle grise', 'Col roulé, jean noir, Chelsea'] },
  { id: 'cafe', name: 'Café entre amis', formality: [2, 3], target: 2, styles: ['smart-casual', 'casual-chic'], outfits: ['Polo maille, chino beige, mocassins', 'Oxford, jean brut, derbies', 'Tee-shirt uni, surchemise, baskets'] },
  { id: 'date', name: 'Rendez-vous amoureux', formality: [3, 4], target: 3, styles: ['italian', 'french', 'smart-casual'], outfits: ['Chemise écrue, pantalon taupe, veste marine', 'Chemise bleue, pantalon gris, Chelsea', 'Pull fin noir, jean brut, bottines'] },
  { id: 'pro-meeting', name: 'Rendez-vous professionnel', formality: [3, 5], target: 4, styles: ['business-casual', 'italian', 'business-formal'], outfits: ['Blazer souple, chemise ciel, pantalon gris', 'Costume marine, chemise blanche, derbies', 'Oxford, chino marine, veste sobre'] },
  { id: 'office', name: 'Bureau', formality: [3, 4], target: 3, styles: ['business-casual', 'smart-casual'], outfits: ['Polo maille, pantalon gris, mocassins', 'Oxford, chino beige, derbies', 'Pull fin, chino, baskets sobres'] },
  { id: 'client', name: 'Rencontre client', formality: [3, 5], target: 4, styles: ['business-casual', 'italian'], outfits: ['Blazer marine, chemise blanche, chino beige', 'Chemise bleue, pantalon gris, derbies', 'Surchemise structurée, polo, chino'], note: 'Visites de locaux et rendez-vous clients : tenue de représentation, distincte du vêtement de travail/protection.' },
  { id: 'important-meeting', name: 'Réunion importante', formality: [4, 5], target: 5, styles: ['business-formal', 'sartorial', 'italian'], outfits: ['Costume italien marine, chemise ciel, cravate', 'Costume anthracite, chemise blanche, richelieus', 'Blazer, pantalon gris, chemise, derbies'] },
  { id: 'interview', name: 'Entretien d\'embauche', formality: [4, 5], target: 5, strict: true, styles: ['business-formal', 'business-casual'], outfits: ['Costume marine, chemise blanche, cravate', 'Costume anthracite, cravate sombre', 'Blazer marine, Oxford, chino si secteur informel'] },
  { id: 'travel', name: 'Voyage', formality: [1, 3], target: 2, styles: ['smart-casual', 'casual-chic'], outfits: ['Polo, chino souple, baskets', 'Oxford, cardigan, jean brut', 'Sweat premium, pantalon confortable, baskets'] },
  { id: 'sea', name: 'Mer', formality: [1, 3], target: 2, styles: ['mediterranean', 'italian'], outfits: ['Lin blanc, pantalon beige, espadrilles', 'Polo marine, bermuda écru, chaussures bateau', 'Tee-shirt écru, short olive, sandales'] },
  { id: 'mountain', name: 'Montagne', formality: [1, 3], target: 2, protection: true, styles: ['casual-chic'], outfits: ['Mérinos, pantalon confortable, veste technique', 'Pull laine, pantalon robuste, bottines adaptées', 'Polaire, pantalon technique, chaussures adaptées'] },
  { id: 'elegant-dinner', name: 'Dîner élégant', formality: [4, 5], target: 4, styles: ['italian', 'sartorial', 'quiet'], outfits: ['Blazer chocolat, col roulé, pantalon taupe', 'Costume sombre, chemise blanche, derbies', 'Veste noire, maille fine, pantalon anthracite'] },
  { id: 'wedding', name: 'Mariage', formality: [5, 5], target: 5, strict: true, styles: ['sartorial', 'italian', 'british'], outfits: ['Costume souple marine ou beige selon saison', 'Costume marine, cravate, richelieus', 'Costume déstructuré, chemise, mocassins si autorisés'] },
  { id: 'religious', name: 'Cérémonie religieuse', formality: [5, 5], target: 5, strict: true, styles: ['business-formal', 'sartorial'], outfits: ['Costume marine, chemise ciel, cravate', 'Costume gris, chemise blanche, richelieus', 'Costume contemporain sobre, cravate si attendue'] },
  { id: 'birthday', name: 'Anniversaire', formality: [2, 4], target: 3, styles: ['italian', 'smart-casual', 'casual-chic'], outfits: ['Polo écru, pantalon chocolat, mocassins', 'Oxford, chino marine, derbies', 'Surchemise, tee-shirt, jean'] },
  { id: 'chic-party', name: 'Soirée chic', formality: [4, 5], target: 5, strict: true, styles: ['sartorial', 'business-formal'], outfits: ['Costume sombre, chemise blanche, chaussures cuir', 'Smoking si black tie', 'Costume déstructuré sombre si dress code libre'] },
  { id: 'home', name: 'Maison', formality: [1, 2], target: 1, styles: ['casual-chic', 'scandi'], outfits: ['Polo souple, pantalon coton', 'Pull confortable, pantalon jersey', 'Tee-shirt de qualité, jogging uni'] },
];
export const OCCASION_BY_ID = Object.fromEntries(OCCASIONS.map((o) => [o.id, o]));
export const OUTFIT_MODES = [
  { id: 'italian', name: 'Élégance italienne', short: 'Italien' },
  { id: 'classic', name: 'Classique international', short: 'Classique' },
  { id: 'modern', name: 'Moderne décontracté', short: 'Moderne' },
];

/** Dix références visuelles prioritaires (C2) — briefs de recherche, pas des photos. */
export const PRIORITY_VISUALS = [
  'Quotidien : polo marine / pantalon écru',
  'Client : blazer marine / chemise blanche / chino beige',
  'Restaurant : polo chocolat / pantalon crème',
  'Promenade : surchemise olive / tee-shirt blanc / chino beige',
  'Mariage : costume marine / cravate bordeaux',
  'Mer : chemise lin écru / pantalon marine',
  'Hiver : manteau camel / col roulé crème / pantalon beige',
  'Réunion : costume marine / chemise ciel / cravate sombre',
  'Dîner : col roulé noir / anthracite / Chelsea',
  'Week-end : pull écru / jean brut / veste daim',
];
