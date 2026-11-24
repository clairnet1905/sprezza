// B4 — Les 15 grands styles. Notes E/P = élégance/polyvalence sur 10 (notes éditoriales du guide initial).
// Les cellules du guide ont été réparties par rubrique sans ajout. Une rubrique que le guide ne renseigne pas
// vaut null : l'interface affiche « À compléter et sourcer » (annexe D) au lieu d'inventer.

export const STYLES = [
  { id: 'italian', name: 'Italian Elegance', fr: 'Élégance italienne', e: 9.8, p: 9.5,
    origin: 'Italie', philosophy: 'Être chic naturellement', definition: 'Élégance italienne : raffinement, confort et décontraction (voir B2).',
    garments: 'Veste souple, pantalon habillé, chemise ouverte, polo maille', colors: ['beige', 'white', 'navy'], colorsText: 'Beige, blanc, marine',
    materials: 'Laine, lin', shoes: 'Mocassins', accessories: 'Montre',
    formality: 'Moyenne/élevée', occasions: 'Quotidien, restaurant, client', budget: 'Accessible à luxe', mistakes: 'Éviter trop serré', creators: 'Cucinelli, Armani', modeAffinity: 'italian' },
  { id: 'french', name: 'French Chic', fr: 'Chic français', e: 9.5, p: 9,
    origin: 'France', philosophy: 'Simplicité sophistiquée', definition: 'Chic urbain français fondé sur la simplicité sophistiquée.',
    garments: 'Blazer noir, chemise blanche, jean droit', colors: ['black', 'white', 'navy'], colorsText: 'Noir, blanc (palette de l\'école française B1 : noir, marine, blanc, gris, camel)',
    materials: 'Coton, laine', shoes: 'Bottines, ballerines', accessories: 'Sac sobre',
    formality: 'Variable', occasions: 'Ville et sorties', budget: 'Accessible', mistakes: 'Simplicité ≠ négligence', creators: 'Saint Laurent, Chanel, AMI', modeAffinity: 'classic' },
  { id: 'british', name: 'British Classic', fr: 'Classique britannique', e: 9.5, p: 8,
    origin: 'Royaume-Uni', philosophy: 'Respect des traditions', definition: 'Tradition structurée du tailoring britannique.',
    garments: 'Tweed marron, flanelle grise, chemise bleue, cravate', colors: ['chocolate', 'mid-gray', 'sky'], colorsText: 'Marron, gris, bleu (palette B1 : marine, anthracite, marron, forêt)',
    materials: 'Tweed, flanelle (B1 : laine peignée)', shoes: 'Richelieus, brogues', accessories: 'Cravate (B1 : parapluie)',
    formality: 'Moyenne/élevée', occasions: 'Hiver, bureau, cérémonies', budget: 'Intermédiaire/élevé', mistakes: 'Éviter trop de motifs', creators: 'Savile Row, Drake\'s', modeAffinity: 'classic' },
  { id: 'sartorial', name: 'Sartorial Style', fr: 'Style sartorial', e: 9.8, p: 7.5,
    origin: 'Tradition transnationale du tailoring', philosophy: 'Maîtrise technique', definition: 'Tradition transnationale du tailoring, centrée sur la maîtrise technique.',
    garments: 'Vestes travaillées, revers équilibrés, pantalon à pinces', colors: ['navy', 'mid-gray'], colorsText: 'Marine, gris',
    materials: 'Laine, cuir', shoes: 'Richelieus', accessories: 'Pochette',
    formality: 'Élevée', occasions: 'Occasions habillées', budget: 'Intermédiaire/luxe', mistakes: 'Éviter surcharge', creators: 'Cifonelli, Simon Crompton, G. Bruce Boyer', modeAffinity: 'classic' },
  { id: 'old-money', name: 'Old Money', fr: 'Old Money', e: 9.1, p: 8.5,
    origin: 'Esthétique de vestiaire bourgeois et sportif traditionnel', philosophy: null, definition: 'Esthétique (et non tradition historique) inspirée du vestiaire bourgeois et sportif traditionnel.',
    garments: 'Pull torsadé, chino écru, chemise blanche', colors: ['navy', 'ecru', 'white', 'sky'], colorsText: 'Marine, pastel',
    materials: 'Coton, laine', shoes: 'Mocassins', accessories: null,
    formality: 'Faible/moyenne', occasions: 'Quotidien, vacances', budget: 'Accessible/élevé', mistakes: 'Ne pas jouer à paraître riche', creators: 'Ralph Lauren', modeAffinity: 'classic' },
  { id: 'quiet', name: 'Quiet Luxury', fr: 'Luxe discret', e: 9.5, p: 9,
    origin: 'Esthétique de luxe discret', philosophy: 'Qualité sans logos', definition: 'Esthétique de luxe discret, qualité sans logos.',
    garments: 'Cachemire, laine, daim (pièces en matières nobles)', colors: ['taupe', 'ecru', 'chocolate'], colorsText: 'Taupe, écru, chocolat',
    materials: 'Cachemire, laine, daim', shoes: 'Chaussures fines', accessories: 'Accessoires discrets',
    formality: 'Variable', occasions: 'Quotidien soigné, dîner', budget: 'Luxe authentique coûteux mais esthétique reproductible', mistakes: 'Éviter de croire que prix = qualité', creators: 'Loro Piana, The Row, Cucinelli', modeAffinity: 'italian' },
  { id: 'smart-casual', name: 'Smart Casual', fr: 'Smart casual', e: 9.3, p: 10,
    origin: 'Code hybride', philosophy: 'Chic/décontracté', definition: 'Code hybride chic/décontracté.',
    garments: 'Polo maille beige, pantalon marine, blazer optionnel', colors: ['beige', 'navy'], colorsText: 'Beige, marine',
    materials: 'Coton, mérinos', shoes: 'Mocassins, baskets sobres', accessories: null,
    formality: 'Moyenne', occasions: 'Restaurant, voyage, quotidien', budget: 'Accessible', mistakes: 'Éviter chaussures sport trop techniques avec très formel', creators: null, modeAffinity: 'italian' },
  { id: 'business-casual', name: 'Business Casual', fr: 'Business casual', e: 9, p: 9.5,
    origin: 'Code professionnel', philosophy: 'Professionnel décontracté', definition: 'Code professionnel décontracté.',
    garments: 'Blazer marine, chemise blanche, chino beige', colors: ['navy', 'white', 'beige'], colorsText: 'Marine, blanc, beige',
    materials: 'Laine, coton', shoes: 'Derbies', accessories: 'Ceinture marron',
    formality: 'Moyenne/élevée', occasions: 'Bureau, client', budget: 'Accessible', mistakes: 'Adapter au secteur', creators: null, modeAffinity: 'classic' },
  { id: 'business-formal', name: 'Business Formal', fr: 'Business formel', e: 9.5, p: 6.5,
    origin: 'Code professionnel', philosophy: 'Formel', definition: 'Code professionnel formel.',
    garments: 'Costume marine, chemise blanche, cravate sombre', colors: ['navy', 'white', 'charcoal'], colorsText: 'Marine, blanc, cravate sombre',
    materials: 'Laine, popeline', shoes: 'Richelieus', accessories: 'Cravate sombre',
    formality: 'Élevée', occasions: 'Réunion, entretien formel', budget: 'Intermédiaire', mistakes: 'Ne pas porter systématiquement un costume', creators: 'Brioni, Tom Ford, Savile Row', modeAffinity: 'classic' },
  { id: 'ivy', name: 'Preppy / Ivy League', fr: 'Preppy / Ivy League', e: 8.8, p: 9.5,
    origin: 'Vestiaire universitaire américain', philosophy: 'Preppy plus coloré/sportif', definition: 'Vestiaire universitaire américain ; le preppy en est la version plus colorée et sportive.',
    garments: 'Oxford bleue, chino beige, pull rond/torsadé', colors: ['sky', 'beige', 'navy'], colorsText: 'Bleu, beige (B1 : marine, pastel, indigo)',
    materials: 'Coton', shoes: 'Mocassins', accessories: 'Ceinture tressée',
    formality: 'Faible/moyenne', occasions: 'Quotidien', budget: 'Accessible', mistakes: 'Éviter logos/écussons cumulés', creators: 'Ralph Lauren, J. Press, Brooks Brothers', modeAffinity: 'classic' },
  { id: 'scandi', name: 'Scandinavian Minimalism', fr: 'Minimalisme scandinave', e: 8.9, p: 9,
    origin: 'Scandinavie', philosophy: 'Simplicité fonctionnelle', definition: 'Simplicité fonctionnelle et lignes épurées.',
    garments: 'Manteau anthracite, col roulé gris, pantalon gris', colors: ['charcoal', 'light-gray', 'mid-gray'], colorsText: 'Anthracite, gris',
    materials: 'Laine, coton', shoes: 'Chaussures épurées', accessories: null,
    formality: 'Faible/moyenne', occasions: 'Ville, quotidien', budget: 'Accessible', mistakes: 'Éviter volumes imposants', creators: 'COS, Filippa K, NN.07', modeAffinity: 'modern' },
  { id: 'japanese', name: 'Japanese Classic Menswear', fr: 'Classique japonais', e: 9.2, p: 8.5,
    origin: 'Japon', philosophy: 'Réinterprétation japonaise des classiques anglo-américains', definition: 'Réinterprétation japonaise des classiques anglo-américains (Ametora, Take Ivy).',
    garments: 'Blazer marine à boutons dorés, chino kaki, chemise blanche, cravate rayée', colors: ['navy', 'olive', 'white'], colorsText: 'Marine, kaki, blanc',
    materials: 'Denim, Oxford, laine', shoes: null, accessories: 'Cravate rayée',
    formality: 'Variable', occasions: 'Quotidien, professionnel', budget: 'Intermédiaire', mistakes: 'Adapter les volumes', creators: 'BEAMS F, Ring Jacket', modeAffinity: 'classic' },
  { id: 'mediterranean', name: 'Mediterranean Chic', fr: 'Chic méditerranéen', e: 9.4, p: 8,
    origin: 'Vestiaire méditerranéen', philosophy: 'Élégance par temps chaud', definition: 'Vestiaire méditerranéen, élégance par temps chaud.',
    garments: 'Lin taupe/blanc, pantalon écru', colors: ['taupe', 'white', 'ecru'], colorsText: 'Taupe, blanc, écru',
    materials: 'Lin', shoes: 'Espadrilles ou daim', accessories: 'Ceinture sobre',
    formality: 'Faible/moyenne', occasions: 'Été, mer', budget: 'Accessible', mistakes: 'Éviter transparence et proportions mal maîtrisées', creators: null, modeAffinity: 'italian' },
  { id: 'casual-chic', name: 'Casual Chic', fr: 'Casual chic', e: 8.8, p: 10,
    origin: 'Tenue quotidienne', philosophy: 'Élevée par quelques pièces raffinées', definition: 'Tenue quotidienne élevée par quelques pièces raffinées.',
    garments: 'Manteau marine, pull gris, jean droit, cuir', colors: ['navy', 'light-gray', 'mid-blue'], colorsText: 'Marine, gris, denim',
    materials: 'Coton, laine', shoes: 'Bottines, derbies', accessories: null,
    formality: 'Faible/moyenne', occasions: 'Week-end, ville', budget: 'Accessible', mistakes: 'Éviter vêtements usés', creators: 'Todd Snyder', modeAffinity: 'modern' },
  { id: 'contemporary', name: 'Contemporary Classic', fr: 'Classique contemporain', e: 9.4, p: 9.5,
    origin: 'Classiques modernisés', philosophy: 'Classiques modernisés', definition: 'Classiques modernisés : textures et caractère.',
    garments: 'Veste texturée, pull écru, jean brut, chemise', colors: ['ecru', 'mid-blue', 'chocolate'], colorsText: 'Écru, denim brut',
    materials: 'Laine, denim', shoes: 'Bottines', accessories: null,
    formality: 'Moyenne', occasions: 'Quotidien, client', budget: 'Accessible à élevé', mistakes: 'Éviter trop de tendances', creators: 'Drake\'s, Todd Snyder, Boglioli', modeAffinity: 'modern' },
];
export const STYLE_BY_ID = Object.fromEntries(STYLES.map((s) => [s.id, s]));

