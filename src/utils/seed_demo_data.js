const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
];

const ACCOUNTS = [
  { email: 'admin@lms.com', password: 'Admin123!', firstName: 'Priya', lastName: 'Kapoor', role: 'admin' },
  { email: 'maya.chen@lms.com', password: 'Teach123!', firstName: 'Maya', lastName: 'Chen', role: 'instructor' },
  { email: 'james.okonkwo@lms.com', password: 'Teach123!', firstName: 'James', lastName: 'Okonkwo', role: 'instructor' },
  { email: 'alex.rivera@lms.com', password: 'Learn123!', firstName: 'Alex', lastName: 'Rivera', role: 'student' },
  { email: 'sofia.berg@lms.com', password: 'Learn123!', firstName: 'Sofia', lastName: 'Berg', role: 'student' },
  { email: 'noah.patel@lms.com', password: 'Learn123!', firstName: 'Noah', lastName: 'Patel', role: 'student' },
];

async function upsertUser({ email, password, firstName, lastName, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const [[existing]] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    await pool.query(
      'UPDATE users SET password = ?, first_name = ?, last_name = ?, role = ? WHERE id = ?',
      [passwordHash, firstName, lastName, role, existing.id]
    );
    return existing.id;
  }
  const [result] = await pool.query(
    'INSERT INTO users (email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)',
    [email, passwordHash, firstName, lastName, role]
  );
  return result.insertId;
}

async function findCourseId(title) {
  const [[row]] = await pool.query('SELECT id FROM courses WHERE title = ?', [title]);
  return row ? row.id : null;
}

async function insertCourse(instructorId, course) {
  const existingId = await findCourseId(course.title);
  if (existingId) return existingId;
  const [result] = await pool.query(
    `INSERT INTO courses
      (title, description, instructor_id, category, duration, level, thumbnail, price, currency, is_free, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'usd', ?, ?)`,
    [
      course.title,
      course.description,
      instructorId,
      course.category,
      course.duration,
      course.level,
      course.thumbnail,
      course.price,
      course.price === 0 ? 1 : 0,
      course.status,
    ]
  );
  return result.insertId;
}

async function insertModule(courseId, title, orderIndex) {
  const [[existing]] = await pool.query(
    'SELECT id FROM modules WHERE course_id = ? AND title = ?',
    [courseId, title]
  );
  if (existing) return existing.id;
  const [result] = await pool.query(
    'INSERT INTO modules (course_id, title, description, order_index) VALUES (?, ?, ?, ?)',
    [courseId, title, `${title} for this course.`, orderIndex]
  );
  return result.insertId;
}

