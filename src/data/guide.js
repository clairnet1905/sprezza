// Partie B — contenus éditoriaux structurés (B0, B7, B8, B10–B12, B14, B15, B18–B20).

export const INTRO = {
  text: 'L\'objectif est de développer son propre regard de styliste, pour savoir ce qui fonctionne dans une tenue, ce qui manque et ce qui peut être amélioré.',
  definitions: [
    ['La mode', 'ce qui est populaire à une époque donnée'],
    ['Le luxe', 'la valeur, la rareté, le savoir-faire ou le prestige d\'un produit'],
    ['Le style', 'la manière personnelle de s\'habiller'],
    ['L\'élégance', 'l\'harmonie entre vêtements, proportions, personnalité et circonstances'],
  ],
  closing: 'Un homme peut porter 3 000 € de vêtements et manquer d\'élégance, tandis qu\'un autre peut être très bien habillé pour 150 €. L\'élégance est une compétence qui s\'apprend et non une question de richesse.',
};

export const ITALY_TEXT = {
  intro: 'L\'Italie concilie raffinement, confort et décontraction. Elle n\'est pas universellement supérieure, mais particulièrement pertinente pour un vestiaire polyvalent.',
  regional: 'Ces distinctions régionales ne sont pas des règles absolues : chaque tailleur peut proposer plusieurs constructions. Simon Crompton et Permanent Style sont des références pour explorer ces différences.',
  sprezzatura: 'Notion remontant à Baldassare Castiglione et au Livre du courtisan (1528) : faire paraître naturel ce qui demande de la maîtrise. Une chemise légèrement ouverte, une veste souple ou une association inattendue peuvent suffire ; pas besoin de vêtements mal ajustés ou négligés.',
  bellaFigura: 'Soin de sa présentation, de son comportement et de l\'impression produite. Dans le vestiaire : vêtements propres, bien entretenus et adaptés à la situation ; ne nécessite aucune marque de luxe.',
  lesson: 'La grande leçon italienne : belle coupe, deux ou trois couleurs, texture bien choisie.',
};

// B7 — Élégance masculine
export const MENSWEAR = [
  ['Chemise', 'Épaule bien positionnée, aisance poitrine, col harmonieux. Oxford quotidien, popeline formelle, lin été.'],
  ['Polo', 'Maille coton ou mérinos, col bien construit, longueur maîtrisée ; alternative raffinée au polo sportif.'],
  ['Pull', 'Mérinos fin, coton ou cachemire ; longueur ne masquant pas excessivement les jambes ; col rond polyvalent.'],
  ['Col roulé', 'Maille fine, col confortable, ajusté sans serrer ; avec blazer ou manteau en hiver.'],
  ['Pantalon habillé', 'Taille moyenne/légèrement haute, droit ou légèrement fuselé, longueur nette ; laine pour tombé.'],
  ['Chino', 'Beige/olive/marine, coton sergé, un peu d\'élasthanne possible ; pas skinny ni poches qui s\'écartent.'],
  ['Jean', 'Bleu brut, sans déchirures ni délavage excessif, droit ou légèrement ajusté, compatible blazer.'],
  ['Blazer', 'Marine, deux boutons, revers proportionnés, épaules naturelles ; vraie veste dépareillée plutôt que veste de costume lisse.'],
  ['Costume', 'Laine marine/anthracite ; épaules, col et équilibre prioritaires ; retoucher manches/pantalon.'],
  ['Manteau', 'Marine, camel, anthracite ; laine ; au-dessus du genou ou proche du genou comme point de départ.'],
  ['Trench', 'Beige/marine, gabardine déperlante, épaules proportionnées ; excellent en mi-saison bordelaise.'],
  ['Mocassins', 'Cuir/daim marron foncé, chic italien, chinos et pantalons laine ; privilégier temps sec selon matière.'],
  ['Derbies', 'Polyvalentes avec jean, bureau et tenue dépareillée.'],
  ['Richelieus', 'Costume, mariage, occasions formelles.'],
  ['Chelsea', 'Automne/hiver, jean ou pantalon habillé, cuir ou daim.'],
  ['Baskets minimalistes', 'Voyage, promenade, casual moderne ; blanches ou neutres, forme sobre.'],
];
export const MENSWEAR_NOTE = 'Une paire de mocassins marron foncé et des baskets blanches sobres couvrent de nombreuses tenues casual chic. Comparer un vêtement mal proportionné et un similaire bien retouché par schéma ou photos documentées, sans juger la personne photographiée.';
export const BANAL_VS_ELEGANT = [
  { banal: 'Polo sportif logoté trop long, chino skinny qui plisse aux chevilles, baskets techniques', elegant: 'Polo en maille à longueur maîtrisée, chino droit légèrement fuselé ourlé à légère cassure, mocassins marron entretenus', why: 'Mêmes catégories de vêtements ; la différence tient aux longueurs, à la matière et aux chaussures (B7, B8, B14).' },
  { banal: 'Chemise froissée trop ample, pantalon taille basse, ceinture usée', elegant: 'Chemise défroissée ajustée naturellement, pantalon à taille moyenne, ceinture assortie aux chaussures', why: 'Entretien, hauteur de taille et cohérence des cuirs (B12, B14).' },
];

