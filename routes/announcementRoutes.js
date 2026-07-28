import express from 'express';
import {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcementController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware for all announcement routes
router.use(protect);

// Public feed & fetching single items (Accessible to all logged-in members/users)
router.get('/', getAnnouncements);
router.get('/:id', getAnnouncementById);

// Restricted actions (Admin and Manager roles only)
router.post('/', restrictTo('admin', 'manager'), createAnnouncement);
router.put('/:id', restrictTo('admin', 'manager'), updateAnnouncement);
router.delete('/:id', restrictTo('admin', 'manager'), deleteAnnouncement);

export default router;