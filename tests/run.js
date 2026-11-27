// Mini-exécuteur de tests (navigateur, sans dépendance). Ouvrir /tests/ sur le serveur local.
import { suggestPalette, isValidHex, paletteNote, classifyHarmony, nearestColor, BOTTOM_IDS } from '../src/domain/colors.js';
import { MAIN_COLORS, ALL_COLORS, PALETTES_20, ORIGINAL_MATRIX, GARMENT_COLORS, COLOR_TRAITS, COLOR_BY_ID } from '../src/data/colors.js';
import { scoreOutfit, finalizeCriteria } from '../src/domain/scoring.js';
import { recommend, outfitsUnlocked } from '../src/domain/recommend.js';
import { manualWeather, parseOpenMeteo, isStale } from '../src/domain/weather.js';
import { validateAnalysis, validateExport } from '../src/domain/validate.js';
import { capsuleProgress, templateStatus, exportMissingText, costPerWear, buildICS, buildQuery, shoppingUtility, siteSearchUrl } from '../src/domain/wardrobe-logic.js';
import { STYLES, SCHOOLS, TRADITIONS, CLOSE_STYLES } from '../src/data/styles.js';
import { OCCASIONS } from '../src/data/occasions.js';
import { ERRORS, SEASONS, GRID } from '../src/data/guide.js';
import { CHAPTERS } from '../src/data/chapters.js';
import { CAPSULE, TEMPLATES } from '../src/data/capsule.js';
import { RETAILERS } from '../src/data/retailers.js';
import { ALL_PHOTOS, PHOTO_BY_ID, STYLE_PHOTO_BRIEFS } from '../src/data/photos.js';
import { Repository } from '../src/repositories/db.js';
import { escapeHTML, html, safeUrl } from '../src/lib/html.js';
import { resetForBase } from '../src/features/colors.js';
import { mannequinSVG } from '../src/components/mannequin.js';
import { evaluateManual } from '../src/features/analysis.js';
import { SyncService, shouldSync, remoteWins } from '../src/services/sync.js';
import { versatility, reviewGarment, keyThresholdOf } from '../src/domain/review.js';
import { defaultOccasion, preferredMode } from '../src/features/daily.js';
import { chooseAccessories } from '../src/domain/recommend.js';
import { shortQuery } from '../src/features/shopping.js';
import { inspirationQuery, colorsQuery, searchPhotos } from '../src/services/pexels.js';
import { alphaBounds, deskewAngle, keepMainRegions } from '../src/services/cutout.js';
import { encodeImage, supportsWebP } from '../src/services/image.js';
import { careStatus, afterWear, afterWash, afterCare } from '../src/domain/care.js';
import { periodAt, nextChange, seasonClass, seasonalPlan } from '../src/domain/seasonal.js';
import { OCCASION_BY_ID } from '../src/data/occasions.js';
import { parseProduct, urlWords, parseComposition, readerToText, assistantPrompt, parseStructured, extractJSON, pageImages, colorVariants, currentColorCode, imagesForColor } from '../src/domain/product-parse.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const eq = (a, b, msg = '') => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)}`); };
const ok = (c, msg) => { if (!c) throw new Error(msg || 'assertion fausse'); };
const throws = (fn, msg) => { try { fn(); } catch { return; } throw new Error(msg || 'exception attendue'); };

// ---- Fabrique de vêtements de test
let n = 0;
const G = (sub, category, color, extra = {}) => ({ id: `t${++n}`, profileId: 'p', name: `${sub} ${color}`, sub, category, color: { id: color, hex: ALL_COLORS.find((c) => c.id === color).hex, name: color }, availability: 'clean', seasons: [], ...extra });
function businessWardrobe() {
  return [
    G('chemise', 'haut', 'white', { fit: 'regular', material: 'Coton Oxford', condition: 'very-good' }), G('chemise', 'haut', 'sky', { fit: 'regular', material: 'Coton' }), G('polo', 'haut', 'navy', { material: 'Maille coton' }),
    G('tee-shirt', 'haut', 'white'), G('chino', 'bas', 'beige', { fit: 'tapered' }), G('pantalon', 'bas', 'mid-gray', { fit: 'tapered', material: 'Laine' }), G('jean', 'bas', 'navy'),
    G('blazer', 'veste', 'navy', { material: 'Laine' }), G('mocassins', 'chaussures', 'chocolate', { material: 'Daim', rainResistance: 0 }), G('derbies', 'chaussures', 'chocolate', { material: 'Cuir', rainResistance: 2 }),
    G('baskets', 'chaussures', 'white', { rainResistance: 1 }), G('ceinture-cuir', 'ceinture', 'chocolate'), G('trench', 'manteau', 'beige', { rainResistance: 3, warmth: 3 }),
  ];
}

// ---------------- Couleurs
test('Pantalon beige → 5 hauts marine, blanc, olive, bleu ciel, chocolat ; veste marine ; chaussures marron foncé', () => {
  const s = suggestPalette('beige', 'bottom');
  eq(s.tops.map((t) => t.name), ['Marine', 'Blanc', 'Olive', 'Bleu ciel', 'Chocolat']);
  eq([s.jacket.name, s.jacket.hex], ['Marine', '#22344E']);
  eq([s.shoe.name, s.shoe.hex], ['Marron foncé', '#563B2E']);
});
test('Changement vers marine → haut écru par défaut et SVG actualisé', () => {
  const st = { mode: 'bottom' }; resetForBase(st, 'beige'); eq(st.top, 'navy');
  resetForBase(st, 'navy'); eq(st.top, 'ecru'); eq(st.shoe, 'cognac'); eq(st.jacket, 'taupe');
  const svg = String(mannequinSVG({ top: '#EFE8D7', pants: '#22344E', shoe: '#995B36' }));
  ok(svg.includes('fill="#EFE8D7"') && svg.includes('fill="#22344E"'), 'SVG non recoloré');
});
test('Tous les codes HEX sont valides (palette, auxiliaires, matrice, 20 palettes)', () => {
  ALL_COLORS.forEach((c) => ok(isValidHex(c.hex), c.id));
  ORIGINAL_MATRIX.forEach((m) => { ok(isValidHex(m.hex)); m.tops.forEach(([, h]) => ok(isValidHex(h))); });
  PALETTES_20.forEach((p) => p.hex.forEach((h) => ok(isValidHex(h), `palette ${p.n}`)));
});
test('Au moins cinq hauts conseillés pour chaque bas, y compris les couleurs hors matrice', () => {
  BOTTOM_IDS.forEach((id) => ok(suggestPalette(id, 'bottom').tops.length >= 5, id));
  MAIN_COLORS.forEach((c) => ok(BOTTOM_IDS.includes(c.id), `couleur ${c.id} sélectionnable`));
});
test('Mode « partir de mon haut » : écru → bas compatibles', () => {
  const s = suggestPalette('ecru', 'top'); ok(s.bottoms.length >= 3); ok(s.bottoms.some((b) => b.id === 'navy'));
});
test('20 palettes, ordre et notes conservés', () => { eq(PALETTES_20.length, 20); eq(PALETTES_20.map((p) => p.n), Array.from({ length: 20 }, (_, i) => i + 1)); eq(PALETTES_20[0].note, 9.8); });
test('Harmonies : camaïeu, complémentaire atténuée, contraste', () => {
  eq(classifyHarmony(['beige', 'ecru', 'taupe']).id, 'camaieu');
  eq(classifyHarmony(['navy', 'cognac']).id, 'complementary');
  eq(classifyHarmony(['black', 'white']).id, 'contrast');
});
test('Couleur personnalisée : proximité indiquée avec confiance', () => { const n2 = nearestColor('#23354F'); eq(n2.id, 'navy'); eq(n2.confidence, 'élevée'); });
test('Note de palette indicative bornée et palette 1 reconnue', () => { const r = paletteNote({ bottom: 'ecru', top: 'navy', shoe: 'chocolate' }); ok(r.note <= 9.9 && r.note >= 5); ok(r.matched.includes(1)); });