async function insertLesson(courseId, moduleId, lesson, orderIndex) {
  const [[existing]] = await pool.query(
    'SELECT id FROM lessons WHERE course_id = ? AND title = ?',
    [courseId, lesson.title]
  );
  if (existing) return existing.id;
  const [result] = await pool.query(
    `INSERT INTO lessons
      (module_id, course_id, title, content, video_url, audio_url, document_url, order_index, duration, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      moduleId,
      courseId,
      lesson.title,
      lesson.content,
      lesson.video_url || SAMPLE_VIDEOS[orderIndex % SAMPLE_VIDEOS.length],
      lesson.audio_url || null,
      null,
      orderIndex,
      lesson.duration || 25,
    ]
  );
  return result.insertId;
}

async function enroll(studentId, courseId, extras = {}) {
  const [[existing]] = await pool.query(
    'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
    [studentId, courseId]
  );
  if (existing) {
    await pool.query(
      'UPDATE enrollments SET progress = ?, status = ?, payment_status = ? WHERE id = ?',
      [extras.progress ?? 0, extras.status || 'active', extras.payment_status || 'free', existing.id]
    );
    return existing.id;
  }
  const [result] = await pool.query(
    `INSERT INTO enrollments (student_id, course_id, progress, status, payment_status)
     VALUES (?, ?, ?, ?, ?)`,
    [studentId, courseId, extras.progress ?? 0, extras.status || 'active', extras.payment_status || 'free']
  );
  return result.insertId;
}

async function completeLessons(studentId, courseId, count) {
  const [lessons] = await pool.query(
    'SELECT id FROM lessons WHERE course_id = ? ORDER BY order_index ASC',
    [courseId]
  );
  for (const lesson of lessons.slice(0, count)) {
    await pool.query(
      'INSERT IGNORE INTO lesson_progress (student_id, lesson_id, course_id) VALUES (?, ?, ?)',
      [studentId, lesson.id, courseId]
    );
  }
}

async function insertAssignment(courseId, createdBy, assignment) {
  const [[existing]] = await pool.query(
    'SELECT id FROM assignments WHERE course_id = ? AND title = ?',
    [courseId, assignment.title]
  );
  if (existing) return existing.id;
  const [result] = await pool.query(
    `INSERT INTO assignments (course_id, title, description, due_date, max_score, created_by)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), ?, ?)`,
    [courseId, assignment.title, assignment.description, assignment.dueInDays, assignment.maxScore || 100, createdBy]
  );
  return result.insertId;
}

async function insertSubmission(assignmentId, studentId, payload) {
  const [[existing]] = await pool.query(
    'SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?',
    [assignmentId, studentId]
  );
  if (existing) return existing.id;
  const [result] = await pool.query(
    `INSERT INTO submissions (assignment_id, student_id, file_name, text_response, is_late)
     VALUES (?, ?, ?, ?, ?)`,
    [assignmentId, studentId, payload.fileName, payload.textResponse, payload.isLate ? 1 : 0]
  );
  return result.insertId;
}

async function insertGrade(submissionId, mark, feedback, gradedBy) {
  const [[existing]] = await pool.query('SELECT id FROM grades WHERE submission_id = ?', [submissionId]);
  if (existing) return existing.id;
  const [result] = await pool.query(
    'INSERT INTO grades (submission_id, mark, feedback, graded_by) VALUES (?, ?, ?, ?)',
    [submissionId, mark, feedback, gradedBy]
  );
  return result.insertId;
}

async function insertQuiz(lessonId, courseId, createdBy, quiz) {
  const [[existing]] = await pool.query('SELECT id FROM quizzes WHERE lesson_id = ?', [lessonId]);
  if (existing) return existing.id;
  const [result] = await pool.query(
    `INSERT INTO quizzes (lesson_id, course_id, title, time_limit_minutes, allow_retake, total_marks, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [lessonId, courseId, quiz.title, quiz.timeLimit || 15, quiz.allowRetake ? 1 : 0, quiz.totalMarks, createdBy]
  );
  return result.insertId;
}

