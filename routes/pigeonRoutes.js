import { Router } from 'express';
import * as ctrl from '../controllers/pigeonController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validate.js';

const router = Router();
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Pigeons
 *   description: Gestion des pigeons
 */

/**
 * @swagger
 * /pigeons:
 *   get:
 *     summary: Lister les pigeons
 *     tags: [Pigeons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: statut
 *         schema: { type: string, enum: [actif, vendu, mort, perdu] }
 *       - in: query
 *         name: sexe
 *         schema: { type: string, enum: [male, femelle] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Recherche par bague
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Liste paginée de pigeons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:  { type: array, items: { $ref: '#/components/schemas/Pigeon' } }
 *                 total: { type: integer }
 *                 page:  { type: integer }
 *                 limit: { type: integer }
 *   post:
 *     summary: Ajouter un pigeon
 *     tags: [Pigeons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Pigeon' }
 *     responses:
 *       201: { description: Pigeon créé }
 *       400: { description: Données invalides }
 */
router.get('/',    ctrl.getPigeons);
router.post('/',   validate(schemas.pigeon), ctrl.createPigeon);

/**
 * @swagger
 * /pigeons/{id}:
 *   get:
 *     summary: Détail d'un pigeon
 *     tags: [Pigeons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Détail du pigeon }
 *       404: { description: Pigeon non trouvé }
 *   put:
 *     summary: Modifier un pigeon
 *     tags: [Pigeons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Pigeon' }
 *     responses:
 *       200: { description: Pigeon mis à jour }
 *   delete:
 *     summary: Supprimer un pigeon (soft delete si descendants)
 *     tags: [Pigeons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Pigeon supprimé ou archivé }
 */
router.get('/:id',    ctrl.getPigeonById);
router.put('/:id',    validate(schemas.pigeon), ctrl.updatePigeon);
router.delete('/:id', ctrl.deletePigeon);

export default router;
