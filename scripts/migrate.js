/**
 * Script de migration — Application Volière
 * Exécute all_migrations.sql directement via l'API Supabase Management
 *
 * Usage : node scripts/migrate.js
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env');
  process.exit(1);
}

// Extraire le project ref depuis l'URL (ex: cdfozmseedljrgdfrfkk)
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];

// Lire le fichier SQL
const sqlPath = join(__dirname, '..', 'supabase', 'migrations', 'all_migrations.sql');
const sql = readFileSync(sqlPath, 'utf-8');

console.log('🔄 Connexion à Supabase...');
console.log(`📡 Projet : ${projectRef}`);

async function runMigration() {
  // Tentative via l'API Management de Supabase
  const apiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) {
    const data = await res.json();
    console.log('✅ Migration exécutée avec succès !', data);
    return;
  }

  const errText = await res.text();
  console.warn(`⚠️  API Management non accessible (${res.status}): ${errText}`);
  console.log('\n📋 Exécutez manuellement ce SQL dans le Supabase SQL Editor :');
  console.log(`👉 https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);

  // Afficher le SQL découpé en blocs pour faciliter la lecture
  console.log('--- DÉBUT SQL ---');
  console.log(sql);
  console.log('--- FIN SQL ---');
}

runMigration().catch((err) => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});
