// « Plus » : accès immédiat aux écrans secondaires sur mobile.
import { html, setHTML } from '../lib/html.js';
import { icon } from '../components/ui.js';
import { COMMANDMENTS } from '../data/guide.js';
import { appVersion, forceUpdate } from '../app.js';

const ITEMS = [
  ['outfits', 'Tenues', 'outfits', 'Mes tenues, créer, 30 modèles, valise, historique'],
  ['analysis', 'Analyse IA', 'analysis', 'Noter une tenue sur 100, avec ou sans IA'],
  ['shopping', 'Shopping', 'shopping', 'Pièces utiles, boutiques, liste d\'envies, budget'],
  ['capsule', 'Capsule', 'capsule', '30 pièces, 3 niveaux, pièces manquantes'],
  ['favorites', 'Favoris', 'heart', 'Pièces, tenues et chapitres favoris'],
  ['calendar', 'Calendrier', 'calendar', 'Planifier, historique, plusieurs jours'],
  ['profile', 'Profil', 'profile', 'Mesures, tailles, identité, profils familiaux'],
  ['settings', 'Paramètres', 'settings', 'Export, confidentialité, thème, données'],
];

export function render(main) {
  const day = Math.floor(Date.now() / 864e5) % COMMANDMENTS.length;
  setHTML(main, html`<div class="page-head"><div class="eyebrow">SPREZZA</div><h1>Plus</h1></div>
    <div class="grid-2">${ITEMS.map(([id, label, ic, desc]) => html`<a class="card card-link row" href="#/${id}" style="flex-wrap:nowrap"><span style="width:40px;height:40px;display:grid;place-items:center;border-radius:50%;background:var(--forest-soft);color:var(--forest);flex:none">${icon(ic)}</span><span><strong>${label}</strong><br><span class="small muted">${desc}</span></span></a>`)}</div>
    <section class="hero" style="margin-top:22px"><div class="eyebrow">Commandement du jour</div><p class="serif-italic" style="font-size:24px;margin:0">${COMMANDMENTS[day]}</p></section>
    <div class="card-flat row-between" style="margin-top:18px"><span class="small">Version installée : <strong id="appver">…</strong><br><span class="muted">iPhone et ordinateur doivent afficher le même numéro.</span></span><button class="btn btn-sm" type="button" id="updbtn">Rechercher une mise à jour</button></div>
    <p class="small muted" style="margin-top:18px">SPREZZA est un logiciel libre (licence AGPL-3.0). <a href="https://github.com/clairnet1905/sprezza" target="_blank" rel="noopener noreferrer">Code source</a> · vos données restent privées.</p>`);
  appVersion().then((v) => { const el = main.querySelector('#appver'); if (el) el.textContent = v; });
  main.querySelector('#updbtn').onclick = (e) => { e.currentTarget.disabled = true; e.currentTarget.textContent = 'Recherche…'; forceUpdate(); };
}
