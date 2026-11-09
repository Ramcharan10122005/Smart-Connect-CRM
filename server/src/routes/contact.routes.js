import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import * as contactController from '../controllers/contact.controller.js';
import * as tagController from '../controllers/tag.controller.js';
import {
  createContactSchema,
  updateContactSchema,
  getContactsQuerySchema,
  bulkContactActionSchema,
} from '../validators/contact.validator.js';
import { attachTagSchema } from '../validators/tag.validator.js';

const router = Router();

router.use(authenticate);

// List contacts with search, filters, pagination
router.get(
  '/',
  validate({ query: getContactsQuerySchema }),
  asyncHandler(contactController.getContacts)
);

// Bulk contact operations (assign owner, add tag, remove tag, delete)
router.post(
  '/bulk',
  validate({ body: bulkContactActionSchema }),
  asyncHandler(contactController.bulkContactAction)
);

// Contact 360 overview
router.get('/:id/overview', asyncHandler(contactController.getContactOverview));

// Single contact CRUD
router.get('/:id', asyncHandler(contactController.getContactById));
router.post(
  '/',
  validate({ body: createContactSchema }),
  asyncHandler(contactController.createContact)
);
router.patch(
  '/:id',
  validate({ body: updateContactSchema }),
  asyncHandler(contactController.updateContact)
);
router.delete('/:id', asyncHandler(contactController.deleteContact));

// Tag attach / detach
router.post(
  '/:id/tags',
  validate({ body: attachTagSchema }),
  asyncHandler(tagController.attachContactTag)
);
router.delete('/:id/tags/:tagId', asyncHandler(tagController.detachContactTag));

export default router;
