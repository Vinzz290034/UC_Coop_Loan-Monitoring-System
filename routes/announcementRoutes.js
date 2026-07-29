import express from 'express';
import {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../controllers/announcementController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import { uploadAnnouncementImage } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect);

// Public feeds / Read access
router.get('/', getAnnouncements);
router.get('/:id', getAnnouncementById);

// Protected routes with custom image upload error-handling middleware
router.post(
  '/',
  restrictTo('admin', 'staff'),
  uploadAnnouncementImage,
  createAnnouncement
);

router.put(
  '/:id',
  restrictTo('admin', 'staff'),
  uploadAnnouncementImage,
  updateAnnouncement
);

router.delete('/:id', restrictTo('admin', 'staff'), deleteAnnouncement);

export default router;