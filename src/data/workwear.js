// Tenue de travail pour le ménage : propre, stylée et pas chère (ajout de l'application, hors guide).
// Prix indicatifs en France ; pas des offres marchandes.

/** Prix au-delà duquel une pièce n'est pas proposée pour le ménage (trop chère à abîmer). */
export const WORK_PRICE_CAP = { top: 40, bottom: 50, layer: 60, shoes: 80, outer: Infinity };

/** Pièces du kit. `uses` : types du dressing qui conviennent aussi (une pièce ordinaire foncée et robuste fait l'affaire). */
export const WORK_KIT = [
  { id: 'w1', name: 'Polos piqués ou tee-shirts unis foncés (lot de 3)', material: 'Coton/polyester', season: 'Toute saison', budget: [15, 35], category: 'haut', sub: 'polo-sport', color: 'navy', role: 'top', qty: 3, uses: ['tee-shirt-travail', 'tee-shirt', 'polo-sport'], why: 'Unis, bien coupés, marine, anthracite ou noir : on a l\'air soigné devant les clients, pour 5 à 12 € pièce.', query: 'polo piqué homme uni marine pas cher' },
  { id: 'w2', name: 'Chino stretch ou pantalon de travail slim foncé', material: 'Coton stretch / polycoton', season: 'Toute saison', budget: [18, 35], category: 'bas', sub: 'pantalon-travail', color: 'charcoal', role: 'bottom', qty: 2, uses: ['pantalon-travail', 'pantalon-technique', 'chino', 'jogging'], why: 'Coupe nette (pas de multipoches « chantier »), tissu qui suit les mouvements quand on se baisse.', query: 'pantalon de travail slim stretch homme anthracite' },
  { id: 'w3', name: 'Baskets noires antidérapantes (style ville, norme SRC)', material: 'Synthétique, semelle antidérapante', season: 'Toute saison', budget: [30, 55], category: 'chaussures', sub: 'chaussures-travail', color: 'black', role: 'shoes', qty: 1, uses: ['chaussures-travail'], why: 'Elles ressemblent à des baskets de ville mais tiennent sur les sols mouillés : style et sécurité.', query: 'baskets de sécurité légères noires homme SRC style sneakers' },
  { id: 'w4', name: 'Sweat zippé ou polaire unie', material: 'Molleton / polaire', season: 'Automne/hiver', budget: [12, 25], category: 'haut', sub: 'sweat', color: 'charcoal', role: 'top', qty: 1, uses: ['polaire', 'sweat'], why: 'Pour les locaux froids : uni et sombre, il reste net et protège vos vrais pulls.', query: 'sweat zippé uni homme anthracite' },
  { id: 'w5', name: 'Surchemise ou softshell sobre', material: 'Coton épais / softshell', season: 'Mi-saison', budget: [20, 40], category: 'veste', sub: 'veste-travail', color: 'black', role: 'layer', qty: 1, uses: ['veste-travail', 'veste-technique', 'surchemise'], why: 'La couche qui fait « tenue » entre deux interventions et se lave en machine.', query: 'surchemise homme coton épais marine pas cher' },
];
export const WORK_SHOPS = 'Kiabi, Decathlon, Primark, Lidl ou un magasin de vêtements professionnels';
export const WORK_TIPS = [
  'Un « uniforme » en deux couleurs (marine + anthracite, ou noir + gris) : tout s\'assortit et vous avez toujours l\'air soigné.',
  'Coupe ajustée plutôt que large : c\'est ce qui fait la différence entre « tenue de travail » et « tenue de chantier ».',
  'Unis, sans gros logo ; couleurs foncées qui cachent les taches et les traces de produits.',
  'À ce prix, remplacez dès que c\'est délavé ou taché : une tenue nette compte plus qu\'une tenue chère.',
  'Matières lavables à 40–60 °C (coton, polyester) ; pas de laine, de lin, de daim ni de cuir fragile.',
  'Chaussures fermées à semelle antidérapante : les sols mouillés sont le premier risque de chute.',
];
