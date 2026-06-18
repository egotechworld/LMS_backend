USE lms_database;

-- Insert admin (password: admin123)
INSERT IGNORE INTO users (email, password, first_name, last_name, role) VALUES
('admin@lms.com', '$2a$10$XQeJvC8Z0xKz7g4r5.Hju.8VQWqZ8RrPjK1vM8KcX9YGzHJb3l3Te', 'Admin', 'User', 'admin');

-- Insert instructor (password: test1234)
INSERT IGNORE INTO users (email, password, first_name, last_name, role) VALUES
('instructor@lms.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'John', 'Instructor', 'instructor');

-- Insert student (password: test1234)
INSERT IGNORE INTO users (email, password, first_name, last_name, role) VALUES
('student@lms.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Jane', 'Student', 'student');
