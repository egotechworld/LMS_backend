USE lms_database;

-- Notifications for lilyins2 (id=9) - instructor
INSERT INTO notifications (user_id, message, type, is_read, created_at) VALUES
(9, 'New student enrolled in your course ''Introduction to Web Development''', 'enrollment', 0, NOW() - INTERVAL 2 HOUR),
(9, 'Lily Rose submitted ''HTML Portfolio Page'' assignment', 'submission_received', 0, NOW() - INTERVAL 1 DAY),
(9, 'Assignment deadline approaching: ''HTML Portfolio Page'' – due in 1 day', 'assignment_deadline', 0, NOW() - INTERVAL 1 DAY),
(9, 'Your course has been published successfully', 'general', 1, NOW() - INTERVAL 3 DAY),
(9, 'New student Lily Rose enrolled in your course', 'enrollment', 1, NOW() - INTERVAL 4 DAY);

-- Notifications for lily (id=6) - student
INSERT INTO notifications (user_id, message, type, is_read, created_at) VALUES
(6, 'New lesson added: ''CSS Fundamentals'' in Introduction to Web Development', 'lesson_added', 0, NOW() - INTERVAL 1 HOUR),
(6, 'Assignment created: ''HTML Portfolio Page'' – due in 3 days', 'assignment_created', 0, NOW() - INTERVAL 2 HOUR),
(6, 'Assignment deadline approaching: ''HTML Portfolio Page'' – due in 1 day', 'assignment_deadline', 0, NOW() - INTERVAL 1 DAY),
(6, 'A quiz is now available for lesson ''Introduction to HTML''', 'quiz_available', 1, NOW() - INTERVAL 2 DAY),
(6, 'Your assignment has been graded – score: 87/100', 'assignment_graded', 1, NOW() - INTERVAL 3 DAY);
