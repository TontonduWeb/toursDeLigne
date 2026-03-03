# CLAUDE.md — Tour de Ligne

## Présentation du projet

**Tour de Ligne** est un système de gestion de file d'attente en français destiné aux environnements de vente au détail. Il assure une répartition équitable de la charge de travail entre les vendeurs en gérant l'attribution des clients et en suivant les performances.

Le système fonctionne sur plusieurs terminaux (tablettes/téléphones) en temps réel, permettant aux vendeurs de se coordonner efficacement dans un espace de travail partagé.

**URL de production** : `https://frontend.serveur-matthieu.ovh`

---

## Architecture technique

### Stack

- **Frontend** : React 18 + TypeScript + Tailwind CSS + react-router-dom v6
- **Backend** : Node.js / Express + SQLite
- **Auth** : JWT 12h (jsonwebtoken) + PIN hashé (bcryptjs)
- **Synchronisation** : REST API avec polling toutes les 3 secondes
- **Conteneurisation** : Docker Compose + Nginx reverse proxy
- **SSL** : Cloudflare (terminaison SSL) + Let's Encrypt
- **Tests** : Jest + Supertest (unit/intégration), Playwright (E2E), React Testing Library (composants)

### Principe fondamental : "Trust the Server"

Le serveur est la **source unique de vérité**. Le frontend ne maintient aucun état métier en local — il dérive toutes ses valeurs depuis `GET /api/state`. Cela garantit la synchronisation multi-terminaux sans logique dupliquée.

---

## Arborescence du projet

```
docker-services/
└── tours-de-ligne/
    └── app/
        ├── front/                          # Frontend React
        │   ├── src/
        │   │   ├── components/
        │   │   │   ├── TourDeLigneApp.tsx      # Composant principal (orchestrateur)
        │   │   │   ├── ConfigurationVendeurs.tsx
        │   │   │   ├── AjoutVendeurJournee.tsx
        │   │   │   ├── GestionOrdre.tsx
        │   │   │   ├── GestionClients.tsx
        │   │   │   ├── EnregistrementVentes.tsx
        │   │   │   ├── HistoriqueVentes.tsx
        │   │   │   ├── RecapitulatifJournee.tsx
        │   │   │   ├── ActionButtons.tsx
        │   │   │   ├── PageConnexion.tsx        # Page login (sélection nom + pavé PIN)
        │   │   │   ├── RouteProtegee.tsx        # Guard auth + admin
        │   │   │   ├── AdminLayout.tsx          # Shell admin avec navigation onglets
        │   │   │   ├── GestionUtilisateurs.tsx  # CRUD utilisateurs (admin)
        │   │   │   └── GestionPlanning.tsx      # CRUD templates planning (admin)
        │   │   ├── contexts/
        │   │   │   └── AuthContext.tsx          # React Context auth
        │   │   ├── hooks/
        │   │   │   ├── useRestApi.ts           # Hook central de communication API + polling
        │   │   │   ├── useAuth.ts              # Hook auth (token, connexion, déconnexion)
        │   │   │   └── useLocalStorage.ts      # (legacy, non utilisé pour l'état métier)
        │   │   ├── types/                      # Types TypeScript partagés
        │   │   └── utils/
        │   │       └── dateUtils.ts
        │   ├── Dockerfile                      # Multi-stage : build React → Nginx
        │   ├── nginx.conf
        │   └── package.json
        │
        └── back/                           # Backend Express
            ├── serveur-rest.js                 # Serveur principal + endpoints métier
            ├── middleware/
            │   └── auth.js                     # verifierToken, verifierAdmin, genererToken
            ├── routes/
            │   ├── auth.js                     # /api/connexion, /api/connexion/vendeurs
            │   ├── utilisateurs.js             # CRUD /api/utilisateurs (admin)
            │   └── planning.js                 # CRUD /api/planning/templates (admin)
            ├── utils/
            │   └── dateUtils.js                # Décalage horaire (+2h pour UTC → FR)
            ├── data/
            │   └── tour-de-ligne.db            # Base SQLite (volume Docker)
            ├── tests/
            │   ├── helpers/
            │   │   └── authHelper.js           # Génération tokens pour tests
            │   ├── unit/
            │   │   ├── vendeur.logic.test.js
            │   │   └── date.utils.test.js
            │   ├── integration/
            │   │   ├── api.integration.test.js
            │   │   ├── api.journee.test.js
            │   │   ├── api.clients.test.js
            │   │   ├── api.ventes.test.js
            │   │   ├── api.vendeurs.test.js
            │   │   ├── api.auth.test.js        # Tests auth (skip si AUTH_ACTIF=false)
            │   │   ├── api.utilisateurs.test.js # Tests CRUD utilisateurs
            │   │   └── api.planning.test.js    # Tests CRUD templates planning
            │   └── e2e/                        # Playwright
            │       ├── app.spec.ts
            │       ├── journee-complete.spec.ts
            │       ├── journee-simple.spec.ts
            │       ├── multi-vendeurs.spec.ts
            │       ├── synchronisation.spec.ts
            │       ├── test-complet.spec.ts
            │       ├── test-simple.spec.ts
            │       └── tous-occupes.spec.ts
            ├── Dockerfile                      # node:18-slim + sqlite3
            ├── jest.config.js
            └── package.json
```

