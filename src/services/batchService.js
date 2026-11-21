import api from "./api";

/**
 * batchService.js — live batches
 *   GET    /batches                      → upcoming published batches (public)
 *   POST   /batches/:id/enroll           → { name, email, phone, company?, experience_years?, message?, consent, website }
 *   GET    /batches/admin                → all batches with enrolled / unassigned counts (Admins)
 *   POST   /batches/admin, PUT /batches/admin/:id, DELETE /batches/admin/:id
 *   GET    /batches/admin/:id/enrollments → { batch, enrollments } with each lead's owner and stage
 */
const batchService = {
    upcoming: () => api.get("/batches"),
    enroll: (id, data) => api.post(`/batches/${id}/enroll`, data),
    adminList: () => api.get("/batches/admin"),
    create: (data) => api.post("/batches/admin", data),
    update: (id, data) => api.put(`/batches/admin/${id}`, data),
    remove: (id) => api.delete(`/batches/admin/${id}`),
    enrollments: (id) => api.get(`/batches/admin/${id}/enrollments`),
};

export default batchService;
