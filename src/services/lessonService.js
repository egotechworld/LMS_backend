const lessonRepository = require('../repositories/lessonRepository');
const courseRepository = require('../repositories/courseRepository');
const ApiError = require('../utils/ApiError');
const enrollmentRepository = require('../repositories/enrollmentRepository');

class LessonService {
  async createLesson(user, lessonData) {
    const course = await courseRepository.findById(lessonData.course_id);
    if (!course) throw new ApiError('Course not found', 404);
    
    // Ensure the instructor owns the course or is admin
    if (course.instructor_id !== user.id && user.role !== 'admin') {
      throw new ApiError('Not authorized to add lessons to this course', 403);
    }

    const insertId = await lessonRepository.create(lessonData);
    return this.getLessonById(insertId);
  }

  async getLessonsByCourse(user, courseId) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new ApiError('Course not found', 404, 'COURSE_NOT_FOUND');
    if (user.role === 'student') {
      const enrollment = await enrollmentRepository.findByStudentAndCourse(user.id, courseId);
      if (!enrollment) {
        throw new ApiError('Enrollment required to access lessons', 403, 'ENROLLMENT_REQUIRED');
      }
    } else if (user.role === 'instructor' && Number(course.instructor_id) !== Number(user.id)) {
      throw new ApiError('You do not own this course', 403, 'COURSE_OWNERSHIP_REQUIRED');
    }
    return lessonRepository.findByCourseId(courseId);
  }

  async getLessonById(id) {
    const lesson = await lessonRepository.findById(id);
    if (!lesson) throw new ApiError('Lesson not found', 404);
    return lesson;
  }

  async updateLesson(user, id, updateData) {
    const lesson = await this.getLessonById(id);
    const course = await courseRepository.findById(lesson.course_id);
    
    if (course.instructor_id !== user.id && user.role !== 'admin') {
      throw new ApiError('Not authorized to update this lesson', 403);
    }

    await lessonRepository.update(id, updateData);
    return this.getLessonById(id);
  }

  async deleteLesson(user, id) {
    const lesson = await this.getLessonById(id);
    const course = await courseRepository.findById(lesson.course_id);
    
    if (course.instructor_id !== user.id && user.role !== 'admin') {
      throw new ApiError('Not authorized to delete this lesson', 403);
    }

    await lessonRepository.delete(id);
  }
}

module.exports = new LessonService();
