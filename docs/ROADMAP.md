# Tour de Ligne — Roadmap & Suivi de progression

> Dernière mise à jour : 4 mars 2026

---

## Bilan — Phases 1 & 2 terminées

| Phase | Contenu | Statut |
|-------|---------|--------|
| **Phase 1** | Auth JWT + gestion utilisateurs | Done |
| **Phase 2 P1** | CRUD templates de planning | Done |
| **Phase 2 P2** | Planning journalier (CRUD + présence) | Done |
| **Phase 2 P3** | Connexion Planning <-> Tour de Ligne (`/api/planning-du-jour` + bannière "Charger le planning") | Done |
| **Phase 3 P1** | Transition automatique des statuts de journée (`planifie` → `en_cours` → `termine`) | Done |
| **Phase 3 P2** | Améliorations UX du planning (vue semaine, duplication, présence masse, badges) | Done |
| **Phase 3 P3** | Statistiques et export (archivage auto, archives consultables, dashboard, export CSV) | Done |
| **Phase 3 P4** | Gestion des pauses vendeurs (pause/reprise, exclusion du calcul de priorité) | Done |
| **Phase 3 P5** | PWA & optimisation mobile (manifest, service worker, meta iOS, tactile) | Done |

### Détails Phase 1 — Authentification JWT + gestion utilisateurs

- JWT 12h avec PIN hashé (bcrypt)
- Page de connexion (sélection nom + pavé PIN)
- Middleware `verifierToken` / `verifierAdmin`
- CRUD utilisateurs (admin) : créer, modifier, désactiver, supprimer
- Seed admin automatique ("Matthieu" / PIN "0000")
- Guard frontend : `RouteProtegee` + `AuthContext`
- Tests : `api.auth.test.js`, `api.utilisateurs.test.js`

### Détails Phase 2 P1 — CRUD templates de planning

- Endpoints : `GET/POST/PUT/DELETE /api/planning/templates`
- Endpoint : `GET /api/utilisateurs/vendeurs-actifs`
- Composant admin : `GestionPlanning.tsx`
- Onglet "Planning" dans `AdminLayout.tsx`
- Tests : `api.planning.test.js`

### Détails Phase 2 P2 — Planning journalier (CRUD + présence)

- Endpoints : `POST/GET/PUT/DELETE /api/planning/journees`
- Endpoint : `PUT /api/planning/journees/:id/presence` (toggle présence vendeur)
- Création depuis un template ou sélection manuelle
- Validation : date unique (409), vendeurs actifs, statut `planifie` requis pour modification/suppression
- Composant admin : `GestionJournees.tsx`
- Onglet "Journées" dans `AdminLayout.tsx`
- Tests : `api.journees.test.js`

### Détails Phase 2 P3 — Connexion Planning <-> Tour de Ligne

- Endpoint : `GET /api/planning-du-jour` (accessible par tous les utilisateurs authentifiés, pas seulement admin)
- `TourDeLigneApp.tsx` : fetch du planning du jour quand la journée n'est pas active
- `ConfigurationVendeurs.tsx` : bannière verte "Planning du jour disponible (X vendeurs)" + bouton "Charger le planning du jour"
- Les vendeurs marqués `present = 1` sont pré-remplis dans la config, l'utilisateur peut modifier avant de démarrer

### Détails Phase 3 P1 — Transition automatique des statuts

- `POST /api/demarrer-journee` passe la journée du jour de `planifie` à `en_cours`
- `POST /api/terminer-journee` passe la journée du jour à `termine`
- 3 tests d'intégration (transition en_cours, transition termine, isolation par date)

### Détails Phase 3 P4 — Gestion des pauses vendeurs

