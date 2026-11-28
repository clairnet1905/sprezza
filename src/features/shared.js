// Composants et actions partagés entre écrans (cartes, propositions, sauvegarde, port).
import { html, raw } from '../lib/html.js';
import { icon, swatch, toast, todayISO, scoreLabel10, openModal, copyText } from '../components/ui.js';
import { garmentGlyph, mannequinSVG } from '../components/mannequin.js';
import { lookbookHTML } from '../components/lookbook.js';
import { ROLE_LABELS, ROLE_ORDER, AVAILABILITY, CATEGORY_BY_ID, SUB_INFO, FITS } from '../data/taxonomy.js';
import { GROUP } from '../domain/explain.js';
import { howToWear, wearRole } from '../domain/how-to-wear.js';
import { OUTFIT_MODES, OCCASION_BY_ID } from '../data/occasions.js';
import { store, pid, hydratePhotos, prefs as loadPrefsS, savePrefs as savePrefsS } from '../state.js';
import { scoreOutfit } from '../domain/scoring.js';
import { buildEnv } from '../domain/recommend.js';
import { uid } from '../repositories/db.js';
import { roleOf, isAvailable, comboKey, workKitStatus } from '../domain/recommend.js';
import { WORK_SHOPS, WORK_TIPS } from '../data/workwear.js';
import { colorHex, colorName } from '../domain/colors.js';
import { afterWear } from '../domain/care.js';
import { inspirationQuery, genderWord } from '../services/pexels.js';

/** Bloc « Inspiration : photos réelles » (chargé à la demande, voir app.js). */
export function inspireBlock(query, label = 'Inspiration : photos réelles similaires') {
  return html`<details class="disclosure"><summary>${label}</summary><div style="margin-top:8px"><button type="button" class="btn btn-sm" data-inspire="${query}">${icon('search')} Afficher des photos</button> <span class="small muted">Recherche : « ${query} »</span><div class="inspire-out" aria-live="polite"></div></div></details>`;
}

export const AVAIL_LABEL = Object.fromEntries(AVAILABILITY.map(([id, l]) => [id, l]));
export const MODE_NAME = Object.fromEntries(OUTFIT_MODES.map((m) => [m.id, m.name]));

export function garmentThumb(g, cls = 'g-thumb') {
  return html`<div class="${cls}">${g.photoIds?.length ? html`<img data-photo="${g.photoIds[0]}" alt="${g.name}" loading="lazy">` : garmentGlyph(roleOf(g), g.color?.hex)}</div>`;
}

export function garmentCard(g, { versatility } = {}) {
  const avail = isAvailable(g);
  return html`<a class="g-card" href="#/wardrobe/${g.id}">
    ${garmentThumb(g)}
    ${!avail ? html`<span class="g-badge tag tag-warn">${AVAIL_LABEL[g.availability]}</span>` : ''}
    ${g.favorite ? html`<span class="g-fav" aria-label="Favori" style="color:var(--champagne-ink)">${icon('heart', { filled: true })}</span>` : ''}
    <div class="g-body"><div class="g-title">${g.name}</div>
      <div class="g-meta">${g.color?.hex ? swatch(g.color.hex, g.color.name) : ''}<span>${g.color?.name || ''}</span><span>· ${SUB_INFO[g.sub]?.name || CATEGORY_BY_ID[g.category]?.name || ''}</span></div>
      ${typeof versatility === 'number' ? html`<div class="g-meta"><span class="tag ${versatility === 0 ? 'tag-warn' : ''}" title="Nombre de tenues de base possibles avec le reste du dressing">${versatility} tenue${versatility > 1 ? 's' : ''}</span>${g.tags?.includes('à compléter') ? html`<span class="tag">à compléter</span>` : ''}</div>` : ''}
    </div></a>`;
}

export function pieceRow(role, g, { actions = '' } = {}) {
  if (!g) return '';
  return html`<div class="piece" data-role="${role}">
    <div class="mini-thumb">${g.photoIds?.length ? html`<img data-photo="${g.photoIds[0]}" alt="" loading="lazy">` : garmentGlyph(roleOf(g), g.color?.hex)}</div>
    <div class="piece-info"><div class="piece-role">${ROLE_LABELS[role] || role}</div><div class="piece-name">${g.name}</div>
      <div class="g-meta">${g.color?.hex ? swatch(g.color.hex) : ''}<span>${g.color?.name || ''}${g.material ? ` · ${g.material}` : ''}</span></div></div>
    ${actions}</div>`;
}