export const CLOSE_STYLES = [
  { a: 'old-money', b: 'quiet', diff: 'Héritage bourgeois/sportif / qualité discrète' },
  { a: 'smart-casual', b: 'casual-chic', diff: 'Plus habillé / plus décontracté' },
  { a: 'smart-casual', b: 'business-casual', diff: 'Vie sociale / environnement professionnel' },
  { a: 'business-formal', b: 'sartorial', diff: 'Code professionnel / technique du tailoring' },
  { a: 'italian', b: 'mediterranean', diff: 'Toutes saisons / surtout estival' },
  { a: 'british', b: 'ivy', diff: 'Tradition structurée / décontraction universitaire' },
  { a: 'contemporary', b: 'scandi', diff: 'Textures et caractère / épuration visuelle' },
];

// B1 — 8 traditions
export const TRADITIONS = [
  { id: 'it', name: 'Italie', history: 'Artisanat, tailleurs, fabricants de tissus, maisons de couture ; défilés florentins des années 1950 ; élégance sans rigidité', cuts: 'Fluides, épaules naturelles ; marine, écru, beige, marron, olive, gris', materials: 'Laine, lin, cachemire, coton, daim ; mocassins, derbies ; montre, lunettes, pochette', pros: 'Raffinement quotidien, tailoring et industrie influents', cons: 'Certaines coupes modernes trop cintrées/théâtrales', refs: 'Armani, Cucinelli, Rubinacci, Brioni, Canali, Zegna', heritage: true },
  { id: 'fr', name: 'France', history: 'Héritage haute couture Chanel, Dior, Saint Laurent ; simplicité et personnalité', cuts: 'Sobres, structurées ou fluides ; noir, marine, blanc, gris, camel', materials: 'Laine, coton, soie, cuir ; derbies, bottines, ballerines ; foulard, sac structuré', pros: 'Chic urbain et créativité', cons: 'Noir exclusif parfois monotone', refs: 'Chanel, Dior, Saint Laurent', heritage: true },
  { id: 'uk', name: 'Royaume-Uni', history: 'Savile Row et tradition du sur-mesure ; structure et précision', cuts: 'Épaules définies, poitrine structurée ; marine, anthracite, marron, forêt', materials: 'Tweed, flanelle, laine peignée ; richelieus, brogues, bottines ; cravate, parapluie', pros: 'Costume, cérémonies, manteaux, hiver', cons: 'Formalité parfois excessive', refs: 'Savile Row, Henry Poole, Drake\'s', heritage: true },
  { id: 'us', name: 'États-Unis', history: 'Ivy League, vestiaire universitaire puis preppy plus sportif/coloré', cuts: 'Droites, naturelles ; marine, beige, pastel, indigo', materials: 'Oxford, chino, pull torsadé ; mocassins, chaussures bateau ; ceinture tressée', pros: 'Facile et accessible au quotidien', cons: 'Écussons/logos excessifs = déguisement', refs: 'Ralph Lauren, Brooks Brothers, J. Press', heritage: true },
  { id: 'jp', name: 'Japon', history: 'Réinterprétation des traditions US/UK (Ametora, Take Ivy) ; précision', cuts: 'Droites, parfois généreuses ; indigo, marine, kaki, gris, écru', materials: 'Denim, Oxford, laine, toile ; derbies/mocassins ; accessoires choisis', pros: 'Qualité, détails et équilibre moderne/classique', cons: 'Volumes larges à adapter', refs: 'BEAMS Plus, BEAMS F, Ring Jacket' },
  { id: 'scandi', name: 'Scandinavie', history: 'Minimalisme fonctionnel, mais traditions réelles plus variées', cuts: 'Lignes épurées, coupes droites ; gris, noir, taupe, neutres', materials: 'Laine, coton ; baskets sobres, bottines ; accessoires simples', pros: 'Pratique et moderne', cons: 'Peut manquer de texture/personnalité', refs: 'COS, Filippa K, NN.07' },
  { id: 'kr', name: 'Corée du Sud', history: 'Élégance contemporaine et superpositions', cuts: 'Pantalons fluides, manteaux structurés, monochrome', materials: 'Maille, laine, coton ; chaussures épurées', pros: 'Modernise le classique', cons: 'Plus sensible aux tendances', refs: null },
  { id: 'es', name: 'Espagne', history: 'Tradition méditerranéenne, veste Teba', cuts: 'Vestes souples, couleurs naturelles', materials: 'Lin, coton ; mocassins, espadrilles', pros: 'Confort estival raffiné', cons: 'Adaptation aux climats froids', refs: null },
];
export const TRADITIONS_NOTE = 'Distinguer les traditions historiques des esthétiques commerciales popularisées sur les réseaux sociaux. L\'élégance italienne, le tailoring britannique, le chic français et le style Ivy possèdent un héritage historique ; Old Money et Quiet Luxury désignent plutôt des esthétiques et façons de présenter les vêtements. Éviter les clichés : aucune école ne décrit tous les habitants d\'un pays.';

