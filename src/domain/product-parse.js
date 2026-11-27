// Lecture d'une fiche produit trouvée sur internet (titre, description copiée ou lien) → caractéristiques SPREZZA.
// Fonction pure et testée : rien n'est appliqué sans validation, chaque champ proposé reste à confirmer.
import { SUB_INFO, CATEGORIES, MATERIALS, PATTERNS, FITS, STYLE_OPTS } from '../data/taxonomy.js';
import { GARMENT_COLORS as ALL_COLORS } from '../data/colors.js';
import { nearestColor } from './colors.js';

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
  ['forest', /vert foret|forest green|vert anglais|british racing/],
  ['bottle-green', /vert bouteille|bottle green|vert sapin|vert fonce|dark green|hunter green/],
  ['sage', /vert sauge|\bsauge\b|\bsage\b|vert de gris|vert amande|mint|menthe/],
  ['royal-blue', /bleu roi|bleu electrique|royal blue|cobalt|bleu vif/],
  ['petrol', /bleu petrole|petrol|\bteal\b|bleu canard|bleu paon/],
  ['turquoise', /turquoise|\baqua\b|lagon/],
  ['indigo', /indigo|denim brut|raw denim|bleu brut|selvedge/],
  ['pale-pink', /rose pale|rose poudre|vieux rose|blush|light pink|pale pink|dusty pink/],
  ['lavender', /lavande|lavender|lilas|lilac|\bmauve\b|parme/],
  ['purple', /violet|purple|\bprune\b|aubergine|\bplum\b|morado|viola\b/],
  ['rust', /rouille|\brust\b|cuivre|copper/],
  ['terracotta', /terracotta|terre cuite|brique|\bbrick\b/],
  ['mustard', /moutarde|mustard|\bocre\b|ochre|curry/],
  ['silver', /\bargente?\b|\bsilver\b|acier|\bsteel\b|chrome/],
  ['gold', /\bdoree?\b|golden|\bgold\b|laiton|brass/],
  ['sand', /\bsable\b|\bsand\b|\bstone\b|mastic/],
  ['khaki', /\bkaki\b|\bkhaki\b/],
  ['navy', /bleu marine|\bmarine\b|\bnavy\b|azul marino|blu navy|bleu nuit|midnight/],
  ['sky', /bleu ciel|bleu clair|ciel\b|sky blue|light blue|celeste|azzurro/],
  ['mid-blue', /bleu moyen|\bbleu\b|\bblue\b|\bazul\b|\bblu\b/],
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
  ['olive', /olive|vert militaire|vert armee/],
  ['burgundy', /bordeaux|burgundy|grenat|lie de vin|granate|bordo/],
  ['suede-brown', /daim marron(?! (tres )?fonce)/],
  ['dark-brown', /marron (tres )?fonce|dark brown|espresso|cafe\b/],
  ['chocolate', /chocolat|chocolate|\bmarron\b|\bbrun\b|\bbrown\b|marron|\bmarron\b|tabac|moka/],
  ['green', /\bvert\b|\bverte\b|\bgreen\b|\bverde\b/],
  ['red', /\brouge\b|\bred\b|\brojo\b|\brosso\b|ecarlate|carmin|cerise/],
  ['orange', /\borange\b|naranja|arancione|corail|coral/],
  ['yellow', /\bjaune\b|\byellow\b|amarillo|giallo|citron/],
  ['pink', /\brose\b|\bpink\b|fuchsia|framboise|\brosa\b/],
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
    const words = decodeURIComponent(u.pathname).replace(/\.(html?|aspx?|php)$/i, '').split(/[/_\-+.]+/).filter((w) => w && !/^\d+$/.test(w) && !/^[a-z]?\d{4,}[a-z0-9]*$/i.test(w) && !/^(fr|en|es|it|de|p|c|product|products|produit|produits|item|shop|homme|femme|men|women|man|woman|hombre|mujer|pdp|prd|productpage|product-page|article|detail|details|html|www2|fr_fr|en_gb)$/i.test(w));
    return { host, brand: brandKey ? BRAND_DOMAINS[brandKey] : '', text: words.join(' ') };
  } catch { return { host: '', brand: '', text: '' }; }
}

const firstMatch = (rules, t) => rules.find(([, re]) => re.test(t))?.[0] ?? null;

/**
 * @param {string} input titre, description copiée et/ou lien produit
 * @returns {{name?:string, brand?:string, category?:string, sub?:string, color?:string, color2?:string, material?:string, composition?:string, pattern?:string, fit?:string, price?:number, size?:string, ref?:string, origin?:string, sourceUrl?:string, found:string[]}}
 */
