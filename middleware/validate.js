import Joi from 'joi';

/**
 * Factory : retourne un middleware Express qui valide req.body avec le schéma Joi fourni
 * @param {Joi.Schema} schema
 */
export const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({
      message: 'Données invalides',
      details: error.details.map((d) => d.message),
    });
  }
  req.body = value; // données nettoyées et validées
  next();
};

// ── Schémas Joi ─────────────────────────────────────────────

export const schemas = {
  register: Joi.object({
    email:    Joi.string().email().required().messages({ 'string.email': 'Email invalide' }),
    password: Joi.string().min(6).required().messages({ 'string.min': 'Mot de passe min 6 caractères' }),
    nom:      Joi.string().max(100).optional(),
  }),

  login: Joi.object({
    email:    Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  pigeon: Joi.object({
    bague:           Joi.string().min(3).max(50).required(),
    nom:             Joi.string().max(100).optional().allow(''),
    sexe:            Joi.string().valid('male', 'femelle').required(),
    race:            Joi.string().max(100).optional().allow(''),
    date_naissance:  Joi.date().iso().optional().allow(null),
    couleur:         Joi.string().max(50).optional().allow(''),
    origine:         Joi.string().valid('né ici', 'acheté', 'importé').optional(),
    pere_id:         Joi.string().uuid().optional().allow(null),
    mere_id:         Joi.string().uuid().optional().allow(null),
    cage_actuelle_id:Joi.string().uuid().optional().allow(null),
    photo_url:       Joi.string().uri().optional().allow(null, ''),
    notes:           Joi.string().max(1000).optional().allow(''),
  }),

  couple: Joi.object({
    male_id:        Joi.string().uuid().required(),
    femelle_id:     Joi.string().uuid().required(),
    date_formation: Joi.date().iso().required(),
    cage_id:        Joi.string().uuid().optional().allow(null),
    notes:          Joi.string().max(1000).optional().allow(''),
  }),

  affecterCage: Joi.object({
    pigeon_id: Joi.string().uuid().optional().allow(null),
    couple_id: Joi.string().uuid().optional().allow(null),
  }).or('pigeon_id', 'couple_id'), // au moins l'un des deux

  reproduction: Joi.object({
    couple_id:     Joi.string().uuid().optional(),
    date_ponte:    Joi.date().iso().optional().allow(null, ''),
    date_eclosion: Joi.date().iso().optional().allow(null, ''),
    nombre_oeufs:  Joi.number().integer().min(0).max(10).default(0),
    nombre_nes:    Joi.number().integer().min(0).max(10).optional().allow(null, ''),
    notes:         Joi.string().max(1000).optional().allow(null, ''),
    statut:        Joi.string().valid('en_cours', 'terminee', 'echouee').optional(),
    bagues_pigeonneaux: Joi.array().items(Joi.string().allow('', null)).optional(),
  }),

  sortie: Joi.object({
    pigeon_id:      Joi.string().uuid().required(),
    type:           Joi.string().valid('vente', 'deces', 'perte').required(),
    date:           Joi.date().iso().required(),
    prix:           Joi.number().positive().optional().allow(null),
    acheteur:       Joi.string().max(150).optional().allow('', null),
    cause_probable: Joi.string().max(255).optional().allow('', null),
    circonstance:   Joi.string().max(255).optional().allow('', null),
    notes:          Joi.string().max(1000).optional().allow(''),
  }),
};
