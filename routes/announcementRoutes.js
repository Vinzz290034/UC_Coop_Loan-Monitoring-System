import express from 'express';
import { 
  getAnnouncements, 
  createAnnouncement, 
  toggleAnnouncementStatus 
} from '../controllers/announcementController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection
router.use(protect);

// Public feed for authenticated users
router.get('/', getAnnouncements);

// Restricted actions for Admin and Manager roles
router.post('/', restrictTo('admin', 'manager'), createAnnouncement);
router.patch('/:id/status', restrictTo('admin', 'manager'), toggleAnnouncementStatus);

export default router;