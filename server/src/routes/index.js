import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import tagRoutes from './tag.routes.js';
import companyRoutes from './company.routes.js';
import contactRoutes from './contact.routes.js';

const router = Router();

// Root health check
router.use('/', healthRoutes);

// Core Modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tags', tagRoutes);
router.use('/companies', companyRoutes);
router.use('/contacts', contactRoutes);

export default router;
