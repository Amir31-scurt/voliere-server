import { supabase } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// ── GET /api/sorties ─────────────────────────────────────────
export const getSorties = asyncHandler(async (req, res) => {
  const { type, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('sorties')
    .select('*, pigeon:pigeons!pigeon_id(id, bague, nom, sexe, race)', { count: 'exact' })
    .order('date', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (type) query = query.eq('type', type);

  const { data, error, count } = await query;
  if (error) throw error;
  res.json({ data, total: count, page: Number(page), limit: Number(limit) });
});

// ── POST /api/sorties ────────────────────────────────────────
export const createSortie = asyncHandler(async (req, res) => {
  const { pigeon_id, type } = req.body;

  // Vérifier que le pigeon existe et est actif
  const { data: pigeon } = await supabase
    .from('pigeons')
    .select('id, statut, cage_actuelle_id, couple_actif_id')
    .eq('id', pigeon_id)
    .single();

  if (!pigeon) return res.status(404).json({ message: 'Pigeon non trouvé' });
  if (pigeon.statut !== 'actif') {
    return res.status(400).json({ message: 'Ce pigeon est déjà sorti (vendu, mort ou perdu)' });
  }

  // Créer la sortie
  const { data: sortie, error } = await supabase
    .from('sorties')
    .insert(req.body)
    .select()
    .single();

  if (error) throw error;

  // Mettre à jour le statut du pigeon
  const newStatut = type === 'vente' ? 'vendu' : type === 'deces' ? 'mort' : 'perdu';
  await supabase.from('pigeons').update({
    statut: newStatut,
    cage_actuelle_id: null,
    couple_actif_id: null,
    updated_at: new Date().toISOString(),
  }).eq('id', pigeon_id);

  // Libérer la cage si occupée
  if (pigeon.cage_actuelle_id) {
    await supabase.from('cages').update({
      statut: 'libre', pigeon_id: null, updated_at: new Date().toISOString(),
    }).eq('id', pigeon.cage_actuelle_id);

    await supabase.from('cage_historique').insert({
      cage_id: pigeon.cage_actuelle_id,
      action: `Pigeon sorti (${type}) — cage libérée automatiquement`,
      pigeon_id,
    });
    req.app.get('io')?.emit('cage:updated', { cageId: pigeon.cage_actuelle_id, statut: 'libre' });
  }

  // Séparer le couple si en couple actif
  if (pigeon.couple_actif_id) {
    await supabase.from('couples').update({
      statut: 'separé', date_separation: new Date().toISOString(),
    }).eq('id', pigeon.couple_actif_id);

    // Libérer l'autre pigeon du couple
    await supabase.from('pigeons').update({ couple_actif_id: null })
      .eq('couple_actif_id', pigeon.couple_actif_id)
      .neq('id', pigeon_id);
  }

  res.status(201).json(sortie);
});

// ── GET /api/sorties/:id ─────────────────────────────────────
export const getSortieById = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('sorties')
    .select('*, pigeon:pigeons!pigeon_id(*)')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ message: 'Sortie non trouvée' });
  res.json(data);
});
