// Lecture d'une fiche produit trouvée sur internet (titre, description copiée ou lien) → caractéristiques SPREZZA.
// Fonction pure et testée : rien n'est appliqué sans validation, chaque champ proposé reste à confirmer.
import { SUB_INFO } from '../data/taxonomy.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Domaines connus → marque. */
const BRAND_DOMAINS = {
  'zara.com': 'Zara', 'hm.com': 'H&M', 'www2.hm.com': 'H&M', 'uniqlo.com': 'Uniqlo', 'mango.com': 'Mango', 'shop.mango.com': 'Mango', 'pullandbear.com': 'Pull&Bear',
  'massimodutti.com': 'Massimo Dutti', 'cos.com': 'COS', 'cosstores.com': 'COS', 'arket.com': 'Arket', 'bershka.com': 'Bershka', 'celio.com': 'Celio', 'jules.com': 'Jules',
  'kiabi.com': 'Kiabi', 'decathlon.fr': 'Decathlon', 'asos.com': 'ASOS', 'boss.com': 'Hugo Boss', 'hugoboss.com': 'Hugo Boss', 'ralphlauren.fr': 'Ralph Lauren', 'ralphlauren.com': 'Ralph Lauren',
  'lacoste.com': 'Lacoste', 'tommy.com': 'Tommy Hilfiger', 'sezane.com': 'Sézane', 'apc.fr': 'A.P.C.', 'theKooples.com': 'The Kooples', 'thekooples.com': 'The Kooples', 'sandro-paris.com': 'Sandro',
  'maje.com': 'Maje', 'zadig-et-voltaire.com': 'Zadig & Voltaire', 'officine-generale.com': 'Officine Générale', 'brunellocucinelli.com': 'Brunello Cucinelli', 'loropiana.com': 'Loro Piana',
  'suitsupply.com': 'Suitsupply', 'devred.com': 'Devred', 'bonobo.fr': 'Bonobo', 'lebonmarche.com': '', 'zalando.fr': '', 'laredoute.fr': '', 'vinted.fr': '', 'amazon.fr': '',
  'jmweston.com': 'J.M. Weston', 'paraboot.com': 'Paraboot', 'clarks.fr': 'Clarks', 'veja-store.com': 'Veja', 'common-projects.com': 'Common Projects', 'apple.com': 'Apple',
};
const KNOWN_BRANDS = ['Zara', 'H&M', 'Uniqlo', 'Mango', 'Pull&Bear', 'Massimo Dutti', 'COS', 'Arket', 'Bershka', 'Celio', 'Jules', 'Kiabi', 'Decathlon', 'Hugo Boss', 'Boss', 'Ralph Lauren', 'Polo Ralph Lauren', 'Lacoste', 'Tommy Hilfiger', 'Sézane', 'A.P.C.', 'The Kooples', 'Sandro', 'Maje', 'Officine Générale', 'Brunello Cucinelli', 'Loro Piana', 'Suitsupply', 'Levi\'s', 'Levis', 'Carhartt', 'Barbour', 'Lee', 'Wrangler', 'Paraboot', 'J.M. Weston', 'Clarks', 'Veja', 'Common Projects', 'Adidas', 'Nike', 'New Balance', 'Timberland', 'Dr. Martens', 'Sebago', 'Tod\'s', 'Gucci', 'Hermès', 'Apple', 'Ray-Ban', 'Persol', 'Armor-Lux', 'Saint James', 'Petit Bateau', 'Le Slip Français', 'Bonobo', 'Devred', 'Brice', 'Selected', 'Jack & Jones', 'Gant', 'Napapijri', 'The North Face', 'Patagonia', 'Aigle', 'Eden Park', 'Façonnable', 'Hackett', 'Charles Tyrwhitt', 'Ted Baker'];

