const enrollmentRepository = require('../repositories/enrollmentRepository');
const courseRepository = require('../repositories/courseRepository');
const userRepository = require('../repositories/userRepository');

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

    // Check if already enrolled
    const existingEnrollment = await enrollmentRepository.findByStudentAndCourse(studentId, courseId);
    if (existingEnrollment) {
      const error = new Error('Already enrolled in this course');
      error.statusCode = 400;
      throw error;
    }

    const enrollmentId = await enrollmentRepository.create(studentId, courseId);
    return await enrollmentRepository.findById(enrollmentId);
  }

  async getEnrollmentsByStudent(studentId) {
    return await enrollmentRepository.findByStudent(studentId);
  }

  async getEnrollmentsByCourse(courseId) {
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
