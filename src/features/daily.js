// Tenue du jour automatique : affichée dès l'ouverture, sans clic.
// Priorité : ce qui est déjà porté aujourd'hui → tenue planifiée au calendrier → proposition du styliste.
import { html, raw, setHTML } from '../lib/html.js';
import { icon, toast, todayISO, fmtDate } from '../components/ui.js';
import { store, pid, garments as loadGarments, wearlog as loadWearlog, calendar as loadCalendar, outfits as loadOutfits, prefs as loadPrefs, hydratePhotos } from '../state.js';
import { OCCASION_BY_ID, OUTFIT_MODES } from '../data/occasions.js';
import { recommend, comboKey } from '../domain/recommend.js';
import { manualWeather, weatherSummary, isStale, climateFeel } from '../domain/weather.js';
import { MODE_STYLES } from '../domain/scoring.js';
import { forecast } from '../services/weather.js';
import { PERIODS, periodAt, nextChange, daysSinceChange, seasonalPlan } from '../domain/seasonal.js';
import { outfitMannequin, piecesList, pieceRow, scoreBadge, idsToPieces, wearOutfit, addToCalendar, MODE_NAME, upgradeBlock } from './shared.js';

const QUICK_OCCASIONS = ['daily', 'client', 'office', 'restaurant', 'walk', 'elegant-dinner'];
const KEY = () => `daily:${pid()}`;

/** Occasion par défaut : celle choisie aujourd'hui, sinon client en semaine (profil principal), promenade le week-end. */
export function defaultOccasion(date = new Date(), kind = 'main') {
  const weekend = [0, 6].includes(date.getDay());
  if (weekend) return 'walk';
  return kind === 'main' ? 'client' : 'daily';
}
/** Mode prioritaire selon l'identité de style du profil (ex. 50 % italien → « Élégance italienne »). */
export function preferredMode(styleMix = []) {
  const top = [...styleMix].sort((a, b) => b.pct - a.pct)[0];
  if (!top) return 'italian';
  return Object.entries(MODE_STYLES).find(([, list]) => list.includes(top.id))?.[0] || 'italian';
}

async function weatherFor(offset) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  if (store.profile.consents?.weather && store.profile.city?.lat) {
    const key = `weather:${pid()}:${offset}`;
    const cached = await store.repo.kvGet(key, null);
    if (cached && !isStale(cached) && cached.date === todayISO(d)) return { w: cached, real: true };
    try { const w = await forecast(store.profile.city, { dayIndex: offset }); await store.repo.kvSet(key, w); return { w, real: true }; }
    catch { /* repli saisonnier ci-dessous */ }
  }
  const saved = await store.repo.kvGet(`today:${pid()}`, {});
  const manualToday = offset === 0 && saved.manual?.date === todayISO(d) ? saved.manual : null; // une saisie manuelle ne vaut que pour son jour
  const temp = manualToday?.temp ?? climateFeel(d);
  return { w: manualWeather({ temp, rain: !!manualToday?.rain, date: todayISO(d) }), real: false };
}

