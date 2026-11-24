// Partie C — Catalogue photographique et sources.
// Règle A7 : rights 'unknown' n'est JAMAIS une autorisation. displayMode 'link_only' par défaut :
// l'application affiche une carte texte avec lien vers la publication originale, sans charger l'image distante.
// L'utilisateur peut associer une image dont il détient les droits (rights: 'user_owned').

const VOGUE_CUCINELLI_FW26 = 'https://www.vogue.com/fashion-shows/fall-2026-menswear/brunello-cucinelli/slideshow/collection';
const VOGUE_PITTI_SS26 = 'https://www.vogue.com/slideshow/double-the-suits-double-the-fun-pitti-uomos-best-street-style';
const DRAKES_BEAMS = 'https://www.drakes.com/en-kr/blogs/news/beams-f-drakes';

const base = { isRealPhoto: true, verification: 'visually_checked', verifiedAt: '2026-11-24', rights: 'unknown', displayMode: 'link_only', photographer: null };

export const PHOTOS = [
  { ...base, id: 'C1-01', title: 'Italian Contemporary Classic / hiver : veste texturée et écru', sourcePageUrl: VOGUE_CUCINELLI_FW26, sourceLabel: 'Brunello Cucinelli automne 2026, Vogue, look 2',
    imageUrl: 'https://assets.vogue.com/photos/696a03c84d42ba4ed97591c7/master/w_360%2Cc_limit/00002-brunello-cucinelli-fall-2026-menswear-credit-brand.jpg',
    credit: 'Courtesy of Brunello Cucinelli', styleIds: ['italian', 'contemporary', 'quiet'], seasons: ['autumn', 'winter'], colors: ['charcoal', 'light-gray', 'ecru', 'taupe'],
    alt: 'Veste sombre texturée, col roulé gris, pantalon écru, chaussures taupe',
    visible: 'Veste à motif discret, col roulé gris, pantalon clair, chaussures taupe, ceinture foncée.',
    analysis: 'Contraste doux du gris avec l\'écru ; la maille et la veste donnent de la profondeur. Le pantalon ample à taille structurée équilibre la tenue.',
    accessibleAlternative: 'Blazer gris/chocolat, mérinos gris, chino écru, Chelsea taupe. Pour 1,63 m, adapter la longueur du pantalon et l\'ouverture du bas ; pas besoin de reproduire les poches cargo visibles.' },
  { ...base, id: 'C1-02', title: 'Contemporary Classic : veste en cuir bordeaux/brun et pantalon marine', sourcePageUrl: VOGUE_CUCINELLI_FW26, sourceLabel: 'Brunello Cucinelli automne 2026, Vogue, look 5',
    imageUrl: 'https://assets.vogue.com/photos/696a03cb0980f0ed4f34b13c/master/w_360%2Cc_limit/00005-brunello-cucinelli-fall-2026-menswear-credit-brand.jpg',
    credit: 'Courtesy of Brunello Cucinelli', styleIds: ['contemporary'], seasons: ['autumn', 'winter'], colors: ['burgundy', 'chocolate', 'navy', 'ecru'],
    alt: 'Veste cuir bordeaux brun, chemise cravate et pantalon marine à pinces',
    visible: 'Veste décontractée en cuir, chemise et cravate, pantalon ample, chaussures habillées.',
    analysis: 'La veste décontractée en cuir contraste avec la chemise/cravate, le pantalon ample et les chaussures habillées. Harmonie marine, brun rouge et clair.',
    accessibleAlternative: 'Surchemise chocolat ou bordeaux, Oxford claire, chino marine, chaussures marron ; cravate facultative selon occasion. Veste courte mais non étriquée.' },
  { ...base, id: 'C1-03', title: 'Quiet Luxury / casual chic : écru et gris doux', sourcePageUrl: VOGUE_CUCINELLI_FW26, sourceLabel: 'Brunello Cucinelli automne 2026, Vogue, look 9',
    imageUrl: 'https://assets.vogue.com/photos/696a03cfa630d8d935cc693e/master/w_360%2Cc_limit/00009-brunello-cucinelli-fall-2026-menswear-credit-brand.jpg',
    credit: 'Courtesy of Brunello Cucinelli', styleIds: ['quiet', 'casual-chic'], seasons: ['autumn', 'winter'], colors: ['ecru', 'light-gray', 'chocolate'],
    alt: 'Veste grise à col beige, pull écru, pantalon clair et bottines marron',
    visible: 'Veste grise à col beige, pull écru, pantalon clair, bottines marron.',
    analysis: 'Écru dominant, gris atténué, marron aux chaussures ; textures et silhouette décontractée, taille structurée. La cohérence compte davantage que le prix.',
    accessibleAlternative: 'Pull écru, chino crème, veste grise, ceinture marron et bottines. Adapter la largeur/longueur de jambe et la taille du revers de pantalon.' },
  { ...base, id: 'C1-04', title: 'Sartorial / business habillé : costume croisé gris', sourcePageUrl: VOGUE_CUCINELLI_FW26, sourceLabel: 'Brunello Cucinelli automne 2026, Vogue, look 11',
    imageUrl: 'https://assets.vogue.com/photos/696a03d14d42ba4ed97591c9/master/w_360%2Cc_limit/00011-brunello-cucinelli-fall-2026-menswear-credit-brand.jpg',
    credit: 'Courtesy of Brunello Cucinelli', styleIds: ['sartorial', 'business-formal'], seasons: ['autumn', 'winter'], colors: ['charcoal', 'white', 'light-gray'],
    alt: 'Costume croisé gris sombre, chemise claire, cravate grise et chaussures beiges',
    visible: 'Costume croisé gris sombre, chemise claire, cravate grise, pochette avec une touche de rouge, chaussures claires.',
    analysis: 'Continuité du costume gris, revers généreux, cravate ton sur ton, petite touche de rouge à la pochette. Les chaussures claires rendent l\'ensemble moins strict qu\'un business formal conservateur.',
    accessibleAlternative: 'Costume anthracite ajusté, chemise blanche, cravate grise ; richelieus noirs pour une réunion formelle, derbies marron pour une interprétation moins stricte. Ne pas imposer la veste croisée si les proportions ne conviennent pas.' },
  { ...base, id: 'C1-05', title: 'Italian Smart Casual / camaïeu d\'automne', sourcePageUrl: VOGUE_CUCINELLI_FW26, sourceLabel: 'Brunello Cucinelli automne 2026, Vogue, look 16',
    imageUrl: 'https://assets.vogue.com/photos/696a03d8db041d067e34bf92/master/w_360%2Cc_limit/00016-brunello-cucinelli-fall-2026-menswear-credit-brand.jpg',
    credit: 'Courtesy of Brunello Cucinelli', styleIds: ['italian', 'smart-casual'], seasons: ['autumn'], colors: ['taupe', 'chocolate', 'ecru'],
    alt: 'Veste taupe, pull brun, chemise cravate et pantalon écru à pinces',
    visible: 'Veste taupe, pull brun, chemise et cravate, pantalon écru à pinces, chaussures taupe.',
    analysis: 'Camaïeu taupe, brun et écru ; superpositions, pantalon à pinces et chaussures taupe. Une cravate apporte un accent habillé mais n\'est pas indispensable.',
    accessibleAlternative: 'Surchemise taupe, pull chocolat, Oxford claire, chino écru, bottines marron.' },
  { ...base, id: 'C1-06', title: 'Pitti Uomo : tailoring expressif et proportions', sourcePageUrl: VOGUE_PITTI_SS26, sourceLabel: 'Vogue — Pitti Uomo printemps-été 2026, galerie, image 7/170',
    imageUrl: 'https://assets.vogue.com/photos/685586039743860379fd8c1f/master/w_1024%2Cc_limit/PITTIUOMO_STREETSTYLE_day3ACIELLE_07.jpg',
    credit: 'Acielle / Style Du Monde', styleIds: ['sartorial'], seasons: ['spring', 'summer'], colors: ['navy', 'white'],
    alt: 'Deux tenues sartoriales, pantalon à carreaux et costume bleu à rayures',
    visible: 'Deux tenues : taille haute, bretelles et carreaux ; rayures verticales, costume et cravate. Accessoires nombreux.',
    analysis: 'Deux interprétations expressives du tailoring. Les accessoires sont nombreux : inspiration sartoriale, pas modèle quotidien universel.',
    accessibleAlternative: 'Retenir la taille de pantalon structurée, la chemise claire et le costume marine à motif discret ; simplifier chapeau, bijoux et motifs pour un usage quotidien.' },
  { ...base, id: 'C1-07', title: 'BEAMS F × Drake\'s : réinterprétation japonaise des classiques', sourcePageUrl: DRAKES_BEAMS, sourceLabel: 'The BEAMS F & Drake\'s Lookbook, 9 septembre 2026',
    imageUrl: 'https://www.drakes.com/cdn/shop/files/Beams_F_Drake_s2.jpg?v=1788954741&width=1660',
    credit: 'Drake\'s (photographe individuel non identifié)', styleIds: ['japanese', 'british'], seasons: ['autumn'], colors: ['mid-blue', 'ecru', 'olive'],
    alt: 'Veste de travail denim, maille Fair Isle, chemise blanche, cravate et pantalon clair',
    visible: 'Veste de travail denim, maille Fair Isle, chemise blanche, cravate, pantalon clair. Photo recadrée : ourlet et chaussures non visibles.',
    analysis: 'Contraste du denim utilitaire et de la cravate, superpositions riches, bleu indigo/écru/vert sombre. La photo recadrée ne permet pas d\'évaluer l\'ourlet ou les chaussures.',
    accessibleAlternative: 'Veste denim, cardigan/pull sans manches, chemise Oxford, pantalon beige ; simplifier la maille et la cravate selon le niveau de formalité.' },
  { ...base, id: 'C1-08', title: 'British Classic × Japon : manteau ceinturé', sourcePageUrl: DRAKES_BEAMS, sourceLabel: 'The BEAMS F & Drake\'s Lookbook',
    imageUrl: 'https://www.drakes.com/cdn/shop/files/Beams_F_Drake_s6.jpg?v=1788954765&width=1660',
    credit: 'Drake\'s (photographe individuel non identifié)', styleIds: ['british', 'japanese'], seasons: ['winter'], colors: ['camel', 'chocolate', 'ecru'],
    alt: 'Manteau long camel texturé, maille sombre, pantalon écru et chaussures marron',
    visible: 'Manteau long camel texturé et ceinturé, maille sombre, pantalon écru, chaussures marron.',
    analysis: 'Manteau texturé, palette chaude, pantalon clair, chaussures marron. La ceinture structure le volume ; longueur du manteau à adapter à la silhouette personnelle.',
    accessibleAlternative: 'Manteau camel bien proportionné, pull chocolat, pantalon écru, derbies marron. Un manteau moins long peut mieux convenir à certaines proportions.' },
  { ...base, id: 'C1-09', title: 'Pitti Uomo : contraste de couleurs et volumes contemporains (contrepoint)', sourcePageUrl: VOGUE_PITTI_SS26, sourceLabel: 'Vogue — Pitti Uomo printemps-été 2026, image 2/170',
    imageUrl: 'https://assets.vogue.com/photos/68558605eb439309de721dc1/master/w_1024%2Cc_limit/PITTIUOMO_STREETSTYLE_day3ACIELLE_02.jpg',
    credit: 'Acielle / Style Du Monde', styleIds: ['contemporary'], seasons: ['spring', 'summer'], colors: ['olive', 'charcoal'], counterpoint: true,
    alt: 'Veste vert profond à motif, pantalon sombre large et chaussures jaunes',
    visible: 'Veste vert profond à motif, pantalon sombre large, chaussures jaunes.',
    analysis: 'Tenue street style expressive, pièce dominante verte et chaussures jaunes contrastantes. Ne pas la classer automatiquement comme élégance italienne classique : Pitti présente des styles très variés.',
    accessibleAlternative: 'Surchemise olive unie, pantalon marine ou anthracite droit et chaussures marron ; conserver une touche de couleur et réduire les volumes si nécessaire.' },
];

