const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const paymentRepository = require('../repositories/paymentRepository');
const courseRepository = require('../repositories/courseRepository');
const enrollmentRepository = require('../repositories/enrollmentRepository');
const ApiError = require('../utils/ApiError');
const { createNotification } = require('../utils/notificationHelper');

class PaymentService {
  /**
   * Create a Stripe Checkout Session for a paid course.
   * Returns { sessionId, url } so the client can redirect.
   */
  async createCheckoutSession(studentId, courseId, baseUrl) {
    const course = await courseRepository.findById(courseId);
    if (!course) throw new ApiError('Course not found', 404);
    if (course.is_free) throw new ApiError('This course is free — enrol directly', 400);
    if (course.status !== 'published') throw new ApiError('Course is not available', 400);

    // Prevent double-payment
    const existing = await enrollmentRepository.findByStudentAndCourse(studentId, courseId);
    if (existing) throw new ApiError('You are already enrolled in this course', 400);

    const amountCents = Math.round(parseFloat(course.price) * 100);
    if (amountCents <= 0) throw new ApiError('Invalid course price', 400);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: course.title, description: course.description || '' },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: { studentId: String(studentId), courseId: String(courseId) },
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancel`,
    });

    // Record pending payment
    await paymentRepository.create({
      studentId,
      courseId,
      stripeSessionId: session.id,
      amount: course.price,
      currency: 'usd',
    });

    return { sessionId: session.id, url: session.url };
  }

  /**
   * Handle Stripe webhook events.
   * Must be called with the raw request body for signature verification.
   */
  async handleWebhook(rawBody, signature) {
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      throw new ApiError(`Webhook signature verification failed: ${err.message}`, 400);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      await this._handleSuccessfulPayment(session);
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      await paymentRepository.markFailed(event.data.object.id);
    }

    return { received: true };
  }

  async _handleSuccessfulPayment(session) {
    const { studentId, courseId } = session.metadata;
    const sId = parseInt(studentId);
    const cId = parseInt(courseId);

    // Mark payment success
    await paymentRepository.markSuccess(session.id, session.payment_intent);

    // Enrol student automatically
    const existing = await enrollmentRepository.findByStudentAndCourse(sId, cId);
    if (!existing) {
      await enrollmentRepository.create(sId, cId);
      // Update payment_status on enrollment
      await require('../config/database').pool.execute(
        `UPDATE enrollments SET payment_status = 'paid' WHERE student_id = ? AND course_id = ?`,
        [sId, cId]
      );
    }

    // Notify instructor
    const course = await courseRepository.findById(cId);
    if (course) {
      await createNotification({
        userId: course.instructor_id,
        message: `A new student enrolled in "${course.title}" via payment.`,
        type: 'new_enrollment',
        referenceId: cId,
        referenceType: 'course',
      });
    }
  }

  async getPaymentHistory(studentId) {
    return paymentRepository.findByStudent(studentId);
  }

  async getAllTransactions({ page, limit }) {
    return paymentRepository.findAll({ page, limit });
  }

  async getRevenueStats() {
    const total = await paymentRepository.getTotalRevenue();
    const perCourse = await paymentRepository.getRevenuePerCourse();
    return { totalRevenue: total, perCourse };
  }
}

module.exports = new PaymentService();