// B2 — Italie et ses quatre écoles
export const ITALY_CITIES = [
  { city: 'Milan', approach: 'Élégance professionnelle, lignes nettes, construction souvent plus structurée, couleurs sobres', refs: 'Armani, Caraceni' },
  { city: 'Naples', approach: 'Vestes légères, épaules souples, matières respirantes et liberté de mouvement', refs: 'Rubinacci, tailoring napolitain, spalla camicia' },
  { city: 'Florence', approach: 'Proportions, textures, couleurs, tradition artisanale', refs: 'Liverano & Liverano, Pitti Uomo' },
  { city: 'Rome', approach: 'Costumes raffinés, lignes affirmées, matières luxueuses', refs: 'Brioni' },
];

// B3 — Top 5 des écoles (notes historiques du guide, à ne jamais écraser)
export const SCHOOL_CRITERIA = [
  { id: 'refinement', name: 'Raffinement', max: 20, why: 'Élégance et raffinement : qualité de la coupe, du tombé et des associations (B1).' },
  { id: 'timeless', name: 'Intemporalité', max: 15, why: 'Capacité à traverser les époques sans dater la silhouette.' },
  { id: 'recognition', name: 'Reconnaissance', max: 15, why: 'Reconnaissance auprès des spécialistes (évaluation éditoriale, pas un sondage).' },
  { id: 'versatility', name: 'Polyvalence', max: 15, why: 'Nombre de situations couvertes, du quotidien au professionnel.' },
  { id: 'harmony', name: 'Harmonie', max: 10, why: 'Harmonie des couleurs et des matières.' },
  { id: 'daily', name: 'Vie quotidienne', max: 10, why: 'Adaptation à la vie quotidienne.' },
  { id: 'access', name: 'Accessibilité', max: 5, why: 'Accessibilité financière.' },
  { id: 'body', name: 'Morphologies', max: 5, why: 'Adaptation à différentes morphologies.' },
  { id: 'influence', name: 'Influence', max: 5, why: 'Influence internationale.' },
];
export const SCHOOLS = [
  { id: 'it', name: 'Italie', scores: { refinement: 19, timeless: 15, recognition: 14, versatility: 15, harmony: 10, daily: 9, access: 4, body: 5, influence: 5 }, total: 96, summary: 'Harmonie/raffinement décontracté ; artisanat coûteux.' },
  { id: 'fr', name: 'France', scores: { refinement: 19, timeless: 14, recognition: 15, versatility: 13, harmony: 9, daily: 9, access: 4, body: 4, influence: 5 }, total: 92, summary: 'Couture, chic urbain ; certaines tendances moins intemporelles.' },
  { id: 'uk', name: 'Royaume-Uni', scores: { refinement: 19, timeless: 15, recognition: 15, versatility: 12, harmony: 9, daily: 8, access: 3, body: 5, influence: 5 }, total: 91, summary: 'Construction, durabilité ; parfois trop formel.' },
  { id: 'us', name: 'États-Unis', scores: { refinement: 16, timeless: 14, recognition: 13, versatility: 15, harmony: 8, daily: 10, access: 5, body: 4, influence: 5 }, total: 90, summary: 'Polyvalence et prix ; moins centré sur le raffinement formel.' },
  { id: 'jp', name: 'Japon', scores: { refinement: 18, timeless: 13, recognition: 13, versatility: 13, harmony: 9, daily: 9, access: 4, body: 4, influence: 4 }, total: 87, summary: 'Précision, réinterprétation ; volumes à maîtriser.' },
];
export const SCHOOLS_NOTE = 'Ne pas présenter ces chiffres comme validés par une majorité d\'experts. La France pourrait arriver en tête pour la haute couture féminine, le Royaume-Uni pour le costume traditionnel. L\'écart entre style géographique (une école), esthétique (Old Money, Quiet Luxury), savoir-faire (tailoring) et dress code (Business Formal, Black Tie) doit rester clair : ce sont des catégories différentes.';

