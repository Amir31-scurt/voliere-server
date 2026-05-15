import { supabase } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { isCageFree } from '../utils/validators.js';

// ── GET /api/cages?voliere=Volière A ────────────────────────
export const getCages = asyncHandler(async (req, res) => {
  const { voliere } = req.query;

  let query = supabase
    .from('cages')
    .select(`
      *,
      pigeon:pigeons!pigeon_id(id, bague, nom, sexe, race, photo_url),
      couple:couples!couple_id(
        id,
        identifiant,
        date_formation,
        male:pigeons!male_id(id, bague, nom, sexe, photo_url),
        femelle:pigeons!femelle_id(id, bague, nom, sexe, photo_url),
        reproductions(*)
      )
    `)
    .order('numero');

  if (voliere) query = query.eq('voliere', voliere);

  const { data, error } = await query;
  if (error) throw error;
  res.json(data);
});

// ── GET /api/cages/:id ───────────────────────────────────────
export const getCageById = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('cages')
    .select(`
      *,
      pigeon:pigeons!pigeon_id(id, bague, nom, sexe, race, photo_url),
      couple:couples!couple_id(id, identifiant, date_formation, male:pigeons!male_id(*), femelle:pigeons!femelle_id(*), reproductions(*))
    `)
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ message: 'Cage non trouvée' });
  res.json(data);
});

// ── POST /api/cages ──────────────────────────────────────────
export const createCage = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('cages')
    .insert(req.body)
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
});

// ── PUT /api/cages/:id ───────────────────────────────────────
export const updateCage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: existing } = await supabase.from('cages').select('id').eq('id', id).single();
  if (!existing) return res.status(404).json({ message: 'Cage non trouvée' });

  const { data, error } = await supabase
    .from('cages')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  res.json(data);
});

// ── DELETE /api/cages/:id ────────────────────────────────────
export const deleteCage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: cage } = await supabase.from('cages').select('statut').eq('id', id).single();
  if (!cage) return res.status(404).json({ message: 'Cage non trouvée' });

  if (cage.statut !== 'libre') {
    return res.status(400).json({ message: 'Impossible de supprimer une cage occupée. Libérez-la d\'abord.' });
  }

  const { error } = await supabase.from('cages').delete().eq('id', id);
  if (error) throw error;
  res.json({ message: 'Cage supprimée avec succès' });
});

// ── PUT /api/cages/:id/affecter ──────────────────────────────
export const affecterCage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { pigeon_id, couple_id } = req.body;

  // 1. Vérifier que la cage existe et est libre
  const { data: cage, error: cageErr } = await supabase
    .from('cages').select('*').eq('id', id).single();

  if (cageErr || !cage) return res.status(404).json({ message: 'Cage non trouvée' });
  if (!isCageFree(cage)) {
    return res.status(400).json({ message: `Cage déjà occupée (statut: ${cage.statut})` });
  }

  // 2. Affectation
  let updatePayload;
  if (pigeon_id) {
    // Vérifier le pigeon
    const { data: pigeon } = await supabase
      .from('pigeons').select('id, statut, cage_actuelle_id').eq('id', pigeon_id).single();
    if (!pigeon) return res.status(404).json({ message: 'Pigeon non trouvé' });
    if (pigeon.statut !== 'actif') return res.status(400).json({ message: 'Ce pigeon n\'est plus actif' });
    if (pigeon.cage_actuelle_id) return res.status(400).json({ message: 'Ce pigeon est déjà dans une cage' });

    updatePayload = { statut: 'pigeon', pigeon_id, couple_id: null };
    // Mettre à jour le pigeon
    await supabase.from('pigeons').update({ cage_actuelle_id: id, updated_at: new Date().toISOString() }).eq('id', pigeon_id);

  } else if (couple_id) {
    const { data: couple } = await supabase
      .from('couples').select('id, statut, cage_id').eq('id', couple_id).single();
    if (!couple) return res.status(404).json({ message: 'Couple non trouvé' });
    if (couple.statut !== 'actif') return res.status(400).json({ message: 'Ce couple n\'est plus actif' });
    if (couple.cage_id) return res.status(400).json({ message: 'Ce couple est déjà dans une cage' });

    updatePayload = { statut: 'couple', couple_id, pigeon_id: null };
    await supabase.from('couples').update({ cage_id: id }).eq('id', couple_id);
  }

  const { data: updated, error } = await supabase
    .from('cages')
    .update({ ...updatePayload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // 3. Historique + Socket.IO
  await supabase.from('cage_historique').insert({
    cage_id: id,
    action: pigeon_id ? 'Pigeon affecté' : 'Couple affecté',
    pigeon_id: pigeon_id || null,
    couple_id: couple_id || null,
  });

  req.app.get('io')?.emit('cage:updated', { cageId: id, statut: updated.statut });
  res.json(updated);
});

// ── PUT /api/cages/:id/liberer ───────────────────────────────
export const libererCage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: cage } = await supabase.from('cages').select('*').eq('id', id).single();
  if (!cage) return res.status(404).json({ message: 'Cage non trouvée' });
  if (cage.statut === 'libre') return res.status(400).json({ message: 'La cage est déjà libre' });

  // Libérer le pigeon ou couple
  if (cage.pigeon_id) {
    await supabase.from('pigeons')
      .update({ cage_actuelle_id: null, updated_at: new Date().toISOString() })
      .eq('id', cage.pigeon_id);
  }
  if (cage.couple_id) {
    await supabase.from('couples').update({ cage_id: null }).eq('id', cage.couple_id);
  }

  const { data: updated, error } = await supabase
    .from('cages')
    .update({ statut: 'libre', pigeon_id: null, couple_id: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await supabase.from('cage_historique').insert({ cage_id: id, action: 'Cage libérée' });
  req.app.get('io')?.emit('cage:updated', { cageId: id, statut: 'libre' });
  res.json(updated);
});

// ── GET /api/cages/:id/historique ───────────────────────────
export const getCageHistorique = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('cage_historique')
    .select('*, pigeon:pigeons!pigeon_id(id, bague, nom), couple:couples!couple_id(id)')
    .eq('cage_id', req.params.id)
    .order('date', { ascending: false })
    .limit(50);

  if (error) throw error;
  res.json(data);
});
