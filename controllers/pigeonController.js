import { supabase } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { isPigeonActive, pigeonHasChildren } from '../utils/validators.js';

// ── GET /api/pigeons ─────────────────────────────────────────
export const getPigeons = asyncHandler(async (req, res) => {
  const { statut, sexe, search, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('pigeons')
    .select('*, pere:pigeons!pere_id(id,bague,nom), mere:pigeons!mere_id(id,bague,nom)', { count: 'exact' })
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  if (statut)  query = query.eq('statut', statut);
  if (sexe)    query = query.eq('sexe', sexe);
  if (search)  query = query.ilike('bague', `%${search}%`);

  const { data, error, count } = await query;
  if (error) throw error;

  res.json({ data, total: count, page: Number(page), limit: Number(limit) });
});

// ── GET /api/pigeons/:id ─────────────────────────────────────
export const getPigeonById = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('pigeons')
    .select(`
      *,
      pere:pigeons!pere_id(id, bague, nom, race, sexe),
      mere:pigeons!mere_id(id, bague, nom, race, sexe),
      cage:cages!cage_actuelle_id(id, numero, voliere)
    `)
    .eq('id', req.params.id)
    .eq('is_deleted', false)
    .single();

  if (error || !data) return res.status(404).json({ message: 'Pigeon non trouvé' });
  res.json(data);
});

// ── POST /api/pigeons ────────────────────────────────────────
export const createPigeon = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('pigeons')
    .insert(req.body)
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
});

// ── PUT /api/pigeons/:id ─────────────────────────────────────
export const updatePigeon = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: existing, error: findErr } = await supabase
    .from('pigeons').select('id').eq('id', id).eq('is_deleted', false).single();

  if (findErr || !existing) return res.status(404).json({ message: 'Pigeon non trouvé' });

  const { data, error } = await supabase
    .from('pigeons')
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  res.json(data);
});

// ── DELETE /api/pigeons/:id ──────────────────────────────────
export const deletePigeon = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Vérifier si le pigeon a des enfants → soft delete obligatoire
  const { data: allPigeons } = await supabase
    .from('pigeons')
    .select('id, pere_id, mere_id, is_deleted');

  const hasChildren = pigeonHasChildren(id, allPigeons || []);

  if (hasChildren) {
    // Soft delete
    await supabase
      .from('pigeons')
      .update({ is_deleted: true, statut: 'mort', updated_at: new Date().toISOString() })
      .eq('id', id);
    return res.json({ message: 'Pigeon archivé (a des descendants)' });
  }

  // Hard delete si aucun enfant
  const { error } = await supabase.from('pigeons').delete().eq('id', id);
  if (error) throw error;
  res.json({ message: 'Pigeon supprimé avec succès' });
});
