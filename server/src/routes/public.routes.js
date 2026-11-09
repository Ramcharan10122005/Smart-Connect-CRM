import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as publicController from '../controllers/public.controller.js';

const router = Router();

// Rate limiter: 5 submissions per IP per hour
const captureLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'test' ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).render('errors/500', {
      title: 'Rate Limit Exceeded',
      message: 'Too many submissions from this IP address. Please try again in an hour.',
    });
  },
});

router.get('/:key', asyncHandler(publicController.renderCaptureForm));
router.post('/:key', captureLimiter, asyncHandler(publicController.submitCaptureForm));

export default router;
