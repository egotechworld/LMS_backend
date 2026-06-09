const dashboardService = require('../services/dashboardService');
const asyncHandler = require('../utils/asyncHandler');

class DashboardController {
  /**
   * GET /api/dashboard/student
   */
  studentDashboard = asyncHandler(async (req, res) => {
    const data = await dashboardService.getStudentDashboard(req.user.id);
    res.json({ success: true, data });
  });

  /**
   * GET /api/dashboard/instructor
   */
  instructorDashboard = asyncHandler(async (req, res) => {
    const data = await dashboardService.getInstructorDashboard(req.user.id);
    res.json({ success: true, data });
  });

  /**
   * GET /api/dashboard/admin
   */
  adminDashboard = asyncHandler(async (req, res) => {
    const data = await dashboardService.getAdminDashboard();
    res.json({ success: true, data });
  });
}

module.exports = new DashboardController();