// ---------------- Score
test('Score : aucun critère n\'excède son maximum ; non évaluable = null', () => {
  const s = finalizeCriteria({ fit: 40, colors: 20, refinement: null, style: 10, occasion: 10, shoes: 10, presentation: null });
  eq(s.criteria.find((c) => c.id === 'fit').score, 25);
  eq(s.criteria.find((c) => c.id === 'refinement').score, null);
  eq(s.assessedWeight, 75);
});
test('Couverture < 70 : pas de note précise, plage affichée', () => {
  const s = finalizeCriteria({ colors: 18, style: 8, occasion: 9 });
  eq(s.score100, null); ok(Array.isArray(s.scoreRange)); eq(s.assessedWeight, 40);
});
test('Coupe non saisie : non évaluée (pas de note arbitraire)', () => {
  const w = businessWardrobe().map((g) => ({ ...g, fit: undefined }));
  const s = scoreOutfit({ top: w[0], bottom: w[4], shoes: w[9] }, {});
  eq(s.criteria.find((c) => c.id === 'fit').score, null);
});

// ---------------- Recommandations
test('Dressing vide : aucune pièce inventée', () => { const r = recommend({ garments: [], occasionId: 'client' }); eq(r.options.length, 0); ok(r.info.missing.length > 0); });
test('Rendez-vous client sans pluie : proposition business casual réaliste', () => {
  const w = businessWardrobe();
  const r = recommend({ garments: w, occasionId: 'client', weather: manualWeather({ temp: 17 }), season: 'spring', now: Date.parse('2026-11-24') });
  ok(r.options.length >= 1, 'aucune option');
  const best = r.options[0];
  ok(['chemise', 'polo'].includes(best.pieces.top.sub), `haut ${best.pieces.top.sub}`);
  ok(['chino', 'pantalon'].includes(best.pieces.bottom.sub), `bas ${best.pieces.bottom.sub}`);
  ok(['derbies', 'mocassins'].includes(best.pieces.shoes.sub), `chaussures ${best.pieces.shoes.sub}`);
  ok(r.options.every((o) => o.pieces.top.sub !== 'tee-shirt'), 'tee-shirt proposé pour un client');
});
test('Pièce indisponible exclue', () => {
  const w = businessWardrobe(); w.forEach((g) => { if (g.sub === 'chemise') g.availability = 'to-wash'; });
  const r = recommend({ garments: w, occasionId: 'client', weather: manualWeather({ temp: 17 }) });
  ok(r.options.every((o) => o.pieces.top.sub !== 'chemise'), 'chemise à laver proposée');
});
test('Pluie : chaussures en daim exclues et couche déperlante ajoutée', () => {
  const w = businessWardrobe();
  const r = recommend({ garments: w, occasionId: 'client', weather: manualWeather({ temp: 13, rain: true }) });
  ok(r.options.length, 'aucune option');
  r.options.forEach((o) => { ok(o.pieces.shoes.sub !== 'mocassins', 'mocassins daim sous la pluie'); ok(o.pieces.outer?.sub === 'trench', 'pas de trench'); });
});
test('Trois modes distincts ou explication du nombre de combinaisons', () => {
  const r = recommend({ garments: businessWardrobe(), occasionId: 'daily', weather: manualWeather({ temp: 18 }) });
  const keys = new Set(r.options.map((o) => `${o.pieces.top.id}|${o.pieces.bottom.id}|${o.pieces.shoes.id}|${o.pieces.layer?.id}`));
  ok(keys.size === r.options.length || r.info.note, 'doublons sans explication');
  const small = recommend({ garments: businessWardrobe().slice(0, 1).concat(businessWardrobe().slice(4, 5), businessWardrobe().slice(9, 10)), occasionId: 'daily' });
  ok(small.info.note, 'pas d\'explication pour un petit dressing');
});
test('Déterministe pour les mêmes entrées', () => {
  const w = businessWardrobe(); const a = recommend({ garments: w, occasionId: 'office', now: 1 }); const b = recommend({ garments: w, occasionId: 'office', now: 1 });
  eq(a.options.map((o) => o.pieces.top.id + o.pieces.bottom.id), b.options.map((o) => o.pieces.top.id + o.pieces.bottom.id));
});
test('Mariage (dress code) : pas de casual incompatible', () => {
  const w = businessWardrobe(); const r = recommend({ garments: w, occasionId: 'wedding' });
  r.options.forEach((o) => ok(!['tee-shirt', 'jean', 'baskets'].includes(o.pieces.top.sub) && o.pieces.shoes.sub !== 'baskets', 'casual au mariage'));
  ok(r.info.missing.length || r.options.every((o) => o.pieces.layer), 'veste habillée non signalée');
});
test('Pièce imposée respectée', () => { const w = businessWardrobe(); const r = recommend({ garments: w, occasionId: 'daily', imposed: { bottom: w[6].id } }); r.options.forEach((o) => eq(o.pieces.bottom.id, w[6].id)); });
test('Utilité d\'achat : nombre de tenues supplémentaires calculé', () => { const nb = outfitsUnlocked({ name: 'Polo écru', category: 'haut', sub: 'polo', color: { id: 'ecru', hex: '#EFE8D7' } }, businessWardrobe()); ok(nb >= 1); });

// ---------------- Météo
test('Météo Open-Meteo parsée ; ancienne non affichée comme actuelle', () => {
  const w = parseOpenMeteo({ daily: { time: ['2026-11-24'], temperature_2m_min: [6], temperature_2m_max: [12], apparent_temperature_min: [3], apparent_temperature_max: [10], precipitation_sum: [4.2], precipitation_probability_max: [80], wind_speed_10m_max: [30] } }, { place: 'Bordeaux', fetchedAt: '2026-11-24T06:00:00Z' });
  ok(w.rain); ok(w.cold); ok(isStale(w, Date.parse('2026-11-24T20:00:00Z')));
});

