const userRepository = require('../repositories/userRepository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserService {
  // Public registration - students only
  async registerUser(userData) {
    const { email, password, firstName, lastName } = userData;

    // Public registration is restricted to students only
    const role = 'student';

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      const error = new Error('User with this email already exists');
      error.statusCode = 400;
      throw error;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = await userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role
    });

    // Get created user (without password)
    const user = await userRepository.findById(userId);

    // Generate token
    const token = this.generateToken(user);

    return { user, token };
  }

  // Admin-only: register an instructor
  async registerInstructor(userData) {
    const { email, password, firstName, lastName } = userData;

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      const error = new Error('User with this email already exists');
      error.statusCode = 400;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = await userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'instructor'
    });

    const user = await userRepository.findById(userId);
    return { user };
  }

  async loginUser(email, password) {
    const user = await userRepository.findByEmail(email);
    
    if (!user) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      const error = new Error('Invalid credentials');
      error.statusCode = 401;
      throw error;
    }

    // Remove password from response
    delete user.password;

    // Generate token
    const token = this.generateToken(user);

    return { user, token };
  }

  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    return user;
  }

  async getAllUsers(filters) {
    return await userRepository.findAll(filters);
  }

  async updateUser(id, updateData) {
    const user = await userRepository.findById(id);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const allowedFields = ['firstName', 'lastName', 'profilePicture', 'password'];
    updateData = Object.fromEntries(
      Object.entries(updateData).filter(([key]) => allowedFields.includes(key))
    );

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    await userRepository.update(id, updateData);
    return await userRepository.findById(id);
  }

  async deleteUser(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    await userRepository.delete(id);
  }

  generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  }
}

module.exports = new UserService();
