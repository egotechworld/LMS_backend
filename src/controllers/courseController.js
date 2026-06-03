const courseService = require('../services/courseService');
const { validationResult } = require('express-validator');

class CourseController {
  async createCourse(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const courseData = req.body;
      const instructorId = req.user.id;
      const course = await courseService.createCourse({ ...courseData, instructorId });

      res.status(201).json({
        success: true,
        message: 'Course created successfully',
        data: course
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllCourses(req, res, next) {
    try {
      const { category, search, page = 1, limit = 10 } = req.query;
      const courses = await courseService.getAllCourses({ category, search, page, limit });

      res.status(200).json({
        success: true,
        data: courses
      });
    } catch (error) {
      next(error);
    }
  }

  async getCourseById(req, res, next) {
    try {
      const { id } = req.params;
      const course = await courseService.getCourseById(id);

      res.status(200).json({
        success: true,
        data: course
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCourse(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedCourse = await courseService.updateCourse(id, updateData);

      res.status(200).json({
        success: true,
        message: 'Course updated successfully',
        data: updatedCourse
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCourse(req, res, next) {
    try {
      const { id } = req.params;
      await courseService.deleteCourse(id);

      res.status(200).json({
        success: true,
        message: 'Course deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CourseController();