// ---------------- IA
test('IA : JSON invalide intercepté', () => throws(() => validateAnalysis('{oops')));
test('IA : score hors limites intercepté', () => throws(() => validateAnalysis({ criteria: [{ id: 'fit', max: 25, score: 30 }] })));
test('IA : vêtement inexistant intercepté', () => throws(() => validateAnalysis({ criteria: [], ownedItemIds: ['inconnu'] }, { ownedIds: ['a'] })));
test('IA : score précis refusé sous le seuil de couverture', () => throws(() => validateAnalysis({ criteria: [{ id: 'colors', max: 20, score: 15 }], score100: 75 })));
test('IA : réponse valide normalisée avec critères non évalués à null', () => {
  const r = validateAnalysis({ criteria: [{ id: 'fit', max: 25, score: null, reason: 'Longueur non visible', confidence: 'low' }, { id: 'colors', max: 20, score: 18 }], score100: null, ownedItemIds: ['a'] }, { ownedIds: ['a'] });
  eq(r.criteria.length, 7); eq(r.score100, null); eq(r.assessedWeight, 20);
});
test('Aucune clé API dans le code client', async () => {
  for (const f of ['../src/services/ai.js', '../src/app.js', '../src/state.js', '../src/features/analysis.js']) {
    const t = await (await fetch(f)).text(); ok(!/sk-ant-|x-api-key|ANTHROPIC_API_KEY/.test(t), f);
  }
});
test('Questionnaire manuel : critères inconnus non pénalisés', () => {
  const r = evaluateManual({ top: 'navy', bottom: 'ecru', shoe: 'chocolate', shoulders: 'yes', ease: 'yes' }, null);
  eq(r.score.criteria.find((c) => c.id === 'refinement').score, null); ok(r.uncertainties.length > 0);
});

// ---------------- Données éditoriales
test('15 styles, 5 écoles notées, 8 traditions, 20 occasions × 3, 20 erreurs, 4 saisons, 20 chapitres', () => {
  eq(STYLES.length, 15); eq(SCHOOLS.length, 5); eq(TRADITIONS.length, 8); eq(OCCASIONS.length, 20);
  OCCASIONS.forEach((o) => eq(o.outfits.length, 3, o.id)); eq(ERRORS.length, 20); eq(SEASONS.length, 4); eq(CHAPTERS.length, 20); eq(GRID.reduce((a, c) => a + c.max, 0), 100);
});
test('Notes historiques des écoles = somme des critères', () => SCHOOLS.forEach((s) => eq(Object.values(s.scores).reduce((a, b) => a + b, 0), s.total, s.name)));
test('Styles proches référencent des styles existants', () => CLOSE_STYLES.forEach((c) => ok(STYLES.find((s) => s.id === c.a) && STYLES.find((s) => s.id === c.b))));
test('Photos : droits inconnus jamais transformés en autorisation ; licence et crédit pour les photos affichées', () => ALL_PHOTOS.forEach((p) => {
  ok(p.sourcePageUrl.startsWith('https://'), p.id); eq(p.verification, 'visually_checked', p.id);
  if (p.rights === 'unknown') eq(p.displayMode, 'link_only', p.id);
  if (p.displayMode === 'image') { eq(p.rights, 'licensed', p.id); ok(p.license && p.licenseUrl && p.photographer && p.imageUrl.startsWith('https://images.pexels.com/'), p.id); }
}));
test('Les 15 styles ont au moins une référence photo existante', () => STYLES.forEach((s) => { const b = STYLE_PHOTO_BRIEFS[s.id]; ok(b?.photos?.length, s.id); b.photos.forEach((id) => ok(PHOTO_BY_ID[id], id)); }));
test('34 boutiques avec URL https ; recherches directes vérifiées bien formées', () => {
  eq(RETAILERS.length, 34); RETAILERS.forEach((r) => ok(r.url.startsWith('https://')));
  const zara = RETAILERS.find((r) => r.name === 'Zara'); eq(zara.search('chino beige', 'homme'), 'https://www.zara.com/fr/fr/search?searchTerm=chino%20beige&section=MAN');
  ok(!RETAILERS.find((r) => r.name === 'Pull&Bear').search, 'Pull&Bear non vérifié ne doit pas avoir de recherche directe');
  eq(RETAILERS.find((r) => r.name === 'H&M').search('polo marine'), 'https://www2.hm.com/fr_fr/search-results.html?q=polo%20marine');
});

// ---------------- Capsule
test('30 pièces capsule et 30 modèles ; références valides', () => { eq(CAPSULE.length, 30); eq(TEMPLATES.length, 30); TEMPLATES.forEach((t) => t.ids.forEach((i) => ok(CAPSULE.find((c) => c.id === i)))); });
test('Progression par niveau et export des manquants', () => {
  const st = { 1: { owned: true }, 2: { owned: true } };
  eq(capsuleProgress(1, st).owned, 2); eq(capsuleProgress(2, st).total, 20);
  const txt = exportMissingText(1, st); ok(!txt.includes('1. Blazer marine')); ok(txt.includes('3. Chemise ciel'));
});
test('Modèle portable seulement si toutes les pièces existent et sont disponibles', () => {
  const tpl = TEMPLATES[3]; // Naples 4, 6, 9
  const gs = [{ id: 'a', availability: 'clean' }, { id: 'b', availability: 'clean' }, { id: 'c', availability: 'to-wash' }];
  const st = { 4: { owned: true, garmentId: 'a' }, 6: { owned: true, garmentId: 'b' }, 9: { owned: true, garmentId: 'c' } };
  eq(templateStatus(tpl, st, gs).portable, false); gs[2].availability = 'clean'; eq(templateStatus(tpl, st, gs).portable, true);
  eq(templateStatus(tpl, {}, gs).label, 'Inspiration');
});

// ---------------- Shopping, stats, calendrier
test('Requête produit construite depuis la pièce manquante', () => eq(buildQuery({ category: 'pantalon', color: 'ecru', fit: 'taille mi-haute coupe droite légèrement fuselée', material: 'coton', budgetMin: 60, budgetMax: 100 }), 'pantalon homme écru taille mi-haute coupe droite légèrement fuselée coton 60–100 €'));
test('Recherche web restreinte au domaine', () => ok(siteSearchUrl('https://www.uniqlo.com/', 'chino beige').includes('site%3Auniqlo.com')));
test('Score d\'utilité : critères inconnus signalés', () => { const u = shoppingUtility({ unlocked: 4 }); ok(u.unknown.includes('budget')); eq(u.assessedWeight, 35); });
test('Coût par port sans division par zéro', () => { eq(costPerWear({ price: 100, wearCount: 0 }), null); eq(costPerWear({ price: 100, wearCount: 4 }), 25); eq(costPerWear({ wearCount: 4 }), null); });
test('Export ICS valide', () => { const ics = buildICS([{ id: 'x', date: '2026-11-30', title: 'Client' }]); ok(ics.includes('DTSTART;VALUE=DATE:20261130') && ics.includes('DTEND;VALUE=DATE:20261201')); });

// ---------------- Sécurité
test('Échappement HTML (XSS) et URLs externes http(s) seulement', () => {
  eq(escapeHTML('<img src=x onerror=1>'), '&lt;img src=x onerror=1&gt;');
  ok(!String(html`<p>${'<script>'}</p>`).includes('<script>'));
  eq(safeUrl('javascript:alert(1)'), '#');
});

