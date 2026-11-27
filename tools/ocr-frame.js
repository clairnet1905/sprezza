// Exécuté dans la page isolée : reçoit une photo d'étiquette (Blob), renvoie le texte lu. Rien n'est envoyé ailleurs.
const CDN = 'https://cdn.jsdelivr.net/npm/';
let worker = null;
async function getWorker(reply) {
  if (worker) return worker;
  worker = await Tesseract.createWorker(['fra', 'eng'], 1, {
    workerPath: `${CDN}tesseract.js@5.1.1/dist/worker.min.js`,
    corePath: `${CDN}tesseract.js-core@5.1.1`,
    logger: (m) => reply({ type: 'progress', key: m.status, pct: typeof m.progress === 'number' ? Math.round(m.progress * 100) : null }),
  });
  return worker;
}
window.addEventListener('message', async (e) => {
  if (e.origin !== location.origin || e.source !== window.parent || e.data?.type !== 'ocr') return;
  const { id, blob } = e.data;
  const reply = (msg) => window.parent.postMessage({ id, ...msg }, location.origin);
  try {
    const w = await getWorker(reply);
    const { data } = await w.recognize(blob);
    reply({ type: 'done', text: data.text || '', confidence: data.confidence ?? null });
  } catch (err) { worker = null; reply({ type: 'error', message: String(err?.message || err) }); }
});
window.parent.postMessage({ type: 'ready' }, location.origin);
