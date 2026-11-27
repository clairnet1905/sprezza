# SPREZZA — Mon styliste personnel

*L'élégance devient naturelle.*

Application personnelle de stylisme (PWA local-first) : dressing numérique, styliste du jour, générateur interactif de couleurs, analyse de tenue, académie de l'élégance (20 chapitres), capsule 30 pièces, shopping raisonné, calendrier. Identité : vert forêt profond, or champagne, ivoire, Cormorant Garamond + Inter, esprit Quiet Luxury.

## Choix techniques (et pourquoi)

Le cahier des charges proposait Next.js + TypeScript « si le dépôt est vide ». La machine de développement n'a **ni Node.js ni npm** (seulement Python 3.9). Plutôt que d'installer un outillage système, l'application est construite **sans étape de build** :

- **Modules ES natifs** (JavaScript moderne, JSDoc), aucune dépendance npm, aucun lockfile nécessaire.
- **IndexedDB** via une couche `repositories/` (interface `get/all/put/remove`) remplaçable par un adaptateur cloud (Supabase/PostgreSQL + RLS) si une synchronisation est souhaitée.
- **PWA** : `manifest.webmanifest` + `sw.js` (hors ligne, installable sur l'écran d'accueil iPhone).
- **Serveur Python** (bibliothèque standard) : sert l'app et porte l'adaptateur IA. La clé API ne quitte jamais le serveur.
- Domaine pur et testable (`src/domain/`) : couleurs, score B18, moteur de recommandations déterministe, validation stricte.

Migration future vers TypeScript/Vite possible sans réécriture : la structure suit déjà l'arborescence A10.

```
index.html  manifest.webmanifest  sw.js
src/
  app.js state.js styles.css
  components/   ui (modales, toasts, icônes), mannequin SVG
  features/     today wardrobe outfits colors academy analysis shopping calendar capsule profile settings favorites more
  domain/       colors (suggestPalette) scoring (grille B18) recommend weather validate wardrobe-logic
  data/         seeds versionnés : couleurs, 20 palettes, matrice B9, 20 occasions, 15 styles, écoles, capsule, boutiques, photos C1/C2, chapitres
  repositories/ IndexedDB (+ repli mémoire)
  services/     image (EXIF supprimé, compression, recadrage), weather (Open-Meteo), ai (client → /api)
server/         server.py (statique + /api/health, /api/analyze, /api/recognize), requirements.txt
tests/          index.html + run.js (82 tests)
supabase/       setup.sql (table + stockage photo + règles RLS)
```

## Lancer en local

```bash
python3 server/server.py
```

Puis ouvrir http://localhost:8000. Tests : http://localhost:8000/tests/ (résultat attendu : 71/71).

### Activer l'IA (facultatif)

Nécessite Python 3.10+ et le SDK officiel :

```bash
pip install -r server/requirements.txt
```

```bash
ANTHROPIC_API_KEY=… python3 server/server.py
```

Modèle par défaut : `claude-opus-5-5` (variable `STYLE_STUDIO_MODEL`), sortie JSON contrainte par schéma, repli automatique côté serveur en cas de refus, limite horaire (`STYLE_STUDIO_AI_PER_HOUR`). Puis cocher le consentement IA dans Paramètres. Voir `.env.example`.

## Utiliser sur iPhone

Une PWA doit être servie en **HTTPS** pour être installée. Deux options :

1. **Hébergement statique** (GitHub Pages, Netlify, Cloudflare Pages) : déposer le dossier tel quel. Tout fonctionne sauf l'IA (questionnaire manuel disponible). Sur l'iPhone : Safari › Partager › « Sur l'écran d'accueil ».
2. **Serveur avec IA** : déployer `server/server.py` derrière un proxy HTTPS (Caddy, Nginx) ou un service type Render/Fly.io, avec `ANTHROPIC_API_KEY` en variable d'environnement. Ajouter une authentification avant toute exposition publique.

Les données restent dans le navigateur de chaque appareil : utilisez **Paramètres › Exporter / Importer** pour passer de l'ordinateur à l'iPhone.

## Synchronisation iPhone ↔ ordinateur (Supabase, gratuit)

1. Créer un compte et un projet sur https://supabase.com (offre Free).
2. Dans le projet : **SQL Editor › New query**, coller le contenu de `supabase/setup.sql`, puis **Run**. Le script crée la table et le stockage photo, protégés par des règles RLS : chaque compte n'accède qu'à ses propres données.
3. **Project Settings › API** : copier la *Project URL* et la clé publique *anon*. Ne jamais utiliser la clé *service_role*.
4. Dans SPREZZA › Paramètres › Synchronisation : coller l'adresse et la clé (ou les placer dans `src/config.js` pour ne pas les retaper sur chaque appareil), puis créer le compte (e-mail + mot de passe) et se connecter avec le même compte sur l'iPhone.

Fonctionnement : récupération des changements distants puis envoi des changements locaux ; la version la plus récente l'emporte ; les suppressions sont propagées ; les photos vont dans un stockage privé (désactivable) ; les photos d'un profil enfant ne sont jamais envoyées. Synchro automatique au démarrage, au retour sur l'app et quelques secondes après chaque modification. Hors ligne, tout continue de fonctionner et la synchro reprend au retour du réseau. Les jetons de session ne figurent jamais dans les exports.

