// Import de l'agenda : fichiers .ics (Google, Outlook, Apple) et texte collé.
// Chaque événement reçoit l'occasion la plus probable ; règles pures, testées.

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Lecture d'une date iCalendar (DATE, DATE-TIME UTC « Z » ou locale). */
function icsDate(v, params = '') {
  const m = String(v).match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
  if (!m) return null;
  const [, y, mo, d, h, mi, , z] = m;
  if (!h || /VALUE=DATE(?!-)/.test(params)) return { date: `${y}-${mo}-${d}`, time: null, allDay: true };
  const dt = z ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi)) : new Date(+y, +mo - 1, +d, +h, +mi);
  return { date: iso(dt), time: `${pad(dt.getHours())}:${pad(dt.getMinutes())}`, allDay: false, at: dt };
}
const unescape = (s) => String(s || '').replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();

/**
 * Événements d'un fichier .ics, répétitions hebdomadaires/quotidiennes simples dépliées dans la fenêtre.
 * @returns {Array<{uid, title, location, date, time, allDay}>}
 */
export function parseICS(text, { from = new Date(), days = 60 } = {}) {
  const lines = String(text || '').replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + days);
  const out = []; let ev = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { ev = {}; continue; }
    if (line === 'END:VEVENT') { if (ev) expand(ev, start, end, out); ev = null; continue; }
    if (!ev) continue;
    const i = line.indexOf(':'); if (i < 0) continue;
    const [name, ...params] = line.slice(0, i).split(';'); const val = line.slice(i + 1);
    if (name === 'UID') ev.uid = val;
    else if (name === 'SUMMARY') ev.title = unescape(val);
    else if (name === 'LOCATION') ev.location = unescape(val);
    else if (name === 'DESCRIPTION') ev.description = unescape(val).slice(0, 300);
    else if (name === 'DTSTART') ev.start = icsDate(val, params.join(';'));
    else if (name === 'RRULE') ev.rrule = Object.fromEntries(val.split(';').map((p) => p.split('=')));
    else if (name === 'STATUS') ev.status = val;
    else if (name === 'EXDATE') (ev.exdates ||= []).push(...val.split(',').map((x) => icsDate(x)?.date).filter(Boolean));
  }
  return out.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
}
const DAYS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
function expand(ev, start, end, out) {
  if (!ev.start || ev.status === 'CANCELLED' || !ev.title) return;
  const base = { uid: ev.uid || `${ev.title}-${ev.start.date}`, title: ev.title, location: ev.location || '', description: ev.description || '', time: ev.start.time, allDay: ev.start.allDay };
  const first = new Date(`${ev.start.date}T12:00:00`);
  const push = (d) => { const ds = iso(d); if (d >= start && d < end && !(ev.exdates || []).includes(ds)) out.push({ ...base, uid: `${base.uid}|${ds}`, date: ds }); };
  const r = ev.rrule;
  if (!r) { push(first); return; }
  const until = r.UNTIL ? new Date(`${icsDate(r.UNTIL).date}T23:59:59`) : end;
  const count = r.COUNT ? +r.COUNT : Infinity; const interval = +(r.INTERVAL || 1);
  let n = 0;
  if (r.FREQ === 'DAILY') {
    for (let d = new Date(first); d <= until && d < end && n < count; d.setDate(d.getDate() + interval), n++) push(new Date(d));
  } else if (r.FREQ === 'WEEKLY') {
    const by = (r.BYDAY ? r.BYDAY.split(',').map((x) => DAYS[x.slice(-2)]) : [first.getDay()]).sort();
    const week0 = new Date(first); week0.setDate(first.getDate() - ((first.getDay() + 6) % 7)); // lundi
    for (let w = 0; n < count; w += interval) {
      const wk = new Date(week0); wk.setDate(week0.getDate() + w * 7);
      if (wk > until || wk >= end) break;
      for (const dd of by) { const d = new Date(wk); d.setDate(wk.getDate() + ((dd + 6) % 7)); if (d < first || d > until || n >= count) continue; n++; push(d); }
    }
  } else push(first); // autres répétitions : première occurrence seulement
}

const MONTHS = { janvier: 1, janv: 1, fevrier: 2, fevr: 2, fev: 2, mars: 3, avril: 4, avr: 4, mai: 5, juin: 6, juillet: 7, juil: 7, aout: 8, septembre: 9, sept: 9, octobre: 10, oct: 10, novembre: 11, nov: 11, decembre: 12, dec: 12 };
const WEEKDAYS = { dimanche: 0, dim: 0, lundi: 1, lun: 1, mardi: 2, mar: 2, mercredi: 3, mer: 3, jeudi: 4, jeu: 4, vendredi: 5, ven: 5, samedi: 6, sam: 6 };
/**
 * Texte collé, une ligne par rendez-vous : « 28/11 14h Rendez-vous client Dupont », « demain 9h30 ménage bureaux »,
 * « lundi dîner chez Paul », « 3 décembre mariage de Léa ».
 */
