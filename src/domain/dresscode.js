// Décodeur de dress code : le texte d'une invitation → ce que ça veut dire, ce qu'il faut porter ou éviter, et l'occasion
// à utiliser pour composer la tenue avec le dressing. Du plus formel au plus décontracté.
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const DRESS_CODES = [
  { id: 'white-tie', re: /white tie|habit|queue[- ]de[- ]pie|cravate blanche/, label: 'White tie (habit)', occasionId: 'chic-party',
    meaning: 'Le code le plus formel qui existe : habit noir à queue-de-pie, gilet et nœud papillon blancs.',
    wear: ['Habit noir à queue-de-pie (en location)', 'Chemise blanche à plastron, col cassé', 'Gilet et nœud papillon blancs', 'Escarpins ou richelieus vernis noirs'],
    avoid: ['Costume ordinaire', 'Cravate longue'], rent: true },
  { id: 'black-tie', re: /black tie|smoking|cravate noire|tenue de soiree (exigee|de rigueur)/, label: 'Black tie (smoking)', occasionId: 'chic-party',
    meaning: 'Smoking du soir : veste noire ou bleu nuit à revers satinés, nœud papillon noir.',
    wear: ['Smoking noir ou bleu nuit (location possible)', 'Chemise blanche, boutons discrets', 'Nœud papillon noir', 'Richelieus noirs très bien cirés ou vernis', 'Chaussettes noires fines'],
    avoid: ['Cravate longue colorée', 'Chaussures marron', 'Montre sportive'], fallback: 'Sans smoking : costume noir ou anthracite uni, chemise blanche, cravate noire unie (toléré, à vérifier auprès des hôtes).' },
  { id: 'cocktail', re: /cocktail|tenue de soiree|soiree habillee|tenue habillee/, label: 'Cocktail', occasionId: 'chic-party',
    meaning: 'Élégant du soir sans smoking : costume sombre ou blazer bien coupé.',
    wear: ['Costume sombre, ou blazer + pantalon habillé', 'Chemise blanche ou bleu clair', 'Cravate facultative (soie)', 'Derbies ou richelieus en cuir'],
    avoid: ['Jean', 'Baskets', 'Chemise à manches courtes'] },
  { id: 'business-formal', re: /tenue de ville|costume de ville|business formal|tenue professionnelle( exigee)?|costume( |-)cravate|tenue formelle/, label: 'Tenue de ville (costume)', occasionId: 'important-meeting',
    meaning: 'Costume complet de jour, avec cravate dans la plupart des cas.',
    wear: ['Costume marine ou gris', 'Chemise blanche ou bleu ciel', 'Cravate unie ou discrète', 'Derbies ou richelieus, ceinture assortie'],
    avoid: ['Costume noir en journée', 'Chaussettes blanches', 'Mocassins trop décontractés'] },
  { id: 'business-casual', re: /business casual|tenue de bureau|professionnel decontracte/, label: 'Business casual', occasionId: 'office',
    meaning: 'Professionnel sans costume : blazer facultatif, pas de cravate.',
    wear: ['Blazer ou pull fin', 'Chemise ou polo en maille', 'Chino ou pantalon habillé', 'Derbies ou mocassins'],
    avoid: ['Jogging', 'Tee-shirt imprimé', 'Baskets de sport'] },
  { id: 'smart-casual', re: /smart casual|chic decontracte|decontracte chic|casual chic|tenue chic|tenue soignee|elegant decontracte/, label: 'Smart casual (chic décontracté)', occasionId: 'restaurant',
    meaning: 'Soigné mais détendu : pas de costume, mais pas de tenue de sport non plus.',
    wear: ['Chemise, polo en maille ou pull fin', 'Chino, pantalon ou jean brut net', 'Blazer non structuré ou surchemise (facultatif)', 'Mocassins, derbies ou baskets en cuir très propres'],
    avoid: ['Jogging, short', 'Tee-shirt délavé', 'Tongs'] },
  { id: 'correcte', re: /tenue correcte|tenue decente|correcte exigee/, label: 'Tenue correcte exigée', occasionId: 'restaurant',
    meaning: 'Le minimum attendu : propre et habillé simplement.',
    wear: ['Chemise ou polo', 'Pantalon (pas de short)', 'Chaussures fermées'],
    avoid: ['Short, jogging', 'Tongs, claquettes', 'Casquette', 'Débardeur'] },
  { id: 'wedding', re: /mariage|ceremonie|bapteme|communion/, label: 'Cérémonie / mariage', occasionId: 'wedding',
    meaning: 'Habillé et festif, sans voler la vedette aux mariés.',
    wear: ['Costume (marine, gris, ou clair en été)', 'Chemise claire', 'Cravate ou pochette', 'Chaussures en cuir cirées'],
    avoid: ['Blanc intégral (réservé au marié)', 'Noir intégral en journée', 'Jean'] },
  { id: 'all-white', re: /tout en blanc|all white|soiree blanche|dress code blanc/, label: 'Soirée blanche', occasionId: 'sea',
    meaning: 'Tout en blanc ou en écru.',
    wear: ['Chemise en lin blanche', 'Pantalon blanc ou écru', 'Mocassins daim clairs ou espadrilles'],
    avoid: ['Pièces sombres', 'Blancs qui ne s\'accordent pas (mélange blanc optique et écru jauni)'] },
  { id: 'garden', re: /garden[- ]party|champetre|plein air|bord de mer|plage/, label: 'Garden party / plein air', occasionId: 'sea',
    meaning: 'Élégant et léger, pour l\'extérieur.',
    wear: ['Chemise en lin ou polo', 'Chino clair', 'Mocassins ou espadrilles', 'Blazer léger non doublé si soirée'],
    avoid: ['Chaussures fines qui s\'enfoncent dans l\'herbe', 'Matières lourdes'] },
  { id: 'casual', re: /decontracte|casual|tenue libre|detendu|sans chichi/, label: 'Décontracté', occasionId: 'daily',
    meaning: 'Libre, mais toujours propre et bien ajusté.',
    wear: ['Polo, tee-shirt uni ou chemise', 'Jean ou chino', 'Baskets propres ou mocassins'],
    avoid: ['Vêtements usés ou froissés'] },
];

/** @returns {{id, label, meaning, wear, avoid, occasionId, fallback?, rent?}|null} */
export function decodeDressCode(text) {
  const t = norm(text);
  if (!t.trim()) return null;
  return DRESS_CODES.find((d) => d.re.test(t)) || null;
}
