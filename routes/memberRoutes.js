import express from 'express';
import { 
  createMember, 
  getAllMembers, 
  getMemberById, 
  updateMember, 
  updateMemberStatus 
} from '../controllers/memberController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all member routes
router.use(protect);

// Standard Member CRUD & Listings
router.route('/')
  .post(restrictTo('admin', 'manager'), createMember)
  .get(restrictTo('admin', 'manager'), getAllMembers);

router.route('/:id')
  .get(getMemberById) // Internal owner checks in controller allow members to view their own profile
  .put(restrictTo('admin', 'manager'), updateMember);

// Records Maintenance Engine - Status Modification & Auditing
router.patch('/:id/status', restrictTo('admin', 'manager'), updateMemberStatus);

export default router;
