const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { lessonUpload, validateLessonFileSizes } = require('../middlewares/uploadMiddleware');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// Get lessons for a course (students and instructors)
router.get('/course/:courseId', authenticate, lessonController.getCourseLessons);

// Create a new lesson (Instructor/Admin only)
router.post(
  '/course/:courseId', 
  authenticate, 
  authorize('instructor', 'admin'), 
  lessonUpload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
    { name: 'document', maxCount: 1 }
  ]),
  validateLessonFileSizes,
  lessonController.createLesson
);

// Update a lesson (Instructor/Admin only)
router.put(
  '/:id', 
  authenticate, 
  authorize('instructor', 'admin'), 
  lessonUpload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
    { name: 'document', maxCount: 1 }
  ]),
  validateLessonFileSizes,
  lessonController.updateLesson
);

// Delete a lesson (Instructor/Admin only)
router.delete('/:id', authenticate, authorize('instructor', 'admin'), lessonController.deleteLesson);

module.exports = router;
