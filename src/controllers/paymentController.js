const paymentService = require('../services/paymentService');
const asyncHandler = require('../utils/asyncHandler');

class PaymentController {
  /**
   * POST /api/payment/create-session
   * Body: { courseId }
   * Returns Stripe checkout session URL.
   */
  createSession = asyncHandler(async (req, res) => {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required' });
    }

    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const session = await paymentService.createCheckoutSession(
      req.user.id,
      parseInt(courseId),
      baseUrl
    );

    res.status(201).json({ success: true, data: session });
  });

  /**
   * POST /api/payment/demo-checkout
   * Body: { courseId }
   */
  demoCheckout = asyncHandler(async (req, res) => {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required' });
    }

    const result = await paymentService.processDemoCheckout(req.user.id, parseInt(courseId));
    res.status(200).json(result);
  });

  /**
   * POST /api/payment/webhook
   * Raw body required — express.raw() is applied at route level.
   */
  handleWebhook = asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const result = await paymentService.handleWebhook(req.body, sig);
    res.json(result);
  });

  /**
   * GET /api/payment/history  — student's payment receipts
   */
  getPaymentHistory = asyncHandler(async (req, res) => {
    const history = await paymentService.getPaymentHistory(req.user.id);
    res.json({ success: true, data: history });
  });

  /**
   * GET /api/payment/transactions  — admin: all transactions
   */
  getAllTransactions = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const transactions = await paymentService.getAllTransactions({
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json({ success: true, data: transactions });
  });

  /**
   * GET /api/payment/revenue  — admin: revenue stats
   */
  getRevenueStats = asyncHandler(async (req, res) => {
    const stats = await paymentService.getRevenueStats();
    res.json({ success: true, data: stats });
  });
}

module.exports = new PaymentController();
