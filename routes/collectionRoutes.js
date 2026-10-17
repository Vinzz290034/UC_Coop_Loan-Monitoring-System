import express from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import {
  getCollections,
  createCollection,
  bulkImportCollections,
  deleteCollection,
  bulkDeleteCollections
} from '../controllers/collectionController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin', 'staff'));

router.route('/')
  .get(getCollections)
  .post(createCollection);

router.post('/bulk', bulkImportCollections);
router.post('/bulk-delete', bulkDeleteCollections);

router.route('/:id')
  .delete(deleteCollection);

export default router;
