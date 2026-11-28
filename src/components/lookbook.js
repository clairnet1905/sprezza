// Tenue « à plat » (flat lay) : les vraies photos des pièces, disposées comme la tenue se porte —
// veste ou manteau à gauche, haut puis pantalon à droite, ceinture entre les deux, chaussures en bas.
// Les versions boutique (fond retiré) sont prises d'abord ; une pièce sans photo garde sa silhouette dans sa couleur.
import { html } from '../lib/html.js';
import { garmentGlyph } from './mannequin.js';

const ROLE_FR = { outer: 'Manteau', layer: 'Veste', top: 'Haut', bottom: 'Bas', belt: 'Ceinture', shoes: 'Chaussures', accessory: 'Accessoire' };

function tile(role, g, cls = '') {
  if (!g) return '';
  const photos = g.photoIds || [];
  const hex = g.color?.hex || '#C9C2B4';
  return html`<figure class="lb-tile lb-${role} ${cls}" title="${ROLE_FR[role]} : ${g.name}">
    ${photos.length ? html`<img alt="${g.name}" data-photo="${photos[0]}" data-photo-list="${photos.join(',')}" loading="lazy">` : html`<span class="lb-glyph">${garmentGlyph(role, hex)}</span>`}
    <figcaption>${g.name}</figcaption></figure>`;
}

/** @param {{top, bottom, layer, outer, shoes, belt, accessories}} p — fiches du dressing */
export function lookbookHTML(p, { label = 'Tenue composée avec les photos de vos pièces' } = {}) {
  const main = p.outer || p.layer; const mainRole = p.outer ? 'outer' : 'layer';
  const left = main ? [tile(mainRole, main), tile('shoes', p.shoes)] : [tile('top', p.top), tile('shoes', p.shoes)];
  const right = main ? [tile('top', p.top), tile('bottom', p.bottom)] : [tile('bottom', p.bottom)];
  // Petites pièces en bas : ceinture, seconde veste (sous le manteau), accessoires
  const strip = [tile('belt', p.belt, 'lb-small'), p.outer && p.layer ? tile('layer', p.layer, 'lb-small') : '', ...(p.accessories || []).slice(0, 3).map((a) => tile('accessory', a, 'lb-small'))].filter(Boolean);
  return html`<div class="lookbook ${main ? 'lb-layered' : 'lb-simple'}" role="img" aria-label="${label}">
    <div class="lb-col lb-left">${left}</div>
    <div class="lb-col lb-right">${right}</div>
    ${strip.length ? html`<div class="lb-acc">${strip}</div>` : ''}
  </div>`;
}
