// Logique pure : capsule, modèles portables, shopping, statistiques, ICS.
import { CAPSULE, TEMPLATES } from '../data/capsule.js';
import { colorName } from './colors.js';
import { isAvailable } from './recommend.js';
import { hostOf } from '../data/retailers.js';

// ---------- Capsule ----------
export function capsuleItemsForLevel(level) { return CAPSULE.slice(0, ({ 1: 10, 2: 20, 3: 30 })[level] || 10); }

/** state = { [capsuleId]: { owned: bool, garmentId?: string } } */
export function capsuleProgress(level, state = {}) {
  const items = capsuleItemsForLevel(level);
  const owned = items.filter((i) => state[i.id]?.owned);
  return { total: items.length, owned: owned.length, pct: Math.round((owned.length / items.length) * 100), missing: items.filter((i) => !state[i.id]?.owned) };
}

/** Un modèle n'est « portable » que si toutes les pièces sont reliées à une fiche existante ET disponible. */
export function templateStatus(tpl, state = {}, garments = []) {
  const byId = Object.fromEntries(garments.map((g) => [g.id, g]));
  const parts = tpl.ids.map((cid) => {
    const item = CAPSULE.find((c) => c.id === cid);
    const link = state[cid];
    const garment = link?.garmentId ? byId[link.garmentId] : null;
    let status = 'missing';
    if (garment) status = isAvailable(garment) ? 'ready' : 'unavailable';
    else if (link?.owned) status = 'owned-unlinked';
    return { item, garment, status };
  });
  const portable = parts.every((p) => p.status === 'ready');
  return { tpl, parts, portable, label: portable ? 'Portable' : parts.some((p) => p.status === 'unavailable') ? 'Pièce indisponible' : parts.some((p) => p.status === 'owned-unlinked') ? 'À relier au dressing' : 'Inspiration' };
}
export const allTemplateStatuses = (state, garments) => TEMPLATES.map((t) => templateStatus(t, state, garments));

export function exportMissingText(level, state) {
  const { missing } = capsuleProgress(level, state);
  const lines = missing.map((i) => `- [ ] ${i.id}. ${i.name} — ${i.material} — ${i.season} — ${i.budget[0]}–${i.budget[1]} € — ${i.priority}`);
  return `SPREZZA — Pièces capsule manquantes (niveau ${level})\nPrix indicatifs en France, pas des offres marchandes.\n\n${lines.join('\n') || 'Aucune pièce manquante.'}\n`;
}
export function exportMissingCSV(level, state) {
  const { missing } = capsuleProgress(level, state);
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  return ['id;piece;matiere;saison;budget_min;budget_max;priorite', ...missing.map((i) => [i.id, esc(i.name), esc(i.material), esc(i.season), i.budget[0], i.budget[1], esc(i.priority)].join(';'))].join('\n');
}

// ---------- Shopping ----------
export function buildQuery({ gender = 'homme', category = '', color = '', fit = '', material = '', budgetMin, budgetMax, size = '', season = '', extra = '' }) {
  const colorTxt = color && !color.startsWith('#') ? colorName(color).toLowerCase() : color;
  const budget = budgetMin || budgetMax ? `${budgetMin || 0}–${budgetMax || '…'} €` : '';
  return [category, gender, colorTxt, fit, material, size ? `taille ${size}` : '', season, budget, extra].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}
/** URL de recherche web restreinte au domaine (forme d'URL Google documentée). */
export function siteSearchUrl(retailerUrl, query) {
  const host = hostOf(retailerUrl);
  return `https://www.google.com/search?q=${encodeURIComponent(`site:${host} ${query}`)}`;
}

/**
 * Score d'utilité shopping (distinct de l'élégance) : dressing 35, coupe/mesures 25, budget 20, matière 10, livraison/retours 10.
 * Un critère inconnu vaut null et est signalé.
 */
