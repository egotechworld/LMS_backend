const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/ApiError');

const createUploadDir = (dir) => {
  const uploadDir = path.join(__dirname, '../../uploads', dir);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  return uploadDir;
};

const thumbnailsDir = createUploadDir('thumbnails');
const videoDir = createUploadDir('lessons/video');
const audioDir = createUploadDir('lessons/audio');
const docsDir = createUploadDir('lessons/docs');

// Thumbnails
const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, thumbnailsDir),
  filename: (req, file, cb) => cb(null, 'course-' + Date.now() + path.extname(file.originalname))
});
const thumbnailUpload = multer({
  storage: thumbnailStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|webp/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed!'), false);
  }
});

// Lesson Media
const lessonStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') cb(null, videoDir);
    else if (file.fieldname === 'audio') cb(null, audioDir);
    else cb(null, docsDir);
  },
  filename: (req, file, cb) => cb(null, 'lesson-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
});

const lessonUpload = multer({
  storage: lessonStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // Overall max 500MB (handled per field normally, but multer limits apply to all)
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === 'video') {
      if (file.mimetype === 'video/mp4' && extension === '.mp4') return cb(null, true);
      return cb(new ApiError('Video must be an MP4 file', 400, 'INVALID_VIDEO_TYPE'), false);
    }
    if (file.fieldname === 'audio') {
      if (['audio/mpeg', 'audio/mp3'].includes(file.mimetype) && extension === '.mp3') return cb(null, true);
      return cb(new ApiError('Audio must be an MP3 file', 400, 'INVALID_AUDIO_TYPE'), false);
    }
    if (file.fieldname === 'document') {
      const documentTypes = new Map([
        ['.pdf', ['application/pdf']],
        ['.docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']],
        ['.pptx', ['application/vnd.openxmlformats-officedocument.presentationml.presentation']],
      ]);
      if (documentTypes.get(extension)?.includes(file.mimetype)) return cb(null, true);
      return cb(new ApiError('Document must be PDF, DOCX, or PPTX', 400, 'INVALID_DOCUMENT_TYPE'), false);
    }
    cb(new ApiError('Unexpected upload field', 400, 'UNEXPECTED_UPLOAD_FIELD'), false);
  }
});

const lessonFileLimits = {
  video: 500 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  document: 20 * 1024 * 1024,
};

const removeUploadedFiles = (files = {}) => {
  Object.values(files).flat().forEach((file) => {
    if (file?.path) fs.rm(file.path, { force: true }, () => {});
  });
};

const validateLessonFileSizes = (req, _res, next) => {
  for (const [field, files] of Object.entries(req.files || {})) {
    const limit = lessonFileLimits[field];
    if (!limit || files.some((file) => file.size > limit)) {
      removeUploadedFiles(req.files);
      return next(new ApiError(
        `${field} exceeds its maximum allowed size`,
        400,
        'UPLOAD_TOO_LARGE'
      ));
    }
  }
  next();
};

module.exports = {
  thumbnailUpload,
  lessonUpload,
  validateLessonFileSizes,
  removeUploadedFiles,
};
