// Tenue de travail pour le ménage : kit pratique et bon marché (ajout de l'application, hors guide).
// Prix indicatifs en France ; pas des offres marchandes.

/** Pièces du kit. `uses` : types du dressing qui conviennent aussi (une pièce ordinaire foncée et robuste fait l'affaire). */
export const WORK_KIT = [
  { id: 'w1', name: 'Tee-shirts de travail foncés (lot de 3)', material: 'Coton/polyester', season: 'Toute saison', budget: [10, 25], category: 'haut', sub: 'tee-shirt-travail', color: 'navy', role: 'top', qty: 3, uses: ['tee-shirt-travail', 'tee-shirt', 'polo-sport'], why: 'Un par jour de travail, lavables à 60 °C, foncés pour cacher les taches.', query: 'lot tee-shirts travail homme coton foncé' },
  { id: 'w2', name: 'Pantalon de travail stretch', material: 'Polyester/coton, genoux renforcés', season: 'Toute saison', budget: [15, 35], category: 'bas', sub: 'pantalon-travail', color: 'charcoal', role: 'bottom', qty: 2, uses: ['pantalon-travail', 'pantalon-technique', 'jogging'], why: 'Souple pour se baisser, poches pour les clés et le téléphone, résiste aux produits.', query: 'pantalon de travail stretch homme' },
  { id: 'w3', name: 'Chaussures antidérapantes (norme SRC)', material: 'Synthétique, semelle antidérapante', season: 'Toute saison', budget: [30, 60], category: 'chaussures', sub: 'chaussures-travail', color: 'black', role: 'shoes', qty: 1, uses: ['chaussures-travail'], why: 'Sols mouillés : c\'est la pièce de sécurité, la seule à ne pas remplacer par des baskets de ville.', query: 'chaussures de travail antidérapantes SRC homme légères' },
  { id: 'w4', name: 'Polaire ou sweat de travail', material: 'Polaire', season: 'Automne/hiver', budget: [10, 25], category: 'haut', sub: 'polaire', color: 'charcoal', role: 'top', qty: 1, uses: ['polaire', 'sweat'], why: 'Pour les locaux froids ou les trajets, sans abîmer un vrai pull.', query: 'polaire travail homme' },
  { id: 'w5', name: 'Veste softshell déperlante', material: 'Softshell', season: 'Mi-saison', budget: [25, 45], category: 'veste', sub: 'veste-travail', color: 'black', role: 'layer', qty: 1, uses: ['veste-travail', 'veste-technique'], why: 'Entre deux chantiers, sous la pluie ; se lave en machine.', query: 'veste softshell travail homme' },
];
export const WORK_SHOPS = 'Decathlon, Kiabi, Lidl ou un magasin de vêtements professionnels';
export const WORK_TIPS = [
  'Gardez des vêtements dédiés au travail : vos belles pièces ne croisent jamais la javel.',
  'Couleurs foncées (marine, anthracite, noir) : taches et traces de produits se voient moins.',
  'Matières lavables à 40–60 °C (coton, polyester) ; pas de laine, de lin, de daim ni de cuir fragile.',
  'Chaussures fermées à semelle antidérapante : les sols mouillés sont le premier risque de chute.',
];
