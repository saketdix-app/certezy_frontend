import api from "./api";

/**
 * integrationService.js — 2.0 lead integrations (Admins)
 *   GET  /integrations                   → { integrations, events }
 *   PUT  /integrations/:source           → { enabled?, config?: { form_courses, default_course_id } }
 *   POST /integrations/events/:id/retry
 *   POST /integrations/linkedin/sync
 */
const integrationService = {
    status: () => api.get("/integrations"),
    save: (source, data) => api.put(`/integrations/${source}`, data),
    retry: (eventId) => api.post(`/integrations/events/${eventId}/retry`),
    syncLinkedIn: () => api.post("/integrations/linkedin/sync"),
};

export default integrationService;
