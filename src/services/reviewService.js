import api from "./api";

/**
 * reviewService.js — /api/v1/reviews
 *
 * PUBLIC
 *   GET    /reviews/featured                  latest approved reviews (homepage)
 *   GET    /reviews/:courseIdOrSlug           { rating_avg, rating_count, distribution, reviews, pagination }
 *                                             ?page&limit&rating (filter by star)
 * STUDENT
 *   POST   /reviews                           { course_id, rating 1–5, comment? }
 *   GET    /reviews/course/:courseId/mine     my review, including one awaiting approval
 *   PUT    /reviews/course/:courseId/mine     edit my review { rating, comment? }
 * ADMIN
 *   GET    /reviews/admin/all                 ?page&limit&is_approved&course_id
 *   GET    /reviews/admin/pending             ?limit
 *   PUT    /reviews/:id/approval              { is_approved: 0 | 1 }
 *   GET    /reviews/admin/sources             { platform: "Verified Certezy learner", classroom: … }
 *   POST   /reviews/admin                     add a genuine review collected outside the site
 *                                             { course_id, reviewer_name, rating, comment?, source,
 *                                               source_note?, reviewed_at?, is_approved?, confirm_genuine: true }
 *   PUT    /reviews/admin/:id                 edit an admin-entered review
 *   DELETE /reviews/:id
 */

const reviewService = {
    // Public
    getFeaturedReviews: (limit = 6) => api.get("/reviews/featured", { params: { limit } }),
    getCourseReviews: (courseId, params = {}) => api.get(`/reviews/${courseId}`, { params }),

    // Student
    createReview: (data) => api.post("/reviews", data),
    getMyReview: (courseId) => api.get(`/reviews/course/${courseId}/mine`),
    updateMyReview: (courseId, data) => api.put(`/reviews/course/${courseId}/mine`, data),

    // Admin
    getAllReviews: (params = {}) => api.get("/reviews/admin/all", { params }),
    getPendingReviews: (limit = 10) => api.get("/reviews/admin/pending", { params: { limit } }),
    updateReviewApproval: (id, { is_approved }) => api.put(`/reviews/${id}/approval`, { is_approved }),
    approveReview: (id) => api.put(`/reviews/${id}/approval`, { is_approved: 1 }),
    rejectReview: (id) => api.put(`/reviews/${id}/approval`, { is_approved: 0 }),
    deleteReview: (id) => api.delete(`/reviews/${id}`),
    getSources: () => api.get("/reviews/admin/sources"),
    createAdminReview: (data) => api.post("/reviews/admin", data),
    updateAdminReview: (id, data) => api.put(`/reviews/admin/${id}`, data),
};

export default reviewService;
