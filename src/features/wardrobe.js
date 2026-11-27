// Dressing numérique : liste filtrable, fiche, ajout/édition avec photo, import multiple, statistiques.
import { html, raw, setHTML } from '../lib/html.js';
import { icon, toast, confirmDialog, swatch, emptyState, readForm, options, fmtDate, fmtEUR, openModal } from '../components/ui.js';
import { store, pid, garments as loadGarments, hydratePhotos, forgetPhotoURL, wearlog as loadWearlog, outfits as loadOutfits } from '../state.js';
import { uid } from '../repositories/db.js';
import { isEveryday, CATEGORIES, CATEGORY_BY_ID, SUB_INFO, PATTERNS, FITS, SEASON_OPTS, CONDITIONS, AVAILABILITY, PHOTO_KINDS, MATERIALS, STYLE_OPTS, MEASURE_FIELDS } from '../data/taxonomy.js';
import { GARMENT_COLORS, COLOR_BY_ID } from '../data/colors.js';
import { CAPSULE } from '../data/capsule.js';
import { nearestColor, colorIdFromHex } from '../domain/colors.js';
import { isAvailable, pairingsFor } from '../domain/recommend.js';
import { costPerWear, wardrobeStats } from '../domain/wardrobe-logic.js';
import { versatility, reviewGarment, keyThresholdOf, VERDICTS } from '../domain/review.js';
import { careStatus, afterWash, afterCare } from '../domain/care.js';
import { PERIODS, periodAt, nextChange, seasonalPlan, storageTip } from '../domain/seasonal.js';
import { parseProduct, identifyQuery, readerToText, assistantPrompt, parseStructured, extractJSON, pageImages, colorVariants, currentColorCode, imagesForColor } from '../domain/product-parse.js';
import { readLabel, OCR_DOWNLOAD_MB } from '../services/ocr.js';
import { RETAILERS, QUICK_SHOPS, priceCompareUrl } from '../data/retailers.js';
import { shopSearchUrl } from './shopping.js';
import { prefs as loadPrefs } from '../state.js';
import { checkImageFile, loadBitmap, processImage, renderToCanvas } from '../services/image.js';
import { aiStatus } from '../services/ai.js';
import { cutout, CUTOUT_DOWNLOAD_MB } from '../services/cutout.js';
import { garmentCard, AVAIL_LABEL, deleteGarment, proposalCard, saveOutfit, wearOutfit } from './shared.js';
import { navigate } from '../app.js';

const filters = { q: '', cat: '', color: '', material: '', season: '', availableOnly: false, fav: false, sort: 'recent' };

export async function render(main, params, query) {
  const [a, b] = params;
  if (!a) return renderList(main);
  if (a === 'new') return renderEditor(main, null, presetFromQuery(query));
  if (a === 'import') return renderImport(main);
  if (a === 'stats') return renderStats(main);
  if (a === 'review') return renderReview(main);
  if (a === 'quick') return renderQuick(main);
  if (a === 'care') return renderCare(main);
  if (a === 'season') return renderSeason(main);
  if (b === 'edit') { const g = await store.repo.get('garments', a); return g ? renderEditor(main, g) : notFound(main); }
  const g = await store.repo.get('garments', a);
  return g && g.profileId === pid() ? renderDetail(main, g) : notFound(main);
}
/** Préremplissage depuis la capsule ou la liste d'envies (#/wardrobe/new?capsule=6 ou ?name=…&category=…). */
function presetFromQuery(query) {
  if (!query) return {};
  if (query.get('web')) focusWeb = true;
  if (query.get('set') && pendingPreset) { const p = pendingPreset; pendingPreset = null; return p; }
  const cid = Number(query.get('capsule'));
  if (cid) {
    const c = CAPSULE.find((x) => x.id === cid);
    if (c) {
      const subMap = { blazer: 'blazer', chemise: c.material === 'Lin' ? 'chemise-lin' : 'chemise', polo: 'polo', pull: 'pull', 'col roulé': 'col-roule', chino: 'chino', pantalon: 'pantalon', jean: 'jean', mocassins: 'mocassins', baskets: 'baskets', manteau: 'manteau', 'tee-shirt': 'tee-shirt', surchemise: 'surchemise', derbies: 'derbies', ceinture: 'ceinture-cuir', costume: 'veste-costume', richelieus: 'richelieus', cravate: 'cravate', chelsea: 'chelsea', bermuda: 'bermuda', trench: 'trench' };
      const col = COLOR_BY_ID[c.color];
      return { name: c.name, category: c.category, sub: subMap[c.sub] || CATEGORY_BY_ID[c.category].subs[0][0], material: c.material, color: { id: col.id, name: col.name, hex: col.hex }, capsuleId: cid };
    }
  }
  const out = {};
  if (query.get('name')) out.name = query.get('name').slice(0, 80);
  if (query.get('category') && CATEGORY_BY_ID[query.get('category')]) { out.category = query.get('category'); out.sub = CATEGORY_BY_ID[out.category].subs[0][0]; }
  if (query.get('price')) out.price = Number(query.get('price')) || null;
  if (query.get('wish')) out.wishId = query.get('wish');
  return out;
}
function notFound(main) { setHTML(main, emptyState('Pièce introuvable', 'Elle a peut-être été supprimée.', html`<a class="btn" href="#/wardrobe">Retour au dressing</a>`)); }

// ---------------------------------------------------------------- Liste
async function renderList(main) {
  const all = await loadGarments();
  const materials = [...new Set(all.map((g) => g.material).filter(Boolean))].sort();
  const usedColors = GARMENT_COLORS.filter((c) => all.some((g) => g.color?.id === c.id));
  setHTML(main, html`
    <div class="page-head row-between"><div><div class="eyebrow">Dressing numérique</div><h1>Mon dressing</h1>
      <p class="lede">${all.length} pièce${all.length > 1 ? 's' : ''} · ${all.filter(isAvailable).length} disponible${all.filter(isAvailable).length > 1 ? 's' : ''} immédiatement. Vos photos restent privées sur cet appareil.</p></div>
      <div class="btn-row"><a class="btn btn-primary" href="#/wardrobe/quick">${icon('camera')} Ajout rapide</a><a class="btn btn-gold" href="#/wardrobe/new?web=1">${icon('search')} Ajouter depuis un lien ou ChatGPT</a><a class="btn" href="#/wardrobe/new">${icon('plus')} Fiche complète</a><a class="btn" href="#/wardrobe/import">${icon('upload')} Import multiple</a><a class="btn" href="#/wardrobe/care">${icon('rotate')} Lessive & entretien${all.filter((g) => g.availability === 'to-wash').length ? ` (${all.filter((g) => g.availability === 'to-wash').length})` : ''}</a><a class="btn" href="#/wardrobe/season">Rangement saisonnier</a><a class="btn" href="#/wardrobe/review">Revue du dressing</a><a class="btn" href="#/wardrobe/stats">Statistiques</a></div></div>
    ${all.length ? html`
    <div class="card" style="margin-bottom:16px">
      <div class="field"><label for="wq">Rechercher</label><input id="wq" type="search" placeholder="Nom, marque, matière, tag…" value="${filters.q}"></div>
      <div class="chips" role="group" aria-label="Catégorie" style="margin-bottom:10px"><button class="chip" data-cat="" aria-pressed="${!filters.cat}">Tout</button>${CATEGORIES.map((c) => html`<button class="chip" data-cat="${c.id}" aria-pressed="${filters.cat === c.id}">${c.name}</button>`)}</div>
      ${usedColors.length ? html`<div class="chips" role="group" aria-label="Couleur" style="margin-bottom:10px"><button class="chip" data-color="" aria-pressed="${!filters.color}">Toutes couleurs</button>${usedColors.map((c) => html`<button class="chip" data-color="${c.id}" aria-pressed="${filters.color === c.id}">${swatch(c.hex)} ${c.name}</button>`)}</div>` : ''}
      <div class="form-grid">
        <div class="field"><label for="wmat">Matière</label><select id="wmat">${options(materials, filters.material, { empty: 'Toutes' })}</select></div>
        <div class="field"><label for="wseason">Saison</label><select id="wseason">${options(SEASON_OPTS, filters.season, { empty: 'Toutes' })}</select></div>
        <div class="field"><label for="wsort">Trier</label><select id="wsort">${options([['recent', 'Ajout récent'], ['name', 'Nom'], ['worn', 'Moins porté récemment'], ['category', 'Catégorie']], filters.sort)}</select></div>
        <div class="field" style="display:flex;flex-direction:column;justify-content:flex-end"><label class="check"><input type="checkbox" id="wavail" ${filters.availableOnly ? raw('checked') : ''}> Disponibles uniquement</label><label class="check"><input type="checkbox" id="wfav" ${filters.fav ? raw('checked') : ''}> Favoris</label></div>
      </div>
    </div>
    <p class="small muted" id="wcount" aria-live="polite"></p>
    <div class="grid-cards" id="wgrid"></div>` : emptyState('Votre dressing est vide', 'Ajoutez vos vêtements (photo ou saisie manuelle) : le styliste ne proposera que des pièces réellement possédées.', html`<a class="btn btn-primary" href="#/wardrobe/new">${icon('plus')} Ajouter une pièce</a><a class="btn" href="#/wardrobe/import">Import multiple</a><a class="btn" href="#/capsule">Partir de la capsule</a>`)}`);
  if (!all.length) return;
  const grid = main.querySelector('#wgrid');
  const vmap = versatility(all);
  const apply = () => {
    const q = filters.q.toLowerCase();
    let list = all.filter((g) => (!filters.cat || g.category === filters.cat) && (!filters.color || g.color?.id === filters.color || g.color2?.id === filters.color)
      && (!filters.material || g.material === filters.material) && (!filters.season || !g.seasons?.length || g.seasons.includes(filters.season))
      && (!filters.availableOnly || isAvailable(g)) && (!filters.fav || g.favorite)
      && (!q || [g.name, g.brand, g.material, g.composition, g.notes, ...(g.tags || []), g.color?.name, SUB_INFO[g.sub]?.name].join(' ').toLowerCase().includes(q)));
    const sorters = { recent: (x, y) => (y.createdAt || '').localeCompare(x.createdAt || ''), name: (x, y) => x.name.localeCompare(y.name), worn: (x, y) => (x.lastWornAt || '').localeCompare(y.lastWornAt || ''), category: (x, y) => x.category.localeCompare(y.category) || x.name.localeCompare(y.name) };
    list = list.sort(sorters[filters.sort]);
    main.querySelector('#wcount').textContent = `${list.length} résultat${list.length > 1 ? 's' : ''}`;
    setHTML(grid, list.length ? list.map((g) => garmentCard(g, { versatility: vmap[g.id] })) : html`<div class="empty" style="grid-column:1/-1">Aucune pièce ne correspond à ces filtres.</div>`);
    hydratePhotos(grid);
  };
  main.querySelector('#wq').addEventListener('input', (e) => { filters.q = e.target.value; apply(); });
  main.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { filters.cat = b.dataset.cat; main.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', x === b)); apply(); }));
  main.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => { filters.color = b.dataset.color; main.querySelectorAll('[data-color]').forEach((x) => x.setAttribute('aria-pressed', x === b)); apply(); }));
  main.querySelector('#wmat').onchange = (e) => { filters.material = e.target.value; apply(); };
  main.querySelector('#wseason').onchange = (e) => { filters.season = e.target.value; apply(); };
  main.querySelector('#wsort').onchange = (e) => { filters.sort = e.target.value; apply(); };
  main.querySelector('#wavail').onchange = (e) => { filters.availableOnly = e.target.checked; apply(); };
  main.querySelector('#wfav').onchange = (e) => { filters.fav = e.target.checked; apply(); };
  apply();
}

// ---------------------------------------------------------------- Galerie photo (défilement)
const PHOTO_LABEL = (p) => (p.cutout ? 'Présentation boutique' : ({ product: 'Photo de l\'article', real: 'Photo réelle', back: 'Dos', detail: 'Détail', label: 'Étiquette', worn: 'Portée', wardrobe: 'Photo réelle', single: 'Photo réelle' })[p.kind] || 'Photo');
function gallery(photos, name) {
  return html`<div class="gallery" id="gallery">
    <div class="gallery-track" tabindex="0" aria-label="Photos de ${name} (faites défiler)">${photos.map((p, i) => html`<figure class="gallery-slide" data-i="${i}"><img data-photo="${p.id}" data-full alt="${name} — ${PHOTO_LABEL(p)}"><figcaption>${PHOTO_LABEL(p)}${photos.length > 1 ? ` · ${i + 1}/${photos.length}` : ''}</figcaption></figure>`)}</div>
    ${photos.length > 1 ? html`<button type="button" class="gallery-nav prev" aria-label="Photo précédente">‹</button><button type="button" class="gallery-nav next" aria-label="Photo suivante">›</button>
      <div class="gallery-dots">${photos.map((p, i) => html`<button type="button" data-dot="${i}" aria-label="${PHOTO_LABEL(p)}" aria-current="${i === 0}"></button>`)}</div>` : ''}
  </div>`;
}
function setupGallery(main) {
  const box = main.querySelector('#gallery'); if (!box) return;
  const track = box.querySelector('.gallery-track'); const n = track.children.length;
  const cur = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
  const go = (i) => track.scrollTo({ left: Math.max(0, Math.min(n - 1, i)) * track.clientWidth, behavior: 'smooth' });
  box.querySelector('.prev')?.addEventListener('click', () => go(cur() - 1));
  box.querySelector('.next')?.addEventListener('click', () => go(cur() + 1));
  box.querySelectorAll('[data-dot]').forEach((d) => d.onclick = () => go(+d.dataset.dot));
  track.addEventListener('scroll', () => { const i = cur(); box.querySelectorAll('[data-dot]').forEach((d) => d.setAttribute('aria-current', String(+d.dataset.dot === i))); }, { passive: true });
  track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(cur() + 1); if (e.key === 'ArrowLeft') go(cur() - 1); });
  // Toucher une photo : plein écran pour bien voir la matière (zoom avec deux doigts).
  track.querySelectorAll('img').forEach((img) => img.addEventListener('click', () => {
    if (!img.src) return;
    openModal({ title: img.alt, body: html`<div class="zoom-box"><img src="${img.src}" alt="${img.alt}"></div>` });
  }));
}