// ---------------- Persistance (IndexedDB réelle, base de test isolée)
test('Persistance : ajout, relecture après réouverture, modification, suppression', async () => {
  const name = 'style-studio-test-' + Date.now();
  let repo = await Repository.create(name);
  ok(!repo.isMemory, 'IndexedDB indisponible');
  await repo.put('garments', { id: 'g1', profileId: 'p', name: 'Pantalon écru', category: 'bas' });
  await repo.put('photos', { id: 'ph1', ownerId: 'g1', blob: new Blob(['x'], { type: 'image/jpeg' }) });
  repo.close();
  repo = await Repository.create(name); // « rechargement »
  eq((await repo.get('garments', 'g1')).name, 'Pantalon écru');
  ok((await repo.get('photos', 'ph1')).blob instanceof Blob, 'photo perdue');
  const g = await repo.get('garments', 'g1'); await repo.put('garments', { ...g, name: 'Pantalon écru modifié' });
  eq((await repo.get('garments', 'g1')).rev, 2);
  await repo.remove('garments', 'g1'); await repo.remove('photos', 'ph1');
  eq(await repo.get('garments', 'g1'), undefined);
  repo.close(); indexedDB.deleteDatabase(name);
});
test('Export/import : validation, conflits et doublons', () => {
  const data = { app: 'sprezza', schemaVersion: 1, stores: { garments: [{ id: 'a' }, { id: 'b' }, { id: 'b' }] } };
  const p = validateExport(data, { garments: [{ id: 'a' }] }).find((x) => x.store === 'garments');
  eq([p.conflicts, p.dupes, p.newRows], [1, 1, 1]);
  throws(() => validateExport({ app: 'autre', schemaVersion: 1, stores: {} }));
  throws(() => validateExport({ app: 'style-studio', schemaVersion: 99, stores: {} }));
});

// ---------------- Revue du dressing
test('Polyvalence : nombre de tenues par pièce, accessoires non concernés', () => {
  const w = businessWardrobe(); const v = versatility(w);
  ok(v[w[4].id] > 0, 'chino beige isolé'); eq(v[w[11].id], null, 'ceinture comptée');
  const lone = G('chemise', 'haut', 'burgundy'); const v2 = versatility([lone]); eq(v2[lone.id], 0);
});
test('Revue : abîmée et isolée → donner ; abîmée mais polyvalente → retoucher ; « ne me va pas » respecté', () => {
  const g = G('pull', 'haut', 'navy', { condition: 'damaged' });
  eq(reviewGarment(g, { versatility: 0, total: 10 }).verdict, 'give');
  eq(reviewGarment(g, { versatility: 8, total: 10 }).verdict, 'alter');
  eq(reviewGarment(G('chino', 'bas', 'beige', { condition: 'good' }), { versatility: 1, total: 10, dislikedFit: { [`t${n}`]: 'x' } }).verdict, 'give');
  eq(reviewGarment(G('chino', 'bas', 'beige', { condition: 'good', fit: 'regular' }), { versatility: 9, keyThreshold: 6, total: 10 }).verdict, 'key');
  const isolated = reviewGarment(G('chemise', 'haut', 'burgundy', { condition: 'good' }), { versatility: 0, total: 10 });
  eq(isolated.verdict, 'think'); ok(isolated.missing.includes('coupe'), 'info manquante non signalée');
  ok(keyThresholdOf({ a: 1, b: 2 }) >= 4);
});

// ---------------- Tenue du jour
test('Tenue du jour : occasion par défaut (semaine client, week-end promenade) et mode selon l\'identité', () => {
  eq(defaultOccasion(new Date('2026-11-24T09:00:00'), 'main'), 'client'); // mardi
  eq(defaultOccasion(new Date('2026-11-29T09:00:00'), 'main'), 'walk'); // dimanche
  eq(defaultOccasion(new Date('2026-11-24T09:00:00'), 'woman'), 'daily');
  eq(preferredMode([{ id: 'italian', pct: 50 }, { id: 'british', pct: 10 }]), 'italian');
  eq(preferredMode([{ id: 'scandi', pct: 60 }, { id: 'italian', pct: 10 }]), 'modern');
  eq(preferredMode([]), 'italian');
});

