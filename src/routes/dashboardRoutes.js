const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// GET /api/dashboard/student
router.get('/student', authenticate, authorize('student'), dashboardController.studentDashboard);

// GET /api/dashboard/instructor
router.get(
  '/instructor',
  authenticate,
  authorize('instructor'),
  dashboardController.instructorDashboard
);

// GET /api/dashboard/admin
router.get('/admin', authenticate, authorize('admin'), dashboardController.adminDashboard);

module.exports = router;