// ---------------------------------------------------------------- Fiche
async function renderDetail(main, g) {
  const sub = SUB_INFO[g.sub];
  const allG = await loadGarments();
  const vers = versatility(allG)[g.id] ?? null;
  const mates = g.setId ? allG.filter((x) => x.setId === g.setId && x.id !== g.id) : [];
  const photos = (await Promise.all((g.photoIds || []).map((id) => store.repo.get('photos', id)))).filter(Boolean);
  const ph0 = photos[0] || null;
  // Pièce détourée avant cette version : la vraie photo n'existait qu'en local (originalBlob). On en fait une photo à part entière, synchronisée.
  if (ph0?.cutout && ph0.originalBlob && !photos.some((p) => p.kind === 'real')) {
    const realId = uid('ph');
    await store.repo.put('photos', { id: realId, ownerId: g.id, profileId: g.profileId, blob: ph0.originalBlob, thumb: ph0.originalThumb || ph0.originalBlob, mime: ph0.originalBlob.type || 'image/jpeg', kind: 'real', private: true, rights: 'user_owned', alt: `${g.name} — photo réelle` });
    await store.repo.put('photos', { ...ph0, originalBlob: null, originalThumb: null });
    const next = { ...g, photoIds: [ph0.id, realId, ...g.photoIds.slice(1)] };
    await store.repo.put('garments', next);
    return renderDetail(main, next);
  }
  const real = photos.find((p) => p.kind === 'real');
  const cpw = costPerWear(g);
  setHTML(main, html`
    <a href="#/wardrobe" class="small">← Dressing</a>
    <div class="page-head row-between" style="margin-top:8px"><div><div class="eyebrow">${CATEGORY_BY_ID[g.category]?.name} · ${sub?.name || ''}</div><h1>${g.name}</h1>
      <div class="row"><span class="tag ${isAvailable(g) ? 'tag-ok' : 'tag-warn'}">${AVAIL_LABEL[g.availability] || 'Propre'}</span>${g.favorite ? html`<span class="tag tag-gold">Favori</span>` : ''}</div></div>
      <div class="btn-row"><button class="btn" id="fav">${icon('heart', { filled: g.favorite })} ${g.favorite ? 'Retirer des favoris' : 'Favori'}</button><a class="btn" href="#/wardrobe/${g.id}/edit">${icon('edit')} Modifier</a><button class="btn btn-danger" id="del">${icon('trash')} Supprimer</button></div></div>
    ${g.tags?.includes('à compléter') ? html`<div class="callout" style="margin-bottom:14px"><strong>Fiche à compléter.</strong> Type, nom, matière ou prix à vérifier ? Retrouvez la pièce sur internet (photo ou lien de l'article) pour tout remplir.
      <div class="btn-row" style="margin-top:8px"><button class="btn btn-sm btn-gold" id="goweb">${icon('search')} Compléter avec internet</button><a class="btn btn-sm" href="#/wardrobe/${g.id}/edit">Modifier à la main</a></div></div>` : ''}
    <div class="grid-2" style="align-items:start">
      <div class="stack">
        ${photos.length ? gallery(photos, g.name) : html`<div class="card-flat small muted">Aucune photo. Ajoutez-en une depuis « Modifier ».</div>`}
        ${ph0 ? html`<div class="card-flat"><div class="btn-row"><button class="btn btn-sm" id="cutbtn">${ph0.cutout ? 'Refaire la présentation boutique' : 'Présentation boutique (fond ivoire, redressée)'}</button>${ph0.cutout && (real || ph0.originalBlob) ? html`<button class="btn btn-sm btn-ghost" id="uncut">Retirer la présentation boutique</button>` : ''}</div>
          <p class="small muted" id="cutmsg" aria-live="polite">Traitement sur votre appareil, aucune photo envoyée. ${ph0.cutout ? '' : `Premier usage : téléchargement unique d'environ ${CUTOUT_DOWNLOAD_MB} Mo.`}</p></div>` : ''}
        ${g.setId ? html`<div class="card"><h3>Ensemble</h3>${mates.length ? html`<p class="small">Se porte avec : ${mates.map((m, i) => html`${i ? ', ' : ''}<a href="#/wardrobe/${m.id}">${m.name}</a>`)}.</p>` : html`<p class="small">La pièce assortie n'a pas encore de fiche. <a href="#/wardrobe/${g.id}/edit">Modifier</a> puis enregistrer pour la créer.</p>`}
          <p class="small muted">Ensemble complet pour les occasions habillées ; séparément le reste du temps (la veste en blazer avec un chino ou un jean, le pantalon avec un pull fin). Lavez et pressez les deux pièces ensemble pour garder la même teinte.</p></div>` : ''}
        <div class="card"><h3>Disponibilité</h3><div class="chips">${AVAILABILITY.map(([id, label]) => html`<button class="chip" data-avail="${id}" aria-pressed="${(g.availability || 'clean') === id}">${label}</button>`)}</div>
          <p class="small muted" style="margin-top:8px">Une pièce « à laver », « indisponible » ou « en retouche » n'est jamais proposée comme immédiatement portable.</p></div>
      </div>
      <div class="card"><h3>Fiche</h3><dl class="small" style="display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0">
        ${row('Couleur principale', g.color ? html`${swatch(g.color.hex)} ${g.color.name} <span class="mono muted">${g.color.hex}</span>` : null)}
        ${row('Couleur secondaire', g.color2 ? html`${swatch(g.color2.hex)} ${g.color2.name}` : null)}
        ${row('Motif', g.pattern)}${row('Matière', g.material)}${row('Composition', g.composition)}${row('Coupe', FITS.find((f) => f[0] === g.fit)?.[1])}
        ${row('Taille', g.size)}${row('Marque', g.brand)}${row('Saisons', g.seasons?.length ? g.seasons.map((s) => SEASON_OPTS.find((x) => x[0] === s)?.[1]).join(', ') : 'Toutes')}
        ${row('Formalité', g.formality ? `${g.formality}/5` : null)}${row('Chaleur', g.warmth ? `${g.warmth}/5` : null)}${row('Confort', g.comfort ? `${g.comfort}/5` : null)}
        ${row('Pluie / vent', `${g.rainResistance ?? 0}/3 · ${g.windResistance ?? 0}/3`)}${row('État', CONDITIONS.find((c) => c[0] === g.condition)?.[1])}
        ${row('Mesures', Object.entries(g.measures || {}).filter(([, v]) => v).map(([k, v]) => `${MEASURE_FIELDS.find((m) => m[0] === k)?.[1]} ${v} cm`).join(', ') || null)}
        ${row('Achat', g.purchaseDate ? fmtDate(g.purchaseDate) : null)}${row('Prix', g.price ? fmtEUR(g.price) : null)}
        ${row('Polyvalence', vers === null ? null : `${vers} tenue${vers > 1 ? 's' : ''} de base possible${vers > 1 ? 's' : ''} avec votre dressing`)}
        ${row('Port', `${g.wearCount || 0} fois${g.lastWornAt ? ` · dernier le ${fmtDate(g.lastWornAt)}` : ''}`)}
        ${row('Coût par port', cpw !== null ? fmtEUR(cpw) : g.price ? 'Pas encore porté' : 'Prix inconnu')}
        ${row('Tags', g.tags?.length ? g.tags.join(', ') : null)}${row('Notes', g.notes)}
        ${row('Lien d\'origine', g.sourceUrl ? html`<a href="${g.sourceUrl}" target="_blank" rel="noopener noreferrer">Ouvrir ${icon('external')}</a>` : null)}
      </dl></div>
    </div>
    <h2>Avec quoi le porter ?</h2>
    <p class="lede">Combinaisons issues de votre dressing avant toute suggestion d'achat.</p>
    <div class="grid-2" id="pairings"><p class="muted"><span class="loader"></span> Calcul…</p></div>`);
  function row(label, value) { return value === null || value === undefined || value === '' ? '' : html`<dt class="muted">${label}</dt><dd style="margin:0">${value}</dd>`; }
  hydratePhotos(main);
  setupGallery(main);
  main.querySelector('#cutbtn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget; const msg = main.querySelector('#cutmsg'); btn.disabled = true;
    try {
      const source = real?.blob || ph0.originalBlob || ph0.blob;
      const out = await cutout(source, ({ step, pct }) => { msg.textContent = `${step}${pct !== null ? ` — ${pct} %` : '…'}`; });
      if (ph0.cutout) { // nouvelle présentation à partir de la vraie photo
        await store.repo.put('photos', { ...ph0, blob: out.blob, thumb: out.thumb, mime: out.blob.type, width: out.width, height: out.height });
        forgetPhotoURL(ph0.id);
      } else { // la photo actuelle devient la « photo réelle », la présentation boutique passe en tête
        const shopId = uid('ph');
        await store.repo.put('photos', { id: shopId, ownerId: g.id, profileId: g.profileId, blob: out.blob, thumb: out.thumb, mime: out.blob.type, width: out.width, height: out.height, kind: 'single', cutout: true, private: true, rights: 'user_owned', alt: g.name });
        await store.repo.put('photos', { ...ph0, kind: 'real', alt: `${g.name} — photo réelle` });
        await store.repo.put('garments', { ...g, photoIds: [shopId, ...g.photoIds] });
      }
      toast(out.straightened ? `Présentation boutique prête (redressée de ${Math.abs(out.straightened)}°)` : 'Présentation boutique prête'); navigate(`#/wardrobe/${g.id}`);
    } catch (err) { msg.textContent = err.message; btn.disabled = false; }
  });
  main.querySelector('#uncut')?.addEventListener('click', async () => {
    if (real) { // on garde la vraie photo, la présentation est supprimée
      await store.repo.remove('photos', ph0.id); forgetPhotoURL(ph0.id);
      await store.repo.put('photos', { ...real, kind: 'single', alt: g.name });
      await store.repo.put('garments', { ...g, photoIds: g.photoIds.filter((id) => id !== ph0.id) });
    } else {
      await store.repo.put('photos', { ...ph0, blob: ph0.originalBlob, thumb: ph0.originalThumb, originalBlob: null, originalThumb: null, cutout: false });
      forgetPhotoURL(ph0.id);
    }
    toast('Présentation boutique retirée : la photo réelle est conservée'); navigate(`#/wardrobe/${g.id}`);
  });
  main.querySelector('#goweb')?.addEventListener('click', () => { focusWeb = true; navigate(`#/wardrobe/${g.id}/edit`); });
  main.querySelector('#fav').onclick = async () => { await store.repo.put('garments', { ...g, favorite: !g.favorite }); navigate(`#/wardrobe/${g.id}`); };
  main.querySelectorAll('[data-avail]').forEach((b) => b.onclick = async () => { await store.repo.put('garments', b.dataset.avail === 'clean' && g.availability === 'to-wash' ? afterWash(g) : { ...g, availability: b.dataset.avail }); toast(`Disponibilité : ${AVAIL_LABEL[b.dataset.avail]}`); navigate(`#/wardrobe/${g.id}`); });
  main.querySelector('#del').onclick = async () => {
    if (await confirmDialog({ title: 'Supprimer cette pièce ?', message: `« ${g.name} » et ses photos seront supprimées de cet appareil. Les tenues qui l'utilisent la signaleront comme pièce supprimée. Cette action est irréversible.`, confirmLabel: 'Supprimer', danger: true })) {
      (g.photoIds || []).forEach(forgetPhotoURL);
      await deleteGarment(g); toast('Pièce supprimée'); navigate('#/wardrobe');
    }
  };
  const all = await loadGarments();
  const box = main.querySelector('#pairings');
  if (!isAvailable(g)) { setHTML(box, html`<div class="callout callout-warn" style="grid-column:1/-1">Cette pièce est actuellement « ${AVAIL_LABEL[g.availability]} » : marquez-la disponible pour calculer des combinaisons portables.</div>`); return; }
  const res = pairingsFor(g, all, { profileId: pid() });
  if (!res.options.length) {
    setHTML(box, html`<div class="callout" style="grid-column:1/-1">${(res.info.missing || []).map((m) => html`<div>${m.text}</div>`)}<div style="margin-top:6px">Ajoutez les pièces manquantes au dressing, ou consultez les <a href="#/outfits/templates">modèles de tenues</a> en mode inspiration.</div></div>`);
    return;
  }
  setHTML(box, res.options.slice(0, 2).map((o, i) => proposalCard(o, i, { actions: false })));
  hydratePhotos(box);
  setHTML(box, html`${raw(box.innerHTML)}<div class="btn-row" style="grid-column:1/-1">${res.options.slice(0, 2).map((o, i) => html`<button class="btn btn-sm" data-save="${i}">Sauvegarder l'option ${i + 1}</button><button class="btn btn-sm" data-wear="${i}">Porter l'option ${i + 1}</button>`)}</div>`);
  hydratePhotos(box);
  box.querySelectorAll('[data-save]').forEach((b) => b.onclick = () => { const o = res.options[+b.dataset.save]; saveOutfit(o.pieces, { mode: o.mode, occasionId: res.info.occasion.id, score: o.score }); });
  box.querySelectorAll('[data-wear]').forEach((b) => b.onclick = () => { const o = res.options[+b.dataset.wear]; wearOutfit(o.pieces, { occasionId: res.info.occasion.id }); });
}

// ---------------------------------------------------------------- Éditeur
let pendingSource = null; // photo de dressing conservée pour découper plusieurs pièces
let pendingPreset = null; // fiche assortie à créer (ensemble / costume)
let focusWeb = false; // ouvrir la fiche directement sur « Retrouver ce vêtement sur internet »
/** Pièce assortie d'un ensemble : veste ↔ pantalon. */
export function setComplement(sub, category) {
  const m = { 'veste-costume': ['bas', 'pantalon-costume'], blazer: ['bas', 'pantalon'], 'pantalon-costume': ['veste', 'veste-costume'], pantalon: ['veste', 'blazer'], flanelle: ['veste', 'blazer'], chino: ['veste', 'surchemise'], 'veste-denim': ['bas', 'jean'], jean: ['veste', 'veste-denim'] };
  if (m[sub]) return { category: m[sub][0], sub: m[sub][1] };
  if (category === 'veste') return { category: 'bas', sub: 'pantalon-costume' };
  if (category === 'bas') return { category: 'veste', sub: 'veste-costume' };
  if (category === 'haut') return { category: 'bas', sub: 'pantalon' };
  return null;
}

