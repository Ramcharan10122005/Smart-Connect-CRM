import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as printController from '../controllers/print.controller.js';

const router = Router();

// Print routes require authentication
router.use(authenticate);

router.get('/contact/:id', asyncHandler(printController.renderContactPrint));

export default router;
