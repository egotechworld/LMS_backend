const assignmentService = require('../services/assignmentService');
const asyncHandler = require('../utils/asyncHandler');
const { validationResult } = require('express-validator');
const path = require('path');

class AssignmentController {
  // ── Assignments ──────────────────────────────────────────────────────────

  createAssignment = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { title, description, dueDate, maxScore, courseId } = req.body;

    // Reference file is optional
    const fileUrl = req.file ? `/uploads/assignments/${req.file.filename}` : null;
    const fileName = req.file ? req.file.originalname : null;

    const assignment = await assignmentService.createAssignment(req.user.id, {
      courseId: parseInt(courseId),
      title,
      description,
      dueDate,
      maxScore: maxScore ? parseInt(maxScore) : 100,
      fileUrl,
      fileName,
    });

    res.status(201).json({ success: true, message: 'Assignment created', data: assignment });
  });

  getAssignmentsByCourse = asyncHandler(async (req, res) => {
    const assignments = await assignmentService.getAssignmentsByCourse(
      parseInt(req.params.courseId)
    );
    res.json({ success: true, data: assignments });
  });

  getAssignment = asyncHandler(async (req, res) => {
    const assignment = await assignmentService.getAssignmentById(parseInt(req.params.id));
    res.json({ success: true, data: assignment });
  });

  updateAssignment = asyncHandler(async (req, res) => {
    const { title, description, dueDate, maxScore } = req.body;

    const fileUrl = req.file ? `/uploads/assignments/${req.file.filename}` : undefined;
    const fileName = req.file ? req.file.originalname : undefined;

    const updated = await assignmentService.updateAssignment(
      parseInt(req.params.id),
      req.user.id,
      { title, description, dueDate, maxScore: maxScore ? parseInt(maxScore) : undefined, fileUrl, fileName }
    );
    res.json({ success: true, message: 'Assignment updated', data: updated });
  });

  deleteAssignment = asyncHandler(async (req, res) => {
    await assignmentService.deleteAssignment(parseInt(req.params.id), req.user.id);
    res.json({ success: true, message: 'Assignment deleted' });
  });

  // ── Submissions ──────────────────────────────────────────────────────────

  submitAssignment = asyncHandler(async (req, res) => {
    const { assignmentId, textResponse } = req.body;
    const fileUrl = req.file ? `/uploads/assignments/${req.file.filename}` : null;
    const fileName = req.file ? req.file.originalname : null;

    const submission = await assignmentService.submitAssignment(req.user.id, {
      assignmentId: parseInt(assignmentId),
      textResponse,
      fileUrl,
      fileName,
    });

    res.status(201).json({ success: true, message: 'Submission received', data: submission });
  });

  getSubmissionsByAssignment = asyncHandler(async (req, res) => {
    const submissions = await assignmentService.getSubmissionsByAssignment(
      parseInt(req.params.assignmentId),
      req.user.id,
      req.user.role
    );
    res.json({ success: true, data: submissions });
  });

  getMySubmissions = asyncHandler(async (req, res) => {
    const submissions = await assignmentService.getMySubmissions(req.user.id);
    res.json({ success: true, data: submissions });
  });

  // ── Grades ───────────────────────────────────────────────────────────────

  gradeSubmission = asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { submissionId, mark, feedback } = req.body;
    const grade = await assignmentService.gradeSubmission(req.user.id, {
      submissionId: parseInt(submissionId),
      mark: parseInt(mark),
      feedback,
    });

    res.status(201).json({ success: true, message: 'Submission graded', data: grade });
  });

  getGrade = asyncHandler(async (req, res) => {
    const grade = await assignmentService.getGrade(parseInt(req.params.submissionId));
    res.json({ success: true, data: grade });
  });
}

module.exports = new AssignmentController();
