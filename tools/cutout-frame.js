// Exécuté dans la page isolée : reçoit une photo (Blob) de l'application, renvoie le PNG détouré.
const LIB = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';
const DATA = 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/';
let lib = null;
window.addEventListener('message', async (e) => {
  if (e.origin !== location.origin || e.source !== window.parent || e.data?.type !== 'cutout') return;
  const { id, blob } = e.data;
  const reply = (msg) => window.parent.postMessage({ id, ...msg }, location.origin);
  try {
    lib = lib || await import(LIB);
    const png = await lib.removeBackground(blob, {
      publicPath: DATA, model: 'isnet_quint8', output: { format: 'image/png', quality: 1 },
      progress: (key, cur, total) => reply({ type: 'progress', key, pct: total ? Math.round((cur / total) * 100) : null }),
    });
    reply({ type: 'done', png });
  } catch (err) { lib = null; reply({ type: 'error', message: String(err?.message || err) }); }
});
window.parent.postMessage({ type: 'ready' }, location.origin);
