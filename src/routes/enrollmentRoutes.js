const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { authenticate } = require('../middlewares/authMiddleware');

// All enrollment routes require authentication
router.post('/', authenticate, enrollmentController.enrollStudent);
router.get('/my-enrollments', authenticate, enrollmentController.getStudentEnrollments);
router.get('/course/:courseId', authenticate, enrollmentController.getCourseEnrollments);
router.delete('/course/:courseId', authenticate, enrollmentController.unenrollStudent);

module.exports = router;