// B8 — Morphologie
export const MORPHO_INTRO = 'La taille n\'empêche pas l\'élégance ; l\'équilibre des longueurs compte. Ne pas tomber dans les coupes trop fines. Observer torse, jambes, épaules avant de fixer des recommandations ; taille et poids seuls ne suffisent pas.';
export const MORPHO = [
  ['Taille du pantalon', 'Moyenne ou légèrement haute'], ['Coupe', 'Droite légèrement fuselée, aisance naturelle'],
  ['Ourlet', 'Sans accumulation de plis ; légère cassure souvent idéale'], ['Chemise', 'Ajustée naturellement, non moulante'],
  ['Polo/pull', 'Longueur modérée, maille fine/moyenne'], ['Veste', 'Épaules naturelles, longueur équilibrée ; ne pas trop raccourcir un costume, couvrir le fessier harmonieusement'],
  ['Revers', 'Moyens, proportionnés au torse'], ['Manteau', 'Au-dessus du genou ou proche du genou selon silhouette'],
  ['Motifs', 'Petits à moyens selon carrure'], ['Chaussures', 'Épurées, ni massives ni très pointues'],
];
export const MORPHO_TIPS = [
  'Allonger visuellement : continuité de couleur entre pantalon et chaussures, ou camaïeu/ton sur ton.',
  'Taille visuelle remontée : pantalon à taille moyenne/haute, haut casual de longueur maîtrisée ou rentré.',
  'Éviter les vêtements trop longs : ourlet à légère cassure, manches au niveau du poignet.',
  'Éviter les coupes excessivement larges ou serrées : aisance naturelle.',
  'Manteaux : au-dessus du genou ou proche du genou comme point de départ, épaules naturelles.',
  'Conseils non absolus ; aucune promesse de changement de taille physique.',
];
export const MEASURES_TO_CHECK = ['Longueur de l\'entrejambe et ourlet souhaité', 'Largeur d\'épaules (veste, chemise)', 'Longueur du dos de veste', 'Tour de taille réel', 'Longueur des manches', 'Ouverture du bas du pantalon'];

