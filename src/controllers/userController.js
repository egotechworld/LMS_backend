const userService = require('../services/userService');
const { validationResult } = require('express-validator');

class UserController {
  async register(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = req.body;
      const result = await userService.registerUser(userData);

      res.status(201).json({
        success: true,
        message: 'Student registered successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Admin-only: register instructor
  async registerInstructor(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userData = req.body;
      const result = await userService.registerInstructor(userData);

      res.status(201).json({
        success: true,
        message: 'Instructor registered successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get current logged-in user profile
  async getProfile(req, res, next) {
    try {
      const user = await userService.getUserById(req.user.id);
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await userService.loginUser(email, password);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req, res, next) {
    try {
      const { role, page = 1, limit = 10 } = req.query;
      const users = await userService.getAllUsers({ role, page, limit });

      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedUser = await userService.updateUser(id, updateData);

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      await userService.deleteUser(id);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