- Nouveaux champs `en_pause` et `heure_pause` dans la table `vendeurs` (+ migration automatique)
- Endpoints : `POST /api/pauser-vendeur` + `POST /api/reprendre-vendeur` (auth Token)
- `calculerProchainVendeur` exclut les vendeurs en pause
- Guard `POST /api/prendre-client` rejette si vendeur en pause
- Durée de pause calculée à la reprise et loggée dans l'historique
- UI : vendeurs en pause affichés en violet (`bg-purple-100`), badge "En pause" dans les stats, boutons Pause/Reprendre dans `GestionOrdre` et `GestionClients`
- Tests : 7 tests d'intégration dans `api.vendeurs.test.js` (13 tests total)

### Détails Phase 3 P2 — Améliorations UX du planning

- **Vue semaine** : navigation `← Précédente` / `Suivante →` / `Aujourd'hui`, chargement filtré via `?du=lundi&au=dimanche`, grille 7 jours (jours vides affichés avec bouton `+ Créer`)
- **Duplication** : bouton `Dupliquer` sur toutes les journées (tous statuts), formulaire inline avec date cible
- **Présence en masse** : nouvel endpoint `PUT /api/planning/journees/:id/presence-masse` `{ present: bool }`, boutons `✓ Tous` / `✗ Aucun` dans l'UI
- **Badges améliorés** : 📅 Planifié (bleu), ● En cours avec dot pulsant animé (vert), ✓ Terminé (gris), dates avec jour de la semaine (`Lun 10/03/2026`), badge `Aujourd'hui` en jaune
- Tests : 3 tests ajoutés pour `presence-masse` (tous absents, tous présents, rejet si statut !== planifie)

### Détails Phase 3 P3 — Statistiques et export

- **Table `journee_archives`** : archivage automatique à la clôture (date_journee UNIQUE, stats en colonnes + blob JSON complet)
- **Archivage dans `POST /api/terminer-journee`** : `INSERT OR REPLACE` avant la suppression des vendeurs/historique
- **4 endpoints admin** : `GET /api/archives/journees` (liste), `GET /api/archives/journees/:id` (détail), `GET /api/archives/journees/:id/csv` (export CSV), `GET /api/archives/stats` (stats agrégées + classement vendeurs)
- **Composant admin** : `GestionStatistiques.tsx` — toggle semaine/mois, navigation, 4 cartes résumé, classement vendeurs, liste archives avec détail expandable et export CSV
- **Onglet** "Statistiques" dans `AdminLayout.tsx`, route `/admin/statistiques`
- **Tests** : `api.archives.test.js` (10 tests)

**Impact** : `serveur-rest.js` (schema + archivage + reinitialiser), `routes/archives.js` (nouveau), `types.ts`, `GestionStatistiques.tsx` (nouveau), `App.tsx`, `AdminLayout.tsx`, `api.archives.test.js` (nouveau), `package.json`

---

## Phase 3 — Plan d'améliorations

### Priorité 1 — Transition automatique des statuts de journée ✅

> Le statut de la journée planifiée évolue automatiquement avec le cycle de vie du tour de ligne.

| Tache | Description | Statut |
|-------|-------------|--------|
| Transition `planifie` -> `en_cours` | Quand `POST /api/demarrer-journee` est appelé, passer la journée du jour à `en_cours` | Done |
| Transition `en_cours` -> `termine` | Quand `POST /api/terminer-journee` est appelé, passer la journée du jour à `termine` | Done |
| Protection existante | Empêcher la modification/suppression d'une journée `en_cours` ou `termine` (déjà fait côté API) | Done |
| Tests | 3 tests d'intégration (transition en_cours, transition termine, isolation par date) | Done |

**Impact** : `serveur-rest.js` (2 endpoints modifiés), `api.journees.test.js` (3 tests ajoutés)

---

### Priorité 2 — Améliorations UX du planning ✅

> Rendre l'interface admin plus pratique au quotidien.