// B10 — Élégance féminine
export const WOMEN_INTRO = 'Le tombé, la cohérence et la personnalité priment sur le prix du sac, la hauteur des talons ou une morphologie particulière. Confort et raffinement sont compatibles.';
export const WOMEN_STYLES = [
  ['Chic parisien', 9.5, 'Blazer, jean droit, chemisier blanc, ballerines, sac structuré ; contraste habillé/décontracté'],
  ['Italien', 9.8, 'Manteau camel, pantalon fluide, chemisier soyeux, cuir ; textures et mouvement'],
  ['Quiet Luxury', 9.5, 'Maille fine, neutres, belles matières, accessoires discrets'],
  ['Minimalisme', 9, 'Manteau épuré, gamme neutre, sac sobre ; lignes simples'],
  ['Professionnel', 9.4, 'Tailleur ou blazer, pantalon droit, mocassins ; structure'],
  ['Casual Chic', 9, 'Pull écru, jean droit, cuir, sac minimaliste'],
  ['Classique féminin', 9.5, 'Robe midi, ceinture fine, manteau, bijoux sobres'],
  ['Cérémonie', 9.7, 'Robe fluide, chaussures habillées, accessoires coordonnés'],
];
export const WOMEN_COMBOS = [
  'Robe noire / manteau camel / chaussures noires / bijoux dorés', 'Pantalon beige / chemisier blanc / blazer marine', 'Jupe midi / pull fin / bottines ou ballerines',
  'Jean droit / chemise blanche / blazer noir', 'Pantalon écru / pull chocolat / sac cognac', 'Robe fleurie / cardigan uni / chaussures sobres',
  'Tailleur gris / chemisier ivoire / mocassins', 'Trench beige / jean brut / maille marine',
];
export const WOMEN_NOTE = 'Mariage : généralement éviter une tenue entièrement blanche sauf demande particulière. Photos : Vogue Street Style, Max Mara, The Row, Cucinelli, éditoriaux de cérémonie (voir C2).';

// B11 — Enfants
export const KIDS_INTRO = 'Priorité : confort, liberté de mouvement, entretien facile, âge, température. Ne pas reproduire systématiquement les codes adultes. Palette marine, écru, beige, vert doux, bleu ciel, rose poudré. Référence photo : Jacadi cérémonie (C1/C2), catalogues enfants appropriés.';
export const KIDS = [
  ['École', 'Polo coton, chino souple, baskets', 'Pantalon souple, tee-shirt, cardigan'],
  ['Sortie familiale', 'Pull marine, pantalon beige', 'Robe coton, cardigan écru'],
  ['Anniversaire', 'Oxford, jean confortable', 'Robe colorée ou jupe + haut'],
  ['Mariage/cérémonie', 'Chemise, pantalon léger, veste facultative', 'Robe confortable, cardigan, chaussures adaptées'],
  ['Vacances', 'Bermuda coton, polo, sandales', 'Short ou robe légère, sandales'],
  ['Printemps', 'Cardigan, coton, veste légère', 'Cardigan, pantalon ou robe coton'],
  ['Automne', 'Pull, pantalon, veste pluie', 'Maille, pantalon ou robe + collants'],
  ['Hiver', 'Pull chaud, pantalon, manteau', 'Maille douce, collants/pantalon, manteau'],
];

