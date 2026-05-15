import { supabase } from '../config/supabase.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// ── GET /api/reproductions ───────────────────────────────────
export const getReproductions = asyncHandler(async (req, res) => {
  const { couple_id } = req.query;

  let query = supabase
    .from('reproductions')
    .select(`
      *,
      couple:couples(id, identifiant),
      male:pigeons!male_id(id, bague, nom),
      femelle:pigeons!femelle_id(id, bague, nom)
    `)
    .order('created_at', { ascending: false });

  if (couple_id) query = query.eq('couple_id', couple_id);

  const { data, error } = await query;
  if (error) throw error;
  res.json(data);
});

// ── GET /api/reproductions/:id ───────────────────────────────
export const getReproductionById = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('reproductions')
    .select(`
      *,
      couple:couples(id, identifiant),
      male:pigeons!male_id(*),
      femelle:pigeons!femelle_id(*)
    `)
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ message: 'Reproduction non trouvée' });
  res.json(data);
});

// ── POST /api/reproductions ──────────────────────────────────
export const createReproduction = asyncHandler(async (req, res) => {
  const { couple_id } = req.body;

  // Vérifier que le couple existe et est actif
  const { data: couple } = await supabase
    .from('couples')
    .select('id, statut, male_id, femelle_id')
    .eq('id', couple_id)
    .single();

  if (!couple) return res.status(404).json({ message: 'Couple non trouvé' });
  if (couple.statut !== 'actif') {
    return res.status(400).json({ message: 'Impossible d\'enregistrer une reproduction pour un couple séparé' });
  }

  const insertPayload = {
    ...req.body,
    male_id: couple.male_id,
    femelle_id: couple.femelle_id,
  };

  const { data, error } = await supabase
    .from('reproductions')
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw error;
  res.status(201).json(data);
});

// ── PUT /api/reproductions/:id ───────────────────────────────
export const updateReproduction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { statut, nombre_nes, bagues_pigeonneaux, noms_pigeonneaux, sexes_pigeonneaux } = req.body;
  const nbNes = Number(nombre_nes) || 0;

  const { data: existing } = await supabase
    .from('reproductions').select('*').eq('id', id).single();
  
  if (!existing) return res.status(404).json({ message: 'Reproduction non trouvée' });

  // Strip fields that are NOT in the reproductions table
  const updatePayload = { ...req.body };
  delete updatePayload.bagues_pigeonneaux;
  delete updatePayload.noms_pigeonneaux;
  delete updatePayload.sexes_pigeonneaux;
  if (nombre_nes !== undefined) updatePayload.nombre_nes = nbNes;

  // Update the reproduction row
  const { data, error } = await supabase
    .from('reproductions')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[reproductionController] Update error:', error);
    throw error;
  }

  // Auto-create squabs if transitioning to terminee with survivors
  if (existing.statut !== 'terminee' && statut === 'terminee' && nbNes > 0) {
    console.log(`[reproductionController] Creating ${nbNes} squab(s) for repro ${id}, couple_id=${existing.couple_id}`);

    if (!existing.couple_id) {
      console.warn('[reproductionController] No couple_id on reproduction — cannot create squabs');
    } else {
      const { data: couple, error: coupleErr } = await supabase
        .from('couples')
        .select('male_id, femelle_id, male:pigeons!male_id(race), femelle:pigeons!femelle_id(race)')
        .eq('id', existing.couple_id)
        .single();

      if (coupleErr || !couple) {
        console.error('[reproductionController] Couple fetch error:', coupleErr);
      } else {
        // Race logic: same race → inherit, different → Métissé, one unknown → use the other
        const raceM = couple.male?.race?.trim() || null;
        const raceF = couple.femelle?.race?.trim() || null;
        let raceEnfant = null;
        if (raceM && raceF) {
          raceEnfant = raceM.toLowerCase() === raceF.toLowerCase()
            ? raceM
            : `Métissé (${raceM} × ${raceF})`;
        } else {
          raceEnfant = raceM || raceF || null;
        }

        const pigeonsToCreate = Array.from({ length: nbNes }).map((_, i) => {
          const bagueFournie = bagues_pigeonneaux?.[i];
          const bague = (bagueFournie && String(bagueFournie).trim() !== '')
            ? bagueFournie
            : `PIJ-${id.slice(0, 5).toUpperCase()}-${String(i + 1).padStart(2, '0')}`;

          return {
            bague,
            nom:     noms_pigeonneaux?.[i]?.trim()  || `Pigeonneau ${i + 1}`,
            sexe:    sexes_pigeonneaux?.[i]          || 'inconnu',
            race:    raceEnfant,
            statut:  'actif',
            origine: 'Élevage',
            pere_id: couple.male_id,
            mere_id: couple.femelle_id,
            cage_actuelle_id: null,
            date_naissance: existing.date_eclosion || new Date().toISOString(),
          };
        });

        console.log('[reproductionController] Pigeons to create:', pigeonsToCreate);

        const { error: insertErr } = await supabase.from('pigeons').insert(pigeonsToCreate);
        if (insertErr) {
          console.error('[reproductionController] Pigeon insert error:', insertErr);
        } else {
          console.log(`[reproductionController] Successfully created ${nbNes} squab(s)`);
        }
      }
    }
  }

  res.json(data);
});

// ── DELETE /api/reproductions/:id ────────────────────────────
export const deleteReproduction = asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('reproductions')
    .delete()
    .eq('id', req.params.id);

  if (error) throw error;
  res.json({ message: 'Reproduction supprimée' });
});
