// Mannequin habillé : silhouette humaine (visage, cheveux, mains) dont chaque vêtement est découpé
// dans la photo de la pièce du dressing (ou rempli de sa couleur sans photo). Aperçu illustré, pas une photo portée.
import { raw, escapeHTML } from '../lib/html.js';

const ok = (h) => (/^#[0-9a-fA-F]{6}$/.test(h || '') ? h : null);
const SHORT_SLEEVES = ['tee-shirt', 'polo', 'polo-sport', 'tee-shirt-travail'];
const SHORTS = ['bermuda', 'short'];
const W = 220; // largeur du dessin (axe de symétrie x = 110)

/** Symétrie gauche ↔ droite d'un chemin (commandes absolues M L C Q, coordonnées par paires). */
export function mirror(d) {
  let i = 0;
  return d.replace(/-?\d+(?:\.\d+)?/g, (n) => (i++ % 2 === 0 ? String(Math.round((W - Number(n)) * 10) / 10) : n));
}
const both = (d) => `${d} ${mirror(d)}`;

// --- Corps (demi-chemins côté gauche, symétrisés) ---------------------------------------------
const ARM = 'M66 96 C58 122 54 172 51 236 L67 237 C70 184 74 136 80 106 Z';
const HAND = 'M50 234 C45 246 46 259 53 264 C57 267 63 266 66 260 C68 254 67 246 67 236 Z';
const LEG = 'M86 236 L103 236 L102 436 L88 436 C86 380 84 300 86 236 Z';
const TORSO = 'M98 78 L110 80 L110 240 L78 240 C76 200 74 140 70 96 C78 90 90 84 98 78 Z';
// --- Vêtements ---------------------------------------------------------------------------------
const SHIRT_L = 'M99 79 C102 85 106 87 110 87 L110 242 L75 242 C76 200 77 160 76 132 L69 238 L48 236 C51 190 55 140 59 112 C61 99 66 92 73 89 Z';
const TEE_L = 'M99 79 C102 85 106 87 110 87 L110 242 L75 242 C76 200 77 168 76 140 L72 148 L52 140 C55 124 58 108 62 100 C65 94 68 91 73 89 Z';
const JACKET_L = 'M99 77 L73 87 C64 91 59 100 57 112 C53 140 49 190 46 238 L68 240 L75 146 C75 190 74 236 72 266 L106 266 L106 196 L96 114 Z';
const COAT_L = 'M99 75 L71 85 C61 89 56 99 54 112 C50 142 46 192 43 240 L66 242 L74 148 C73 210 70 280 67 336 L106 336 L106 206 L94 110 Z';
const COAT_OPEN_L = 'M99 75 L71 85 C61 89 56 99 54 112 C50 142 46 192 43 240 L66 242 L74 148 C73 210 70 280 67 336 L92 336 C90 270 88 200 84 120 Z';
const PANTS_L = 'M76 232 L110 232 L110 276 L106 276 L104 438 L83 438 C82 380 79 320 75 262 Z';
const SHORTS_L = 'M76 232 L110 232 L110 276 L106 276 L106 322 L78 322 C77 300 76 280 75 262 Z';
const SHOE_L = 'M85 432 L106 432 L107 449 C107 455 101 457 94 457 L69 457 C62 457 61 449 67 445 C73 441 80 439 84 437 Z';

/**
 * @param {{top?, bottom?, layer?, outer?, shoes?, belt?, tie?}} p pièces : {sub, hex, photo, photos}
 * @param {{label?:string, skin?:string, hair?:string}} o
 */
export function dressedMannequinSVG(p, o = {}) {
  const uid = 'd' + Math.random().toString(36).slice(2, 8);
  const SKIN = ok(o.skin) || '#E6BFA0'; const SKIN_D = '#C99A7A'; const HAIR = ok(o.hair) || '#3A2A21';
  const defs = [];
  const out = [];
  const shade = `url(#${uid}-shade)`;
  /** Une pièce : couleur, photo découpée dans la forme, volume (ombrage) et contour. */
  const piece = (key, d, box, g, { zoom = 1.45, focusY = 0.5 } = {}) => {
    if (!g) return '';
    const fill = ok(g.hex) || '#CFC8BC';
    const clip = `${uid}-${key}`;
    defs.push(`<clipPath id="${clip}"><path d="${d}"/></clipPath>`);
    const [x, y, w, h] = box; const Wd = w * zoom; const Hd = h * zoom;
    const photos = (g.photos || (g.photo ? [g.photo] : [])).filter(Boolean);
    const img = photos.length ? `<image data-photo="${escapeHTML(photos[0])}" data-photo-list="${escapeHTML(photos.join(','))}" x="${x - (Wd - w) / 2}" y="${y - (Hd - h) * focusY}" width="${Wd}" height="${Hd}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})"/>` : '';
    return `<path d="${d}" fill="${fill}"/>${img}<path d="${d}" fill="${shade}"/><path d="${d}" fill="none" stroke="#00000038" stroke-width=".8" stroke-linejoin="round"/>`;
  };
  const line = (d, op = 0.22, w = 0.8) => `<path d="${d}" fill="none" stroke="#000" stroke-opacity="${op}" stroke-width="${w}" stroke-linecap="round"/>`;

  const short = SHORT_SLEEVES.includes(p.top?.sub);
  const shorts = SHORTS.includes(p.bottom?.sub);
  const jacket = p.layer; const coat = p.outer;

  // --- Corps ---
  out.push(`<path d="${both(LEG)}" fill="${SKIN}" stroke="${SKIN_D}" stroke-width=".6"/>`);
  out.push(`<path d="${both(ARM)}" fill="${SKIN}" stroke="${SKIN_D}" stroke-width=".6"/>`);
  out.push(`<path d="${both(TORSO)}" fill="${SKIN}"/>`);
  out.push(`<path d="${both(HAND)}" fill="${SKIN}" stroke="${SKIN_D}" stroke-width=".6"/>`);
  out.push(line(`M58 252 C59 257 60 260 61 262 ${mirror('M58 252 C59 257 60 260 61 262')}`, 0.18, 0.6));
  // Cou et tête
  out.push(`<path d="M100 62 L120 62 L122 84 C116 88 104 88 98 84 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width=".6"/><path d="M100 70 C106 76 114 76 120 70 L120 64 L100 64 Z" fill="#000" opacity=".08"/>`);
  out.push(`<ellipse cx="90.5" cy="47" rx="3.6" ry="6" fill="${SKIN}" stroke="${SKIN_D}" stroke-width=".6"/><ellipse cx="129.5" cy="47" rx="3.6" ry="6" fill="${SKIN}" stroke="${SKIN_D}" stroke-width=".6"/>`);
  out.push(`<path d="M91 44 C91 28 99 19 110 19 C121 19 129 28 129 44 C129 58 122 70 110 71 C98 70 91 58 91 44 Z" fill="${SKIN}" stroke="${SKIN_D}" stroke-width=".7"/>`);
  out.push(`<path d="M89 42 C87 24 98 13 111 13 C124 13 134 22 131 42 C130 35 127 30 123 28 C115 31 103 31 96 30 C92 32 90 36 89 42 Z" fill="${HAIR}"/>`);
  out.push(`<path d="M100 39 L106 38 M114 38 L120 39" stroke="${HAIR}" stroke-width="1.6" stroke-linecap="round"/>`);
  out.push(`<ellipse cx="103" cy="45" rx="2.4" ry="1.3" fill="#2B211C"/><ellipse cx="117" cy="45" rx="2.4" ry="1.3" fill="#2B211C"/>`);
  out.push(line('M110 46 C109 51 108 54 110 56 L112 56', 0.28, 0.8));
  out.push(`<path d="M104 61 C107 63.5 113 63.5 116 61" fill="none" stroke="#A86B5C" stroke-width="1.3" stroke-linecap="round"/>`);
  out.push(`<path d="M94 52 C97 63 103 69 110 70 C117 69 123 63 126 52" fill="none" stroke="#000" stroke-opacity=".06" stroke-width="3"/>`);

  // --- Bas, ceinture, chaussures ---
  if (p.bottom) {
    out.push(piece('bottom', both(shorts ? SHORTS_L : PANTS_L), shorts ? [74, 230, 72, 94] : [74, 230, 72, 210], p.bottom, { zoom: 1.7 }));
    out.push(line(shorts ? 'M110 240 L110 276' : 'M110 240 L110 276 M94 300 C95 340 95 380 94 436 M126 300 C125 340 125 380 126 436', 0.18));
    if (!shorts) out.push(line('M86 352 C92 356 100 356 104 352 M116 352 C120 356 128 356 134 352 M83 420 C92 424 100 424 105 420 M115 420 C120 424 128 424 137 420', 0.12));
  }
  const beltSvg = p.belt && ok(p.belt.hex) ? `<rect x="75" y="231" width="70" height="8" rx="1.5" fill="${p.belt.hex}" stroke="#00000045" stroke-width=".6"/><rect x="105" y="232" width="10" height="6" rx="1" fill="none" stroke="#C9B37E" stroke-width="1.3"/>` : '';
  const tucked = ['chemise', 'chemise-lin', 'polo', 'polo-sport'].includes(p.top?.sub) && !!beltSvg; // chemise et polo rentrés quand il y a une ceinture
  if (!tucked) out.push(beltSvg);
  if (p.shoes) {
    out.push(piece('shoes', both(SHOE_L), [60, 430, 100, 28], p.shoes, { zoom: 1.4, focusY: 0.6 }));
    out.push(line(`M69 455 L106 455 ${mirror('M69 455 L106 455')}`, 0.35, 1.6));
  }

  // --- Haut ---
  if (p.top) {
    const topPath = both(short ? TEE_L : SHIRT_L).replace(/242/g, tucked ? '236' : '242');
    out.push(piece('top', topPath, [46, 78, 128, 166], p.top, { zoom: 1.5, focusY: 0.45 }));
    if (tucked) out.push(beltSvg, line('M84 240 C90 244 96 243 104 240 M116 240 C124 243 130 244 136 240', 0.15));
    const sub = p.top.sub; const c = ok(p.top.hex) || '#CFC8BC';
    if (!short) out.push(line(`M59 168 C62 172 66 173 70 171 ${mirror('M59 168 C62 172 66 173 70 171')} M50 226 L68 227 ${mirror('M50 226 L68 227')}`, 0.2));
    out.push(line('M80 200 C90 206 100 207 108 205 M112 205 C120 207 130 206 140 200', 0.1));
    if (sub === 'col-roule') out.push(`<path d="M98 66 C104 70 116 70 122 66 L123 86 C116 91 104 91 97 86 Z" fill="${c}" stroke="#00000040" stroke-width=".7"/>${line('M98 74 C104 78 116 78 122 74 M98 80 C104 84 116 84 122 80', 0.14)}`);
    else if (['chemise', 'chemise-lin'].includes(sub)) out.push(`<path d="M99 79 L110 92 L101 99 L95 84 Z M121 79 L110 92 L119 99 L125 84 Z" fill="${c}" stroke="#00000050" stroke-width=".7"/>${line('M110 92 L110 240', 0.25)}${[112, 140, 168, 196, 224].map((y) => `<circle cx="110" cy="${y}" r="1.3" fill="#00000050"/>`).join('')}`);
    else if (['polo', 'polo-sport'].includes(sub)) out.push(`<path d="M99 79 L110 88 L102 94 Z M121 79 L110 88 L118 94 Z" fill="${c}" stroke="#00000050" stroke-width=".7"/>${line('M110 88 L110 118', 0.3)}<circle cx="110" cy="99" r="1.2" fill="#00000050"/><circle cx="110" cy="110" r="1.2" fill="#00000050"/>`);
    else out.push(line('M99 79 C102 87 118 87 121 79', 0.35, 1.2));
  }
  if (p.tie && ok(p.tie.hex) && p.top?.sub !== 'col-roule') out.push(`<path d="M108 92 L112 92 L114 102 L117 168 L110 180 L103 168 L106 102 Z" fill="${p.tie.hex}" stroke="#00000050" stroke-width=".6"/>`);

  // --- Veste puis manteau ---
  if (jacket) {
    out.push(piece('layer', both(JACKET_L), [44, 76, 132, 192], jacket, { zoom: 1.4, focusY: 0.45 }));
    out.push(line(`M99 77 L88 118 L101 136 ${mirror('M99 77 L88 118 L101 136')}`, 0.4, 1));
    out.push('<circle cx="106" cy="206" r="2" fill="#00000060"/><circle cx="106" cy="232" r="2" fill="#00000060"/>');
    out.push(line(`M78 214 L94 214 ${mirror('M78 214 L94 214')} M57 170 C60 174 64 175 69 173 ${mirror('M57 170 C60 174 64 175 69 173')}`, 0.2));
  }
  if (coat) {
    out.push(piece('outer', both(jacket ? COAT_OPEN_L : COAT_L), [42, 74, 136, 264], coat, { zoom: 1.35, focusY: 0.4 }));
    out.push(line(jacket ? `M99 75 L84 118 L90 140 ${mirror('M99 75 L84 118 L90 140')}` : `M99 75 L86 116 L100 138 ${mirror('M99 75 L86 116 L100 138')}`, 0.4, 1));
    if (!jacket) out.push('<circle cx="104" cy="222" r="2.2" fill="#00000060"/><circle cx="104" cy="262" r="2.2" fill="#00000060"/>');
    out.push(line(`M56 172 C59 176 63 177 68 175 ${mirror('M56 172 C59 176 63 177 68 175')}`, 0.2));
  }

  const label = escapeHTML(o.label || 'Mannequin habillé avec les pièces de la tenue');
  return raw(`<svg class="dressed" viewBox="0 0 ${W} 470" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${uid}-shade" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".24"/><stop offset=".2" stop-color="#000" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity=".07"/><stop offset=".8" stop-color="#000" stop-opacity=".03"/><stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient>${defs.join('')}</defs>
    <ellipse cx="110" cy="460" rx="70" ry="6" fill="#00000016"/>
    ${out.join('\n')}
  </svg>`);
}
