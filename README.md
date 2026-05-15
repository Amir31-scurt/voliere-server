# 🐦 Volière App — Backend

API REST Express.js pour la gestion d'un colombier. Connecté à **Supabase** (PostgreSQL) avec authentification JWT et mises à jour temps réel via **Socket.IO**.

## 🛠️ Stack technique

| Outil | Rôle |
|-------|------|
| **Node.js** + **Express.js** | Serveur HTTP |
| **Supabase** (PostgreSQL) | Base de données |
| **JWT** | Authentification |
| **Socket.IO** | Événements temps réel |
| **Swagger UI** | Documentation interactive de l'API |
| **Nodemon** | Hot reload en développement |

---

## 📁 Structure du projet

```
server/
├── config/
│   └── supabase.js          # Client Supabase initialisé
├── controllers/             # Logique métier
│   ├── authController.js
│   ├── pigeonController.js
│   ├── coupleController.js
│   ├── cageController.js
│   ├── reproductionController.js
│   └── sortieController.js
├── middleware/
│   ├── authMiddleware.js     # Vérification JWT
│   ├── errorHandler.js      # asyncHandler + gestionnaire d'erreurs global
│   └── validate.js          # Validation Joi des requêtes
├── routes/
│   ├── authRoutes.js
│   ├── pigeonRoutes.js
│   ├── coupleRoutes.js
│   ├── cageRoutes.js
│   ├── reproductionRoutes.js
│   └── sortieRoutes.js
├── socket/                  # Événements Socket.IO
├── supabase/
│   └── migrations/
│       └── all_migrations.sql  # Schéma complet de la base de données
├── utils/
│   └── validators.js        # Helpers (isCageFree, pigeonHasChildren…)
├── docs/                    # Swagger/OpenAPI spec
├── index.js                 # Point d'entrée du serveur
├── package.json
├── .env                     # Variables d'environnement (non committé)
└── .env.example             # Template des variables
```

---

## ⚡ Démarrage rapide

### Prérequis
- Node.js ≥ 18
- Un projet **Supabase** avec la base de données initialisée

### Installation

```bash
cd server
npm install
```

### Variables d'environnement

Créez un fichier `.env` à partir du template :

```bash
cp .env.example .env
```

Contenu `.env` :

```env
PORT=5000
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOi...   # Service Role Key (pas l'anon key)
JWT_SECRET=votre_secret_jwt_tres_long
```

