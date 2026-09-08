const { validationResult } = require('express-validator');
const userService = require('../services/userService');
const ApiError = require('../utils/ApiError');
const { setAuthCookie, clearAuthCookie } = require('../utils/authCookie');

const validationErrors = (req) => {
  const result = validationResult(req);
  return result.isEmpty() ? null : result.array();
};

class UserController {
  async register(req, res, next) {
    try {
      const errors = validationErrors(req);
      if (errors) {
        throw new ApiError('Registration validation failed', 400, 'VALIDATION_ERROR', errors);
      }
      const result = await userService.registerUser(req.body);
      setAuthCookie(res, result.token);
      res.status(201).json({
        success: true,
        message: 'Student registered successfully',
        data: { user: result.user },
      });
    } catch (error) {
      next(error);
    }
  }

  async registerInstructor(req, res, next) {
    try {
      const errors = validationErrors(req);
      if (errors) {
        throw new ApiError('Registration validation failed', 400, 'VALIDATION_ERROR', errors);
      }
      const result = await userService.registerInstructor(req.body);
      res.status(201).json({
        success: true,
        message: 'Instructor registered successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        throw new ApiError('Email and password are required', 400, 'VALIDATION_ERROR');
      }
      const result = await userService.loginUser(email, password);
      setAuthCookie(res, result.token);
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { user: result.user },
      });
    } catch (error) {
      next(error);
    }
  }

  logout(_req, res) {
    clearAuthCookie(res);
    res.status(200).json({ success: true, message: 'Logout successful' });
  }

  async getProfile(req, res, next) {
    try {
      const user = await userService.getUserById(req.user.id);
      res.status(200).json({ success: true, data: { user } });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req, res, next) {
    try {
      if (req.user.role !== 'admin' && Number(req.params.id) !== Number(req.user.id)) {
        throw new ApiError('Access denied', 403, 'USER_OWNERSHIP_REQUIRED');
      }
      const user = await userService.getUserById(req.params.id);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req, res, next) {
    try {
      const { role, page = 1, limit = 10 } = req.query;
      const users = await userService.getAllUsers({ role, page, limit });
      res.status(200).json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      if (req.user.role !== 'admin' && Number(req.params.id) !== Number(req.user.id)) {
        throw new ApiError('Access denied', 403, 'USER_OWNERSHIP_REQUIRED');
      }
      const updatedUser = await userService.updateUser(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      await userService.deleteUser(req.params.id);
      res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
