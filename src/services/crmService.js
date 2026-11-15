import api from "./api";

/**
 * crmService.js — 2.0 lead CRM (consultants: own leads; admins: all)
 *
 * Backend base: /api/v1/crm
 *   GET   /dashboard                 → { kpis, today, overdue }
 *   GET   /leads                     → { leads, counts, pagination } (?stage&search&source&course_id&owner_id&follow_up&page)
 *   POST  /leads                     → create (409 + details.duplicates when the person exists)
 *   GET   /leads/:id                 → lead + timeline + follow-ups + allowed next stages
 *   PATCH /leads/:id                 → edit contact details
 *   POST  /leads/:id/stage           → { stage, reason? }
 *   POST  /leads/:id/activities      → { type: note|call|message|email|whatsapp, body, outcome? }
 *   POST  /leads/:id/follow-ups      → { due_at, type, note? }
 *   GET   /follow-ups                → (?when=today|overdue|upcoming&owner_id)
 *   PATCH /follow-ups/:id            → { status: done|missed|cancelled, outcome? }
 *   GET   /owners                    → people a lead can be assigned to (admins)
 */
const crmService = {
    dashboard: () => api.get("/crm/dashboard"),
    list: (params) => api.get("/crm/leads", { params }),
    get: (id) => api.get(`/crm/leads/${id}`),
    create: (data) => api.post("/crm/leads", data),
    update: (id, data) => api.patch(`/crm/leads/${id}`, data),
    changeStage: (id, stage, reason) => api.post(`/crm/leads/${id}/stage`, { stage, reason }),
    logActivity: (id, data) => api.post(`/crm/leads/${id}/activities`, data),
    scheduleFollowUp: (id, data) => api.post(`/crm/leads/${id}/follow-ups`, data),
    followUps: (params) => api.get("/crm/follow-ups", { params }),
    completeFollowUp: (id, status, outcome) => api.patch(`/crm/follow-ups/${id}`, { status, outcome }),
    owners: () => api.get("/crm/owners"),
};

export default crmService;
