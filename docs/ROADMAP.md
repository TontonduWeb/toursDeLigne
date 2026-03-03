# Tour de Ligne — Roadmap & Suivi de progression

> Dernière mise à jour : 3 mars 2026

---

## Bilan — Phases 1 & 2 terminées

| Phase | Contenu | Statut |
|-------|---------|--------|
| **Phase 1** | Auth JWT + gestion utilisateurs | Done |
| **Phase 2 P1** | CRUD templates de planning | Done |
| **Phase 2 P2** | Planning journalier (CRUD + présence) | Done |
| **Phase 2 P3** | Connexion Planning <-> Tour de Ligne (`/api/planning-du-jour` + bannière "Charger le planning") | Done |
| **Phase 3 P1** | Transition automatique des statuts de journée (`planifie` → `en_cours` → `termine`) | Done |

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

### Priorité 2 — Améliorations UX du planning

> Rendre l'interface admin plus pratique au quotidien.

| Tache | Description | Statut |
|-------|-------------|--------|
| Vue semaine | Afficher les 7 prochains jours avec les équipes assignées | A faire |
| Dupliquer une journée | Copier le planning d'un jour vers un autre | A faire |
| Actions en masse | Boutons "Tous présents" / "Tous absents" sur une journée | A faire |
| Badges de statut | Pastilles couleur améliorées dans la liste (planifié/en_cours/terminé) | A faire |

**Impact** : `GestionJournees.tsx`, éventuellement nouveaux endpoints backend

---

### Priorité 3 — Statistiques et export

> Exploiter les données de ventes accumulées.

| Tache | Description | Statut |
|-------|-------------|--------|
| Export CSV | Export CSV des statistiques de journée (vendeurs, ventes, abandons) | A faire |
| Historique journées | Consulter les récapitulatifs des journées clôturées | A faire |
| Dashboard | Vue synthétique des performances hebdomadaires/mensuelles | A faire |

**Impact** : nouveaux endpoints backend, nouveaux composants frontend, possiblement nouvelle table SQLite pour stocker les récapitulatifs

---

### Priorité 4 — Gestion des pauses

> Cas métier réel : un vendeur part en pause déjeuner.

| Tache | Description | Statut |
|-------|-------------|--------|
| Nouveau statut | Ajouter le statut "en pause" (ni disponible, ni occupé avec un client) | A faire |
| Endpoints pause | `POST /api/pause-vendeur` + `POST /api/reprendre-vendeur` | A faire |
| Exclusion du calcul | Le vendeur en pause est exclu de `calculerProchainVendeur` | A faire |
| Affichage UI | Badge "En pause" spécifique dans l'interface | A faire |

**Impact** : `serveur-rest.js` (nouveau champ `en_pause` dans table `vendeurs`, 2 nouveaux endpoints), composants frontend (`GestionOrdre`, `GestionClients`), tests

---

### Priorité 5 — PWA & optimisation mobile

> L'app tourne sur tablettes en magasin.

| Tache | Description | Statut |
|-------|-------------|--------|
| Manifest PWA | `manifest.json` pour installation sur écran d'accueil | A faire |
| Service Worker | Fonctionnement hors-ligne minimal (cache des assets) | A faire |
| Optimisation tactile | Taille des boutons, feedback visuel, ergonomie mobile | A faire |

**Impact** : `app/front/public/` (manifest, service worker, icônes), composants frontend (tailles/marges)
