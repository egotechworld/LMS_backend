const COOKIE_NAME = process.env.NODE_ENV === 'production'
  ? '__Host-lms_session'
  : 'lms_session';

const parseDuration = (value = '7d') => {
  const match = /^(\d+)([smhd])$/.exec(String(value).trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number(match[1]) * multipliers[match[2]];
};

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: parseDuration(process.env.JWT_EXPIRES_IN),
});

const setAuthCookie = (res, token) => res.cookie(COOKIE_NAME, token, cookieOptions());

const clearAuthCookie = (res) => {
  const { maxAge: _maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE_NAME, options);
};

module.exports = { COOKIE_NAME, setAuthCookie, clearAuthCookie };
