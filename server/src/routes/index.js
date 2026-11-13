import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import tagRoutes from './tag.routes.js';
import companyRoutes from './company.routes.js';
import contactRoutes from './contact.routes.js';
import pipelineStageRoutes from './pipelineStage.routes.js';
import leadSourceRoutes from './leadSource.routes.js';
import leadRoutes from './lead.routes.js';
import activityRoutes from './activity.routes.js';
import followUpRoutes from './followUp.routes.js';
import notificationRoutes from './notification.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import reportRoutes from './report.routes.js';
import searchRoutes from './search.routes.js';
import captureFormRoutes from './captureForm.routes.js';
import emailTemplateRoutes from './emailTemplate.routes.js';
import emailSendRoutes from './emailSend.routes.js';
import automationRoutes from './automation.routes.js';

const router = Router();

// Root health check
router.use('/', healthRoutes);

// Core Modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tags', tagRoutes);
router.use('/companies', companyRoutes);
router.use('/contacts', contactRoutes);
router.use('/pipeline-stages', pipelineStageRoutes);
router.use('/lead-sources', leadSourceRoutes);
router.use('/leads', leadRoutes);
router.use('/activities', activityRoutes);
router.use('/follow-ups', followUpRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/search', searchRoutes);
router.use('/capture-forms', captureFormRoutes);
router.use('/email-templates', emailTemplateRoutes);
router.use('/emails', emailSendRoutes);
router.use('/automations', automationRoutes);

export default router;
