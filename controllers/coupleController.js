import { supabase } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { canFormCouple, isPigeonAvailableForCouple } from '../utils/validators.js';

// ── GET /api/couples ─────────────────────────────────────────
export const getCouples = asyncHandler(async (req, res) => {
  const { statut } = req.query;

  let query = supabase
    .from('couples')
    .select(`
      *,
      male:pigeons!male_id(id, bague, nom, race, photo_url),
      femelle:pigeons!femelle_id(id, bague, nom, race, photo_url),
      cage:cages!cage_id(id, numero, voliere)
    `)
    .order('date_formation', { ascending: false });

  if (statut) query = query.eq('statut', statut);

  const { data, error } = await query;
  if (error) throw error;
  res.json(data);
});

// ── GET /api/couples/:id ─────────────────────────────────────
export const getCoupleById = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('couples')
    .select(`
      *,
      male:pigeons!male_id(*),
      femelle:pigeons!femelle_id(*),
      cage:cages!cage_id(id, numero, voliere),
      reproductions(*)
    `)
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ message: 'Couple non trouvé' });
  res.json(data);
});

// ── POST /api/couples ────────────────────────────────────────
export const createCouple = asyncHandler(async (req, res) => {
  const { male_id, femelle_id, date_formation, cage_id, notes } = req.body;

  // Récupérer les deux pigeons
  const { data: pigeons } = await supabase
    .from('pigeons')
    .select('id, sexe, statut, couple_actif_id')
    .in('id', [male_id, femelle_id]);

  if (!pigeons || pigeons.length !== 2) {
    return res.status(404).json({ message: 'Un ou les deux pigeons sont introuvables' });
  }

  const male    = pigeons.find((p) => p.id === male_id);
  const femelle = pigeons.find((p) => p.id === femelle_id);

  // Valider les règles métier
  if (!canFormCouple(male, femelle)) {
    return res.status(400).json({ message: 'Un couple doit être composé d\'un mâle et d\'une femelle' });
  }
  if (!isPigeonAvailableForCouple(male)) {
    return res.status(400).json({ message: `Le mâle (${male_id}) est déjà en couple ou inactif` });
  }
  if (!isPigeonAvailableForCouple(femelle)) {
    return res.status(400).json({ message: `La femelle (${femelle_id}) est déjà en couple ou inactive` });
  }

  // Générer un identifiant unique (ex: Couple 001)
  const { count } = await supabase.from('couples').select('*', { count: 'exact', head: true });
  const identifiant = `Couple ${String((count || 0) + 1).padStart(3, '0')}`;

  // Créer le couple
  const { data: couple, error } = await supabase
    .from('couples')
    .insert({ identifiant, male_id, femelle_id, date_formation, cage_id: cage_id || null, notes })
    .select()
    .single();

  if (error) throw error;

  // Marquer les pigeons comme en couple et mettre à jour leur cage actuelle
  await supabase.from('pigeons')
    .update({ 
      couple_actif_id: couple.id, 
      cage_actuelle_id: cage_id || null, 
      updated_at: new Date().toISOString() 
    })
    .in('id', [male_id, femelle_id]);

  // Libérer les anciennes cages si les pigeons y étaient seuls
  const oldCages = [male.cage_actuelle_id, femelle.cage_actuelle_id].filter(Boolean);
  if (oldCages.length > 0) {
    const uniqueOldCages = [...new Set(oldCages)];
    for (const oldCageId of uniqueOldCages) {
      if (oldCageId !== cage_id) {
        await supabase.from('cages')
          .update({ statut: 'libre', pigeon_id: null, couple_id: null, updated_at: new Date().toISOString() })
          .eq('id', oldCageId);
        await supabase.from('cage_historique')
          .insert({ cage_id: oldCageId, action: 'Pigeon retiré (formation de couple)' });
        req.app.get('io')?.emit('cage:updated', { cageId: oldCageId, statut: 'libre' });
      }
    }
  }

  // Si une cage est assignée, l'occuper avec le nouveau couple
  if (cage_id) {
    await supabase.from('cages')
      .update({ statut: 'couple', couple_id: couple.id, pigeon_id: null, updated_at: new Date().toISOString() })
      .eq('id', cage_id);
    await supabase.from('cage_historique')
      .insert({ cage_id, action: 'Nouveau couple affecté', couple_id: couple.id });
    req.app.get('io')?.emit('cage:updated', { cageId: cage_id, statut: 'couple' });
  }

  res.status(201).json(couple);
});

// ── PUT /api/couples/:id/separer ─────────────────────────────
export const separerCouple = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: couple } = await supabase
    .from('couples').select('*').eq('id', id).single();

  if (!couple) return res.status(404).json({ message: 'Couple non trouvé' });
  if (couple.statut === 'separé') return res.status(400).json({ message: 'Ce couple est déjà séparé' });

  // Séparer
  await supabase.from('couples')
    .update({ statut: 'separé', date_separation: new Date().toISOString(), cage_id: null })
    .eq('id', id);

  // Libérer les pigeons (ils perdent aussi leur cage de couple)
  await supabase.from('pigeons')
    .update({ couple_actif_id: null, cage_actuelle_id: null, updated_at: new Date().toISOString() })
    .in('id', [couple.male_id, couple.femelle_id]);

  // Libérer la cage si assignée
  if (couple.cage_id) {
    await supabase.from('cages')
      .update({ statut: 'libre', couple_id: null, updated_at: new Date().toISOString() })
      .eq('id', couple.cage_id);
    await supabase.from('cage_historique')
      .insert({ cage_id: couple.cage_id, action: 'Couple séparé — cage libérée', couple_id: id });
    req.app.get('io')?.emit('cage:updated', { cageId: couple.cage_id, statut: 'libre' });
  }

  res.json({ message: 'Couple séparé avec succès' });
});