// B12 — Accessible et qualité
export const ACCESSIBLE_INTRO = 'Une tenue accessible bien construite (polo marine, pantalon beige retouché, chaussures propres) peut être plus adaptée à l\'élégance classique qu\'une tenue de luxe mal assortie ou très ostentatoire. Le streetwear est une autre esthétique, pas une infériorité personnelle.';
export const BUDGETS = [
  ['Tee-shirt de qualité', '15–35 €', 15, 35], ['Chemise Oxford', '30–70 €', 30, 70], ['Polo en maille', '30–80 €', 30, 80], ['Pull mérinos', '40–90 €', 40, 90],
  ['Chino', '35–80 €', 35, 80], ['Pantalon habillé', '50–120 €', 50, 120], ['Jean brut', '40–100 €', 40, 100], ['Blazer', '100–250 €', 100, 250],
  ['Costume', '200–450 €', 200, 450], ['Manteau laine', '150–350 €', 150, 350], ['Chaussures cuir', '80–180 €', 80, 180],
];
export const BRAND_TIERS = [
  ['Accessible', 'Uniqlo, Mango Man, H&M Premium Selection'], ['Intermédiaire', 'Massimo Dutti, COS, Charles Tyrwhitt'], ['Tailoring', 'Suitsupply, Boggi Milano, Pini Parma'],
  ['Haut de gamme', 'Canali, Zegna, Boglioli'], ['Luxe', 'Cucinelli, Loro Piana, Brioni'],
];
export const QUALITY_CHECKS = 'La qualité varie entre collections. Vérifier composition, coutures, boutons, tombé, col, aisance, entretien. Les poches de pantalon ne doivent pas tirer. Les retouches ont souvent plus d\'impact qu\'une marque prestigieuse.';
export const PRICE_FACTORS = ['La coupe', 'Les retouches', 'Les proportions', 'La qualité des tissus', 'L\'entretien', 'Le repassage', 'La propreté des chaussures', 'La simplicité', 'La cohérence générale', 'La posture et la présentation'];

// B14 — 20 erreurs
export const ERRORS = [
  ['Trop serré', 'Garder aisance naturelle'], ['Disproportionné', 'Équilibrer volumes'], ['Pantalon trop long', 'Ourlet'], ['Manches trop longues', 'Retoucher niveau poignet'],
  ['Épaules mal placées', 'Autre coupe'], ['Veste costume trop courte', 'Équilibre du torse'], ['Taille pantalon trop basse', 'Essayer moyenne/haute'], ['Trop de couleurs concurrentes', 'Deux ou trois pour commencer'],
  ['Trop de motifs', 'Une pièce dominante'], ['Logos visibles', 'Discrétion si objectif classique'], ['Chaussures sales', 'Nettoyer/entretenir'], ['Chaussures massives', 'Forme proportionnée'],
  ['Ceinture inadaptée', 'Harmoniser cuir et formalité'], ['Trop d\'accessoires', 'Quelques détails choisis'], ['Chemise froissée', 'Repasser/défroisser selon matière'], ['Maille boulochée', 'Entretenir'],
  ['Matière inadaptée saison', 'Adapter poids/respirabilité'], ['Tenue inadaptée occasion', 'Vérifier dress code'], ['Toutes les tendances', 'Base intemporelle'], ['Acheter pour le logo', 'Juger coupe, qualité, utilité'],
];
export const ERRORS_NOTE = 'Comparer visuellement les plis de tension et la coupe équilibrée, ainsi que l\'ourlet trop long et la légère cassure. L\'attention personnelle porte sur les longueurs de hauts et pantalons, sans règles absolues.';

// B15 — 4 saisons
export const SEASONS = [
  { id: 'spring', name: 'Printemps', materials: 'Coton, mérinos fin, laine légère, gabardine', colors: ['navy', 'ecru', 'olive', 'sky'], colorsText: 'marine, écru, olive, ciel', daily: 'Polo marine, chino crème, mocassins', pro: 'Blazer marine, chemise ciel, pantalon gris', casual: 'Surchemise olive, tee-shirt blanc, jean', dressy: 'Costume marine, chemise blanche' },
  { id: 'summer', name: 'Été', materials: 'Lin, coton léger, seersucker, laine tropicale', colors: ['ecru', 'beige', 'navy', 'sky'], colorsText: 'écru, beige, marine, ciel', daily: 'Polo maille écru, chino léger', pro: 'Chemise ciel, laine légère', casual: 'Chemise lin, bermuda beige', dressy: 'Costume léger marine/beige selon occasion' },
  { id: 'autumn', name: 'Automne', materials: 'Mérinos, daim, flanelle, velours côtelé', colors: ['chocolate', 'camel', 'olive', 'navy', 'burgundy'], colorsText: 'chocolat, camel, olive, marine, bordeaux', daily: 'Pull écru, chino olive, Chelsea', pro: 'Blazer marine, Oxford, pantalon gris', casual: 'Veste daim, jean brut', dressy: 'Veste texturée, flanelle grise, derbies' },
  { id: 'winter', name: 'Hiver', materials: 'Laine, cachemire, mérinos, flanelle', colors: ['camel', 'navy', 'charcoal', 'chocolate', 'ecru'], colorsText: 'camel, marine, anthracite, chocolat, écru', daily: 'Manteau camel, pull écru, jean brut', pro: 'Manteau marine, costume gris', casual: 'Pull mérinos, pantalon olive, bottines', dressy: 'Col roulé anthracite, pantalon gris, manteau marine' },
];
export const SEASONS_NOTE = 'Été : remplacer souvent le blazer par un polo maille. Hiver : couches fines et chaudes si possible pour l\'équilibre, protection thermique prioritaire si grand froid. Les exemples sont complétés avec chaussures adaptées et météo réelle dans le générateur.';

