import express from 'express';
import {
  createAppointment,
  getMyAppointments,
  getAllAppointments,
  updateAppointmentStatus
} from '../controllers/appointmentController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// 1. Members can view their own appointments
router.route('/me')
  .get(restrictTo('member'), getMyAppointments);

// 2. Main appointments routing
router.route('/')
  .post(restrictTo('member', 'manager', 'admin'), createAppointment)
  .get(restrictTo('manager', 'admin'), getAllAppointments);

// 3. Status modifications
router.route('/:id/status')
  .patch(restrictTo('member', 'manager', 'admin'), updateAppointmentStatus);

export default router;
