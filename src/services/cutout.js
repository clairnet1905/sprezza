// Détourage sur l'appareil (aucune photo envoyée) avec @imgly/background-removal (AGPL-3.0).
// Premier usage : téléchargement unique du moteur et du modèle (~56 Mo), ensuite en cache du navigateur.
// Résultat : la pièce recadrée et centrée sur un fond ivoire uniforme, au format 3:4.
import { encodeImage } from './image.js';

export const CUTOUT_BG = '#F4F1EA';
export const CUTOUT_DOWNLOAD_MB = 56;

// Le moteur tourne dans une page isolée (tools/cutout-frame.html) : la politique de sécurité de l'app reste stricte.
let frame = null; let ready = null; let seq = 0;
function getFrame() {
  if (ready) return ready;
  ready = new Promise((resolve, reject) => {
    frame = document.createElement('iframe');
    frame.src = new URL('../../tools/cutout-frame.html', import.meta.url).href;
    frame.title = 'Détourage'; frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
    frame.style.cssText = 'position:absolute;width:1px;height:1px;border:0;left:-9999px;top:0';
    const t = setTimeout(() => { ready = null; reject(new Error('Module de détourage indisponible : vérifiez la connexion')); }, 20000);
    const onReady = (e) => { if (e.source === frame.contentWindow && e.data?.type === 'ready') { clearTimeout(t); window.removeEventListener('message', onReady); resolve(frame); } };
    window.addEventListener('message', onReady);
    document.body.appendChild(frame);
  });
  return ready;
}
function removeBackgroundIsolated(blob, onProgress) {
  return getFrame().then((f) => new Promise((resolve, reject) => {
    const id = ++seq;
    const onMsg = (e) => {
      if (e.source !== f.contentWindow || e.origin !== location.origin || e.data?.id !== id) return;
      if (e.data.type === 'progress') onProgress(e.data.key, e.data.pct);
      else { window.removeEventListener('message', onMsg); e.data.type === 'done' ? resolve(e.data.png) : reject(new Error(e.data.message)); }
    };
    window.addEventListener('message', onMsg);
    f.contentWindow.postMessage({ type: 'cutout', id, blob }, location.origin);
  }));
}

/** Boîte englobante des pixels visibles (alpha > seuil). Fonction pure, testée. */
export function alphaBounds(data, w, h, threshold = 24) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > threshold) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const toBlob = (canvas, q = 0.86) => encodeImage(canvas, q);

/**
 * Nettoyage : garde la ou les grandes zones de la pièce et efface les petits îlots (poussières, reflets, bouts de fond).
 * Travaille sur une grille réduite (rapide). Modifie data en place ; renvoie le nombre d'îlots effacés. Fonction testée.
 */
export function keepMainRegions(data, w, h, { minShare = 0.04, threshold = 128 } = {}) {
  const f = Math.max(1, Math.ceil(Math.max(w, h) / 400));
  const gw = Math.ceil(w / f), gh = Math.ceil(h / f);
  const grid = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let on = 0;
    for (let y = gy * f; y < Math.min(h, gy * f + f) && !on; y += Math.max(1, f >> 1)) for (let x = gx * f; x < Math.min(w, gx * f + f); x += Math.max(1, f >> 1)) if (data[(y * w + x) * 4 + 3] > threshold) { on = 1; break; }
    grid[gy * gw + gx] = on;
  }
  const label = new Int32Array(gw * gh); const areas = [0]; const stack = [];
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i] || label[i]) continue;
    const id = areas.length; let area = 0; stack.push(i); label[i] = id;
    while (stack.length) {
      const j = stack.pop(); area++;
      const x = j % gw, y = (j / gw) | 0;
      for (const k of [x > 0 ? j - 1 : -1, x < gw - 1 ? j + 1 : -1, y > 0 ? j - gw : -1, y < gh - 1 ? j + gw : -1]) if (k >= 0 && grid[k] && !label[k]) { label[k] = id; stack.push(k); }
    }
    areas.push(area);
  }
  const max = Math.max(0, ...areas);
  const drop = new Set(areas.map((a, id) => (id && a < max * minShare ? id : 0)).filter(Boolean));
  if (!drop.size) return 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const id = label[((y / f) | 0) * gw + ((x / f) | 0)];
    if (id && drop.has(id)) data[(y * w + x) * 4 + 3] = 0;
  }
  return drop.size;
}

/**
 * Redressement : angle (degrés) à appliquer pour remettre la pièce d'aplomb, d'après l'axe principal de sa silhouette.
 * 0 si la pièce est déjà droite, trop « carrée » pour juger, ou inclinée de plus de 12° (pose volontaire). Fonction pure, testée.
 */
