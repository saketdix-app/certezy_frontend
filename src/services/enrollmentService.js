import api from "./api";

/**
 * enrollmentService.js
 *
 * Base: /api/v1/enrollments
 *
 * STUDENT:
 *   GET  /api/v1/enrollments          → my enrolled courses (with progress)
 *   GET  /api/v1/enrollments/:courseId → am I enrolled in this course?
 *   POST /api/v1/enrollments/free/:courseId → enrol in a FREE course (no checkout)
 *
 * ADMIN:
 *   GET    /api/v1/enrollments/admin/all          → all enrollments with filters
 *   GET    /api/v1/enrollments/admin/stats        → status / country / course totals
 *   GET    /api/v1/enrollments/admin/export       → CSV of the filtered enrollments
 *
 * FREE COURSE ASSIGNMENT (admin, sub-admin with "manage students"):
 *   GET    /api/v1/enrollments/admin/courses      → courses that can be assigned (?search)
 *   GET    /api/v1/enrollments/admin/user/:userId → one user's courses + how each was granted
 *   POST   /api/v1/enrollments/admin/assign       → { user_id, course_ids[], note } — ₹0, no payment
 *   DELETE /api/v1/enrollments/admin/:id          → revoke a free (admin-assigned) enrollment
 */

const enrollmentService = {
    // GET /enrollments — the signed-in student's courses
    getMyEnrollments: () => api.get("/enrollments"),

    // GET /enrollments/:courseId — check if enrolled
    checkEnrollment: (courseId) => api.get(`/enrollments/${courseId}`),

    // POST /enrollments/free/:courseId — instant enrolment for free courses
    enrollFree: (courseId) => api.post(`/enrollments/free/${courseId}`),

    // Admin: list / stats / CSV export — all take the same filters:
    // search, course_id, country (e.g. "IN", "unknown"), status
    // (completed | in_progress | not_started | inactive), source, from, to (YYYY-MM-DD)
    getAllEnrollments: (params = {}) => api.get("/enrollments/admin/all", { params }),
    getEnrollmentStats: (params = {}) => api.get("/enrollments/admin/stats", { params }),
    exportEnrollments: (params = {}) =>
        api.get("/enrollments/admin/export", { params, responseType: "blob" }),

    // Free course assignment
    getAssignableCourses: (search) =>
        api.get("/enrollments/admin/courses", { params: search ? { search } : {} }),
    getUserEnrollments: (userId) => api.get(`/enrollments/admin/user/${userId}`),
    assignCourses: ({ userId, courseIds, note }) =>
        api.post("/enrollments/admin/assign", { user_id: userId, course_ids: courseIds, note }),
    revokeEnrollment: (enrollmentId) => api.delete(`/enrollments/admin/${enrollmentId}`),
};

export default enrollmentService;
