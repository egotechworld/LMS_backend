const assignmentRepository = require('../repositories/assignmentRepository');
const submissionRepository = require('../repositories/submissionRepository');
const gradeRepository = require('../repositories/gradeRepository');
const enrollmentRepository = require('../repositories/enrollmentRepository');
const { pool } = require('../config/database');
const ApiError = require('../utils/ApiError');
const { createNotification, createBulkNotifications } = require('../utils/notificationHelper');
const courseRepository = require('../repositories/courseRepository');

class AssignmentService {
  // ── Assignments ──────────────────────────────────────────────────────────

  async createAssignment(requester, data) {
    const course = await courseRepository.findById(data.courseId);
    if (!course) throw new ApiError('Course not found', 404, 'COURSE_NOT_FOUND');
    if (requester.role !== 'admin' && Number(course.instructor_id) !== Number(requester.id)) {
      throw new ApiError('You do not own this course', 403, 'COURSE_OWNERSHIP_REQUIRED');
    }
    const assignmentId = await assignmentRepository.create({
      ...data,
      createdBy: requester.id,
    });

    const assignment = await assignmentRepository.findById(assignmentId);

    // Notify all enrolled students
    const enrollments = await enrollmentRepository.findByCourse(data.courseId);
    if (enrollments.length > 0) {
      const studentIds = enrollments.map((e) => e.student_id);
      await createBulkNotifications(
        studentIds,
        `New assignment "${assignment.title}" has been posted in ${assignment.course_title}.`,
        'assignment_created',
        assignmentId,
        'assignment'
      );
    }

    return assignment;
  }