| Tache | Description | Statut |
|-------|-------------|--------|
| Vue semaine | Navigation semaine (← → Aujourd'hui), grille 7 jours, chargement filtré `?du=&au=`, bouton "+ Créer" sur jours vides | Done |
| Dupliquer une journée | Bouton "Dupliquer" (tous statuts), formulaire inline date cible, `POST /api/planning/journees` avec vendeurs copiés | Done |
| Actions en masse | Boutons "✓ Tous" / "✗ Aucun", nouvel endpoint `PUT /api/planning/journees/:id/presence-masse` | Done |
| Badges de statut | 📅 Planifié (bleu), ● En cours avec dot pulsant (vert), ✓ Terminé (gris), dates avec jour (`Lun 10/03`), badge "Aujourd'hui" | Done |

**Impact** : `GestionJournees.tsx` (réécriture complète), `routes/planning.js` (1 endpoint ajouté), `api.journees.test.js` (3 tests ajoutés, 29 total)

---

### Priorité 3 — Statistiques et export ✅

> Exploiter les données de ventes accumulées.

| Tache | Description | Statut |
|-------|-------------|--------|
| Table `journee_archives` | Archivage automatique à la clôture (INSERT OR REPLACE avant DELETE) | Done |
| Export CSV | Export CSV des statistiques de journée (Vendeur;Ventes;Abandons) | Done |
| Historique journées | Consulter les récapitulatifs des journées clôturées (liste + détail expandable) | Done |
| Dashboard | Vue synthétique semaine/mois avec cartes résumé et classement vendeurs | Done |

**Impact** : `serveur-rest.js` (schema + archivage + reinitialiser), `routes/archives.js` (nouveau, 4 endpoints), `types.ts`, `GestionStatistiques.tsx` (nouveau), `App.tsx`, `AdminLayout.tsx`, `api.archives.test.js` (nouveau, 10 tests)

---

### Priorité 4 — Gestion des pauses ✅

> Cas métier réel : un vendeur part en pause déjeuner.

| Tache | Description | Statut |
|-------|-------------|--------|
| Nouveau statut | Champs `en_pause` + `heure_pause` dans table `vendeurs` (+ migration auto) | Done |
| Endpoints pause | `POST /api/pauser-vendeur` + `POST /api/reprendre-vendeur` (Token) | Done |
| Exclusion du calcul | Le vendeur en pause est exclu de `calculerProchainVendeur` | Done |
| Guard prendre-client | `POST /api/prendre-client` rejette si vendeur en pause | Done |
| Affichage UI | Badge "En pause" violet, boutons Pause/Reprendre dans `GestionOrdre` et `GestionClients` | Done |
| Tests | 7 tests d'intégration dans `api.vendeurs.test.js` | Done |

**Impact** : `serveur-rest.js` (schema + migration + 2 endpoints + guards), `types.ts`, `useRestApi.ts`, `TourDeLigneApp.tsx`, `GestionOrdre.tsx`, `GestionClients.tsx`, `api.vendeurs.test.js`

---

### Priorité 5 — PWA & optimisation mobile ✅

> L'app tourne sur tablettes en magasin.

| Tache | Description | Statut |
|-------|-------------|--------|
| Manifest PWA | `manifest.json` corrigé (nom, description, couleurs, orientation, icônes relais 192/512) | Done |
| Service Worker | SW vanilla : cache shell (install), cache-first assets, network-only API, network-first navigation | Done |
| Meta tags iOS | `apple-mobile-web-app-capable`, `status-bar-style`, `apple-touch-icon`, `lang="fr"` | Done |
| Optimisation tactile | `touch-action: manipulation` (supprime délai 300ms), `-webkit-tap-highlight-color: transparent` | Done |
| Nginx headers SW | `service-worker.js` en `no-cache`, `manifest.json` en `expires 1h` | Done |

**Impact** : `manifest.json`, `index.html`, `service-worker.js` (nouveau), `index.tsx`, `index.css`, `nginx.conf`, `logo192.png` + `logo512.png` (générés depuis `course-de-relais.png`)
