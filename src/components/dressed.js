// Mannequin habillé : silhouette de vitrine dont chaque vêtement est découpé dans la photo de la pièce
// (ou rempli de sa couleur si la pièce n'a pas de photo). Aperçu indicatif, pas une photographie portée.
import { raw, escapeHTML } from '../lib/html.js';

const ok = (h) => (/^#[0-9a-fA-F]{6}$/.test(h || '') ? h : null);
const BODY = '#E4DDD1'; const BODY_LINE = '#C9BFAE';
const SHORT_SLEEVES = ['tee-shirt', 'polo', 'polo-sport', 'tee-shirt-travail', 'chemise-lin-courte'];
const SHORTS = ['bermuda', 'short'];

// Formes (viewBox 200 × 400)
const TOP_LONG = 'M88 64 L70 68 L56 76 L42 122 L33 204 L51 206 L58 132 L63 118 L64 200 L136 200 L137 118 L142 132 L149 206 L167 204 L158 122 L144 76 L130 68 L112 64 Q100 75 88 64 Z';
const TOP_SHORT = 'M88 64 L70 68 L56 76 L45 112 L61 119 L64 106 L64 200 L136 200 L136 106 L139 119 L155 112 L144 76 L130 68 L112 64 Q100 75 88 64 Z';
const JACKET_L = 'M89 62 L69 66 L54 74 L39 121 L30 207 L50 209 L57 133 L62 123 L62 224 L98 224 L98 162 L84 94 Z';
const JACKET_R = 'M111 62 L131 66 L146 74 L161 121 L170 207 L150 209 L143 133 L138 123 L138 224 L102 224 L102 162 L116 94 Z';
const COAT_L = 'M89 60 L67 64 L50 72 L35 121 L26 210 L48 212 L55 135 L59 125 L55 286 L98 286 L98 172 L82 92 Z';
const COAT_R = 'M111 60 L133 64 L150 72 L165 121 L174 210 L152 212 L145 135 L141 125 L145 286 L102 286 L102 172 L118 92 Z';
// Manteau ouvert (quand une veste est portée dessous) : les pans s'écartent et laissent voir la veste.
const COAT_OPEN_L = 'M89 60 L67 64 L50 72 L35 121 L26 210 L48 212 L55 135 L59 125 L55 286 L84 286 L80 150 L76 104 Z';
const COAT_OPEN_R = 'M111 60 L133 64 L150 72 L165 121 L174 210 L152 212 L145 135 L141 125 L145 286 L116 286 L120 150 L124 104 Z';
const PANTS = 'M64 196 L136 196 L135 226 L127 372 L106 372 L100 238 L94 372 L73 372 L65 226 Z';
const SHORTS_P = 'M64 196 L136 196 L139 282 L104 284 L100 242 L96 284 L61 282 Z';
const SHOE_L = 'M72 368 L96 368 L97 383 Q97 390 90 390 L60 390 Q55 390 57 384 Q60 376 72 372 Z';
const SHOE_R = 'M104 368 L128 368 L128 372 Q140 376 143 384 Q145 390 140 390 L110 390 Q103 390 103 383 Z';
const TIE = 'M98 80 L102 80 L104 90 L107 150 L100 160 L93 150 L96 90 Z';

/** Boîtes englobantes (pour cadrer la photo dans la forme). */
const BOX = { top: [30, 62, 140, 146], layer: [28, 60, 144, 166], outer: [24, 58, 152, 230], bottom: [60, 194, 80, 180], shorts: [60, 194, 80, 92], shoes: [54, 366, 92, 26] };

/**
 * @param {{top?, bottom?, layer?, outer?, shoes?, belt?, tie?}} p pièces : {sub, hex, photo, texture}
 * @param {{label?:string}} o
 */
export function dressedMannequinSVG(p, o = {}) {
  const uid = 'd' + Math.random().toString(36).slice(2, 8);
  const defs = [];
  const layers = [];
  const shade = `url(#${uid}-shade)`;
  /** Une pièce : couleur de fond, photo découpée dans la forme, ombrage et contour. */
  const piece = (key, paths, box, g, { zoom = 1.45, focusY = 0.5 } = {}) => {
    if (!g) return '';
    const fill = ok(g.hex) || '#CFC8BC';
    const d = paths.join(' ');
    const clip = `${uid}-${key}`;
    defs.push(`<clipPath id="${clip}"><path d="${d}"/></clipPath>`);
    const [x, y, w, h] = box;
    const W = w * zoom; const H = h * zoom;
    const ix = x - (W - w) / 2; const iy = y - (H - h) * focusY;
    const img = g.photo ? `<image data-photo="${escapeHTML(g.photo)}" x="${ix}" y="${iy}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})"/>` : '';
    return `<path d="${d}" fill="${fill}"/>${img}<path d="${d}" fill="${shade}"/><path d="${d}" fill="none" stroke="#00000040" stroke-width=".9" stroke-linejoin="round"/>`;
  };

  const short = SHORT_SLEEVES.includes(p.top?.sub);
  const shorts = SHORTS.includes(p.bottom?.sub);
  const jacket = p.layer; const coat = p.outer;

  // Mannequin (dessous)
  layers.push(`<ellipse cx="100" cy="34" rx="17" ry="21" fill="${BODY}" stroke="${BODY_LINE}"/>`);
  layers.push(`<path d="M91 50 L109 50 L110 68 L90 68 Z" fill="${BODY}" stroke="${BODY_LINE}"/>`);
  layers.push(`<path d="M54 86 L38 206 M146 86 L162 206" stroke="${BODY}" stroke-width="15" stroke-linecap="round"/>`);
  layers.push(`<circle cx="38" cy="214" r="7.5" fill="${BODY}" stroke="${BODY_LINE}"/><circle cx="162" cy="214" r="7.5" fill="${BODY}" stroke="${BODY_LINE}"/>`);
  layers.push(`<path d="M84 236 L84 372 M116 236 L116 372" stroke="${BODY}" stroke-width="19" stroke-linecap="round"/>`);
  layers.push(`<path d="M66 70 L134 70 L136 200 L64 200 Z" fill="${BODY}" stroke="${BODY_LINE}"/>`);

  // Bas, ceinture, chaussures
  layers.push(piece('bottom', [shorts ? SHORTS_P : PANTS], shorts ? BOX.shorts : BOX.bottom, p.bottom, { zoom: 1.8 }));
  if (p.bottom && !shorts) layers.push('<path d="M100 238 L100 206" stroke="#00000030" stroke-width=".8"/>');
  if (p.belt && ok(p.belt.hex)) layers.push(`<rect x="64" y="194" width="72" height="8" rx="1.5" fill="${p.belt.hex}" stroke="#00000045" stroke-width=".6"/><rect x="95" y="195" width="10" height="6" fill="none" stroke="#C9B37E" stroke-width="1.2"/>`);
  layers.push(piece('shoes', [SHOE_L, SHOE_R], BOX.shoes, p.shoes, { zoom: 1.3, focusY: 0.6 }));

  // Haut
  if (p.top) {
    layers.push(piece('top', [short ? TOP_SHORT : TOP_LONG], BOX.top, p.top, { zoom: 1.5, focusY: 0.45 }));
    const sub = p.top.sub; const c = ok(p.top.hex) || '#CFC8BC';
    if (sub === 'col-roule') layers.push(`<path d="M89 50 L111 50 L113 70 Q100 76 87 70 Z" fill="${c}" stroke="#00000040" stroke-width=".8"/><path d="M89 56 L111 56 M89 62 L111 62" stroke="#00000022"/>`);
    else if (['chemise', 'chemise-lin'].includes(sub)) layers.push(`<path d="M88 64 L100 80 L90 86 L85 70 Z M112 64 L100 80 L110 86 L115 70 Z" fill="${c}" stroke="#00000050" stroke-width=".8"/><path d="M100 80 L100 198" stroke="#00000035" stroke-width=".8"/>${[100, 125, 150, 175].map((y) => `<circle cx="100" cy="${y}" r="1.4" fill="#00000045"/>`).join('')}`);
    else if (['polo', 'polo-sport'].includes(sub)) layers.push(`<path d="M88 64 L100 76 L92 81 Z M112 64 L100 76 L108 81 Z" fill="${c}" stroke="#00000050" stroke-width=".8"/><path d="M100 76 L100 104" stroke="#00000040"/><circle cx="100" cy="86" r="1.3" fill="#00000045"/><circle cx="100" cy="97" r="1.3" fill="#00000045"/>`);
    else layers.push('<path d="M88 64 Q100 76 112 64" fill="none" stroke="#00000040" stroke-width="1.2"/>');
  }
  if (p.tie && ok(p.tie.hex) && !(p.top?.sub === 'col-roule')) layers.push(`<path d="${TIE}" fill="${p.tie.hex}" stroke="#00000050" stroke-width=".6"/>`);

  // Veste, puis manteau par-dessus
  if (jacket) {
    layers.push(piece('layer', [JACKET_L, JACKET_R], BOX.layer, jacket, { zoom: 1.4, focusY: 0.45 }));
    layers.push('<path d="M89 62 L80 98 L92 116 M111 62 L120 98 L108 116" fill="none" stroke="#00000055" stroke-width="1"/><circle cx="100" cy="176" r="1.8" fill="#00000060"/><path d="M68 170 L84 170 M118 170 L134 170" stroke="#00000030"/>');
  }
  if (coat) {
    if (jacket) {
      layers.push(piece('outer', [COAT_OPEN_L, COAT_OPEN_R], BOX.outer, coat, { zoom: 1.35, focusY: 0.4 }));
      layers.push('<path d="M89 60 L72 100 L78 120 M111 60 L128 100 L122 120" fill="none" stroke="#00000055" stroke-width="1"/>');
    } else {
      layers.push(piece('outer', [COAT_L, COAT_R], BOX.outer, coat, { zoom: 1.35, focusY: 0.4 }));
      layers.push('<path d="M89 60 L78 96 L90 118 M111 60 L122 96 L110 118" fill="none" stroke="#00000055" stroke-width="1"/><circle cx="96" cy="190" r="2" fill="#00000060"/><circle cx="96" cy="225" r="2" fill="#00000060"/>');
    }
  }

  const label = escapeHTML(o.label || 'Mannequin habillé avec les pièces de la tenue');
  return raw(`<svg class="dressed" viewBox="0 0 200 400" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${uid}-shade" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".22" stop-color="#000" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".06"/><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>${defs.join('')}</defs>
    <ellipse cx="100" cy="394" rx="62" ry="5" fill="#00000014"/>
    ${layers.join('\n')}
  </svg>`);
}
