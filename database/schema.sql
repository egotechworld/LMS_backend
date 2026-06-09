-- LMS Database Schema

CREATE DATABASE IF NOT EXISTS lms_database;
USE lms_database;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role ENUM('student', 'instructor', 'admin') DEFAULT 'student',
  profile_picture VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- ============================================================
-- COURSES
-- ============================================================
CREATE TABLE courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructor_id INT NOT NULL,
  category VARCHAR(100),
  duration INT COMMENT 'Duration in hours',
  level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
  thumbnail VARCHAR(255),
  price DECIMAL(10,2) DEFAULT 0.00,
  is_free TINYINT(1) DEFAULT 1,
  status ENUM('draft', 'published') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_instructor (instructor_id),
  INDEX idx_category (category),
  INDEX idx_status (status)
);

-- ============================================================
-- ENROLLMENTS
-- ============================================================
CREATE TABLE enrollments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  progress DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Progress percentage',
  status ENUM('active', 'completed', 'dropped') DEFAULT 'active',
  payment_status ENUM('free', 'paid') DEFAULT 'free',
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (student_id, course_id),
  INDEX idx_student (student_id),
  INDEX idx_course (course_id)
);

-- ============================================================
-- MODULES
-- ============================================================
CREATE TABLE modules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  INDEX idx_course (course_id)
);

-- ============================================================
-- LESSONS
-- ============================================================
CREATE TABLE lessons (
  id INT PRIMARY KEY AUTO_INCREMENT,
  module_id INT NOT NULL,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content_text TEXT,
  video_url VARCHAR(500),
  audio_url VARCHAR(500),
  order_index INT NOT NULL,
  duration INT COMMENT 'Duration in minutes',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  INDEX idx_module (module_id),
  INDEX idx_course (course_id)
);

-- ============================================================
-- LESSON FILES (notes, papers, resources)
-- ============================================================
CREATE TABLE lesson_files (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lesson_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type ENUM('note', 'paper', 'other') DEFAULT 'other',
  file_size INT COMMENT 'Size in bytes',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  INDEX idx_lesson (lesson_id)
);

-- ============================================================
-- LESSON PROGRESS
-- ============================================================
CREATE TABLE lesson_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  lesson_id INT NOT NULL,
  course_id INT NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_progress (student_id, lesson_id),
  INDEX idx_student (student_id),
  INDEX idx_lesson (lesson_id),
  INDEX idx_course (course_id)
);

-- ============================================================
-- ASSIGNMENTS
-- ============================================================
CREATE TABLE assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATETIME NOT NULL,
  file_url VARCHAR(500) COMMENT 'Optional reference file',
  file_name VARCHAR(255),
  max_score INT DEFAULT 100,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_course (course_id),
  INDEX idx_created_by (created_by)
);

-- ============================================================
-- SUBMISSIONS
-- ============================================================
CREATE TABLE submissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  assignment_id INT NOT NULL,
  student_id INT NOT NULL,
  file_url VARCHAR(500),
  file_name VARCHAR(255),
  text_response TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_late TINYINT(1) DEFAULT 0,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_submission (assignment_id, student_id),
  INDEX idx_assignment (assignment_id),
  INDEX idx_student (student_id)
);

-- ============================================================
-- GRADES
-- ============================================================
CREATE TABLE grades (
  id INT PRIMARY KEY AUTO_INCREMENT,
  submission_id INT NOT NULL UNIQUE,
  mark INT NOT NULL,
  feedback TEXT,
  graded_by INT NOT NULL,
  graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- QUIZZES  (one quiz per lesson, optional)
-- ============================================================
CREATE TABLE quizzes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lesson_id INT NOT NULL UNIQUE,
  course_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  time_limit_minutes INT DEFAULT 0 COMMENT '0 = no time limit',
  allow_retake TINYINT(1) DEFAULT 0,
  total_marks INT DEFAULT 0,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_lesson (lesson_id),
  INDEX idx_course (course_id),
  INDEX idx_created_by (created_by)
);

-- ============================================================
-- QUIZ QUESTIONS
-- ============================================================
CREATE TABLE quiz_questions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id INT NOT NULL,
  question_text TEXT NOT NULL,
  option_a VARCHAR(500) NOT NULL,
  option_b VARCHAR(500) NOT NULL,
  option_c VARCHAR(500) NOT NULL,
  option_d VARCHAR(500) NOT NULL,
  correct_option ENUM('a', 'b', 'c', 'd') NOT NULL,
  marks INT DEFAULT 1,
  order_index INT DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  INDEX idx_quiz (quiz_id)
);

-- ============================================================
-- QUIZ ATTEMPTS
-- ============================================================
CREATE TABLE quiz_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quiz_id INT NOT NULL,
  student_id INT NOT NULL,
  score INT DEFAULT 0,
  total_marks INT DEFAULT 0,
  is_submitted TINYINT(1) DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP NULL,
  option_maps JSON COMMENT 'Per-question display-key→original-key mapping for randomised options',
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_quiz (quiz_id),
  INDEX idx_student (student_id)
);

-- ============================================================
-- QUIZ ATTEMPT ANSWERS  (per-question answers in an attempt)
-- ============================================================
CREATE TABLE quiz_attempt_answers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  attempt_id INT NOT NULL,
  question_id INT NOT NULL,
  selected_option ENUM('a', 'b', 'c', 'd') NOT NULL,
  is_correct TINYINT(1) DEFAULT 0,
  marks_awarded INT DEFAULT 0,
  FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_answer (attempt_id, question_id),
  INDEX idx_attempt (attempt_id)
);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  stripe_payment_id VARCHAR(255),
  stripe_session_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'usd',
  status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  INDEX idx_student (student_id),
  INDEX idx_course (course_id),
  INDEX idx_stripe_session (stripe_session_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  message VARCHAR(500) NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  reference_id INT COMMENT 'ID of related entity (assignment, quiz, etc.)',
  reference_type VARCHAR(50) COMMENT 'Type of related entity',
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id),
  INDEX idx_is_read (is_read)
);

-- ============================================================
-- SEED: Admin user  (password: admin123)
-- ============================================================
INSERT INTO users (email, password, first_name, last_name, role) VALUES
('admin@lms.com', '$2a$10$XQeJvC8Z0xKz7g4r5.Hju.8VQWqZ8RrPjK1vM8KcX9YGzHJb3l3Te', 'Admin', 'User', 'admin');
