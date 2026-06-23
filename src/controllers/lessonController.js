const lessonService = require('../services/lessonService');

class LessonController {
  async createLesson(req, res, next) {
    try {
      const { courseId } = req.params;
      const lessonData = { ...req.body, course_id: parseInt(courseId) };

      // Handle media uploads via req.files if applicable
      // Multer will place files in req.files
      if (req.files) {
        if (req.files.video) lessonData.video_url = `/uploads/lessons/video/${req.files.video[0].filename}`;
        if (req.files.audio) lessonData.audio_url = `/uploads/lessons/audio/${req.files.audio[0].filename}`;
        if (req.files.document) lessonData.document_url = `/uploads/lessons/docs/${req.files.document[0].filename}`;
      }

      // Convert "true" / "false" from FormData
      if (lessonData.is_published === 'true') lessonData.is_published = true;
      if (lessonData.is_published === 'false') lessonData.is_published = false;

      const lesson = await lessonService.createLesson(req.user, lessonData);

      res.status(201).json({ success: true, data: lesson });
    } catch (error) {
      next(error);
    }
  }

  async getCourseLessons(req, res, next) {
    try {
      const { courseId } = req.params;
      // Depending on requirements, we might need to verify if user is enrolled
      // to see non-published lessons or video URLs, but for now we'll return all
      // We will filter published on frontend or in service based on role.
      const lessons = await lessonService.getLessonsByCourse(parseInt(courseId));
      
      // If student, only return published lessons
      let filteredLessons = lessons;
      if (req.user && req.user.role === 'student') {
        filteredLessons = lessons.filter(l => l.is_published);
      }

      res.status(200).json({ success: true, data: filteredLessons });
    } catch (error) {
      next(error);
    }
  }

  async updateLesson(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      if (req.files) {
        if (req.files.video) updateData.video_url = `/uploads/lessons/video/${req.files.video[0].filename}`;
        if (req.files.audio) updateData.audio_url = `/uploads/lessons/audio/${req.files.audio[0].filename}`;
        if (req.files.document) updateData.document_url = `/uploads/lessons/docs/${req.files.document[0].filename}`;
      }

      if (updateData.is_published === 'true') updateData.is_published = true;
      if (updateData.is_published === 'false') updateData.is_published = false;

      const updatedLesson = await lessonService.updateLesson(req.user, parseInt(id), updateData);
      
      res.status(200).json({ success: true, data: updatedLesson });
    } catch (error) {
      next(error);
    }
  }

  async deleteLesson(req, res, next) {
    try {
      const { id } = req.params;
      await lessonService.deleteLesson(req.user, parseInt(id));
      res.status(200).json({ success: true, message: 'Lesson deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LessonController();