export function parseProduct(input, opts = {}) {
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
  const GENERIC = ['mid-blue', 'mid-gray', 'chocolate', 'green', 'red', 'pink', 'yellow', 'orange'];
  if (hits.length > 1 && GENERIC.includes(hits[0].id)) { const sp = hits.find((h) => !GENERIC.includes(h.id) && h.at - hits[0].at <= 12); if (sp) hits.unshift(...hits.splice(hits.indexOf(sp), 1)); }
  if (hits.length) { out.color = hits[0].id; const second = hits.find((h) => h.id !== hits[0].id && Math.abs(h.at - hits[0].at) > 3); if (second && /et|and|&|\/|bicolore|two-tone/.test(colorScope.slice(hits[0].at, second.at + 1))) out.color2 = second.id; }
  else if (out.sub === 'jean') out.color = 'mid-blue';

  // Composition (ex. « 100 % coton », « 80% laine 20% polyamide », étiquette multilingue ou abréviations CO/WO/PL).
  const comp = parseComposition(text);
  if (comp) out.composition = comp.text;
  const matScope = norm(`${comp ? comp.text : ''} ${text} ${fromUrl.text}`);
  const mat = firstMatch(MATERIAL_RULES, matScope.replace(/chemise oxford|oxford shirt/, 'oxford'));
  if (mat) out.material = mat;
  if (out.sub === 'jean' && !out.material) out.material = 'Denim';
  if (out.sub === 'chemise-lin') out.material = 'Lin';

  out.pattern = firstMatch(PATTERN_RULES, t) || undefined;
  out.fit = firstMatch(FIT_RULES, t) || undefined;

  // Prix : « 29,95 € », « €49.90 », « EUR 59 ». Le plus bas cité (prix soldé) n'est pas forcément le bon : on prend le premier.
  const pm = text.match(/(\d{1,4}(?:[.,]\d{2})?)\s?(?:€|eur\b)|€\s?(\d{1,4}(?:[.,]\d{2})?)/i); // « EUR 48 » sur une étiquette = taille, pas prix
  if (pm) { const n = Number((pm[1] || pm[2]).replace(',', '.')); if (n > 0 && n < 10000) out.price = n; }

  // Nom : première ligne lisible, sans le nom du site, raccourcie.
  // Nom tiré du lien seulement s'il décrit vraiment une pièce (sinon « productpage », numéros…).
  const line = text.split(/\n/).map((l) => l.trim()).find((l) => l.length > 3 && !/^\d/.test(l) && !/%/.test(l)) || (out.sub ? fromUrl.text : '');
  if (line) {
    let name = line.split(/\s[|–—]\s|\s-\s(?=[A-Z&][\w&.' ]{1,25}$)/)[0].replace(/\s{2,}/g, ' ').trim();
    if (out.brand) name = name.replace(new RegExp(`\\s*(\\||-|–|—)?\\s*${out.brand.replace(/[.&'+]/g, (c) => `\\${c}`)}\\s*$`, 'i'), '').trim();
    name = name.charAt(0).toUpperCase() + name.slice(1);
    if (name.length > 70) name = `${name.slice(0, 67).replace(/\s\S*$/, '')}…`;
    if (name.length >= 3) out.name = name;
  }
  // Étiquette : taille, référence, origine.
  const size = text.match(/(?:taille|size|talla|taglia|gr(?:ö|o)(?:ß|ss)e|tg)\s*[:.]?\s*(XXS|XS|S|M|L|XL|XXL|XXXL|\d{2}(?:[/-]\d{2})?)\b/i) || text.match(/\b(?:EUR?|FR|IT)\s?[:.]?\s?(\d{2}|XXS|XS|S|M|L|XL|XXL|XXXL)\b/);
  if (size) out.size = size[1].toUpperCase();
  const ref = text.match(/\b(\d{4}\/\d{3}\/\d{3})\b/) || text.match(/(?:r[ée]f(?:[ée]rence)?|art(?:icle)?\.?\s*(?:no|n°|nr|num)?|style|mod[èe]le|item)\s*[.:#°]*\s*([A-Z0-9][A-Z0-9/.-]{4,19})/i);
  if (ref && /\d{3}/.test(ref[1])) out.ref = ref[1];
  const origin = text.match(/(?:fabriqu[ée] (?:en|au|aux)|made in|hecho en|fabricado en|fatto in|prodotto in)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ -]{2,20})/i);
  if (origin) out.origin = ORIGINS[norm(origin[1].trim().split(/\s{2,}|\n/)[0])] || origin[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
  if (opts.label) { delete out.name; }

  // Réponse structurée d'un assistant (ChatGPT, Claude…) : ses champs priment sur la lecture libre.
  const st = parseStructured(raw);
  if (st) {
    // Réponse d'assistant : on ne garde que ses champs (la lecture libre du texte risquerait de mal interpréter la remarque).
    for (const k of Object.keys(out)) if (!['found', 'sourceUrl'].includes(k)) delete out[k];
    if (fromUrl.brand) out.brand = fromUrl.brand;
    out.fromAssistant = true;
    for (const k of ['name', 'brand', 'sub', 'category', 'color', 'colorHex', 'colorNearest', 'colorUnknown', 'color2', 'material', 'composition', 'pattern', 'fit', 'seasons', 'formality', 'warmth', 'size', 'price', 'ref', 'origin', 'sourceUrl', 'confidence', 'remark', 'styles', 'notes', 'measures', 'subGuessed']) if (st[k] !== undefined) out[k] = st[k];
    if (st.noBrand && !fromUrl.brand) delete out.brand;
    if (st.noColor2) delete out.color2;
    if (st.noComposition) delete out.composition;
  }

  out.found = ['name', 'brand', 'sub', 'color', 'color2', 'material', 'composition', 'pattern', 'fit', 'price', 'size', 'ref', 'origin', 'seasons', 'formality', 'warmth', 'sourceUrl'].filter((k) => out[k] !== undefined && out[k] !== null && out[k] !== '');
  return out;
}

/** Fibres : toutes langues d'étiquette et abréviations européennes → libellé français. */
const FIBERS = [
  ['coton', /^(coton|cotton|algodon|cotone|baumwolle|katoen|co)$/], ['laine', /^(laine|wool|lana|wolle|wo|wv|lainage)$/], ['laine vierge', /^(vierge|virgin)$/],
  ['cachemire', /^(cachemire|cashmere|cachemira|kaschmir|wk)$/], ['lin', /^(lin|linen|lino|leinen|li)$/], ['soie', /^(soie|silk|seda|seta|seide|se)$/],
  ['polyester', /^(polyester|poliester|poliestere|pes|pl|pe)$/], ['polyamide', /^(polyamide|poliamida|poliammide|nylon|pa)$/], ['élasthanne', /^(elasthanne|elastane|elastano|elasthan|spandex|ea|el)$/],
  ['viscose', /^(viscose|viscosa|vi|cv)$/], ['acrylique', /^(acrylique|acrylic|acrilico|pc)$/], ['lyocell', /^(lyocell|tencel|cly)$/], ['modal', /^(modal|cmd|md)$/],
  ['mohair', /^(mohair|wm)$/], ['alpaga', /^(alpaga|alpaca|wp)$/], ['mérinos', /^(merinos|merino)$/], ['cuir', /^(cuir|leather|piel|pelle|leder)$/], ['chanvre', /^(chanvre|hemp|canamo|ha)$/],
];
const fiberOf = (w) => FIBERS.find(([, re]) => re.test(norm(w)))?.[0] || null;
const ORIGINS = { italie: 'Italie', italy: 'Italie', italia: 'Italie', portugal: 'Portugal', france: 'France', espagne: 'Espagne', spain: 'Espagne', espana: 'Espagne', china: 'Chine', chine: 'Chine', turkey: 'Turquie', turquie: 'Turquie', turkiye: 'Turquie', bangladesh: 'Bangladesh', india: 'Inde', inde: 'Inde', vietnam: 'Vietnam', 'viet nam': 'Vietnam', morocco: 'Maroc', maroc: 'Maroc', tunisia: 'Tunisie', tunisie: 'Tunisie', romania: 'Roumanie', roumanie: 'Roumanie', cambodia: 'Cambodge', cambodge: 'Cambodge', pakistan: 'Pakistan', 'united kingdom': 'Royaume-Uni', uk: 'Royaume-Uni', england: 'Angleterre', japan: 'Japon', japon: 'Japon' };

/**
 * Composition depuis un texte libre ou une étiquette lue (multilingue, abréviations, répétitions par langue).
 * On garde le premier ensemble complet (≈ 100 %), c'est-à-dire le tissu principal.
 */
export function parseComposition(text) {
  const pairs = [...String(text || '').matchAll(/(\d{1,3})\s?%\s?([A-Za-zÀ-ÿ]+)(?:\s+(vierge|virgin|merinos|mérinos))?/gi)]
    .map((m) => ({ pct: +m[1], fiber: m[3] && /vierge|virgin/i.test(m[3]) && fiberOf(m[2]) === 'laine' ? 'laine vierge' : m[3] && /m[ée]rinos/i.test(m[3]) ? 'laine mérinos' : fiberOf(m[2]) }))
    .filter((p) => p.fiber && p.pct > 0 && p.pct <= 100);
  if (!pairs.length) return null;
  const set = []; let total = 0;
  for (const p of pairs) {
    if (set.some((x) => x.fiber === p.fiber)) { if (total >= 95) break; continue; }
    set.push(p); total += p.pct;
    if (total >= 100) break;
  }
  set.sort((a, b) => b.pct - a.pct);
  return { text: set.map((p) => `${p.pct} % ${p.fiber}`).join(', '), main: set[0].fiber, total };
}

/**
 * Texte utile d'une page produit lue (titre, description, contenu Markdown) : nom, couleur, prix, composition.
 * Fonction pure, testée sur des pages réelles (Uniqlo, Mango).
 */
export function readerToText({ title = '', description = '', content = '' }) {
  const h1 = content.match(/^#\s+(.+)$/m);
  const name = (h1 ? h1[1] : title.split(/\s+[|–—]\s+/)[0]).replace(/\s+pour (homme|femme|enfant)s?\b/i, '').replace(/\s{2,}/g, ' ').trim();
  const start = h1 ? content.indexOf(h1[0]) : 0;
  const zone = content.slice(start, start + 5000).replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  const color = zone.match(/(?:^|\n)\s*(?:\*\s*)?(?:coloris|couleur|colou?r|color)\s*:\s*(?:\d{1,3}\s+)?([^\n|:]{2,40})/i)?.[1].trim() || '';
  const price = zone.match(/(\d{1,4}[.,]\d{2})\s?€/)?.[1] || '';
  const ci = content.search(/composition|mati[èe]res?\b|d[ée]tails du tissu|fabric/i);
  const compZone = `${ci >= 0 ? content.slice(ci, ci + 900) : ''}\n${description}\n${zone}`;
  const comp = parseComposition(compZone);
  return { name, text: [name, color ? `Couleur : ${color}` : '', comp ? comp.text : '', price ? `${price} €` : '', description].filter(Boolean).join('\n') };
}

// ------------------------------------------------------------ Assistant IA par copier-coller
const ALL_SUBS = CATEGORIES.flatMap((c) => c.subs.map(([id, name]) => ({ id, name, category: c.id })));
const UNKNOWN = /^(inconnu|inconnue|non visible|aucun|aucune|n\/?a|-|—|\?|incertain|indetermine|non precise|pas visible|none|unknown)\b/;
const SEASONS_FR = { printemps: 'spring', ete: 'summer', automne: 'autumn', hiver: 'winter', spring: 'spring', summer: 'summer', autumn: 'autumn', fall: 'autumn', winter: 'winter' };

/** Consigne à donner à ChatGPT (ou tout assistant) avec la photo : réponse au format que SPREZZA sait relire. */
export function assistantPrompt() {
  const types = CATEGORIES.map((c) => `${c.name} : ${c.subs.map(([, n]) => n).join(', ')}`).join(' | ');
  const tpl = {
    nom: 'nom court et descriptif, ex. Blazer en laine anthracite',
    marque: 'seulement si lisible ou certaine, sinon inconnue',
    type: 'un seul choix exact parmi la liste des types',
    couleur: 'un seul choix exact parmi la liste des couleurs',
    couleur_hex: 'code hexadécimal approché de la couleur réelle, ex. #2F4A3A',
    couleur_secondaire: 'même liste, ou aucune',
    motif: `parmi : ${PATTERNS.join(', ')}`,
    matiere: `parmi : ${MATERIALS.join(', ')}`,
    composition: 'uniquement si une étiquette est lisible, ex. 80 % laine, 20 % polyamide, sinon inconnue',
    coupe: `parmi : ${FITS.map(([, n]) => n).join(', ')}, ou inconnue`,
    saisons: ['printemps, été, automne et/ou hiver — ou toutes'],
    formalite: '1 à 5 (1 détente, 3 smart casual, 5 costume-cravate)',
    chaleur: '1 à 5 (1 très léger, 5 très chaud)',
    confiance: 'faible, moyenne ou élevée',
    remarque: 'une phrase : ce qui reste incertain et quelle autre photo prendre (étiquette, détail du tissu, dos…)',
  };
  return [
    'Tu es un expert en vêtements et en style masculin classique. Identifie la pièce principale visible sur la ou les photos jointes (une seule pièce ; une photo d\'étiquette peut accompagner la photo du vêtement).',
    'Réponds UNIQUEMENT avec un bloc de code JSON valide, en français, sans aucun texte avant ou après, avec exactement ces clés (remplace chaque description par la valeur) :',
    '```json', JSON.stringify(tpl, null, 2), '```',
    `Types possibles : ${types}`,
    `Couleurs possibles : ${ALL_COLORS.map((c) => c.name).join(', ')} (si aucune ne convient, choisis la plus proche et donne le code hexadécimal exact)`,
    'N\'invente jamais la marque, la composition ni la taille : écris « inconnue » si ce n\'est pas visible.',
  ].join('\n');
}

/** Relit la réponse « Clé : valeur » d'un assistant. Renvoie null si le texte n'a pas ce format. */
/** Clés JSON acceptées (français ou anglais, avec ou sans accents/majuscules) → clés internes. */
const JSON_KEYS = {
  nom: 'nom', name: 'nom', titre: 'nom', title: 'nom', marque: 'marque', brand: 'marque',
  type: 'type', sous_type: 'type', soustype: 'type', piece: 'type', sub: 'type', garment: 'type', garment_type: 'type', item_type: 'type', subcategory: 'type', sub_category: 'type', sous_categorie: 'type', souscategorie: 'type', subtype: 'type', sub_type: 'type', product_type: 'type',
  categorie: 'categorie', category: 'categorie', famille: 'categorie', modele: 'modele', model: 'modele',
  couleur: 'couleur', color: 'couleur', colour: 'couleur', couleur_principale: 'couleur', main_color: 'couleur', primary_color: 'couleur', primary_colour: 'couleur',
  couleur_secondaire: 'couleur secondaire', color2: 'couleur secondaire', secondary_color: 'couleur secondaire',
  hex: 'hex', couleur_hex: 'hex', color_hex: 'hex', code_couleur: 'hex', hex_color: 'hex',
  motif: 'motif', pattern: 'motif', matiere: 'matiere', material: 'matiere', fabric: 'matiere', tissu: 'matiere', composition: 'composition',
  coupe: 'coupe', fit: 'coupe', saisons: 'saisons', saison: 'saisons', seasons: 'saisons', season: 'saisons', formalite: 'formalite', formality: 'formalite', formality_level: 'formalite', niveau_formalite: 'formalite',
  styles: 'styles', style: 'styles', mesures: 'mesures', measurements: 'mesures',
  chaleur: 'chaleur', warmth: 'chaleur', warmth_level: 'chaleur', taille: 'taille', size: 'taille', prix: 'prix', price: 'prix', current_price: 'prix', prix_actuel: 'prix', original_price: 'prix_origine', prix_origine: 'prix_origine', reference: 'reference', ref: 'reference', sku: 'reference', article_number: 'reference',
  fabrication: 'fabrication', origine: 'fabrication', origin: 'fabrication', made_in: 'fabrication', country_of_origin: 'fabrication', lien: 'lien', url: 'lien', link: 'lien', sourceurl: 'lien', source_url: 'lien', product_url: 'lien', lien_produit: 'lien',
  confiance: 'confiance', confidence: 'confiance', identification_confidence: 'confiance', remarque: 'remarque', remark: 'remarque', notes: 'notes', note: 'notes', commentaire: 'notes', description: 'notes',
};
/** Extrait un objet JSON d'un texte (bloc ```json, ou du premier « { » au dernier « } »). */
export function extractJSON(text) {
  const t = String(text || '');
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const cands = [fenced, t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)].filter((x) => x && x.trim().startsWith('{'));
  for (const c of cands) {
    try { const v = JSON.parse(c.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1')); const o = Array.isArray(v) ? v[0] : v; if (o && typeof o === 'object') return o; } catch { /* essai suivant */ }
  }
  return null;
}

export function parseStructured(text) {
  if (/remplace chaque description/i.test(String(text))) return null; // la consigne elle-même, collée par erreur
  const map = {};
  const json = extractJSON(text);
  if (json) {
    const flat = { ...json, ...(json.vetement || json.garment || json.piece || json.item || {}) };
    for (const [k, v] of Object.entries(flat)) {
      const key = JSON_KEYS[norm(k.replace(/([a-z])([A-Z])/g, '$1_$2')).replace(/[\s-]+/g, '_')]; // primaryColor → primary_color
      if (!key || v === null || v === undefined || v === '' || map[key] !== undefined && key !== 'type') continue;
      if (typeof v === 'object' && !Array.isArray(v)) {
        // { "cotton": 99, "elastane": 1 } → « 99 % cotton, 1 % elastane » ; mesures { "waist": 76 } → « waist 76 »
        map[key] = Object.entries(v).filter(([, x]) => x !== null && x !== '').map(([a, b]) => (key === 'composition' ? `${b} % ${a}` : `${a} ${b}`)).join(', ');
      } else map[key] = Array.isArray(v) ? v.filter((x) => x !== null && typeof x !== 'object').join(', ') : String(v);
    }
  }
  for (const line of json ? [] : String(text || '').split(/\n/)) {
    const m = line.replace(/[*_`#>]/g, '').replace(/^\s*[-•]\s*/, '').match(/^\s*([A-Za-zÀ-ÿ ]{3,22}?)\s*:\s*(.+?)\s*$/);
    if (m) map[norm(m[1]).trim()] = m[2].replace(/^[«"“]\s*|\s*[»"”]$/g, '').trim();
  }
  const KEYS = ['nom', 'marque', 'type', 'categorie', 'couleur', 'matiere', 'composition', 'coupe', 'motif', 'saisons', 'formalite'];
  if (KEYS.filter((k) => map[k] !== undefined).length < (json ? 2 : 3)) return null;
  const out = {};
  const known = (v) => v !== undefined && !UNKNOWN.test(norm(v));
  if (known(map.nom)) out.name = map.nom.slice(0, 70);
  if (map.marque !== undefined) { if (known(map.marque)) out.brand = map.marque.replace(/\s*\(.*\)\s*$/, '').trim(); else out.noBrand = true; }
  // Catégorie (« Bas », « Haut »…) : indice, jamais confondue avec un type. Type : nom exact > nom contenu (mot entier) > règles.
  const catRaw = known(map.categorie) ? map.categorie : known(map.type) && CATEGORIES.some((c) => norm(c.name) === norm(map.type)) ? map.type : null;
  const catHint = catRaw ? CATEGORIES.find((c) => norm(c.name) === norm(catRaw) || c.id === norm(catRaw) || ({ bottoms: 'bas', pants: 'bas', trousers: 'bas', tops: 'haut', top: 'haut', shirts: 'haut', jackets: 'veste', jacket: 'veste', outerwear: 'manteau', coats: 'manteau', coat: 'manteau', shoes: 'chaussures', footwear: 'chaussures', belts: 'ceinture', belt: 'ceinture', accessories: 'accessoire', accessoires: 'accessoire' })[norm(catRaw)] === c.id)?.id : null;
  const findSub = (raw) => {
    const v = norm(raw).replace(/^.*[›>:]\s*/, '').trim();
    if (!v || CATEGORIES.some((c) => norm(c.name) === v)) return null; // « Bas » seul n'est pas un type
    const pool = catHint ? ALL_SUBS.filter((x) => x.category === catHint) : ALL_SUBS;
    const word = (name) => new RegExp(`(^|[^a-z])${norm(name).replace(/[/().-]/g, '.')}s?([^a-z]|$)`).test(v);
    return pool.find((x) => norm(x.name) === v) || [...pool].sort((a, b) => b.name.length - a.name.length).find((x) => word(x.name))
      || (() => { const id = firstMatch(SUB_RULES, v); const x = id && ALL_SUBS.find((y) => y.id === id); return x && (!catHint || x.category === catHint) ? x : null; })();
  };
  const sub = (known(map.type) && findSub(map.type)) || (known(map.modele) && findSub(map.modele)) || (known(map.nom) && findSub(map.nom)) || (known(map.categorie) && findSub(map.categorie));
  if (sub) { out.sub = sub.id; out.category = sub.category; }
  else if (catHint) { out.category = catHint; out.sub = CATEGORIES.find((c) => c.id === catHint).subs[0][0]; out.subGuessed = true; }
  const color = (v) => { const n = norm(v); return ALL_COLORS.find((c) => norm(c.name) === n)?.id || COLOR_RULES.find(([, re]) => re.test(n))?.[0] || null; };
  const hex = String(map.hex || '').match(/#?[0-9a-f]{6}\b/i)?.[0];
  // Nom exact de la palette > code hexadécimal (couleur réelle) > nom approché (« bleu glacier » → bleu).
  if (known(map.couleur) || hex) {
    const exact = known(map.couleur) && ALL_COLORS.find((c) => norm(c.name) === norm(map.couleur))?.id;
    if (exact) out.color = exact;
    else if (hex) { out.colorHex = `#${hex.replace('#', '').toUpperCase()}`; out.colorNearest = nearestColor(out.colorHex, ALL_COLORS)?.id; if (known(map.couleur)) out.colorUnknown = map.couleur.slice(0, 40); }
    else { const c = color(map.couleur); if (c) out.color = c; else out.colorUnknown = map.couleur.slice(0, 40); }
  }
  if (map['couleur secondaire'] !== undefined) { const c = known(map['couleur secondaire']) ? color(map['couleur secondaire']) : null; if (c && c !== out.color) out.color2 = c; else out.noColor2 = true; }
  if (known(map.motif)) out.pattern = PATTERNS.find((x) => norm(x) === norm(map.motif)) || firstMatch(PATTERN_RULES, norm(map.motif)) || (/uni/.test(norm(map.motif)) ? 'Uni' : undefined);
  if (known(map.matiere)) out.material = MATERIALS.find((x) => norm(x) === norm(map.matiere)) || firstMatch(MATERIAL_RULES, norm(map.matiere)) || undefined;
  if (map.composition !== undefined) { const c = known(map.composition) ? parseComposition(map.composition) : null; if (c) out.composition = c.text; else out.noComposition = true; }
  if (known(map.coupe)) out.fit = FITS.find(([, n]) => norm(n) === norm(map.coupe))?.[0] || firstMatch(FIT_RULES, norm(map.coupe)) || undefined;
  if (known(map.saisons)) { const v = norm(map.saisons); const list = [...new Set(Object.entries(SEASONS_FR).filter(([k]) => v.includes(k)).map(([, id]) => id))]; out.seasons = /toutes|all|4 saisons|toute l'annee|year/.test(v) || list.length === 4 ? [] : list; }
  const w = Number(String(map.chaleur || '').match(/[1-5]/)?.[0]); if (w) out.warmth = w;
  if (known(map.taille)) out.size = map.taille.slice(0, 24);
  const pr = Number(String(map.prix || map.prix_origine || '').replace(',', '.').match(/\d+(?:\.\d+)?/)?.[0]); if (pr > 0 && pr < 10000) out.price = pr;
  if (known(map.reference)) out.ref = map.reference.slice(0, 30);
  if (known(map.fabrication)) out.origin = map.fabrication.slice(0, 30);
  if (map.lien && /^https?:\/\//.test(map.lien)) out.sourceUrl = map.lien;
  const f = Number(String(map.formalite || '').match(/[1-5]/)?.[0]); if (f) out.formality = f;
  if (map.confiance) { const n = Number(String(map.confiance).match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.')); const pct = n <= 1 ? n * 100 : n; out.confidence = Number.isFinite(pct) && /\d/.test(map.confiance) ? (pct >= 80 ? 'elevee' : pct >= 50 ? 'moyenne' : 'faible') : norm(map.confiance).match(/faible|moyenne|elevee|haute|high|medium|low/)?.[0]?.replace(/haute|high/, 'elevee').replace('medium', 'moyenne').replace('low', 'faible') || undefined; }
  if (known(map.styles)) { const v = norm(map.styles); const ALIAS = { italian: /italien|italian/, french: /french|francais/, british: /british|anglais/, quiet: /quiet/, scandi: /minimalis|scandinav/, mediterranean: /mediterran/, japanese: /japon|japan/, ivy: /ivy|preppy/, 'old-money': /old money/ }; out.styles = STYLE_OPTS.filter(([id, label]) => v.includes(norm(label)) || ALIAS[id]?.test(v)).map(([id]) => id); if (!out.styles.length) delete out.styles; }
  if (known(map.notes)) out.notes = map.notes.slice(0, 600);
  const free = `${map.notes || ''} ${map.remarque || ''} ${map.mesures || ''}`;
  if (!out.origin) { const o = free.match(/(?:fabriqu[ée] (?:en|au|aux)|made in)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ -]{2,20})/i); if (o) out.origin = ORIGINS[norm(o[1].trim().split(/\s+(?:et|and)\b|[.,;]/)[0])] || o[1].trim().split(/[.,;]/)[0]; }
  const meas = {};
  const mm = (re) => Number(free.match(re)?.[1]?.replace(',', '.')) || null;
  meas.waist = mm(/(?:tour de taille|waist)\D{0,12}(\d{2,3}(?:[.,]\d)?)\s*cm/i); meas.inseam = mm(/(?:entrejambe|inseam)\D{0,12}(\d{2,3}(?:[.,]\d)?)\s*cm/i);
  meas.chest = mm(/(?:poitrine|chest)\D{0,12}(\d{2,3}(?:[.,]\d)?)\s*cm/i); meas.shoulders = mm(/(?:[ée]paules|shoulders?)\D{0,12}(\d{2,3}(?:[.,]\d)?)\s*cm/i); meas.length = mm(/(?:longueur|length)\D{0,12}(\d{2,3}(?:[.,]\d)?)\s*cm/i);
  Object.keys(meas).forEach((k) => meas[k] === null && delete meas[k]);
  if (Object.keys(meas).length) out.measures = meas;
  if (known(map.remarque)) out.remark = map.remarque.slice(0, 240);
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
  return out;
}

// ------------------------------------------------------------ Photos et coloris d'une page produit
const IMG_RE = /(\[)?!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)(?:\]\((https?:\/\/[^)\s]+)\))?/g;
const SMALL = /chip|swatch|icon|logo|sprite|\.svg|flag|payment|badge|wid=(?:[1-9]\d?|1\d\d)\b|width=(?:[1-9]\d?|1\d\d)\b|w=(?:[1-9]\d?|1\d\d)\b|_\d{2}x\d{2}\b/i;
const cleanAlt = (a) => String(a || '').replace(/^Image \d+:\s*/i, '').trim();

/** Grandes photos produit d'une page lue (ordre d'apparition, sans doublons ni pictos). */
export function pageImages(content) {
  const out = []; const seen = new Set();
  for (const m of String(content || '').matchAll(IMG_RE)) {
    const url = m[3];
    if (SMALL.test(url) || !/\.(jpe?g|png|webp)(\?|$)|\/is\/image\/|imagesgoods|\/image\//i.test(url)) continue;
    const key = url.replace(/\?.*$/, '');
    if (seen.has(key)) continue; seen.add(key);
    out.push({ url, alt: cleanAlt(m[2]) });
    if (out.length >= 12) break;
  }
  return out;
}

/** Code couleur dans une URL d'image (Mango : 37074438-37-002 ; Uniqlo : goods_69_450259). */
const codeOf = (url) => url.match(/\d{8}-(\d{2})-\d{3}/)?.[1] || url.match(/goods_(\d{2,3})_\d+/)?.[1] || null;

/** Coloris proposés sur la page : nom, code, lien éventuel, coloris affiché. */
export function colorVariants(content) {
  const out = [];
  for (const m of String(content || '').matchAll(IMG_RE)) {
    const alt = cleanAlt(m[2]); const url = m[3];
    if (!(/chip|swatch|wid=40\b/i.test(url) || /^couleur\b|^colou?r\b/i.test(alt))) continue;
    const name = alt.replace(/^(couleur|colou?r)\s*:?\s*/i, '').replace(/\s*s[ée]lectionn[ée]e?\s*$/i, '').trim();
    if (!name || name.length > 40 || !/[a-zà-ÿ]{3}/i.test(name) || /default|image|photo|zoom/i.test(name)) continue; // codes seuls, vignettes génériques
    const code = codeOf(url);
    if (out.some((v) => v.name.toLowerCase() === name.toLowerCase())) continue;
    out.push({ name: name.charAt(0) + name.slice(1).toLowerCase(), code, href: m[4] || null, selected: /s[ée]lectionn/i.test(alt) });
  }
  return out;
}

/** Coloris affiché par le lien (paramètre ou chemin), sinon par les photos. */
export function currentColorCode(url, images = []) {
  const u = String(url || '');
  return u.match(/colorDisplayCode=(\d{2,3})/)?.[1] || u.match(/\/\d{8}\/(\d{2})(?:\/\d{2})?(?:[?#]|$)/)?.[1] || images.map((i) => codeOf(i.url)).find(Boolean) || null;
}

/** Photos du coloris choisi : on remplace le code couleur dans les URL d'images (sans relire la page). */
export function imagesForColor(images, from, to) {
  if (!from || !to || from === to) return images;
  const swap = (u) => u.replace(new RegExp(`(\\d{8}-)${from}(-\\d{3})`), `$1${to}$2`).replace(new RegExp(`goods_${from}_(\\d+)`), `goods_${to}_$1`);
  const withCode = images.filter((i) => codeOf(i.url) === from);
  return (withCode.length ? withCode : images).map((i) => ({ ...i, url: swap(i.url) }));
}

/** Requête courte pour retrouver la pièce par texte (moteurs et boutiques). */
export function identifyQuery({ brand, subName, colorName, material }) {
  const seen = new Set();
  return [brand, subName, colorName, material].join(' ').toLowerCase().split(/\s+/).filter((w) => w && !seen.has(w) && seen.add(w)).join(' ');
}
