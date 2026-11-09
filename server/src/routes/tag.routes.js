import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as tagController from '../controllers/tag.controller.js';
import { createTagSchema, updateTagSchema } from '../validators/tag.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(tagController.getTags));
router.post('/', validate({ body: createTagSchema }), asyncHandler(tagController.createTag));
router.patch('/:id', validate({ body: updateTagSchema }), asyncHandler(tagController.updateTag));
router.delete('/:id', requireRole('ADMIN', 'MANAGER'), asyncHandler(tagController.deleteTag));

export default router;