async function renderEditor(main, existing, preset = {}) {
  const g = existing || { id: null, category: preset.category || 'haut', sub: preset.sub || 'chemise', seasons: [], styles: [], tags: [], measures: {}, availability: 'clean', condition: 'good', photoIds: [], rainResistance: 0, windResistance: 0, ...preset };
  const state = { source: null, rotation: 0, crop: { x: 0, y: 0, w: 1, h: 1 }, aspect: 'free', dominant: [], photoKind: preset.photoKind || 'single', removePhotos: new Set(), extras: [], pasteLabel: false, savedPhotoId: null };
  const ai = await aiStatus();
  const shopPref = await store.repo.kvGet('pref:cutout', false);
  const consentAI = store.profile.consents?.ai && store.profile.kind !== 'child';
  const colorOpts = GARMENT_COLORS.map((c) => [c.id, c.name]).concat([['custom', 'Personnalisée…']]);
  const subOpts = (cat) => CATEGORY_BY_ID[cat].subs.map(([id, name]) => [id, name]);
  setHTML(main, html`
    <a href="${existing ? `#/wardrobe/${existing.id}` : '#/wardrobe'}" class="small">← Annuler</a>
    <div class="page-head"><div class="eyebrow">${existing ? 'Modifier la fiche' : 'Nouvelle pièce'}</div><h1>${existing ? existing.name : 'Ajouter un vêtement'}</h1>
      <p class="lede">Photo facultative. Rien n'est déduit sans votre validation : composition et taille ne sont jamais supposées.</p></div>
    <form id="gform" novalidate>
    <fieldset><legend>Photo</legend>
      <div class="field"><label for="pkind">Ce que montre la photo</label><select id="pkind" name="photoKind">${options(PHOTO_KINDS, state.photoKind)}</select>
        <p class="hint" id="pkind-hint"></p></div>
      <div class="btn-row">
        <label class="btn" for="pcam">${icon('camera')} Prendre une photo</label><input id="pcam" type="file" accept="image/*" capture="environment" class="sr-only">
        <label class="btn" for="pfile">${icon('upload')} Galerie ou fichier</label><input id="pfile" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" class="sr-only">
        ${pendingSource && !existing ? html`<button class="btn" type="button" id="reuse">Reprendre la photo précédente</button>` : ''}
      </div>
      <details class="disclosure" style="margin-top:10px"><summary>Réussir une photo « comme en boutique »</summary>
        <ul class="small" style="margin:8px 0 0;padding-left:18px">
          <li><strong>Défroissez d'abord</strong> (vapeur ou fer) : aucune retouche ne retire honnêtement un pli sans inventer le tissu.</li>
          <li><strong>À plat</strong> sur un drap ou un sol uni et contrasté (pièce claire sur fond foncé, et inversement), ou <strong>sur cintre</strong> contre un mur uni.</li>
          <li>Téléphone <strong>bien parallèle</strong> à la pièce, au-dessus d'elle, pièce entière dans le cadre avec un peu de marge.</li>
          <li><strong>Lumière du jour</strong> indirecte, sans flash ni ombre du téléphone : la couleur enregistrée sera fidèle.</li>
          <li>Boutonnez, alignez les manches, rentrez le col : SPREZZA détoure, redresse et centre le reste.</li>
        </ul></details>
      <div id="cropper" class="hidden" style="margin-top:14px">
        <div class="crop-stage"><canvas id="cropcanvas" aria-label="Aperçu de la photo recadrée"></canvas></div>
        <div class="form-grid" style="margin-top:12px">
          <div class="field"><label for="aspect">Cadrage</label><select id="aspect">${options([['free', 'Image entière'], ['3:4', 'Vertical 3:4'], ['1:1', 'Carré']], 'free')}</select></div>
          <div class="field"><label for="zoom">Zoom</label><input id="zoom" type="range" min="1" max="3" step="0.05" value="1"></div>
          <div class="field"><label for="panx">Position horizontale</label><input id="panx" type="range" min="0" max="1" step="0.01" value="0.5"></div>
          <div class="field"><label for="pany">Position verticale</label><input id="pany" type="range" min="0" max="1" step="0.01" value="0.5"></div>
        </div>
        <div class="btn-row"><button class="btn btn-sm" type="button" id="rot">${icon('rotate')} Pivoter 90°</button><button class="btn btn-sm btn-ghost" type="button" id="clearphoto">Retirer cette photo</button></div>
        <div id="domcolors" style="margin-top:10px"></div>
        <label class="check" style="margin-top:10px"><input type="checkbox" id="shopstyle" ${shopPref ? raw('checked') : ''}> <span><strong>Présentation boutique</strong> à l'enregistrement : fond ivoire uni, pièce détourée, redressée et centrée, ombre douce. Sur l'appareil, sans envoi (premier usage : téléchargement unique d'environ ${CUTOUT_DOWNLOAD_MB} Mo).</span></label>
        <p class="small muted" id="shopmsg" aria-live="polite"></p>
      </div>
      <div class="card-flat" style="margin-top:12px"><p class="small"><strong>Autres photos de la même pièce</strong> <span class="muted">(facultatif) : dos, détail, étiquette</span></p>
        <div class="btn-row"><label class="btn btn-sm btn-gold" for="plabel">${icon('camera')} Photo de l'étiquette</label><input id="plabel" type="file" accept="image/*" capture="environment" class="sr-only">
          <label class="btn btn-sm" for="pextra">${icon('upload')} Ajouter des photos (dos, détail…)</label><input id="pextra" type="file" accept="image/*" multiple class="sr-only"></div>
        <p class="hint">L'étiquette (composition, taille, référence, pays) est lue sur votre appareil, sans envoi, puis proposée pour remplir la fiche.</p>
        <div id="extras" class="extras"></div><p class="small muted" id="ocrmsg" aria-live="polite"></p></div>
      ${existing?.photoIds?.length ? html`<div style="margin-top:12px"><p class="small muted">Photos enregistrées (cocher pour supprimer à l'enregistrement) :</p><div class="row">${existing.photoIds.map((ph) => html`<label class="check" style="flex-direction:column;align-items:flex-start"><span class="mini-thumb" style="width:70px"><img data-photo="${ph}" alt="Photo enregistrée"></span><span><input type="checkbox" data-rmphoto="${ph}"> Supprimer</span></label>`)}</div></div>` : ''}
      ${ai.ai && consentAI ? html`<button class="btn btn-sm" type="button" id="airecog" style="margin-top:10px">Suggérer les champs (IA)</button><p class="hint">La photo est envoyée au serveur IA configuré ; chaque champ suggéré reste à confirmer.</p>` : html`<p class="hint">Reconnaissance IA facultative : ${ai.ai ? 'activez le consentement IA dans Paramètres' : 'non configurée'} — couleurs estimées localement, sans envoi.</p>`}
      <div id="aiout"></div>
    </fieldset>
    <fieldset id="webid"><legend>Retrouver ce vêtement sur internet</legend>
      <p class="small muted">Collez le lien de l'article (Uniqlo, Zara, Mango, COS…) : SPREZZA lit la page et remplit seul nom, marque, type, couleur, matière, composition, coupe et prix. Vous vérifiez, et pouvez tout annuler.</p>
      <ol class="steps small">
        <li><strong>Chercher</strong> — par la photo (Google Lens) ou par texte.</li>
        <li><strong>Ouvrir le bon produit</strong>, copier son lien (ou son titre et sa composition).</li>
        <li><strong>Revenir ici, coller</strong>, vérifier les champs proposés.</li>
      </ol>
      <div class="btn-row">
        <button class="btn btn-gold" type="button" id="lensbtn">${icon('camera')} Recherche par photo (Google Lens)</button>
        <button class="btn" type="button" id="sharebtn" hidden>${icon('upload')} Partager la photo…</button>
        <button class="btn" type="button" id="textsearch">${icon('search')} Recherche par texte</button>
      </div>
      <p class="hint" id="lenshint"></p>
      <div class="card-flat" style="margin-top:10px"><p class="small" style="margin-top:0"><strong>Avec ChatGPT</strong> (ou Claude, Gemini…) — gratuit avec votre compte, aucune clé à configurer :</p>
        <div class="btn-row"><button class="btn btn-sm" type="button" id="gptcopy">1. Copier la consigne</button><button class="btn btn-sm" type="button" id="gptsend">2. Envoyer la photo à ChatGPT</button></div>
        <p class="hint">3. Dans ChatGPT : collez la consigne, joignez la photo (et celle de l'étiquette si vous l'avez), envoyez. 4. Dans ChatGPT, touchez « Copier le code » sur son bloc JSON, revenez ici et collez-le (ci-dessous ou via « { } Coller un JSON ») : la fiche se remplit seule.</p></div>
      <div id="textshops" class="btn-row"></div>
      <div class="field" style="margin-top:10px"><label for="webpaste">Lien de l'article, description, réponse ou JSON de ChatGPT</label>
        <textarea id="webpaste" rows="3" placeholder="Collez ici le lien de l'article : https://…"></textarea></div>
      <div class="btn-row"><button class="btn btn-sm" type="button" id="pastebtn">Coller</button><button class="btn btn-sm btn-primary" type="button" id="parsebtn">${icon('check')} Remplir la fiche</button></div>
      <div id="webout"></div>
    </fieldset>
    <fieldset><legend>Identification</legend>
      <div class="btn-row" style="margin:-4px 0 12px"><button class="btn btn-sm btn-gold" type="button" id="jsonbtn">{ } Coller un JSON</button><span class="small muted">Réponse de ChatGPT (ou autre) : tous les champs se remplissent d'un coup.</span></div>
      <div class="form-grid">
      <div class="field span-2"><label for="name">Nom *</label><input id="name" name="name" type="text" required value="${g.name || ''}" placeholder="ex. Pantalon écru taille mi-haute"></div>
      <div class="field"><label for="category">Catégorie *</label><select id="category" name="category">${options(CATEGORIES.map((c) => [c.id, c.name]), g.category)}</select></div>
      <div class="field"><label for="sub">Type *</label><select id="sub" name="sub">${options(subOpts(g.category), g.sub)}</select></div>
      <div class="field"><label for="color">Couleur principale *</label><div class="row" style="flex-wrap:nowrap"><select id="color" name="color">${options(colorOpts, g.color?.custom ? 'custom' : g.color?.id || 'navy')}</select><input type="color" id="colorhex" value="${g.color?.hex || '#22344E'}" aria-label="Couleur personnalisée"></div><p class="hint" id="colorhint">Couleur représentative, pas une mesure sous éclairage contrôlé.</p></div>
      <div class="field"><label for="color2">Couleur secondaire</label><select id="color2" name="color2">${options(GARMENT_COLORS.map((c) => [c.id, c.name]), g.color2?.id || '', { empty: 'Aucune' })}</select></div>
      <div class="field"><label for="pattern">Motif</label><select id="pattern" name="pattern">${options(PATTERNS, g.pattern || 'Uni')}</select></div>
      <div class="field"><label for="brand">Marque</label><input id="brand" name="brand" type="text" value="${g.brand || ''}"></div>
      <label class="check span-2"><input type="checkbox" id="isset" name="isset" ${g.setId ? raw('checked') : ''}> Fait partie d'un ensemble (costume : veste + pantalon assortis)</label>
      <p class="hint span-2" id="sethint">${g.setId ? 'Pièce reliée à son ensemble.' : 'Chaque pièce a sa propre fiche, reliée à l\'autre : SPREZZA les propose ensemble pour les occasions habillées, et séparément le reste du temps.'}</p>
    </div></fieldset>
    <fieldset><legend>Matière, coupe et taille</legend><div class="form-grid">
      <div class="field"><label for="material">Matière principale</label><input id="material" name="material" list="materials" type="text" value="${g.material || ''}"><datalist id="materials">${MATERIALS.map((m) => html`<option value="${m}">`)}</datalist></div>
      <div class="field"><label for="composition">Composition (si lue sur l'étiquette)</label><input id="composition" name="composition" type="text" value="${g.composition || ''}" placeholder="ex. 100 % laine"></div>
      <div class="field"><label for="fit">Coupe</label><select id="fit" name="fit">${options(FITS, g.fit || '', { empty: 'Non renseignée' })}</select></div>
      <div class="field"><label for="size">Taille (FR/EU)</label><input id="size" name="size" type="text" value="${g.size || ''}" placeholder="ex. 40, M, 48"></div>
    </div>
    <details class="disclosure"><summary>Mesures réelles (facultatif, cm)</summary><div class="form-grid" style="margin-top:10px">${MEASURE_FIELDS.map(([k, l]) => html`<div class="field"><label for="m-${k}">${l}</label><input id="m-${k}" name="m_${k}" type="number" min="0" step="0.5" inputmode="decimal" value="${g.measures?.[k] ?? ''}"></div>`)}</div></details>
    </fieldset>
    <fieldset><legend>Usage</legend>
      <div class="field"><span class="small muted">Saisons (aucune = toutes)</span><div class="chips">${SEASON_OPTS.map(([id, l]) => html`<label class="chip"><input type="checkbox" name="seasons" data-multi value="${id}" ${g.seasons?.includes(id) ? raw('checked') : ''}> ${l}</label>`)}</div></div>
      <div class="form-grid">
        <div class="field"><label for="formality">Formalité <output id="o-formality"></output>/5</label><input id="formality" name="formality" type="range" min="1" max="5" step="1" value="${g.formality || SUB_INFO[g.sub]?.formality || 3}"><p class="hint">1 détente · 3 smart casual · 5 costume/cravate</p></div>
        <div class="field"><label for="warmth">Chaleur <output id="o-warmth"></output>/5</label><input id="warmth" name="warmth" type="range" min="1" max="5" step="1" value="${g.warmth || Math.max(1, SUB_INFO[g.sub]?.warmth || 2)}"></div>
        <div class="field"><label for="comfort">Confort <output id="o-comfort"></output>/5</label><input id="comfort" name="comfort" type="range" min="1" max="5" step="1" value="${g.comfort || 3}"></div>
        <div class="field"><label for="rainResistance">Résistance pluie <output id="o-rainResistance"></output>/3</label><input id="rainResistance" name="rainResistance" type="range" min="0" max="3" step="1" value="${g.rainResistance ?? 0}"></div>
        <div class="field"><label for="windResistance">Résistance vent <output id="o-windResistance"></output>/3</label><input id="windResistance" name="windResistance" type="range" min="0" max="3" step="1" value="${g.windResistance ?? 0}"></div>
        <div class="field"><label for="condition">État</label><select id="condition" name="condition">${options(CONDITIONS.map(([id, l]) => [id, l]), g.condition || 'good')}</select></div>
        <div class="field"><label for="availability">Disponibilité</label><select id="availability" name="availability">${options(AVAILABILITY.map(([id, l]) => [id, l]), g.availability || 'clean')}</select></div>
      </div>
      <details class="disclosure"><summary>Styles compatibles</summary><div class="chips" style="margin-top:8px">${STYLE_OPTS.map(([id, l]) => html`<label class="chip"><input type="checkbox" name="styles" data-multi value="${id}" ${g.styles?.includes(id) ? raw('checked') : ''}> ${l}</label>`)}</div><p class="hint">Sans sélection, le styliste déduit la compatibilité du type de pièce.</p></details>
    </fieldset>
    <fieldset><legend>Achat et notes</legend><div class="form-grid">
      <div class="field"><label for="purchaseDate">Date d'achat</label><input id="purchaseDate" name="purchaseDate" type="date" value="${g.purchaseDate || ''}"></div>
      <div class="field"><label for="price">Prix (€, facultatif)</label><input id="price" name="price" type="number" min="0" step="0.01" inputmode="decimal" value="${g.price ?? ''}"></div>
      <div class="field"><label for="ref">Référence (étiquette)</label><input id="ref" name="ref" type="text" value="${g.ref || ''}" placeholder="ex. 0706/310/401"></div>
      <div class="field"><label for="origin">Fabrication</label><input id="origin" name="origin" type="text" value="${g.origin || ''}" placeholder="ex. Portugal"></div>
      <div class="field span-2"><label for="sourceUrl">Lien d'origine</label><input id="sourceUrl" name="sourceUrl" type="url" value="${g.sourceUrl || ''}" placeholder="https://…"></div>
      <div class="field span-2"><label for="tags">Tags (séparés par des virgules)</label><input id="tags" name="tags" type="text" value="${(g.tags || []).join(', ')}"></div>
      <div class="field span-2"><label for="notes">Notes</label><textarea id="notes" name="notes">${g.notes || ''}</textarea></div>
      <label class="check"><input type="checkbox" name="favorite" ${g.favorite ? raw('checked') : ''}> Favori</label>
      <label class="check span-2" id="everydayrow"><input type="checkbox" name="everyday" ${isEveryday(g) ? raw('checked') : ''}> Accessoire porté tous les jours (lunettes de vue, montre connectée…) : toujours inclus dans les tenues</label>
      <p class="hint span-2">Bracelet de montre : indiquez sa matière (cuir, métal, sport/silicone, nylon) et sa couleur ; SPREZZA choisira le bon bracelet selon la tenue.</p>
    </div></fieldset>
    <div class="callout callout-danger hidden" id="ferr" role="alert"></div>
    <div class="btn-row" style="position:sticky;bottom:calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 8px);background:var(--ivory);padding:10px 0">
      <button class="btn btn-primary" type="submit" id="savebtn">${icon('check')} Enregistrer</button>
      <a class="btn" href="${existing ? `#/wardrobe/${existing.id}` : '#/wardrobe'}">Annuler</a></div>
    </form>`);
  hydratePhotos(main);
  const $ = (s) => main.querySelector(s);
  const form = $('#gform');
  const kindHint = () => { $('#pkind-hint').textContent = ({ single: 'Une seule pièce : recadrez-la au plus près.', wardrobe: 'Photo de plusieurs pièces : recadrez une pièce à la fois ; après l\'enregistrement vous pourrez en découper une autre. Rien n\'est ajouté automatiquement.', worn: 'Tenue portée : recadrez la pièce concernée. Pour noter la tenue complète, utilisez l\'Analyse.' })[$('#pkind').value]; };
  $('#pkind').onchange = kindHint; kindHint();
  ['formality', 'warmth', 'comfort', 'rainResistance', 'windResistance'].forEach((id) => { const upd = () => { $(`#o-${id}`).textContent = $(`#${id}`).value; }; $(`#${id}`).addEventListener('input', upd); upd(); });
  $('#category').onchange = () => { setHTML($('#sub'), options(subOpts($('#category').value), '')); syncSub(); };
  const syncSub = () => { const s = SUB_INFO[$('#sub').value]; if (s && !existing) { $('#formality').value = s.formality; $('#warmth').value = Math.max(1, s.warmth); $('#formality').dispatchEvent(new Event('input')); $('#warmth').dispatchEvent(new Event('input')); } };
  $('#sub').onchange = syncSub;
  const syncColor = () => { const v = $('#color').value; if (v !== 'custom') $('#colorhex').value = COLOR_BY_ID[v].hex; $('#colorhint').textContent = v === 'custom' ? colorHint($('#colorhex').value) : 'Couleur représentative, pas une mesure sous éclairage contrôlé.'; };
  $('#color').onchange = syncColor;
  $('#colorhex').oninput = () => { $('#color').value = 'custom'; $('#colorhint').textContent = colorHint($('#colorhex').value); };
  if (g.color?.custom) $('#colorhint').textContent = colorHint(g.color.hex);

  // --- Photo pipeline
  const canvas = $('#cropcanvas');
  const draw = () => {
    if (!state.source) return;
    const z = +$('#zoom').value; const asp = $('#aspect').value;
    const rotated = state.rotation % 180 !== 0;
    const rw = rotated ? state.source.height : state.source.width; const rh = rotated ? state.source.width : state.source.height;
    let w = 1, h = 1;
    if (asp !== 'free') { const [ax, ay] = asp.split(':').map(Number); const target = ax / ay; if (rw / rh > target) w = (rh * target) / rw; else h = (rw / target) / rh; }
    w /= z; h /= z;
    state.crop = { w, h, x: (1 - w) * +$('#panx').value, y: (1 - h) * +$('#pany').value };
    const c = renderToCanvas(state.source, { rotation: state.rotation, crop: state.crop, maxSide: 900 });
    canvas.width = c.width; canvas.height = c.height; canvas.getContext('2d').drawImage(c, 0, 0);
  };
  const loadFile = async (file) => {
    try {
      await checkImageFile(file);
      state.source = await loadBitmap(file); state.rotation = 0;
      if (state.photoKind === 'wardrobe' || $('#pkind').value === 'wardrobe') pendingSource = state.source;
      $('#cropper').classList.remove('hidden'); draw(); await showDominant();
    } catch (e) { toast(e.message); }
  };
  const showDominant = async () => {
    const thumb = renderToCanvas(state.source, { rotation: state.rotation, crop: state.crop, maxSide: 240 });
    const { dominantColors } = await import('../services/image.js');
    state.dominant = dominantColors(thumb);
    setHTML($('#domcolors'), html`<p class="small muted">Couleurs estimées sur la zone centrale (à confirmer — l'éclairage modifie la couleur perçue) :</p><div class="chips">${state.dominant.map((d, i) => html`<button type="button" class="chip" data-dom="${i}">${swatch(d.hex)} ≈ ${d.nearestName} (${Math.round(d.share * 100)} %, proximité ${d.confidence})</button>`)}</div>`);
    $('#domcolors').querySelectorAll('[data-dom]').forEach((b) => b.onclick = () => { const d = state.dominant[+b.dataset.dom]; $('#color').value = d.nearestId; syncColor(); toast(`Couleur principale : ${d.nearestName}`); });
  };
  $('#pcam').onchange = (e) => e.target.files[0] && loadFile(e.target.files[0]);
  $('#pfile').onchange = (e) => e.target.files[0] && loadFile(e.target.files[0]);
  $('#reuse')?.addEventListener('click', () => { state.source = pendingSource; $('#pkind').value = 'wardrobe'; kindHint(); $('#cropper').classList.remove('hidden'); draw(); showDominant(); });
  ['#zoom', '#panx', '#pany', '#aspect'].forEach((s) => $(s).addEventListener('input', draw));
  $('#aspect').addEventListener('change', draw);
  $('#rot').onclick = () => { state.rotation = (state.rotation + 90) % 360; draw(); };
  $('#clearphoto').onclick = () => { state.source = null; $('#cropper').classList.add('hidden'); };
  main.querySelectorAll('[data-rmphoto]').forEach((cb) => cb.onchange = () => { if (cb.checked) state.removePhotos.add(cb.dataset.rmphoto); else state.removePhotos.delete(cb.dataset.rmphoto); });
  $('#airecog')?.addEventListener('click', () => aiRecognize(main, state));
  if (existing?.photoIds?.length) { const phs = await Promise.all(existing.photoIds.map((id) => store.repo.get('photos', id))); state.savedPhotoId = phs.find((ph) => ph && ph.blob && ph.kind !== 'label')?.id || null; }
  setupWebIdentify(main, state, { subOpts, syncSub, syncColor });
  setupExtraPhotos(main, state);
  $('#shopstyle')?.addEventListener('change', (e) => store.repo.kvSet('pref:cutout', e.target.checked));
  if (focusWeb) { focusWeb = false; setTimeout(() => { $('#webid').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('#webid').classList.add('flash'); }, 150); }

  form.onsubmit = async (e) => {
    e.preventDefault();
    const v = readForm(form);
    const err = $('#ferr');
    if (!v.name) { err.textContent = 'Le nom est obligatoire.'; err.classList.remove('hidden'); $('#name').focus(); return; }
    if (v.sourceUrl && !/^https?:\/\//i.test(v.sourceUrl)) { err.textContent = 'Le lien doit commencer par http:// ou https://'; err.classList.remove('hidden'); return; }
    err.classList.add('hidden');
    $('#savebtn').disabled = true;
    try {
      const colorVal = v.color === 'custom' ? (() => { const hex = $('#colorhex').value.toUpperCase(); const n = nearestColor(hex, GARMENT_COLORS); return { id: n.id, name: `Personnalisée (≈ ${n.name})`, hex, custom: true }; })() : { id: v.color, name: COLOR_BY_ID[v.color].name, hex: COLOR_BY_ID[v.color].hex };
      const measures = Object.fromEntries(MEASURE_FIELDS.map(([k]) => [k, v[`m_${k}`] ?? null]));
      let photoIds = (existing?.photoIds || []).filter((p) => !state.removePhotos.has(p));
      for (const ph of state.removePhotos) { await store.repo.remove('photos', ph); forgetPhotoURL(ph); }
      const id = existing?.id || uid('g');
      if (state.source) {
        let out = await processImage(state.source, { rotation: state.rotation, crop: state.crop });
        const phId = uid('ph');
        let cut = null;
        if ($('#shopstyle')?.checked) {
          const msg = $('#shopmsg');
          try { cut = await cutout(out.blob, ({ step, pct }) => { msg.textContent = `${step}${pct !== null ? ` — ${pct} %` : '…'}`; $('#savebtn').textContent = 'Présentation boutique…'; }); msg.textContent = cut.straightened ? `Pièce redressée de ${Math.abs(cut.straightened)}°.` : ''; }
          catch (err) { msg.textContent = `Présentation boutique impossible (${err.message}) : la photo d'origine est conservée.`; }
        }
        if (cut) { // présentation boutique en tête + vraie photo juste après (les deux synchronisées)
          const realId = uid('ph');
          await store.repo.put('photos', { id: phId, ownerId: id, profileId: pid(), blob: cut.blob, thumb: cut.thumb, mime: cut.blob.type || 'image/jpeg', width: cut.width, height: cut.height, kind: 'single', cutout: true, private: true, rights: 'user_owned', alt: v.name });
          await store.repo.put('photos', { id: realId, ownerId: id, profileId: pid(), blob: out.blob, thumb: out.thumbBlob, mime: out.blob.type || 'image/jpeg', width: out.width, height: out.height, kind: 'real', private: true, rights: 'user_owned', alt: `${v.name} — photo réelle` });
          photoIds = existing ? [phId, realId, ...photoIds] : [...photoIds, phId, realId];
        } else {
          await store.repo.put('photos', { id: phId, ownerId: id, profileId: pid(), blob: out.blob, thumb: out.thumbBlob, mime: out.blob.type || 'image/jpeg', width: out.width, height: out.height, kind: v.photoKind, private: true, rights: 'user_owned', alt: v.name });
          photoIds = [...photoIds, phId];
        }
      }
      const ORDER = { back: 1, detail: 2, label: 3 };
      for (const x of [...state.extras].sort((a, b) => ORDER[a.role] - ORDER[b.role])) {
        const out = await processImage(x.bitmap, {});
        const phId = uid('ph');
        await store.repo.put('photos', { id: phId, ownerId: id, profileId: pid(), blob: out.blob, thumb: out.thumbBlob, mime: 'image/jpeg', width: out.width, height: out.height, kind: x.role, private: true, rights: 'user_owned', alt: `${v.name} — ${EXTRA_ROLES[x.role]}` });
        photoIds = [...photoIds, phId];
      }
      if (state.saveProductPhotos && state.productPicks?.length) { $('#savebtn').textContent = 'Photos de l\'article…'; photoIds = [...photoIds, ...(await state.saveProductPhotos(id))]; }
      const newSet = !!v.isset && (!g.setId || !(await loadGarments()).some((x) => x.setId === g.setId && x.id !== existing?.id));
      const setId = v.isset ? (g.setId || uid('set')) : null;
      const rec = {
        ...(existing || {}), id, profileId: existing?.profileId || pid(), name: v.name, category: v.category, sub: v.sub,
        color: colorVal, color2: v.color2 ? { id: v.color2, name: COLOR_BY_ID[v.color2].name, hex: COLOR_BY_ID[v.color2].hex } : null,
        pattern: v.pattern, material: v.material, composition: v.composition, fit: v.fit || null, size: v.size, measures, brand: v.brand,
        seasons: v.seasons || [], formality: v.formality, warmth: v.warmth, comfort: v.comfort, rainResistance: v.rainResistance, windResistance: v.windResistance,
        styles: v.styles || [], condition: v.condition, availability: v.availability, purchaseDate: v.purchaseDate || null, price: v.price,
        sourceUrl: v.sourceUrl || null, tags: v.tags ? v.tags.split(',').map((t) => t.trim()).filter((t) => t && t !== 'à compléter') : [], // fiche complétée notes: v.notes, favorite: !!v.favorite,
        photoIds, photoKind: v.photoKind, ref: v.ref || null, origin: v.origin || null, setId, everyday: v.category === 'accessoire' ? !!v.everyday : undefined,
      };
      delete rec.capsuleId; delete rec.wishId;
      await store.repo.put('garments', rec);
      if (!existing && g.capsuleId) { const key = `capsule:${pid()}`; const cap = await store.repo.kvGet(key, { level: 1, items: {} }); cap.items[g.capsuleId] = { owned: true, garmentId: id }; await store.repo.kvSet(key, cap); }
      if (!existing && g.wishId) { const w = await store.repo.get('wishlist', g.wishId); if (w) await store.repo.put('wishlist', { ...w, linkedGarmentId: id }); }
      if (state.lensUsed) store.sync.clearLens();
      toast(existing ? 'Fiche mise à jour' : 'Pièce ajoutée au dressing');
      const comp = newSet ? setComplement(v.sub, v.category) : null;
      if (comp) {
        const other = SUB_INFO[comp.sub];
        openModal({ title: 'Créer la pièce assortie ?', body: html`<p>« ${v.name} » fait partie d'un ensemble. Créez maintenant la fiche « ${other.name} » : couleur, matière, composition, marque et motif sont repris, et les deux fiches sont reliées.</p><p class="small muted">Deux fiches valent mieux qu'une : la veste se porte aussi en blazer, le pantalon avec un pull, et chacun a son propre rythme de lavage.</p><div class="btn-row"><button class="btn btn-primary" data-yes>Créer « ${other.name} »</button><button class="btn" data-no>Plus tard</button></div>`,
          onMount(body, close) {
            body.querySelector('[data-yes]').onclick = () => {
              pendingPreset = { category: comp.category, sub: comp.sub, name: `${other.name} — ensemble ${v.brand || ''}`.replace(/\s+$/, '').replace(/ensemble $/, 'ensemble'), color: rec.color, color2: rec.color2, pattern: rec.pattern, material: rec.material, composition: rec.composition, brand: rec.brand, fit: rec.fit, seasons: rec.seasons, styles: rec.styles, condition: rec.condition, purchaseDate: rec.purchaseDate, sourceUrl: rec.sourceUrl, setId };
              if (state.source) pendingSource = state.source;
              close(); navigate('#/wardrobe/new?set=1');
            };
            body.querySelector('[data-no]').onclick = () => { close(); navigate(`#/wardrobe/${id}`); };
          } });
      } else if (!existing && v.photoKind === 'wardrobe' && pendingSource) {
        openModal({ title: 'Découper une autre pièce ?', body: html`<p>Cette photo montre plusieurs pièces. Voulez-vous en découper une autre ? Rien n'est ajouté sans votre validation.</p><div class="btn-row"><button class="btn btn-primary" data-yes>Découper une autre pièce</button><button class="btn" data-no>Terminer</button></div>`,
          onMount(body, close) { body.querySelector('[data-yes]').onclick = () => { close(); navigate('#/wardrobe/new'); }; body.querySelector('[data-no]').onclick = () => { pendingSource = null; close(); navigate(`#/wardrobe/${id}`); }; } });
      } else navigate(`#/wardrobe/${id}`);
    } catch (e2) { err.textContent = `Enregistrement impossible : ${e2.message}`; err.classList.remove('hidden'); $('#savebtn').disabled = false; }
  };
}
// ---------------------------------------------------------------- Photos supplémentaires et étiquette
const EXTRA_ROLES = { back: 'Dos', detail: 'Détail', label: 'Étiquette' };
function setupExtraPhotos(main, state) {
  const $ = (s) => main.querySelector(s);
  const msg = (t) => { $('#ocrmsg').textContent = t; };
  const draw = () => {
    setHTML($('#extras'), state.extras.map((x, i) => html`<div class="extra">
      <span class="mini-thumb" style="width:76px"><img src="${x.url}" alt="${EXTRA_ROLES[x.role]}"></span>
      <select data-role="${i}" aria-label="Type de photo">${options(Object.entries(EXTRA_ROLES), x.role)}</select>
      ${x.role === 'label' ? html`<button class="btn btn-sm btn-primary" type="button" data-ocr="${i}">Lire l'étiquette</button>` : ''}
      <button class="btn btn-sm btn-ghost" type="button" data-rmx="${i}">Retirer</button></div>`));
    $('#extras').querySelectorAll('[data-role]').forEach((sel) => sel.onchange = () => { state.extras[+sel.dataset.role].role = sel.value; draw(); });
    $('#extras').querySelectorAll('[data-rmx]').forEach((b) => b.onclick = () => { URL.revokeObjectURL(state.extras[+b.dataset.rmx].url); state.extras.splice(+b.dataset.rmx, 1); draw(); });
    $('#extras').querySelectorAll('[data-ocr]').forEach((b) => b.onclick = () => ocr(state.extras[+b.dataset.ocr], b));
  };
  const add = async (files, role) => {
    for (const file of files) {
      try { await checkImageFile(file); state.extras.push({ bitmap: await loadBitmap(file), url: URL.createObjectURL(file), role }); } catch (e) { toast(e.message); }
    }
    draw();
  };
  const ocr = async (x, btn) => {
    if (btn) btn.disabled = true;
    try {
      const { canvasToBlob } = await import('../services/image.js');
      const blob = await canvasToBlob(renderToCanvas(x.bitmap, { maxSide: 2000 }), 0.92);
      const { text } = await readLabel(blob, ({ step, pct }) => msg(`${step}${pct !== null && pct !== undefined ? ` — ${pct} %` : '…'}`));
      if (!text.trim()) { msg('Aucun texte lisible : reprenez l\'étiquette à plat, bien éclairée, sans reflet, en remplissant la photo.'); return; }
      $('#webpaste').value = text.trim(); state.pasteLabel = true;
      msg('Étiquette lue : vérifiez les caractéristiques proposées ci-dessous (la lecture peut se tromper sur un texte usé ou plissé).');
      $('#parsebtn').click();
      $('#webid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) { msg(`Lecture impossible : ${e.message}. Astuce iPhone : dans Photos, appuyez longuement sur le texte de l'étiquette, copiez-le et collez-le dans « Retrouver ce vêtement sur internet ».`); }
    finally { if (btn) btn.disabled = false; }
  };
  $('#plabel').onchange = async (e) => { const f = [...e.target.files]; e.target.value = ''; await add(f, 'label'); const x = state.extras[state.extras.length - 1]; if (x?.role === 'label') ocr(x, $('#extras').querySelector(`[data-ocr="${state.extras.length - 1}"]`)); };
  $('#pextra').onchange = (e) => { const f = [...e.target.files]; e.target.value = ''; add(f, 'back'); };
  $('#isset').onchange = () => { $('#sethint').textContent = $('#isset').checked ? 'À l\'enregistrement, SPREZZA proposera de créer la pièce assortie (même couleur, matière, marque), reliée à celle-ci.' : 'Pièce indépendante.'; };
  void OCR_DOWNLOAD_MB;
}

// ---------------------------------------------------------------- Identification sur internet
async function croppedPhotoBlob(state) {
  if (!state.source && state.savedPhotoId) return (await store.repo.get('photos', state.savedPhotoId))?.blob; // photo déjà enregistrée
  const { canvasToBlob } = await import('../services/image.js');
  return canvasToBlob(renderToCanvas(state.source, { rotation: state.rotation, crop: state.crop, maxSide: 1200 }), 0.86);
}
function setupWebIdentify(main, state, { subOpts, syncSub, syncColor }) {
  const $ = (s) => main.querySelector(s);
  const hint = (t) => { $('#lenshint').textContent = t; };
  const canShareFiles = !!(navigator.canShare && navigator.canShare({ files: [new File([''], 'x.jpg', { type: 'image/jpeg' })] }));
  if (canShareFiles) $('#sharebtn').hidden = false;
  hint(store.profile.kind === 'child' ? 'Profil enfant : la recherche par photo est désactivée (aucune photo envoyée). Utilisez la recherche par texte.' : 'La recherche par photo envoie la photo recadrée à Google, seulement quand vous cliquez.');

  $('#lensbtn').onclick = async () => {
    if (store.profile.kind === 'child') { toast('Désactivé pour un profil enfant'); return; }
    if (!state.source && !state.savedPhotoId) { toast('Prenez ou choisissez d\'abord une photo'); $('#pcam').scrollIntoView({ block: 'center' }); return; }
    const signedIn = !!(await store.sync.session());
    if (!signedIn) {
      // Sans compte : pas d'hébergement temporaire possible → partage vers l'app Google, ou import manuel dans Lens.
      if (canShareFiles) { hint('Sans compte SPREZZA, la photo passe par le partage : choisissez « Google » (ou « Rechercher avec Google Lens »), ou enregistrez-la puis importez-la dans Lens.'); $('#sharebtn').click(); }
      else { window.open('https://lens.google.com/', '_blank', 'noopener'); hint('Google Lens est ouvert : cliquez sur « Importer un fichier » et choisissez la photo. Astuce : connectez-vous à la synchro (Paramètres) pour l\'envoi direct.'); }
      return;
    }
    const w = window.open('', '_blank'); // ouvert tout de suite (sinon bloqué par Safari), rempli après l'envoi
    if (w) { try { w.opener = null; w.document.title = 'Recherche…'; w.document.body.innerHTML = '<p style="font:16px system-ui;padding:24px">Envoi de la photo à Google Lens…</p>'; } catch { /* autre origine */ } }
    hint('Envoi de la photo (lien temporaire 15 min)…');
    try {
      const url = await store.sync.lensUrl(await croppedPhotoBlob(state));
      const lens = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`;
      if (w) w.location.href = lens; else window.open(lens, '_blank', 'noopener');
      hint('Résultats ouverts dans un nouvel onglet. Ouvrez le produit correspondant, copiez son lien, revenez ici et collez-le ci-dessous. La photo temporaire est effacée à l\'enregistrement de la fiche.');
      state.lensUsed = true;
    } catch (e) { if (w) w.close(); hint(`Recherche par photo impossible : ${e.message}. Utilisez « Partager la photo » ou la recherche par texte.`); }
  };

  $('#sharebtn').onclick = async () => {
    if (!state.source && !state.savedPhotoId) { toast('Prenez ou choisissez d\'abord une photo'); return; }
    try {
      const file = new File([await croppedPhotoBlob(state)], 'sprezza-vetement.jpg', { type: 'image/jpeg' });
      await navigator.share({ files: [file], title: 'Vêtement à identifier' });
    } catch (e) { if (e.name !== 'AbortError') toast(`Partage impossible : ${e.message}`); }
  };

  // ChatGPT par copier-coller : consigne au format relu par SPREZZA, photo partagée vers l'app.
  $('#gptcopy').onclick = async () => {
    const text = assistantPrompt();
    try { await navigator.clipboard.writeText(text); toast('Consigne copiée : collez-la dans ChatGPT'); }
    catch { $('#webpaste').value = text; $('#webpaste').select(); toast('Copiez la consigne affichée dans la zone ci-dessous'); }
  };
  let prepared = null;
  const prepare = () => (prepared ||= (async () => {
    const files = [];
    if (state.source || state.savedPhotoId) { const b = await croppedPhotoBlob(state); if (b) files.push(new File([b], 'vetement.jpg', { type: 'image/jpeg' })); }
    const lbl = state.extras.find((x) => x.role === 'label');
    if (lbl) { const { canvasToBlob } = await import('../services/image.js'); files.push(new File([await canvasToBlob(renderToCanvas(lbl.bitmap, { maxSide: 1600 }), 0.88)], 'etiquette.jpg', { type: 'image/jpeg' })); }
    return files;
  })());
  $('#gptsend').addEventListener('pointerdown', () => { prepared = null; prepare(); });
  $('#gptsend').onclick = async () => {
    if (store.profile.kind === 'child') { toast('Désactivé pour un profil enfant'); return; }
    const files = await prepare(); prepared = null;
    if (!files.length) { window.open('https://chatgpt.com/', '_blank', 'noopener'); toast('Aucune photo dans la fiche : joignez-la directement dans ChatGPT'); return; }
    if (navigator.canShare && navigator.canShare({ files })) {
      try { await navigator.share({ files }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    // Ordinateur : la photo est téléchargée, ChatGPT s'ouvre ; glissez-y la photo.
    files.forEach((f) => { const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); });
    window.open('https://chatgpt.com/', '_blank', 'noopener');
    toast('Photo enregistrée dans vos téléchargements : glissez-la dans ChatGPT avec la consigne');
  };

  $('#textsearch').onclick = () => {
    const sub = SUB_INFO[$('#sub').value]; const col = COLOR_BY_ID[$('#color').value];
    const q = identifyQuery({ brand: $('#brand').value.trim(), subName: sub?.name || '', colorName: col?.name || '', material: $('#material').value.trim() });
    const g = store.profile.kind === 'woman' ? 'femme' : 'homme';
    const brand = $('#brand').value.trim().toLowerCase();
    const own = RETAILERS.find((r) => brand && r.name.toLowerCase() === brand);
    // Marque connue : son site (sans répéter la marque) + revendeurs multimarques ; sinon les boutiques rapides.
    const multi = ['Zalando', 'Vinted'].map((n) => RETAILERS.find((r) => r.name === n));
    const shops = (brand ? [own, ...multi] : QUICK_SHOPS.map((n) => RETAILERS.find((r) => r.name === n))).filter((r, i, a) => r && a.indexOf(r) === i);
    const qFor = (r) => (r === own ? identifyQuery({ subName: sub?.name || '', colorName: col?.name || '', material: $('#material').value.trim() }) : q);
    const refQ = $('#ref').value.trim() ? `${$('#brand').value.trim()} ${$('#ref').value.trim()}`.trim() : '';
    setHTML($('#textshops'), html`${refQ ? html`<a class="btn btn-sm btn-primary" href="https://www.google.com/search?q=${encodeURIComponent(refQ)}" target="_blank" rel="noopener noreferrer">${icon('search')} Référence exacte « ${refQ} »</a>` : ''}<p class="small muted span-2" style="width:100%">Recherche : « ${q} » — renseignez d'abord marque, type et couleur pour un résultat précis.</p>
      <a class="btn btn-sm btn-gold" href="${priceCompareUrl(`${q} ${g}`)}" target="_blank" rel="noopener noreferrer">${icon('search')} Google Shopping</a>
      ${shops.map((r) => html`<a class="btn btn-sm" href="${shopSearchUrl(r, qFor(r), g)}" target="_blank" rel="noopener noreferrer">${r.name}</a>`)}`);
  };

  $('#pastebtn').onclick = async () => {
    state.pasteLabel = false;
    try { const t = await navigator.clipboard.readText(); if (t) { $('#webpaste').value = t; $('#parsebtn').click(); } else toast('Presse-papiers vide'); }
    catch { toast('Collez avec un appui long dans le champ'); $('#webpaste').focus(); }
  };

  // Lien collé : lecture de la page produit, puis remplissage automatique (annulable).
  const FIELDS = ['name', 'brand', 'category', 'sub', 'color', 'colorhex', 'color2', 'material', 'composition', 'pattern', 'fit', 'price', 'size', 'ref', 'origin', 'sourceUrl'];
  let lastUrl = '';
  const run = async () => {
    const out = $('#webout');
    let input = $('#webpaste').value.trim();
    // Un JSON (ou une réponse structurée) fait foi : pas de lecture de page, même s'il contient un lien.
    const url = !state.pasteLabel && !parseStructured(input) && input.match(/https?:\/\/[^\s"'<>]+/)?.[0];
    let pageName = ''; let note = '';
    if (!url) { state.product = null; state.productPicks = []; }
    if (url) {
      lastUrl = url;
      setHTML(out, html`<p class="small"><span class="loader"></span> Lecture de la page produit (${url.replace(/^https?:\/\/(www\d?\.)?/, '').split('/')[0]})…</p>`);
      $('#parsebtn').disabled = true;
      try {
        const { fetchProductPage } = await import('../services/product-fetch.js');
        const page = await fetchProductPage(url);
        const r = readerToText(page);
        pageName = r.name; input = `${r.text}\n${input}`;
        const images = pageImages(page.content); const variants = colorVariants(page.content);
        state.product = { url, images, variants, cur: currentColorCode(url, images) };
      } catch (e) { state.product = null; note = `Page non lisible (${e.message}) : seules les informations du lien sont reprises. Copiez le titre et la composition depuis la page et collez-les ici pour compléter.`; }
      finally { $('#parsebtn').disabled = false; }
    }
    const p = parseProduct(input, { label: state.pasteLabel });
    // « J'ai acheté le kaki » : la couleur écrite par vous l'emporte sur celle de la page, et choisit le bon coloris.
    const own = url ? $('#webpaste').value.replace(/https?:\/\/\S+/g, ' ').trim() : '';
    const ownColor = own ? parseProduct(own).color : null;
    if (url) delete p.color2; // sur une page produit, les autres couleurs citées sont d'autres coloris, pas une couleur secondaire
    if (ownColor) { p.color = ownColor; delete p.colorHex; delete p.colorUnknown; }
    if (state.product) {
      const v = state.product.variants;
      const byName = (id) => v.find((x) => parseProduct(x.name).color === id || x.name.toLowerCase() === COLOR_BY_ID[id]?.name.toLowerCase());
      state.product.pick = (ownColor && byName(ownColor)) || v.find((x) => x.code && x.code === state.product.cur) || v.find((x) => x.selected) || null;
      if (!ownColor && state.product.pick) { const c = parseProduct(state.product.pick.name).color; if (c) p.color = c; }
    }
    if (url && !pageName) { const fromLink = parseProduct(url).name; if (fromLink) p.name = fromLink; else delete p.name; } // votre phrase n'est jamais prise pour le nom
    if (pageName) p.name = pageName.charAt(0).toUpperCase() + pageName.slice(1).toLowerCase().replace(/\boxford\b/, 'Oxford');
    if (!p.found.length && !pageName) { setHTML(out, html`<p class="small callout callout-warn">${note || 'Rien de reconnu. Collez le lien de l\'article, son titre complet ou sa composition.'}</p>`); return; }
    const rows = [];
    if (p.name && (!$('#name').value.trim() || url || p.fromAssistant || $('#name').value === state.autoName)) rows.push(['name', 'Nom', p.name, p.name]);
    if (p.brand) rows.push(['brand', 'Marque', p.brand, p.brand]);
    if (p.sub) rows.push(['sub', 'Type', `${CATEGORY_BY_ID[p.category].name} › ${SUB_INFO[p.sub].name}`, p.sub]);
    if (p.color) rows.push(['color', 'Couleur principale', COLOR_BY_ID[p.color].name, p.color]);
    else if (p.colorHex) rows.push(['colorcustom', 'Couleur principale', `${p.colorUnknown ? `${p.colorUnknown} ` : ''}${p.colorHex} (≈ ${COLOR_BY_ID[p.colorNearest]?.name || 'personnalisée'})`, p.colorHex]);
    if (p.color2) rows.push(['color2', 'Couleur secondaire', COLOR_BY_ID[p.color2].name, p.color2]);
    if (p.material) rows.push(['material', 'Matière', p.material, p.material]);
    if (p.composition) rows.push(['composition', 'Composition', p.composition, p.composition]);
    if (p.pattern) rows.push(['pattern', 'Motif', p.pattern, p.pattern]);
    if (p.fit) rows.push(['fit', 'Coupe', FITS.find(([id]) => id === p.fit)?.[1] || p.fit, p.fit]);
    if (p.price) rows.push(['price', 'Prix', fmtEUR(p.price), p.price]);
    if (p.size) rows.push(['size', 'Taille', p.size, p.size]);
    if (p.ref) rows.push(['ref', 'Référence', p.ref, p.ref]);
    if (p.origin) rows.push(['origin', 'Fabrication', p.origin, p.origin]);
    if (p.seasons) rows.push(['seasons', 'Saisons', p.seasons.length ? p.seasons.map((x) => SEASON_OPTS.find(([id]) => id === x)?.[1]).join(', ') : 'Toutes', p.seasons]);
    if (p.formality) rows.push(['formality', 'Formalité', `${p.formality}/5`, p.formality]);
    if (p.warmth) rows.push(['warmth', 'Chaleur', `${p.warmth}/5`, p.warmth]);
    if (p.styles?.length) rows.push(['styles', 'Styles', p.styles.map((id) => STYLE_OPTS.find(([x]) => x === id)?.[1]).join(', '), p.styles]);
    if (p.measures) rows.push(['measures', 'Mesures', Object.entries(p.measures).map(([k, v]) => `${MEASURE_FIELDS.find(([x]) => x === k)?.[1] || k} ${v} cm`).join(', '), p.measures]);
    if (p.notes) rows.push(['notes', 'Notes', p.notes.length > 90 ? `${p.notes.slice(0, 90)}…` : p.notes, p.notes]);
    if (p.sourceUrl) rows.push(['sourceUrl', 'Lien d\'origine', p.sourceUrl.replace(/^https?:\/\/(www\d?\.)?/, '').slice(0, 48), p.sourceUrl]);
    // Remplissage immédiat, avec retour arrière possible.
    const before = Object.fromEntries(FIELDS.map((f) => [f, $(`#${f}`)?.value]));
    before.formality = $('#formality').value; before.warmth = $('#warmth').value; before.notes = $('#notes').value;
    before.styles = [...main.querySelectorAll('input[name=styles]')].filter((c) => c.checked).map((c) => c.value);
    before.measures = Object.fromEntries(MEASURE_FIELDS.map(([k]) => [k, $(`#m-${k}`)?.value ?? ''])); before.seasons = [...main.querySelectorAll('input[name=seasons]')].filter((c) => c.checked).map((c) => c.value);
    const setSeasons = (list) => main.querySelectorAll('input[name=seasons]').forEach((c) => { c.checked = list.includes(c.value); });
    for (const [f, , , val] of rows) {
      if (f === 'sub') { $('#category').value = p.category; setHTML($('#sub'), options(subOpts(p.category), p.sub)); syncSub(); }
      else if (f === 'color') { $('#color').value = val; syncColor(); }
      else if (f === 'colorcustom') { $('#color').value = 'custom'; $('#colorhex').value = val; $('#colorhint').textContent = colorHint(val); }
      else if (f === 'seasons') setSeasons(val);
      else if (f === 'styles') main.querySelectorAll('input[name=styles]').forEach((c) => { c.checked = val.includes(c.value); });
      else if (f === 'measures') Object.entries(val).forEach(([k, v]) => { const el = $(`#m-${k}`); if (el) el.value = v; });
      else if (f === 'formality' || f === 'warmth') { $(`#${f}`).value = val; $(`#${f}`).dispatchEvent(new Event('input')); }
      else { const el = $(`#${f}`); if (el) el.value = val; }
    }
    if (p.name && rows.some(([f]) => f === 'name')) state.autoName = p.name;
    setHTML(out, html`<div class="card-flat" style="margin-top:10px"><p class="small"><strong>${icon('check')} ${rows.length} champ(s) rempli(s)</strong>${url && !note ? ' depuis la page de l\'article' : ''} — vérifiez avant d'enregistrer.</p>
      <ul class="small" style="margin:6px 0 8px;padding-left:18px">${rows.map(([, l, v]) => html`<li>${l} : <strong>${v}</strong></li>`)}</ul>
      ${note ? html`<p class="small callout callout-warn">${note}</p>` : ''}
      ${p.subGuessed ? html`<p class="small callout callout-warn">Seule la catégorie « ${CATEGORY_BY_ID[p.category].name} » est connue : précisez le type exact (jean, chino…).</p>` : ''}
      ${p.colorUnknown && !p.color && !p.colorHex ? html`<p class="small callout callout-warn">Couleur « ${p.colorUnknown} » non reconnue : choisissez la plus proche dans « Couleur principale », ou « Personnalisée… » pour la régler précisément.</p>` : ''}
      ${p.fromAssistant ? html`<p class="small ${p.confidence === 'faible' ? 'callout callout-warn' : 'muted'}">Confiance de l'assistant : <strong>${({ faible: 'faible', moyenne: 'moyenne', elevee: 'élevée' })[p.confidence] || 'non indiquée'}</strong>${p.remark ? html` — ${p.remark}` : ''}</p>` : ''}
      <p class="hint">La taille vient seulement de l'étiquette : indiquez la vôtre. La couleur choisie sur le site peut différer de votre pièce (vérifiez-la).</p>
      <button class="btn btn-sm btn-ghost" type="button" id="webundo">Annuler le remplissage</button></div>`);
    out.querySelector('#webundo').onclick = () => {
      $('#category').value = before.category; setHTML($('#sub'), options(subOpts(before.category), before.sub));
      for (const f of FIELDS) if (!['category', 'sub'].includes(f) && $(`#${f}`)) $(`#${f}`).value = before[f] ?? '';
      setSeasons(before.seasons); $('#notes').value = before.notes; main.querySelectorAll('input[name=styles]').forEach((c) => { c.checked = before.styles.includes(c.value); }); Object.entries(before.measures).forEach(([k, v]) => { const el = $(`#m-${k}`); if (el) el.value = v; }); for (const f of ['formality', 'warmth']) { $(`#${f}`).value = before[f]; $(`#${f}`).dispatchEvent(new Event('input')); }
      state.product = null; state.productPicks = [];
      syncColor(); setHTML(out, html`<p class="small muted">Remplissage annulé.</p>`);
    };
    renderProductPhotos();
    toast(`${rows.length} champ(s) rempli(s) — vérifiez puis enregistrez`);
    if ($('#ref').value && $('#brand').value) $('#textsearch').click();
  };
  $('#parsebtn').onclick = run;

  // Photos de l'article (coloris acheté) : affichées et enregistrées via wsrv.nl (proxy d'images gratuit, converti en WebP).
  const proxied = (u, w) => `https://wsrv.nl/?url=${encodeURIComponent(u)}&w=${w}&output=webp&q=82`;
  const renderProductPhotos = () => {
    const pr = state.product; let box = $('#prodphotos');
    if (!box) { box = document.createElement('div'); box.id = 'prodphotos'; $('#webout').appendChild(box); }
    if (!pr || !pr.images.length) { box.innerHTML = ''; state.productPicks = []; return; }
    const to = pr.pick?.code || pr.cur;
    const imgs = imagesForColor(pr.images, pr.cur, to).slice(0, 8);
    state.productPicks = state.productPicks?.length && pr.lastTo === to ? state.productPicks.filter((u) => imgs.some((i) => i.url === u)) : imgs.slice(0, 2).map((i) => i.url);
    pr.lastTo = to;
    setHTML(box, html`<div class="card-flat" style="margin-top:10px"><p class="small" style="margin-top:0"><strong>Photos de l'article</strong>${pr.pick ? html` — coloris <strong>${pr.pick.name}</strong>` : ''}. Cochez celles à garder dans la fiche (en plus de vos propres photos).</p>
      ${pr.variants.length > 1 ? html`<p class="small muted" style="margin:6px 0">Quel coloris avez-vous acheté ?</p><div class="chips">${pr.variants.map((v, i) => html`<button type="button" class="chip" data-variant="${i}" aria-pressed="${pr.pick === v}">${v.name}</button>`)}</div>` : ''}
      <div class="prod-grid">${imgs.map((im) => html`<label class="prod-pick"><input type="checkbox" data-pick="${im.url}" ${state.productPicks.includes(im.url) ? raw('checked') : ''}><img src="${proxied(im.url, 240)}" alt="${im.alt || 'Photo de l\'article'}" loading="lazy"></label>`)}</div>
      <p class="hint">Photos du site, gardées en privé dans votre dressing (usage personnel). Si une photo ne correspond pas au coloris, décochez-la.</p></div>`);
    box.querySelectorAll('[data-pick]').forEach((cb) => cb.onchange = () => { state.productPicks = [...box.querySelectorAll('[data-pick]:checked')].map((x) => x.dataset.pick); });
    box.querySelectorAll('[data-variant]').forEach((b) => b.onclick = () => {
      pr.pick = pr.variants[+b.dataset.variant];
      const c = parseProduct(pr.pick.name).color; if (c) { $('#color').value = c; syncColor(); } $('#color2').value = '';
      if (!pr.pick.code && pr.pick.href) { $('#webpaste').value = pr.pick.href; run(); return; } // coloris sans code : on relit sa page
      renderProductPhotos(); toast(`Coloris ${pr.pick.name}${c ? ` — couleur ${COLOR_BY_ID[c].name}` : ''}`);
    });
  };
  state.saveProductPhotos = async (ownerId) => {
    const ids = [];
    for (const u of state.productPicks || []) {
      try {
        const [blob, thumb] = await Promise.all([proxied(u, 1400), proxied(u, 480)].map((x) => fetch(x, { credentials: 'omit', referrerPolicy: 'no-referrer' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.blob(); })));
        const id = uid('ph');
        await store.repo.put('photos', { id, ownerId, profileId: pid(), blob, thumb, mime: blob.type, kind: 'product', private: true, rights: 'retailer_personal_use', source: u, alt: 'Photo de l\'article' });
        ids.push(id);
      } catch { /* photo indisponible : ignorée */ }
    }
    return ids;
  };
  // Bouton « Coller un JSON » à côté des informations.
  $('#jsonbtn').onclick = () => {
    const current = () => JSON.stringify({ nom: $('#name').value, marque: $('#brand').value || 'inconnue', type: SUB_INFO[$('#sub').value]?.name || '', couleur: COLOR_BY_ID[$('#color').value]?.name || '', matiere: $('#material').value || 'inconnue', composition: $('#composition').value || 'inconnue', coupe: FITS.find(([id]) => id === $('#fit').value)?.[1] || 'inconnue', motif: $('#pattern').value, taille: $('#size').value || 'inconnue', prix: $('#price').value || null }, null, 2);
    openModal({ title: 'Remplir la fiche avec un JSON', body: html`<p class="small">Collez le JSON donné par ChatGPT (avec ou sans le bloc \`\`\`json). Clés en français ou en anglais : nom, marque, type, couleur, matiere, composition, coupe, motif, saisons, formalite, taille, prix…</p>
      <div class="field"><label for="jsontext">JSON</label><textarea id="jsontext" rows="10" class="mono" placeholder='{ "nom": "Blazer en laine anthracite", "type": "Blazer", "couleur": "Anthracite", "matiere": "Laine" }'></textarea></div>
      <p class="small callout callout-warn hidden" id="jsonerr"></p>
      <div class="btn-row"><button class="btn btn-sm" type="button" data-paste>Coller</button><button class="btn btn-primary btn-sm" type="button" data-apply>${icon('check')} Remplir la fiche</button><button class="btn btn-sm btn-ghost" type="button" data-copy>Copier la fiche actuelle en JSON</button><button class="btn btn-sm btn-ghost" type="button" data-prompt>Copier la consigne ChatGPT</button></div>`,
      onMount(body, close) {
        const ta = body.querySelector('#jsontext'); const err = body.querySelector('#jsonerr');
        const apply = () => {
          if (!parseStructured(ta.value)) { err.textContent = extractJSON(ta.value) ? 'JSON lu, mais aucun champ reconnu (nom, type, couleur, matière…).' : 'Ce texte n\'est pas un JSON valide : copiez tout le bloc donné par ChatGPT, accolades comprises.'; err.classList.remove('hidden'); return; }
          close(); state.pasteLabel = false; $('#webpaste').value = ta.value; run(); $('#webid').scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        body.querySelector('[data-apply]').onclick = apply;
        body.querySelector('[data-paste]').onclick = async () => { try { ta.value = await navigator.clipboard.readText(); apply(); } catch { toast('Collez avec un appui long dans le champ'); ta.focus(); } };
        ta.addEventListener('paste', () => setTimeout(() => { if (parseStructured(ta.value)) apply(); }, 0));
        body.querySelector('[data-copy]').onclick = async () => { try { await navigator.clipboard.writeText(current()); toast('Fiche copiée en JSON'); } catch { ta.value = current(); ta.select(); } };
        body.querySelector('[data-prompt]').onclick = () => $('#gptcopy').click();
        setTimeout(() => ta.focus(), 50);
      } });
  };
  // Coller un lien dans la zone ou dans « Lien d'origine » suffit : la lecture démarre seule.
  $('#webpaste').addEventListener('paste', () => setTimeout(() => { state.pasteLabel = false; if (/^\s*https?:\/\/\S+\s*$/.test($('#webpaste').value) || parseStructured($('#webpaste').value)) run(); }, 0));
  $('#sourceUrl').addEventListener('change', () => {
    const v = $('#sourceUrl').value.trim();
    if (/^https?:\/\/\S+$/.test(v) && v !== lastUrl) { state.pasteLabel = false; $('#webpaste').value = v; run(); $('#webid').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
}

function colorHint(hex) { const n = nearestColor(hex, GARMENT_COLORS); return n ? `Couleur la plus proche : ${n.name} (proximité ${n.confidence}). La proximité numérique n'est pas une certitude stylistique.` : ''; }

async function aiRecognize(main, state) {
  const out = main.querySelector('#aiout');
  if (!state.source) { toast('Ajoutez d\'abord une photo'); return; }
  setHTML(out, html`<p class="small"><span class="loader"></span> Analyse en cours…</p>`);
  try {
    const { canvasToBlob, blobToDataURL } = await import('../services/image.js');
    const c = renderToCanvas(state.source, { rotation: state.rotation, crop: state.crop, maxSide: 1024 });
    const dataUrl = await blobToDataURL(await canvasToBlob(c, 0.82));
    const r = await fetch('/api/recognize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: dataUrl }) });
    const body = await r.json();
    if (!r.ok) throw new Error(body.error || 'Erreur IA');
    const s = body.result || {};
    const rows = [];
    if (s.category && CATEGORY_BY_ID[s.category.value]) rows.push(['category', 'Catégorie', CATEGORY_BY_ID[s.category.value].name, s.category.confidence, s.category.value]);
    if (s.sub && SUB_INFO[s.sub.value]) rows.push(['sub', 'Type', SUB_INFO[s.sub.value].name, s.sub.confidence, s.sub.value]);
    if (s.color?.hex && /^#[0-9A-F]{6}$/i.test(s.color.hex)) rows.push(['color', 'Couleur', `${s.color.name || ''} ${s.color.hex}`, s.color.confidence, colorIdFromHex(s.color.hex)]);
    if (s.pattern && PATTERNS.includes(s.pattern.value)) rows.push(['pattern', 'Motif', s.pattern.value, s.pattern.confidence, s.pattern.value]);
    if (s.compositionLabel?.value) rows.push(['composition', 'Étiquette lue', s.compositionLabel.value, s.compositionLabel.confidence, s.compositionLabel.value]);
    setHTML(out, rows.length ? html`<div class="card-flat"><p class="small"><strong>Suggestions IA — à confirmer champ par champ</strong></p>${rows.map(([f, l, v, c, raw2]) => html`<label class="check"><input type="checkbox" data-ai="${f}" data-val="${raw2}"> ${l} : ${v} <span class="tag">confiance ${Math.round((c ?? 0) * 100)} %</span></label>`)}<button class="btn btn-sm" type="button" id="aiapply">Appliquer la sélection</button></div>` : html`<p class="small muted">Aucune suggestion exploitable.</p>`);
    out.querySelector('#aiapply')?.addEventListener('click', () => {
      out.querySelectorAll('[data-ai]:checked').forEach((cb) => {
        const f = cb.dataset.ai; const el = main.querySelector(`#${f}`);
        if (f === 'category') { el.value = cb.dataset.val; el.dispatchEvent(new Event('change')); }
        else if (el) { el.value = cb.dataset.val; el.dispatchEvent(new Event('change')); }
      });
      toast('Suggestions appliquées — vérifiez avant d\'enregistrer');
    });
  } catch (e) { setHTML(out, html`<p class="small callout callout-warn">IA indisponible (${e.message}). Les champs restent à saisir manuellement.</p>`); }
}

// ---------------------------------------------------------------- Import multiple
async function renderImport(main) {
  setHTML(main, html`<a href="#/wardrobe" class="small">← Dressing</a>
    <div class="page-head"><div class="eyebrow">Import multiple</div><h1>Importer plusieurs photos</h1>
    <p class="lede">Une photo par pièce. Chaque fiche est vérifiée avant l'enregistrement ; décochez celles à ignorer. Photos compressées et sans métadonnées EXIF.</p></div>
    <label class="btn btn-primary" for="multi">${icon('upload')} Choisir des photos</label><input id="multi" type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" class="sr-only">
    <div id="batch" class="stack" style="margin-top:16px"></div>`);
  const batch = main.querySelector('#batch');
  const items = [];
  main.querySelector('#multi').onchange = async (e) => {
    const files = [...e.target.files].slice(0, 40);
    setHTML(batch, html`<p><span class="loader"></span> Préparation de ${files.length} photo(s)…</p>`);
    items.length = 0;
    for (const f of files) {
      try {
        await checkImageFile(f);
        const bmp = await loadBitmap(f);
        const out = await processImage(bmp);
        items.push({ file: f, out, url: URL.createObjectURL(out.thumbBlob), name: f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 60), color: out.dominant[0]?.nearestId || 'navy' });
      } catch (err) { items.push({ file: f, error: err.message }); }
    }
    setHTML(batch, html`${items.map((it, i) => it.error ? html`<div class="callout callout-warn">${it.file.name} : ${it.error}</div>` : html`<div class="card" data-i="${i}"><div class="row" style="align-items:flex-start;flex-wrap:nowrap">
        <div class="mini-thumb" style="width:90px"><img src="${it.url}" alt="Photo importée ${i + 1}"></div>
        <div style="flex:1;min-width:0" class="form-grid">
          <label class="check span-2"><input type="checkbox" data-keep checked> Ajouter cette pièce</label>
          <div class="field"><label>Nom</label><input type="text" data-f="name" value="${it.name}"></div>
          <div class="field"><label>Catégorie</label><select data-f="category">${options(CATEGORIES.map((c) => [c.id, c.name]), 'haut')}</select></div>
          <div class="field"><label>Type</label><select data-f="sub">${options(CATEGORY_BY_ID.haut.subs.map(([id, n]) => [id, n]), '')}</select></div>
          <div class="field"><label>Couleur (estimée, à confirmer)</label><select data-f="color">${options(GARMENT_COLORS.map((c) => [c.id, c.name]), it.color)}</select></div>
        </div></div></div>`)}
      ${items.some((x) => !x.error) ? html`<button class="btn btn-primary" id="saveall">${icon('check')} Enregistrer les pièces cochées</button>` : ''}`);
    batch.querySelectorAll('[data-f="category"]').forEach((sel) => sel.onchange = () => { const s = sel.closest('.card').querySelector('[data-f="sub"]'); setHTML(s, options(CATEGORY_BY_ID[sel.value].subs.map(([id, n]) => [id, n]), '')); });
    batch.querySelector('#saveall')?.addEventListener('click', async () => {
      let n = 0;
      for (const card of batch.querySelectorAll('.card[data-i]')) {
        if (!card.querySelector('[data-keep]').checked) continue;
        const it = items[+card.dataset.i];
        const val = (f) => card.querySelector(`[data-f="${f}"]`).value;
        const id = uid('g'); const phId = uid('ph');
        const sub = SUB_INFO[val('sub')];
        await store.repo.put('photos', { id: phId, ownerId: id, profileId: pid(), blob: it.out.blob, thumb: it.out.thumbBlob, mime: 'image/jpeg', width: it.out.width, height: it.out.height, kind: 'single', private: true, rights: 'user_owned' }, { silent: true });
        const c = COLOR_BY_ID[val('color')];
        await store.repo.put('garments', { id, profileId: pid(), name: val('name') || 'Pièce importée', category: val('category'), sub: val('sub'), color: { id: c.id, name: c.name, hex: c.hex }, color2: null, pattern: 'Uni', seasons: [], styles: [], tags: ['import'], measures: {}, formality: sub?.formality || 3, warmth: Math.max(1, sub?.warmth || 2), comfort: 3, rainResistance: 0, windResistance: 0, condition: 'good', availability: 'clean', photoIds: [phId], photoKind: 'single' }, { silent: true });
        n++;
      }
      items.forEach((it) => it.url && URL.revokeObjectURL(it.url));
      toast(`${n} pièce${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''} — complétez les fiches si besoin`);
      navigate('#/wardrobe');
    });
  };
}

// ---------------------------------------------------------------- Statistiques
async function renderStats(main) {
  const [all, wl, outs] = await Promise.all([loadGarments(), loadWearlog(), loadOutfits()]);
  const s = wardrobeStats(all, wl);
  const maxCat = Math.max(1, ...Object.values(s.byCat));
  const unusedOutfits = outs.filter((o) => !wl.some((w) => w.outfitId === o.id));
  const withCpw = all.map((g) => ({ g, cpw: costPerWear(g) })).filter((x) => x.g.price);
  setHTML(main, html`<a href="#/wardrobe" class="small">← Dressing</a>
    <div class="page-head"><div class="eyebrow">Statistiques utiles</div><h1>Usage du dressing</h1></div>
    <div class="grid-3">
      <div class="card"><div class="stat">${s.total}</div><div class="stat-label">pièces</div></div>
      <div class="card"><div class="stat">${s.available}</div><div class="stat-label">disponibles maintenant</div></div>
      <div class="card"><div class="stat">${s.wearDays}</div><div class="stat-label">jours de port enregistrés</div></div>
    </div>
    <h2>Répartition par catégorie</h2>
    <div class="card">${Object.entries(s.byCat).map(([cat, n]) => html`<div class="bar-row"><span>${CATEGORY_BY_ID[cat]?.name || cat}</span><div class="bar-track" aria-hidden="true"><span style="width:${raw(Math.round((n / maxCat) * 100))}%"></span></div><span class="num">${n}</span></div>`)}${!s.total ? html`<p class="muted">Aucune donnée.</p>` : ''}</div>
    ${s.toWash ? html`<div class="callout callout-warn" style="margin-top:16px">${s.toWash} pièce(s) à laver. <button class="btn btn-sm" id="allclean">Tout marquer propre</button></div>` : ''}
    <div class="grid-2" style="margin-top:8px">
      <div><h2>Les plus portées</h2><div class="card">${s.top.filter((r) => r.wears).length ? html`<ul class="clean">${s.top.filter((r) => r.wears).map((r) => html`<li class="row-between" style="padding:6px 0;border-bottom:1px solid var(--line)"><a href="#/wardrobe/${r.g.id}">${r.g.name}</a><span class="tag">${r.wears} port(s)</span></li>`)}</ul>` : html`<p class="muted small">Utilisez « Je porte cette tenue » pour alimenter l'historique.</p>`}</div></div>
      <div><h2>Peu ou pas utilisées</h2><div class="card">${s.unused.length ? html`<ul class="clean">${s.unused.slice(0, 12).map((r) => html`<li class="row-between" style="padding:6px 0;border-bottom:1px solid var(--line)"><a href="#/wardrobe/${r.g.id}">${r.g.name}</a><span class="small muted">${r.days === null ? 'jamais portée' : `il y a ${r.days} j`}</span></li>`)}</ul><p class="small muted" style="margin-top:8px">Ouvrez une fiche puis « Avec quoi le porter ? » pour la remettre en rotation.</p>` : html`<p class="muted small">Tout est utilisé.</p>`}</div></div>
    </div>
    <h2>Coût par port</h2>
    <div class="table-wrap"><table><thead><tr><th>Pièce</th><th class="num">Prix</th><th class="num">Ports</th><th class="num">Coût/port</th></tr></thead><tbody>
      ${withCpw.length ? withCpw.map(({ g, cpw }) => html`<tr><td>${g.name}</td><td class="num">${fmtEUR(g.price)}</td><td class="num">${g.wearCount || 0}</td><td class="num">${cpw === null ? '—' : fmtEUR(cpw)}</td></tr>`) : html`<tr><td colspan="4" class="muted">Renseignez un prix sur vos fiches pour calculer le coût par port.</td></tr>`}
    </tbody></table></div>
    <h2>Tenues sauvegardées jamais portées</h2>
    <div class="card">${unusedOutfits.length ? html`<ul class="clean">${unusedOutfits.map((o) => html`<li style="padding:5px 0"><a href="#/outfits/${o.id}">${o.name}</a></li>`)}</ul>` : html`<p class="muted small">Aucune.</p>`}</div>`);
  main.querySelector('#allclean')?.addEventListener('click', async () => {
    for (const g of all.filter((x) => x.availability === 'to-wash')) await store.repo.put('garments', afterWash(g), { silent: true });
    toast('Pièces marquées propres'); navigate('#/wardrobe/stats');
  });
}

// ---------------------------------------------------------------- Revue du dressing
async function renderReview(main) {
  const [all, p] = await Promise.all([loadGarments(), loadPrefs()]);
  const vmap = versatility(all); const keyThreshold = keyThresholdOf(vmap);
  const rows = all.map((g) => ({ g, v: vmap[g.id], r: reviewGarment(g, { versatility: vmap[g.id], keyThreshold, dislikedFit: p.dislikedFit || {}, total: all.length }) }));
  const order = ['give', 'think', 'alter', 'keep', 'key'];
  const st = { f: '' };
  const counts = Object.fromEntries(order.map((k) => [k, rows.filter((x) => (x.r.decision || x.r.verdict) === k).length]));
  setHTML(main, html`<a href="#/wardrobe" class="small">← Dressing</a>
    <div class="page-head" style="margin-top:8px"><div class="eyebrow">Revue du dressing</div><h1>Garder, retoucher ou donner ?</h1>
    <p class="lede">Suggestions fondées sur la polyvalence réelle de chaque pièce dans votre dressing, son état, vos retours (« ne me va pas ») et son usage. Ce sont des pistes argumentées : vous décidez.</p></div>
    ${!all.length ? emptyState('Dressing vide', 'Ajoutez vos pièces pour lancer la revue.', html`<a class="btn btn-primary" href="#/wardrobe/quick">Ajout rapide</a>`) : html`
    <div class="chips" role="group" aria-label="Filtrer par verdict" style="margin-bottom:14px"><button class="chip" data-f="" aria-pressed="true">Toutes (${all.length})</button>${order.map((k) => html`<button class="chip" data-f="${k}" aria-pressed="false">${VERDICTS[k].label} (${counts[k]})</button>`)}</div>
    ${all.length < 6 ? html`<div class="callout small" style="margin-bottom:12px">Avec moins de 6 pièces, la polyvalence est mécaniquement faible : la revue devient plus fiable à mesure que le dressing se complète.</div>` : ''}
    <div class="stack" id="rlist"></div>`}`);
  if (!all.length) return;
  const draw = () => {
    const list = rows.filter((x) => !st.f || (x.r.decision || x.r.verdict) === st.f).sort((a, b) => order.indexOf(a.r.decision || a.r.verdict) - order.indexOf(b.r.decision || b.r.verdict) || (a.v ?? 99) - (b.v ?? 99));
    setHTML(main.querySelector('#rlist'), list.map(({ g, v, r }) => html`<article class="card"><div class="row" style="flex-wrap:nowrap;align-items:flex-start">
      <a class="mini-thumb" style="width:70px" href="#/wardrobe/${g.id}">${g.photoIds?.length ? html`<img data-photo="${g.photoIds[0]}" alt="${g.name}">` : html`<span class="small muted">—</span>`}</a>
      <div style="flex:1;min-width:0"><div class="row-between"><a href="#/wardrobe/${g.id}"><strong>${g.name}</strong></a><span class="tag ${VERDICTS[r.verdict].tone}">Suggestion : ${VERDICTS[r.verdict].label}</span></div>
        <ul class="ticks small" style="margin-top:6px">${r.reasons.map((x) => html`<li>${x}</li>`)}</ul>
        ${r.missing.length ? html`<p class="small muted">Infos manquantes pour affiner : ${r.missing.join(', ')}. <a href="#/wardrobe/${g.id}/edit">Compléter</a></p>` : ''}
        <div class="row small" style="gap:6px"><span class="muted">Ma décision :</span>${['keep', 'alter', 'give'].map((k) => html`<button class="chip" data-dec="${k}" data-id="${g.id}" aria-pressed="${r.decision === k}">${VERDICTS[k].label}</button>`)}
          ${r.decision === 'give' ? html`<a class="chip" href="https://www.vinted.fr/" target="_blank" rel="noopener noreferrer">Vendre sur Vinted ${icon('external')}</a>` : ''}</div>
      </div></div></article>`));
    hydratePhotos(main);
    main.querySelectorAll('[data-dec]').forEach((b) => b.onclick = async () => {
      const g = all.find((x) => x.id === b.dataset.id); const same = g.review?.verdict === b.dataset.dec;
      const updated = { ...g, review: same ? null : { verdict: b.dataset.dec, at: new Date().toISOString() } };
      await store.repo.put('garments', updated); Object.assign(g, updated);
      const row = rows.find((x) => x.g.id === g.id); row.r.decision = updated.review?.verdict || null;
      toast(same ? 'Décision retirée' : `Décision : ${VERDICTS[b.dataset.dec].label}`); draw();
    });
  };
  main.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { st.f = b.dataset.f; main.querySelectorAll('[data-f]').forEach((x) => x.setAttribute('aria-pressed', x === b)); draw(); });
  draw();
}

// ---------------------------------------------------------------- Ajout rapide (photo + type + couleur, le reste plus tard)
async function renderQuick(main) {
  let added = 0;
  let autoCut = await store.repo.kvGet('pref:cutout', false);
  const draw = () => {
    setHTML(main, html`<a href="#/wardrobe" class="small">← Dressing</a>
      <div class="page-head" style="margin-top:8px"><div class="eyebrow">Ajout rapide</div><h1>Une pièce en 10 secondes</h1>
      <p class="lede"><a href="#/wardrobe/new?web=1">Vous avez le lien de l'article ou une réponse ChatGPT ? Ajoutez plutôt depuis le lien →</a></p>
      <p class="lede">Photo, type, couleur : c'est tout. La pièce est marquée « à compléter » ; affinez la fiche plus tard. ${added ? html`<strong>${added} pièce${added > 1 ? 's' : ''} ajoutée${added > 1 ? 's' : ''} pendant cette session.</strong>` : ''}</p></div>
      <div class="card stack">
        <div class="btn-row"><label class="btn btn-primary" for="qcam">${icon('camera')} Prendre la photo</label><input id="qcam" type="file" accept="image/*" capture="environment" class="sr-only"><label class="btn" for="qfile">${icon('upload')} Choisir une photo</label><input id="qfile" type="file" accept="image/*" class="sr-only"><button class="btn btn-ghost" id="qnophoto">Sans photo</button></div>
        <label class="check"><input type="checkbox" id="qcut" ${autoCut ? raw('checked') : ''}> Présentation boutique automatique : fond ivoire, pièce redressée et centrée, ombre douce (sur l'appareil ; premier usage : ~${CUTOUT_DOWNLOAD_MB} Mo)</label>
        <p class="small muted" id="qcutmsg" aria-live="polite"></p>
        <div id="qform" class="hidden">
          <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><div class="mini-thumb" style="width:96px" id="qprev"></div>
          <div style="flex:1;min-width:0">
            <p class="small muted" style="margin:0 0 6px">Type <strong>*</strong> (veste, haut, bas…)</p>
            <div class="chips" id="qcats">${CATEGORIES.map((c) => html`<button type="button" class="chip" data-cat="${c.id}" aria-pressed="false">${c.name}</button>`)}</div>
            <div class="field" style="margin-top:10px"><label for="qsub">Précision</label><select id="qsub" disabled><option value="">Choisissez d'abord le type</option></select></div>
          </div></div>
          <p class="small muted" style="margin:8px 0 6px">Couleur <span id="qhint"></span></p>
          <div class="chips" id="qcols">${GARMENT_COLORS.filter((c) => !['suede-brown', 'dark-brown'].includes(c.id)).map((c) => html`<button type="button" class="color-btn" data-col="${c.id}" aria-pressed="false">${swatch(c.hex)} ${c.name}</button>`)}</div>
          <div class="btn-row" style="margin-top:14px"><button class="btn btn-primary" id="qsave" disabled>${icon('check')} Enregistrer et suivante</button><button class="btn" id="qdone" disabled>Enregistrer et terminer</button><button class="btn btn-gold" id="qweb" disabled>${icon('search')} Enregistrer et chercher sur internet</button></div>
          <p class="hint">« Chercher sur internet » ouvre la fiche complète : recherche par photo (Google Lens) ou collage du lien de l'article pour tout remplir.</p>
        </div>
      </div>`);
    const $ = (q) => main.querySelector(q);
    const st = { cat: null, sub: null, color: null, out: null };
    const ready = () => { $('#qsave').disabled = $('#qdone').disabled = $('#qweb').disabled = !(st.color && st.sub); };
    const show = () => $('#qform').classList.remove('hidden');
    const load = async (f) => {
      try {
        await checkImageFile(f); st.out = await processImage(await loadBitmap(f));
        if ($('#qcut').checked) {
          const m = $('#qcutmsg');
          try { const c = await cutout(st.out.blob, ({ step, pct }) => { m.textContent = `${step}${pct !== null ? ` — ${pct} %` : '…'}`; }); st.out = { ...st.out, original: st.out.blob, originalThumb: st.out.thumbBlob, originalW: st.out.width, originalH: st.out.height, blob: c.blob, thumbBlob: c.thumb, width: c.width, height: c.height, cut: true }; m.textContent = 'Détourage terminé.'; }
          catch (err) { m.textContent = `Détourage impossible (${err.message}) : la photo d'origine est conservée.`; }
        }
        setHTML($('#qprev'), html`<img src="${URL.createObjectURL(st.out.thumbBlob)}" alt="Aperçu">`);
        const d = st.out.dominant[0];
        if (d) { st.color = d.nearestId; $('#qhint').textContent = `(estimée : ${d.nearestName}, proximité ${d.confidence} — à corriger si besoin)`; main.querySelectorAll('[data-col]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.col === st.color)); }
        show(); ready();
      } catch (e) { toast(e.message); }
    };
    $('#qcam').onchange = (e) => e.target.files[0] && load(e.target.files[0]);
    $('#qfile').onchange = (e) => e.target.files[0] && load(e.target.files[0]);
    $('#qnophoto').onclick = () => { st.out = null; show(); };
    $('#qcut').onchange = async (e) => { autoCut = e.target.checked; await store.repo.kvSet('pref:cutout', autoCut); };
    main.querySelectorAll('[data-cat]').forEach((b) => b.onclick = () => { st.cat = b.dataset.cat; main.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', x === b)); setHTML($('#qsub'), options(CATEGORY_BY_ID[st.cat].subs.map(([id, n]) => [id, n]), '')); $('#qsub').disabled = false; st.sub = $('#qsub').value; ready(); });
    $('#qsub').onchange = (e) => { st.sub = e.target.value; ready(); };
    main.querySelectorAll('[data-col]').forEach((b) => b.onclick = () => { st.color = b.dataset.col; main.querySelectorAll('[data-col]').forEach((x) => x.setAttribute('aria-pressed', x === b)); ready(); });
    const save = async (again) => {
      const id = uid('g'); const info = SUB_INFO[st.sub]; const c = COLOR_BY_ID[st.color];
      const photoIds = [];
      if (st.out) {
        const phId = uid('ph');
        await store.repo.put('photos', { id: phId, ownerId: id, profileId: pid(), blob: st.out.blob, thumb: st.out.thumbBlob, mime: st.out.blob.type || 'image/jpeg', width: st.out.width, height: st.out.height, kind: 'single', private: true, rights: 'user_owned', cutout: !!st.out.cut }, { silent: true });
        photoIds.push(phId);
        if (st.out.cut && st.out.original) { // la vraie photo est gardée, juste après la présentation boutique
          const realId = uid('ph');
          await store.repo.put('photos', { id: realId, ownerId: id, profileId: pid(), blob: st.out.original, thumb: st.out.originalThumb || st.out.original, mime: st.out.original.type || 'image/jpeg', width: st.out.originalW, height: st.out.originalH, kind: 'real', private: true, rights: 'user_owned' }, { silent: true });
          photoIds.push(realId);
        }
      }
      await store.repo.put('garments', { id, profileId: pid(), name: `${info?.name || 'Pièce'} ${c.name.toLowerCase()}`, category: st.cat, sub: st.sub, color: { id: c.id, name: c.name, hex: c.hex }, color2: null, pattern: 'Uni', seasons: [], styles: [], tags: ['à compléter'], measures: {}, formality: info?.formality || 3, warmth: Math.max(1, info?.warmth || 2), comfort: 3, rainResistance: 0, windResistance: 0, availability: 'clean', photoIds, photoKind: 'single' });
      added++; toast(`${info?.name || 'Pièce'} ${c.name.toLowerCase()} ajoutée`);
      if (again === 'web') { focusWeb = true; navigate(`#/wardrobe/${id}/edit`); } else if (again) draw(); else navigate('#/wardrobe');
    };
    $('#qweb').onclick = () => save('web');
    $('#qsave').onclick = () => save(true);
    $('#qdone').onclick = () => save(false);
  };
  draw();
}

// ---------------------------------------------------------------- Lessive & entretien
async function renderCare(main) {
  const all = await loadGarments();
  const autoBasket = await store.repo.kvGet('pref:autobasket', true);
  const rows = all.map((g) => ({ g, c: careStatus(g) }));
  const basket = rows.filter((r) => r.g.availability === 'to-wash');
  const soon = rows.filter((r) => r.g.availability !== 'to-wash' && r.c.washable && r.c.wearsSinceWash > 0 && r.c.washAfter - r.c.wearsSinceWash <= 1);
  const tasks = rows.flatMap((r) => r.c.dueTasks.map((t) => ({ g: r.g, t })));
  const thumb = (g) => html`<a class="mini-thumb" href="#/wardrobe/${g.id}">${g.photoIds?.length ? html`<img data-photo="${g.photoIds[0]}" alt="${g.name}">` : html`<span class="small muted">—</span>`}</a>`;
  setHTML(main, html`<a href="#/wardrobe" class="small">← Dressing</a>
    <div class="page-head" style="margin-top:8px"><div class="eyebrow">Lessive & entretien</div><h1>Des vêtements toujours prêts</h1>
    <p class="lede">Bella figura : des vêtements propres, entretenus, adaptés. Les pièces à laver ne sont jamais proposées comme portables. Repères généraux : l'étiquette de chaque vêtement prime.</p></div>
    <label class="check" style="margin-bottom:14px"><input type="checkbox" id="autob" ${autoBasket ? raw('checked') : ''}> Mettre automatiquement au panier une pièce après son nombre de ports habituel (tee-shirt et chemise 1, polo 2, chino 4, pull 5, jean 8…)</label>
    <div class="stat-grid">
      <div class="card"><div class="stat">${basket.length}</div><div class="stat-label">au panier à linge</div></div>
      <div class="card"><div class="stat">${soon.length}</div><div class="stat-label">à laver après le prochain port</div></div>
      <div class="card"><div class="stat">${tasks.length}</div><div class="stat-label">soins à faire (cirage, défeutrage…)</div></div>
    </div>
    <h2>Panier à linge</h2>
    ${basket.length ? html`<div class="btn-row" style="margin-bottom:10px"><button class="btn btn-primary" id="allwashed">${icon('check')} Tout est lavé</button></div>
      <div class="stack">${basket.map(({ g, c }) => html`<div class="card row" style="flex-wrap:nowrap">${thumb(g)}<div style="flex:1;min-width:0"><strong>${g.name}</strong><p class="small muted" style="margin:2px 0">${c.tips}</p></div><button class="btn btn-sm" data-wash="${g.id}">Lavé</button></div>`)}</div>`
      : html`<p class="muted">Panier vide : tout est prêt à porter.</p>`}
    ${soon.length ? html`<h2>Bientôt à laver</h2><div class="chips">${soon.map(({ g, c }) => html`<span class="tag">${g.name} · ${c.wearsSinceWash}/${c.washAfter} ports</span>`)}</div>` : ''}
    <h2>Soins à faire</h2>
    ${tasks.length ? html`<div class="stack">${tasks.map(({ g, t }) => html`<div class="card row" style="flex-wrap:nowrap">${thumb(g)}<div style="flex:1;min-width:0"><strong>${t.label}</strong> — ${g.name}<p class="small muted" style="margin:2px 0">${t.how} (${t.wearsSince} ports depuis le dernier soin)</p></div><button class="btn btn-sm" data-care="${g.id}" data-task="${t.id}">Fait</button></div>`)}</div>`
      : html`<p class="muted">Aucun soin en retard. Les rappels apparaissent selon l'usage réel de chaque pièce.</p>`}
    <details class="disclosure" style="margin-top:18px"><summary>Conseils d'entretien par pièce</summary>
      <div class="table-wrap"><table><thead><tr><th>Pièce</th><th>Lavage</th><th>Soins réguliers</th></tr></thead><tbody>
      ${rows.map(({ g, c }) => html`<tr><td>${g.name}</td><td class="small">${c.washable ? `Tous les ${c.washAfter} port${c.washAfter > 1 ? 's' : ''} · ` : 'Pas de machine · '}${c.tips}</td><td class="small">${c.tasks.map((t) => `${t.label} (tous les ${t.every} ports)`).join(' ; ') || '—'}</td></tr>`)}
      </tbody></table></div></details>`);
  hydratePhotos(main);
  main.querySelector('#autob').onchange = async (e) => { await store.repo.kvSet('pref:autobasket', e.target.checked); toast(e.target.checked ? 'Panier automatique activé' : 'Panier automatique désactivé'); };
  main.querySelector('#allwashed')?.addEventListener('click', async () => { for (const { g } of basket) await store.repo.put('garments', afterWash(g), { silent: true }); store.repo.emit('garments', 'bulk', null); toast(`${basket.length} pièce(s) remise(s) au propre`); renderCare(main); });
  main.querySelectorAll('[data-wash]').forEach((b) => b.onclick = async () => { const g = all.find((x) => x.id === b.dataset.wash); await store.repo.put('garments', afterWash(g)); toast(`${g.name} : propre`); renderCare(main); });
  main.querySelectorAll('[data-care]').forEach((b) => b.onclick = async () => { const g = all.find((x) => x.id === b.dataset.care); await store.repo.put('garments', afterCare(g, b.dataset.task)); toast('Soin noté'); renderCare(main); });
}

// ---------------------------------------------------------------- Rangement saisonnier
async function renderSeason(main, forced) {
  const all = await loadGarments();
  const now = new Date();
  const current = periodAt(now); const nxt = nextChange(now);
  const target = forced || current;
  const plan = seasonalPlan(all, target);
  const opposite = target === 'warm' ? 'cold' : 'warm';
  const row = (g, attr, extra = '') => html`<label class="card row" style="flex-wrap:nowrap;cursor:pointer"><input type="checkbox" ${raw(attr)}="${g.id}" checked>
    <span class="mini-thumb">${g.photoIds?.length ? html`<img data-photo="${g.photoIds[0]}" alt="">` : html`<span class="small muted">—</span>`}</span>
    <span style="flex:1;min-width:0"><strong>${g.name}</strong>${extra}<br><span class="small muted">${storageTip(g)}</span></span></label>`;
  setHTML(main, html`<a href="#/wardrobe" class="small">← Dressing</a>
    <div class="page-head" style="margin-top:8px"><div class="eyebrow">Rangement saisonnier</div><h1>Garde-robe ${PERIODS[target].name.toLowerCase()}</h1>
    <p class="lede">Période actuelle : <strong>${PERIODS[current].name}</strong>. Prochain changement : ${PERIODS[nxt.period].name.toLowerCase()} à partir du ${nxt.at.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} (dans ${nxt.days} jour${nxt.days > 1 ? 's' : ''}). Une pièce rangée n'est plus proposée dans vos tenues ; elle reste dans le dressing.</p></div>
    <div class="chips" role="group" aria-label="Préparer la garde-robe" style="margin-bottom:14px">${['warm', 'cold'].map((id) => html`<button class="chip" data-target="${id}" aria-pressed="${target === id}">Préparer ${PERIODS[id].name.toLowerCase()}</button>`)}</div>
    <div class="callout small" style="margin-bottom:14px">Climat bordelais : gardez accessibles une couche intermédiaire et un trench toute l'année (pluie et fraîcheur possibles en toute saison). Une pièce « toutes saisons » n'est jamais proposée au rangement ; précisez les saisons sur sa fiche pour affiner.</div>
    <h2>À ranger (${plan.toStore.length})</h2>
    ${plan.toStore.length ? html`<div class="stack" id="tostore">${plan.toStore.map(({ g, washFirst }) => row(g, 'data-store', washFirst ? html` <span class="tag tag-warn">à laver d'abord</span>` : ''))}</div>
      <div class="btn-row" style="margin-top:10px"><button class="btn btn-primary" id="dostore">Ranger la sélection</button></div>`
      : html`<p class="muted">Rien à ranger : aucune pièce réservée à ${PERIODS[opposite].name.toLowerCase()} n'est sortie.</p>`}
    <h2>À ressortir (${plan.toBringOut.length})</h2>
    ${plan.toBringOut.length ? html`<div class="stack">${plan.toBringOut.map((g) => row(g, 'data-out'))}</div>
      <div class="btn-row" style="margin-top:10px"><button class="btn btn-primary" id="doout">Ressortir la sélection</button></div>`
      : html`<p class="muted">Rien à ressortir pour cette période.</p>`}
    ${plan.stored.length ? html`<details class="disclosure" style="margin-top:18px"><summary>Actuellement rangé (${plan.stored.length})</summary><div class="chips" style="margin-top:8px">${plan.stored.map((g) => html`<a class="chip" href="#/wardrobe/${g.id}">${g.name}</a>`)}</div></details>` : ''}`);
  hydratePhotos(main);
  main.querySelectorAll('[data-target]').forEach((b) => b.onclick = () => renderSeason(main, b.dataset.target));
  main.querySelector('#dostore')?.addEventListener('click', async () => {
    const ids = [...main.querySelectorAll('[data-store]:checked')].map((c) => c.dataset.store);
    for (const id of ids) { const g = all.find((x) => x.id === id); await store.repo.put('garments', { ...g, availability: 'stored', storedAt: new Date().toISOString(), wearsSinceWash: 0 }, { silent: true }); }
    store.repo.emit('garments', 'bulk', null);
    await store.repo.kvSet(`season:done:${target}:${new Date().getFullYear()}`, true);
    toast(`${ids.length} pièce${ids.length > 1 ? 's' : ''} rangée${ids.length > 1 ? 's' : ''}`); renderSeason(main, target);
  });
  main.querySelector('#doout')?.addEventListener('click', async () => {
    const ids = [...main.querySelectorAll('[data-out]:checked')].map((c) => c.dataset.out);
    for (const id of ids) { const g = all.find((x) => x.id === id); await store.repo.put('garments', { ...g, availability: 'clean', storedAt: null }, { silent: true }); }
    store.repo.emit('garments', 'bulk', null);
    await store.repo.kvSet(`season:done:${target}:${new Date().getFullYear()}`, true);
    toast(`${ids.length} pièce${ids.length > 1 ? 's' : ''} ressortie${ids.length > 1 ? 's' : ''} : pensez à les aérer`); renderSeason(main, target);
  });
}
