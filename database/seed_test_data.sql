USE lms_database;

-- Create a test course (instructor id=4)
INSERT INTO courses (title, description, instructor_id, category, level, price, is_free, status)
VALUES ('Introduction to Web Development', 'Learn HTML, CSS and JavaScript from scratch.', 4, 'Technology', 'beginner', 0.00, 1, 'published');

SET @course_id = LAST_INSERT_ID();

-- Create a module
INSERT INTO modules (course_id, title, order_index)
VALUES (@course_id, 'Getting Started', 1);

SET @module_id = LAST_INSERT_ID();

-- Create 4 lessons
INSERT INTO lessons (module_id, course_id, title, content_text, order_index, duration)
VALUES
(@module_id, @course_id, 'Introduction to HTML', 'Learn the basics of HTML structure.', 1, 30),
(@module_id, @course_id, 'CSS Fundamentals', 'Styling your pages with CSS.', 2, 45),
(@module_id, @course_id, 'JavaScript Basics', 'Adding interactivity with JS.', 3, 60),
(@module_id, @course_id, 'Building Your First Project', 'Put it all together.', 4, 90);

-- Enroll Lily (id=6) in the course
INSERT INTO enrollments (student_id, course_id, progress, status, payment_status)
VALUES (6, @course_id, 0.00, 'active', 'free');

-- Mark lesson 1 as completed for Lily
INSERT INTO lesson_progress (student_id, lesson_id, course_id)
SELECT 6, id, @course_id FROM lessons WHERE course_id = @course_id AND order_index = 1;

-- Update progress to 25% (1 of 4 lessons)
UPDATE enrollments SET progress = 25.00 WHERE student_id = 6 AND course_id = @course_id;

-- Create an assignment
INSERT INTO assignments (course_id, title, description, due_date, max_score, created_by)
VALUES (@course_id, 'HTML Portfolio Page', 'Build a personal portfolio page using HTML only.', DATE_ADD(NOW(), INTERVAL 3 DAY), 100, 4);
