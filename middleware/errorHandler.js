/**
 * Middleware de gestion centralisée des erreurs
 * Doit être enregistré APRÈS toutes les routes dans index.js
 */
export const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ❌ ${err.stack || err.message}`);

  // Erreurs de validation Joi
  if (err.isJoi) {
    return res.status(400).json({
      message: 'Données invalides',
      details: err.details.map((d) => d.message),
    });
  }

  // Erreurs Supabase (contraintes DB)
  if (err.code === '23505') {
    return res.status(409).json({ message: 'Cette entrée existe déjà (doublon)' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ message: 'Référence invalide (clé étrangère)' });
  }

  // Erreur générique
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Wrapper async pour éviter les try/catch répétitifs dans les controllers
 * Usage : router.get('/', asyncHandler(controller.getAll))
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