// B5 — Spécialistes
export const SPECIALISTS = [
  ['Giorgio Armani', 'Fluidité et souplesse'], ['Brunello Cucinelli', 'Matières et discrétion'], ['Ralph Lauren', 'Tradition américaine et intemporalité'],
  ['Tom Ford', 'Sophistication et présence'], ['Yves Saint Laurent', 'Liberté et réinterprétation des classiques'], ['Simon Crompton', 'Coupes et savoir-faire'],
  ['Coco Chanel', 'Simplicité et liberté de mouvement'], ['Christian Dior', 'Construction et équilibre de silhouette'], ['Gianni Agnelli', 'Personnalité et sprezzatura'],
  ['Miuccia Prada', 'Expérimentation intellectuelle'], ['Luca Rubinacci', 'Personnalité sartoriale'], ['G. Bruce Boyer', 'Culture du vestiaire classique'],
];
export const PRIORITIES = [
  ['Vêtements adaptés', 10], ['Proportions', 10], ['Occasion', 10], ['Entretien', 10], ['Couleurs', 9.5], ['Qualité/tombé', 9],
  ['Accessoires', 8], ['Originalité personnelle', 8], ['Tendances', 4], ['Prestige marque', 2],
];
export const PRINCIPLE_CLASSES = [
  { name: 'Principes largement reconnus', items: 'Coupe et ajustement, proportions, adéquation à l\'occasion, entretien.' },
  { name: 'Préférences personnelles des stylistes', items: 'Largeur des revers, construction d\'épaule, goût pour certains motifs.' },
  { name: 'Tendances commerciales', items: 'Esthétiques « Old Money » ou « Quiet Luxury » présentées comme des styles prêts à acheter.' },
  { name: 'Tendances temporaires', items: 'Volumes extrêmes, logos ostentatoires, couleurs de saison.' },
  { name: 'Principes intemporels', items: 'La coupe avant la marque, les proportions avant les tendances, l\'harmonie avant l\'originalité excessive.' },
];

