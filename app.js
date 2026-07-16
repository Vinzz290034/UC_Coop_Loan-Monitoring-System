import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { errorHandler } from './middleware/errorMiddleware.js';
import { auditLogger, activityTracker } from './middleware/auditMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import loanRoutes from './routes/loanRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();

const app = express();

// Security Middlewares
app.use(helmet());

// Rate Limiter to guard against denial of service and brute force
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  message: {
    success: false,
    error: { message: 'Too many requests from this IP. Please try again after 15 minutes.' }
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', apiLimiter);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Silence frontend Socket.io polling log spam cleanly before routing chains
app.all('/socket.io', (req, res) => {
  res.status(200).end();
});

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date(),
    service: 'UC COOP Loan Monitoring System Backend'
  });
});

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the UC COOP Loan Monitoring and Financial Management System API.');
});

// Audit & Activity Tracking Middleware (applied to all API routes)
app.use('/api', auditLogger);
app.use('/api', activityTracker);

// Mounted Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handling Middleware
app.use(errorHandler);

export default app;