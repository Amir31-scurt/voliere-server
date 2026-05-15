import swaggerJsdoc from 'swagger-jsdoc';

const PORT = process.env.PORT || 4000;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '🕊️ Volière API',
      version: '1.0.0',
      description: 'API REST — Application de gestion de volière de pigeons voyageurs (DTS Bakeli)',
      contact: { name: 'Bakeli School of Technology', email: 'contact@bakeli.tech' },
    },
    servers: [
      { url: `http://localhost:${PORT}/api`, description: 'Développement local' },
      { url: 'https://voliere-api.onrender.com/api', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Pigeon: {
          type: 'object',
          required: ['bague', 'sexe'],
          properties: {
            id:              { type: 'string', format: 'uuid' },
            bague:           { type: 'string', example: 'SN-2024-001' },
            nom:             { type: 'string', example: 'Sultan' },
            sexe:            { type: 'string', enum: ['male', 'femelle'] },
            race:            { type: 'string', example: 'Voyageur' },
            date_naissance:  { type: 'string', format: 'date' },
            couleur:         { type: 'string' },
            origine:         { type: 'string', enum: ["né ici", "acheté", "importé"] },
            statut:          { type: 'string', enum: ['actif', 'vendu', 'mort', 'perdu'] },
            photo_url:       { type: 'string', format: 'uri', nullable: true },
            is_deleted:      { type: 'boolean', default: false },
          },
        },
        Cage: {
          type: 'object',
          properties: {
            id:        { type: 'string', format: 'uuid' },
            numero:    { type: 'string', example: 'A01' },
            voliere:   { type: 'string', example: 'Volière A' },
            statut:    { type: 'string', enum: ['libre', 'pigeon', 'couple'] },
            pigeon_id: { type: 'string', format: 'uuid', nullable: true },
            couple_id: { type: 'string', format: 'uuid', nullable: true },
          },
        },
        Couple: {
          type: 'object',
          properties: {
            id:             { type: 'string', format: 'uuid' },
            male_id:        { type: 'string', format: 'uuid' },
            femelle_id:     { type: 'string', format: 'uuid' },
            date_formation: { type: 'string', format: 'date' },
            date_separation:{ type: 'string', format: 'date', nullable: true },
            statut:         { type: 'string', enum: ['actif', 'separé'] },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            details: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
