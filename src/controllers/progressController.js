const progressService = require('../services/progressService');
const asyncHandler = require('../utils/asyncHandler');

class ProgressController {
  /**
   * POST /api/progress/complete
   * Body: { lessonId }
   * Student marks a lesson as completed.
   */
  markLessonComplete = asyncHandler(async (req, res) => {
    const { lessonId } = req.body;
    if (!lessonId) {
      return res.status(400).json({ success: false, message: 'lessonId is required' });
    }
    const result = await progressService.markLessonComplete(req.user.id, parseInt(lessonId));
    res.json({ success: true, ...result });
  });

  /**
   * GET /api/progress/:courseId
   * Returns lesson breakdown, overall %, assignment statuses, quiz scores.
   */
  getCourseProgress = asyncHandler(async (req, res) => {
    const data = await progressService.getCourseProgress(
      req.user.id,
      parseInt(req.params.courseId)
    );
    res.json({ success: true, data });
  });

  /**
   * GET /api/progress/course/:courseId/students  (instructor)
   * Overview of all student progress for a course.
   */
  getStudentProgressByCourse = asyncHandler(async (req, res) => {
    const data = await progressService.getStudentProgressByCourse(
      req.user.id,
      parseInt(req.params.courseId)
    );
    res.json({ success: true, data });
  });

  /**
   * GET /api/progress/assignment/:assignmentId/missing  (instructor)
   * Students who have not submitted the assignment.
   */
  getStudentsWithoutSubmission = asyncHandler(async (req, res) => {
    const data = await progressService.getStudentsWithoutSubmission(
      req.user.id,
      parseInt(req.params.assignmentId)
    );
    res.json({ success: true, data });
  });
}

module.exports = new ProgressController();
