import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import * as leadController from '../controllers/lead.controller.js';
import {
  createLeadSchema,
  updateLeadSchema,
  moveStageSchema,
  convertLeadSchema,
  getLeadsQuerySchema,
  getBoardQuerySchema,
} from '../validators/lead.validator.js';

const router = Router();

router.use(authenticate);

// Leads List view (paginated, sorted, filtered)
router.get('/', validate({ query: getLeadsQuerySchema }), asyncHandler(leadController.getLeads));

// Kanban Deal Board (grouped by stage with counts & weighted values)
router.get(
  '/board',
  validate({ query: getBoardQuerySchema }),
  asyncHandler(leadController.getLeadBoard)
);

// CSV Export (must be before /:id)
router.get(
  '/export.csv',
  validate({ query: getLeadsQuerySchema }),
  asyncHandler(leadController.exportLeadsCsv)
);

// Single lead CRUD
router.get('/:id', asyncHandler(leadController.getLeadById));
router.post('/', validate({ body: createLeadSchema }), asyncHandler(leadController.createLead));
router.patch('/:id', validate({ body: updateLeadSchema }), asyncHandler(leadController.updateLead));
router.delete('/:id', asyncHandler(leadController.deleteLead));

// Pipeline stage transition (validates lostReason when moving to LOST)
router.patch(
  '/:id/stage',
  validate({ body: moveStageSchema }),
  asyncHandler(leadController.moveLeadStage)
);

// Convert Lead into Customer Contact (and Company)
router.post(
  '/:id/convert',
  validate({ body: convertLeadSchema }),
  asyncHandler(leadController.convertLead)
);

export default router;