// B18 — Grille
export const GRID = [
  { id: 'fit', name: 'Coupe et proportions', max: 25 },
  { id: 'colors', name: 'Harmonie des couleurs', max: 20 },
  { id: 'refinement', name: 'Élégance et raffinement', max: 20 },
  { id: 'style', name: 'Cohérence du style', max: 10 },
  { id: 'occasion', name: 'Adaptation à l\'occasion', max: 10 },
  { id: 'shoes', name: 'Chaussures et accessoires', max: 10 },
  { id: 'presentation', name: 'Présentation générale', max: 5 },
];
export const GRID_SCALE = [
  ['9,5–10', 'Élégance remarquable'], ['9–9,4', 'Très élégant'], ['8–8,9', 'Bien habillé et raffiné'], ['7–7,9', 'Bonne tenue, améliorable'], ['6–6,9', 'Correct, manque d\'harmonie'], ['< 6', 'Plusieurs éléments à revoir'],
];
export const GRID_NOTE = 'Pour chaque analyse : couleurs, proportions visibles, associations, style, note explicite, points forts, améliorations, meilleure combinaison des vêtements existants, chaussures et référence photo si utile. Toujours indiquer les éléments invisibles ou non connus ; la grille n\'est qu\'un outil pédagogique. La note évalue la tenue, jamais la personne.';

// B19 — Sources
export const SOURCES = [
  ['Permanent Style', 'https://www.permanentstyle.com/', 'Vestiaire masculin, coupes, matières, savoir-faire'],
  ['The Rake', 'https://therake.com/', 'Sartorial, tailleurs, sophistication'],
  ['Vogue', 'https://www.vogue.com/', 'Culture mode, créateurs, street style, féminin'],
  ['Vogue France', 'https://www.vogue.fr/', 'Culture mode, créateurs, street style, féminin'],
  ['GQ', 'https://www.gq.com/', 'Vestiaire contemporain, codes modernes'],
  ['Gentleman\'s Gazette', 'https://www.gentlemansgazette.com/', 'Histoire, chaussures, accessoires, costumes'],
  ['Esquire', 'https://www.esquire.com/', 'Mode masculine et culture'],
  ['Harper\'s Bazaar', 'https://www.harpersbazaar.com/', 'Mode féminine, éditoriaux'],
  ['Vogue Business', 'https://www.voguebusiness.com/', 'Industrie de la mode'],
  ['Business of Fashion', 'https://www.businessoffashion.com/', 'Industrie et analyse'],
  ['WWD', 'https://wwd.com/', 'Actualité professionnelle de la mode'],
  ['Pitti Immagine', 'https://www.pittimmagine.com/', 'Pitti Uomo et salons'],
  ['Fédération de la Haute Couture et de la Mode', 'https://www.fhcm.paris/', 'Paris Fashion Week, calendrier institutionnel'],
  ['Camera Nazionale della Moda Italiana', 'https://www.cameramoda.it/', 'Milan Fashion Week'],
];
export const SOURCES_NOTE = 'Les scores et priorités sont des évaluations argumentées ; aucun sondage mondial représentatif n\'a été identifié. Certaines photos initiales n\'ont pas de source individuelle récupérable.';

