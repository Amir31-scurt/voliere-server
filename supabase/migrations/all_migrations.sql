-- ============================================
-- VOLIÈRE APP — Toutes les migrations
-- ============================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,
  nom        VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CAGES (sans FK vers pigeons/couples d'abord)
CREATE TABLE IF NOT EXISTS cages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero     VARCHAR(10) UNIQUE NOT NULL,
  nom        VARCHAR(100),
  voliere    VARCHAR(50) DEFAULT 'Volière A',
  superficie DECIMAL(5,2),
  statut     VARCHAR(20) DEFAULT 'libre' CHECK (statut IN ('libre','pigeon','couple')),
  pigeon_id  UUID,
  couple_id  UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PIGEONS
CREATE TABLE IF NOT EXISTS pigeons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bague            VARCHAR(50) UNIQUE NOT NULL,
  nom              VARCHAR(100),
  sexe             VARCHAR(10) NOT NULL CHECK (sexe IN ('male','femelle','inconnu')),
  race             VARCHAR(100),
  date_naissance   DATE,
  couleur          VARCHAR(50),
  origine          VARCHAR(50) CHECK (origine IN ('né ici','acheté','importé')),
  pere_id          UUID REFERENCES pigeons(id),
  mere_id          UUID REFERENCES pigeons(id),
  couple_actif_id  UUID,
  cage_actuelle_id UUID REFERENCES cages(id),
  statut           VARCHAR(20) DEFAULT 'actif' CHECK (statut IN ('actif','vendu','mort','perdu')),
  photo_url        TEXT,
  notes            TEXT,
  is_deleted       BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COUPLES
CREATE TABLE IF NOT EXISTS couples (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifiant     VARCHAR(50) UNIQUE,
  male_id         UUID NOT NULL REFERENCES pigeons(id),
  femelle_id      UUID NOT NULL REFERENCES pigeons(id),
  date_formation  DATE NOT NULL,
  date_separation DATE,
  cage_id         UUID REFERENCES cages(id),
  statut          VARCHAR(20) DEFAULT 'actif' CHECK (statut IN ('actif','separé')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Ajouter les FK manquantes sur cages
ALTER TABLE cages ADD CONSTRAINT fk_cages_pigeon
  FOREIGN KEY (pigeon_id) REFERENCES pigeons(id);
ALTER TABLE cages ADD CONSTRAINT fk_cages_couple
  FOREIGN KEY (couple_id) REFERENCES couples(id);

-- Ajouter FK couple_actif_id sur pigeons
ALTER TABLE pigeons ADD CONSTRAINT fk_pigeons_couple_actif
  FOREIGN KEY (couple_actif_id) REFERENCES couples(id);

-- 6. REPRODUCTIONS
CREATE TABLE IF NOT EXISTS reproductions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id      UUID NOT NULL REFERENCES couples(id),
  male_id        UUID NOT NULL REFERENCES pigeons(id),
  femelle_id     UUID NOT NULL REFERENCES pigeons(id),
  date_ponte     DATE,
  date_eclosion  DATE,
  nombre_oeufs   INT DEFAULT 0,
  nombre_nes     INT DEFAULT 0,
  statut         VARCHAR(20) DEFAULT 'en_cours' CHECK (statut IN ('en_cours','terminee','echouee')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SORTIES
CREATE TABLE IF NOT EXISTS sorties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pigeon_id       UUID NOT NULL REFERENCES pigeons(id),
  type            VARCHAR(20) NOT NULL CHECK (type IN ('vente','deces','perte')),
  date            DATE NOT NULL,
  prix            DECIMAL(10,2),
  acheteur        VARCHAR(150),
  cause_probable  VARCHAR(255),
  circonstance    VARCHAR(255),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CAGE HISTORIQUE
CREATE TABLE IF NOT EXISTS cage_historique (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cage_id    UUID NOT NULL REFERENCES cages(id),
  action     VARCHAR(100) NOT NULL,
  pigeon_id  UUID REFERENCES pigeons(id),
  couple_id  UUID REFERENCES couples(id),
  date       TIMESTAMPTZ DEFAULT NOW(),
  note       TEXT
);

-- 9. INDEXES pour les performances
CREATE INDEX IF NOT EXISTS idx_pigeons_statut        ON pigeons(statut);
CREATE INDEX IF NOT EXISTS idx_pigeons_sexe          ON pigeons(sexe);
CREATE INDEX IF NOT EXISTS idx_pigeons_is_deleted    ON pigeons(is_deleted);
CREATE INDEX IF NOT EXISTS idx_cages_voliere         ON cages(voliere);
CREATE INDEX IF NOT EXISTS idx_cages_statut          ON cages(statut);
CREATE INDEX IF NOT EXISTS idx_couples_statut        ON couples(statut);
CREATE INDEX IF NOT EXISTS idx_sorties_type          ON sorties(type);
-- Mise à jour de la contrainte sexe pour permettre 'inconnu' (pigeonneaux non sexés)
ALTER TABLE pigeons DROP CONSTRAINT IF EXISTS pigeons_sexe_check;
ALTER TABLE pigeons ADD CONSTRAINT pigeons_sexe_check CHECK (sexe IN ('male','femelle','inconnu'));

CREATE INDEX IF NOT EXISTS idx_cage_historique_cage  ON cage_historique(cage_id);

-- 10. DONNÉES DE TEST (cages volière A)
INSERT INTO cages (numero, voliere) VALUES
  ('A01','Volière A'),('A02','Volière A'),('A03','Volière A'),
  ('A04','Volière A'),('A05','Volière A'),('A06','Volière A'),
  ('A07','Volière A'),('A08','Volière A'),('A09','Volière A'),
  ('A10','Volière A'),('A11','Volière A'),('A12','Volière A'),
  ('A13','Volière A'),('A14','Volière A'),('A15','Volière A'),
  ('A16','Volière A'),('A17','Volière A'),('A18','Volière A'),
  ('A19','Volière A'),('A20','Volière A'),
  ('B01','Volière B'),('B02','Volière B'),('B03','Volière B'),
  ('B04','Volière B'),('B05','Volière B'),('B06','Volière B'),
  ('B07','Volière B'),('B08','Volière B'),('B09','Volière B'),
  ('B10','Volière B')
ON CONFLICT (numero) DO NOTHING;
