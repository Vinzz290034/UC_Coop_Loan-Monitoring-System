import express from 'express';
import { login, register, getMe } from '../controllers/authController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);

// Management routes (Only Admin and Manager can register new credentials)
router.post('/register', protect, restrictTo('admin', 'manager'), register);

export default router;
