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
  deleteUser,
  submitContactMessage,       // Added
  getContactMessages,         // Added
  updateContactMessageStatus, // Added
  replyToContactMessage,      // Added — Reply to contact inquiries
  updateProfile,              // Added — Self-service profile update
  changePassword,             // Added — Self-service password change
  changeUsername,             // Added — Self-service username change
  updateAvatar,               // Added — Self-service avatar update
  logout,                     // Added — User logout event tracking
  getUserAccessHistory        // Added — User access history (login/logout logs)
} from '../controllers/authController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import { uploadAvatar } from '../middleware/uploadMiddleware.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// Dedicated rate limiter for login to prevent password brute-forcing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 15 : 100,
  message: {
    success: false,
    error: { message: 'Too many login attempts from this IP. Please try again after 15 minutes.' }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Dedicated rate limiter for OTP / password recovery to prevent email bombing & OTP enumeration
const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 6 : 50,
  message: {
    success: false,
    error: { message: 'Too many recovery requests from this IP. Please try again after 15 minutes.' }
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ==========================================
// Public Authentication & Recovery Routes
// ==========================================
router.post('/login', authLimiter, login);
router.post('/forgot-password', recoveryLimiter, forgotPassword);
router.post('/reset-password', recoveryLimiter, resetPassword);

// ==========================================
// Public Member Self-Registration (OTP-based)
// ==========================================
router.post('/member-register', recoveryLimiter, memberRegister);
router.post('/verify-otp', recoveryLimiter, verifyRegistrationOtp);
router.post('/resend-otp', recoveryLimiter, resendOtp);

// ==========================================
// Public Contact / Inquiry Routes
// ==========================================
router.post('/contact', submitContactMessage); // Public landing page submission

// ==========================================
// Protected Personal Profile & Access History Routes
// ==========================================
router.get('/me', protect, getMe);
router.put('/me/profile', protect, updateProfile);
router.put('/me/username', protect, changeUsername);
router.put('/me/password', protect, changePassword);
router.put('/me/avatar', protect, uploadAvatar, updateAvatar);
router.post('/logout', protect, logout);
router.get('/access-history', protect, getUserAccessHistory);

// ==========================================
// Admin & Manager Protected Routes
// ==========================================
// Register new credentials directly
router.post('/register', protect, restrictTo('admin', 'staff'), register);

// Manage contact messages (inquiries)
router.get('/contact-messages', protect, restrictTo('admin', 'staff', 'member'), getContactMessages);
router.put('/contact-messages/:id', protect, restrictTo('admin', 'staff'), updateContactMessageStatus);
router.post('/contact-messages/:id/reply', protect, restrictTo('admin', 'staff'), replyToContactMessage);

// ==========================================
// Admin Only User Management (Full CRUD)
// ==========================================
router.get('/users', protect, restrictTo('admin'), getAllUsers);
router.get('/users/:id', protect, restrictTo('admin'), getUserById);
router.put('/users/:id', protect, restrictTo('admin'), updateUser);
router.delete('/users/:id', protect, restrictTo('admin'), deleteUser);

export default router;