/** Types : du plus spécifique au plus général (premier trouvé gagne). FR / EN / ES / IT. */
const SUB_RULES = [
  ['col-roule', /col roule|roll ?neck|turtle ?neck|cuello alto|dolcevita/],
  ['chemise-lin', /chemise[^.,;]{0,25}\blin\b|\blin\b[^.,;]{0,25}chemise|linen shirt|camisa de lino|camicia di lino/],
  ['surchemise', /surchemise|overshirt|sobrecamisa/],
  ['polo-sport', /polo (en )?(coton )?pique|pique polo|polo pique/],
  ['polo', /\bpolo\b/],
  ['tee-shirt', /t-?shirt|tee[- ]shirt|\btee\b|camiseta/],
  ['sweat', /sweat|hoodie|capuche|sudadera|felpa/],
  ['polaire', /polaire|fleece|forro polar/],
  ['cardigan-epais', /gilet (en )?(grosse )?maille epaisse|cardigan epais|chunky cardigan/],
  ['cardigan', /cardigan|gilet en maille|\bgilet\b/],
  ['pull', /\bpull|sweater|jumper|knit(ted)?\b|jersey de punto|maglione|tricot|maille|cachemire|cashmere|merinos|merino/],
  ['chemise', /chemise|shirt|camisa|camicia|oxford/],
  ['pantalon-costume', /pantalon (de )?costume|suit trousers|suit pants|pantalon de traje/],
  ['flanelle', /pantalon[^.,;]{0,20}flanelle|flannel trousers/],
  ['chino', /chino/],
  ['jean', /\bjeans?\b|denim pant|vaquero|\bdenim\b(?! (jacket|veste))/],
  ['bermuda', /bermuda/],
  ['short', /\bshorts?\b/],
  ['jogging', /jogging|jogger|survetement|sweatpants/],
  ['jupe', /\bjupe|skirt|falda|gonna/],
  ['pantalon', /pantalon|trousers|\bpants\b|pantalones|pantaloni/],
  ['veste-costume', /veste de (costume|traje)|suit jacket|\bcostume\b|\bsuit\b|\btraje\b/],
  ['blazer', /blazer|veste (de )?tailleur|sport coat|americana|giacca/],
  ['veste-daim', /veste[^.,;]{0,20}(daim|suede)|suede jacket/],
  ['veste-cuir', /veste[^.,;]{0,20}cuir|leather jacket|blouson cuir|perfecto/],
  ['veste-denim', /veste[^.,;]{0,20}(jean|denim)|denim jacket|trucker/],
  ['trench', /trench/],
  ['caban', /caban|peacoat|pea coat/],
  ['doudoune', /doudoune|puffer|down jacket|plumas/],
  ['parka', /parka/],
  ['impermeable', /impermeable|raincoat|rain jacket|cire\b/],
  ['manteau', /manteau|overcoat|\bcoat\b|abrigo|cappotto/],
  ['veste-technique', /veste technique|softshell|windbreaker|coupe-vent/],
  ['mocassins', /mocassin|loafer/],
  ['richelieus', /richelieu|oxford shoe/],
  ['derbies', /derby|derbies/],
  ['chelsea', /chelsea/],
  ['bottines', /bottine|boots?\b|botin/],
  ['espadrilles', /espadrille/],
  ['sandales', /sandale|sandal/],
  ['bateau', /chaussures? bateau|boat shoe|deck shoe/],
  ['randonnee', /randonnee|hiking/],
  ['baskets', /basket|sneaker|trainer|zapatilla/],
  ['ceinture-tressee', /ceinture[^.,;]{0,15}tress|braided belt/],
  ['ceinture-toile', /ceinture[^.,;]{0,15}(toile|tissu|sangle)|canvas belt|webbing belt/],
  ['ceinture-cuir', /ceinture|\bbelt\b|cinturon|cintura/],
  ['cravate', /cravate|\btie\b|corbata|cravatta/],
  ['pochette', /pochette de costume|pocket square/],
  ['bracelet-montre', /bracelet (de |pour )?montre|watch (strap|band)|bracelet apple watch|apple watch band/],
  ['montre-connectee', /apple watch|montre connectee|smartwatch|galaxy watch|garmin/],
  ['montre', /\bmontre\b|\bwatch\b|reloj|orologio/],
  ['lunettes-vue', /lunettes de vue|monture optique|optical frame|eyeglasses/],
  ['lunettes', /lunettes|sunglasses|gafas/],
  ['echarpe', /echarpe|scarf|bufanda|sciarpa|cheche/],
  ['bonnet', /bonnet|beanie/],
  ['sac', /\bsac\b|\bbag\b|cartable|besace|tote/],
  ['parapluie', /parapluie|umbrella/],
];

/** Couleurs (ids SPREZZA). */
const COLOR_RULES = [
  ['navy', /bleu marine|\bmarine\b|\bnavy\b|azul marino|blu navy|bleu nuit|midnight/],
  ['sky', /bleu ciel|bleu clair|ciel\b|sky blue|light blue|celeste|azzurro/],
  ['mid-blue', /bleu moyen|bleu indigo|indigo|\bbleu\b|\bblue\b|\bazul\b|\bblu\b/],
  ['ecru', /ecru|creme|cream|off-?white|ivoire|ivory|blanc casse|crudo|naturel|\bnatural\b|sable clair/],
  ['white', /\bblanc\b|\bwhite\b|\bblanco\b|\bbianco\b/],
  ['black', /\bnoir\b|\bblack\b|\bnegro\b|\bnero\b/],
  ['charcoal', /anthracite|charcoal|gris fonce|dark gr[ae]y|carbon/],
  ['light-gray', /gris clair|light gr[ae]y|gris chine clair|perle/],
  ['mid-gray', /\bgris\b|\bgr[ae]y\b|chine/],
  ['camel', /camel|cognac clair|caramel/],
  ['cognac', /cognac|tan\b|fauve/],
  ['beige', /beige|sable|\bsand\b|stone|kaki clair|mastic|greige|tostado/],
  ['taupe', /taupe/],
  ['olive', /olive|kaki|khaki|vert militaire|vert armee/],
  ['burgundy', /bordeaux|burgundy|grenat|lie de vin|granate|bordo/],
  ['suede-brown', /daim marron(?! (tres )?fonce)/],
  ['dark-brown', /marron (tres )?fonce|dark brown|espresso|cafe\b/],
  ['chocolate', /chocolat|chocolate|\bmarron\b|\bbrun\b|\bbrown\b|marron|\bmarron\b|tabac|moka/],
];

