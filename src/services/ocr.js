// Lecture d'étiquette sur l'appareil (Tesseract.js, Apache-2.0) : aucune photo envoyée.
// Premier usage : téléchargement unique du moteur et des langues français + anglais (~10 Mo), ensuite en cache.
export const OCR_DOWNLOAD_MB = 10;
let frame = null; let ready = null; let seq = 0;
function getFrame() {
  if (ready) return ready;
  ready = new Promise((resolve, reject) => {
    frame = document.createElement('iframe');
    frame.src = new URL('../../tools/ocr-frame.html', import.meta.url).href;
    frame.title = 'Lecture d\'étiquette'; frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
    frame.style.cssText = 'position:absolute;width:1px;height:1px;border:0;left:-9999px;top:0';
    const t = setTimeout(() => { ready = null; frame.remove(); reject(new Error('Module de lecture indisponible : vérifiez la connexion')); }, 20000);
    const onReady = (e) => { if (e.source === frame.contentWindow && e.data?.type === 'ready') { clearTimeout(t); window.removeEventListener('message', onReady); resolve(frame); } };
    window.addEventListener('message', onReady);
    document.body.appendChild(frame);
  });
  return ready;
}
const STEPS = { 'loading tesseract core': 'Chargement du moteur', 'initializing tesseract': 'Initialisation', 'loading language traineddata': `Téléchargement des langues (une seule fois, ~${OCR_DOWNLOAD_MB} Mo)`, 'initializing api': 'Initialisation', 'recognizing text': 'Lecture de l\'étiquette' };

/** @returns {Promise<{text:string, confidence:number|null}>} */
export function readLabel(blob, onProgress = () => {}) {
  onProgress({ step: 'Chargement du module de lecture', pct: null });
  return getFrame().then((f) => new Promise((resolve, reject) => {
    const id = ++seq;
    const onMsg = (e) => {
      if (e.source !== f.contentWindow || e.origin !== location.origin || e.data?.id !== id) return;
      if (e.data.type === 'progress') onProgress({ step: STEPS[e.data.key] || 'Préparation', pct: e.data.pct });
      else { window.removeEventListener('message', onMsg); e.data.type === 'done' ? resolve({ text: e.data.text, confidence: e.data.confidence }) : reject(new Error(e.data.message)); }
    };
    window.addEventListener('message', onMsg);
    f.contentWindow.postMessage({ type: 'ocr', id, blob }, location.origin);
  }));
}