// C2 — Galeries vérifiées/retrouvées
export const GALLERIES = [
  ['Vogue France — Pitti Uomo printemps-été 2026', 'https://www.vogue.fr/galerie/personnalites-pitti-uomo-printemps-ete-2026', 'Street style, Italie, tailoring, été'],
  ['Vogue US — Pitti Uomo printemps-été 2026', VOGUE_PITTI_SS26, 'Galerie Acielle / Style Du Monde'],
  ['Vogue France — Pitti Uomo automne-hiver 2026-2027', 'https://www.vogue.fr/galerie/pitti-uomo-automne-hiver-2026-2027', 'Hiver, manteaux, superpositions'],
  ['Permanent Style — Style Lookbook', 'https://www.permanentstyle.com/style-lookbook', 'Tenues classées, tailoring, casual ; page retrouvée, ouverture ponctuellement en timeout'],
  ['Vogue — Cucinelli automne 2026', VOGUE_CUCINELLI_FW26, 'Photos de collection, quiet luxury, couleurs'],
  ['Vogue — Cucinelli printemps 2027', 'https://www.vogue.com/fashion-shows/spring-2027-menswear/brunello-cucinelli', 'Inspiration estivale'],
  ['Drake\'s — Collection Five, 2020', 'https://www.drakes.com/blogs/news/collection-five-2020-lookbook', 'Contemporary Classic, British'],
  ['Drake\'s — Spring/Summer 2020', 'https://www.drakes.com/blogs/news/spring-summer-2020-lookbook', 'Casual chic, été'],
  ['Drake\'s — BEAMS F & Drake\'s', DRAKES_BEAMS, 'Japon, UK'],
  ['Vogue France — Street Style', 'https://www.vogue.fr/dossier/street-style', 'Paris, Milan, Stockholm, féminin'],
  ['Vogue — Cucinelli prêt-à-porter printemps 2026', 'https://www.vogue.com/fashion-shows/spring-2026-ready-to-wear/brunello-cucinelli', 'Féminin, luxe discret'],
  ['Jacadi — Lookbook cérémonie France', 'https://www.jacadi.fr/collection-ceremonie/look-book', 'Enfants, cérémonies'],
  ['Jacadi — Tendances et lookbook', 'https://www.jacadi.fr/journal/tendances-et-lookbook', 'Enfants, saison, quotidien'],
];

