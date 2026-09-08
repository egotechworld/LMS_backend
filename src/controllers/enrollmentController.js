const enrollmentService = require('../services/enrollmentService');

class EnrollmentController {
  async enrollStudent(req, res, next) {
    try {
      const { courseId } = req.body;
      const studentId = req.user.id;
      
      const enrollment = await enrollmentService.enrollStudent(studentId, courseId);

      res.status(201).json({
        success: true,
        message: 'Enrolled successfully',
        data: enrollment
      });
    } catch (error) {
      next(error);
    }
  }

  async getStudentEnrollments(req, res, next) {
    try {
      const studentId = req.user.id;
      const enrollments = await enrollmentService.getEnrollmentsByStudent(studentId);

      res.status(200).json({
        success: true,
        data: enrollments
      });
    } catch (error) {
      next(error);
    }
  }

  async getCourseEnrollments(req, res, next) {
    try {
      const { courseId } = req.params;
      const enrollments = await enrollmentService.getEnrollmentsByCourse(courseId, req.user);

      res.status(200).json({
        success: true,
        data: enrollments
      });
    } catch (error) {
      next(error);
    }
  }

  async unenrollStudent(req, res, next) {
    try {
      const { courseId } = req.params;
      const studentId = req.user.id;
      
      await enrollmentService.unenrollStudent(studentId, courseId);

      res.status(200).json({
        success: true,
        message: 'Unenrolled successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EnrollmentController();
