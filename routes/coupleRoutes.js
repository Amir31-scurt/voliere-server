import { Router } from 'express';
import * as ctrl from '../controllers/coupleController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validate, schemas } from '../middleware/validate.js';

const router = Router();
router.use(authMiddleware);

router.get('/',               ctrl.getCouples);
router.post('/',              validate(schemas.couple), ctrl.createCouple);
router.get('/:id',            ctrl.getCoupleById);
router.put('/:id/separer',    ctrl.separerCouple);

export default router;
