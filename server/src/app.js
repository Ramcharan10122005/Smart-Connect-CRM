import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import healthRoutes from './routes/health.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { errorResponse } from './utils/response.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security & utility middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows inline scripts in EJS development if needed
  })
);

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Static assets for EJS views
app.use(express.static(path.join(__dirname, '../public')));

// EJS View Engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// API v1 routes
app.use('/api/v1', healthRoutes);

// Fallback 404 for unhandled API routes
app.use('/api/*', (req, res) => {
  return errorResponse(res, `Route ${req.originalUrl} not found`, 'NOT_FOUND', null, 404);
});

// Central error handler
app.use(errorHandler);

export default app;