/** Matières (libellés de la liste MATERIALS). */
const MATERIAL_RULES = [
  ['Cachemire', /cachemire|cashmere/], ['Mérinos', /merinos|merino/], ['Coton Oxford', /oxford/], ['Popeline', /popeline|poplin/], ['Seersucker', /seersucker/],
  ['Lin', /\blin\b|linen|\blino\b/], ['Flanelle', /flanelle|flannel/], ['Tweed', /tweed/], ['Velours côtelé', /velours cotele|corduroy|cotele/], ['Gabardine', /gabardine/],
  ['Daim', /\bdaim\b|suede|ante\b|nubuck/], ['Cuir', /\bcuir\b|leather|\bpiel\b|pelle/], ['Soie', /\bsoie\b|\bsilk\b|\bseda\b/], ['Denim', /denim|\bjean/],
  ['Laine peignée', /laine peignee|worsted/], ['Laine', /\blaine\b|\bwool\b|\blana\b/], ['Polaire', /polaire|fleece/], ['Jersey', /jersey/],
  ['Toile', /\btoile\b|canvas/], ['Technique/membrane', /gore-?tex|membrane|deperlant|water-?repellent/], ['Polyester', /polyester/], ['Coton', /coton|cotton|algodon|cotone/],
];
const PATTERN_RULES = [
  ['Rayé', /raye|rayure|stripe|marinière|mariniere|raya/], ['Carreaux', /carreaux|check|tartan|plaid|vichy|gingham|cuadros/], ['Pied-de-poule', /pied-de-poule|houndstooth/],
  ['Chevrons', /chevron|herringbone|espiga/], ['Fair Isle', /fair isle|jacquard/], ['Torsadé', /torsade|cable knit|trenzado/], ['Imprimé', /imprime|print|estampado|motif floral|fleuri/],
];
const FIT_RULES = [['oversize', /oversize|boxy/], ['relaxed', /relaxed|ample|loose|wide|large\b|baggy/], ['tapered', /tapered|fusele/], ['slim', /slim|ajuste|skinny|super slim|fitted/], ['regular', /regular|coupe droite|straight|classic fit|standard fit/]];

/** Extrait le texte utile d'un lien : domaine → marque, chemin → mots. */
export function urlWords(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const brandKey = Object.keys(BRAND_DOMAINS).find((d) => host === d || host.endsWith(`.${d}`) || host === d.replace(/^www\d?\./, ''));
    const words = decodeURIComponent(u.pathname).replace(/\.(html?|aspx?|php)$/i, '').split(/[/_\-+.]+/).filter((w) => w && !/^\d+$/.test(w) && !/^[a-z]?\d{4,}[a-z0-9]*$/i.test(w) && !/^(fr|en|es|it|de|p|c|product|products|produit|produits|item|shop|homme|femme|men|women|man|woman|hombre|mujer|pdp|prd)$/i.test(w));
    return { host, brand: brandKey ? BRAND_DOMAINS[brandKey] : '', text: words.join(' ') };
  } catch { return { host: '', brand: '', text: '' }; }
}

const firstMatch = (rules, t) => rules.find(([, re]) => re.test(t))?.[0] ?? null;

/**
 * @param {string} input titre, description copiée et/ou lien produit
 * @returns {{name?:string, brand?:string, category?:string, sub?:string, color?:string, color2?:string, material?:string, composition?:string, pattern?:string, fit?:string, price?:number, sourceUrl?:string, found:string[]}}
 */
