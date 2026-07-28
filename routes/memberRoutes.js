import express from 'express';
import { 
  createMember, 
  getAllMembers, 
  getMemberById, 
  updateMember, 
  updateMemberStatus,
  deleteMember,
  getMemberDashboardSummary, // Imported summary function
  exportMembersReport,        // Imported exporter function
  updateMemberGoal,
  completeMemberProfile,
  reviewMemberProfile
} from '../controllers/memberController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all member routes
router.use(protect);

// Onboarding Step 2 Profile Completion
router.post('/complete-profile', completeMemberProfile);

// Admin & Staff Approval Decision
router.patch('/:id/approval', restrictTo('admin', 'staff'), reviewMemberProfile);

// Standard Member CRUD & Listings
router.route('/')
  .post(restrictTo('admin', 'staff'), createMember)
  .get(restrictTo('admin', 'staff'), getAllMembers);

router.route('/:id')
  .get(getMemberById) // Internal owner checks in controller allow members to view their own profile
  .put(restrictTo('admin', 'staff'), updateMember)
  .delete(restrictTo('admin'), deleteMember);

// Records Maintenance Engine - Status Modification & Auditing
router.patch('/:id/status', restrictTo('admin', 'staff'), updateMemberStatus);

// Financial Dashboard & Reporting
router.get('/:id/dashboard-summary', getMemberDashboardSummary);
router.patch('/:id/milestone-goal', updateMemberGoal);
// EXPORT ROUTE (Placed above /:id routes to avoid string parsing collisions)
router.get('/export/excel', restrictTo('admin', 'staff'), exportMembersReport);

export default router;
