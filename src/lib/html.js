// Tagged template that escapes every interpolation by default (protection XSS).
// Use raw() for trusted, already-built markup and html`` results.

class SafeHTML {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

export function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function render(value) {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof SafeHTML) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  return escapeHTML(value);
}

export function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => { out += s; if (i < values.length) out += render(values[i]); });
  return new SafeHTML(out);
}

export const raw = (s) => new SafeHTML(String(s ?? ''));

/** Only http(s) URLs are allowed in links built from data (contrôle des URL externes). */
export function safeUrl(url) {
  try {
    const u = new URL(url, location.href);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch { /* ignore */ }
  return '#';
}

export function setHTML(el, content) { el.innerHTML = render(content); }

export function highlight(text, query) {
  const t = String(text ?? '');
  if (!query) return html`${t}`;
  const idx = t.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return html`${t}`;
  return html`${t.slice(0, idx)}<mark>${t.slice(idx, idx + query.length)}</mark>${t.slice(idx + query.length)}`;
}
