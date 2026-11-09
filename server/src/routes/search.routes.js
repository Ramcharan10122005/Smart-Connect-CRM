import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as searchController from '../controllers/search.controller.js';
import { searchQuerySchema } from '../validators/search.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: searchQuerySchema }), asyncHandler(searchController.search));

export default router;
