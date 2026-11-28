// Planning de la semaine : une tenue par jour selon l'agenda et la météo, sans répéter les mêmes pièces,
// en gardant la même tenue de travail 2 ou 3 jours de suite. Pur et testé.
import { recommend, comboKey } from './recommend.js';
import { OCCASION_BY_ID } from '../data/occasions.js';

/**
 * @param {{garments, days: Array<{date: string, occasionId: string, weather?: object}>, prefs?, proposed?, profileId?, workDays?, mode?}} input
 * @returns {Array<{date, occasionId, option: object|null, workDay?: number, reason?: string}>}
 */
export function planWeek({ garments, days, prefs = {}, proposed = {}, profileId, workDays = 3, mode = null }) {
  const hist = Object.fromEntries(Object.entries(proposed).map(([k, v]) => [k, [...v]]));
  const out = []; const usedCombos = new Set();
  let work = null; // { ids, start (index), n }
  days.forEach((d, i) => {
    const occ = OCCASION_BY_ID[d.occasionId] || OCCASION_BY_ID.daily;
    const date = new Date(`${d.date}T08:00:00`);
    let imposed = {}; let workDay;
    if (occ.workwear === true && work && work.n < workDays) { imposed = work.ids; workDay = work.n + 1; }
    const res = recommend({ garments, occasionId: occ.id, weather: d.weather || null, prefs, profileId, date, now: date.getTime(), proposed: hist, imposed });
    const opts = res.options.filter((o) => workDay || !usedCombos.has(comboKey(o.pieces)));
    const opt = workDay ? (res.options.find((o) => ['top', 'bottom', 'shoes'].every((r) => o.pieces[r]?.id === imposed[r])) || opts[0] || null)
      : (mode && opts.find((o) => o.mode === mode && o.rank >= (opts[0]?.rank ?? 0) - 2)) || opts[0] || res.options[0] || null;
    if (!opt) { out.push({ date: d.date, occasionId: occ.id, option: null, reason: res.info.missing.map((m) => m.text).join(' ') || 'Pas de tenue complète disponible.' }); return; }
    usedCombos.add(comboKey(opt.pieces));
    for (const r of ['top', 'bottom', 'shoes']) { const id = opt.pieces[r]?.id; if (id) (hist[id] ||= []).push(`${d.date}T12:00:00`); }
    if (occ.workwear === true) {
      if (workDay) work.n++;
      else { work = { ids: Object.fromEntries(['top', 'bottom', 'shoes', 'layer'].filter((r) => opt.pieces[r]).map((r) => [r, opt.pieces[r].id])), n: 1 }; workDay = 1; }
    }
    out.push({ date: d.date, occasionId: occ.id, option: opt, workDay });
  });
  return out;
}