// B20 — Conclusion
export const CONCLUSION_QA = [
  ['École polyvalente', 'Italie'], ['Influence historique sur la couture', 'France'], ['Référence historique du costume masculin', 'Royaume-Uni'], ['Quotidien', 'Italian Smart Casual'],
  ['Intemporel', 'British Classic et Sartorial'], ['Raffiné', 'Italian Sartorial'], ['Rapport élégance/prix', 'Smart Casual'], ['Été', 'Mediterranean Chic'],
  ['Professionnel personnel', 'Italian Business Casual'], ['Identité personnelle', 'Italian Contemporary Classic'],
];
export const COMMANDMENTS = [
  'La coupe avant la marque.', 'Les proportions avant les tendances.', 'L\'harmonie avant l\'originalité excessive.', 'La qualité avant la quantité.', 'La simplicité avant l\'accumulation.',
  'Des chaussures toujours entretenues.', 'Une tenue adaptée aux circonstances.', 'Des couleurs faciles à associer.', 'Le confort sans la négligence.', 'La personnalité avant l\'imitation.',
];
export const CONCLUSION_TEXT = 'Emprunter la souplesse aux Italiens, la précision aux Britanniques, la simplicité aux Français, la décontraction aux Américains et l\'attention aux détails aux Japonais. Développer une identité personnelle plutôt que chercher à ressembler à un mannequin ou à une personne fortunée.';
export const CONCLUSION_QUOTE = 'La véritable élégance commence lorsque les vêtements mettent en valeur la personne, plutôt que lorsque la personne cherche à mettre en valeur ses vêtements.';
/** Les 10 questions de conclusion de l'annexe D (§20), avec les réponses éditoriales disponibles dans B. */
export const D20_ANSWERS = [
  ['Quelle école d\'élégance possède la plus grande influence internationale ?', 'Selon la grille B3, Italie, France, Royaume-Uni et États-Unis obtiennent tous 5/5 en influence ; la France est désignée pour l\'influence historique sur la couture (B20).'],
  ['Quels sont les cinq styles les plus raffinés selon les critères retenus ?', 'Par note d\'élégance B4 : Italian Elegance 9,8 ; Sartorial 9,8 ; French Chic 9,5 ; British Classic 9,5 ; Quiet Luxury 9,5 et Business Formal 9,5 (ex æquo).'],
  ['L\'élégance italienne mérite-t-elle sa réputation ?', 'Elle obtient 96/100 dans la grille B3 pour sa polyvalence et son raffinement décontracté ; elle n\'est pas universellement supérieure (B2) et l\'artisanat reste coûteux.'],
  ['Quel style est le plus intemporel ?', 'British Classic et Sartorial (B16, B20).'],
  ['Quel style est le plus polyvalent ?', 'Smart Casual et Casual Chic (polyvalence 10/10, B4).'],
  ['Quel style est le plus adapté à ma morphologie ?', 'Aucun style n\'est imposé par la taille : ce sont les proportions (B8) qui comptent. Le guide recommande l\'Italian Contemporary Classic à adapter aux mesures réelles.'],
  ['Quel style permet de paraître chic tous les jours ?', 'Italian Smart Casual (B20).'],
  ['Quel style permet de rester élégant sans dépenser énormément ?', 'Smart Casual (meilleur rapport élégance/prix, B16).'],
  ['Quels éléments emprunter aux différentes traditions ?', CONCLUSION_TEXT],
  ['Quelle identité vestimentaire personnelle me recommandes-tu ?', 'Italian Contemporary Classic (B17) — répartition modifiable dans le profil.'],
];
