import express from 'express';
import { contactSupportDesk, getSupportTickets } from '../controllers/supportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth protection to all support endpoints
router.use(protect);

router.post('/contact', contactSupportDesk);
router.get('/tickets', getSupportTickets);

export default router;