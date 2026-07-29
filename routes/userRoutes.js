// routes/userRoutes.js
import express from 'express';
import { uploadAvatar } from '../middleware/uploadMiddleware.js'; // Adjust relative path if needed
// import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/users/avatar
router.post('/avatar', /* authenticateUser, */ uploadAvatar, (req, res) => {
  // Construct the static URL path to save in your database
  const fileUrl = `/uploads/avatars/${req.file.filename}`;
  
  // Example: Update user in database here if needed
  // await User.findByIdAndUpdate(req.user.id, { avatar: fileUrl });

  res.status(200).json({
    message: 'Avatar uploaded successfully!',
    file: req.file,
    url: fileUrl
  });
});

export default router;