export function parseProduct(input) {
  const raw = String(input || '').trim();
  const urlMatch = raw.match(/https?:\/\/[^\s"'<>]+/);
  const url = urlMatch ? urlMatch[0].replace(/[).,;]+$/, '') : '';
  const fromUrl = url ? urlWords(url) : { brand: '', text: '' };
  const text = raw.replace(/https?:\/\/[^\s"'<>]+/g, ' ');
  const t = norm(`${text} ${fromUrl.text}`);
  const out = { found: [] };
  if (url) out.sourceUrl = url;

  // Marque : domaine, sinon nom connu dans le texte.
  const b = fromUrl.brand || KNOWN_BRANDS.find((k) => new RegExp(`(^|[^a-z])${norm(k).replace(/[.&'+]/g, (c) => `\\${c}`)}([^a-z]|$)`).test(t)) || '';
  if (b) out.brand = b === 'Boss' ? 'Hugo Boss' : b === 'Levis' ? 'Levi\'s' : b;

  const sub = firstMatch(SUB_RULES, t);
  if (sub && SUB_INFO[sub]) { out.sub = sub; out.category = SUB_INFO[sub].category; }

  // Couleur : la première citée dans le texte (souvent après le nom du produit), hors mots de matière ambigus.
  const colorScope = t.replace(/jean|denim/g, ' ');
  const hits = COLOR_RULES.map(([id, re]) => { const m = re.exec(colorScope); return m ? { id, at: m.index } : null; }).filter(Boolean).sort((a, c) => a.at - c.at);
  // Nom générique suivi d'une précision (« gris anthracite », « bleu nuit ») : la précision l'emporte.
  const GENERIC = ['mid-blue', 'mid-gray', 'chocolate'];
  if (hits.length > 1 && GENERIC.includes(hits[0].id)) { const sp = hits.find((h) => !GENERIC.includes(h.id) && h.at - hits[0].at <= 12); if (sp) hits.unshift(...hits.splice(hits.indexOf(sp), 1)); }
  if (hits.length) { out.color = hits[0].id; const second = hits.find((h) => h.id !== hits[0].id && Math.abs(h.at - hits[0].at) > 3); if (second && /et|and|&|\/|bicolore|two-tone/.test(colorScope.slice(hits[0].at, second.at + 1))) out.color2 = second.id; }
  else if (out.sub === 'jean') out.color = 'mid-blue';

  // Composition lue telle quelle (ex. « 100 % coton », « 80% laine 20% polyamide »).
  const comp = text.match(/(\d{1,3}\s?%\s?[A-Za-zÀ-ÿ]+(?:[\s,/-]+\d{1,3}\s?%\s?[A-Za-zÀ-ÿ]+)*)/);
  if (comp) out.composition = comp[1].replace(/\s+/g, ' ').replace(/(\d)\s?%\s?/g, '$1 % ').trim();
  const matScope = norm(`${comp ? comp[1] : ''} ${text} ${fromUrl.text}`);
  const mat = firstMatch(MATERIAL_RULES, matScope.replace(/chemise oxford|oxford shirt/, 'oxford'));
  if (mat) out.material = mat;
  if (out.sub === 'jean' && !out.material) out.material = 'Denim';
  if (out.sub === 'chemise-lin') out.material = 'Lin';

  out.pattern = firstMatch(PATTERN_RULES, t) || undefined;
  out.fit = firstMatch(FIT_RULES, t) || undefined;

  // Prix : « 29,95 € », « €49.90 », « EUR 59 ». Le plus bas cité (prix soldé) n'est pas forcément le bon : on prend le premier.
  const pm = text.match(/(\d{1,4}(?:[.,]\d{2})?)\s?(?:€|eur\b)|(?:€|eur)\s?(\d{1,4}(?:[.,]\d{2})?)/i);
  if (pm) { const n = Number((pm[1] || pm[2]).replace(',', '.')); if (n > 0 && n < 10000) out.price = n; }

  // Nom : première ligne lisible, sans le nom du site, raccourcie.
  const line = text.split(/\n/).map((l) => l.trim()).find((l) => l.length > 3 && !/^\d/.test(l) && !/%/.test(l)) || fromUrl.text;
  if (line) {
    let name = line.split(/\s[|–—]\s|\s-\s(?=[A-Z&][\w&.' ]{1,25}$)/)[0].replace(/\s{2,}/g, ' ').trim();
    if (out.brand) name = name.replace(new RegExp(`\\s*(\\||-|–|—)?\\s*${out.brand.replace(/[.&'+]/g, (c) => `\\${c}`)}\\s*$`, 'i'), '').trim();
    name = name.charAt(0).toUpperCase() + name.slice(1);
    if (name.length > 70) name = `${name.slice(0, 67).replace(/\s\S*$/, '')}…`;
    if (name.length >= 3) out.name = name;
  }
  out.found = ['name', 'brand', 'sub', 'color', 'color2', 'material', 'composition', 'pattern', 'fit', 'price', 'sourceUrl'].filter((k) => out[k] !== undefined && out[k] !== null && out[k] !== '');
  return out;
}

/** Requête courte pour retrouver la pièce par texte (moteurs et boutiques). */
export function identifyQuery({ brand, subName, colorName, material }) {
  const seen = new Set();
  return [brand, subName, colorName, material].join(' ').toLowerCase().split(/\s+/).filter((w) => w && !seen.has(w) && seen.add(w)).join(' ');
}
