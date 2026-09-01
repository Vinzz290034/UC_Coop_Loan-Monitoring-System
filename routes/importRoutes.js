import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { previewImport, executeImport, importMembersRegistry } from '../controllers/importController.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure temp uploads folder exists
const tempUploadDir = path.join(__dirname, '../uploads/temp');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `import_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx and .xls files are allowed.'));
    }
  }
});

const router = express.Router();

// Protected: Admin and Staff only
router.use(protect);
router.use(restrictTo('admin', 'staff'));

router.post('/preview', upload.single('file'), previewImport);
router.post('/execute', executeImport);
router.post('/members-registry', upload.single('file'), importMembersRegistry);

export default router;
