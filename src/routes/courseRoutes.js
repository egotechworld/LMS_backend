const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { thumbnailUpload } = require('../middlewares/uploadMiddleware');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { body } = require('express-validator');

// Public routes
router.get('/', courseController.getAllCourses);
router.get('/:id', courseController.getCourseById);

// Protected routes - Instructor/Admin only
router.post(
  '/', 
  authenticate, 
  authorize('instructor', 'admin'), 
  thumbnailUpload.single('thumbnail'),
  courseController.createCourse
);

router.put('/:id', authenticate, authorize('instructor', 'admin'), courseController.updateCourse);
router.delete('/:id', authenticate, authorize('instructor', 'admin'), courseController.deleteCourse);

module.exports = router;
