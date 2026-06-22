const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
    if (file.fieldname === 'video') {
      if (/mp4|webm|mkv/.test(file.mimetype)) return cb(null, true);
      return cb(new Error('Invalid video format'), false);
    }
    if (file.fieldname === 'audio') {
      if (/mp3|wav|ogg/.test(file.mimetype)) return cb(null, true);
      return cb(new Error('Invalid audio format'), false);
    }
    if (file.fieldname === 'document') {
      if (/pdf|doc|docx|ppt|pptx/.test(file.mimetype) || /pdf/.test(file.originalname)) return cb(null, true);
      return cb(new Error('Invalid document format'), false);
    }
    cb(null, true);
  }
});

module.exports = {
  thumbnailUpload,
  lessonUpload
};
