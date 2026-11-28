// Garde-robe capsule interactive (B13) : 3 niveaux, pièces possédées, liens vers le dressing, manquants, export.
import { html, raw, setHTML } from '../lib/html.js';
import { icon, toast, options, swatch, downloadFile } from '../components/ui.js';
import { store, pid, garments as loadGarments } from '../state.js';
import { CAPSULE, CAPSULE_LEVELS, CAPSULE_NOTE } from '../data/capsule.js';
import { capsuleItemsForLevel, capsuleProgress, exportMissingText, exportMissingCSV, allTemplateStatuses, buildQuery, capsuleState } from '../domain/wardrobe-logic.js';
import { outfitsUnlocked } from '../domain/recommend.js';
import { colorHex, colorName } from '../domain/colors.js';
import { COLOR_BY_ID } from '../data/colors.js';
import { IDENTITY_MIX } from '../data/styles.js';
import { styleCoverage, SCHOOL_STYLES } from '../domain/style-id.js';
import { uid } from '../repositories/db.js';

const KEY = () => `capsule:${pid()}`;

export async function render(main) {
  const [all, cap0] = await Promise.all([loadGarments(), store.repo.kvGet(KEY(), { level: 1, items: {} })]);
  const cap = { level: cap0.level || 1, items: cap0.items || {} };
  const save = () => store.repo.kvSet(KEY(), cap);
  const eff0 = () => capsuleState(cap.items, all);
  let styleSet = 'mine';
  const wished = new Set((await store.repo.all('wishlist')).filter((w) => w.profileId === pid() && w.status === 'wanted').map((w) => w.styleKit).filter(Boolean));
  const draw = () => {
    const items = capsuleItemsForLevel(cap.level);
    const eff = capsuleState(cap.items, all); // vos choix, sinon ce qui est détecté dans le dressing
    const prog = capsuleProgress(cap.level, eff);
    const tpl = allTemplateStatuses(eff, all);
    const autoN = items.filter((c) => eff[c.id]?.auto).length;
    setHTML(main, html`
      <div class="page-head"><div class="eyebrow">Garde-robe capsule</div><h1>Ma capsule — 30 pièces</h1><p class="lede">${CAPSULE_NOTE} Prix indicatifs en France, pas des offres marchandes actuelles.</p></div>
      <div class="row" role="group" aria-label="Niveau" style="margin-bottom:14px">${CAPSULE_LEVELS.map((l) => html`<button class="chip" data-level="${l.level}" aria-pressed="${cap.level === l.level}">${l.name}</button>`)}</div>
      <div class="grid-3">
        <div class="card"><div class="stat">${prog.owned}/${prog.total}</div><div class="stat-label">pièces possédées (niveau ${cap.level})</div><div class="progress" style="margin-top:10px"><span style="width:${raw(prog.pct)}%"></span></div></div>
        <div class="card"><div class="stat">${tpl.filter((t) => t.portable).length}/30</div><div class="stat-label">modèles réellement portables</div><a class="small" href="#/outfits/templates">Voir les 30 modèles</a></div>
        <div class="card"><div class="eyebrow">Exporter les manquants</div><div class="btn-row"><button class="btn btn-sm" id="exptxt">${icon('download')} Liste (.txt)</button><button class="btn btn-sm" id="expcsv">${icon('download')} Tableau (.csv)</button></div></div>
      </div>
      <div class="callout" style="margin-top:14px">${autoN ? html`${icon('check')} <strong>${autoN} pièce${autoN > 1 ? 's' : ''} détectée${autoN > 1 ? 's' : ''} automatiquement dans votre dressing</strong> (même type, même couleur ou teinte proche). Si une correspondance est fausse, décochez-la ou choisissez une autre fiche.` : prog.owned === prog.total ? html`${icon('check')} Les ${prog.total} pièces de ce niveau sont reliées à votre dressing.` : html`Les ${prog.total - prog.owned} pièce(s) non cochée(s) n'ont pas d'équivalent dans votre dressing (même type, couleur identique ou proche). Si vous en avez une, cochez-la et reliez sa fiche.`}</div>
      ${stylesSection(all, styleSet, wished)}
      <div class="table-wrap" style="margin-top:16px"><table><thead><tr><th>Possédée</th><th>Pièce</th><th>Matière · saison</th><th>Budget</th><th>Priorité</th><th>Fiche du dressing</th></tr></thead><tbody>
      ${items.map((c) => {
        const st = eff[c.id] || {};
        const candidates = all.filter((g) => g.category === c.category || (c.role === 'suit' && g.category === 'veste'));
        const linked = all.find((g) => g.id === st.garmentId);
        return html`<tr>
          <td><input type="checkbox" data-own="${c.id}" ${st.owned ? raw('checked') : ''} aria-label="Je possède : ${c.name}"></td>
          <td><span class="row" style="gap:6px;flex-wrap:nowrap">${swatch(colorHex(c.color), colorName(c.color))}<span><strong>${c.id}. ${c.name}</strong></span></span></td>
          <td class="small">${c.material} · ${c.season}</td><td class="small">${c.budget[0]}–${c.budget[1]} €</td><td><span class="tag ${c.priority === 'Base' ? 'tag-gold' : ''}">${c.priority}</span></td>
          <td>${st.owned ? html`<select data-link="${c.id}" aria-label="Relier ${c.name} à une fiche">${options(candidates.map((g) => [g.id, g.name]), st.garmentId || '', { empty: candidates.length ? 'Relier à une fiche…' : 'Aucune fiche compatible' })}</select>${!linked ? html`<a class="small" href="#/wardrobe/new?capsule=${c.id}">Créer la fiche</a>` : ''}${st.auto ? html`<div class="small"><span class="tag tag-ok">Détectée</span>${st.quality === 1 ? html` <span class="muted">teinte proche : ${linked?.color?.name || ''}</span>` : ''}</div>` : ''}`
            : html`<span class="row" style="gap:6px"><a class="btn btn-sm" href="#/shopping?q=${encodeURIComponent(buildQuery({ category: c.name.toLowerCase(), material: c.material.toLowerCase(), budgetMin: c.budget[0], budgetMax: c.budget[1] }))}">Chercher</a><button class="btn btn-sm btn-ghost" data-util="${c.id}">Utilité ?</button></span><span class="small muted" data-utilout="${c.id}"></span>`}</td></tr>`;
      })}</tbody></table></div>
      <p class="small muted">Cocher « possédée » ne crée pas de vêtement : reliez la pièce à une fiche réelle du dressing pour qu'elle soit utilisée par les modèles et le styliste.</p>`);
    main.querySelectorAll('[data-sset]').forEach((b) => b.onclick = () => { styleSet = b.dataset.sset; draw(); });
    main.querySelectorAll('[data-kitwish]').forEach((b) => b.onclick = async () => {
      const [sid, i] = b.dataset.kitwish.split('|'); const it = styleCoverage(all, [{ id: sid }])[0].items[+i];
      await store.repo.put('wishlist', { id: uid('wish'), profileId: pid(), name: it.name, query: buildQuery({ category: it.name.toLowerCase(), material: it.material.toLowerCase(), budgetMin: it.budget[0], budgetMax: it.budget[1] }), color: it.colors[0] || null, budgetMax: it.budget[1], material: it.material, priority: 2, status: 'wanted', candidates: [], styleKit: b.dataset.kitwish, notes: `Pour le style ${sid} : ${it.why}` });
      wished.add(b.dataset.kitwish); toast('Ajouté à mes achats (liste d\'envies)'); draw();
    });
    main.querySelectorAll('[data-level]').forEach((b) => b.onclick = async () => { cap.level = +b.dataset.level; await save(); draw(); });
    main.querySelectorAll('[data-own]').forEach((cb) => cb.onchange = async () => { const id = +cb.dataset.own; cap.items[id] = { ...(eff0()[id] || {}), owned: cb.checked, auto: undefined, quality: undefined }; if (!cb.checked) delete cap.items[id].garmentId; await save(); draw(); });
    main.querySelectorAll('[data-link]').forEach((sel) => sel.onchange = async () => { const id = +sel.dataset.link; cap.items[id] = { owned: true, garmentId: sel.value || undefined }; await save(); toast('Pièce reliée au dressing'); draw(); });
    main.querySelectorAll('[data-util]').forEach((b) => b.onclick = () => {
      const c = CAPSULE.find((x) => x.id === +b.dataset.util);
      const out = main.querySelector(`[data-utilout="${c.id}"]`);
      const subMap = { 'col roulé': 'col-roule', costume: 'veste-costume', ceinture: 'ceinture-cuir', cravate: 'cravate' };
      const n = outfitsUnlocked({ name: c.name, category: c.category, sub: subMap[c.sub] || c.sub, color: { id: c.color, hex: COLOR_BY_ID[c.color].hex, name: c.name }, material: c.material, seasons: [] }, all);
      out.textContent = all.length ? ` ${n} tenue(s) supplémentaire(s) avec votre dressing${n >= 3 ? ' — achat utile' : n === 0 ? ' — peu utile pour l\'instant' : ''}` : ' Dressing vide : utilité non calculable.';
    });
    main.querySelector('#exptxt').onclick = () => downloadFile(`capsule-manquants-niveau-${cap.level}.txt`, exportMissingText(cap.level, eff), 'text/plain;charset=utf-8');
    main.querySelector('#expcsv').onclick = () => downloadFile(`capsule-manquants-niveau-${cap.level}.csv`, '﻿' + exportMissingCSV(cap.level, eff), 'text/csv;charset=utf-8');
  };
  draw();
}

