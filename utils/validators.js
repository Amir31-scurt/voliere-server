/**
 * Règles métier côté serveur — Application Volière
 */

// Règle 1 : Un couple doit être mâle + femelle
export const canFormCouple = (pigeon1, pigeon2) =>
  pigeon1.sexe !== pigeon2.sexe;

// Règle 2 : Un pigeon ne peut appartenir qu'à un seul couple actif
export const isPigeonAvailableForCouple = (pigeon) =>
  pigeon.statut === 'actif' && !pigeon.couple_actif_id;

// Règle 3 : Une cage ne peut contenir qu'un seul pigeon ou couple
export const isCageFree = (cage) =>
  cage.statut === 'libre';

// Règle 4 : Un pigeon sorti ne peut plus être affecté
export const isPigeonActive = (pigeon) =>
  pigeon.statut === 'actif' && !pigeon.is_deleted;

// Règle 5 : Vérifier qu'un pigeon n'a pas d'enfants (pour soft delete)
export const pigeonHasChildren = (pigeonId, allPigeons) =>
  allPigeons.some(
    (p) => (p.pere_id === pigeonId || p.mere_id === pigeonId) && !p.is_deleted
  );
