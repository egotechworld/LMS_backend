const dashboardRepository = require('../repositories/dashboardRepository');
const notificationRepository = require('../repositories/notificationRepository');

class DashboardService {
  async getStudentDashboard(studentId) {
    const data = await dashboardRepository.getStudentDashboard(studentId);
    const { notifications } = await require('./notificationService').getMyNotifications(
      studentId,
      { page: 1, limit: 5 }
    );
    return { ...data, recentNotifications: notifications };
  }

  async getInstructorDashboard(instructorId) {
    const data = await dashboardRepository.getInstructorDashboard(instructorId);
    const { notifications } = await require('./notificationService').getMyNotifications(
      instructorId,
      { page: 1, limit: 5 }
    );
    return { ...data, recentNotifications: notifications };
  }

  async getAdminDashboard() {
    return dashboardRepository.getAdminDashboard();
  }
}

module.exports = new DashboardService();
