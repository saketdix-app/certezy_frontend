import api from "./api";

/**
 * certificateService.js
 *
 * Backend base: /api/v1/certificates
 *
 * STUDENT:
 *   GET  /api/v1/certificates                  → my certificates
 *   POST /api/v1/certificates/claim/:courseId  → get / issue my certificate for a finished course
 *
 * PUBLIC:
 *   GET  /api/v1/certificates/verify/:certNo   → verify a certificate number
 *
 * PUBLIC:
 *   GET  /api/v1/certificates/:id      → download certificate
 *
 * ADMIN ONLY:
 *   POST /api/v1/certificates/issue    → issue certificate
 *   GET  /api/v1/certificates/admin/all → all certificates (admin view)
 *   DELETE /api/v1/certificates/:id     → revoke certificate
 */

const certificateService = {
    // GET /certificates — student ke saare certificates
    getMyCertificates: () => api.get("/certificates"),
    claim: (courseId) => api.post(`/certificates/claim/${courseId}`),
    verify: (certificateNo) => api.get(`/certificates/verify/${encodeURIComponent(certificateNo)}`),

    // Public
    download: (id) => api.get(`/certificates/${id}`, { responseType: "blob" }),

    // Admin only
    // { user_id, course_id, issue_date?: "YYYY-MM-DD" }
    issue: (data) => api.post("/certificates/issue", data),
    // ?search (student, email, course, certificate no.) &page &limit
    getAllAdmin: (params = {}) => api.get("/certificates/admin/all", { params }),
    revoke: (id) => api.delete(`/certificates/${id}`),
};

export default certificateService;