// C2 — Fiches à compléter pour les 15 styles (statut needs_review : liens non revérifiés individuellement)
export const STYLE_PHOTO_BRIEFS = {
  italian: { links: ['https://www.tag-walk.com/en/look/e873a993f958c618db6e5eb5d25bd2a5?season=spring-summer-2026&tags=casual-tailoring&type=man'], photos: ['C1-01', 'C1-05'], brief: 'Brunello Cucinelli SS26 beige tonal, chemise blanche, coupe souple ; cohérence du camaïeu' },
  french: { links: ['https://www.queen.gr/moda/symvoules-modas/story/284771/5-chic-synola-me-flats-pou-forane-tora-oi-gallides-apo-balarines-mexri-loafers', 'https://www.vogue.fr/dossier/street-style'], photos: [], brief: 'Parisian black blazer white shirt straight jeans, ballerines ; jean détend le blazer, taille structurée' },
  british: { links: ['https://www.permanentstyle.com/2014/01/pictures-from-pitti-uomo-2014.html'], photos: ['C1-08'], brief: 'Drake\'s brown tweed jacket grey flannel trousers blue shirt tie ; textures et contraste mesuré' },
  sartorial: { links: ['https://www.permanentstyle.com/style-lookbook'], photos: ['C1-04', 'C1-06'], brief: 'Bespoke navy sports jacket grey pleated trousers tie loafers ; proportions et maîtrise du tailoring' },
  'old-money': { links: ['https://www.ralphlauren.com/men-clothing-pants/straight-fit-stretch-chino-pant/624054.html'], photos: [], brief: 'Pull torsadé bleu ciel, pantalon écru, chemise blanche, chaussures marron ; références sportives classiques' },
  quiet: { links: ['https://www.vogue.com/fashion-shows/fall-2026-menswear/brunello-cucinelli'], photos: ['C1-03'], brief: 'Cucinelli taupe cream cashmere knit trousers, matières et discrétion' },
  'smart-casual': { links: ['https://www.harryrosen.com/en/product/patrick-assaraf-textured-stitch-knit-polo-20177800066'], photos: ['C1-05'], brief: 'Polo en maille beige, pantalon marine, mocassins ; équilibre chic/décontracté' },
  'business-casual': { links: ['https://mensfashioner.com/articles/ultimate-guide-to-mens-business-casual'], photos: [], brief: 'Navy blazer white shirt beige chinos brown loafers ; structure sans cravate' },
  'business-formal': { links: ['https://www.brioni.com/ja/jp', 'https://www.permanentstyle.com/style-lookbook'], photos: [], brief: 'Costume bleu marine, chemise blanche, cravate sombre, richelieus ; architecture revers/col/épaules' },
  ivy: { links: ['https://www.esdemarca.com/es/polo-ralph-lauren/camisa-oxford-custom-fit-azul-710792041004-3040728.html', 'https://www.ralphlauren.fr/'], photos: [], brief: 'Oxford bleue, chino beige, pull col rond, ceinture tressée, mocassins' },
  scandi: { links: ['https://bcncoolhunter.com/2015/12/cos-adiccion-minimal-moda-estilo-nordico/'], photos: [], brief: 'Manteau anthracite, col roulé gris clair, pantalon gris ; continuité visuelle' },
  japanese: { links: ['https://www.beams.co.jp/blog/smb/110627/'], photos: ['C1-07', 'C1-08'], brief: 'Blazer marine boutons dorés, pantalon kaki, chemise blanche, cravate rayée ; équilibre de volumes' },
  mediterranean: { links: ['https://www.beymen.com/tr/p_brunello-cucinelli-kahverengi-keten-gomlek_1954706', 'https://www.vogue.fr/galerie/personnalites-pitti-uomo-printemps-ete-2026'], photos: [], brief: 'Chemise lin taupe, pantalon écru, mocassins daim ; légèreté' },
  'casual-chic': { links: ['https://www.thelovelist.wtf/p/todd-snyder-and-the-state-of-american'], photos: ['C1-03'], brief: 'Manteau marine, pull gris, jean droit, chaussures cuir ; vêtements ordinaires élevés par les pièces fortes' },
  contemporary: { links: ['https://www.drakes.com/blogs/news/collection-five-2020-lookbook'], photos: ['C1-02', 'C1-01'], brief: 'Veste texturée, pull écru, jean brut, chemise, bottines ; caractère et modernité' },
};

