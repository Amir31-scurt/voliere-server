import { Router } from 'express';
import * as ctrl from '../controllers/reproductionController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validate.js';

const router = Router();
router.use(authMiddleware);

router.get('/',      ctrl.getReproductions);
router.post('/',     validate(schemas.reproduction), ctrl.createReproduction);
router.get('/:id',   ctrl.getReproductionById);
router.put('/:id',   validate(schemas.reproduction), ctrl.updateReproduction);
router.delete('/:id',ctrl.deleteReproduction);

export default router;
