import { Router } from 'express';
import * as ctrl from '../controllers/sortieController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validate.js';

const router = Router();
router.use(authMiddleware);

router.get('/',      ctrl.getSorties);
router.post('/',     validate(schemas.sortie), ctrl.createSortie);
router.get('/:id',   ctrl.getSortieById);

export default router;