// B16 — Top 5 par occasion (notes éditoriales /10)
export const TOP5_BY_OCCASION = [
  ['Quotidien', [['Italien', 9.8], ['Smart Casual', 9.7], ['Casual Chic', 9.5], ['Ivy', 9.2], ['Français', 9.1]]],
  ['Professionnel', [['Business Casual', 9.8], ['Italien', 9.6], ['Business Formal', 9.5], ['British', 9.3], ['Contemporary', 9.2]]],
  ['Rendez-vous amoureux', [['Italien', 9.8], ['Français', 9.6], ['Smart Casual', 9.5], ['Quiet Luxury', 9.3], ['Casual Chic', 9.2]]],
  ['Décontracté', [['Smart Casual', 9.8], ['Casual Chic', 9.7], ['Italien', 9.6], ['Ivy', 9.5], ['Minimalisme', 9.2]]],
  ['Mariage', [['Sartorial', 9.8], ['Italien', 9.7], ['British', 9.6], ['Formal', 9.5], ['Français', 9.3]]],
  ['Vacances', [['Méditerranéen', 9.8], ['Italien', 9.6], ['Smart Casual', 9.5], ['Casual Chic', 9.3], ['Ivy', 9.1]]],
  ['Été', [['Méditerranéen', 9.9], ['Italien', 9.8], ['Smart Casual', 9.5], ['Ivy', 9.3], ['Quiet Luxury', 9.2]]],
  ['Hiver', [['British', 9.8], ['Italien', 9.7], ['Quiet Luxury', 9.6], ['Scandinave', 9.5], ['Contemporary', 9.4]]],
  ['Masculin', [['Italien', 9.8], ['Sartorial', 9.7], ['British', 9.5], ['Contemporary', 9.4], ['Smart Casual', 9.3]]],
  ['Féminin', [['Français', 9.8], ['Italien', 9.7], ['Quiet Luxury', 9.5], ['Classique', 9.4], ['Casual Chic', 9.2]]],
  ['Intemporalité', [['British', 9.8], ['Sartorial', 9.8], ['Italien', 9.7], ['Français', 9.5], ['Ivy', 9.4]]],
  ['Élégance/prix', [['Smart Casual', 9.8], ['Casual Chic', 9.6], ['Italien', 9.5], ['Ivy', 9.4], ['Minimalisme', 9.3]]],
];