---

## API REST — Endpoints

Base URL : `http://localhost:8082` (dev) / `https://frontend.serveur-matthieu.ovh/api` (prod via Nginx)

| Méthode | Endpoint                     | Auth    | Description                                     |
|---------|------------------------------|---------|-------------------------------------------------|
| GET     | `/api/connexion/vendeurs`    | Public  | Liste des noms pour la page de login             |
| POST    | `/api/connexion`             | Public  | Login `{ nom, pin }` → `{ token, utilisateur }` |
| GET     | `/api/health`                | Public  | Health check                                     |
| GET     | `/api/state`                 | Token   | État complet (vendeurs, ordre, historique)       |
| GET     | `/api/stats`                 | Token   | Statistiques agrégées                            |
| POST    | `/api/demarrer-journee`      | Token   | Démarrer une journée (`{ vendeurs: string[] }`)  |
| POST    | `/api/prendre-client`        | Token   | Attribuer un client (`{ vendeur: string }`)      |
| POST    | `/api/abandonner-client`     | Token   | Abandonner un client (`{ vendeur: string }`)     |
| POST    | `/api/enregistrer-vente`     | Token   | Enregistrer une vente (`{ vendeur: string }`)    |
| POST    | `/api/enregistrer-vente-directe` | Token | Vente sans client préalable (`{ vendeur }`)  |
| POST    | `/api/ajouter-vendeur`       | Token   | Ajouter un vendeur en cours de journée           |
| POST    | `/api/terminer-journee`      | Token   | Clôturer la journée (retourne `exportData`)      |
| POST    | `/api/reinitialiser`         | —       | Réinitialiser toutes les données                 |
| GET     | `/api/utilisateurs`          | Admin   | Liste complète des utilisateurs                  |
| POST    | `/api/utilisateurs`          | Admin   | Créer `{ nom, pin, role? }`                      |
| PUT     | `/api/utilisateurs/:id`      | Admin   | Modifier `{ nom?, pin?, actif? }`                |
| DELETE  | `/api/utilisateurs/:id`      | Admin   | Supprimer un utilisateur                         |
| GET     | `/api/utilisateurs/vendeurs-actifs` | Admin | Vendeurs actifs pour sélection           |
| GET     | `/api/planning/templates`      | Admin   | Lister tous les templates (avec vendeurs) |
| GET     | `/api/planning/templates/:id`  | Admin   | Détail d'un template                      |
| POST    | `/api/planning/templates`      | Admin   | Créer `{ nom, vendeurs: [{utilisateur_id, ordre}] }` |
| PUT     | `/api/planning/templates/:id`  | Admin   | Modifier nom et/ou composition            |
| DELETE  | `/api/planning/templates/:id`  | Admin   | Supprimer (CASCADE sur vendeurs associés) |

