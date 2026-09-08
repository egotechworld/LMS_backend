const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// All enrollment routes require authentication
router.post('/', authenticate, authorize('student'), enrollmentController.enrollStudent);
router.get('/my-enrollments', authenticate, authorize('student'), enrollmentController.getStudentEnrollments);
router.get('/course/:courseId', authenticate, authorize('instructor', 'admin'), enrollmentController.getCourseEnrollments);
router.delete('/course/:courseId', authenticate, authorize('student'), enrollmentController.unenrollStudent);

module.exports = router;
