import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import env from './config/env.js';
import expressLayouts from 'express-ejs-layouts';
import apiRouter from './routes/index.js';
import publicRoutes from './routes/public.routes.js';
import printRoutes from './routes/print.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ApiError } from './utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// 2. CORS
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

// 3. HTTP Compression
app.use(compression());

// 4. Request Logging (dev only)
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 5. Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'test' ? 10000 : 1000, // 1000 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      message: 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      details: null,
    },
    meta: {},
  },
});
app.use('/api/', globalLimiter);

// 6. Body Parsers & Cookie Parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// 7. Static Assets & EJS View Engine
app.use(express.static(path.join(__dirname, '../public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// 8. Public Web Pages & Print Views
app.use('/capture', publicRoutes);
app.use('/print', printRoutes);

// 9. API v1 Router Mount
app.use('/api/v1', apiRouter);

// 10. 404 Handler for Unhandled Routes
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
  }
  return res.status(404).render('errors/404', {
    title: 'Page Not Found - SmartConnect CRM',
    message: `The page at ${req.originalUrl} could not be found.`,
  });
});

// 11. Centralized Error Handler
app.use(errorHandler);

export default app;
