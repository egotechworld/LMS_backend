const enrollmentRepository = require('../repositories/enrollmentRepository');
const courseRepository = require('../repositories/courseRepository');
const userRepository = require('../repositories/userRepository');
const ApiError = require('../utils/ApiError');
const { createNotification } = require('../utils/notificationHelper');

class EnrollmentService {
  async enrollStudent(studentId, courseId) {
    // Verify student exists
    const student = await userRepository.findById(studentId);
    if (!student) {
      const error = new Error('Student not found');
      error.statusCode = 404;
      throw error;
    }

    // Verify course exists
    const course = await courseRepository.findById(courseId);
    if (!course) {
      const error = new Error('Course not found');
      error.statusCode = 404;
      throw error;
    }
    if (course.status !== 'published') {
      throw new ApiError('Course is not available for enrollment', 400, 'COURSE_NOT_PUBLISHED');
    }
    if (!course.is_free) {
      throw new ApiError('Paid courses require verified checkout', 400, 'PAYMENT_REQUIRED');
    }

    // Check if already enrolled
    const existingEnrollment = await enrollmentRepository.findByStudentAndCourse(studentId, courseId);
    if (existingEnrollment) {
      const error = new Error('Already enrolled in this course');
      error.statusCode = 400;
      throw error;
    }

    const enrollmentId = await enrollmentRepository.create(studentId, courseId);
    await createNotification({
      userId: course.instructor_id,
      message: `A new student enrolled in "${course.title}".`,
      type: 'new_enrollment',
      referenceId: courseId,
      referenceType: 'course',
    });
    return await enrollmentRepository.findById(enrollmentId);
  }

  async getEnrollmentsByStudent(studentId) {
    return await enrollmentRepository.findByStudent(studentId);
  }

  async getEnrollmentsByCourse(courseId, requester) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new ApiError('Course not found', 404, 'COURSE_NOT_FOUND');
    if (requester.role !== 'admin' && Number(course.instructor_id) !== Number(requester.id)) {
      throw new ApiError('You do not own this course', 403, 'COURSE_OWNERSHIP_REQUIRED');
    }
    return await enrollmentRepository.findByCourse(courseId);
  }

  async unenrollStudent(studentId, courseId) {
    const enrollment = await enrollmentRepository.findByStudentAndCourse(studentId, courseId);
    if (!enrollment) {
      const error = new Error('Enrollment not found');
      error.statusCode = 404;
      throw error;
    }

    await enrollmentRepository.delete(studentId, courseId);
  }
}

module.exports = new EnrollmentService();
