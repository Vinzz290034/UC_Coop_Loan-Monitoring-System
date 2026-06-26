import express from 'express';
import { 
  createMember, 
  getAllMembers, 
  getMemberById, 
  updateMember, 
  updateMemberStatus,
  deleteMember,
  getMemberDashboardSummary, // Imported summary function
  exportMembersReport        // Imported exporter function
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
  .put(restrictTo('admin', 'manager'), updateMember)
  .delete(restrictTo('admin'), deleteMember);

// Records Maintenance Engine - Status Modification & Auditing
router.patch('/:id/status', restrictTo('admin', 'manager'), updateMemberStatus);

// Financial Dashboard & Reporting
router.get('/:id/dashboard-summary', getMemberDashboardSummary);
// EXPORT ROUTE (Placed above /:id routes to avoid string parsing collisions)
router.get('/export/excel', restrictTo('admin', 'manager'), exportMembersReport);

export default router;