// C2 — Requêtes photographiques complémentaires (briefs en attente, pas des photos)
export const PHOTO_QUERIES = [
  ['Italie et régions', 'Pitti Uomo Florence classic navy blazer cream trousers street style ; Giorgio Armani relaxed tailoring ; Brunello Cucinelli neutral beige ; Milan Caraceni structured suit ; Rubinacci Naples spalla camicia ; Liverano Florence bespoke tailoring ; Brioni Rome suit ; Gianni Agnelli sprezzatura archival photograph'],
  ['Écoles internationales', 'Parisian classic navy coat ; Savile Row bespoke suit ; Drake\'s tweed flannel ; Ralph Lauren Ivy chinos Oxford ; BEAMS F / BEAMS PLUS lookbook ; COS menswear neutral minimalism ; Seoul fashion week minimalist tailored trousers coat ; Spanish Teba jacket linen'],
  ['Harmonies italiennes', 'beige tonal cream trousers ; navy knit polo cream trousers ; olive trousers cream polo brown suede loafers ; navy unstructured blazer pale blue shirt grey trousers'],
  ['Créateurs', 'Portraits éditoriaux autorisés d\'Armani, Cucinelli, Ralph Lauren, Tom Ford, Saint Laurent, Crompton, Chanel, Dior, Agnelli ; uniquement si valeur pédagogique, pas de reconnaissance faciale'],
  ['10 occasions principales', 'navy knit polo cream trousers loafers ; navy blazer white shirt beige chinos ; chocolate polo cream trousers ; olive overshirt white t-shirt beige chino ; navy suit burgundy tie ; cream linen shirt navy trousers ; camel coat cream turtleneck beige trousers ; navy suit pale blue shirt tie ; black turtleneck charcoal trousers Chelsea ; ecru sweater dark jeans suede jacket'],
  ['Vêtements masculins', 'fitted Oxford shirt ; fine knitted polo ; merino crewneck ; medium high rise grey wool trousers ; beige straight chinos ; raw indigo jeans ; unstructured navy blazer ; classic two-button navy suit ; camel wool coat ; beige trench'],
  ['Chaussures', 'dark brown suede penny loafers ; brown leather derby ; black cap toe Oxford ; brown Chelsea boots ; white minimalist sneakers'],
  ['Morphologie', 'casual long top vs proportioned top ; trouser no break ; slight break ; excessive bunching ; tonal beige knit polo high-waist trousers ; monochrome navy ; tucked white shirt high-rise grey trousers'],
  ['Femme', 'Vogue Parisian blazer striped shirt jeans ballet flats ; Max Mara camel coat cream trousers silk blouse ; The Row quiet luxury cream cashmere ; Scandinavian minimalist coat ; navy blazer tailored trousers office ; cream sweater straight jeans loafers ; classic navy midi dress ; sage green wedding guest midi dress'],
  ['Enfants', 'Jacadi boy navy cardigan white shirt beige chino ; girl cotton dress cardigan school ; boy linen blazer shorts ceremony ; girl pastel cotton ceremony dress'],
  ['Budget et erreurs', 'affordable navy polo beige trousers loafers ; ostentatious logo outfit as contrast of aesthetic, no shaming ; tight jacket pulling wrinkles ; well-fitting natural shoulder suit ; trouser bunching ; slight-break hem'],
  ['Capsule', 'Photo produit autorisée pour chacune des 30 pièces B13, notamment les 10 premières ; références de silhouettes correspondantes'],
  ['Printemps', 'navy blazer cream chinos ; beige trench blue shirt jeans ; olive overshirt white tee beige trousers'],
  ['Été', 'linen shirt cream trousers suede loafers ; navy knitted polo white trousers ; light beige linen suit wedding'],
  ['Automne', 'brown suede jacket cream sweater dark jeans ; olive trousers beige knit boots ; brown tweed grey flannel'],
  ['Hiver', 'camel wool coat cream turtleneck beige trousers ; navy overcoat grey wool trousers ; charcoal monochrome coat turtleneck'],
  ['Six signatures', 'Pini Parma navy polo cream high-rise trousers ; beige knit polo chocolate trousers ; white shirt olive trousers ; navy blazer blue shirt grey trousers ; camel coat ecru turtleneck ; navy suit white shirt burgundy tie'],
];
export const PHOTO_CHECKLIST = ['Source identifiable', 'Image réelle', 'Lien exact', 'Crédit connu ou explicitement inconnu', 'Analyse conforme à ce qui est visible', 'Licence/statut', 'Alternative abordable', 'Revalidation périodique', 'Lien de secours'];
export const RIGHTS_LABELS = { unknown: 'Droits inconnus — lien uniquement', link_only: 'Lien uniquement', licensed: 'Sous licence', user_owned: 'Image fournie par l\'utilisateur' };
export const PHOTO_BY_ID = Object.fromEntries(PHOTOS.map((p) => [p.id, p]));