---

## Base de données SQLite

### Table `vendeurs`

| Colonne            | Type    | Description                        |
|--------------------|---------|------------------------------------|
| nom                | TEXT PK | Nom du vendeur                     |
| ventes             | INTEGER | Nombre de ventes réalisées         |
| client_id          | TEXT    | ID du client en cours (nullable)   |
| client_heure_debut | TEXT    | Heure de prise en charge           |
| client_date_debut  | TEXT    | Date de prise en charge            |

### Table `historique`

| Colonne   | Type    | Description                             |
|-----------|---------|-----------------------------------------|
| id        | INTEGER | Auto-increment                          |
| date      | TEXT    | Date de l'action (format fr-FR)         |
| heure     | TEXT    | Heure de l'action (format fr-FR)        |
| action    | TEXT    | Description textuelle de l'action       |
| vendeur   | TEXT    | Vendeur concerné (ou "Système")         |
| client_id | TEXT    | ID client associé (nullable)            |
| timestamp | INTEGER | Unix timestamp (tri chronologique)      |

### Table `config`

| Colonne | Type | Description           |
|---------|------|-----------------------|
| key     | TEXT | Clé de configuration  |
| value   | TEXT | Valeur                |

### Table `utilisateurs`

| Colonne  | Type    | Description                                      |
|----------|---------|--------------------------------------------------|
| id       | INTEGER | Auto-increment PK                                |
| nom      | TEXT    | Nom unique                                       |
| pin_hash | TEXT    | PIN hashé (bcrypt)                               |
| role     | TEXT    | 'admin' ou 'vendeur'                             |
| actif    | INTEGER | 1 = actif, 0 = désactivé                        |
| cree_le  | TEXT    | Date de création                                 |

**Seed** : au démarrage, si la table est vide, un admin "Matthieu" avec PIN "0000" est créé automatiquement.

### Table `planning_templates` (Phase 2 — CRUD actif)

| Colonne  | Type    | Description                                      |
|----------|---------|--------------------------------------------------|
| id       | INTEGER | Auto-increment PK                                |
| nom      | TEXT    | Nom unique du template                           |
| cree_le  | TEXT    | Date de création                                 |

### Table `planning_template_vendeurs`

| Colonne        | Type    | Description                                      |
|----------------|---------|--------------------------------------------------|
| id             | INTEGER | Auto-increment PK                                |
| template_id    | INTEGER | FK → planning_templates(id) ON DELETE CASCADE    |
| utilisateur_id | INTEGER | FK → utilisateurs(id)                            |
| ordre          | INTEGER | Position du vendeur dans le template             |

Contrainte : UNIQUE(template_id, utilisateur_id)

### Tables planning journées (Phase 2 — schema posé, non exploité)

- `planning_journees` : planification par date (statut: planifie/en_cours/termine)
- `planning_journee_vendeurs` : vendeurs affectés à une journée (avec ordre et présence)

**Note** : `PRAGMA foreign_keys = ON` est activé au démarrage pour que le CASCADE fonctionne.

---

## Authentification

### Architecture

- **JWT 12h** stocké en `localStorage` (clé `tour-de-ligne-token`)
- **PIN 4 chiffres** hashé avec `bcryptjs` (rounds=10)
- **Variable `AUTH_ACTIF`** : si `false`, le middleware auth est désactivé (tests existants passent sans modification)
- **Pas de refresh token** : re-login en 2 secondes avec un PIN, complexité injustifiée

### Flux de connexion