export function criteriaView(score, { compact = false } = {}) {
  return html`<div class="criteria">${score.criteria.map((c) => html`<div class="crit ${c.score === null ? 'crit-na' : ''}">
    <span>${c.name}${c.estimated ? html` <span class="tag" title="Estimé à partir des informations saisies, non observé">estimé</span>` : ''}</span>
    <span class="num">${c.score === null ? 'non évaluable' : `${String(c.score).replace('.', ',')} / ${c.max}`}</span>
    <div class="crit-bar" aria-hidden="true"><span style="width:${raw(c.score === null ? 0 : Math.round((c.score / c.max) * 100))}%"></span></div>
    ${!compact && c.reason ? html`<span class="small muted" style="grid-column:1/-1">${c.reason}</span>` : ''}</div>`)}</div>`;
}

export function scoreBadge(score) {
  if (score.score100 !== null && score.score100 !== undefined) {
    return html`<div class="score"><div class="score-num">${score.score100}<small>/100</small></div><div class="small muted">${scoreLabel10(score.score100 / 10)}</div><div class="small muted">couverture ${score.assessedWeight}/100</div></div>`;
  }
  if (score.scoreRange) return html`<div class="score"><div class="score-num" style="font-size:26px">${score.scoreRange[0]}–${score.scoreRange[1]}<small>/100</small></div><div class="small muted">plage : ${score.assessedWeight}/100 points évaluables</div></div>`;
  return html`<div class="score"><div class="small muted">Note non calculable</div></div>`;
}

export function piecesList(pieces) {
  return ROLE_ORDER.flatMap((role) => {
    if (role === 'accessory') return (pieces.accessories || []).map((a) => [role, a]);
    return pieces[role] ? [[role, pieces[role]]] : [];
  });
}

