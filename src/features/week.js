// « Préparer ma semaine » : 7 tenues d'avance d'après l'agenda et la météo, sans répétition, puis tout au calendrier.
import { html, raw } from '../lib/html.js';
import { icon, toast, openModal, fmtDate, todayISO, swatch } from '../components/ui.js';
import { store, pid, garments as loadGarments, calendar as loadCalendar, prefs as loadPrefs, wearlog as loadWearlog } from '../state.js';
import { OCCASION_BY_ID } from '../data/occasions.js';
import { planWeek } from '../domain/week-plan.js';
import { saveOutfit, addToCalendar, piecesList } from './shared.js';
import { defaultOccasion, preferredMode, weatherFor } from './daily.js';

export async function openWeekPlanner({ onDone } = {}) {
  const close0 = openModal({ title: 'Ma semaine', body: html`<p class="muted"><span class="loader"></span> Je prépare vos 7 tenues…</p>` });
  const [all, cal, prefs, wl] = await Promise.all([loadGarments(), loadCalendar(), loadPrefs(), loadWearlog()]);
  const days = []; const fixed = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i); const iso = todayISO(d);
    const entry = cal.find((c) => c.date === iso && c.status !== 'cancelled');
    if (entry?.outfitId || wl.some((w) => w.date === iso)) { fixed.push({ date: iso, title: entry?.title || 'Tenue portée' }); continue; }
    const occ = entry?.occasionId && OCCASION_BY_ID[entry.occasionId] ? entry.occasionId : defaultOccasion(d, store.profile.kind);
    const wx = await weatherFor(i).catch(() => ({ w: null }));
    days.push({ date: iso, occasionId: occ, weather: wx.w, entry });
  }
  // Ce qui a été porté ces 7 derniers jours compte pour la rotation
  const proposed = {}; const weekAgo = todayISO(new Date(Date.now() - 7 * 864e5));
  for (const w of wl) if (w.date >= weekAgo) for (const id of w.garmentIds || []) (proposed[id] ||= []).push(`${w.date}T12:00:00`);
  const workDays = (await store.repo.kvGet(`workstreak:${pid()}`, null))?.days || 3;
  const plan = planWeek({ garments: all, days, prefs, proposed, profileId: pid(), workDays, mode: preferredMode(store.profile.styleMix) });
  close0?.();
  const row = (p, i) => {
    const day = days.find((d) => d.date === p.date); const occ = OCCASION_BY_ID[p.occasionId];
    const o = p.option; const temp = day.weather?.feel ?? day.weather?.temp;
    return html`<div class="week-row">
      <label class="check" style="align-items:flex-start"><input type="checkbox" data-w="${i}" ${raw(o ? 'checked' : 'disabled')}>
      <span><strong>${fmtDate(p.date, { weekday: 'long', day: 'numeric', month: 'short' })}</strong> · ${day.entry?.title || occ.name}${temp !== undefined && temp !== null ? html` <span class="small muted">· ${Math.round(temp)} °C</span>` : ''}
        ${o ? html`<span class="week-pieces">${piecesList(o.pieces).filter(([r]) => r !== 'accessory').map(([, g]) => html`<span class="tag">${swatch(g.color?.hex, g.color?.name)} ${g.name}</span>`)}</span>
          <span class="small muted">${o.title}${o.style ? ` · style ${o.style.label}` : ''}${p.workDay ? ` · tenue de travail jour ${p.workDay}/${workDays}` : ''}</span>`
        : html`<span class="small" style="color:var(--warn)">${p.reason}</span>`}</span></label></div>`;
  };
  openModal({ title: 'Ma semaine', body: html`<p class="small muted">Une tenue par jour d'après votre agenda et la météo, sans remettre les mêmes pièces, avec la même tenue de travail ${workDays} jours de suite. Décochez un jour pour le laisser libre.</p>
    <div class="week-list">${plan.map(row)}</div>
    ${fixed.length ? html`<p class="small muted">Déjà prévu : ${fixed.map((f) => `${fmtDate(f.date, { weekday: 'long' })} (${f.title})`).join(', ')}.</p>` : ''}
    <div class="btn-row" style="margin-top:12px"><button class="btn btn-primary" data-plan>${icon('calendar')} Mettre au calendrier</button></div>`,
  onMount(body, close) {
    body.querySelector('[data-plan]').onclick = async () => {
      const sel = [...body.querySelectorAll('[data-w]:checked')].map((c) => plan[+c.dataset.w]).filter((p) => p.option);
      for (const p of sel) {
        const day = days.find((d) => d.date === p.date); const title = day.entry?.title || `${p.option.title} — ${OCCASION_BY_ID[p.occasionId].name}`;
        if (day.entry) { const o = await saveOutfit(p.option.pieces, { occasionId: p.occasionId, name: title, source: 'calendar', silent: true }); await store.repo.put('calendar', { ...day.entry, outfitId: o.id, note: undefined, status: 'planned' }); }
        else await addToCalendar(p.option.pieces, { date: p.date, occasionId: p.occasionId, title, silent: true });
      }
      close(); toast(`${sel.length} jour${sel.length > 1 ? 's' : ''} planifié${sel.length > 1 ? 's' : ''} : la tenue du jour suivra ce planning`); onDone?.();
    };
  } });
}