1. `GET /api/connexion/vendeurs` → liste des noms actifs (affichés comme boutons)
2. Sélection du nom → saisie PIN via pavé numérique tactile
3. `POST /api/connexion { nom, pin }` → serveur vérifie bcrypt → retourne `{ token, utilisateur }`
4. Token stocké en localStorage, envoyé dans `Authorization: Bearer <token>` à chaque requête
5. Si le serveur répond 401, le frontend appelle `deconnexion()` et redirige vers `/connexion`

### Rôles

| Rôle     | Accès                                        |
|----------|----------------------------------------------|
| vendeur  | Tour de ligne (page principale `/`)          |
| admin    | Tour de ligne + Administration (`/admin/*`)  |

### Routes frontend

| Path                  | Composant             | Protection       |
|-----------------------|-----------------------|------------------|
| `/connexion`          | PageConnexion         | Public           |
| `/`                   | TourDeLigneApp        | Token requis     |
| `/admin`              | AdminLayout           | Token + admin    |
| `/admin/utilisateurs` | GestionUtilisateurs   | Token + admin    |
| `/admin/planning`     | GestionPlanning       | Token + admin    |

### Fichiers backend auth

- `middleware/auth.js` : `verifierToken`, `verifierAdmin`, `genererToken`, `JWT_SECRET`
- `routes/auth.js` : endpoints publics de connexion
- `routes/utilisateurs.js` : CRUD admin des utilisateurs
- `routes/planning.js` : CRUD admin des templates de planning

### Variables d'environnement

| Variable    | Défaut                                  | Description                    |
|-------------|-----------------------------------------|--------------------------------|
| `JWT_SECRET`| `tour-de-ligne-dev-secret-key`          | Clé de signature JWT           |
| `AUTH_ACTIF`| `true`                                  | `false` désactive le middleware|

---

## Algorithme de priorité des vendeurs

Le système de sélection du prochain vendeur suit un tri à trois niveaux :

1. **Nombre de ventes** (ascendant) — le vendeur avec le moins de ventes est prioritaire
2. **Disponibilité** — seuls les vendeurs sans client en cours sont éligibles
3. **Ordre initial** (tiebreaker) — en cas d'égalité, l'ordre de démarrage de la journée est respecté

Calcul côté serveur (`calculerProchainVendeur` dans `serveur-rest.js`) :

```javascript
function calculerProchainVendeur(vendeurs) {
  const disponibles = vendeurs.filter(v => !v.clientEnCours);
  if (disponibles.length === 0) return null;
  const minVentes = Math.min(...disponibles.map(v => v.ventes));
  const prioritaires = disponibles.filter(v => v.ventes === minVentes);
  return prioritaires[0]?.nom || null;  // Le premier dans l'ordre DB = ordre initial
}
```

### Règles métier clés

- Un vendeur ne peut avoir qu'**un seul client** à la fois
- Un vendeur ajouté en cours de journée démarre à **0 ventes** (donc prioritaire)
- Le **double abandon** est interdit (erreur 400)
- L'abandon remet le vendeur en disponible à sa position dans l'ordre
- Les **vendeurs occupés** sont affichés en fin de liste côté UI
- Limite : **1 à 20 vendeurs** par journée

---

## Infrastructure Docker (production)

### docker-compose.yml (extrait pertinent)

```yaml
services:
  nginx:
    image: nginx:alpine
    container_name: nginx
    ports:
      - "80:80"
    networks:
      - internal
    volumes:
      - ./tours-de-ligne/app/front/build:/usr/share/nginx/html:ro
      # ... autres volumes (SSL, logs, etc.)

  tour-ligne-api:
    build:
      context: ./tours-de-ligne/app/back
    container_name: tour-ligne-api
    ports:
      - "8082:8082"
    networks:
      - internal
    volumes:
      - ./tours-de-ligne/app/back/data:/app/data:rw
    environment:
      - NODE_ENV=production
      - PORT=8082
      - AUTH_ACTIF=true
      - JWT_SECRET=${JWT_SECRET:-tour-de-ligne-prod-secret-changez-moi}
```

### Points d'attention Docker

