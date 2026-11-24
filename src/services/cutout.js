// Détourage sur l'appareil (aucune photo envoyée) avec @imgly/background-removal (AGPL-3.0).
// Premier usage : téléchargement unique du moteur et du modèle (~56 Mo), ensuite en cache du navigateur.
// Résultat : la pièce recadrée et centrée sur un fond ivoire uniforme, au format 3:4.
const LIB = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';
const DATA = 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/';
export const CUTOUT_BG = '#F4F1EA';
export const CUTOUT_DOWNLOAD_MB = 56;

let libPromise = null;
const loadLib = () => (libPromise ||= import(/* @vite-ignore */ LIB).catch((e) => { libPromise = null; throw new Error(`Module de détourage indisponible (${e.message}) : vérifiez la connexion`); }));

/** Boîte englobante des pixels visibles (alpha > seuil). Fonction pure, testée. */
export function alphaBounds(data, w, h, threshold = 24) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > threshold) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function toBlob(canvas, q = 0.86) { return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Encodage impossible'))), 'image/jpeg', q)); }

/**
 * @param {Blob} blob photo source
 * @param {(info:{step:string, pct:number|null})=>void} onProgress
 * @returns {Promise<{blob:Blob, thumb:Blob, width:number, height:number}>}
 */
export async function cutout(blob, onProgress = () => {}) {
  onProgress({ step: 'Chargement du module de détourage', pct: null });
  const { removeBackground } = await loadLib();
  const png = await removeBackground(blob, {
    publicPath: DATA, model: 'isnet_quint8', output: { format: 'image/png', quality: 1 },
    progress: (key, cur, total) => onProgress({ step: /fetch/.test(key) ? `Téléchargement du modèle (une seule fois, ~${CUTOUT_DOWNLOAD_MB} Mo)` : 'Détourage en cours', pct: total ? Math.round((cur / total) * 100) : null }),
  });
  onProgress({ step: 'Mise en forme', pct: null });
  const bmp = await createImageBitmap(png);
  const src = document.createElement('canvas'); src.width = bmp.width; src.height = bmp.height;
  const sctx = src.getContext('2d'); sctx.drawImage(bmp, 0, 0);
  const box = alphaBounds(sctx.getImageData(0, 0, src.width, src.height).data, src.width, src.height);
  if (!box || box.w * box.h < src.width * src.height * 0.02) throw new Error('Aucun vêtement net détecté : essayez une photo mieux éclairée, sur un fond uni');
  const render = (maxH) => {
    const H = maxH; const W = Math.round(H * 3 / 4);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'); ctx.fillStyle = CUTOUT_BG; ctx.fillRect(0, 0, W, H);
    const scale = Math.min((W * 0.86) / box.w, (H * 0.86) / box.h);
    const dw = box.w * scale; const dh = box.h * scale;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, box.x, box.y, box.w, box.h, (W - dw) / 2, (H - dh) / 2, dw, dh);
    return c;
  };
  const full = render(1600); const small = render(480);
  return { blob: await toBlob(full), thumb: await toBlob(small, 0.8), width: full.width, height: full.height };
}