export async function renderDaily(box, { onShowAll } = {}) {
  const today = todayISO(); const now = new Date();
  const tomorrowD = new Date(); tomorrowD.setDate(tomorrowD.getDate() + 1); const tomorrow = todayISO(tomorrowD);
  const saved = await store.repo.kvGet(KEY(), {});
  const st = { occasionId: saved.date === today && saved.occasionId ? saved.occasionId : defaultOccasion(now, store.profile.kind), offset: 0, showProposal: false };
  setHTML(box, html`<section class="card card-accent"><p class="muted"><span class="loader"></span> Votre tenue du jour se prépare…</p></section>`);
  const [all, wl, cal, outs, prefs, w0, w1] = await Promise.all([loadGarments(), loadWearlog(), loadCalendar(), loadOutfits(), loadPrefs(), weatherFor(0), weatherFor(1)]);
  const mode = preferredMode(store.profile.styleMix);
  const wornToday = wl.filter((w) => w.date === today).pop();
  const plannedToday = cal.find((c) => c.date === today && c.status === 'planned');
  const plannedTomorrow = cal.find((c) => c.date === tomorrow);
  const outBy = Object.fromEntries(outs.map((o) => [o.id, o]));

  // Propositions des jours précédents (rotation même sans « Je la porte »).
  const PROP_KEY = `proposed:${pid()}`;
  const propHist = await store.repo.kvGet(PROP_KEY, {});
  const proposed = {};
  for (const [d, ids] of Object.entries(propHist)) if (d < today) for (const id of ids) (proposed[id] ||= []).push(`${d}T12:00:00`);
  const weekAgo = todayISO(new Date(Date.now() - 7 * 864e5));
  for (const w of wl) if (w.date >= weekAgo && w.date < today) for (const id of w.garmentIds || []) { const at = `${w.date}T12:00:00`; if (!(proposed[id] ||= []).includes(at)) proposed[id].push(at); }
  const withToday = (prop, b) => { const out = { ...prop }; if (b) for (const r of ['top', 'bottom', 'shoes']) { const id = b.pieces[r]?.id; if (id) out[id] = [...(out[id] || []), `${today}T12:00:00`]; } return out; };
  const pick = (res, avoidKey) => {
    const opts = res.options;
    return opts.find((o) => o.mode === mode && comboKey(o.pieces) !== avoidKey) || opts.find((o) => comboKey(o.pieces) !== avoidKey) || opts[0] || null;
  };

  // Rappel de changement de garde-robe : 14 jours avant, jusqu'à 3 semaines après le début de la période.
  const nc = nextChange(now); const sinceStart = daysSinceChange(now);
  const seasonTarget = nc.days <= 14 ? nc.period : sinceStart <= 21 ? periodAt(now) : null;
  let seasonBanner = '';
  if (seasonTarget && !(await store.repo.kvGet(`season:done:${seasonTarget}:${now.getFullYear()}`, false))) {
    const plan = seasonalPlan(all, seasonTarget);
    const n = plan.toStore.length + plan.toBringOut.length;
    if (n) seasonBanner = html`<section class="card" style="margin-top:14px;border-left:3px solid var(--champagne)"><div class="eyebrow">Changement de saison</div><p style="margin:4px 0 8px">Garde-robe <strong>${PERIODS[seasonTarget].name.toLowerCase()}</strong> : ${plan.toStore.length} pièce${plan.toStore.length > 1 ? 's' : ''} à ranger, ${plan.toBringOut.length} à ressortir.</p><a class="btn btn-sm" href="#/wardrobe/season">Préparer ma garde-robe</a></section>`;
  }
  const draw = () => {
    const occ = OCCASION_BY_ID[st.occasionId];
    const res = recommend({ garments: all, occasionId: st.occasionId, weather: w0.w, prefs, offsets: { italian: st.offset, classic: st.offset, modern: st.offset }, profileId: pid(), date: now, proposed });
    const best = pick(res);
    const resT = recommend({ garments: all, occasionId: defaultOccasion(tomorrowD, store.profile.kind), weather: w1.w, prefs, profileId: pid(), date: tomorrowD, now: tomorrowD.getTime(), proposed: withToday(proposed, best) });
    const bestT = pick(resT, best ? comboKey(best.pieces) : null);
    // Mémorise la proposition principale du jour (7 derniers jours gardés).
    if (best && !wornToday && st.offset === 0 && st.occasionId === defaultOccasion(now, store.profile.kind)) {
      const ids = ['top', 'bottom', 'shoes'].map((r) => best.pieces[r]?.id).filter(Boolean);
      if (JSON.stringify(propHist[today] || []) !== JSON.stringify(ids)) {
        const keep = Object.fromEntries(Object.entries(propHist).filter(([d]) => d >= todayISO(new Date(Date.now() - 7 * 864e5))));
        keep[today] = ids; Object.assign(propHist, keep); store.repo.kvSet(PROP_KEY, keep);
      }
    }
    const wxLine = (w) => html`${weatherSummary(w.w)} <span class="small muted">· ${w.real ? `${w.w.place}, ${w.w.source}` : 'estimation saisonnière — activez la météo pour plus de précision'}</span>`;

    let head; let pieces = null; let footer = '';
    if (wornToday && !st.showProposal) {
      const by = Object.fromEntries(all.map((g) => [g.id, g]));
      const ROLE = { haut: 'top', bas: 'bottom', veste: 'layer', manteau: 'outer', chaussures: 'shoes', ceinture: 'belt' };
      pieces = { accessories: [] };
      for (const g of (wornToday.garmentIds || []).map((id) => by[id]).filter(Boolean)) { const r = ROLE[g.category]; if (r && !pieces[r]) pieces[r] = g; else pieces.accessories.push(g); }
      head = html`<div class="eyebrow">Aujourd'hui vous portez</div><h2 style="margin:0">Tenue enregistrée</h2>`;
      footer = html`<button class="btn btn-sm" data-d="propose">Voir quand même une proposition</button>`;
    } else if (plannedToday && outBy[plannedToday.outfitId] && !st.showProposal) {
      pieces = idsToPieces(outBy[plannedToday.outfitId].garmentIds, all);
      head = html`<div class="eyebrow">Prévue au calendrier</div><h2 style="margin:0">${plannedToday.title}</h2>`;
      footer = html`<button class="btn btn-primary" data-d="wear-planned">${icon('check')} Je la porte</button><button class="btn btn-sm" data-d="propose">Autre proposition</button>`;
    } else if (best) {
      pieces = best.pieces;
      head = html`<div class="row-between" style="align-items:flex-start"><div><div class="eyebrow">Tenue du jour · ${MODE_NAME[best.mode]}</div><h2 style="margin:0">${occ.name}</h2></div>${scoreBadge(best.score)}</div>`;
      footer = html`<button class="btn btn-primary" data-d="wear">${icon('check')} Je la porte</button><button class="btn" data-d="other">${icon('rotate')} Autre</button><button class="btn" data-d="all">Voir les 3 propositions</button>`;
    }

    setHTML(box, html`<section class="card card-accent" aria-labelledby="daily-h">
      <div class="small" style="margin-bottom:10px">${icon('today')} <strong>${fmtDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</strong> — ${wxLine(w0)}${(() => { const n = all.filter((g) => g.availability === 'to-wash').length; return n ? html` · <a href="#/wardrobe/care">${n} pièce${n > 1 ? 's' : ''} au panier à linge</a>` : ''; })()}</div>
      ${!all.length ? html`<h2 id="daily-h" style="margin-top:0">Votre tenue du jour vous attend</h2><p>Ajoutez quelques pièces (haut, bas, chaussures) : SPREZZA vous proposera chaque matin une tenue prête, adaptée à la météo et à votre journée.</p><div class="btn-row"><a class="btn btn-primary" href="#/wardrobe/quick">${icon('camera')} Ajout rapide</a><a class="btn" href="#/outfits/templates">Inspiration</a></div>`
        : !pieces ? html`<h2 id="daily-h" style="margin-top:0">Pas encore de tenue complète</h2><p class="small">${res.info.missing.map((m) => m.text).join(' ') || 'Le dressing disponible ne permet pas de tenue complète pour cette occasion.'}</p><a class="btn btn-primary" href="#/wardrobe/quick">${icon('camera')} Ajouter une pièce</a>`
        : html`<div id="daily-h">${head}</div>
          <div class="chips" role="group" aria-label="Ma journée" style="margin:10px 0">${QUICK_OCCASIONS.map((id) => html`<button class="chip" data-occ="${id}" aria-pressed="${st.occasionId === id}">${OCCASION_BY_ID[id].name}</button>`)}</div>
          <div class="grid-2" style="align-items:start">
            <div class="piece-list">${piecesList(pieces).map(([r, g]) => pieceRow(r, g))}</div>
            <div><div class="mannequin-wrap">${outfitMannequin(pieces)}</div><div class="schema-label">Schéma — pas une photographie</div></div>
          </div>
          ${best && !wornToday && !plannedToday || (best && st.showProposal) ? html`<p class="small" style="margin-top:10px">${best.reasons.slice(0, 2).join(' ')}</p>${best.warnings.length ? html`<div class="callout callout-warn small">${best.warnings[0]}</div>` : ''}${res.backup?.changes?.length ? html`<p class="small"><strong>Plan B :</strong> ${res.backup.changes.join(' ; ')}.</p>` : ''}${upgradeBlock(best.upgrade)}` : ''}
          <div class="btn-row" style="margin-top:12px">${footer}</div>`}
    </section>
    ${seasonBanner}
    ${all.length ? html`<section class="card" style="margin-top:14px"><div class="row-between"><div><div class="eyebrow">Pour demain · ${fmtDate(tomorrow, { weekday: 'long', day: 'numeric' })}</div><p class="small" style="margin:4px 0 0">${wxLine(w1)}</p></div>
      ${plannedTomorrow ? html`<span class="tag tag-ok">Déjà prévue</span>` : bestT ? html`<button class="btn btn-sm" data-d="plan-tomorrow">${icon('calendar')} Préparer pour demain</button>` : ''}</div>
      ${plannedTomorrow && outBy[plannedTomorrow.outfitId] ? html`<p class="small" style="margin-top:8px">${piecesList(idsToPieces(outBy[plannedTomorrow.outfitId].garmentIds, all)).map(([, g]) => g.name).join(' · ')}</p>`
        : bestT ? html`<p class="small" style="margin-top:8px"><strong>${OCCASION_BY_ID[defaultOccasion(tomorrowD, store.profile.kind)].name} :</strong> ${piecesList(bestT.pieces).map(([, g]) => g.name).join(' · ')}</p>`
        : html`<p class="small muted">Pas de tenue complète disponible pour demain.</p>`}</section>` : ''}`);
    hydratePhotos(box);
    box.querySelectorAll('[data-occ]').forEach((b) => b.onclick = async () => { st.occasionId = b.dataset.occ; st.offset = 0; st.showProposal = true; await store.repo.kvSet(KEY(), { date: today, occasionId: st.occasionId }); draw(); });
    box.querySelectorAll('[data-d]').forEach((b) => b.onclick = async () => {
      const a = b.dataset.d;
      if (a === 'wear' && best) { await wearOutfit(best.pieces, { occasionId: st.occasionId }); renderDaily(box, { onShowAll }); }
      if (a === 'wear-planned') { await wearOutfit(pieces, { occasionId: plannedToday.occasionId, outfitId: plannedToday.outfitId }); renderDaily(box, { onShowAll }); }
      if (a === 'other') { st.offset++; draw(); }
      if (a === 'propose') { st.showProposal = true; draw(); }
      if (a === 'all') onShowAll?.(st.occasionId);
      if (a === 'plan-tomorrow' && bestT) { await addToCalendar(bestT.pieces, { date: tomorrow, occasionId: defaultOccasion(tomorrowD, store.profile.kind), title: `${MODE_NAME[bestT.mode]} — ${OCCASION_BY_ID[defaultOccasion(tomorrowD, store.profile.kind)].name}` }); renderDaily(box, { onShowAll }); }
    });
  };
  draw();
  void raw; void OUTFIT_MODES; void toast;
}