- Les services communiquent par **noms de conteneur** (pas `localhost`) sur le réseau `internal`
- Le frontend est un **build statique** monté en volume read-only dans Nginx (pas un conteneur séparé)
- SQLite nécessite une image **Debian-based** (`node:18-slim`) — Alpine cause des erreurs binaires
- Le dossier `data/` est persisté via un volume Docker

### Commandes de déploiement

```bash
# Backend : rebuild + restart
cd ~/docker-services
docker-compose up -d --build tour-ligne-api

# Frontend : rebuild local puis Nginx sert automatiquement
cd ~/docker-services/tours-de-ligne/app/front
npm install && npm run build
docker restart nginx

# Logs
docker logs tour-ligne-api -f
docker logs nginx -f
```

---

## Développement local

### Prérequis

- Node.js 18+
- npm

### Lancement

```bash
# Backend
cd app/back
npm install
node serveur-rest.js
# → http://localhost:8082

# Frontend (dans un autre terminal)
cd app/front
npm install
npm start
# → http://localhost:3000
```

### Configuration API en dev

Créer un fichier `.env` dans `app/front/` :

```env
REACT_APP_API_URL=http://localhost:8082
```

Sinon, l'URL par défaut dans `useRestApi.ts` est `http://192.168.1.27:8082` (IP réseau local).

---

## Tests

### Commandes

```bash
# Tests unitaires + intégration (backend, AUTH_ACTIF=false)
cd app/back
npm test                    # Tous les tests Jest (auth désactivée)
npm run test:unit           # Unit uniquement
npm run test:integration    # Intégration API uniquement

# Tests auth spécifiques (AUTH_ACTIF=true)
npm run test:auth           # Tests connexion + CRUD utilisateurs

# Tests E2E (nécessite front + back lancés)
npm run test:e2e            # Playwright headless
npm run test:e2e:ui         # Playwright avec UI interactive
npm run test:e2e:report     # Ouvrir le rapport

# Tous les tests
npm run test:all
```

### Organisation des tests

- **Unit** (`tests/unit/`) : logique métier pure, calcul de dates
- **Intégration** (`tests/integration/`) : endpoints API avec Supertest, vérifie les réponses et l'état SQLite
- **E2E** (`tests/e2e/`) : parcours utilisateur complets avec Playwright
- **Composants React** (`front/src/**/tests/`) : React Testing Library + Jest, mocks du fetch

### Convention de nommage

- Backend : `*.test.js`
- Frontend composants : `*.test.tsx`
- E2E Playwright : `*.spec.ts`

### Points d'attention pour les tests

- Les tests d'intégration utilisent `beforeEach` avec `POST /api/reinitialiser` + un `setTimeout(500)` pour laisser SQLite se stabiliser
- Les tests frontend utilisent `jest.useFakeTimers()` pour contrôler le polling
- `setupFetchMock()` dans `testUtils.tsx` simule les réponses serveur séquentiellement

---

## Décalage horaire

Le serveur Docker tourne en UTC. La fonction `getAdjustedDate()` dans `utils/dateUtils.js` ajoute **+2 heures** pour obtenir l'heure française :

```javascript
function getAdjustedDate() {
  return new Date(Date.now() + 2 * 60 * 60 * 1000);
}
```

> ⚠️ Ce décalage fixe ne gère pas le changement heure d'été/hiver. À améliorer si nécessaire.

---

## Conventions de code

- **Langue** : tout le code métier, les variables, les noms de composants et les commentaires sont en **français**
- **Frontend** : React fonctionnel avec hooks, pas de classes
- **État** : aucun `useState` pour l'état métier côté front — tout vient du serveur via `useRestApi`
- **Formatage** : Tailwind CSS pour le style, pas de fichiers CSS séparés
- **API** : Express avec callbacks SQLite (pas de Promises/async natif pour sqlite3)

---

## Environnement du développeur