export function deskewAngle(data, w, h, threshold = 128) {
  let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  const step = Math.max(1, Math.round(Math.sqrt((w * h) / 250000)));
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    if (data[(y * w + x) * 4 + 3] > threshold) { n++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; }
  }
  if (n < 50) return 0;
  const mx = sx / n, my = sy / n;
  const a = sxx / n - mx * mx, b = sxy / n - mx * my, c = syy / n - my * my;
  const tr = a + c, det = a * c - b * b, disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
  if (l2 <= 0 || l1 / l2 < 1.4) return 0; // silhouette trop compacte : orientation incertaine
  const deg = (0.5 * Math.atan2(2 * b, a - c) * 180) / Math.PI; // axe principal, sens horaire (y vers le bas)
  let delta = ((deg % 90) + 90) % 90; if (delta > 45) delta -= 90; // écart à l'axe vertical/horizontal le plus proche
  return Math.abs(delta) < 1.5 || Math.abs(delta) > 12 ? 0 : -Math.round(delta * 10) / 10;
}

/**
 * @param {Blob} blob photo source
 * @param {(info:{step:string, pct:number|null})=>void} onProgress
 * @returns {Promise<{blob:Blob, thumb:Blob, width:number, height:number}>}
 */
export async function cutout(blob, onProgress = () => {}) {
  onProgress({ step: 'Chargement du module de détourage', pct: null });
  const png = await removeBackgroundIsolated(blob, (key, pct) => onProgress({ step: /fetch/.test(key) ? `Téléchargement du modèle (une seule fois, ~${CUTOUT_DOWNLOAD_MB} Mo)` : 'Détourage en cours', pct }));
  onProgress({ step: 'Mise en forme', pct: null });
  const bmp = await createImageBitmap(png);
  const src = document.createElement('canvas'); src.width = bmp.width; src.height = bmp.height;
  const sctx = src.getContext('2d'); sctx.drawImage(bmp, 0, 0);
  const img = sctx.getImageData(0, 0, src.width, src.height);
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] < 96) img.data[i] = 0; else if (img.data[i] < 200) img.data[i] = Math.round((img.data[i] - 96) * 255 / 104); // halo et voile semi-transparents supprimés, bords adoucis
  keepMainRegions(img.data, src.width, src.height, { threshold: 40 }); // supprime les petits îlots (poussières, bouts de fond)
  sctx.putImageData(img, 0, 0);
  // Redressement automatique (pièce photographiée un peu de travers).
  const rot = deskewAngle(img.data, src.width, src.height);
  let work = src; let data = img.data;
  if (rot) {
    const r = (rot * Math.PI) / 180; const cw = Math.ceil(Math.abs(src.width * Math.cos(r)) + Math.abs(src.height * Math.sin(r))); const ch = Math.ceil(Math.abs(src.width * Math.sin(r)) + Math.abs(src.height * Math.cos(r)));
    work = document.createElement('canvas'); work.width = cw; work.height = ch;
    const wctx = work.getContext('2d'); wctx.translate(cw / 2, ch / 2); wctx.rotate(r); wctx.imageSmoothingQuality = 'high'; wctx.drawImage(src, -src.width / 2, -src.height / 2);
    data = wctx.getImageData(0, 0, cw, ch).data;
  }
  const box = alphaBounds(data, work.width, work.height);
  if (!box || box.w * box.h < work.width * work.height * 0.02) throw new Error('Aucun vêtement net détecté : essayez une photo mieux éclairée, sur un fond uni');
  const render = (maxH) => {
    const H = maxH; const W = Math.round(H * 3 / 4);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'); ctx.fillStyle = CUTOUT_BG; ctx.fillRect(0, 0, W, H);
    const scale = Math.min((W * 0.84) / box.w, (H * 0.84) / box.h);
    const dw = box.w * scale; const dh = box.h * scale;
    ctx.imageSmoothingQuality = 'high';
    // Ombre portée douce, comme une photo de boutique (suit la silhouette grâce à la transparence).
    ctx.shadowColor = 'rgba(45, 35, 25, 0.20)'; ctx.shadowBlur = Math.round(H * 0.028); ctx.shadowOffsetY = Math.round(H * 0.012);
    ctx.drawImage(work, box.x, box.y, box.w, box.h, (W - dw) / 2, (H - dh) / 2 - H * 0.008, dw, dh);
    ctx.shadowColor = 'transparent';
    return c;
  };
  const full = render(1600); const small = render(480);
  return { blob: await toBlob(full), thumb: await toBlob(small, 0.8), width: full.width, height: full.height, straightened: rot };
}
