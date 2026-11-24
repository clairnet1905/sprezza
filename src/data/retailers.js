// A8 — Annuaire initial (France/Europe). Pistes de recherche, gammes indicatives.
// Aucune forme d'URL de recherche interne n'a été vérifiée : l'application ouvre la page d'accueil officielle
// et propose de copier la requête, ou une recherche web restreinte au domaine (URL Google `site:` documentée).
// cats: h=homme, f=femme, e=enfant, s=chaussures, t=tailoring, o=seconde main, m=multi-marques ; tier: 1 accessible … 5 luxe

export const RETAILERS = [
  { name: 'Uniqlo', url: 'https://www.uniqlo.com/', why: 'Accessible : mérinos, chinos, Oxford, basiques', tier: 1, cats: ['h', 'f', 'e'] },
  { name: 'Mango', url: 'https://shop.mango.com/', why: 'Accessible/intermédiaire : polos, pantalons habillés, blazers', tier: 2, cats: ['h', 'f', 'e'] },
  { name: 'H&M', url: 'https://www2.hm.com/', why: 'Accessible : sélectionner les pièces sur composition et coupe', tier: 1, cats: ['h', 'f', 'e'] },
  { name: 'Massimo Dutti', url: 'https://www.massimodutti.com/', why: 'Intermédiaire : esthétique italienne, lin, maille, pantalons', tier: 3, cats: ['h', 'f'] },
  { name: 'COS', url: 'https://www.cos.com/', why: 'Intermédiaire : minimalisme, coupes structurées', tier: 3, cats: ['h', 'f'] },
  { name: 'Arket', url: 'https://www.arket.com/', why: 'Intermédiaire : classiques scandinaves', tier: 3, cats: ['h', 'f', 'e'] },
  { name: 'Charles Tyrwhitt', url: 'https://www.charlestyrwhitt.com/', why: 'Chemises, cols, longueurs de manches, business', tier: 3, cats: ['h', 't'] },
  { name: 'Hast', url: 'https://www.hastparis.com/', why: 'Chemises, pantalons et vestiaire classique', tier: 3, cats: ['h'] },
  { name: 'Octobre Éditions', url: 'https://www.octobre-editions.com/', why: 'Casual chic masculin', tier: 3, cats: ['h'] },
  { name: 'BonneGueule', url: 'https://bonnegueule.fr/', why: 'Vestiaire masculin, contenu pédagogique, matières', tier: 3, cats: ['h'] },
  { name: 'Suitsupply', url: 'https://suitsupply.com/', why: 'Tailoring, costumes, blazers, retouches selon boutique', tier: 3, cats: ['h', 't'] },
  { name: 'Boggi Milano', url: 'https://www.boggi.com/', why: 'Business casual et tailoring italien', tier: 3, cats: ['h', 't'] },
  { name: 'Pini Parma', url: 'https://www.piniparma.com/', why: 'Inspiration sartoriale italienne, pantalons à pinces, maille', tier: 4, cats: ['h', 't'] },
  { name: 'Spier & Mackay', url: 'https://www.spierandmackay.com/', why: 'Tailoring ; vérifier import, taxes et retours', tier: 3, cats: ['h', 't'] },
  { name: 'Ralph Lauren', url: 'https://www.ralphlauren.fr/', why: 'Ivy, preppy, inspiration classique', tier: 4, cats: ['h', 'f', 'e'] },
  { name: 'Drake\'s', url: 'https://www.drakes.com/', why: 'Inspiration britannique, contemporary classic', tier: 4, cats: ['h'] },
  { name: 'Brunello Cucinelli', url: 'https://www.brunellocucinelli.com/', why: 'Luxe, inspiration palettes et textures, pas une nécessité d\'achat', tier: 5, cats: ['h', 'f'] },
  { name: 'Loro Piana', url: 'https://www.loropiana.com/', why: 'Luxe, inspiration matières', tier: 5, cats: ['h', 'f'] },
  { name: 'Canali', url: 'https://www.canali.com/', why: 'Tailoring haut de gamme', tier: 5, cats: ['h', 't'] },
  { name: 'Zegna', url: 'https://www.zegna.com/', why: 'Tailoring et casual haut de gamme', tier: 5, cats: ['h', 't'] },
  { name: 'Bexley', url: 'https://www.bexley.fr/', why: 'Chaussures, ceintures, chemises', tier: 2, cats: ['h', 's'] },
  { name: 'Meermin', url: 'https://meermin.com/', why: 'Mocassins, richelieus, derbies, Chelsea', tier: 3, cats: ['h', 's'] },
  { name: 'Bobbies', url: 'https://www.bobbies.com/', why: 'Chaussures homme et femme', tier: 3, cats: ['h', 'f', 's'] },
  { name: 'Finsbury', url: 'https://www.finsbury-shoes.com/', why: 'Chaussures habillées', tier: 3, cats: ['h', 's'] },
  { name: 'Sézane', url: 'https://www.sezane.com/', why: 'Chic féminin français', tier: 3, cats: ['f'] },
  { name: 'Max Mara', url: 'https://www.maxmara.com/', why: 'Inspiration manteaux et tailoring féminin', tier: 5, cats: ['f'] },
  { name: 'Jacadi', url: 'https://www.jacadi.fr/', why: 'Vestiaire enfants, cérémonies', tier: 3, cats: ['e'] },
  { name: 'Okaïdi', url: 'https://www.okaidi.fr/', why: 'Enfants : quotidien, confort', tier: 1, cats: ['e'] },
  { name: 'Vinted', url: 'https://www.vinted.fr/', why: 'Seconde main ; état, mesures, vendeurs à contrôler', tier: 1, cats: ['h', 'f', 'e', 'o'] },
  { name: 'Vestiaire Collective', url: 'https://www.vestiairecollective.com/', why: 'Seconde main premium ; vérifier authenticité et frais', tier: 4, cats: ['h', 'f', 'o'] },
  { name: 'Zalando', url: 'https://www.zalando.fr/', why: 'Recherche multi-marques et filtres', tier: 2, cats: ['h', 'f', 'e', 'm', 's'] },
  { name: 'La Redoute', url: 'https://www.laredoute.fr/', why: 'Multi-marques, basiques accessibles', tier: 1, cats: ['h', 'f', 'e', 'm'] },
];
export const TIER_NAMES = { 1: 'Accessible', 2: 'Accessible/intermédiaire', 3: 'Intermédiaire', 4: 'Haut de gamme', 5: 'Luxe' };
export const CAT_NAMES = { h: 'Homme', f: 'Femme', e: 'Enfant', s: 'Chaussures', t: 'Tailoring', o: 'Seconde main', m: 'Multi-marques' };
export const RETAILERS_NOTE = 'Ces sites sont des pistes de recherche et leurs gammes sont indicatives. Vérifier les liens, la livraison en France, les frais, les retours, les tailles, les prix et la disponibilité au moment de l\'achat. Aucun prix ni stock n\'est affiché sans vérification.';
export function hostOf(url) { try { return new URL(url).hostname.replace(/^www2?\./, ''); } catch { return ''; } }
