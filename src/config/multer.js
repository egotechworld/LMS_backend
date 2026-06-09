const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/ApiError');

/**
 * Builds a reusable Multer instance for a given upload sub-folder.
 *
 * @param {object} opts
 * @param {string}   opts.folder        Sub-folder inside uploads/ (e.g. 'assignments')
 * @param {string[]} opts.allowedMimes  Accepted MIME types
 * @param {number}   opts.maxSizeBytes  Max file size in bytes
 * @returns {multer.Multer}
 */
const buildUploader = ({ folder, allowedMimes, maxSizeBytes }) => {
  const uploadDir = path.join(__dirname, '../../uploads', folder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });

  const fileFilter = (_req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(`File type not allowed. Accepted: ${allowedMimes.join(', ')}`, 400), false);
    }
  };

  return multer({ storage, fileFilter, limits: { fileSize: maxSizeBytes } });
};

// ── Pre-built uploaders for each domain ─────────────────────────────────────

/** Assignment reference files & student submission files */
const assignmentUploader = buildUploader({
  folder: 'assignments',
  allowedMimes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
  ],
  maxSizeBytes: 20 * 1024 * 1024, // 20 MB
});

/** Lesson video uploads */
const videoUploader = buildUploader({
  folder: 'videos',
  allowedMimes: ['video/mp4'],
  maxSizeBytes: 500 * 1024 * 1024, // 500 MB
});

/** Lesson audio uploads */
const audioUploader = buildUploader({
  folder: 'audio',
  allowedMimes: ['audio/mpeg', 'audio/mp3'],
  maxSizeBytes: 50 * 1024 * 1024, // 50 MB
});

/** Lesson note / paper / document uploads */
const documentUploader = buildUploader({
  folder: 'documents',
  allowedMimes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  maxSizeBytes: 20 * 1024 * 1024, // 20 MB
});

module.exports = { buildUploader, assignmentUploader, videoUploader, audioUploader, documentUploader };
