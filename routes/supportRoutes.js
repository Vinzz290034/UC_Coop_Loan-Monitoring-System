import express from 'express';
import { 
  contactSupportDesk, 
  getSupportTickets, 
  updateTicketStatus,
  getFaqsAndGuides,
  createFaqOrGuide,
  deleteFaqOrGuide
} from '../controllers/supportController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js'; // Adjust based on your middleware exports

const router = express.Router();

// Apply auth protection to all support endpoints
router.use(protect);

// Support Ticket Endpoints
router.post('/contact', contactSupportDesk);
router.get('/tickets', getSupportTickets);
router.patch('/tickets/:id/status', restrictTo('admin', 'staff'), updateTicketStatus);

// FAQ & Guide Endpoints
router.get('/faqs-guides', getFaqsAndGuides);
router.post('/faqs-guides', restrictTo('admin', 'staff'), createFaqOrGuide);
router.delete('/faqs-guides/:id', restrictTo('admin', 'staff'), deleteFaqOrGuide);

export default router;