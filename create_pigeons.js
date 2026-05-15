import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './config/supabase.js';

async function seedPigeons() {
  const pigeons = [
    {
      bague: 'SN-2024-001',
      nom: 'Apollo',
      sexe: 'male',
      race: 'Voyageur',
      couleur: 'Bleu barré',
      origine: 'né ici',
      statut: 'actif'
    },
    {
      bague: 'SN-2024-002',
      nom: 'Athena',
      sexe: 'femelle',
      race: 'Voyageur',
      couleur: 'Blanc',
      origine: 'acheté',
      statut: 'actif'
    },
    {
      bague: 'SN-2023-089',
      nom: 'Zeus',
      sexe: 'male',
      race: 'Mondain',
      couleur: 'Noir',
      origine: 'importé',
      statut: 'actif'
    }
  ];

  console.log('Création de 3 pigeons de test...');
  
  const { data, error } = await supabase
    .from('pigeons')
    .insert(pigeons)
    .select();

  if (error) {
    console.error('Erreur:', error.message);
  } else {
    console.log('Pigeons créés avec succès !', data.map(p => p.bague));
  }
  process.exit();
}

seedPigeons();
