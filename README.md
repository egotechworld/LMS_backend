# LMS Backend - Learning Management System

Backend API built with Node.js, Express.js and MySQL Server following layered architecture.

## Architecture

```
src/
├── config/          # Configuration files (database, cors)
├── controllers/     # Request handlers
├── services/        # Business logic layer
├── repositories/    # Data access layer
├── middlewares/     # Custom middleware (auth, error handling)
├── routes/          # API route definitions
└── server.js        # Application entry point
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd LMS_backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and update with your MySQL credentials:
```bash
copy .env.example .env
```

Edit `.env`:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lms_database
JWT_SECRET=your_secret_key_here
```

### 3. Create Database
Run the SQL schema file in your MySQL Server:
```bash
mysql -u root -p < database/schema.sql
```

Or manually execute the `database/schema.sql` file in MySQL Workbench.

### 4. Start Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:5000`

## API Endpoints

### Users
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)

### Courses
- `GET /api/courses` - Get all courses (with filters)
- `GET /api/courses/:id` - Get course by ID
- `POST /api/courses` - Create course (Instructor/Admin)
- `PUT /api/courses/:id` - Update course (Instructor/Admin)
- `DELETE /api/courses/:id` - Delete course (Instructor/Admin)

### Enrollments
- `POST /api/enrollments` - Enroll in course
- `GET /api/enrollments/my-enrollments` - Get student's enrollments
- `GET /api/enrollments/course/:courseId` - Get course enrollments
- `DELETE /api/enrollments/course/:courseId` - Unenroll from course

## User Roles
- **student** - Can view courses and enroll
- **instructor** - Can create and manage courses
- **admin** - Full system access

## Default Admin Credentials
- Email: `admin@lms.com`
- Password: `admin123`

## Tech Stack
- Node.js & Express.js
- MySQL Server (mysql2 driver)
- JWT Authentication
- bcryptjs for password hashing
- express-validator for input validation
