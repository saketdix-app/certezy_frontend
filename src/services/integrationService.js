import api from "./api";

/**
 * integrationService.js — 2.0 lead integrations (Admins)
 *   GET  /integrations                   → { integrations, events }
 *   PUT  /integrations/:source           → { enabled?, config?: { form_courses, default_course_id } }
 *   POST /integrations/events/:id/retry
 *   POST /integrations/linkedin/sync
 *   PUT  /integrations/:source/credentials → { values: { key: string ('' removes) }, password } (Super Admin)
 *   POST /integrations/:source/test        → { ok, message }
 *   POST /integrations/:source/connect     → { url }  (Super Admin + password; meta | linkedin)
 *   POST /integrations/:source/oauth       → { code | error, state } → done | choose | redirect
 *   POST /integrations/:source/oauth/choose → { selection, id }
 */
const integrationService = {
    status: () => api.get("/integrations"),
    save: (source, data) => api.put(`/integrations/${source}`, data),
    alerts: () => api.get("/integrations/alerts"),
    retry: (eventId) => api.post(`/integrations/events/${eventId}/retry`),
    retryFailed: (source) => api.post(`/integrations/${source}/retry-failed`),
    syncLinkedIn: () => api.post("/integrations/linkedin/sync"),
    saveKeys: (source, values, password) => api.put(`/integrations/${source}/credentials`, { values, password }),
    test: (source) => api.post(`/integrations/${source}/test`),
    connect: (source, password) => api.post(`/integrations/${source}/connect`, { password }),
    finishConnect: (source, body) => api.post(`/integrations/${source}/oauth`, body),
    chooseConnect: (source, body) => api.post(`/integrations/${source}/oauth/choose`, body),
};

export default integrationService;
