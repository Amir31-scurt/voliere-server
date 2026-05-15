import dotenv from 'dotenv';
dotenv.config();
import { supabase } from './config/supabase.js';

async function test() {
  const { data, error } = await supabase
    .from('couples')
    .select(`
      *,
      male:pigeons!male_id(id, bague, nom, race, photo_url),
      femelle:pigeons!femelle_id(id, bague, nom, race, photo_url),
      cage:cages!cage_id(id, numero, voliere)
    `)
    .order('date_formation', { ascending: false });
    
  if (error) console.log('ERROR:', error);
  else console.log('SUCCESS:', data);
  process.exit();
}
test();
