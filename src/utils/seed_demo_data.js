const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedDemoData() {
  try {
    console.log('Seeding demo data...');

    // 1. Create Instructor
    const passwordHash = await bcrypt.hash('password123', 10);
    let instructorId;
    const [[existingInstructor]] = await pool.query('SELECT id FROM users WHERE email = "instructor@demo.com"');
    
    if (existingInstructor) {
      instructorId = existingInstructor.id;
    } else {
      const [result] = await pool.query(
        `INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)`,
        ['Demo', 'Instructor', 'instructor@demo.com', passwordHash, 'instructor']
      );
      instructorId = result.insertId;
    }

    // 2. Create Courses
    const courses = [
      {
        title: 'Fullstack React & Node.js Masterclass',
        description: 'Learn how to build scalable fullstack applications from scratch using React, Node.js, Express, and MySQL.',
        price: 9900,
        level: 'intermediate',
        duration: 1200,
        thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=800&auto=format&fit=crop'
      },
      {
        title: 'UI/UX Design for Developers',
        description: 'Master the fundamentals of design, typography, and color theory to make your apps look incredible.',
        price: 0,
        level: 'beginner',
        duration: 400,
        thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=800&auto=format&fit=crop'
      }
    ];

    for (const c of courses) {
      const [[existingCourse]] = await pool.query('SELECT id FROM courses WHERE title = ?', [c.title]);
      let courseId;
      if (existingCourse) {
        courseId = existingCourse.id;
      } else {
        const [res] = await pool.query(
          `INSERT INTO courses (instructor_id, title, description, is_free, price, category, level, duration, thumbnail, is_published)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [instructorId, c.title, c.description, c.price === 0, c.price, c.title.includes('Design') ? 'Design' : 'Programming', c.level, c.duration, c.thumbnail, true]
        );
        courseId = res.insertId;
        
        // 3. Create Lessons for this course
        const lessons = [
          {
            title: 'Introduction & Setup',
            content: 'Welcome to the course! In this lesson we will set up our development environment.\n\nPlease download the attached notes.',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            order_index: 0
          },
          {
            title: 'Core Fundamentals',
            content: 'Let us dive into the core concepts you need to understand before building complex apps.',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            order_index: 1
          },
          {
            title: 'Advanced Techniques',
            content: 'This audio lesson covers some theoretical advanced topics.',
            audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
            order_index: 2
          }
        ];

        for (const l of lessons) {
          await pool.query(
            `INSERT INTO lessons (course_id, title, content, video_url, audio_url, order_index, is_published)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [courseId, l.title, l.content, l.video_url || null, l.audio_url || null, l.order_index, true]
          );
        }
      }
    }

    console.log('✅ Demo data seeded successfully!');
  } catch (error) {
    console.error('❌ Failed to seed data:', error);
  }
}

module.exports = seedDemoData;
