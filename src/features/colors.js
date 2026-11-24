// Couleurs — générateur interactif (fonctionnalité centrale), palette 13 couleurs, 20 palettes, règles, mes palettes.
import { html, raw, setHTML } from '../lib/html.js';
import { icon, toast, options, copyText, emptyState, confirmDialog } from '../components/ui.js';
import { mannequinSVG } from '../components/mannequin.js';
import { store, pid, garments as loadGarments, palettes as loadPalettes, hydratePhotos } from '../state.js';
import { uid } from '../repositories/db.js';
import { MAIN_COLORS, ALL_COLORS, COLOR_BY_ID, PALETTES_20, PALETTES_NOTE, COLOR_RULES, FACE_COLOR_NOTE, TEXTURES, ITALIAN_SIGNATURES } from '../data/colors.js';
import { suggestPalette, classifyHarmony, paletteNote, nearestColor, BOTTOM_IDS, colorName, colorHex, inkOn } from '../domain/colors.js';
import { roleOf, isAvailable } from '../domain/recommend.js';
import { seasonFromDate, SEASON_NAMES } from '../domain/weather.js';
import { garmentGlyph } from '../components/mannequin.js';
import { inspireBlock } from './shared.js';
import { colorsQuery, genderWord } from '../services/pexels.js';

// État du générateur conservé pendant la session
export const gen = { mode: 'bottom', base: 'beige', top: null, jacketOn: true, jacket: null, shoe: null, beltOn: true, belt: null, textures: {}, sort: 'original', season: '', contrast: '', withWardrobe: false };

export function resetForBase(state, baseId) {
  state.base = baseId;
  const s = suggestPalette(baseId, state.mode);
  if (state.mode === 'bottom') state.top = s.tops[0].id;
  else state.top = s.bottoms[0]?.id || null; // en mode inverse, « top » contient le bas choisi
  state.jacket = s.jacket?.id || null; state.shoe = s.shoe?.id || null; state.belt = s.belt?.id || null;
  return s;
}
if (!gen.top) resetForBase(gen, gen.base);

export async function render(main, params) {
  const tab = params[0] || 'generator';
  setHTML(main, html`
    <div class="page-head"><div class="eyebrow">Colorimétrie</div><h1>Couleurs</h1><p class="lede">Associer les couleurs comme un styliste : générateur interactif, palette de base, 20 harmonies intemporelles.</p></div>
    <nav class="tabs" aria-label="Sections couleurs">${[['generator', 'Générateur'], ['palette', 'Palette 13 couleurs'], ['palettes', '20 palettes'], ['rules', 'Règles'], ['mine', 'Mes palettes']].map(([id, l]) => html`<a href="#/colors/${id}" ${tab === id ? raw('aria-current="page"') : ''}>${l}</a>`)}</nav>
    <div id="ctab"></div>`);
  const box = main.querySelector('#ctab');
  if (tab === 'palette') return renderPalette(box);
  if (tab === 'palettes') return renderPalettes(box);
  if (tab === 'rules') return renderRules(box);
  if (tab === 'mine') return renderMine(box);
  return renderGenerator(box);
}

function colorButton(c, pressed, attr) {
  return html`<button type="button" class="color-btn" ${raw(attr)}="${c.id}" aria-pressed="${pressed}">${raw(`<span class="swatch" style="background:${c.hex}"></span>`)}<span>${c.name}<br><span class="mono muted">${c.hex}</span></span></button>`;
}

