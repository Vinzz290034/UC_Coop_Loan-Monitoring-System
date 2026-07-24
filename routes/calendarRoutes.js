import express from 'express';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../controllers/calendarController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection to all routes
router.use(protect);

router.route('/')
  .get(getCalendarEvents)
  .post(restrictTo('admin', 'manager'), createCalendarEvent);

router.route('/:id')
  .put(restrictTo('admin', 'manager'), updateCalendarEvent)
  .delete(restrictTo('admin', 'manager'), deleteCalendarEvent);

export default router;
