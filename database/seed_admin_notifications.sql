USE lms_database;

INSERT INTO notifications (user_id, message, type, is_read, created_at) VALUES
(10, 'New user registered: lily.ins2@gmail.com (Instructor)', 'general', 0, NOW() - INTERVAL 1 HOUR),
(10, 'New course published: ''Introduction to Web Development''', 'general', 0, NOW() - INTERVAL 2 HOUR),
(10, 'New student enrolled in a course', 'enrollment', 0, NOW() - INTERVAL 3 HOUR),
(10, 'Payment received: Rs. 2,500 for Advanced Mathematics', 'general', 1, NOW() - INTERVAL 1 DAY),
(10, 'System: 3 new users registered this week', 'general', 1, NOW() - INTERVAL 2 DAY);