## Tests d'acceptation (A11) — état

| Exigence | État |
|---|---|
| Photo ajoutée au dressing visible après rechargement ; modification ; suppression avec nettoyage documenté | ✅ testé (navigateur + test IndexedDB) |
| Pantalon beige → marine, blanc, olive, bleu ciel, chocolat ; veste marine ; chaussures marron foncé ; marine → écru, SVG mis à jour | ✅ testé |
| 20 palettes visibles et copiables | ✅ |
| Profil 1,63 m éditable, aucune taille S imposée, mesures à vérifier affichées | ✅ |
| Rendez-vous client → business casual ; pièce indisponible exclue ; pluie → chaussures/couches adaptées | ✅ testé |
| Dressing vide : rien d'inventé ; modèles consultables en inspiration | ✅ testé |
| Trois modes distincts ou explication du nombre de combinaisons | ✅ testé |
| 30 pièces capsule + 30 modèles, niveaux, état conservé, export des manquants (.txt/.csv) | ✅ testé |
| 15 styles, 5 écoles, 8 traditions, 20×3 occasions, 20 erreurs, 4 saisons, 20 palettes, 20 chapitres, recherche plein texte ; notes historiques ≠ recalculées | ✅ testé |
| Photo inaccessible → carte texte + lien ; droits inconnus jamais transformés en autorisation | ✅ |
| IA : JSON invalide, score hors limites, vêtement inexistant interceptés ; clé absente du client | ✅ testé |
| Shopping sans prix/stock inventés ; liens d'accueil | ✅ |
| Mobile 375 px, desktop, pas de défilement horizontal | ✅ vérifié visuellement |

## Implémenté / partiel / restant

| Domaine | État |
|---|---|
| Dressing (fiche A3 complète, photo caméra/galerie, recadrage, rotation, compression, EXIF supprimé, couleurs estimées localement, import multiple, découpe d'une photo de dressing, filtres, recherche, disponibilité, statistiques, coût par port) | Implémenté |
| Styliste du jour (20 occasions, météo Open-Meteo avec consentement ou saisie manuelle, 3 propositions, note /100, raisons, alternatives, plan B pluie/froid, remplacer/garder/autre/porter/calendrier/chercher, retours réversibles) | Implémenté |
| Générateur de couleurs (matrice exacte + règles ajoutées, mode inverse, veste/ceinture/cravate, textures, couleur libre, contexte, « avec mon dressing », sauvegarder/copier/partager) | Implémenté |
| Tenues, modèles capsule, valise N jours, historique, favoris, calendrier, export ICS | Implémenté |
| Académie (20 chapitres, 15 fiches, comparateur des écoles à pondérations, photothèque C1/C2, progression, reprise, favoris, quiz, recherche) | Implémenté |
| Analyse : questionnaire manuel + règles locales (toujours disponible) | Implémenté |
| Analyse IA et reconnaissance de vêtement (serveur) | **Partiel** : code et validation écrits, mais **non testés en conditions réelles** (pas de clé ni de Python 3.10 ici). À vérifier avec une clé avant usage. |
| Profils femme/enfant facultatifs, budgets, tailles par marque, export/import validé, données de démo supprimables | Implémenté |
| Photos réelles de l'Académie | **Partiel** : 9 photos C1 référencées en mode lien (droits non vérifiés). 8/15 styles ont une référence ; les autres sont des briefs `needs_review`. Ajout d'images dont vous détenez les droits possible. |
| Rubriques éditoriales absentes du guide initial | Signalées « À compléter et sourcer », jamais inventées. |
| Recherche interne des boutiques / API catalogue | **Restant** : formes d'URL non vérifiées → site officiel + copie de requête + recherche web restreinte au domaine. |
| Synchronisation multi-appareils (Supabase) | Implémenté et testé avec un faux serveur à deux appareils. Reste à valider sur votre projet Supabase réel. |
| Polices auto-hébergées | **Restant** : Google Fonts chargé en ligne (mis en cache hors ligne par le service worker). Télécharger les fichiers WOFF2 (licence OFL) dans `assets/fonts/` pour supprimer cet appel externe. |

## Licence

SPREZZA est un logiciel libre distribué sous **GNU Affero General Public License v3.0** (fichier `LICENSE`).
Ce choix permet d'utiliser la bibliothèque de détourage d'IMG.LY (`@imgly/background-removal`, AGPL-3.0).
Code source : https://github.com/clairnet1905/sprezza — vos données personnelles (dressing, photos) ne sont pas concernées et restent privées.

Composants tiers chargés à l'usage : `@imgly/background-removal` 1.7.0 (AGPL-3.0, via jsDelivr) et ses modèles (staticimgly.com) ; photos Pexels/Unsplash sous leurs licences respectives.

## Confidentialité

Données et photos privées dans le navigateur ; aucune télémétrie. Météo et IA uniquement après consentement ; profil enfant : aucun envoi IA. CSP stricte, échappement systématique (XSS), liens externes `noopener noreferrer`, URLs http(s) uniquement. Aucune conformité RGPD totale n'est revendiquée sans audit.

## Sources à vérifier

Les URLs des boutiques (A8), des galeries et des briefs photo (C2) sont reprises du cahier des charges ; celles marquées `needs_review` n'ont pas été revérifiées individuellement. Contrôler licence et droit de reproduction avant toute publication d'image.
