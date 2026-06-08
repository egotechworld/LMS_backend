const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { body } = require('express-validator');

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty()
];

// Public routes
router.post('/register', registerValidation, userController.register);
router.post('/login', userController.login);

// Protected routes
router.get('/me', authenticate, userController.getProfile);
router.get('/', authenticate, authorize('admin'), userController.getAllUsers);
router.get('/:id', authenticate, userController.getUserById);
router.put('/:id', authenticate, userController.updateUser);
router.delete('/:id', authenticate, authorize('admin'), userController.deleteUser);

// Admin-only: register instructor
router.post('/register-instructor', authenticate, authorize('admin'), registerValidation, userController.registerInstructor);

module.exports = router;