  async getAssignmentsByCourse(courseId, requester) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new ApiError('Course not found', 404, 'COURSE_NOT_FOUND');
    if (requester.role === 'student') {
      const enrollment = await enrollmentRepository.findByStudentAndCourse(requester.id, courseId);
      if (!enrollment) throw new ApiError('Enrollment required', 403, 'ENROLLMENT_REQUIRED');
    } else if (requester.role === 'instructor' && Number(course.instructor_id) !== Number(requester.id)) {
      throw new ApiError('You do not own this course', 403, 'COURSE_OWNERSHIP_REQUIRED');
    }
    return assignmentRepository.findByCourse(courseId);
  }

  async getAssignmentById(id, requester = null) {
    const assignment = await assignmentRepository.findById(id);
    if (!assignment) throw new ApiError('Assignment not found', 404);
    if (requester?.role === 'student') {
      const enrollment = await enrollmentRepository.findByStudentAndCourse(
        requester.id,
        assignment.course_id
      );
      if (!enrollment) throw new ApiError('Enrollment required', 403, 'ENROLLMENT_REQUIRED');
    } else if (
      requester?.role === 'instructor'
      && Number(assignment.created_by) !== Number(requester.id)
    ) {
      throw new ApiError('Forbidden', 403, 'ASSIGNMENT_OWNERSHIP_REQUIRED');
    }
    return assignment;
  }

  async updateAssignment(id, instructorId, data) {
    const assignment = await this.getAssignmentById(id);

    // Only creator or admin can update
    if (assignment.created_by !== instructorId) {
      throw new ApiError('Forbidden: you did not create this assignment', 403);
    }

    await assignmentRepository.update(id, {
      title: data.title,
      description: data.description,
      due_date: data.dueDate,
      file_url: data.fileUrl,
      file_name: data.fileName,
      max_score: data.maxScore,
    });

    const updated = await assignmentRepository.findById(id);

    // Notify enrolled students of the update
    const enrollments = await enrollmentRepository.findByCourse(assignment.course_id);
    if (enrollments.length > 0) {
      const studentIds = enrollments.map((e) => e.student_id);
      await createBulkNotifications(
        studentIds,
        `Assignment "${updated.title}" has been updated in ${updated.course_title}.`,
        'assignment_updated',
        id,
        'assignment'
      );
    }

    return updated;
  }

  async deleteAssignment(id, instructorId) {
    const assignment = await this.getAssignmentById(id);
    if (assignment.created_by !== instructorId) {
      throw new ApiError('Forbidden: you did not create this assignment', 403);
    }
    await assignmentRepository.delete(id);
  }

  // ── Submissions ──────────────────────────────────────────────────────────

  async submitAssignment(studentId, { assignmentId, textResponse, fileUrl, fileName }) {
    const assignment = await this.getAssignmentById(assignmentId);

    // Must be enrolled in the course
    const enrollment = await enrollmentRepository.findByStudentAndCourse(studentId, assignment.course_id);
    if (!enrollment) throw new ApiError('You are not enrolled in this course', 403);

    // Prevent duplicate submission
    const existing = await submissionRepository.findByStudentAndAssignment(studentId, assignmentId);
    if (existing) throw new ApiError('You have already submitted this assignment', 400);

    if (!textResponse && !fileUrl) {
      throw new ApiError('A text response or file is required', 400);
    }

    const isLate = new Date() > new Date(assignment.due_date);

    const submissionId = await submissionRepository.create({
      assignmentId,
      studentId,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      textResponse: textResponse || null,
      isLate,
    });

    const submission = await submissionRepository.findById(submissionId);

    // Notify instructor
    await createNotification({
      userId: assignment.created_by,
      message: `A student submitted the assignment "${assignment.title}".`,
      type: 'submission_received',
      referenceId: submissionId,
      referenceType: 'submission',
    });

    return submission;
  }

  async getSubmissionsByAssignment(assignmentId, requesterId, requesterRole) {
    const assignment = await this.getAssignmentById(assignmentId);

    // Instructors can see all; students only their own
    if (requesterRole === 'student') {
      const sub = await submissionRepository.findByStudentAndAssignment(requesterId, assignmentId);
      return sub ? [sub] : [];
    }

    // Instructor must own the course
    if (requesterRole === 'instructor' && assignment.created_by !== requesterId) {
      throw new ApiError('Forbidden', 403);
    }

    return submissionRepository.findByAssignment(assignmentId);
  }

  async getMySubmissions(studentId) {
    return submissionRepository.findByStudent(studentId);
  }

  // ── Grading ──────────────────────────────────────────────────────────────

  async gradeSubmission(instructorId, { submissionId, mark, feedback }) {
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) throw new ApiError('Submission not found', 404);

    // Verify instructor owns the assignment
    const assignment = await assignmentRepository.findById(submission.assignment_id);
    if (assignment.created_by !== instructorId) {
      throw new ApiError('Forbidden', 403);
    }

    if (mark < 0 || mark > assignment.max_score) {
      throw new ApiError(`Mark must be between 0 and ${assignment.max_score}`, 400);
    }

    await gradeRepository.upsert({ submissionId, mark, feedback, gradedBy: instructorId });

    // Notify student
    await createNotification({
      userId: submission.student_id,
      message: `Your submission for "${assignment.title}" has been graded. Mark: ${mark}/${assignment.max_score}.`,
      type: 'submission_graded',
      referenceId: submissionId,
      referenceType: 'submission',
    });

    return gradeRepository.findBySubmission(submissionId);
  }

  async getGrade(submissionId, requester) {
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) throw new ApiError('Submission not found', 404);
    const assignment = await assignmentRepository.findById(submission.assignment_id);
    const allowed = requester.role === 'admin'
      || (requester.role === 'student' && Number(submission.student_id) === Number(requester.id))
      || (requester.role === 'instructor' && Number(assignment.created_by) === Number(requester.id));
    if (!allowed) throw new ApiError('Forbidden', 403, 'GRADE_OWNERSHIP_REQUIRED');
    const grade = await gradeRepository.findBySubmission(submissionId);
    if (!grade) throw new ApiError('Grade not found', 404);
    return grade;
  }
}

module.exports = new AssignmentService();