- **OS** : Windows 11
- **IDE** : VS Code
- **Terminal** : PowerShell (dev local) / Bash (production Ubuntu)
- **Versioning** : Git
- **Serveur** : Ubuntu sur `serveur-matthieu.ovh` (OVH)

---

## Flux applicatif

```
Configuration → Démarrer journée → Cycle vendeurs → Clôturer journée
     │                                    │
     ├─ Ajouter vendeurs          ├─ Prendre client
     ├─ Réorganiser l'ordre       ├─ Enregistrer vente
     └─ Supprimer vendeurs        ├─ Abandonner client
                                  └─ Ajouter vendeur en cours
```

### États d'un vendeur

```
Disponible ──→ Occupé (client en cours) ──→ Disponible (après vente)
     │                    │
     │                    └──→ Disponible (après abandon)
     │
     └──→ Occupé (prend un client)
```

# Architecture "Trust the Server" — Tour de Ligne

## Principe

Le serveur Express + SQLite est la **source unique de vérité** pour tout l'état métier de l'application. Le frontend React ne stocke aucun état métier en local — il dérive toutes ses valeurs depuis la réponse de `GET /api/state`.

Cette architecture garantit la synchronisation multi-terminaux : plusieurs tablettes/téléphones interrogent le même serveur toutes les 3 secondes et obtiennent exactement le même état.

---

## Problème résolu

Avant cette refacto, le frontend maintenait **3 couches d'état redondantes** :

| Couche | Emplacement | Problème |
|--------|-------------|----------|
| État serveur | `state` dans `useRestApi` | Données brutes du serveur |
| Transformation | callback `onStateUpdate` | Convertissait serveur → local à chaque polling |
| États locaux React | 6 `useState` séparés | Dupliquait la logique serveur côté front |

Cela causait des bugs de désynchronisation : le frontend recalculait localement le prochain vendeur (`vendeursDisponibles[0]`) sans appliquer le tri par ventes/abandons/ordre initial que le serveur effectue correctement.

---

## Implémentation actuelle

### 1. Le hook `useRestApi.ts` — Point d'entrée unique

Le hook expose un objet `state` de type `ServerState` mis à jour toutes les 3 secondes. Il n'a plus de callback `onStateUpdate` — il stocke simplement la réponse serveur dans un `useState<ServerState>`.

```typescript
const { state, isLoading, error, isOnline, actions, refresh } = useRestApi({
  baseUrl: process.env.REACT_APP_API_URL || 'http://192.168.1.27:8082',
  pollingInterval: 3000,
  token,                    // JWT depuis useAuthContext()
  onTokenExpire: handleTokenExpire,  // Redirige vers /connexion
});
```

Le `fetchState` interne fait un `GET /api/state` avec le header `Authorization: Bearer <token>` et met à jour `setState(data)`. Si le serveur répond 401, `onTokenExpire` est appelé. Si `token` est null, le polling ne démarre pas.

### 2. `TourDeLigneApp.tsx` — Valeurs dérivées, pas d'états locaux métier

Les 6 `useState` suivants ont été **supprimés** :

```typescript
// ❌ SUPPRIMÉ — plus de useState pour l'état métier
const [vendeurs, setVendeurs] = useState<string[]>([]);
const [journeeActive, setJourneeActive] = useState<boolean>(false);
const [ordreInitial, setOrdreInitial] = useState<string[]>([]);
const [ordre, setOrdre] = useState<string[]>([]);
const [historique, setHistorique] = useState<HistoriqueItem[]>([]);
const [vendeursData, setVendeursData] = useState<Record<string, VendeurData>>({});
```

Remplacés par des **valeurs dérivées** (des `const` calculées à chaque render) :

