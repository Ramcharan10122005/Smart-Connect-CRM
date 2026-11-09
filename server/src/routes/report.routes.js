import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as reportController from '../controllers/report.controller.js';
import { reportQuerySchema } from '../validators/report.validator.js';

const router = Router();

// All reports require authentication
router.use(authenticate);

// 1. Sales Performance
router.get(
  '/sales-performance',
  validate({ query: reportQuerySchema }),
  asyncHandler(reportController.getSalesPerformance)
);
router.get(
  '/sales-performance.csv',
  validate({ query: reportQuerySchema }),
  asyncHandler(reportController.exportSalesPerformanceCsv)
);
router.get(
  '/sales-performance/csv',
  validate({ query: reportQuerySchema }),
  asyncHandler(reportController.exportSalesPerformanceCsv)
);

// 2. Lead Funnel
router.get(
  '/lead-funnel',
  validate({ query: reportQuerySchema }),
  asyncHandler(reportController.getLeadFunnel)
);
router.get(
  '/lead-funnel.csv',
  validate({ query: reportQuerySchema }),
  asyncHandler(reportController.exportLeadFunnelCsv)
);
router.get(
  '/lead-funnel/csv',
  validate({ query: reportQuerySchema }),
  asyncHandler(reportController.exportLeadFunnelCsv)
);

// 3. Lead Source Performance
router.get(
  '/lead-sources',
  validate({ query: reportQuerySchema }),
  asyncHandler(reportController.getLeadSourcePerformance)
);
router.get(
  '/lead-sources.csv',
  validate({ query: reportQuerySchema }),
  asyncHandler(reportController.exportLeadSourcePerformanceCsv)
);
router.get(
  '/lead-sources/csv',
  validate({ query: reportQuerySchema }),
  asyncHandler(reportController.exportLeadSourcePerformanceCsv)
);
router.get(
  '/lead-source-performance',
  validate({ query: reportQuerySchema }),
  asyncHandler(reportController.getLeadSourcePerformance)
);
router.get(
  '/lead-source-performance.csv',
  validate({ query: reportQuerySchema }),
  asyncHandler(reportController.exportLeadSourcePerformanceCsv)
);

// 4. Rep Activity
router.get(
  '/rep-activity',
  validate({ query: reportQuerySchema }),
  asyncHandler(reportController.getRepActivity)
);
router.get(
  '/rep-activity.csv',
  validate({ query: reportQuerySchema }),
  asyncHandler(reportController.exportRepActivityCsv)
);
router.get(
  '/rep-activity/csv',
  validate({ query: reportQuerySchema }),
  asyncHandler(reportController.exportRepActivityCsv)
);

// 5. Customer Growth
router.get(
  '/customer-growth',
  validate({ query: reportQuerySchema }),
  asyncHandler(reportController.getCustomerGrowth)
);
router.get(
  '/customer-growth.csv',
  validate({ query: reportQuerySchema }),
  asyncHandler(reportController.exportCustomerGrowthCsv)
);
router.get(
  '/customer-growth/csv',
  validate({ query: reportQuerySchema }),
  asyncHandler(reportController.exportCustomerGrowthCsv)
);

export default router;
