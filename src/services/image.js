// Traitement d'image côté client : contrôle MIME + signature, rotation, recadrage, compression,
// miniature et suppression des métadonnées EXIF (ré-encodage via canvas).
import { rgbToHex, nearestColor } from '../domain/colors.js';

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const SIGNATURES = [
  { mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: 'image/webp', test: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
  { mime: 'image/heic', test: (b) => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 },
];

export async function checkImageFile(file) {
  if (!file) throw new Error('Aucun fichier');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Fichier trop volumineux (15 Mo maximum)');
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const sig = SIGNATURES.find((s) => s.test(head));
  if (!sig) throw new Error('Format non reconnu : JPEG, PNG, WebP ou HEIC attendu');
  if (file.type && !file.type.startsWith('image/')) throw new Error('Type MIME non image');
  return sig.mime;
}

export async function loadBitmap(file) {
  try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image(); img.decoding = 'async'; img.src = url; await img.decode();
      return img;
    } catch { throw new Error('Image impossible à décoder sur ce navigateur (essayer JPEG)'); }
    finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
}

/**
 * Rendu final : rotation (0/90/180/270), recadrage normalisé {x,y,w,h} dans [0,1], redimensionnement.
 */
export function renderToCanvas(src, { rotation = 0, crop = null, maxSide = 1600 } = {}) {
  const sw = src.width; const sh = src.height;
  const rotated = rotation % 180 !== 0;
  const rw = rotated ? sh : sw; const rh = rotated ? sw : sh;
  const c = crop || { x: 0, y: 0, w: 1, h: 1 };
  const cw = Math.max(1, Math.round(rw * c.w)); const ch = Math.max(1, Math.round(rh * c.h));
  const scale = Math.min(1, maxSide / Math.max(cw, ch));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(cw * scale); canvas.height = Math.round(ch * scale);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(scale, scale);
  ctx.translate(-rw * c.x, -rh * c.y);
  ctx.translate(rw / 2, rh / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(src, -sw / 2, -sh / 2);
  return canvas;
}

export function canvasToBlob(canvas, quality = 0.84) {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Compression impossible'))), 'image/jpeg', quality));
}

/** Produit l'image principale et la miniature (métadonnées EXIF supprimées par ré-encodage). */
export async function processImage(src, opts = {}) {
  const full = renderToCanvas(src, { ...opts, maxSide: 1600 });
  const thumb = renderToCanvas(src, { ...opts, maxSide: 480 });
  const [blob, thumbBlob] = await Promise.all([canvasToBlob(full, 0.84), canvasToBlob(thumb, 0.78)]);
  return { blob, thumbBlob, width: full.width, height: full.height, dominant: dominantColors(thumb) };
}

/** Couleurs représentatives (zone centrale) — estimation, à confirmer : l'éclairage modifie la couleur perçue. */
export function dominantColors(canvas, k = 3) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width; const h = canvas.height;
  const x0 = Math.floor(w * 0.25); const y0 = Math.floor(h * 0.2);
  const data = ctx.getImageData(x0, y0, Math.max(1, Math.floor(w * 0.5)), Math.max(1, Math.floor(h * 0.6))).data;
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i] >> 4, g = data[i + 1] >> 4, b = data[i + 2] >> 4;
    const key = (r << 8) | (g << 4) | b;
    const e = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += data[i]; e.g += data[i + 1]; e.b += data[i + 2];
    buckets.set(key, e);
  }
  const total = [...buckets.values()].reduce((a, e) => a + e.n, 0) || 1;
  return [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, k).map((e) => {
    const hex = rgbToHex([e.r / e.n, e.g / e.n, e.b / e.n]);
    const near = nearestColor(hex);
    return { hex, share: e.n / total, nearestId: near.id, nearestName: near.name, confidence: near.confidence };
  });
}

/** Convertit un Blob en data URL (pour export d'archive photo séparée). */
export function blobToDataURL(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
}
export function dataURLToBlob(url) {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(url || '');
  if (!m || !m[2]) throw new Error('Image d\'archive invalide');
  const bin = atob(m[3]); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: m[1] || 'image/jpeg' });
}