export function outfitMannequin(pieces, label) {
  return lookbookHTML(pieces, { label: label || 'Tenue composée avec les photos de vos pièces' });
}
// Toucher le mannequin l'agrandit (une seule écoute pour toute l'application).
if (typeof document !== 'undefined' && !window.__mannequinZoom) {
  window.__mannequinZoom = true;
  document.addEventListener('click', (e) => {
    const w = e.target.closest?.('.mannequin-wrap');
    if (!w || !w.querySelector('.lookbook') || w.closest('.modal')) return;
    openModal({ title: 'Aperçu de la tenue', body: html`<div class="mannequin-big">${raw(w.innerHTML)}</div><p class="small muted" style="text-align:center">Les photos de vos pièces, posées comme la tenue se porte. Pour la voir portée par une personne : « Voir la tenue portée ».</p>` });
  });
}
/** Bouton « Photo réaliste » : envoie les photos des pièces et une consigne à ChatGPT (ou une autre app d'images). */
export function realisticButton(pieces, { occasionId = '' } = {}) {
  const ids = ['outer', 'layer', 'top', 'bottom', 'belt', 'shoes'].map((r) => pieces[r]?.id).filter(Boolean);
  return ids.length ? html`<button type="button" class="btn btn-sm btn-ghost realistic-btn" data-realistic="${ids.join(',')}" data-occ="${occasionId}">${icon('camera')} Voir la tenue portée (photo réaliste)</button>` : '';
}
const ROLE_FR = { outer: 'Manteau', layer: 'Veste', top: 'Haut', bottom: 'Bas', belt: 'Ceinture', shoes: 'Chaussures', accessory: 'Accessoire' };
export function realisticPrompt(list, opts = {}) {
  const p = {}; for (const [r, g] of list) if (!p[r]) p[r] = g;
  return wearPrompt(p, opts);
}
const SETTING = {
  business: 'devant un immeuble de bureaux élégant, en journée',
  evening: 'en terrasse d\'un beau restaurant en début de soirée, lumière chaude',
  ceremony: 'devant une belle salle de réception, en journée',
  casual: 'dans une rue piétonne d\'un centre-ville français',
  summer: 'au bord de la mer, lumière d\'été',
  outdoor: 'sur un sentier, paysage naturel',
  work: 'dans un local professionnel propre et lumineux',
  clientwork: 'devant l\'entrée d\'un immeuble de bureaux, en journée',
};
const SEASON_FR = (m) => (m <= 1 || m === 11 ? 'en hiver' : m <= 4 ? 'au printemps' : m <= 7 ? 'en été' : 'en automne');
function pieceLine(role, g) {
  const fit = ['outer', 'layer', 'top', 'bottom'].includes(role) ? FITS.find((f) => f[0] === g.fit)?.[1] : null;
  const bits = [g.color?.name?.toLowerCase(), g.pattern && g.pattern !== 'Uni' ? g.pattern.toLowerCase() : '', g.material?.toLowerCase(), fit ? `coupe ${fit.toLowerCase()}` : '', g.brand].filter(Boolean);
  return `${ROLE_FR[role]} : ${g.name.replace(/\s*\(démo\)/, '')}${bits.length ? ` (${bits.join(', ')})` : ''}`;
}
/** Consigne complète pour ChatGPT (ou une autre app d'images) : pièces, façon de les porter, décor, cadrage. */
export function wearPrompt(p, { occasion = null, style = null, date = new Date(), env = null } = {}) {
  const prof = store.profile || {};
  const who = prof.kind === 'woman' ? 'une femme' : prof.kind === 'child' ? 'un enfant' : 'un homme';
  const h = prof.height ? `, mesurant environ ${(prof.height / 100).toFixed(2).replace('.', ',')} m` : '';
  const roles = ['outer', 'layer', 'top', 'bottom', 'belt', 'shoes'].filter((r) => p[r]);
  const acc = (p.accessories || []).filter((a) => !['lunettes-vue', 'montre-connectee'].includes(a.sub));
  const lines = [...roles.map((r) => pieceLine(r, p[r])), ...acc.map((a) => pieceLine('accessory', a))];
  const where = SETTING[GROUP[occasion?.id]] || SETTING.casual;
  return [
    ...(prof.selfPhotoId ? [
      `Crée une photo réaliste, en pied, de la personne de la première photo jointe (moi) : garde exactement mon visage, ma coiffure, ma silhouette et ma morphologie, et habille-moi avec la tenue ci-dessous.`,
      `Les autres photos sont mes vêtements : reproduis fidèlement leurs couleurs, matières, motifs et coupes, sans rien inventer.`,
    ] : [
      `Crée une photo réaliste, en pied, d'${who}${h}, élégant et naturel, qui porte exactement la tenue ci-dessous.`,
      `Je joins les photos de mes vêtements : reproduis fidèlement leurs couleurs, matières, motifs et coupes, sans rien inventer.`,
    ]),
    '',
    'La tenue :',
    ...lines.map((l, i) => `${i + 1}. ${l}`),
    '',
    'Comment la porter :',
    ...howToWear(p, { occasion, env: env || {} }).map((w) => `- ${wearRole(w.role, p[w.role])} : ${w.short.charAt(0).toLowerCase()}${w.short.slice(1)}`),
    '- vêtements bien repassés, à la bonne taille, ni trop serrés ni trop amples',
    `${style ? `Style : ${style.label} (${style.why}). ` : ''}${occasion ? `Occasion : ${occasion.name.toLowerCase()}. ` : ''}`.trim(),
    `Décor : ${where}, ${SEASON_FR(date.getMonth())}.`,
    'Photo : format portrait vertical, cadrage de la tête aux pieds, lumière naturelle douce, rendu de photographie de mode, pose détendue.',
    'Interdit : logos ajoutés, accessoires en plus, vêtements différents de mes photos.',
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
}
/** « Comment la porter » : une ligne par pièce (rentré ou non, bas de pantalon, col, chaussettes…). */
export function wearBlock(pieces, { occasion = null, env = null, howTo = null, open = true } = {}) {
  const list = howTo || howToWear(pieces, { occasion, env: env || {} });
  if (!list.length) return '';
  return html`<details class="wear-block" ${open ? raw('open') : ''}><summary>👔 Comment la porter</summary>
    <ul class="clean wear-list">${list.map((w) => html`<li><span class="wear-role">${wearRole(w.role, pieces[w.role])}</span><span><strong>${w.tip.split(' ; ')[0]}</strong>${w.tip.includes(' ; ') ? html`<span class="small muted"> — ${w.tip.split(' ; ').slice(1).join(' ; ')}</span>` : ''}</span></li>`)}</ul></details>`;
}
/** Bloc sous la tenue du jour : la consigne à copier pour ChatGPT. */
export function promptBlock(pieces, { occasion = null, style = null, env = null } = {}) {
  const text = wearPrompt(pieces, { occasion, style, env });
  const withPhoto = ['outer', 'layer', 'top', 'bottom', 'belt', 'shoes'].map((r) => pieces[r]).filter((g) => g?.photoIds?.length);
  return html`<details class="prompt-block"><summary>${icon('camera')} Consigne pour ChatGPT : voir cette tenue portée</summary>
    <ol class="small prompt-steps"><li>Touchez <strong>Copier la consigne</strong>.</li><li>Dans ChatGPT, joignez les photos de vos pièces${withPhoto.length ? ` (${withPhoto.length} ont une photo dans le dressing)` : ''}, puis collez la consigne.</li>${store.profile?.selfPhotoId ? html`<li>Votre photo (Profil) est jointe en premier avec « Voir la tenue portée » : ChatGPT vous habille vous.</li>` : html`<li>Pour vous voir vous-même : ajoutez une fois votre photo en pied dans <a href="#/profile">Profil › Ma photo</a>, elle sera jointe automatiquement.</li>`}</ol>
    <textarea class="prompt-text" readonly rows="12" aria-label="Consigne pour ChatGPT">${text}</textarea>
    <div class="btn-row"><button type="button" class="btn btn-sm btn-primary" data-copyprompt>${icon('copy')} Copier la consigne</button>${realisticButton(pieces, { occasionId: occasion?.id || '' })}<a class="btn btn-sm btn-ghost" href="https://chatgpt.com/" target="_blank" rel="noopener">Ouvrir ChatGPT</a></div>
  </details>`;
}
if (typeof document !== 'undefined' && !window.__copyPrompt) {
  window.__copyPrompt = true;
  document.addEventListener('click', async (e) => {
    const b = e.target.closest?.('[data-copyprompt]'); if (!b) return;
    const t = b.closest('.prompt-block')?.querySelector('.prompt-text'); if (!t) return;
    await copyText(t.value); toast('Consigne copiée : collez-la dans ChatGPT avec vos photos');
  });
}
if (typeof document !== 'undefined' && !window.__realisticBtn) {
  window.__realisticBtn = true;
  document.addEventListener('click', async (e) => {
    const b = e.target.closest?.('[data-realistic]'); if (!b) return;
    e.stopPropagation();
    const ids = b.dataset.realistic.split(',');
    const gs = (await Promise.all(ids.map((id) => store.repo.get('garments', id)))).filter(Boolean);
    const list = gs.map((g) => [['outer', 'layer', 'top', 'bottom', 'belt', 'shoes'].find((r) => roleOf(g) === r) || 'top', g]);
    const prompt = realisticPrompt(list, { occasion: OCCASION_BY_ID[b.dataset.occ] || null });
    // Photos : version boutique si elle existe, sinon la photo principale
    const files = [];
    const me = store.profile?.selfPhotoId ? await store.repo.get('photos', store.profile.selfPhotoId) : null;
    if (me?.blob) files.push(new File([me.blob], `1-moi.${(me.blob.type || 'image/jpeg').split('/')[1].replace('jpeg', 'jpg')}`, { type: me.blob.type || 'image/jpeg' }));
    for (const g of gs) {
      let rec = null;
      for (const pid2 of g.photoIds || []) { const r = await store.repo.get('photos', pid2); if (r?.cutout) { rec = r; break; } if (!rec) rec = r; }
      if (rec?.blob) files.push(new File([rec.blob], `${g.name.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40)}.${(rec.blob.type || 'image/jpeg').split('/')[1].replace('jpeg', 'jpg')}`, { type: rec.blob.type || 'image/jpeg' }));
    }
    await copyText(prompt);
    if (files.length && navigator.canShare?.({ files })) {
      try { await navigator.share({ files, text: prompt, title: 'Ma tenue' }); return; } catch (err) { if (err?.name === 'AbortError') return; }
    }
    openModal({ title: 'Voir la tenue portée', body: html`<p>La consigne est <strong>copiée</strong>. ${files.length ? `Ce navigateur ne peut pas partager les ${files.length} photo(s) directement :` : 'Aucune de ces pièces n\'a de photo :'} ouvrez ChatGPT, joignez les photos de vos pièces (depuis votre galerie ou le dressing), puis collez la consigne.</p>
      <pre class="small" style="white-space:pre-wrap;background:var(--surface-2);padding:10px;border-radius:8px">${prompt}</pre>
      <div class="btn-row"><a class="btn btn-primary" href="https://chatgpt.com/" target="_blank" rel="noopener">Ouvrir ChatGPT</a></div>
      <p class="small muted">ChatGPT génère une image à partir de vos photos : le rendu est une illustration réaliste, pas une vraie photo de vous. Vos photos sont envoyées à ChatGPT seulement si vous les joignez.</p>` });
  });
}
/** Légende sous le mannequin. */
export const MANNEQUIN_NOTE = 'Vos pièces, posées comme portées · touchez pour agrandir';

/** Carte de proposition (Aujourd'hui, Tenues, Avec quoi le porter). */
/** Ligne de pièce cliquable : ouvre le dressing pour choisir une autre pièce de ce rôle. */
export function pickRow(role, g) {
  return html`<button type="button" class="piece piece-pick" data-pick="${role}" aria-label="Changer ${ROLE_LABELS[role] || role} : ${g.name} (choisir dans mon dressing)">${pieceRow(role, g, { actions: html`<span class="pick-hint">${icon('rotate')} Changer</span>` })}</button>`;
}

/**
 * Choisir une pièce dans son dressing pour une tenue : toutes les pièces du même rôle, avec photo,
 * classées par note de la tenue obtenue ; les pièces au lavage restent visibles mais grisées.
 * @param {{role, pieces, garments, occasion, weather?, mode?, onPick:(g|null)=>void}} o
 */
export function openDressingPicker({ role, pieces, garments, occasion, weather = null, mode = 'italian', onPick }) {
  const env = buildEnv({ weather, date: new Date() });
  const current = pieces[role];
  const list = garments.filter((g) => roleOf(g) === role).map((g) => {
    const sc = scoreOutfit({ ...pieces, [role]: g }, { occasion, env, mode, weather: env });
    return { g, score: sc.normalized, ok: isAvailable(g) };
  }).sort((a, b) => Number(b.ok) - Number(a.ok) || (b.score ?? 0) - (a.score ?? 0) || a.g.name.localeCompare(b.g.name));
  const optional = ['layer', 'outer'].includes(role);
  const body = html`<p class="small muted">Classées selon la note de la tenue avec chaque pièce${occasion ? ` (« ${occasion.name} »)` : ''}. Touchez une pièce pour la mettre dans la tenue.</p>
    ${optional && current ? html`<button type="button" class="btn btn-sm" data-none style="margin-bottom:10px">Sans ${ROLE_LABELS[role]?.toLowerCase() || 'cette pièce'}</button>` : ''}
    <div class="picker-grid">${list.map(({ g, score, ok }) => html`<button type="button" class="picker-card ${g.id === current?.id ? 'is-current' : ''}" data-g="${g.id}" ${ok ? '' : raw('disabled')}>
      <div class="picker-photo">${g.photoIds?.length ? html`<img data-photo="${g.photoIds[0]}" alt="" loading="lazy">` : garmentGlyph(roleOf(g), g.color?.hex)}</div>
      <div class="picker-name">${g.name}</div>
      <div class="small">${ok ? html`<span class="tag ${score >= 85 ? 'tag-ok' : score >= 70 ? '' : 'tag-warn'}">${score ?? '—'}/100</span>` : html`<span class="tag">${AVAILABILITY.find(([id]) => id === g.availability)?.[1] || 'Indisponible'}</span>`}${g.id === current?.id ? html` <span class="tag tag-gold">Actuelle</span>` : ''}</div></button>`)}</div>
    ${list.length ? '' : html`<p>Aucune pièce de ce type dans votre dressing.</p>`}
    <p class="small" style="margin-top:12px"><a href="#/wardrobe">Ouvrir tout le dressing</a> · <a href="#/wardrobe/quick">Ajouter une pièce</a></p>`;
  openModal({ title: `Choisir dans mon dressing : ${ROLE_LABELS[role] || role}`, wide: true, body, onMount(b, close) {
    hydratePhotos(b);
    b.querySelectorAll('[data-g]').forEach((btn) => btn.onclick = () => { close(); onPick(garments.find((x) => x.id === btn.dataset.g)); });
    b.querySelector('[data-none]')?.addEventListener('click', () => { close(); onPick(null); });
  } });
}

/** Kit tenue de travail (ménage) : ce que l'on a, ce qui manque, avec budget et recherche. */
export function workKitBlock(garments, { tips = true } = {}) {
  const st = workKitStatus(garments);
  const miss = st.filter((k) => !k.ok);
  const total = miss.reduce((a, k) => [a[0] + k.item.budget[0], a[1] + k.item.budget[1]], [0, 0]);
  return html`<div class="callout upgrade" style="margin-top:10px"><div class="eyebrow">Kit tenue de travail (ménage)</div>
    <ul class="clean" style="margin:6px 0">${st.map((k) => html`<li style="padding:5px 0;border-bottom:1px solid var(--line)">
      <div class="row-between" style="gap:8px;align-items:flex-start"><div>${k.ok ? icon('check') : ''} <strong>${k.item.name}</strong>
        <div class="small muted">${k.ok ? `Vous avez : ${k.have.map((g) => g.name).join(', ')}` : `${k.have.length ? `Vous avez ${k.have.map((g) => g.name).join(', ')} ; ` : ''}${k.item.why}`}</div></div>
        ${k.ok ? html`<span class="tag tag-ok">OK</span>` : html`<span class="row" style="gap:6px;flex-wrap:nowrap"><span class="small">${k.item.budget[0]}–${k.item.budget[1]} €</span><a class="btn btn-sm" href="#/shopping?q=${encodeURIComponent(k.item.query)}">${icon('search')}</a></span>`}</div></li>`)}</ul>
    ${miss.length ? html`<p class="small">Pour compléter : environ <strong>${total[0]}–${total[1]} €</strong> (${WORK_SHOPS}).</p>` : html`<p class="small">${icon('check')} Kit complet : vos belles pièces restent à l'abri.</p>`}
    ${tips ? html`<details class="disclosure"><summary>Bien choisir ses vêtements de travail</summary><ul class="ticks small">${WORK_TIPS.map((t) => html`<li>${t}</li>`)}</ul></details>` : ''}
  </div>`;
}

/** Encadré « La pièce qui manque à cette tenue » : une pièce non possédée qui l'améliorerait. */
export function upgradeBlock(u) {
  if (!u) return '';
  const c = u.item;
  const q = `${c.name.toLowerCase()} homme ${c.material.toLowerCase()}`;
  return html`<div class="callout upgrade" style="margin-top:10px"><div class="row" style="gap:10px;align-items:flex-start">
    ${swatch(colorHex(c.color), colorName(c.color))}
    <div style="flex:1"><div class="eyebrow">La pièce qui manque à cette tenue</div>
      <div><strong>${c.name}</strong> <span class="small muted">· ${c.material} · ${c.budget[0]}–${c.budget[1]} €</span></div>
      <div class="small">${u.text}</div>
      <div class="btn-row" style="margin-top:6px"><a class="btn btn-sm" href="#/shopping?q=${encodeURIComponent(q)}">${icon('search')} La chercher</a><a class="btn btn-sm btn-ghost" href="#/capsule">Voir ma capsule</a></div>
      <div class="small muted">Suggestion d'achat : vous ne l'avez pas dans votre dressing.</div></div></div></div>`;
}

/** « Style italien · Italie — polo en maille, mocassins, tons beige et marine ». */
export function styleTag(st) {
  if (!st) return '';
  return html`<p class="style-tag"><span class="tag tag-gold">Style ${st.label}</span> <span class="small muted">${st.origin} · ${st.why}</span></p>`;
}

export function proposalCard(opt, idx, { actions = true, title } = {}) {
  const p = opt.pieces;
  return html`<article class="card card-accent proposal" data-idx="${idx}">
    <div class="proposal-head"><div><div class="eyebrow">Option ${idx + 1}</div><h3>${title || opt.title || MODE_NAME[opt.mode] || 'Tenue'}</h3>${opt.idea ? html`<p class="small muted" style="margin:2px 0 6px">${opt.idea}</p>` : ''}${styleTag(opt.style)}
      <div class="chips">${opt.palette.map((id) => html`<span class="tag">${swatch(colorHex(id))} ${colorName(id)}</span>`)}</div></div>
      ${scoreBadge(opt.score)}</div>
    <div class="grid-2" style="align-items:start">
      <div class="piece-list">${piecesList(p).map(([role, g]) => pieceRow(role, g, { actions: actions && role !== 'accessory' && role !== 'belt' ? html`<div class="row" style="gap:4px"><button class="btn btn-ghost btn-icon btn-sm" data-act="replace" data-role="${role}" aria-label="Remplacer cette pièce : ${g.name}" title="Remplacer cette pièce">${icon('swap')}</button><button class="btn btn-ghost btn-icon btn-sm" data-act="keep" data-role="${role}" data-id="${g.id}" aria-label="Garder cette pièce : ${g.name}" title="Garder cette pièce">${icon('lock')}</button></div>` : '' }))}
        ${opt.missing.map((m) => html`<div class="piece piece-missing"><div class="piece-info"><div class="piece-role">Manquant</div><div class="piece-name">${m}</div><div class="small muted">Non possédé — aucune pièce inventée.</div></div>${actions ? html`<a class="btn btn-sm" href="#/shopping?q=${encodeURIComponent(m)}">Chercher</a>` : ''}</div>`)}
      </div>
      <div><div class="mannequin-wrap">${outfitMannequin(p)}</div><div class="schema-label">${MANNEQUIN_NOTE}</div><div style="text-align:center;margin-top:4px">${realisticButton(p)}</div></div>
    </div>
    ${wearBlock(p, { howTo: opt.howTo, open: idx === 0 })}
    <ul class="ticks">${opt.reasons.map((r) => html`<li>${r}</li>`)}</ul>
    ${upgradeBlock(opt.upgrade)}
    ${opt.warnings.length ? html`<div class="callout callout-warn">${opt.warnings.map((w) => html`<div>${w}</div>`)}</div>` : ''}
    <details class="disclosure"><summary>Détail de la note (grille B18)</summary>${criteriaView(opt.score)}
      ${opt.bonus?.length ? html`<p class="small muted" style="margin-top:8px">Classement (distinct de la note d'élégance) : ${opt.bonus.join(' ; ')}</p>` : ''}</details>
    ${Object.keys(opt.alternatives || {}).length ? html`<details class="disclosure"><summary>Alternatives</summary>${Object.entries(opt.alternatives).map(([role, alts]) => html`<p class="small"><strong>${ROLE_LABELS[role]} :</strong> ${alts.map((a) => `${a.garment?.name || 'sans'}${a.score !== null ? ` (${a.score})` : ''}`).join(' · ')}</p>`)}</details>` : ''}
    ${inspireBlock(inspirationQuery(p, { gender: genderWord() }))}
    ${actions ? html`<div class="btn-row">
      <button class="btn btn-primary" data-act="wear">${icon('check')} Je porte cette tenue</button>
      <button class="btn" data-act="save">${icon('heart')} Sauvegarder</button>
      <button class="btn" data-act="other">${icon('rotate')} Autre combinaison</button>
      <button class="btn" data-act="calendar">${icon('calendar')} Ajouter au calendrier</button>
      <button class="btn" data-act="similar">${icon('search')} Chercher une pièce similaire</button>
    </div>
    <div class="row small" style="gap:6px"><span class="muted">Votre avis :</span>
      <button class="chip" data-fb="like">J'aime</button><button class="chip" data-fb="too-formal">Trop formel</button><button class="chip" data-fb="too-casual">Pas assez habillé</button><button class="chip" data-fb="too-warm">Trop chaud</button><button class="chip" data-fb="too-cold">Pas assez chaud</button><button class="chip" data-fb="no-fit">Ne me va pas</button><button class="chip" data-fb="dislike">👎 Je n'aime pas</button></div>` : ''}
  </article>`;
}

// ---------- Actions persistantes ----------
export function piecesToIds(pieces) {
  const out = {};
  for (const role of ['top', 'bottom', 'layer', 'outer', 'shoes', 'belt']) if (pieces[role]) out[role] = pieces[role].id;
  out.accessories = (pieces.accessories || []).map((a) => a.id);
  return out;
}
export function idsToPieces(ids, garments) {
  const by = Object.fromEntries(garments.map((g) => [g.id, g]));
  const p = {};
  for (const role of ['top', 'bottom', 'layer', 'outer', 'shoes', 'belt']) if (ids?.[role] && by[ids[role]]) p[role] = by[ids[role]];
  p.accessories = (ids?.accessories || []).map((id) => by[id]).filter(Boolean);
  return p;
}

export async function saveOutfit(pieces, { name, occasionId, mode, score, source = 'generator', missing = [], favorite = false, silent = false } = {}) {
  const rec = {
    id: uid('outfit'), profileId: pid(), name: name || `${MODE_NAME[mode] || 'Tenue'} — ${OCCASION_BY_ID[occasionId]?.name || 'Libre'}`,
    garmentIds: piecesToIds(pieces), key: comboKey(pieces), occasionId: occasionId || null, mode: mode || null, source,
    score: score ? { score100: score.score100, scoreRange: score.scoreRange, assessedWeight: score.assessedWeight } : null,
    missingItems: missing, favorite, palette: [...new Set(Object.values(pieces).flat().filter((g) => g && g.color).map((g) => g.color.id))],
  };
  await store.repo.put('outfits', rec);
  if (!silent) toast('Tenue sauvegardée');
  return rec;
}

export async function wearOutfit(pieces, { date = todayISO(), occasionId = null, outfitId = null, keepDays = 0 } = {}) {
  const ids = Object.values(piecesToIds(pieces)).flat().filter(Boolean);
  await store.repo.put('wearlog', { id: uid('wear'), profileId: pid(), date, occasionId, outfitId, garmentIds: ids });
  const all = await store.repo.all('garments', (g) => ids.includes(g.id));
  const autoBasket = await store.repo.kvGet('pref:autobasket', true);
  const basketed = [];
  for (const g of all) {
    const next = afterWear({ ...g, lastWornAt: new Date(date + 'T12:00:00').toISOString(), wearCount: (g.wearCount || 0) + 1 }, { autoBasket, minWears: keepDays });
    if (next.availability === 'to-wash' && g.availability !== 'to-wash') basketed.push(g.name);
    await store.repo.put('garments', next, { silent: true });
  }
  if (basketed.length) setTimeout(() => toast(`Panier à linge : ${basketed.join(', ')}`, { action: 'Voir', onAction: () => { location.hash = '#/wardrobe/care'; }, timeout: 7000 }), 1200);
  // Un calendrier planifié ce jour-là devient « porté »
  const cal = await store.repo.all('calendar', (c) => c.profileId === pid() && c.date === date && c.status === 'planned');
  for (const c of cal) await store.repo.put('calendar', { ...c, status: 'worn' });
  toast('Bonne journée — tenue enregistrée dans l\'historique');
}

export async function addToCalendar(pieces, { date, occasionId, title, outfitId = null, silent = false } = {}) {
  let oid = outfitId;
  if (!oid) { const o = await saveOutfit(pieces, { occasionId, name: title, source: 'calendar', silent }); oid = o.id; }
  await store.repo.put('calendar', { id: uid('cal'), profileId: pid(), date, occasionId: occasionId || null, outfitId: oid, title: title || OCCASION_BY_ID[occasionId]?.name || 'Tenue', status: 'planned' });
  if (!silent) toast(`Ajouté au calendrier le ${new Date(date + 'T12:00:00').toLocaleDateString('fr-FR')}`);
}

/**
 * Suppression d'un vêtement — règle documentée :
 * 1. la fiche et toutes ses photos (et variantes) sont supprimées ;
 * 2. les tenues qui la référencent perdent ce rôle et reçoivent « Pièce supprimée : nom » dans missingItems ;
 * 3. les liens capsule et liste d'envies vers cette fiche sont retirés ; l'historique de port garde la date mais plus l'identifiant.
 */
export async function deleteGarment(g) {
  for (const ph of g.photoIds || []) await store.repo.remove('photos', ph);
  const outs = await store.repo.all('outfits', (o) => Object.values(o.garmentIds || {}).flat().includes(g.id));
  for (const o of outs) {
    const ids = { ...o.garmentIds };
    for (const k of Object.keys(ids)) {
      if (Array.isArray(ids[k])) ids[k] = ids[k].filter((x) => x !== g.id);
      else if (ids[k] === g.id) delete ids[k];
    }
    await store.repo.put('outfits', { ...o, garmentIds: ids, missingItems: [...(o.missingItems || []), `Pièce supprimée : ${g.name}`] }, { silent: true });
  }
  const capKey = `capsule:${g.profileId}`;
  const cap = await store.repo.kvGet(capKey, null);
  if (cap?.items) {
    let changed = false;
    for (const v of Object.values(cap.items)) if (v.garmentId === g.id) { delete v.garmentId; changed = true; }
    if (changed) await store.repo.kvSet(capKey, cap);
  }
  const wl = await store.repo.all('wearlog', (w) => (w.garmentIds || []).includes(g.id));
  for (const w of wl) await store.repo.put('wearlog', { ...w, garmentIds: w.garmentIds.filter((x) => x !== g.id), removedNames: [...(w.removedNames || []), g.name] }, { silent: true });
  const wish = await store.repo.all('wishlist', (w) => w.linkedGarmentId === g.id);
  for (const w of wish) await store.repo.put('wishlist', { ...w, linkedGarmentId: null }, { silent: true });
  await store.repo.remove('garments', g.id);
}

/** « Je n'aime pas » : la tenue entière, l'association haut + bas, ou une pièce mise de côté 2 semaines. Réversible dans Profil. */
export function dislikeDialog(pieces, onDone) {
  const list = piecesList(pieces).filter(([r]) => ['top', 'bottom', 'layer', 'outer', 'shoes'].includes(r));
  openModal({ title: 'Qu\'est-ce qui ne vous plaît pas ?', body: html`<p class="small muted">L'application s'en souviendra pour les prochaines tenues. Tout est réversible dans Profil.</p>
    <div class="kbd-list">
      <label class="check"><input type="radio" name="dk" value="combo" checked> Cette tenue entière : ne plus me la proposer</label>
      ${pieces.top && pieces.bottom ? html`<label class="check"><input type="radio" name="dk" value="pair"> Ce haut avec ce pantalon (${pieces.top.name} + ${pieces.bottom.name})</label>` : ''}
      <label class="check"><input type="radio" name="dk" value="snooze"> Une ou plusieurs pièces : ne plus me les proposer pendant 2 semaines</label>
    </div>
    <div class="kbd-list" data-snz style="margin:8px 0 0 22px;display:none">${list.map(([r, g], i) => html`<label class="check"><input type="checkbox" data-i="${i}"> ${ROLE_LABELS[r]} — ${g.name}</label>`)}</div>
    <button class="btn btn-primary" data-ok style="margin-top:12px">Enregistrer et proposer autre chose</button>`,
  onMount(body, close) {
    body.querySelectorAll('[name="dk"]').forEach((r) => r.onchange = () => { body.querySelector('[data-snz]').style.display = body.querySelector('[name="dk"]:checked').value === 'snooze' ? 'flex' : 'none'; });
    body.querySelector('[data-ok]').onclick = async () => {
      const kind = body.querySelector('[name="dk"]:checked').value;
      const p = await loadPrefsS(); const at = new Date().toISOString(); let label = '';
      if (kind === 'combo') { p.dislikedCombos = [...new Set([...(p.dislikedCombos || []), comboKey(pieces)])].slice(-100); label = 'Tenue refusée : ' + piecesList(pieces).filter(([r]) => ['top', 'bottom', 'shoes'].includes(r)).map(([, g]) => g.name).join(' + '); }
      if (kind === 'pair') { p.dislikedPairs = [...new Set([...(p.dislikedPairs || []), `${pieces.top.id}|${pieces.bottom.id}`])].slice(-100); p.pairNames = { ...(p.pairNames || {}), [`${pieces.top.id}|${pieces.bottom.id}`]: `${pieces.top.name} + ${pieces.bottom.name}` }; label = `Association refusée : ${pieces.top.name} + ${pieces.bottom.name}`; }
      if (kind === 'snooze') {
        const gs = [...body.querySelectorAll('[data-i]:checked')].map((c) => list[+c.dataset.i][1]);
        if (!gs.length) { toast('Cochez au moins une pièce'); return; }
        const until = todayISO(new Date(Date.now() + 14 * 864e5));
        p.snoozed = { ...(p.snoozed || {}) }; p.snoozedNames = { ...(p.snoozedNames || {}) };
        gs.forEach((g) => { p.snoozed[g.id] = until; p.snoozedNames[g.id] = g.name; });
        label = `Mise de côté 2 semaines : ${gs.map((g) => g.name).join(', ')}`;
      }
      p.history = [...(p.history || []), { at, kind: 'dislike', label }].slice(-50);
      await savePrefsS(p); close(); toast('C\'est noté : autre proposition'); onDone?.();
    };
  } });
}
