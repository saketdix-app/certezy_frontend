import api from "./api";

/**
 * enrollmentService.js
 *
 * Base: /api/v1/enrollments
 *
 * STUDENT:
 *   GET  /api/v1/enrollments          → my enrolled courses (with progress)
 *   GET  /api/v1/enrollments/:courseId → am I enrolled in this course?
 *
 * ADMIN:
 *   GET    /api/v1/enrollments/admin/all          → all enrollments with filters
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

    // Admin endpoints as specified
    getAllEnrollments: (params = {}) => {
        // Support ?course_id=123 filter
        const queryParams = new URLSearchParams();
        if (params.course_id) queryParams.append("course_id", params.course_id);
        if (params.search) queryParams.append("search", params.search);
        if (params.page) queryParams.append("page", params.page);
        if (params.limit) queryParams.append("limit", params.limit);

        const url = `/enrollments/admin/all${queryParams.toString() ? "?" + queryParams.toString() : ""}`;
        return api.get(url);
    },

    // Not implemented on the backend yet; EnrollmentsPage handles the failure
    getEnrollmentStats: () => api.get("/enrollments/admin/stats"),

    // Free course assignment
    getAssignableCourses: (search) =>
        api.get("/enrollments/admin/courses", { params: search ? { search } : {} }),
    getUserEnrollments: (userId) => api.get(`/enrollments/admin/user/${userId}`),
    assignCourses: ({ userId, courseIds, note }) =>
        api.post("/enrollments/admin/assign", { user_id: userId, course_ids: courseIds, note }),
    revokeEnrollment: (enrollmentId) => api.delete(`/enrollments/admin/${enrollmentId}`),
};

export default enrollmentService;
