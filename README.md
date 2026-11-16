# Makutano Mining Title Manager — Cadastre minier numérique RDC

Next.js 14 (App Router) · TypeScript · Tailwind · Leaflet (`react-leaflet`) · PostgreSQL **+ PostGIS** · Prisma.
Les calculs de géométrie (validité, surface, intersections) sont faits **par PostGIS**, pas en JavaScript.

## Démarrage rapide

```bash
cp .env.example .env            # éditez AUTH_SECRET
docker compose up -d            # PostgreSQL + PostGIS (image postgis/postgis)
npm install
npm run db:push                 # active l'extension postgis et crée les tables
npm run db:seed                 # 5 zones : Kolwezi, Tenke-Fungurume, Lubumbashi-Kipushi, Walikale, Kamituga
npm run dev                     # http://localhost:3000
```

Comptes de démo (mot de passe `Makutano#2026`) : `admin@cadastre.demo`, `inspecteur@cadastre.demo`, `demandeur@cadastre.demo`
(connexion rapide sur `/login`).

## Plan d'exécution et tests

| # | Étape | Scénario de test |
|---|-------|------------------|
| 1 | **Initialisation** : `npm install`, `.env`, `npm run dev` | `http://localhost:3000` affiche directement la carte publique (fond sombre, rouge #E53935). `/admin` sans session redirige vers `/login`. |
| 2 | **PostGIS et Prisma** : `db:push`, `db:seed` | Le seed affiche environ 38 périmètres, 11 dossiers, des redevances et des entrées d'audit. Dans `psql` : `SELECT code, ST_AsText(ST_Centroid(geom)), "areaHa" FROM "Title" LIMIT 5;` renvoie des coordonnées et des surfaces d'environ 85 ha par carré. |
| 3 | **Carte SIG Leaflet** | Sur `/` : carrés verts (libre), rouges (attribué), orange pointillé (en instruction), gris à bord or (réservé). Décocher « Libre » masque les verts. Filtre « Substance = Coltan » : seul Walikale reste coloré. Boutons Lualaba / Nord-Kivu : vol vers la zone. Clic sur un carré : fiche (le titulaire n'apparaît **qu'une fois connecté**). Recherche `PE-13017`. |
| 4 | **Guichet unique et anti-chevauchement** | Connexion « Demandeur » → *Nouvelle demande*. Bouton **Zone en chevauchement** : alerte rouge « Chevauchement détecté », liste des titres touchés avec hectares communs, zone surlignée, bouton de dépôt désactivé. Bouton **Zone libre (Kolwezi)** : « Aucun chevauchement, X ha ». Cliquer 3 points sur la carte construit aussi un polygone. Joindre 2 PDF (statuts, RCCM) puis *Déposer* : la zone passe en orange sur la carte. Un polygone dont les arêtes se croisent est refusé. |
| 5 | **Dashboard Ministère** | Connexion « Inspecteur SIG » → Demandes → ouvrir le dossier déposé → *Prendre en charge* → avis favorable motivé. Connexion « Admin Ministère » → *Octroyer le titre* : la zone devient rouge, une redevance est programmée. *Rejeter* exige un motif. Onglet **Redevances** : alertes en retard / J-25, *Enregistrer le paiement*. Onglet **Registre** : *Constater l'expiration* sur le titre échu de Lubumbashi. Onglet **Audit** : badge « Chaîne intègre ». |

### Test de l'infalsifiabilité
`UPDATE "AuditLog" SET details = 'modifié' WHERE seq = 5;` puis recharger l'onglet Audit : bandeau rouge « Chaîne rompue à l'entrée n°5 ».

## Comment fonctionne l'anti-chevauchement
`src/lib/geo.ts` : la requête retient les titres `ATTRIBUTED`, `PENDING` et `RESERVED` pour lesquels
`ST_Intersects(...) AND NOT ST_Touches(...)` (deux carrés voisins qui partagent une bordure sont acceptés) et dont la surface commune dépasse 0,01 ha.
Le contrôle est exécuté (1) en direct dans le formulaire, (2) au dépôt, sous verrou consultatif PostgreSQL pour éviter qu'un dépôt simultané passe entre deux contrôles, (3) de nouveau à l'octroi.
Les zones `FREE`, `REJECTED` et `EXPIRED` ne bloquent pas.

## Points d'attention
- **PostGIS est obligatoire** : image `postgis/postgis` en local, ou Neon / Supabase (extension disponible) en ligne. `prisma db push` exécute `CREATE EXTENSION postgis`.
- **Barème indicatif** : durées de validité (5 ans recherche, 30 ans exploitation) et tarifs de redevance par hectare dans `src/lib/constants.ts`, à aligner sur le Code minier et le barème officiel.
- **Alertes** : calculées à chaque affichage (toujours à jour). Aucun e-mail ni SMS n'est envoyé dans ce MVP.
- **Pièces jointes** : stockées dans PostgreSQL (compatible Vercel), limitées à 3 Mo par fichier et 4 Mo au total (limite de corps de requête de Vercel). Pour de gros dossiers, passer à un stockage objet (S3 / R2).
- **Fonds de carte** : CARTO (sombre) et Esri (satellite) nécessitent Internet côté navigateur.
- Sociétés, codes de titres et périmètres sont **fictifs** ; seuls les lieux sont réels.
- Avant production : limitation de débit sur le login, MFA pour les agents, sauvegardes, hébergement des fichiers hors base.

## Arborescence
```
prisma/            schema.prisma (PostGIS), seed.ts
src/middleware.ts  protection /admin et /applicant
src/lib/           constants, geo (PostGIS), coords, demo-geo, alerts, audit + hash (chaîne SHA-256), auth, api…
src/components/    GeoMap (Leaflet), ApplicationDetail, Badges, AppHeader, Feedback
src/app/page.tsx + MapExplorer.tsx    carte publique
src/app/login, register               authentification
src/app/applicant (+ /new)            espace demandeur et guichet unique
src/app/admin                         dashboard Ministère / Inspecteur
src/app/api                           auth, titles, check-overlap, applications (+action, documents), fees, alerts, dashboard, audit
```
