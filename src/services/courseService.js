const courseRepository = require('../repositories/courseRepository');

class CourseService {
  async createCourse(courseData) {
    if (courseData.is_free) {
      courseData.price = 0;
    } else if (!courseData.price || courseData.price <= 0) {
      throw { statusCode: 400, message: 'Paid courses must have a price greater than 0' };
    }
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

    if (updateData.is_free !== undefined) {
      if (updateData.is_free) {
        updateData.price = 0;
      } else {
        const newPrice = updateData.price !== undefined ? updateData.price : course.price;
        if (!newPrice || newPrice <= 0) {
          throw { statusCode: 400, message: 'Paid courses must have a price greater than 0' };
        }
      }
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