```typescript
// ✅ ACTUEL — dérivé directement de state (pas de useState)
const journeeActive = (state?.vendeurs?.length ?? 0) > 0;
const vendeurs = state?.vendeurs?.map(v => v.nom) ?? [];
const historique = state?.historique ?? [];
const ordre = vendeurs;
const ordreInitial = vendeurs;
const prochainVendeur = state?.ordreActuel?.prochainVendeur ?? null;

// Conversion vers le format vendeursData pour compatibilité avec les composants enfants
const vendeursData: Record<string, VendeurData> = {};
state?.vendeurs?.forEach(v => {
  vendeursData[v.nom] = {
    nom: v.nom,
    compteurVentes: v.ventes,
    compteurAbandons: v.abandons,
    clientEnCours: v.clientEnCours ? {
      id: v.clientEnCours.id,
      heureDebut: v.clientEnCours.heureDebut,
      dateDebut: v.clientEnCours.dateDebut
    } : undefined
  };
});
```

Seuls 3 `useState` locaux subsistent pour ce qui n'est **pas sur le serveur** :

```typescript
// ✅ CONSERVÉ — état purement local (pas métier)
const [vendeursConfig, setVendeursConfig] = useState<string[]>([]);         // Config avant démarrage
const [recapitulatifJournee, setRecapitulatifJournee] = useState<any>(null); // Après clôture
const [afficherRecapitulatif, setAfficherRecapitulatif] = useState(false);   // UI modale
```

### 3. `prochainVendeur` — Calculé par le serveur, passé en prop

Le calcul du prochain vendeur (`calculerProchainVendeur` dans `serveur-rest.js`) applique un tri à 3 niveaux : ventes ASC → abandons ASC → ordre initial ASC.

Le frontend **ne recalcule jamais** cette valeur. Il la reçoit via `state.ordreActuel.prochainVendeur` et la transmet en prop aux composants :

```tsx
<GestionOrdre
  ordre={ordre}
  ordreInitial={ordreInitial}
  vendeursData={vendeursData}
  prochainVendeur={prochainVendeur}   // ← valeur serveur
  onTerminerJournee={terminerJournee}
/>

<GestionClients
  ordre={ordre}
  vendeursData={vendeursData}
  prochainVendeur={prochainVendeur}   // ← valeur serveur
  onPrendreClient={prendreClient}
  onAbandonnerClient={abandonnerClient}
/>
```

Les composants enfants ont été modifiés pour :
- Recevoir `prochainVendeur` dans leur interface de props
- **Supprimer** tout calcul local du type `const prochainVendeur = vendeursDisponibles[0]`
- Utiliser uniquement la prop serveur pour déterminer qui est mis en surbrillance

### 4. `vendeurService.ts` — Supprimé

Ce fichier a été supprimé (ainsi que son test et le dossier `services/`). Il contenait des fonctions de tri et de calcul de priorité redondantes avec le serveur. Les composants font des calculs inline simples pour l'affichage (statistiques) et utilisent directement les valeurs serveur.

### 5. Mutations — POST puis refresh automatique

Toute action métier passe par un POST API. Le hook `useRestApi` effectue ensuite un `fetchState()` immédiat (avec un petit délai de 100ms pour laisser SQLite écrire) :

```typescript
const postRequest = useCallback(async (endpoint: string, body?: any) => {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  await new Promise(resolve => setTimeout(resolve, 100)); // Laisser SQLite finir
  await fetchState(); // Rafraîchir l'état pour tous les composants
  return data;
}, [baseUrl, fetchState]);
```

Les actions exposées :

```typescript
const actions = {
  demarrerJournee:    (vendeurs: string[]) => postRequest('/api/demarrer-journee', { vendeurs }),
  prendreClient:      (vendeur: string) => postRequest('/api/prendre-client', { vendeur }),
  abandonnerClient:   (vendeur: string) => postRequest('/api/abandonner-client', { vendeur }),
  enregistrerVente:   (vendeur: string) => postRequest('/api/enregistrer-vente', { vendeur }),
  terminerJournee:    () => postRequest('/api/terminer-journee'),
  reinitialiser:      () => postRequest('/api/reinitialiser'),
  ajouterVendeur:     (vendeur: string) => postRequest('/api/ajouter-vendeur', { vendeur }),
};
```