> ⚠️ Utilisez la **Service Role Key** de Supabase (et non l'Anon Key) pour que le backend puisse contourner les RLS policies.

### Initialiser la base de données

Exécutez le fichier de migrations dans le **SQL Editor** de votre dashboard Supabase :

```
supabase/migrations/all_migrations.sql
```

### Migration importante (contrainte sexe)

Si vous avez une base existante, exécutez également :

```sql
ALTER TABLE pigeons DROP CONSTRAINT IF EXISTS pigeons_sexe_check;
ALTER TABLE pigeons ADD CONSTRAINT pigeons_sexe_check 
  CHECK (sexe IN ('male','femelle','inconnu'));
```

### Lancement en développement

```bash
npm run dev
```

Le serveur démarre sur **http://localhost:5000**

---

## 📡 API Reference

Documentation Swagger interactive disponible sur :

```
http://localhost:5000/api-docs
```

### Endpoints disponibles

#### 🔐 Auth
| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/auth/register` | Créer un compte |
| `POST` | `/api/auth/login` | Se connecter (retourne JWT) |
| `GET` | `/api/auth/me` | Profil de l'utilisateur connecté |

#### 🐦 Pigeons
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/pigeons` | Liste avec filtres (statut, sexe, search, page) |
| `GET` | `/api/pigeons/:id` | Détail (avec père, mère, cage) |
| `POST` | `/api/pigeons` | Créer un pigeon |
| `PUT` | `/api/pigeons/:id` | Modifier |
| `DELETE` | `/api/pigeons/:id` | Soft delete si descendants, hard delete sinon |

#### 💕 Couples
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/couples` | Liste avec filtres |
| `GET` | `/api/couples/:id` | Détail avec reproductions |
| `POST` | `/api/couples` | Former un couple |
| `PUT` | `/api/couples/:id/separer` | Rompre un couple |

#### 🏠 Cages
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/cages` | Liste (filtre par `?voliere=`) |
| `GET` | `/api/cages/:id` | Détail avec pigeon/couple et reproductions |
| `POST` | `/api/cages` | Créer une cage |
| `PUT` | `/api/cages/:id` | Modifier une cage |
| `DELETE` | `/api/cages/:id` | Supprimer (seulement si libre) |
| `PUT` | `/api/cages/:id/affecter` | Affecter un pigeon ou un couple |
| `PUT` | `/api/cages/:id/liberer` | Libérer la cage |
| `GET` | `/api/cages/:id/historique` | Historique des événements |

#### 🥚 Reproductions
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/reproductions` | Liste (filtre par `?couple_id=`) |
| `GET` | `/api/reproductions/:id` | Détail |
| `POST` | `/api/reproductions` | Enregistrer une ponte |
| `PUT` | `/api/reproductions/:id` | Mettre à jour (éclosion, clôture) |
| `DELETE` | `/api/reproductions/:id` | Supprimer |

#### 📤 Sorties
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/sorties` | Liste avec filtres |
| `GET` | `/api/sorties/:id` | Détail |
| `POST` | `/api/sorties` | Enregistrer une sortie (vente/décès/perte) |

---

## 🧠 Logique métier clé

### Soft Delete des pigeons (`DELETE /api/pigeons/:id`)
- Si le pigeon a des **descendants** (père ou mère d'un autre pigeon) → `is_deleted: true`, `statut: 'mort'`
- Sinon → suppression physique

### Création automatique des pigeonneaux (`PUT /api/reproductions/:id`)
Déclenchée quand `statut` passe à `'terminee'` avec `nombre_nes > 0` :
1. Récupère la race du père et de la mère
2. Calcule la race des pigeonneaux :
   - Même race → hérite de la race
   - Races différentes → `"Métissé (RaceA × RaceB)"`
   - Un seul parent avec race → hérite de ce parent
3. Crée N pigeons avec `pere_id`, `mere_id`, `date_naissance` (= date d'éclosion), `cage_actuelle_id: null`
4. Le sexe est saisi par l'utilisateur (`'male'`, `'femelle'` ou `'inconnu'`)

### Sortie d'un pigeon (`POST /api/sorties`)
En cascade automatique :
- Pigeon → statut mis à jour (`vendu`, `mort`, `perdu`)
- Cage → libérée automatiquement si occupée
- Couple → séparé automatiquement si en couple actif

### Événements Socket.IO émis
| Événement | Déclenché par |
|-----------|--------------|
| `cage:updated` | Affecter, libérer une cage, sortie pigeon |

---

## 🗄️ Schéma de la base de données

```
users          — Comptes utilisateurs (auth)
pigeons        — Pigeons (avec généalogie père/mère)
couples        — Couples (mâle + femelle)
cages          — Cages (lien vers pigeon ou couple)
reproductions  — Pontes et cycles de reproduction
sorties        — Ventes, décès, pertes
cage_historique — Journal des événements par cage
```

Voir le schéma complet : [`supabase/migrations/all_migrations.sql`](./supabase/migrations/all_migrations.sql)

---

## 🚀 Déploiement

### Variables de production
```env
NODE_ENV=production
PORT=5000
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
JWT_SECRET=...   # Générer avec : openssl rand -base64 64
```

### Avec PM2
```bash
npm install -g pm2
pm2 start index.js --name voliere-api
pm2 save
pm2 startup
```

### Avec Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "index.js"]
```
