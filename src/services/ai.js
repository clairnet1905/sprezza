// Adaptateur IA côté client : n'appelle que le serveur de l'application (/api/*).
// La clé API reste exclusivement côté serveur (server/server.py) et n'est jamais dans le bundle.
import { validateAnalysis } from '../domain/validate.js';

let healthCache = null;
export async function aiStatus({ force = false } = {}) {
  if (healthCache && !force) return healthCache;
  try {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch('/api/health', { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    healthCache = r.ok ? await r.json() : { ai: false, reason: 'Serveur IA absent (hébergement statique)' };
  } catch { healthCache = { ai: false, reason: 'Serveur IA absent (hébergement statique ou hors ligne)' }; }
  return healthCache;
}

/**
 * Envoie les photos au serveur pour analyse. Time-out, retry borné, validation stricte du JSON.
 * @param {{images: string[], context: object, ownedItems: Array<{id:string,name:string,category:string,color:string}>}} payload
 */
export async function analyzeRemote(payload, { retries = 1, timeout = 60000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal });
      const body = await r.json().catch(() => ({}));
      if (r.status === 429) throw Object.assign(new Error('Quota atteint : réessayer plus tard ou utiliser le questionnaire manuel.'), { fatal: true });
      if (!r.ok) throw Object.assign(new Error(body.error || `Erreur serveur ${r.status}`), { fatal: r.status < 500 });
      return validateAnalysis(body.result, { ownedIds: payload.ownedItems.map((o) => o.id) });
    } catch (e) {
      lastErr = e.name === 'AbortError' ? new Error('Délai dépassé pour l\'analyse') : e;
      if (e.fatal || e.issues) break; // réponse invalide : pas de nouvel essai aveugle
    } finally { clearTimeout(t); }
  }
  throw lastErr;
}
