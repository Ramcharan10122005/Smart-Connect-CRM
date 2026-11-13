import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { emailSendLimiter } from '../middleware/rateLimiter.js';
import * as emailSendController from '../controllers/emailSend.controller.js';
import { sendEmailSchema } from '../validators/email.validator.js';

const router = Router();

router.use(authenticate);

router.post(
  '/send',
  emailSendLimiter,
  validate({ body: sendEmailSchema }),
  asyncHandler(emailSendController.sendEmail)
);

router.get('/logs', asyncHandler(emailSendController.getEmailLogs));

export default router;

