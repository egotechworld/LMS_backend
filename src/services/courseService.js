const courseRepository = require('../repositories/courseRepository');

class CourseService {
  async createCourse(courseData) {
    const courseId = await courseRepository.create(courseData);
    return await courseRepository.findById(courseId);
  }

  async getAllCourses(filters) {
    return await courseRepository.findAll(filters);
  }

  async getCourseById(id) {
    const course = await courseRepository.findById(id);
    if (!course) {
      const error = new Error('Course not found');
      error.statusCode = 404;
      throw error;
    }
    return course;
  }

  async updateCourse(id, updateData) {
    const course = await courseRepository.findById(id);
    if (!course) {
      const error = new Error('Course not found');
      error.statusCode = 404;
      throw error;
    }

    await courseRepository.update(id, updateData);
    return await courseRepository.findById(id);
  }

  async deleteCourse(id) {
    const course = await courseRepository.findById(id);
    if (!course) {
      const error = new Error('Course not found');
      error.statusCode = 404;
      throw error;
    }

    await courseRepository.delete(id);
  }
}

module.exports = new CourseService();
