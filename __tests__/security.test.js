process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-with-sufficient-length';
process.env.JWT_EXPIRES_IN = '1h';
process.env.ENABLE_DEMO_CHECKOUT = 'false';

const jwt = require('jsonwebtoken');

jest.mock('../src/services/userService', () => ({
  loginUser: jest.fn(),
  registerUser: jest.fn(),
  registerInstructor: jest.fn(),
  getUserById: jest.fn(),
  getAllUsers: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
}));

const request = require('supertest');
const userService = require('../src/services/userService');
const app = require('../src/server');

const user = {
  id: 7,
  email: 'student@example.test',
  first_name: 'Test',
  last_name: 'Student',
  role: 'student',
};

describe('cookie authentication security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userService.loginUser.mockResolvedValue({
      user,
      token: jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET),
    });
    userService.getUserById.mockResolvedValue(user);
  });

  test('login creates an HttpOnly SameSite cookie and does not expose the JWT', async () => {
    const response = await request(app)
      .post('/api/users/login')
      .send({ email: user.email, password: 'correct-password' })
      .expect(200);

    expect(response.body.data).toEqual({ user });
    expect(JSON.stringify(response.body)).not.toContain('eyJ');
    expect(response.headers['set-cookie'][0]).toMatch(/lms_session=.*HttpOnly.*SameSite=Strict/);
  });

  test('cookie restores the session and logout clears it', async () => {
    const agent = request.agent(app);
    await agent.post('/api/users/login')
      .send({ email: user.email, password: 'correct-password' })
      .expect(200);

    await agent.get('/api/users/me')
      .expect(200)
      .expect(({ body }) => expect(body.data.user.email).toBe(user.email));

    const logout = await agent.post('/api/users/logout').expect(200);
    expect(logout.headers['set-cookie'][0]).toMatch(/lms_session=;/);
  });

  test('Bearer tokens are not accepted as a fallback', async () => {
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET);
    await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401)
      .expect(({ body }) => expect(body.code).toBe('AUTH_REQUIRED'));
  });

  test('a user cannot read another user through the generic profile endpoint', async () => {
    const agent = request.agent(app);
    await agent.post('/api/users/login')
      .send({ email: user.email, password: 'correct-password' });
    await agent.get('/api/users/99')
      .expect(403)
      .expect(({ body }) => expect(body.code).toBe('USER_OWNERSHIP_REQUIRED'));
  });

  test('demo checkout is unavailable unless explicitly enabled outside production', async () => {
    await request(app)
      .post('/api/payment/demo-checkout')
      .send({ courseId: 1 })
      .expect(404)
      .expect(({ body }) => expect(body.code).toBe('ROUTE_NOT_FOUND'));
  });
});
