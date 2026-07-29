import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure base uploads directory structure exists
const avatarDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || 'anonymous';
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `file-${userId}-${Date.now()}${ext}`);
  }
});

// Resilient File Filter
const fileFilter = (req, file, cb) => {
  if (!file) {
    return cb(null, true);
  }

  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpeg', '.jpg', '.png', '.webp'];

  const isMimeValid = allowedMimeTypes.includes(file.mimetype.toLowerCase());
  const isExtValid = allowedExtensions.includes(ext);

  if (isMimeValid || isExtValid) {
    return cb(null, true);
  }

  cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
};

// 1. Raw Multer export
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

// 2. Wrapped Avatar Middleware (Requires file)
const rawAvatarUpload = upload.single('avatar');

export const uploadAvatar = (req, res, next) => {
  rawAvatarUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds the allowed limit (5MB).' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an image file.' });
    }

    next();
  });
};

// 3. Wrapped Announcement Image Middleware (Optional file)
const rawImageUpload = upload.single('image');

export const uploadAnnouncementImage = (req, res, next) => {
  rawImageUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: { message: 'Image size exceeds the allowed limit (5MB).' } });
      }
      return res.status(400).json({ error: { message: err.message } });
    } else if (err) {
      return res.status(400).json({ error: { message: err.message } });
    }

    // No req.file check here because images are optional for announcements
    next();
  });
};