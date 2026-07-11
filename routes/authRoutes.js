import express from 'express';
import {
  login,
  register,
  getMe,
  forgotPassword,
  resetPassword,
  getAllUsers,
  memberRegister,
  verifyRegistrationOtp,
  resendOtp,
  getUserById,
  updateUser,
  deleteUser
} from '../controllers/authController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/login', login);
router.post('/forgot-password', forgotPassword); // Injected public password recovery path
router.post('/reset-password', resetPassword);

// Public member self-registration routes (OTP-based)
router.post('/member-register', memberRegister);
router.post('/verify-otp', verifyRegistrationOtp);
router.post('/resend-otp', resendOtp);

// Protected routes
router.get('/me', protect, getMe);

// Management routes (Only Admin and Manager can register new credentials directly)
router.post('/register', protect, restrictTo('admin', 'manager'), register);

// Admin user management (full CRUD)
router.get('/users', protect, restrictTo('admin'), getAllUsers);
router.get('/users/:id', protect, restrictTo('admin'), getUserById);
router.put('/users/:id', protect, restrictTo('admin'), updateUser);
router.delete('/users/:id', protect, restrictTo('admin'), deleteUser);

export default router;