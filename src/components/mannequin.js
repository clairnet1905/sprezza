// Mannequin schématique SVG (B9) — illustration, jamais présentée comme une photographie.
import { raw, escapeHTML } from '../lib/html.js';

const ok = (h) => (/^#[0-9a-fA-F]{6}$/.test(h || '') ? h : null);

function texturePattern(id, tex) {
  const s = 'rgba(0,0,0,.16)'; const w = 'rgba(255,255,255,.14)';
  switch (tex) {
    case 'knit': return `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 2 L2 0 L4 2" fill="none" stroke="${s}" stroke-width=".5"/></pattern>`;
    case 'linen': return `<pattern id="${id}" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 1.5H3M1.5 0V3" stroke="${w}" stroke-width=".4"/></pattern>`;
    case 'flannel': return `<pattern id="${id}" width="2" height="2" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".45" fill="${w}"/></pattern>`;
    case 'suede': return `<pattern id="${id}" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx=".8" cy=".8" r=".5" fill="${s}"/><circle cx="2.2" cy="2.1" r=".4" fill="${w}"/></pattern>`;
    case 'tweed': return `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 0L4 4M4 0L0 4" stroke="${s}" stroke-width=".5"/></pattern>`;
    case 'denim': return `<pattern id="${id}" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 3L3 0" stroke="${w}" stroke-width=".5"/></pattern>`;
    default: return '';
  }
}

/**
 * @param {{top:string, pants:string, shoe:string, jacket?:string|null, belt?:string|null, tie?:string|null, textures?:Record<string,string>, label?:string}} o
 */
export function mannequinSVG(o) {
  const top = ok(o.top) || '#DDDDDD'; const pants = ok(o.pants) || '#BBBBBB'; const shoe = ok(o.shoe) || '#555555';
  const jacket = ok(o.jacket); const belt = ok(o.belt); const tie = ok(o.tie);
  const tx = o.textures || {};
  const uid = 'm' + Math.random().toString(36).slice(2, 7);
  const defs = ['top', 'pants', 'jacket', 'shoe'].map((k) => (tx[k] && tx[k] !== 'smooth' ? texturePattern(`${uid}-${k}`, tx[k]) : '')).join('');
  const overlay = (k, d) => (tx[k] && tx[k] !== 'smooth' ? `<path d="${d}" fill="url(#${uid}-${k})"/>` : '');
  const TOP = 'M48 15 L62 10 Q75 29 88 10 L102 15 L128 40 L112 65 L101 56 L104 104 L46 104 L49 56 L38 65 L22 40 Z';
  const PANTS = 'M44 117 L106 117 L100 223 L80 223 L75 153 L70 223 L50 223 Z';
  const JL = 'M46 14 L62 9 L75 62 L73 110 L43 110 L47 58 L36 70 L19 41 Z';
  const JR = 'M104 14 L88 9 L75 62 L77 110 L107 110 L103 58 L114 70 L131 41 Z';
  const SHOES = 'M50 234 Q40 237 37 245 L69 245 L69 233 Z M81 233 L81 245 L113 245 Q110 237 100 234 Z';
  const label = escapeHTML(o.label || 'Schéma des couleurs de la tenue');
  return raw(`<svg viewBox="0 0 150 260" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
    <defs>${defs}</defs>
    <rect width="150" height="260" rx="12" fill="#99999910"/>
    <path d="${TOP}" fill="${top}" stroke="#888" stroke-width=".8"/>${overlay('top', TOP)}
    <path d="M62 10 L75 31 L56 28 L58 13 M88 10 L75 31 L94 28 L92 13" fill="${top}" stroke="#888" stroke-width=".8"/>
    <path d="M75 31 L75 45" stroke="#888"/>
    ${tie ? `<path d="M73 31 L77 31 L78 36 L80 70 L75 77 L70 70 L72 36 Z" fill="${tie}" stroke="#666" stroke-width=".5"/>` : ''}
    <path d="${PANTS}" fill="${pants}" stroke="#888" stroke-width=".8"/>${overlay('pants', PANTS)}
    <path d="M75 119 L75 139" stroke="#888"/>
    ${belt && !jacket ? `<rect x="45" y="106" width="60" height="9" rx="1.5" fill="${belt}" stroke="#777" stroke-width=".6"/><rect x="71" y="107.5" width="8" height="6" fill="none" stroke="#C9B37E" stroke-width="1"/>` : ''}
    ${belt && jacket ? `<rect x="73" y="108" width="4" height="7" fill="${belt}"/>` : ''}
    ${jacket ? `<path d="${JL}" fill="${jacket}" stroke="#777" stroke-width=".8"/><path d="${JR}" fill="${jacket}" stroke="#777" stroke-width=".8"/>${overlay('jacket', JL)}${overlay('jacket', JR)}
      <path d="M62 9 L66 36 L58 30 M88 9 L84 36 L92 30" fill="none" stroke="#00000040" stroke-width=".7"/><circle cx="73" cy="80" r="1.3" fill="#00000055"/>` : ''}
    <path d="${SHOES}" fill="${shoe}"/>${overlay('shoe', SHOES)}
  </svg>`);
}

/** Miniature schématique d'un vêtement sans photo (SVG, identifiée comme schéma). */
export function garmentGlyph(role, hex) {
  const c = ok(hex) || '#C9C2B4';
  const shapes = {
    top: 'M18 10 L28 6 Q40 18 52 6 L62 10 L76 26 L66 38 L60 32 L62 74 L18 74 L20 32 L14 38 L4 26 Z',
    layer: 'M18 10 L28 6 L40 40 L38 76 L16 76 L20 32 L12 40 L2 24 Z M62 10 L52 6 L40 40 L42 76 L64 76 L60 32 L68 40 L78 24 Z',
    outer: 'M20 6 L32 4 L40 30 L48 4 L60 6 L74 28 L66 40 L62 36 L64 96 L16 96 L18 36 L14 40 L6 28 Z',
    bottom: 'M16 6 L64 6 L60 94 L44 94 L40 36 L36 94 L20 94 Z',
    shoes: 'M8 60 Q4 64 4 72 L76 72 Q74 62 58 58 L40 50 L30 42 L10 44 Z',
    belt: 'M4 34 L76 34 L76 46 L4 46 Z',
    accessory: 'M34 6 L46 6 L48 18 L52 70 L40 82 L28 70 L32 18 Z',
  };
  return raw(`<svg class="g-placeholder" viewBox="0 0 80 100" role="img" aria-label="Schéma du vêtement (pas une photo)"><path d="${shapes[role] || shapes.top}" fill="${c}" stroke="#00000030" stroke-width="1"/></svg>`);
}