export function parseAgendaText(text, { now = new Date() } = {}) {
  const out = [];
  const today = new Date(now); today.setHours(12, 0, 0, 0);
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim(); if (!line) continue;
    const t = norm(line); let date = null;
    let m;
    if ((m = t.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/))) {
      const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : today.getFullYear();
      date = new Date(y, +m[2] - 1, +m[1], 12); if (!m[3] && date < today - 864e5 * 7) date.setFullYear(y + 1);
    } else if ((m = t.match(new RegExp(`\\b(\\d{1,2})(?:er)?\\s+(${Object.keys(MONTHS).join('|')})\\.?\\b`)))) {
      date = new Date(today.getFullYear(), MONTHS[m[2]] - 1, +m[1], 12); if (date < today - 864e5 * 7) date.setFullYear(date.getFullYear() + 1);
    } else if ((m = t.match(/\b(aujourd'?hui|ce soir|demain|apres-demain)\b/))) {
      date = new Date(today); date.setDate(today.getDate() + ({ "aujourd'hui": 0, aujourdhui: 0, 'ce soir': 0, demain: 1, 'apres-demain': 2 })[m[1]]);
    } else if ((m = t.match(new RegExp(`\\b(${Object.keys(WEEKDAYS).join('|')})\\b`)))) {
      date = new Date(today); const diff = (WEEKDAYS[m[1]] - today.getDay() + 7) % 7; date.setDate(today.getDate() + (diff || 7));
    }
    if (!date) continue;
    const dm = m; // date trouvée (même position dans la ligne d'origine : la normalisation garde les longueurs)
    const tm = t.match(/\b(\d{1,2})\s*(?:h|:)\s*(\d{2})?(?![\d/])/);
    const time = tm ? `${pad(+tm[1])}:${pad(+(tm[2] || 0))}` : null;
    const cut = [[dm.index, dm[0].length], ...(tm ? [[tm.index, tm[0].length]] : [])].sort((a, b) => b[0] - a[0]);
    let title = line; for (const [i, n] of cut) title = title.slice(0, i) + ' ' + title.slice(i + n);
    title = title.replace(/\s+/g, ' ').replace(/^[\s,:;–-]+|[\s,:;–-]+$/g, '').replace(/^(a|à)\s+/i, '').trim();
    out.push({ uid: `txt|${iso(date)}|${norm(title)}`, title: title || 'Rendez-vous', location: '', date: iso(date), time, allDay: !time });
  }
  return out.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
}

/** Règles : de la plus spécifique à la plus générale. */
const RULES = [
  ['interview', /entretien (d'?embauche|de recrutement|rh)|recrutement|job interview/],
  ['work-cleaning', /menage|nettoyage|chantier|intervention|prestation|vitres|remise en etat|desinfection|entretien des locaux|repassage|lavage/],
  ['wedding', /mariage|wedding|noces/],
  ['religious', /messe|bapteme|communion|enterrement|obseques|ceremonie religieuse|mosquee|eglise|synagogue/],
  ['chic-party', /gala|black tie|soiree (chic|habillee)|cocktail|vernissage/],
  ['important-meeting', /reunion importante|comite|conseil d'?administration|direction|banque|banquier|notaire|investisseur|signature|assemblee|tribunal|avocat/],
  ['client', /client|prospect|devis|visite (de|des) (locaux|site)|rdv commercial|appel d'?offre|syndic|agence immobiliere/],
  ['interview', /entretien/],
  ['elegant-dinner', /diner (chic|elegant|gastronomique)|restaurant (etoile|gastronomique)|etoile/],
  ['date', /rendez-vous amoureux|\bdate\b|saint-valentin|en amoureux/],
  ['birthday', /anniv/],
  ['restaurant', /restaurant|\bresto\b|diner|dejeuner|brasserie/],
  ['cafe', /\bcafe\b|brunch|apero|\bverre\b|gouter/],
  ['travel', /\bvol\b|avion|aeroport|\btrain\b|\bgare\b|voyage|\btgv\b/],
  ['sea', /plage|\bmer\b|bord de mer|arcachon|cap ferret|lacanau/],
  ['mountain', /\bski\b|randonnee|montagne|rando\b/],
  ['walk', /balade|promenade|\bparc\b|marche/],
  ['city', /shopping|cinema|\bexpo\b|musee|theatre|concert|\bville\b/],
  ['office', /reunion|meeting|\bpoint\b|\bcall\b|visio|bureau|seminaire|formation/],
  ['pro-meeting', /rendez-vous|\brdv\b|rencontre/],
  ['home', /teletravail|maison|a la maison/],
];
/** Occasion la plus probable d'un événement. */
export function occasionForEvent(ev) {
  const t = norm(`${ev.title || ''} ${ev.location || ''} ${ev.description || ''}`);
  for (const [id, re] of RULES) if (re.test(t)) return { occasionId: id, guessed: false };
  return { occasionId: 'daily', guessed: true };
}

/** Plusieurs événements le même jour : on s'habille pour le plus exigeant. */
export function dayPlan(events, formalityOf) {
  const by = {};
  for (const e of events) (by[e.date] ||= []).push(e);
  return Object.entries(by).sort(([a], [b]) => a.localeCompare(b)).map(([date, list]) => {
    // Un rendez-vous client ET du ménage le même jour : une seule tenue « Client + travail »
    const client = list.find((x) => ['client', 'pro-meeting'].includes(x.occasionId));
    const work = list.find((x) => x.occasionId === 'work-cleaning');
    if (client && work) return { date, main: { ...client, occasionId: 'client-work', title: `${client.title} + ${work.title}` }, others: list.filter((x) => x !== client && x !== work), combined: true };
    const main = [...list].sort((a, b) => formalityOf(b.occasionId) - formalityOf(a.occasionId))[0];
    return { date, main, others: list.filter((x) => x !== main) };
  });
}