// ---------------- Accessoires
test('Accessoires : lunettes toujours portées, bracelet cuir assorti aux chaussures, cravate si réunion', () => {
  const w = businessWardrobe();
  const glasses = G('lunettes-vue', 'accessoire', 'black'); const watch = G('montre-connectee', 'accessoire', 'black');
  const bandBrown = G('bracelet-montre', 'accessoire', 'chocolate', { material: 'Cuir' }); const bandBlack = G('bracelet-montre', 'accessoire', 'black', { material: 'Cuir' }); const bandSport = G('bracelet-montre', 'accessoire', 'white', { material: 'Sport silicone' });
  const tie = G('cravate', 'accessoire', 'burgundy');
  const pool = [glasses, watch, bandBrown, bandBlack, bandSport, tie];
  const p = { top: w[0], bottom: w[5], layer: w[7], shoes: w[9] }; // chemise blanche, pantalon gris, blazer, derbies marron
  const a = chooseAccessories(p, pool, OCCASION_BY_ID['important-meeting'], 'classic');
  ok(a.includes(glasses), 'lunettes absentes'); ok(a.includes(watch), 'montre absente');
  ok(a.includes(bandBrown) && !a.includes(bandBlack) && !a.includes(bandSport), 'mauvais bracelet');
  ok(a.includes(tie), 'cravate absente en réunion');
  const casual = chooseAccessories({ top: w[3], bottom: w[6], shoes: w[10] }, pool, OCCASION_BY_ID.walk, 'modern');
  ok(!casual.includes(tie), 'cravate en promenade'); ok(casual.includes(bandSport), 'bracelet sport attendu en décontracté');
});
test('Pexels : requêtes anglaises construites depuis la tenue et les couleurs', () => {
  const w = businessWardrobe();
  eq(inspirationQuery({ layer: w[7], top: w[0], bottom: w[4] }), 'men navy blazer white shirt beige chinos');
  eq(colorsQuery({ top: 'navy', bottom: 'ecru' }), 'men navy top cream trousers outfit');
});
test('Unsplash : réponse normalisée, crédit UTM, images non Unsplash rejetées', async () => {
  const realFetch = window.fetch;
  window.fetch = async (u, init) => {
    if (!String(u).startsWith('https://api.unsplash.com/')) return realFetch(u, init);
    ok(init.headers.Authorization === 'Client-ID test-key', 'en-tête Client-ID');
    return new Response(JSON.stringify({ results: [
      { id: 'a', alt_description: 'man in navy blazer', color: '#223', urls: { small: 'https://images.unsplash.com/a?w=400', regular: 'https://images.unsplash.com/a' }, links: { html: 'https://unsplash.com/photos/a' }, user: { name: 'Ana', links: { html: 'https://unsplash.com/@ana' } } },
      { id: 'b', urls: { small: 'https://evil.example/x.jpg' }, links: { html: 'x' }, user: {} },
    ] }), { status: 200 });
  };
  try {
    const r = await searchPhotos('men navy blazer', { key: 'test-key', provider: 'unsplash' });
    eq(r.length, 1); eq(r[0].provider, 'unsplash'); ok(r[0].page.includes('utm_source=sprezza'), 'UTM manquant'); eq(r[0].photographer, 'Ana');
  } finally { window.fetch = realFetch; }
});
test('Détourage : cadrage sur les pixels visibles', () => {
  const w = 10, h = 8, d = new Uint8ClampedArray(w * h * 4);
  for (let y = 2; y <= 5; y++) for (let x = 3; x <= 6; x++) d[(y * w + x) * 4 + 3] = 255;
  eq(alphaBounds(d, w, h), { x: 3, y: 2, w: 4, h: 4 }); eq(alphaBounds(new Uint8ClampedArray(w * h * 4), w, h), null);
});
test('Lessive : tee-shirt au panier après 1 port, jean après 8, manteau jamais', () => {
  const tee = G('tee-shirt', 'haut', 'white', { availability: 'clean' });
  eq(afterWear(tee).availability, 'to-wash');
  let jean = G('jean', 'bas', 'navy', { availability: 'clean' });
  for (let i = 0; i < 7; i++) jean = afterWear(jean); eq(jean.availability, 'worn'); jean = afterWear(jean); eq(jean.availability, 'to-wash');
  jean = afterWash(jean); eq([jean.availability, jean.wearsSinceWash], ['clean', 0]);
  let coat = G('manteau', 'manteau', 'navy', { availability: 'clean' }); for (let i = 0; i < 30; i++) coat = afterWear(coat); ok(coat.availability !== 'to-wash', 'manteau en machine');
  eq(afterWear(tee, { autoBasket: false }).availability, 'worn');
});
test('Entretien : cirage dû après 8 ports de chaussures en cuir, remis à zéro quand fait', () => {
  const sh = G('derbies', 'chaussures', 'chocolate', { material: 'Cuir', wearCount: 9 });
  ok(careStatus(sh).dueTasks.some((t) => t.id === 'polish'), 'cirage non signalé');
  ok(!careStatus(afterCare(sh, 'polish')).dueTasks.some((t) => t.id === 'polish'), 'cirage non remis à zéro');
  ok(careStatus(G('mocassins', 'chaussures', 'chocolate', { material: 'Daim', wearCount: 12 })).dueTasks.some((t) => t.id === 'suede'));
});
test('Saisons bordelaises : périodes et prochain changement', () => {
  eq(periodAt(new Date('2026-11-24T12:00:00')), 'cold'); eq(periodAt(new Date('2026-06-01T12:00:00')), 'warm');
  const n = nextChange(new Date('2026-11-24T12:00:00')); eq(n.period, 'warm'); eq(n.at.getMonth(), 3); eq(n.at.getFullYear(), 2027);
});
test('Rangement : manteau rangé l\'été, bermuda rangé l\'hiver, pièces toutes saisons jamais', () => {
  const coat = G('manteau', 'manteau', 'navy'); const shorts = G('bermuda', 'bas', 'beige'); const chino = G('chino', 'bas', 'beige'); const linen = G('chemise', 'haut', 'white', { material: 'Lin' });
  const winterKnit = G('pull', 'haut', 'ecru', { seasons: ['autumn', 'winter'] });
  eq([seasonClass(coat), seasonClass(shorts), seasonClass(chino), seasonClass(linen), seasonClass(winterKnit)], ['cold', 'warm', 'all', 'warm', 'cold']);
  const summer = seasonalPlan([coat, shorts, chino, winterKnit], 'warm');
  eq(summer.toStore.map((x) => x.g.id).sort(), [coat.id, winterKnit.id].sort());
  const stored = { ...shorts, availability: 'stored' };
  eq(seasonalPlan([stored, coat], 'warm').toBringOut.map((g) => g.id), [shorts.id]);
  eq(seasonalPlan([stored, coat], 'cold').toBringOut.length, 0);
  ok(seasonalPlan([{ ...coat, availability: 'to-wash' }], 'warm').toStore[0].washFirst, 'lavage avant rangement non signalé');
});
test('Requête courte boutique sans doublons', () => eq(shortQuery({ category: 'pantalon écru', color: 'ecru', material: 'coton' }), 'pantalon écru coton'));

// ---------------- Synchronisation (faux serveur Supabase, deux appareils réels IndexedDB)
test('Synchro : règles de sélection (profil enfant, réglages locaux, jetons)', () => {
  ok(shouldSync('garments', { id: 'g' })); ok(!shouldSync('kv', { key: 'sync:session' })); ok(!shouldSync('kv', { key: 'weather:p:0' })); ok(shouldSync('kv', { key: 'capsule:p' }));
  ok(!shouldSync('photos', { id: 'x', profileId: 'kid' }, { childProfileIds: ['kid'] }), 'photo enfant envoyée');
  ok(!shouldSync('photos', { id: 'x' }, { photos: false })); ok(remoteWins({ updatedAt: '2026-01-01' }, { updatedAt: '2026-02-01' })); ok(!remoteWins({ updatedAt: '2026-03-01' }, { updatedAt: '2026-02-01' }));
});
test('Synchro : ajout, photo, modification et suppression propagés entre iPhone et ordinateur', async () => {
  const rows = new Map(); const files = new Map(); let tick = 0;
  const realFetch = window.fetch;
  const J = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'Content-Type': 'application/json' } });
  window.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.hostname !== 'test.supabase.co') return realFetch(input, init);
    const m = init.method || 'GET'; const p = url.pathname;
    ok(init.headers?.apikey === 'anon-key-0123456789abcdefghij', 'apikey manquante');
    if (p === '/auth/v1/token') return J({ access_token: 'tok', refresh_token: 'ref', expires_in: 3600, user: { id: 'u1', email: 'moi@test.fr' } });
    if (p !== '/auth/v1/token') ok(init.headers?.Authorization === 'Bearer tok', 'jeton manquant');
    if (p === '/rest/v1/sprezza_records' && m === 'POST') {
      for (const r of JSON.parse(init.body)) { ok(r.user_id === 'u1'); ok(!JSON.stringify(r.data).includes('"blob"'), 'blob envoyé dans la table'); rows.set(`${r.store}|${r.key}`, { ...r, synced_at: new Date(Date.UTC(2026, 0, 1) + ++tick * 1000).toISOString() }); }
      return new Response(null, { status: 201 });
    }
    if (p === '/rest/v1/sprezza_records') {
      const since = url.searchParams.get('synced_at').replace('gt.', ''); const off = +url.searchParams.get('offset');
      return J([...rows.values()].filter((r) => r.synced_at > since).sort((a, b) => a.synced_at.localeCompare(b.synced_at)).slice(off, off + 500));
    }
    if (p.startsWith('/storage/v1/object/authenticated/sprezza-photos/')) { const b = files.get(p.split('sprezza-photos/')[1]); return b ? new Response(b) : new Response('', { status: 404 }); }
    if (p.startsWith('/storage/v1/object/sprezza-photos/') && m === 'POST') { files.set(p.split('sprezza-photos/')[1], init.body); return J({ Key: p }); }
    if (p === '/storage/v1/object/sprezza-photos' && m === 'DELETE') { JSON.parse(init.body).prefixes.forEach((k) => files.delete(k)); return J([]); }
    return J({ message: 'route inconnue ' + p }, 404);
  };
  const names = ['sync-a-' + Date.now(), 'sync-b-' + Date.now()];
  try {
    const [ra, rb] = [await Repository.create(names[0]), await Repository.create(names[1])];
    const [A, B] = [new SyncService(ra), new SyncService(rb)];
    for (const S of [A, B]) { await S.saveConfig({ url: 'https://test.supabase.co', anonKey: 'anon-key-0123456789abcdefghij' }); await S.signIn('moi@test.fr', 'motdepasse'); }
    await ra.put('garments', { id: 'g1', profileId: 'p', name: 'Pantalon écru', category: 'bas', photoIds: ['ph1'] });
    await ra.put('photos', { id: 'ph1', ownerId: 'g1', profileId: 'p', blob: new Blob(['IMG'], { type: 'image/jpeg' }), thumb: new Blob(['T'], { type: 'image/jpeg' }) });
    await ra.kvSet('capsule:p', { level: 2, items: { 1: { owned: true } } });
    await A.sync();
    await B.sync();
    eq((await rb.get('garments', 'g1'))?.name, 'Pantalon écru', 'fiche non reçue sur B');
    eq(await (await rb.get('photos', 'ph1')).blob.text(), 'IMG', 'photo non reçue');
    eq((await rb.kvGet('capsule:p')).level, 2, 'capsule non reçue');
    await new Promise((r) => setTimeout(r, 5));
    const g = await rb.get('garments', 'g1'); await rb.put('garments', { ...g, name: 'Pantalon écru retouché' });
    await B.sync(); await A.sync();
    eq((await ra.get('garments', 'g1')).name, 'Pantalon écru retouché', 'modification non propagée');
    await ra.remove('garments', 'g1'); await ra.remove('photos', 'ph1');
    await A.sync(); await B.sync();
    eq(await rb.get('garments', 'g1'), undefined, 'suppression non propagée'); eq(await rb.get('photos', 'ph1'), undefined);
    ok(!files.has('u1/ph1.jpg'), 'photo non supprimée en ligne');
    ra.close(); rb.close();
  } finally { window.fetch = realFetch; names.forEach((n) => indexedDB.deleteDatabase(n)); }
});

