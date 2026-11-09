import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import * as companyController from '../controllers/company.controller.js';
import * as tagController from '../controllers/tag.controller.js';
import {
  createCompanySchema,
  updateCompanySchema,
  getCompaniesQuerySchema,
} from '../validators/company.validator.js';
import { attachTagSchema } from '../validators/tag.validator.js';

const router = Router();

router.use(authenticate);

// List companies with filtering, search, and pagination
router.get(
  '/',
  validate({ query: getCompaniesQuerySchema }),
  asyncHandler(companyController.getCompanies)
);

// Company 360 overview
router.get('/:id/overview', asyncHandler(companyController.getCompanyOverview));

// Single company CRUD
router.get('/:id', asyncHandler(companyController.getCompanyById));
router.post(
  '/',
  validate({ body: createCompanySchema }),
  asyncHandler(companyController.createCompany)
);
router.patch(
  '/:id',
  validate({ body: updateCompanySchema }),
  asyncHandler(companyController.updateCompany)
);
router.delete('/:id', asyncHandler(companyController.deleteCompany));

// Tag attach / detach
router.post(
  '/:id/tags',
  validate({ body: attachTagSchema }),
  asyncHandler(tagController.attachCompanyTag)
);
router.delete('/:id/tags/:tagId', asyncHandler(tagController.detachCompanyTag));

export default router;
