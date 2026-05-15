import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validate.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentification utilisateur
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Créer un compte
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               nom:      { type: string }
 *     responses:
 *       201: { description: Compte créé }
 *       409: { description: Email déjà utilisé }
 */
router.post('/register', validate(schemas.register), register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Se connecter
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Token JWT + user }
 *       401: { description: Identifiants incorrects }
 */
router.post('/login', validate(schemas.login), login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Récupérer le profil connecté
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Profil utilisateur }
 *       401: { description: Non authentifié }
 */
router.get('/me', authMiddleware, getMe);

export default router;