test('Fiche produit web : titre, composition, prix et lien lus', () => {
  const a = parseProduct('Chemise Oxford Regular Fit - Bleu ciel | Uniqlo\n29,90 €\nComposition : 100% coton');
  eq(a.sub, 'chemise'); eq(a.category, 'haut'); eq(a.color, 'sky'); eq(a.brand, 'Uniqlo'); eq(a.material, 'Coton Oxford'); eq(a.fit, 'regular'); eq(a.price, 29.9); eq(a.composition, '100 % coton');
  ok(a.name.startsWith('Chemise Oxford'), `nom : ${a.name}`);
  const b = parseProduct('https://www.zara.com/fr/fr/pull-col-roule-100-laine-merinos-p05755300.html');
  eq(b.brand, 'Zara'); eq(b.sub, 'col-roule'); eq(b.material, 'Mérinos'); eq(b.sourceUrl, 'https://www.zara.com/fr/fr/pull-col-roule-100-laine-merinos-p05755300.html');
  const c = parseProduct('Mocassins en daim marron foncé Massimo Dutti 119 €');
  eq(c.sub, 'mocassins'); eq(c.category, 'chaussures'); eq(c.color, 'dark-brown'); eq(c.material, 'Daim'); eq(c.brand, 'Massimo Dutti'); eq(c.price, 119);
  const d = parseProduct('Manteau en laine mélangée gris anthracite 70% laine 30% polyamide');
  eq(d.sub, 'manteau'); eq(d.color, 'charcoal'); eq(d.material, 'Laine'); eq(d.composition, '70 % laine, 30 % polyamide');
  const e = parseProduct('Bracelet Apple Watch boucle unique tressée bleu marine');
  eq(e.sub, 'bracelet-montre'); eq(e.color, 'navy'); eq(e.brand, 'Apple');
  eq(parseProduct('Jean Levi\'s 501 Original').color, 'mid-blue');
  eq(urlWords('https://www2.hm.com/fr_fr/productpage.1234567001.html').brand, 'H&M'); eq(parseProduct('https://www2.hm.com/fr_fr/productpage.0925212048.html').name, undefined);
  eq(parseProduct('').found.length, 0);
});

test('Étiquette lue : composition multilingue, taille, référence, origine', () => {
  const label = 'ZARA MAN\nEUR M  USA M  MEX 40\n0706/310/401\n100% COTON\n100% COTTON\n100% ALGODÓN\nMADE IN PORTUGAL\nFABRIQUÉ AU PORTUGAL';
  const a = parseProduct(label, { label: true });
  eq(a.composition, '100 % coton'); eq(a.material, 'Coton'); eq(a.size, 'M'); eq(a.ref, '0706/310/401'); eq(a.origin, 'Portugal'); eq(a.brand, 'Zara'); eq(a.name, undefined); eq(a.price, undefined);
  eq(parseComposition('EXTÉRIEUR 80% LAINE VIERGE 20% POLYAMIDE / OUTER 80% VIRGIN WOOL 20% POLYAMIDE / DOUBLURE 100% VISCOSE').text, '80 % laine vierge, 20 % polyamide');
  eq(parseComposition('97% CO 3% EA').text, '97 % coton, 3 % élasthanne');
  eq(parseProduct('Taille: 48 Made in Italy', { label: true }).size, '48');
  eq(parseProduct('Taille: 48 Made in Italy', { label: true }).origin, 'Italie');
  eq(parseComposition('aucune fibre'), null);
});

test('Lien produit : page réelle Uniqlo et Mango lue et convertie en fiche', async () => {
  const uq = readerToText(await (await fetch('./fixture-uq.json')).json());
  const a = parseProduct(`${uq.text}\nhttps://www.uniqlo.com/fr/fr/products/E450259-000/00?colorDisplayCode=06`);
  eq(uq.name, 'Chemise Oxford'); eq(a.brand, 'Uniqlo'); eq(a.sub, 'chemise'); eq(a.color, 'mid-gray'); eq(a.price, 39.9); eq(a.composition, '100 % coton'); eq(a.material, 'Coton Oxford');
  const mg = readerToText(await (await fetch('./fixture-mg.json')).json());
  const b = parseProduct(`${mg.text}\nhttps://shop.mango.com/fr/fr/p/homme/chemises/regular-fit/chemise-100-coton-oxford/37074438/01/00`);
  eq(mg.name, 'Chemise 100% coton Oxford'); eq(b.brand, 'Mango'); eq(b.sub, 'chemise'); eq(b.color, 'white'); eq(b.price, 45.99); eq(b.composition, '100 % coton'); eq(b.fit, 'regular');
});

