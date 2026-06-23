const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const corsMiddleware = require('./config/cors');
const { testConnection, pool } = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');

// Load environment variables
dotenv.config();

// ── Route imports ─────────────────────────────────────────────────────────────
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const quizRoutes = require('./routes/quizRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const progressRoutes = require('./routes/progressRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(corsMiddleware);

// ── Stripe webhook must receive raw body — register BEFORE express.json() ─────
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static uploads (serve uploaded files) ────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', message: 'LMS Backend is running' });
});

// Catch-all 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` }
  });
});

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await testConnection();
    require('./utils/phase1_migration')();
    require('./utils/alter_lesson_progress')();
    require('./utils/phase2_migration')();
    require('./utils/alter_lessons_table')();
    require('./utils/seed_demo_data')();
    
    // DB Test
    setTimeout(async () => {
      try {
        const fs = require('fs');
        const [c] = await pool.query('SELECT * FROM courses WHERE id = 3');
        const [u] = await pool.query('SELECT * FROM users');
        fs.writeFileSync('f:/LMSEGO/LMS_Backend/test_debug.json', JSON.stringify({ courses: c, users: u }));
      } catch (e) {
        const fs = require('fs');
        fs.writeFileSync('f:/LMSEGO/LMS_Backend/test_debug.json', JSON.stringify({ error: e.message }));
      }
    }, 2000);

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