export function shoppingUtility({ unlocked = null, fitKnown = null, price = null, budgetMax = null, materialOk = null, shippingOk = null }) {
  const c = {
    wardrobe: unlocked === null ? null : Math.min(35, (unlocked / 3) * 35 * 0.6 + (unlocked >= 3 ? 14 : 0)),
    fit: fitKnown === null ? null : fitKnown ? 25 : 8,
    budget: price === null || !budgetMax ? null : price <= budgetMax ? 20 : Math.max(0, 20 - ((price - budgetMax) / budgetMax) * 40),
    material: materialOk === null ? null : materialOk ? 10 : 3,
    shipping: shippingOk === null ? null : shippingOk ? 10 : 3,
  };
  const max = { wardrobe: 35, fit: 25, budget: 20, material: 10, shipping: 10 };
  const known = Object.entries(c).filter(([, v]) => v !== null);
  const weight = known.reduce((a, [k]) => a + max[k], 0);
  const got = known.reduce((a, [, v]) => a + v, 0);
  return { criteria: c, max, assessedWeight: weight, score: weight ? Math.round((got / weight) * 100) : null, unknown: Object.entries(c).filter(([, v]) => v === null).map(([k]) => k) };
}
/** Coût total TTC (prix + livraison + retouches + taxes). Les frais de retour, conditionnels, sont affichés à part. */
export function totalCost({ price, shipping, alterations, taxes }) {
  const parts = [price, shipping, alterations, taxes].map((v) => (v === null || v === undefined || v === '' ? null : Number(v)));
  if (parts[0] === null || Number.isNaN(parts[0])) return null;
  return Math.round(parts.reduce((a, v) => a + (v && !Number.isNaN(v) ? v : 0), 0) * 100) / 100;
}

// ---------- Statistiques ----------
export function costPerWear(g) {
  const price = Number(g.price);
  const wears = Number(g.wearCount || 0);
  if (!price || Number.isNaN(price)) return null;
  if (!wears) return null; // pas de division par zéro
  return Math.round((price / wears) * 100) / 100;
}
export function wardrobeStats(garments, wearlog = [], now = Date.now()) {
  const counts = {};
  for (const w of wearlog) for (const id of w.garmentIds || []) counts[id] = (counts[id] || 0) + 1;
  const rows = garments.map((g) => ({ g, wears: counts[g.id] ?? g.wearCount ?? 0, days: g.lastWornAt ? Math.floor((now - new Date(g.lastWornAt)) / 864e5) : null }));
  const unused = rows.filter((r) => !r.wears || (r.days !== null && r.days > 60));
  const top = [...rows].sort((a, b) => b.wears - a.wears).slice(0, 5);
  const byCat = {};
  garments.forEach((g) => { byCat[g.category] = (byCat[g.category] || 0) + 1; });
  return { total: garments.length, available: garments.filter(isAvailable).length, toWash: garments.filter((g) => g.availability === 'to-wash').length, unused, top, byCat, wearDays: new Set(wearlog.map((w) => w.date)).size };
}

// ---------- Calendrier ICS ----------
function icsEscape(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
export function buildICS(entries) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SPREZZA//FR', 'CALSCALE:GREGORIAN'];
  for (const e of entries) {
    const d = e.date.replace(/-/g, '');
    const next = new Date(e.date + 'T12:00:00'); next.setDate(next.getDate() + 1);
    const d2 = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}${String(next.getDate()).padStart(2, '0')}`;
    lines.push('BEGIN:VEVENT', `UID:${e.id}@sprezza.local`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${d2}`,
      `SUMMARY:${icsEscape(`Tenue — ${e.title || e.occasionName || 'SPREZZA'}`)}`, `DESCRIPTION:${icsEscape(e.description || '')}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

// ---------- Valise ----------
/** Prépare une valise pour N jours en mutualisant les pièces. */
export function packList({ days, outfitsPerDay }) {
  const counts = new Map();
  for (const day of outfitsPerDay) for (const g of day.filter(Boolean)) counts.set(g.id, { g, n: (counts.get(g.id)?.n || 0) + 1 });
  const items = [...counts.values()].sort((a, b) => b.n - a.n);
  return { days, items, total: items.length, shared: items.filter((i) => i.n > 1).length };
}