test('Réponse ChatGPT copiée : relue champ par champ, incertitudes ignorées', () => {
  const answer = `Voici l'identification :\n**Nom :** Blazer en laine anthracite\n**Marque :** inconnue\n**Type :** Veste : Blazer\n**Couleur :** Anthracite\n**Couleur secondaire :** aucune\n**Motif :** Chevrons\n**Matière :** Laine\n**Composition :** inconnue\n**Coupe :** Ajustée/slim\n**Saisons :** automne, hiver\n**Formalité :** 4\n**Confiance :** moyenne\n**Remarque :** Photographiez l'étiquette pour confirmer la composition.`;
  const p = parseProduct(answer);
  eq(p.name, 'Blazer en laine anthracite'); eq(p.brand, undefined); eq(p.category, 'veste'); eq(p.sub, 'blazer'); eq(p.color, 'charcoal'); eq(p.color2, undefined);
  eq(p.pattern, 'Chevrons'); eq(p.material, 'Laine'); eq(p.composition, undefined); eq(p.fit, 'slim'); eq(p.seasons.join(','), 'autumn,winter'); eq(p.formality, 4);
  eq(p.confidence, 'moyenne'); ok(/étiquette/.test(p.remark));
  const q = parseStructured('- Nom : Chino beige\n- Type : Bas : Chino\n- Couleur : Beige\n- Composition : 98 % coton, 2 % élasthanne\n- Saisons : toutes');
  eq(q.sub, 'chino'); eq(q.color, 'beige'); eq(q.composition, '98 % coton, 2 % élasthanne'); eq(q.seasons.length, 0);
  eq(parseStructured('Chemise Oxford bleu ciel 29,90 €'), null);
  ok(/Blazer/.test(assistantPrompt()) && /Anthracite/.test(assistantPrompt()), 'consigne incomplète');
});

