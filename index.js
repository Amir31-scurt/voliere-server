import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './docs/swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initCageSocket } from './socket/cageSocket.js';

import authRoutes         from './routes/authRoutes.js';
import pigeonRoutes       from './routes/pigeonRoutes.js';
import coupleRoutes       from './routes/coupleRoutes.js';
import cageRoutes         from './routes/cageRoutes.js';
import reproductionRoutes from './routes/reproductionRoutes.js';
import sortieRoutes       from './routes/sortieRoutes.js';

// ── Serveur & Configuration CORS ─────────────────────────────
const app    = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  'https://voliere-app.vercel.app'
];

// ── Socket.IO ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
app.set('io', io); // accessible via req.app.get('io') dans les controllers
initCageSocket(io);

// ── Sécurité globale ─────────────────────────────────────────
app.use(helmet()); // Headers HTTP sécurisés

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Rate limiting global — 200 req / 15 min par IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de requêtes, réessayez dans 15 minutes' },
});
app.use('/api', globalLimiter);

// Rate limiting strict sur l'auth — 10 tentatives / 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Trop de tentatives de connexion, réessayez dans 15 minutes' },
});
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Documentation Swagger ────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: '🕊️ Volière API Docs',
  swaggerOptions: { persistAuthorization: true },
}));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// ── Routes API ───────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/pigeons',       pigeonRoutes);
app.use('/api/couples',       coupleRoutes);
app.use('/api/cages',         cageRoutes);
app.use('/api/reproductions', reproductionRoutes);
app.use('/api/sorties',       sortieRoutes);

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  env: process.env.NODE_ENV,
}));

// ── 404 handler ──────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Route non trouvée' }));

// ── Error handler (doit être APRÈS toutes les routes) ────────
app.use(errorHandler);

// ── Démarrage ────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📚 Swagger UI      : http://localhost:${PORT}/api-docs`);
  console.log(`💚 Health check    : http://localhost:${PORT}/health`);
  console.log(`🌍 Environnement   : ${process.env.NODE_ENV || 'development'}\n`);
});
