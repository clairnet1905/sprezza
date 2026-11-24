import { html, raw, setHTML, escapeHTML } from '../lib/html.js';

// ---------- Icônes (traits fins, cohérentes Quiet Luxury) ----------
const P = {
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  wardrobe: '<path d="M12 4a2 2 0 1 1 2 2c-1 0-2 .6-2 1.6V8"/><path d="M12 8 3 15.5c-.7.6-.3 1.5.6 1.5h16.8c.9 0 1.3-.9.6-1.5Z"/>',
  colors: '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="9" r="1.3"/><circle cx="12.5" cy="7" r="1.3"/><circle cx="16" cy="10" r="1.3"/><path d="M12 21a3 3 0 0 1 0-6h1.5a2 2 0 0 0 0-4"/>',
  academy: '<path d="M3 8.5 12 4l9 4.5-9 4.5z"/><path d="M7 10.5V16c0 1.2 2.2 2.5 5 2.5s5-1.3 5-2.5v-5.5"/><path d="M21 8.5V14"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  outfits: '<path d="M8 3h8l3 4-3 2v12H8V9L5 7z"/>',
  analysis: '<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>',
  shopping: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  capsule: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  suitcase: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V4h6v3M4 12h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  camera: '<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="3.5"/><path d="M8 6l1.5-2h5L16 6"/>',
  rotate: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M4 4h16"/>',
  swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  rain: '<path d="M7 15a4 4 0 0 1 .5-8A5.5 5.5 0 0 1 18 8.5 3.5 3.5 0 0 1 17.5 15z"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
};
export function icon(name, { filled = false, label = '' } = {}) {
  const fill = filled ? 'currentColor' : 'none';
  return raw(`<svg viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${label ? `role="img" aria-label="${escapeHTML(label)}"` : 'aria-hidden="true"'}>${P[name] || ''}</svg>`);
}

// ---------- Toast ----------
export function toast(message, { action, onAction, timeout = 3800 } = {}) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  setHTML(el, html`<span>${message}</span>${action ? html`<button type="button">${action}</button>` : ''}`);
  if (action) el.querySelector('button').addEventListener('click', () => { onAction?.(); el.remove(); });
  root.appendChild(el);
  setTimeout(() => el.remove(), timeout);
}

// ---------- Modal accessible ----------
let lastFocus = null;
export function openModal({ title, body, onMount, wide = false }) {
  const root = document.getElementById('modal-root');
  lastFocus = document.activeElement;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const titleId = 'm' + Math.random().toString(36).slice(2, 8);
  setHTML(backdrop, html`<div class="modal" role="dialog" aria-modal="true" aria-labelledby="${titleId}" ${wide ? raw('style="max-width:860px"') : ''}>
    <div class="modal-head"><h2 id="${titleId}">${title}</h2><button type="button" class="btn btn-ghost btn-icon" data-close aria-label="Fermer">${icon('close')}</button></div>
    <div class="modal-body">${body}</div></div>`);
  root.appendChild(backdrop);
  const modal = backdrop.querySelector('.modal');
  const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); lastFocus?.focus?.(); };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  };
  document.addEventListener('keydown', onKey);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) close(); });
  onMount?.(modal.querySelector('.modal-body'), close);
  setTimeout(() => (modal.querySelector('[autofocus]') || modal.querySelector('input, select, button:not([data-close])') || modal).focus?.(), 30);
  return close;
}

export function confirmDialog({ title, message, confirmLabel = 'Confirmer', danger = false }) {
  return new Promise((resolve) => {
    let done = false;
    const close = openModal({
      title,
      body: html`<p>${message}</p><div class="btn-row" style="justify-content:flex-end"><button class="btn" data-no type="button">Annuler</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-yes type="button">${confirmLabel}</button></div>`,
      onMount(body, closeFn) {
        body.querySelector('[data-no]').onclick = () => { done = true; resolve(false); closeFn(); };
        body.querySelector('[data-yes]').onclick = () => { done = true; resolve(true); closeFn(); };
      },
    });
    const obs = new MutationObserver(() => { if (!document.querySelector('.modal-backdrop') && !done) { resolve(false); obs.disconnect(); } });
    obs.observe(document.getElementById('modal-root'), { childList: true });
    void close;
  });
}

// ---------- Helpers de rendu ----------
export function swatch(hex, name, cls = '') {
  return html`<span class="swatch ${cls}" style="background:${raw(validHex(hex) ? hex : '#cccccc')}" title="${name || hex}"></span>`;
}
export function validHex(hex) { return /^#[0-9a-fA-F]{6}$/.test(hex || ''); }

export function emptyState(title, text, actions = '') {
  return html`<div class="empty"><h3>${title}</h3><p>${text}</p>${actions ? html`<div class="btn-row" style="justify-content:center">${actions}</div>` : ''}</div>`;
}

export function fmtDate(iso, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR', opts);
}
export function fmtEUR(n) {
  if (n === null || n === undefined || n === '' || isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
}
export function todayISO(d = new Date()) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

export function downloadFile(filename, content, mime = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copié dans le presse-papiers'); return true; }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); toast(ok ? 'Copié dans le presse-papiers' : 'Copie impossible'); return ok;
  }
}

/** Lit les valeurs d'un formulaire en respectant les types (number, checkbox, multi). */
export function readForm(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    if (el.type === 'checkbox') {
      if (el.dataset.multi !== undefined) { (out[el.name] ||= []); if (el.checked) out[el.name].push(el.value); }
      else out[el.name] = el.checked;
    } else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
    else if (el.type === 'number' || el.type === 'range') out[el.name] = el.value === '' ? null : Number(el.value);
    else if (el.tagName === 'SELECT' && el.multiple) out[el.name] = [...el.selectedOptions].map((o) => o.value);
    else out[el.name] = el.value.trim();
  }
  return out;
}

export function options(list, selected, { empty } = {}) {
  return html`${empty !== undefined ? html`<option value="">${empty}</option>` : ''}${list.map((o) => {
    const [value, label] = Array.isArray(o) ? o : typeof o === 'object' ? [o.id, o.name] : [o, o];
    return html`<option value="${value}" ${String(selected) === String(value) ? raw('selected') : ''}>${label}</option>`;
  })}`;
}

export function scoreLabel10(n) {
  if (n === null || n === undefined) return 'Non évaluable';
  if (n >= 9.5) return 'Élégance remarquable';
  if (n >= 9) return 'Très élégant';
  if (n >= 8) return 'Bien habillé et raffiné';
  if (n >= 7) return 'Bonne tenue, améliorable';
  if (n >= 6) return 'Correct, manque d\'harmonie';
  return 'Plusieurs éléments à revoir';
}