---

## Règles à respecter pour toute modification future

1. **Ne jamais ajouter de `useState` pour un état métier** — si la donnée existe sur le serveur, la dériver de `state`
2. **Ne jamais calculer `prochainVendeur` côté frontend** — toujours utiliser `state.ordreActuel.prochainVendeur`
3. **Toute nouvelle logique métier va dans `serveur-rest.js`** — le frontend ne fait qu'afficher
4. **Les composants enfants reçoivent les données en props** — ils ne font pas de fetch eux-mêmes
5. **Après un POST, le state se rafraîchit automatiquement** — pas besoin de mettre à jour manuellement des states locaux
6. **Tout nouvel endpoint métier doit être protégé** — ajouter `app.use('/api/nouvel-endpoint', verifierToken)` dans la section auth conditionnelle de `serveur-rest.js`
7. **Les endpoints admin passent par `routes/utilisateurs.js` ou `routes/planning.js`** — qui appliquent `verifierToken` + `verifierAdmin` automatiquement
8. **Ne jamais stocker le PIN en clair** — toujours hasher avec bcrypt avant insertion

---

## Structure des données serveur

### Réponse de `GET /api/state`

```typescript
interface ServerState {
  ordreActuel: {
    prochainVendeur: string | null;  // Calculé par le serveur, NE PAS recalculer côté front
  };
  vendeurs: Array<{
    nom: string;
    ventes: number;
    abandons: number;
    clientEnCours: {
      id: string;
      heureDebut: string;
      dateDebut: string;
    } | null;
  }>;
  historique: Array<{
    date: string;
    heure: string;
    action: string;
    vendeur?: string;
    clientId?: string;
  }>;
}
```

### Algorithme serveur (`calculerProchainVendeur`)

```javascript
function calculerProchainVendeur(vendeurs) {
  const disponibles = vendeurs.filter(v => !v.clientEnCours);
  if (disponibles.length === 0) return null;

  disponibles.sort((a, b) => {
    if (a.ventes !== b.ventes) return a.ventes - b.ventes;       // 1. Moins de ventes = prioritaire
    if (a.abandons !== b.abandons) return a.abandons - b.abandons; // 2. Moins d'abandons = prioritaire
    return a.index - b.index;                                      // 3. Ordre initial (rowid)
  });

  return disponibles[0]?.nom || null;
}
```

---

## Schéma du flux de données

```
┌──────────────────────────────────────────────────────────────────┐
│                        SERVEUR (Express + SQLite)                │
│                                                                  │
│  POST /api/prendre-client ──→ UPDATE vendeurs SET client_id     │
│                                                                  │
│  GET /api/state ──→ SELECT * FROM vendeurs ORDER BY rowid       │
│                  ──→ calculerProchainVendeur(vendeurs)           │
│                  ──→ { ordreActuel: { prochainVendeur }, ... }  │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                    Polling GET /api/state (3s)
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                     FRONTEND (React)                             │
│                                                                  │
│  useRestApi.ts                                                   │
│    └─ state: ServerState  ← setState(data) à chaque poll        │
│                                                                  │
│  TourDeLigneApp.tsx                                              │
│    ├─ const journeeActive = state.vendeurs.length > 0           │
│    ├─ const prochainVendeur = state.ordreActuel.prochainVendeur │
│    ├─ const vendeursData = { ...dérivé de state.vendeurs }      │
│    │                                                             │
│    ├─ <GestionOrdre prochainVendeur={prochainVendeur} />        │
│    ├─ <GestionClients prochainVendeur={prochainVendeur} />      │
│    └─ <EnregistrementVentes vendeursData={vendeursData} />      │
│                                                                  │
│  Composants enfants :                                            │
│    └─ Affichent les données reçues en props, aucun fetch/calcul │
└──────────────────────────────────────────────────────────────────┘
```