/** Mes styles : ce que le dressing possède déjà pour chacun, et ce qu'il faudrait acheter. */
function stylesSection(all, set, wished) {
  const mix = (store.profile?.styleMix?.length ? store.profile.styleMix : IDENTITY_MIX).filter((m) => (m.pct ?? 1) > 0);
  const list = set === 'mine' ? mix : SCHOOL_STYLES.map((id) => ({ id }));
  const cov = styleCoverage(all, list);
  const buy = cov.flatMap((c) => c.toBuy.map((it) => ({ c, it })));
  const statusTag = (c) => c.status === 'ready' ? html`<span class="tag tag-ok">Prêt</span>` : c.status === 'partial' ? html`<span class="tag">Presque</span>` : html`<span class="tag tag-warn">À compléter</span>`;
  return html`<section style="margin-top:18px"><h2>Mes styles : ai-je les pièces ?</h2>
    <div class="row" role="group" aria-label="Styles vérifiés" style="margin-bottom:10px"><button class="chip" data-sset="mine" aria-pressed="${set === 'mine'}">Mon identité (${mix.length} styles)</button><button class="chip" data-sset="schools" aria-pressed="${set === 'schools'}">Les 5 grandes écoles</button></div>
    <p class="small muted">${set === 'mine' ? 'Les styles de votre profil (Profil › Mon identité de style), du plus important au moins important.' : 'Italie, France, Royaume-Uni, États-Unis (Ivy) et Japon : les 5 écoles du guide.'} Une pièce compte si son type correspond ; couleur différente = « à revoir ».</p>
    <div class="style-cov">${cov.map((c) => html`<div class="card"><div class="row-between"><div><strong>Style ${c.label}</strong>${c.weight ? html` <span class="small muted">${c.weight} %</span>` : ''}<div class="small muted">${c.origin}</div></div>${statusTag(c)}</div>
      <div class="progress" style="margin:8px 0"><span style="width:${raw(c.pctReady)}%"></span></div>
      ${c.items.map((it, i) => html`<div class="kit-row"><span class="small">${it.match?.quality === 2 ? '✓' : it.match ? '≈' : '✗'} <strong>${it.name}</strong><br><span class="muted">${it.match ? (it.match.quality === 2 ? it.match.garment.name : `${it.match.garment.name} (couleur à revoir)`) : `À acheter · ${it.budget[0]}–${it.budget[1]} €`}</span></span>
        ${!it.match ? (wished.has(`${c.id}|${i}`) ? html`<span class="tag tag-ok">Dans mes achats</span>` : html`<button class="btn btn-sm" data-kitwish="${c.id}|${i}">${icon('plus')} Acheter</button>`) : ''}</div>`)}</div>`)}</div>
    ${buy.length ? html`<div class="card" style="margin-top:12px"><h3>À acheter pour vos styles (${buy.length})</h3><p class="small muted">Par ordre d'importance de vos styles. « Acheter » l'ajoute à votre liste d'envies ; rien n'est commandé. Vérifiez chaque article avec « Avant d'acheter ».</p>
      <ul class="clean small">${buy.slice(0, 8).map(({ c, it }) => html`<li style="margin:6px 0"><strong>${it.name}</strong> — style ${c.label} : ${it.why}. <span class="muted">${it.material}, ${it.budget[0]}–${it.budget[1]} €.</span> <a href="#/shopping?q=${encodeURIComponent(buildQuery({ category: it.name.toLowerCase(), material: it.material.toLowerCase(), budgetMin: it.budget[0], budgetMax: it.budget[1] }))}">Chercher</a></li>`)}</ul></div>`
      : html`<div class="callout" style="margin-top:12px">${icon('check')} Votre dressing a toutes les pièces clés de ces styles.</div>`}
  </section>`;
}
