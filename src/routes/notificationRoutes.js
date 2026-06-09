const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/authMiddleware');

// All routes require authentication — any role
router.use(authenticate);

// GET /api/notifications
router.get('/', notificationController.getMyNotifications);

// PUT /api/notifications/read-all  — must be before /:id to avoid param conflict
router.put('/read-all', notificationController.markAllAsRead);

// PUT /api/notifications/:id/read
router.put('/:id/read', notificationController.markAsRead);

module.exports = router;