async function insertQuestion(quizId, question, orderIndex) {
  const [[existing]] = await pool.query(
    'SELECT id FROM quiz_questions WHERE quiz_id = ? AND question_text = ?',
    [quizId, question.question_text]
  );
  if (existing) return existing.id;
  const [result] = await pool.query(
    `INSERT INTO quiz_questions
      (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, order_index)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      quizId,
      question.question_text,
      question.option_a,
      question.option_b,
      question.option_c,
      question.option_d,
      question.correct_option,
      question.marks || 1,
      orderIndex,
    ]
  );
  return result.insertId;
}

async function insertPaidOrder(studentId, courseId, amount) {
  const [[existing]] = await pool.query(
    'SELECT id FROM orders WHERE student_id = ? AND course_id = ? AND status = ?',
    [studentId, courseId, 'paid']
  );
  if (existing) return existing.id;
  const [result] = await pool.query(
    `INSERT INTO orders
      (student_id, course_id, stripe_session_id, amount, currency, status, paid_at)
     VALUES (?, ?, ?, ?, 'usd', 'paid', NOW())`,
    [studentId, courseId, `seed_sess_${studentId}_${courseId}`, amount]
  );
  return result.insertId;
}

async function insertNotification(userId, message, type) {
  const [[existing]] = await pool.query(
    'SELECT id FROM notifications WHERE user_id = ? AND message = ?',
    [userId, message]
  );
  if (existing) return;
  await pool.query(
    'INSERT INTO notifications (user_id, message, type, is_read) VALUES (?, ?, ?, 0)',
    [userId, message, type]
  );
}

async function seedDemoData() {
  console.log('Seeding realistic demo data...');

  const ids = {};
  for (const account of ACCOUNTS) {
    ids[account.email] = await upsertUser(account);
  }

  const mayaId = ids['maya.chen@lms.com'];
  const jamesId = ids['james.okonkwo@lms.com'];
  const alexId = ids['alex.rivera@lms.com'];
  const sofiaId = ids['sofia.berg@lms.com'];
  const noahId = ids['noah.patel@lms.com'];

  const jsCourseId = await insertCourse(mayaId, {
    title: 'Modern JavaScript from Zero to Production',
    description:
      'Build production-ready JavaScript apps: language fundamentals, async patterns, testing, and a small Node API. Aimed at career-switchers who already know basic HTML/CSS.',
    category: 'Programming',
    duration: 18,
    level: 'intermediate',
    thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?q=80&w=1200&auto=format&fit=crop',
    price: 4900,
    status: 'published',
  });

  const uiCourseId = await insertCourse(mayaId, {
    title: 'Accessible UI Design for Developers',
    description:
      'Learn contrast, typography, spacing, and keyboard access so your interfaces work for more people. No design-tool license required.',
    category: 'Design',
    duration: 8,
    level: 'beginner',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=1200&auto=format&fit=crop',
    price: 0,
    status: 'published',
  });

  await insertCourse(mayaId, {
    title: 'Advanced React Patterns',
    description: 'Compound components, render props, and state machines. Draft — not yet in the public catalogue.',
    category: 'Programming',
    duration: 10,
    level: 'advanced',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1200&auto=format&fit=crop',
    price: 8900,
    status: 'draft',
  });

  const sqlCourseId = await insertCourse(jamesId, {
    title: 'Practical SQL for Analysts',
    description:
      'Query real tables with SELECT, JOIN, GROUP BY, and window functions. Uses MySQL so the examples match this LMS stack.',
    category: 'Data',
    duration: 12,
    level: 'beginner',
    thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?q=80&w=1200&auto=format&fit=crop',
    price: 0,
    status: 'published',
  });

  const pythonCourseId = await insertCourse(jamesId, {
    title: 'Python for Data Pipelines',
    description:
      'Move files, clean messy CSVs, and schedule a small ETL job. Assumes you can write a for-loop and open a terminal.',
    category: 'Data',
    duration: 16,
    level: 'intermediate',
    thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?q=80&w=1200&auto=format&fit=crop',
    price: 7900,
    status: 'published',
  });

  const jsFoundations = await insertModule(jsCourseId, 'Language foundations', 1);
  const jsAsync = await insertModule(jsCourseId, 'Async and APIs', 2);
  const jsLessons = [
    { moduleId: jsFoundations, title: 'Values, types, and equality', content: 'Walk through primitives vs objects, == vs ===, and why JSON.stringify surprises people.', duration: 22 },
    { moduleId: jsFoundations, title: 'Functions, scope, and closures', content: 'Build a small counter with a closure, then compare var/let/const in the debugger.', duration: 28 },
    { moduleId: jsAsync, title: 'Promises and async/await', content: 'Convert a callback-style fetch into async/await and handle rejection without a blank screen.', duration: 30 },
    { moduleId: jsAsync, title: 'Talking to a REST API', content: 'GET a course list, POST an enrollment, and map HTTP errors to user-facing messages.', duration: 35 },
  ];
  const jsLessonIds = [];
  for (let i = 0; i < jsLessons.length; i += 1) {
    jsLessonIds.push(await insertLesson(jsCourseId, jsLessons[i].moduleId, jsLessons[i], i + 1));
  }

  const uiModule = await insertModule(uiCourseId, 'Foundations', 1);
  const uiLessons = [
    { title: 'Contrast, type, and spacing', content: 'Audit a grey-on-grey form and fix it with a 4pt spacing scale and WCAG contrast.', duration: 20 },
    { title: 'Keyboard and screen-reader paths', content: 'Tab through a modal, add labels, and confirm focus returns to the trigger.', duration: 24 },
    { title: 'States: hover, error, empty, loading', content: 'Design the four states every list view needs before you ship.', duration: 18 },
  ];
  const uiLessonIds = [];
  for (let i = 0; i < uiLessons.length; i += 1) {
    uiLessonIds.push(await insertLesson(uiCourseId, uiModule, uiLessons[i], i + 1));
  }

  const sqlModule = await insertModule(sqlCourseId, 'Querying tables', 1);
  const sqlLessons = [
    { title: 'SELECT, WHERE, and ORDER BY', content: 'Filter enrollments by status and sort by enrolled_at without scanning the whole table mentally.', duration: 25 },
    { title: 'JOINs across users and courses', content: 'Build the instructor dashboard query: courses plus enrollment counts.', duration: 32 },
    { title: 'GROUP BY and window functions', content: 'Rank students by quiz score inside each course using window functions.', duration: 28 },
    { title: 'Indexes you actually need', content: 'Add the unique enrollment pair and an email lookup index, then EXPLAIN the login query.', duration: 20 },
  ];
  const sqlLessonIds = [];
  for (let i = 0; i < sqlLessons.length; i += 1) {
    sqlLessonIds.push(await insertLesson(sqlCourseId, sqlModule, sqlLessons[i], i + 1));
  }

  const pyModule = await insertModule(pythonCourseId, 'Building a pipeline', 1);
  const pyLessons = [
    { title: 'Reading messy CSVs', content: 'Handle missing headers, mixed encodings, and dates that are actually strings.', duration: 26 },
    { title: 'Transform and validate rows', content: 'Drop duplicates, coerce types, and fail the job when required columns are absent.', duration: 30 },
    { title: 'Writing to MySQL in batches', content: 'Insert 10k rows with executemany and a transaction so a mid-run crash does not leave half a table.', duration: 34 },
  ];
  for (let i = 0; i < pyLessons.length; i += 1) {
    await insertLesson(pythonCourseId, pyModule, pyLessons[i], i + 1);
  }

  await enroll(alexId, jsCourseId, { progress: 50, status: 'active', payment_status: 'paid' });
  await enroll(alexId, sqlCourseId, { progress: 100, status: 'completed', payment_status: 'free' });
  await enroll(sofiaId, uiCourseId, { progress: 33.33, status: 'active', payment_status: 'free' });
  await enroll(sofiaId, jsCourseId, { progress: 25, status: 'active', payment_status: 'paid' });
  await enroll(noahId, pythonCourseId, { progress: 0, status: 'active', payment_status: 'paid' });
  await enroll(noahId, sqlCourseId, { progress: 50, status: 'active', payment_status: 'free' });

  await insertPaidOrder(alexId, jsCourseId, 4900);
  await insertPaidOrder(sofiaId, jsCourseId, 4900);
  await insertPaidOrder(noahId, pythonCourseId, 7900);

  await completeLessons(alexId, jsCourseId, 2);
  await completeLessons(alexId, sqlCourseId, 4);
  await completeLessons(sofiaId, uiCourseId, 1);
  await completeLessons(sofiaId, jsCourseId, 1);
  await completeLessons(noahId, sqlCourseId, 2);

  const jsAssignmentId = await insertAssignment(jsCourseId, mayaId, {
    title: 'Build a tiny course catalogue API',
    description: 'Expose GET /courses and POST /enrollments. Return JSON errors with a message and status code. Submit a short write-up of your route map.',
    dueInDays: 5,
  });
  const uiAssignmentId = await insertAssignment(uiCourseId, mayaId, {
    title: 'Redesign a broken settings form',
    description: 'Take the attached (imaginary) settings page and list 8 accessibility or spacing fixes. Screenshot before/after if you can.',
    dueInDays: 3,
  });
  const sqlAssignmentId = await insertAssignment(sqlCourseId, jamesId, {
    title: 'Write the student dashboard query',
    description: 'Return enrolled courses with progress and the next assignment due in 7 days. Paste the SQL and a sample result set.',
    dueInDays: -2,
  });

  const alexJsSubmission = await insertSubmission(jsAssignmentId, alexId, {
    fileName: 'alex-catalogue-api.md',
    textResponse: 'Routes: GET /courses (published only), POST /enrollments (auth required). Errors use { message, code }. Tests cover 401 and duplicate enrollment.',
    isLate: false,
  });
  await insertGrade(
    alexJsSubmission,
    92,
    'Clear route map and you handled the duplicate-enrollment case. Next time add a rate-limit note.',
    mayaId
  );

  await insertSubmission(uiAssignmentId, sofiaId, {
    fileName: 'sofia-settings-audit.md',
    textResponse: 'Missing labels on two inputs, 3.1:1 contrast on helper text, submit button not in tab order, error text not linked with aria-describedby.',
    isLate: false,
  });

  const alexSqlSubmission = await insertSubmission(sqlAssignmentId, alexId, {
    fileName: 'alex-dashboard.sql',
    textResponse: 'JOIN enrollments to courses and assignments, filter due_date window, LEFT JOIN submissions for status. Sample attached in comments.',
    isLate: true,
  });
  await insertGrade(
    alexSqlSubmission,
    88,
    'Query is correct. Late, but the LEFT JOIN for submission status is exactly what production uses.',
    jamesId
  );

  const jsQuizId = await insertQuiz(jsLessonIds[0], jsCourseId, mayaId, {
    title: 'Values and equality check',
    timeLimit: 10,
    totalMarks: 3,
  });
  await insertQuestion(jsQuizId, {
    question_text: 'Which comparison is almost always the right default in application code?',
    option_a: '== so that "5" and 5 match',
    option_b: '=== so type and value both match',
    option_c: 'Object.is except for NaN',
    option_d: 'A custom equals() on every object',
    correct_option: 'b',
  }, 1);
  await insertQuestion(jsQuizId, {
    question_text: 'What does JSON.stringify do with undefined object properties?',
    option_a: 'Writes them as "undefined"',
    option_b: 'Writes them as null',
    option_c: 'Omits them from the output',
    option_d: 'Throws a TypeError',
    correct_option: 'c',
  }, 2);
  await insertQuestion(jsQuizId, {
    question_text: 'Which value is a primitive in JavaScript?',
    option_a: 'Array',
    option_b: 'Date',
    option_c: 'Symbol',
    option_d: 'Map',
    correct_option: 'c',
  }, 3);

  const sqlQuizId = await insertQuiz(sqlLessonIds[1], sqlCourseId, jamesId, {
    title: 'JOIN basics',
    timeLimit: 8,
    totalMarks: 2,
  });
  await insertQuestion(sqlQuizId, {
    question_text: 'Which JOIN keeps courses that have zero enrollments?',
    option_a: 'INNER JOIN enrollments',
    option_b: 'LEFT JOIN enrollments',
    option_c: 'CROSS JOIN enrollments',
    option_d: 'RIGHT JOIN users',
    correct_option: 'b',
  }, 1);
  await insertQuestion(sqlQuizId, {
    question_text: 'Why does this LMS unique-index enrollments on (student_id, course_id)?',
    option_a: 'Faster password hashing',
    option_b: 'So a student cannot enroll in the same course twice',
    option_c: 'To allow duplicate rows for refunds',
    option_d: 'MySQL requires two-column indexes',
    correct_option: 'b',
  }, 2);

  await insertNotification(mayaId, 'Alex Rivera enrolled in Modern JavaScript from Zero to Production', 'enrollment');
  await insertNotification(mayaId, 'Sofia Berg submitted Redesign a broken settings form', 'submission_received');
  await insertNotification(jamesId, 'Alex Rivera submitted Write the student dashboard query', 'submission_received');
  await insertNotification(alexId, 'Your assignment Build a tiny course catalogue API was graded 92/100', 'assignment_graded');
  await insertNotification(alexId, 'Quiz available: Values and equality check', 'quiz_available');
  await insertNotification(sofiaId, 'New assignment: Redesign a broken settings form — due in 3 days', 'assignment_created');
  await insertNotification(noahId, 'You are enrolled in Python for Data Pipelines', 'enrollment');

  console.log('Demo accounts (local / Docker only):');
  for (const account of ACCOUNTS) {
    console.log(`  ${account.role.padEnd(11)} ${account.email.padEnd(24)} ${account.password}  (${account.firstName} ${account.lastName})`);
  }
  console.log('Demo data seeded successfully.');
}

module.exports = seedDemoData;
module.exports.ACCOUNTS = ACCOUNTS;

if (require.main === module) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Failed to seed data:', error);
      process.exit(1);
    });
}
