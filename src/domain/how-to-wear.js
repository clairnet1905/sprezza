// Comment porter chaque pièce de la tenue : rentré ou non, bas de pantalon, col, manches, boutons, chaussettes, ceinture.
// Règles classiques de l'élégance masculine, adaptées à la tenue réelle (pièces, occasion, météo). Pures et testées.
import { SUB_INFO } from '../data/taxonomy.js';

const FORMAL_BOTTOMS = ['pantalon', 'pantalon-costume', 'flanelle'];
const TAILORED = ['blazer', 'veste-costume'];
const KNITS = ['pull', 'col-roule', 'cardigan', 'sweat', 'polaire'];

/**
 * @returns {Array<{role, name, tip, short}>} tip = conseil complet ; short = version courte (pour la consigne ChatGPT)
 */
export function howToWear(p, { occasion = null, env = {} } = {}) {
  const out = [];
  const add = (role, g, short, tip) => g && out.push({ role, name: g.name, short, tip: tip ? `${short} ; ${tip}` : short });
  const top = p.top; const bottom = p.bottom; const layer = p.layer; const shoes = p.shoes; const belt = p.belt;
  const tie = (p.accessories || []).find((a) => a.sub === 'cravate');
  const formal = (occasion?.formality?.[0] ?? 2) >= 4 || TAILORED.includes(layer?.sub) || FORMAL_BOTTOMS.includes(bottom?.sub);
  const warm = !env.cold && !env.mild;
  const hot = !!env.hot;

  // ---- Haut
  if (top) {
    const s = top.sub;
    if (s === 'chemise' || s === 'chemise-lin') {
      const col = tie ? 'boutonnée jusqu\'au col, sous la cravate' : s === 'chemise-lin' ? 'col ouvert, 2 boutons défaits' : 'col ouvert, 1 bouton défait (jamais 3)';
      const sleeves = TAILORED.includes(layer?.sub) ? 'les poignets dépassent d\'environ 1 cm des manches de la veste' : layer || p.outer ? 'manches déroulées sous la veste' : warm ? 'manches retroussées en 2 ou 3 tours, juste sous le coude' : 'manches boutonnées aux poignets';
      if (formal || belt) add('top', top, 'Rentrée dans le pantalon', `${col} ; ${sleeves}.`);
      else if (s === 'chemise-lin') add('top', top, 'Portée dehors si l\'ourlet est droit et s\'arrête à mi-braguette, sinon rentrée', `${col} ; ${sleeves}.`);
      else add('top', top, 'Rentrée dans le pantalon (dehors seulement si elle est courte, ourlet droit à mi-braguette)', `${col} ; ${sleeves}.`);
    } else if (s === 'polo') {
      add('top', top, belt || FORMAL_BOTTOMS.includes(bottom?.sub) ? 'Rentré dans le pantalon, ceinture visible : l\'allure italienne' : 'Rentré, ou dehors s\'il s\'arrête juste à la ceinture',
        `dernier bouton ouvert${layer ? ' ; col à l\'intérieur de la veste, jamais posé sur les revers' : ''}.`);
    } else if (s === 'polo-sport') {
      add('top', top, FORMAL_BOTTOMS.includes(bottom?.sub) ? 'Rentré avec un pantalon habillé' : 'Porté dehors : l\'ourlet fendu est fait pour ça', 'col jamais relevé ; dernier bouton ouvert.');
    } else if (s === 'tee-shirt' || s === 'tee-shirt-travail') {
      add('top', top, FORMAL_BOTTOMS.includes(bottom?.sub) ? 'Rentré devant seulement (« french tuck »), ceinture visible' : 'Porté dehors, longueur à mi-braguette', `col net, sans déformation${layer ? ' ; sous une veste, un col rond plutôt qu\'un col en V profond' : ''}.`);
    } else if (KNITS.includes(s)) {
      add('top', top, 'Porté par-dessus le pantalon, jamais rentré', s === 'col-roule' ? 'col replié une fois ; l\'ourlet tombe sur la ceinture sans la cacher entièrement.' : s === 'cardigan' ? 'boutonné sauf le dernier bouton, ou ouvert comme une veste.' : 'l\'ourlet tombe sur la ceinture ; manches tirées aux poignets, pas remontées.');
    }
  }

  // ---- Veste
  if (layer) {
    const s = layer.sub;
    if (TAILORED.includes(s)) add('layer', layer, formal ? 'Bouton du haut fermé debout, jamais celui du bas' : 'Portée ouverte, ou bouton du haut fermé pour plus d\'allure', 'ouvrez-la en vous asseyant ; poches sans rien dedans pour garder la ligne.');
    else if (s === 'cardigan-epais') add('layer', layer, 'Porté ouvert sur le haut', 'manches déroulées.');
    else if (s === 'veste-technique' || s === 'veste-travail') add('layer', layer, 'Fermée dehors, ouverte à l\'intérieur', 'manches à la bonne longueur, sans revers.');
    else add('layer', layer, 'Portée ouverte sur le haut', 'col bien posé ; manches déroulées.');
  }

  // ---- Manteau
  if (p.outer) {
    const s = p.outer.sub;
    if (s === 'trench') add('outer', p.outer, 'Ceinture nouée (pas bouclée), ou porté ouvert', 'il doit couvrir entièrement la veste.');
    else if (s === 'parka' || s === 'doudoune') add('outer', p.outer, env.cold ? 'Fermé dehors' : 'Ouvert par temps doux', 'capuche rangée en ville.');
    else add('outer', p.outer, env.veryCold ? 'Fermé dehors, ouvert à l\'intérieur' : 'Porté ouvert sur la tenue, fermé seulement au froid', 'il doit couvrir entièrement la veste ; col posé à plat.');
  }

  // ---- Bas (pied de pantalon)
  if (bottom) {
    const s = bottom.sub;
    const loafer = shoes?.sub === 'mocassins' || shoes?.sub === 'espadrilles' || shoes?.sub === 'bateau';
    if (s === 'jean') add('bottom', bottom, shoes?.sub === 'bottines' || shoes?.sub === 'chelsea' ? 'Bas sans cassure, juste posé sur la bottine' : loafer && warm ? 'Revers fin (2–3 cm), cheville juste visible' : 'Revers de 3–4 cm ou ourlet net, sans accordéon sur la chaussure', 'jamais trop long : le tissu ne doit pas s\'empiler.');
    else if (s === 'chino') add('bottom', bottom, loafer && warm ? 'Bas roulé 2 fois au-dessus de la cheville, chaussettes invisibles' : 'Sans cassure : le bas touche juste la chaussure', 'repassé, sans pli marqué au milieu.');
    else if (s === 'pantalon' || s === 'flanelle') add('bottom', bottom, 'Légère cassure sur le dessus de la chaussure', `pli central marqué au fer${s === 'flanelle' ? ' ; un revers de 4 cm lui va très bien' : ''}.`);
    else if (s === 'pantalon-costume') add('bottom', bottom, 'Légère cassure ou aucune, ourlet droit', 'pli central marqué ; même tissu que la veste.');
    else if (s === 'bermuda' || s === 'short') add('bottom', bottom, 'Juste au-dessus du genou, un seul roulé maximum', '');
    else if (s === 'jupe') add('bottom', bottom, 'Taille bien placée, haut rentré ou court', '');
    else add('bottom', bottom, 'Bas resserré à la cheville ou juste posé sur la chaussure, sans accordéon', '');
  }

  // ---- Chaussures et chaussettes
  if (shoes) {
    const s = shoes.sub;
    const sockCol = bottom?.color?.name ? `de la couleur du pantalon (${bottom.color.name.toLowerCase()})` : 'de la couleur du pantalon';
    if (s === 'mocassins' || s === 'bateau' || s === 'espadrilles') add('shoes', shoes, hot || (warm && !formal) ? 'Chaussettes invisibles' : `Chaussettes fines ${sockCol}`, 'cuir nourri et propre.');
    else if (s === 'baskets') add('shoes', shoes, 'Chaussettes basses invisibles, ou fines et assorties au pantalon', 'semelles propres, lacets bien serrés et à plat.');
    else if (['derbies', 'richelieus', 'chelsea', 'bottines'].includes(s)) add('shoes', shoes, `Chaussettes fines mi-mollet ${sockCol}`, 'cuir ciré ; jamais de chaussettes blanches avec ces chaussures.');
    else add('shoes', shoes, 'Chaussettes propres et adaptées', '');
  }

  // ---- Ceinture
  if (belt) {
    const brownShoe = /chocolate|cognac|suede-brown|dark-brown|camel|taupe/.test(shoes?.color?.id || '');
    const brownBelt = /chocolate|cognac|suede-brown|dark-brown|camel|taupe/.test(belt.color?.id || '');
    const casualShoe = ['baskets', 'espadrilles', 'bateau', 'sandales'].includes(shoes?.sub);
    const match = !shoes || brownShoe === brownBelt;
    if (casualShoe) add('belt', belt, 'Avec des baskets, la ceinture n\'a pas besoin d\'être assortie', 'cuir marron ou toile, boucle discrète.');
    else add('belt', belt, match ? 'Assortie aux chaussures (même couleur de cuir)' : 'Attention : choisissez une ceinture de la couleur des chaussures', 'boucle discrète, centrée.');
  } else if (bottom && ['chino', 'pantalon', 'flanelle', 'jean'].includes(bottom.sub) && top && ['chemise', 'polo'].includes(top.sub) && (formal || belt)) {
    out.push({ role: 'belt', name: 'Ceinture', short: 'Ajoutez une ceinture de la couleur des chaussures', tip: 'Ajoutez une ceinture de la couleur des chaussures : le haut est rentré.' });
  }
  if (tie) add('accessory', tie, 'Nœud serré, la pointe touche la boucle de ceinture', 'jamais plus large que les revers de la veste.');
  return out;
}

/** Les rôles affichés en français. */
export const WEAR_ROLE = { top: 'Haut', bottom: 'Pantalon', layer: 'Veste', outer: 'Manteau', shoes: 'Chaussures', belt: 'Ceinture', accessory: 'Cravate' };
export const wearRole = (r, g) => (r === 'bottom' && ['bermuda', 'short', 'jupe'].includes(g?.sub) ? SUB_INFO[g.sub].name : WEAR_ROLE[r]);
