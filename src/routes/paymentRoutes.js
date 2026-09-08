const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const requireDemoCheckoutEnabled = (_req, res, next) => {
  const enabled = process.env.NODE_ENV !== 'production'
    && process.env.ENABLE_DEMO_CHECKOUT === 'true';
  if (!enabled) {
    return res.status(404).json({
      success: false,
      message: 'Route not found',
      code: 'ROUTE_NOT_FOUND',
      errors: [],
    });
  }
  next();
};

// ── Webhook — MUST use raw body, no JSON parse ────────────────────────────────
// Mounted before express.json() in server.js
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleWebhook
);

// ── Student routes ────────────────────────────────────────────────────────────

// POST /api/payment/create-session  — initiate Stripe checkout
router.post(
  '/create-session',
  authenticate,
  authorize('student'),
  paymentController.createSession
);

// POST /api/payment/demo-checkout  — bypass Stripe for testing
router.post(
  '/demo-checkout',
  requireDemoCheckoutEnabled,
  authenticate,
  authorize('student'),
  paymentController.demoCheckout
);

// GET /api/payment/history  — student's payment receipts
router.get(
  '/history',
  authenticate,
  authorize('student'),
  paymentController.getPaymentHistory
);

// ── Admin routes ──────────────────────────────────────────────────────────────

// GET /api/payment/transactions
router.get(
  '/transactions',
  authenticate,
  authorize('admin'),
  paymentController.getAllTransactions
);

// GET /api/payment/revenue
router.get(
  '/revenue',
  authenticate,
  authorize('admin'),
  paymentController.getRevenueStats
);

module.exports = router;
