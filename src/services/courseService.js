const courseRepository = require('../repositories/courseRepository');
const ApiError = require('../utils/ApiError');

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

  async getAllCourses(filters, viewer) {
    return await courseRepository.findAll(filters, viewer);
  }

  async getCourseById(id, viewer) {
    const course = await courseRepository.findById(id);
    if (!course) {
      const error = new Error('Course not found');
      error.statusCode = 404;
      throw error;
    }
    const canSeeDraft = viewer?.role === 'admin'
      || (viewer?.role === 'instructor' && Number(viewer.id) === Number(course.instructor_id));
    if (course.status !== 'published' && !canSeeDraft) {
      throw new ApiError('Course not found', 404, 'COURSE_NOT_FOUND');
    }
    return course;
  }

  async updateCourse(id, updateData, actor) {
    const course = await courseRepository.findById(id);
    if (!course) {
      const error = new Error('Course not found');
      error.statusCode = 404;
      throw error;
    }

    if (actor.role !== 'admin' && Number(course.instructor_id) !== Number(actor.id)) {
      throw new ApiError('You do not own this course', 403, 'COURSE_OWNERSHIP_REQUIRED');
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

  async deleteCourse(id, actor) {
    const course = await courseRepository.findById(id);
    if (!course) {
      const error = new Error('Course not found');
      error.statusCode = 404;
      throw error;
    }

    if (actor.role !== 'admin' && Number(course.instructor_id) !== Number(actor.id)) {
      throw new ApiError('You do not own this course', 403, 'COURSE_OWNERSHIP_REQUIRED');
    }
    await courseRepository.delete(id);
  }
}

module.exports = new CourseService();
