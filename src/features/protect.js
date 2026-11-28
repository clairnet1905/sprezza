// Protéger le dressing : sur iPhone, Safari peut effacer les données d'un site non installé après plusieurs semaines
// sans visite. On rappelle d'installer l'app, et de sauvegarder chaque semaine si la synchronisation n'est pas active.
import { html } from '../lib/html.js';
import { icon, toast } from '../components/ui.js';
import { store } from '../state.js';

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isInstalled = () => navigator.standalone === true || matchMedia?.('(display-mode: standalone)').matches;

/** État de protection (pur côté décision, testable). */
export function protectionAdvice({ garments, synced, lastBackup, snoozeUntil, ios, installed, now = Date.now() }) {
  if (!garments || synced) return null;
  if (snoozeUntil && Date.parse(snoozeUntil) > now) return null;
  const days = lastBackup ? Math.floor((now - Date.parse(lastBackup)) / 864e5) : null;
  const needInstall = ios && !installed;
  const needBackup = days === null || days >= 7;
  if (!needInstall && !needBackup) return null;
  return { needInstall, needBackup, days };
}

export async function protectBanner() {
  const [n, session, last, snooze] = await Promise.all([store.repo.all('garments').then((g) => g.length), store.sync?.session?.().catch(() => null), store.repo.kvGet('backup:last', null), store.repo.kvGet('backup:snooze', null)]);
  const a = protectionAdvice({ garments: n, synced: !!session, lastBackup: last, snoozeUntil: snooze, ios: isIOS(), installed: isInstalled() });
  if (!a) return '';
  return html`<section class="card protect" style="margin-top:14px"><div class="eyebrow">🔒 Protéger votre dressing</div>
    ${a.needInstall ? html`<p style="margin:6px 0"><strong>Installez SPREZZA sur l'écran d'accueil.</strong> Sur iPhone, Safari peut effacer les données d'un site qui n'est pas installé. Dans Safari : bouton <strong>Partager</strong> → <strong>Sur l'écran d'accueil</strong>, puis ouvrez l'app depuis cette icône.</p>` : ''}
    ${a.needBackup ? html`<p style="margin:6px 0"><strong>${a.days === null ? 'Aucune sauvegarde pour l\'instant.' : `Dernière sauvegarde il y a ${a.days} jours.`}</strong> Vos ${n} pièces et leurs photos ne sont que sur ce téléphone. Sauvegardez-les chaque semaine dans Fichiers (iCloud Drive), ou activez la synchronisation avec votre compte.</p>` : ''}
    <div class="btn-row">${a.needBackup ? html`<button class="btn btn-primary btn-sm" data-protect="backup">${icon('download')} Sauvegarder maintenant</button><a class="btn btn-sm" href="#/settings">Synchronisation</a>` : ''}<button class="btn btn-ghost btn-sm" data-protect="later">Me le rappeler dans 3 jours</button></div></section>`;
}

/** Écouteur global des boutons du bandeau. */
if (typeof document !== 'undefined' && !window.__protect) {
  window.__protect = true;
  document.addEventListener('click', async (e) => {
    const b = e.target.closest?.('[data-protect]'); if (!b) return;
    const card = b.closest('.protect');
    if (b.dataset.protect === 'backup') { const { exportData } = await import('./settings.js'); await exportData(true); toast('Enregistrez les 2 fichiers dans Fichiers › iCloud Drive pour les retrouver si vous changez de téléphone', { timeout: 8000 }); card?.remove(); }
    if (b.dataset.protect === 'later') { await store.repo.kvSet('backup:snooze', new Date(Date.now() + 3 * 864e5).toISOString()); card?.remove(); }
  });
}