async function renderGenerator(box) {
  const all = await loadGarments();
  const ownedColors = { top: [], bottom: [] };
  all.filter(isAvailable).forEach((g) => { const r = roleOf(g); if (ownedColors[r] && g.color?.id) ownedColors[r].push(g.color.id); });
  const draw = () => {
    const ctx = { sort: gen.sort, season: gen.season || undefined, contrast: gen.contrast || undefined, ownedColors: gen.withWardrobe ? ownedColors : {} };
    const s = suggestPalette(gen.base, gen.mode, ctx);
    const bottomId = gen.mode === 'bottom' ? gen.base : gen.top;
    const topId = gen.mode === 'bottom' ? gen.top : gen.base;
    const list = gen.mode === 'bottom' ? s.tops : s.bottoms;
    const jacket = gen.jacketOn ? gen.jacket : null; const belt = gen.beltOn ? gen.belt : null;
    const harmony = classifyHarmony([topId, bottomId, jacket, gen.shoe]);
    const note = paletteNote({ bottom: bottomId, top: topId, jacket, shoe: gen.shoe, belt });
    const inMatrixTop = list.some((x) => x.id === (gen.mode === 'bottom' ? gen.top : gen.top));
    const pieces = [['Haut', topId], ['Bas', bottomId], gen.jacketOn && ['Veste', jacket], ['Chaussures', gen.shoe], gen.beltOn && ['Ceinture', belt]].filter(Boolean).filter(([, id]) => id);
    const desc = `Schéma : haut ${colorName(topId)}, bas ${colorName(bottomId)}${jacket ? `, veste ${colorName(jacket)}` : ''}, chaussures ${colorName(gen.shoe)}${belt ? `, ceinture ${colorName(belt)}` : ''}`;
    setHTML(box, html`
      <div class="row" style="margin-bottom:14px" role="group" aria-label="Point de départ">
        <button class="chip" id="m-bottom" aria-pressed="${gen.mode === 'bottom'}">Partir du pantalon</button>
        <button class="chip" id="m-top" aria-pressed="${gen.mode === 'top'}">Partir de mon haut</button>
      </div>
      <div class="grid-split">
        <div class="stack">
          <section class="card"><h3>1. ${gen.mode === 'bottom' ? 'Pantalon (ou jupe)' : 'Mon haut'}</h3>
            <div class="chips" role="group" aria-label="${gen.mode === 'bottom' ? 'Couleur du bas' : 'Couleur du haut'}">${(gen.mode === 'bottom' ? BOTTOM_IDS : MAIN_COLORS.map((c) => c.id).concat(['mid-gray', 'cognac', 'mid-blue'])).map((id) => colorButton(COLOR_BY_ID[id], gen.base === id, 'data-base'))}</div>
            <details class="disclosure" style="margin-top:10px"><summary>Couleur personnalisée</summary>
              <div class="row" style="margin-top:8px"><input type="color" id="custom" value="${colorHex(gen.base)}" aria-label="Choisir une couleur personnalisée"><span class="small muted" id="customnote">La couleur choisie est rapprochée de la couleur nommée la plus proche ; cette proximité numérique n'est pas une certitude stylistique.</span></div></details>
            ${s.origin === 'rule' ? html`<p class="small callout" style="margin-top:10px">Couleur absente de la matrice originale : règle ajoutée par l'application. ${s.why}</p>` : ''}
          </section>
          <section class="card"><h3>2. ${gen.mode === 'bottom' ? 'Haut conseillé' : 'Bas compatibles'} (${list.length})</h3>
            <div class="row small" style="margin-bottom:8px">
              <label for="sort" class="sr-only">Classement</label><select id="sort" style="width:auto">${options([['original', 'Ordre du guide'], ['context', 'Selon mon contexte']], gen.sort)}</select>
              ${gen.sort === 'context' ? html`<select id="season" style="width:auto" aria-label="Saison">${options(Object.entries(SEASON_NAMES), gen.season || seasonFromDate(), { empty: 'Saison' })}</select><select id="contrast" style="width:auto" aria-label="Niveau de contraste">${options([['high', 'Contraste marqué'], ['low', 'Contraste doux']], gen.contrast, { empty: 'Contraste' })}</select>` : ''}
              <label class="check"><input type="checkbox" id="ww" ${gen.withWardrobe ? raw('checked') : ''}> Avec mon dressing</label>
            </div>
            <div class="chips">${list.map((t) => html`<button type="button" class="color-btn" data-top="${t.id}" aria-pressed="${gen.top === t.id}">${raw(`<span class="swatch" style="background:${t.hex}"></span>`)}<span>${t.name}<br><span class="mono muted">${t.hex}</span>${gen.sort === 'context' || gen.withWardrobe ? html`<br><span class="small muted">${t.reasons.join(', ')}</span>` : ''}</span></button>`)}</div>
            ${!list.length ? html`<p class="muted small">Aucune association prioritaire répertoriée : essayez le mode « Partir du pantalon ».</p>` : ''}
            ${s.lessSuited.length ? html`<details class="disclosure" style="margin-top:10px"><summary>Possibles mais moins adaptées à l'objectif (${s.lessSuited.length})</summary>
              <ul class="clean" style="margin-top:8px">${s.lessSuited.map((c) => html`<li class="row" style="padding:5px 0;flex-wrap:nowrap;align-items:flex-start"><button type="button" class="color-btn" data-top="${c.id}" aria-pressed="${gen.top === c.id}">${raw(`<span class="swatch" style="background:${c.hex}"></span>`)}${c.name}</button><span class="small muted">${c.why}</span></li>`)}</ul></details>` : ''}
          </section>
          <section class="card"><h3>3. Veste, chaussures, ceinture</h3>
            <div class="form-grid">
              <div class="field"><label class="check"><input type="checkbox" id="jon" ${gen.jacketOn ? raw('checked') : ''}> Veste</label><select id="jacket" ${gen.jacketOn ? '' : raw('disabled')}>${options(ALL_COLORS.map((c) => [c.id, c.name]), gen.jacket)}</select></div>
              <div class="field"><label for="shoe">Chaussures</label><select id="shoe">${options(ALL_COLORS.map((c) => [c.id, c.name]), gen.shoe)}</select></div>
              <div class="field"><label class="check"><input type="checkbox" id="bon" ${gen.beltOn ? raw('checked') : ''}> Ceinture</label><select id="belt" ${gen.beltOn ? '' : raw('disabled')}>${options(ALL_COLORS.map((c) => [c.id, c.name]), gen.belt)}</select></div>
            </div>
            <details class="disclosure"><summary>Textures</summary><div class="form-grid" style="margin-top:8px">${[['top', 'Haut'], ['pants', 'Bas'], ['jacket', 'Veste'], ['shoe', 'Chaussures']].map(([k, l]) => html`<div class="field"><label for="tx-${k}">${l}</label><select id="tx-${k}" data-tex="${k}">${options(TEXTURES.map((t) => [t.id, t.name]), gen.textures[k] || 'smooth')}</select></div>`)}</div></details>
          </section>
        </div>
        <div class="stack split-aside">
          <section class="card card-accent">
            <div class="mannequin-wrap" id="mq">${mannequinSVG({ top: colorHex(topId), pants: colorHex(bottomId), shoe: colorHex(gen.shoe), jacket: jacket ? colorHex(jacket) : null, belt: belt ? colorHex(belt) : null, textures: gen.textures, label: desc })}</div>
            <div class="schema-label">Schéma SVG — ne remplace pas les photographies de l'Académie</div>
            <div class="row-between" style="margin-top:14px"><div><div class="eyebrow">${harmony.name}</div><div class="small muted">${harmony.text}</div></div>
              <div class="score"><div class="score-num">${String(note.note).replace('.', ',')}<small>/10</small></div><div class="small muted">note indicative</div></div></div>
            <ul class="clean" style="margin-top:10px">${pieces.map(([l, id]) => html`<li class="row" style="padding:4px 0;flex-wrap:nowrap">${raw(`<span class="swatch" style="background:${colorHex(id)}"></span>`)}<span style="flex:1"><strong>${l}</strong> — ${colorName(id)}${gen.textures[({ Haut: 'top', Bas: 'pants', Veste: 'jacket', Chaussures: 'shoe' })[l]] && gen.textures[({ Haut: 'top', Bas: 'pants', Veste: 'jacket', Chaussures: 'shoe' })[l]] !== 'smooth' ? ` · ${TEXTURES.find((t) => t.id === gen.textures[({ Haut: 'top', Bas: 'pants', Veste: 'jacket', Chaussures: 'shoe' })[l]])?.name}` : ''}</span><span class="mono muted">${colorHex(id)}</span></li>`)}</ul>
            ${note.notes.length ? html`<ul class="ticks small" style="margin-top:8px">${note.notes.map((n) => html`<li>${n}</li>`)}</ul>` : ''}
            ${!inMatrixTop ? html`<p class="small callout callout-warn">Association hors des conseils prioritaires : possible, mais moins adaptée à l'objectif classique.</p>` : ''}
            <div class="btn-row" style="margin-top:12px"><button class="btn btn-sm btn-primary" id="savep">${icon('heart')} Sauvegarder cette palette</button><button class="btn btn-sm" id="copyp">${icon('copy')} Copier les couleurs</button><button class="btn btn-sm" id="sharep">${icon('share')} Partager la palette</button></div>
            <p class="hint">Partage du texte des couleurs uniquement, sans photos personnelles.</p>
            ${inspireBlock(colorsQuery({ top: topId, bottom: bottomId, jacket }, { gender: genderWord() }), 'Photos réelles de cette association (Pexels)')}
          </section>
          ${gen.withWardrobe ? html`<section class="card" id="mine"></section>` : ''}
        </div>
      </div>`);
    bind(s, { topId, bottomId, jacket, belt, pieces });
    if (gen.withWardrobe) renderWardrobeMatch(box.querySelector('#mine'), all, { topId, bottomId, jacket, shoe: gen.shoe });
  };
  const bind = (s, sel) => {
    const $ = (q) => box.querySelector(q);
    $('#m-bottom').onclick = () => { gen.mode = 'bottom'; resetForBase(gen, BOTTOM_IDS.includes(gen.base) ? gen.base : 'beige'); draw(); };
    $('#m-top').onclick = () => { gen.mode = 'top'; resetForBase(gen, MAIN_COLORS.some((c) => c.id === gen.top) ? gen.top : 'ecru'); draw(); };
    box.querySelectorAll('[data-base]').forEach((b) => b.onclick = () => { resetForBase(gen, b.dataset.base); draw(); box.querySelector(`[data-base="${gen.base}"]`)?.focus(); });
    box.querySelectorAll('[data-top]').forEach((b) => b.onclick = () => { gen.top = b.dataset.top; if (gen.mode === 'top') { const m = s.bottoms.find((x) => x.id === gen.top); if (m) { gen.jacket = m.jacket.id; gen.shoe = m.shoe.id; } } draw(); box.querySelector(`[data-top="${gen.top}"]`)?.focus(); });
    $('#custom').onchange = (e) => {
      const n = nearestColor(e.target.value.toUpperCase());
      const pool = gen.mode === 'bottom' ? BOTTOM_IDS : ALL_COLORS.map((c) => c.id);
      const target = pool.includes(n.id) ? n.id : nearestColor(e.target.value, ALL_COLORS.filter((c) => pool.includes(c.id))).id;
      resetForBase(gen, target); draw();
      toast(`Couleur rapprochée de « ${colorName(target)} » (proximité ${n.confidence}) — indicatif`);
    };
    $('#sort').onchange = (e) => { gen.sort = e.target.value; draw(); };
    $('#season')?.addEventListener('change', (e) => { gen.season = e.target.value; draw(); });
    $('#contrast')?.addEventListener('change', (e) => { gen.contrast = e.target.value; draw(); });
    $('#ww').onchange = (e) => { gen.withWardrobe = e.target.checked; draw(); };
    $('#jon').onchange = (e) => { gen.jacketOn = e.target.checked; draw(); };
    $('#bon').onchange = (e) => { gen.beltOn = e.target.checked; draw(); };
    $('#jacket').onchange = (e) => { gen.jacket = e.target.value; draw(); };
    $('#shoe').onchange = (e) => { gen.shoe = e.target.value; draw(); };
    $('#belt').onchange = (e) => { gen.belt = e.target.value; draw(); };
    box.querySelectorAll('[data-tex]').forEach((el) => el.onchange = () => { gen.textures[el.dataset.tex] = el.value; draw(); });
    const text = () => sel.pieces.map(([l, id]) => `${l} : ${colorName(id)} ${colorHex(id)}`).join('\n') + '\n— SPREZZA';
    $('#copyp').onclick = () => copyText(text());
    $('#sharep').onclick = async () => { if (navigator.share) { try { await navigator.share({ title: 'Palette SPREZZA', text: text() }); } catch { /* annulé */ } } else copyText(text()); };
    $('#savep').onclick = async () => {
      await store.repo.put('palettes', { id: uid('pal'), profileId: pid(), name: sel.pieces.map(([, id]) => colorName(id)).join(' · '), roles: Object.fromEntries(sel.pieces.map(([l, id]) => [l, id])), textures: { ...gen.textures }, note: paletteNote({ bottom: sel.bottomId, top: sel.topId, jacket: sel.jacket, shoe: gen.shoe, belt: sel.belt }).note });
      toast('Palette sauvegardée dans « Mes palettes »');
    };
  };
  draw();
}

function renderWardrobeMatch(box, all, sel) {
  const avail = all.filter(isAvailable);
  const match = (role, id) => avail.filter((g) => roleOf(g) === role && (g.color?.id === id || g.color2?.id === id));
  const rows = [['top', 'Haut', sel.topId], ['bottom', 'Bas', sel.bottomId], ['layer', 'Veste', sel.jacket], ['shoes', 'Chaussures', sel.shoe]].filter(([, , id]) => id);
  const found = Object.fromEntries(rows.map(([r, , id]) => [r, match(r, id)]));
  const anyFound = Object.values(found).some((l) => l.length);
  setHTML(box, html`<h3>Avec mon dressing</h3><p class="small muted">Pièces disponibles dont la couleur représentative correspond (couleur saisie, pas mesurée sous éclairage contrôlé).</p>
    ${rows.map(([r, l, id]) => html`<p class="small" style="margin:8px 0 4px"><strong>${l} ${colorName(id)}</strong> — ${found[r].length ? `${found[r].length} pièce(s)` : 'aucune'}</p>
      <div class="row">${found[r].map((g) => html`<a href="#/wardrobe/${g.id}" class="mini-thumb" title="${g.name}">${g.photoIds?.length ? html`<img data-photo="${g.photoIds[0]}" alt="${g.name}">` : garmentGlyph(r, g.color?.hex)}</a>`)}</div>`)}
    ${anyFound ? html`<a class="btn btn-sm" style="margin-top:10px" href="#/outfits/new?${raw(rows.filter(([r]) => found[r][0]).map(([r]) => `${r}=${found[r][0].id}`).join('&'))}">Ajouter au constructeur de tenues</a>` : html`<p class="small muted">Aucune pièce correspondante : la palette reste une inspiration.</p>`}`);
  hydratePhotos(box);
}

function renderPalette(box) {
  setHTML(box, html`<p class="lede">Palette principale (B9). Les noms accompagnent toujours les couleurs : aucune information n'est codée uniquement par la couleur.</p>
    <div class="grid-wide">${MAIN_COLORS.map((c) => html`<article class="card" style="padding:0;overflow:hidden">
      <div style="background:${raw(c.hex)};color:${raw(inkOn(c.hex))};padding:22px 16px;border-bottom:1px solid var(--line)"><div style="font-family:var(--serif);font-size:24px">${c.name}</div><div class="mono">${c.hex}</div></div>
      <div style="padding:14px 16px"><p class="small"><strong>Associations :</strong> ${c.associations}</p><p class="small"><strong>Vigilance :</strong> ${c.vigilance}</p>
      <div class="btn-row"><a class="btn btn-sm" href="#/colors/generator" data-gen="${c.id}">Essayer en pantalon</a><button class="btn btn-sm btn-ghost" data-copy="${c.hex}">${icon('copy')} ${c.hex}</button></div></div></article>`)}</div>
    <h2>Couleurs auxiliaires du générateur</h2><div class="chips">${ALL_COLORS.filter((c) => c.aux).map((c) => html`<span class="tag">${raw(`<span class="swatch" style="background:${c.hex}"></span>`)} ${c.name} <span class="mono">${c.hex}</span></span>`)}</div>
    <p class="small muted" style="margin-top:10px">Ne pas confondre HEX indicatif et couleur réelle sous éclairage variable.</p>`);
  box.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => copyText(b.dataset.copy));
  box.querySelectorAll('[data-gen]').forEach((a) => a.onclick = () => { gen.mode = 'bottom'; resetForBase(gen, BOTTOM_IDS.includes(a.dataset.gen) ? a.dataset.gen : 'beige'); });
}

function renderPalettes(box) {
  setHTML(box, html`<p class="lede">${PALETTES_NOTE}</p>
    <div class="grid-wide">${PALETTES_20.map((p) => html`<article class="card"><div class="row-between"><span class="eyebrow">N° ${p.n}</span><span class="tag tag-gold">${String(p.note).replace('.', ',')}/10</span></div>
      <h3>${p.name}</h3><div class="swatch-bar" role="img" aria-label="${p.name} : ${p.hex.join(', ')}">${p.hex.map((h) => raw(`<span style="background:${h}"></span>`))}</div>
      <p class="mono small" style="margin-top:8px">${p.hex.join(' · ')}</p>
      <div class="btn-row"><button class="btn btn-sm" data-copy="${p.n}">${icon('copy')} Copier</button></div></article>`)}</div>
    <h2>Signatures italiennes</h2><div class="grid-2">${ITALIAN_SIGNATURES.map((s) => html`<div class="card"><div class="swatch-bar" style="height:30px">${s.colors.map((id) => raw(`<span style="background:${colorHex(id)}"></span>`))}</div><h4 style="margin-top:10px">${s.name}</h4><p class="small muted">${s.text}</p></div>`)}</div>`);
  box.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => { const p = PALETTES_20.find((x) => x.n === +b.dataset.copy); copyText(`${p.n}. ${p.name} — ${p.hex.join(' ')} (${p.note}/10)`); });
}

function renderRules(box) {
  setHTML(box, html`<div class="grid-2">${COLOR_RULES.map((r) => html`<div class="card"><h3>${r.title}</h3><p>${r.text}</p></div>`)}
    <div class="card"><h3>Vêtements et chaussures</h3><p>Une ceinture marron avec chaussures marron, noire avec chaussures noires : repère formel, pas une obligation universelle. Le générateur l'indique sans l'imposer.</p></div></div>
    <div class="callout" style="margin-top:16px">${FACE_COLOR_NOTE}</div>
    <h2>La leçon italienne</h2><p class="lede">Belle coupe, deux ou trois couleurs, texture bien choisie. Les stylistes italiens obtiennent le raffinement avec des couleurs simples (marine, écru, beige, marron, olive, gris) en variant les matières plutôt qu'en multipliant les teintes.</p>`);
}

async function renderMine(box) {
  const list = (await loadPalettes()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  setHTML(box, list.length ? html`<div class="grid-wide">${list.map((p) => html`<article class="card"><div class="swatch-bar" style="height:40px">${Object.values(p.roles).map((id) => raw(`<span style="background:${colorHex(id)}"></span>`))}</div>
      <h4 style="margin-top:10px">${p.name}</h4><ul class="clean small">${Object.entries(p.roles).map(([l, id]) => html`<li>${l} : ${colorName(id)} <span class="mono muted">${colorHex(id)}</span></li>`)}</ul>
      <p class="small muted">Note indicative ${String(p.note).replace('.', ',')}/10</p>
      <div class="btn-row"><button class="btn btn-sm" data-copy="${p.id}">${icon('copy')} Copier</button><button class="btn btn-sm btn-danger" data-del="${p.id}">${icon('trash')}</button></div></article>`)}</div>`
    : emptyState('Aucune palette sauvegardée', 'Composez une association dans le générateur puis « Sauvegarder cette palette ».', html`<a class="btn" href="#/colors">Ouvrir le générateur</a>`));
  box.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => { const p = list.find((x) => x.id === b.dataset.copy); copyText(Object.entries(p.roles).map(([l, id]) => `${l} : ${colorName(id)} ${colorHex(id)}`).join('\n')); });
  box.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { if (await confirmDialog({ title: 'Supprimer la palette ?', message: 'Cette palette sera supprimée.', confirmLabel: 'Supprimer', danger: true })) { await store.repo.remove('palettes', b.dataset.del); renderMine(box); } });
}
