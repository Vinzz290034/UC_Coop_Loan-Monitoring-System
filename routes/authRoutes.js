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
  changePassword              // Added — Self-service password change
} from '../controllers/authController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// ==========================================
// Public Authentication & Recovery Routes
// ==========================================
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// ==========================================
// Public Member Self-Registration (OTP-based)
// ==========================================
router.post('/member-register', memberRegister);
router.post('/verify-otp', verifyRegistrationOtp);
router.post('/resend-otp', resendOtp);

// ==========================================
// Public Contact / Inquiry Routes
// ==========================================
router.post('/contact', submitContactMessage); // Public landing page submission

// ==========================================
// Protected Personal Profile Route
// ==========================================
router.get('/me', protect, getMe);
router.put('/me/profile', protect, updateProfile);
router.put('/me/password', protect, changePassword);

// ==========================================
// Admin & Manager Protected Routes
// ==========================================
// Register new credentials directly
router.post('/register', protect, restrictTo('admin', 'manager'), register);

// Manage contact messages (inquiries)
router.get('/contact-messages', protect, restrictTo('admin', 'manager'), getContactMessages);
router.put('/contact-messages/:id', protect, restrictTo('admin', 'manager'), updateContactMessageStatus);
router.post('/contact-messages/:id/reply', protect, restrictTo('admin', 'manager'), replyToContactMessage);

// ==========================================
// Admin Only User Management (Full CRUD)
// ==========================================
router.get('/users', protect, restrictTo('admin'), getAllUsers);
router.get('/users/:id', protect, restrictTo('admin'), getUserById);
router.put('/users/:id', protect, restrictTo('admin'), updateUser);
router.delete('/users/:id', protect, restrictTo('admin'), deleteUser);

export default router;