// B17 — Identité personnelle
export const IDENTITY_MIX = [
  { id: 'italian', name: 'Élégance italienne', pct: 50 },
  { id: 'smart-casual', name: 'Smart Casual', pct: 20 },
  { id: 'quiet', name: 'Quiet Luxury', pct: 15 },
  { id: 'british', name: 'British Classic', pct: 10 },
  { id: 'scandi', name: 'Minimalisme', pct: 5 },
];
export const SIGNATURE_OUTFITS = [
  { n: '01', name: 'Élégance quotidienne', text: 'Polo maille marine, pantalon écru, mocassins marron', colors: ['navy', 'ecru', 'chocolate'] },
  { n: '02', name: 'Raffinement naturel', text: 'Polo beige, pantalon chocolat, cuir cognac', colors: ['beige', 'chocolate', 'cognac'] },
  { n: '03', name: 'Chic méditerranéen', text: 'Chemise blanche, pantalon olive, daim marron', colors: ['white', 'olive', 'suede-brown'] },
  { n: '04', name: 'Élégance professionnelle', text: 'Blazer marine, chemise ciel, pantalon gris', colors: ['navy', 'sky', 'mid-gray'] },
  { n: '05', name: 'Raffinement hivernal', text: 'Manteau camel, col roulé écru, pantalon beige, bottines', colors: ['camel', 'ecru', 'beige'] },
  { n: '06', name: 'Grandes occasions', text: 'Costume marine, chemise blanche, cravate bordeaux, richelieus noirs', colors: ['navy', 'white', 'burgundy', 'black'] },
];
