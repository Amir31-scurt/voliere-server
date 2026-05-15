import { Router } from 'express';
import * as ctrl from '../controllers/cageController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validate.js';

const router = Router();
router.use(authMiddleware);

router.get('/',                     ctrl.getCages);
router.post('/',                    ctrl.createCage);
router.get('/:id',                  ctrl.getCageById);
router.put('/:id',                  ctrl.updateCage);
router.delete('/:id',               ctrl.deleteCage);
router.put('/:id/affecter',         validate(schemas.affecterCage), ctrl.affecterCage);
router.put('/:id/liberer',          ctrl.libererCage);
router.get('/:id/historique',       ctrl.getCageHistorique);

export default router;
