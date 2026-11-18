import api from "./api";

/**
 * teamService.js — 2.0 staff accounts (Super Admin, Admin, Sub-Admin, Consultant)
 *
 * Backend base: /api/v1/admin/team
 *   GET    /                                   → { members, me }  (?role&status&search)
 *   GET    /audit                              → { logs, pagination } (?action&target_id&page)
 *   GET    /:id                                → member + privilege history
 *   POST   /                                   → create + email invitation
 *   POST   /:id/resend-invite
 *   PUT    /:id/permissions                   → Sub-Admin / Consultant permissions
 *   PUT    /:id/allocation                    → Consultant: receive leads, pause, leave, limits
 *   PATCH  /:id/role                           → { role, password? }
 *   PATCH  /:id/status                         → { is_active }
 *   POST   /:id/privileges/super-admin-create  → { password }  (grant)
 *   DELETE /:id/privileges/super-admin-create  → { password }  (revoke)
 *
 * `password` is the signed-in person's own password, asked again for
 * sensitive changes (Super Admin creation/promotion, privilege changes).
 */
const teamService = {
    list: (params) => api.get("/admin/team", { params }),
    get: (id) => api.get(`/admin/team/${id}`),
    audit: (params) => api.get("/admin/team/audit", { params }),
    create: (data) => api.post("/admin/team", data),
    resendInvite: (id) => api.post(`/admin/team/${id}/resend-invite`),
    setPermissions: (id, permissions) => api.put(`/admin/team/${id}/permissions`, permissions),
    setAllocation: (id, data) => api.put(`/admin/team/${id}/allocation`, data),
    changeRole: (id, data) => api.patch(`/admin/team/${id}/role`, data),
    setStatus: (id, is_active) => api.patch(`/admin/team/${id}/status`, { is_active }),
    // Open leads / exams a person still has, and moving them (before blocking, deleting, a role change)
    handoverInfo: (id) => api.get(`/admin/team/${id}/handover`),
    handover: (id, data) => api.post(`/admin/team/${id}/handover`, data),
    // { confirm_email, handover? } — soft delete; refused while open leads / exams remain
    remove: (id, data) => api.delete(`/admin/team/${id}`, { data }),
    grantSuperAdminCreate: (id, password) =>
        api.post(`/admin/team/${id}/privileges/super-admin-create`, { password }),
    revokeSuperAdminCreate: (id, password) =>
        api.delete(`/admin/team/${id}/privileges/super-admin-create`, { data: { password } }),
};

export default teamService;
