import express from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import {
  getCollections,
  createCollection,
  getNextReceiptNumber,
  bulkImportCollections,
  updateCollection,
  deleteCollection,
  bulkDeleteCollections
} from '../controllers/collectionController.js';
import {
  getMerchandiseCatalog,
  createMerchandiseCatalogItem,
  updateMerchandiseCatalogItem,
  deleteMerchandiseCatalogItem,
  bulkImportMerchandiseCatalog
} from '../controllers/merchandiseCatalogController.js';

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin', 'staff'));

// Merchandise Catalog Routes
router.get('/catalog', getMerchandiseCatalog);
router.post('/catalog', restrictTo('admin'), createMerchandiseCatalogItem);
router.post('/catalog/bulk-import', restrictTo('admin'), bulkImportMerchandiseCatalog);
router.put('/catalog/:id', restrictTo('admin'), updateMerchandiseCatalogItem);
router.delete('/catalog/:id', restrictTo('admin'), deleteMerchandiseCatalogItem);

router.get('/next-receipt-no', getNextReceiptNumber);

router.route('/')
  .get(getCollections)
  .post(createCollection);

router.post('/bulk', bulkImportCollections);
router.post('/bulk-delete', bulkDeleteCollections);

router.route('/:id')
  .put(updateCollection)
  .delete(deleteCollection);

export default router;
