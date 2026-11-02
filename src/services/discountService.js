import api from "./api";

/**
 * discountService.js
 *
 * Backend base: /api/v1/discounts
 *
 * PUBLIC:
 *   GET  /api/v1/discounts              → all active discounts
 *   GET  /api/v1/discounts/:code        → discount by code
 *
 * ADMIN ONLY:
 *   POST /api/v1/discounts/             → create discount
 *   GET  /api/v1/discounts              → sent links + status counts (admin)
 *   POST /api/v1/discounts/:id/resend   → email the same link again
 *   PUT  /api/v1/discounts/:id          → update discount
 *   DELETE /api/v1/discounts/:id        → delete discount
 */

const discountService = {
    // Public
    getAll: () => api.get("/discounts"),
    getByCode: (code) => api.get(`/discounts/${code}`),
    verifyToken: (token) => api.get(`/discounts/verify/${token}`),
    // Public offer landing page (no login)
    getOffer: (token) => api.get(`/discounts/offer/${encodeURIComponent(token)}`),

    // Admin only
    create: (data) => api.post("/discounts", data),
    createDiscountLink: (data) => api.post("/discounts", data),
    // Sent links: ?search &status (active | used | expired) &course_id &page &limit
    getAllAdmin: (params = {}) => api.get("/discounts", { params }),
    // Email the same link again; { extend_hours } gives it a new expiry
    resend: (id, data = {}) => api.post(`/discounts/${id}/resend`, data),
    update: (id, data) => api.put(`/discounts/${id}`, data),
    delete: (id) => api.delete(`/discounts/${id}`),
};

export default discountService;
