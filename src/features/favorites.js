// Favoris : pièces, tenues, chapitres et styles favoris.
import { html, setHTML } from '../lib/html.js';
import { emptyState, icon } from '../components/ui.js';
import { store, garments as loadGarments, outfits as loadOutfits, hydratePhotos } from '../state.js';
import { CHAPTERS } from '../data/chapters.js';
import { STYLE_BY_ID } from '../data/styles.js';
import { OCCASION_BY_ID } from '../data/occasions.js';
import { garmentCard } from './shared.js';

export async function render(main) {
  const [gs, os, ac] = await Promise.all([loadGarments(), loadOutfits(), store.repo.kvGet('academy', { favorites: [] })]);
  const fg = gs.filter((g) => g.favorite); const fo = os.filter((o) => o.favorite); const fa = ac.favorites || [];
  setHTML(main, html`<div class="page-head"><div class="eyebrow">Favoris</div><h1>Mes favoris</h1></div>
    ${!fg.length && !fo.length && !fa.length ? emptyState('Aucun favori', 'Utilisez le cœur sur une pièce, une tenue, un chapitre ou un style.', html`<a class="btn" href="#/wardrobe">Dressing</a><a class="btn" href="#/academy">Académie</a>`) : ''}
    ${fo.length ? html`<h2>Tenues</h2><div class="grid-wide">${fo.map((o) => html`<a class="card card-link" href="#/outfits/${o.id}"><span class="eyebrow">${OCCASION_BY_ID[o.occasionId]?.name || 'Libre'}</span><h3>${o.name}</h3></a>`)}</div>` : ''}
    ${fg.length ? html`<h2>Pièces</h2><div class="grid-cards">${fg.map(garmentCard)}</div>` : ''}
    ${fa.length ? html`<h2>Académie</h2><div class="chips">${fa.map((id) => { const c = CHAPTERS.find((x) => x.id === id); const s = STYLE_BY_ID[id]; return c ? html`<a class="chip" href="#/academy/ch/${id}">${icon('book')} ${c.title}</a>` : s ? html`<a class="chip" href="#/academy/style/${id}">${icon('star')} ${s.name}</a>` : ''; })}</div>` : ''}`);
  hydratePhotos(main);
}