test('JSON collé (ChatGPT) : clés françaises ou anglaises, bloc de code, valeurs inconnues ignorées', () => {
  const fr = 'Voici le résultat :\n```json\n{\n  "nom": "Pantalon flanelle gris moyen",\n  "marque": "inconnue",\n  "type": "Pantalon flanelle",\n  "couleur": "Gris moyen",\n  "couleur_secondaire": "aucune",\n  "motif": "Uni",\n  "matiere": "Flanelle",\n  "composition": "100 % laine",\n  "coupe": "Droite légèrement fuselée",\n  "saisons": ["automne", "hiver"],\n  "formalite": 4,\n  "chaleur": 4,\n  "confiance": "élevée",\n  "remarque": "Vérifier la composition sur l\'étiquette."\n}\n```';
  const a = parseProduct(fr);
  eq(a.name, 'Pantalon flanelle gris moyen'); eq(a.brand, undefined); eq(a.sub, 'flanelle'); eq(a.category, 'bas'); eq(a.color, 'mid-gray'); eq(a.color2, undefined);
  eq(a.material, 'Flanelle'); eq(a.composition, '100 % laine'); eq(a.fit, 'tapered'); eq(a.seasons.join(','), 'autumn,winter'); eq(a.formality, 4); eq(a.warmth, 4); eq(a.confidence, 'elevee');
  const en = parseProduct('{"name":"Navy cotton chinos","brand":"Uniqlo","type":"chinos","color":"navy","material":"cotton","fit":"slim","seasons":"all","price":"39.90","size":"32"}');
  eq(en.brand, 'Uniqlo'); eq(en.sub, 'chino'); eq(en.color, 'navy'); eq(en.material, 'Coton'); eq(en.fit, 'slim'); eq(en.seasons.length, 0); eq(en.price, 39.9); eq(en.size, '32');
  eq(extractJSON('pas de json'), null); eq(extractJSON('{"nom": "x",}').nom, 'x');
  ok(/```json/.test(assistantPrompt()), 'la consigne doit demander du JSON');
  eq(parseStructured(assistantPrompt()), null);
  eq(parseStructured('{"type": "pull col roulé", "couleur": "écru"}').sub, 'col-roule');
});

test('Couleurs du dressing : palette étendue, JSON, code hexadécimal, couleur inconnue signalée', () => {
  GARMENT_COLORS.forEach((c) => { ok(isValidHex(c.hex), c.id); ok(COLOR_TRAITS[c.id], `traits manquants : ${c.id}`); eq(COLOR_BY_ID[c.id].name, c.name); });
  eq(new Set(GARMENT_COLORS.map((c) => c.id)).size, GARMENT_COLORS.length, 'identifiants en double');
  const j = (o) => parseProduct(JSON.stringify({ nom: 'x', type: 'Pull', ...o }));
  eq(j({ couleur: 'Vert bouteille' }).color, 'bottle-green'); eq(j({ couleur: 'rose pâle' }).color, 'pale-pink'); eq(j({ couleur: 'Bordeaux' }).color, 'burgundy');
  eq(j({ color: 'mustard yellow' }).color, 'mustard'); eq(j({ couleur: 'Kaki' }).color, 'khaki'); eq(j({ couleur: 'Rouille' }).color, 'rust'); eq(j({ couleur: 'violet' }).color, 'purple');
  const h = j({ couleur: 'Bleu glacier', couleur_hex: '#a8c8d8' });
  eq(h.color, undefined); eq(h.colorHex, '#A8C8D8'); eq(h.colorNearest, 'sky'); eq(h.colorUnknown, 'Bleu glacier');
  const u = j({ couleur: 'chartreuse fluo' }); eq(u.color, undefined); eq(u.colorUnknown, 'chartreuse fluo');
  eq(parseProduct('Pull col rond en laine vert').color, 'green'); eq(parseProduct('Jean droit indigo brut').color, 'indigo'); eq(parseProduct('Montre bracelet acier').color, 'silver');
  ok(/Vert bouteille/.test(assistantPrompt()) && /couleur_hex/.test(assistantPrompt()), 'consigne sans les nouvelles couleurs');
});

test('JSON réel (jean NEXT) : catégorie « Bas » ≠ chaussures, sous-catégorie, clés camelCase, composition en objet, notes', () => {
  const a = parseProduct("{\"name\": \"Jean bleu délavé NEXT Straight Fit\", \"brand\": \"NEXT\", \"model\": \"Blue Mid Tint Straight Fit Vintage Wash Denim Jeans\", \"reference\": \"AD0-970\", \"category\": \"Bas\", \"subcategory\": \"Jean\", \"size\": \"W30 / L29 (30S)\", \"fit\": \"Straight Fit\", \"primaryColor\": \"Bleu denim moyen délavé\", \"secondaryColor\": null, \"colorHex\": \"#486B83\", \"colorTone\": \"Froid\", \"pattern\": \"Uni avec délavage vintage\", \"material\": \"Denim stretch\", \"composition\": {\"cotton\": 99, \"elastane\": 1}, \"collection\": null, \"seasons\": [\"Printemps\", \"Été\", \"Automne\", \"Hiver\"], \"styles\": [\"Casual Chic\", \"Smart Casual\", \"Mediterranean Chic\", \"Élégance italienne décontractée\", \"Minimalisme\", \"Contemporary Classic\"], \"occasions\": [\"Quotidien\"], \"formalityLevel\": 2, \"originalPrice\": null, \"currentPrice\": null, \"currency\": \"EUR\", \"productUrl\": \"https://www.nextdirect.com/fr/en/style/st924502/ad0970\", \"imageUrls\": [], \"matchingColors\": [\"Écru\"], \"styleScore\": 82, \"identificationConfidence\": 99, \"identificationStatus\": \"verified\", \"sources\": [\"https://www.nextdirect.com/fr/en/style/st924502/ad0970\"], \"notes\": \"Référence complète sur étiquette AD0-970-138. Fabriqué au Pakistan. Tour de taille 76 cm et entrejambe 74 cm. Modèle et composition confirmés. Anciennes fiches commerciales redirigeant vers le catalogue. Code HEX estimé.\"}");
  eq(a.category, 'bas'); eq(a.sub, 'jean'); eq(a.name, 'Jean bleu délavé NEXT Straight Fit'); eq(a.brand, 'NEXT'); eq(a.ref, 'AD0-970'); eq(a.size, 'W30 / L29 (30S)');
  eq(a.fit, 'regular'); eq(a.color, undefined); eq(a.colorHex, '#486B83'); eq(a.pattern, 'Uni'); eq(a.material, 'Denim'); eq(a.composition, '99 % coton, 1 % élasthanne');
  eq(a.seasons.length, 0); eq(a.formality, 2); eq(a.confidence, 'elevee'); eq(a.sourceUrl, 'https://www.nextdirect.com/fr/en/style/st924502/ad0970');
  eq(a.origin, 'Pakistan'); eq(a.measures.waist, 76); eq(a.measures.inseam, 74); ok(a.styles.includes('casual-chic') && a.styles.includes('italian') && a.styles.includes('scandi'), a.styles.join());
  ok(/Pakistan/.test(a.notes));
  eq(parseProduct('{"category": "Bas", "color": "navy"}').sub, 'pantalon'); eq(parseProduct('{"category": "Bas", "color": "navy"}').subGuessed, true);
  eq(parseStructured('Type : Bas\nCouleur : Marine\nMatière : Coton').category, 'bas');
  eq(parseProduct('{"type": "Baskets", "couleur": "Blanc", "nom": "Baskets cuir"}').sub, 'baskets');
});

test('Photo boutique : redressement automatique et encodage WebP/JPEG', async () => {
  const mask = (deg, w = 200, h = 300) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    x.translate(w / 2, h / 2); x.rotate((deg * Math.PI) / 180); x.fillStyle = '#000'; x.fillRect(-40, -110, 80, 220);
    return x.getImageData(0, 0, w, h).data;
  };
  const r6 = deskewAngle(mask(6), 200, 300); ok(Math.abs(r6 + 6) < 0.8, `attendu ≈ -6°, obtenu ${r6}`);
  const rm4 = deskewAngle(mask(-4), 200, 300); ok(Math.abs(rm4 - 4) < 0.8, `attendu ≈ 4°, obtenu ${rm4}`);
  eq(deskewAngle(mask(0), 200, 300), 0); eq(deskewAngle(mask(30), 200, 300), 0, 'pose volontaire non corrigée');
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; c.getContext('2d').fillRect(0, 0, 32, 32);
  const b = await encodeImage(c, 0.8);
  eq(b.type, (await supportsWebP()) ? 'image/webp' : 'image/jpeg');
});

test('Photo boutique : petits îlots effacés, pièce (même en deux parties) conservée', () => {
  const w = 400, h = 500; const d = new Uint8ClampedArray(w * h * 4);
  const fill = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) d[(y * w + x) * 4 + 3] = 255; };
  fill(100, 50, 190, 450); fill(210, 50, 300, 450); // deux jambes (pantalon) : deux grandes zones
  fill(10, 10, 16, 16); fill(380, 480, 386, 486); fill(30, 300, 34, 303); // poussières
  eq(keepMainRegions(d, w, h), 3);
  eq(d[(12 * w + 12) * 4 + 3], 0); eq(d[(200 * w + 150) * 4 + 3], 255); eq(d[(200 * w + 250) * 4 + 3], 255);
});

test('Lien produit : photos de l\'article et coloris proposés (Mango, Uniqlo)', async () => {
  const mg = await (await fetch('./fixture-mg.json')).json();
  const mi = pageImages(mg.content); ok(mi.length >= 5, `photos Mango : ${mi.length}`); ok(mi.every((i) => !/wid=40\b/.test(i.url)), 'pastilles exclues');
  const mv = colorVariants(mg.content); eq(mv.map((v) => v.name).join(','), 'Blanc,Kaki,Beige,Bleu ciel'); eq(mv[0].selected, true); eq(mv[1].code, '37'); ok(/37074438\/37\/00/.test(mv[1].href));
  const murl = 'https://shop.mango.com/fr/fr/p/homme/chemises/regular-fit/chemise-100-coton-oxford/37074438/01/00';
  eq(currentColorCode(murl, mi), '01');
  const kaki = imagesForColor(mi, '01', '37'); ok(kaki.length && kaki.every((i) => /37074438-37-/.test(i.url)), kaki.map((i) => i.url).join(' '));
  const uq = await (await fetch('./fixture-uq.json')).json();
  eq(colorVariants('![Image 9: 06](https://x.com/chip/goods_06_1_chip.jpg) ![Image 10: default image](https://x.com/chip/goods_00_1_chip.jpg) ![Image 3: GRIS](https://x.com/chip/goods_06_1_chip.jpg)').map((v) => v.name).join(), 'Gris');
  const uv = colorVariants(uq.content); ok(uv.some((v) => v.name === 'Bleu marine' && v.code === '69'), uv.map((v) => `${v.name}:${v.code}`).join(','));
  const ui = pageImages(uq.content); ok(ui.some((i) => /eugoods_06_450259/.test(i.url)), 'photo Uniqlo manquante');
  eq(currentColorCode('https://www.uniqlo.com/fr/fr/products/E450259-000/00?colorDisplayCode=06', ui), '06');
  ok(imagesForColor(ui, '06', '69').every((i) => /goods_69_450259/.test(i.url)));
});

// ---------------- Exécution
const out = document.getElementById('out'); let pass = 0; const fails = [];
for (const t of tests) {
  const li = document.createElement('li');
  try { await t.fn(); li.className = 'ok'; li.textContent = `✓ ${t.name}`; pass++; }
  catch (e) { li.className = 'ko'; li.textContent = `✗ ${t.name} — ${e.message}`; fails.push(t.name); }
  out.appendChild(li);
}
document.getElementById('summary').textContent = `${pass}/${tests.length} tests réussis${fails.length ? ` — échecs : ${fails.join(' | ')}` : ''}`;
window.__TEST_RESULT__ = { pass, total: tests.length, fails };
