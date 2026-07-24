import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All notification routes require authentication
router.use(protect);

// Get all notifications for the current user
router.get('/', getNotifications);

// Get unread count (for badge)
router.get('/unread-count', getUnreadCount);

// Mark all as read (must be before /:id to avoid route collision)
router.put('/read-all', markAllAsRead);

// Mark single notification as read
router.put('/:id/read', markAsRead);

export default router;
