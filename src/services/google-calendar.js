// Google Agenda (compte Gmail) : lecture seule des événements à venir, avec la connexion Google officielle.
// Le jeton d'accès reste en mémoire (jamais enregistré) ; seul l'identifiant client OAuth (public) est mémorisé.
const GSI = 'https://accounts.google.com/gsi/client';
export const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly';
let token = null; let tokenExp = 0;

function loadGsi() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = GSI; s.async = true;
    s.onload = () => res(); s.onerror = () => rej(new Error('Connexion Google indisponible (réseau ou bloqueur).'));
    document.head.appendChild(s);
  });
}

export const preloadGoogle = () => loadGsi().catch(() => {});

/** Demande (ou réutilise) un jeton d'accès en lecture seule. Doit être appelé après un geste de l'utilisateur. */
export async function googleToken(clientId) {
  if (token && Date.now() < tokenExp - 60e3) return token;
  await loadGsi();
  return new Promise((res, rej) => {
    const tc = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId, scope: GOOGLE_SCOPE,
      callback: (r) => { if (r.error) rej(new Error(r.error_description || r.error)); else { token = r.access_token; tokenExp = Date.now() + (r.expires_in || 3600) * 1000; res(token); } },
      error_callback: (e) => rej(new Error(e?.type === 'popup_closed' ? 'Fenêtre Google fermée.' : e?.message || 'Connexion Google refusée.')),
    });
    tc.requestAccessToken({ prompt: token ? '' : 'consent' });
  });
}
export function googleDisconnect() {
  if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token, () => {});
  token = null; tokenExp = 0;
}

/** Événements de l'agenda principal sur les `days` prochains jours, au format de l'import. */
export async function googleEvents(clientId, { days = 60, from = new Date() } = {}) {
  const t = await googleToken(clientId);
  const min = new Date(from); min.setHours(0, 0, 0, 0);
  const max = new Date(min); max.setDate(max.getDate() + days);
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=250&timeMin=${encodeURIComponent(min.toISOString())}&timeMax=${encodeURIComponent(max.toISOString())}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
  if (r.status === 401) { token = null; throw new Error('Session Google expirée : reconnectez-vous.'); }
  if (!r.ok) throw new Error(`Google Agenda a répondu ${r.status}.`);
  const data = await r.json();
  return mapGoogleEvents(data.items || []);
}
const pad = (n) => String(n).padStart(2, '0');
/** Conversion pure des événements Google vers le format d'import (testée). */
export function mapGoogleEvents(items) {
  return items.filter((e) => e.status !== 'cancelled' && e.summary).map((e) => {
    if (e.start?.date) return { uid: `g|${e.id}`, title: e.summary, location: e.location || '', description: (e.description || '').slice(0, 300), date: e.start.date, time: null, allDay: true };
    const d = new Date(e.start?.dateTime);
    return { uid: `g|${e.id}`, title: e.summary, location: e.location || '', description: (e.description || '').slice(0, 300), date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, allDay: false };
  });
}
