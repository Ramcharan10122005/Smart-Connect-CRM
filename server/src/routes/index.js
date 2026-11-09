import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';

const router = Router();

// Root health check
router.use('/', healthRoutes);

// Core Modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

export default router;
