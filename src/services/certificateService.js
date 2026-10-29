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
 *   PUT  /api/v1/certificates/:id/revoke → revoke certificate
 */

const certificateService = {
    // GET /certificates — student ke saare certificates
    getMyCertificates: () => api.get("/certificates"),
    claim: (courseId) => api.post(`/certificates/claim/${courseId}`),
    verify: (certificateNo) => api.get(`/certificates/verify/${encodeURIComponent(certificateNo)}`),

    // Public
    download: (id) => api.get(`/certificates/${id}`, { responseType: "blob" }),

    // Admin only
    issue: (data) => api.post("/certificates/issue", data),
    getAllAdmin: () => api.get("/certificates/admin/all"),
    revoke: (id) => api.put(`/certificates/${id}/revoke`),
};

export default certificateService;
