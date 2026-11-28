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
 *   GET   /consultants/progress      → per consultant: leads per stage, follow-ups, client discussion (admins)
 *   GET   /exam-coordinators         → active Exam Coordinators;  PUT /leads/:id/exam-coordinator, PUT /leads/:id/exam
 *   POST  /leads/:id/student-account | assign-course | discount-link | certificate   (phase 5)
 *   GET   /sales, /discounts, /assignments, /certificates;  GET/PUT /settings
 *   POST  /leads/assign(/preview)    → { lead_ids, owner_id, reason?, mode? } assign / transfer / rebalance
 *   GET   /distribution              → pools + Round Robin switch;  PUT /distribution/settings
 *   POST/PUT/DELETE /distribution/pools(/:id), POST /distribution/run, GET /distribution/report
 */
const crmService = {
    dashboard: () => api.get("/crm/dashboard"),
    list: (params) => api.get("/crm/leads", { params }),
    // Pipeline board (new design): { columns: [{ stage, count, totals, leads }], money_visible }
    pipeline: (params) => api.get("/crm/leads/pipeline", { params }),
    // Sales dashboard (new design): ?months=3|6|12&owner_id
    salesDashboard: (params) => api.get("/crm/sales-dashboard", { params }),
    consultantProgress: () => api.get("/crm/consultants/progress"),
    get: (id) => api.get(`/crm/leads/${id}`),
    create: (data) => api.post("/crm/leads", data),
    update: (id, data) => api.patch(`/crm/leads/${id}`, data),
    // { stage, reason?, ticket_size?, ticket_currency? } — Application needs the ticket size
    // extra: { ticket_size, ticket_currency } for Application, { exam_scheduled_at } for Exam Scheduled
    changeStage: (id, stage, reason, extra) => api.post(`/crm/leads/${id}/stage`, { stage, reason, ...(extra ?? {}) }),
    // { submitted, submitted_at } — consultant / Admin
    updateApplication: (id, data) => api.put(`/crm/leads/${id}/application`, data),
    // { status: due|done, paid_at?, reference? } — Payment Done moves the lead to Course Done
    updatePayment: (id, data) => api.put(`/crm/leads/${id}/payment`, data),
    // Super Admin only: delete leads for good (password required)
    deleteLeads: (lead_ids, password) => api.post("/crm/leads/delete", { lead_ids, password }),
    // My leads I haven't opened since they were assigned (red dot); a background poll
    newCount: () => api.get("/crm/leads/new-count", { background: true }),
    // Saved WhatsApp / email messages ({ channel, title, subject?, body, shared? })
    templates: () => api.get("/crm/templates"),
    createTemplate: (data) => api.post("/crm/templates", data),
    updateTemplate: (id, data) => api.put(`/crm/templates/${id}`, data),
    deleteTemplate: (id) => api.delete(`/crm/templates/${id}`),
    // CERTEZY Team app: latest APK ({ version, version_code, apk_url, notes })
    appRelease: () => api.get("/crm/app-release"),
    saveAppRelease: (data) => api.put("/crm/app-release", data),
    // Upload leads from a CSV: { csv, dry_run, default_source, course_id, owner_mode, owner_id }
    importLeads: (data) => api.post("/crm/leads/import", data),
    examCoordinators: () => api.get("/crm/exam-coordinators"),
    setExamCoordinator: (id, exam_coordinator_id) => api.put(`/crm/leads/${id}/exam-coordinator`, { exam_coordinator_id }),
    // { status: not_scheduled|scheduled|rescheduled|cancelled, scheduled_at?, exam_done?, completed_at?, result?, note? }
    updateExam: (id, data) => api.put(`/crm/leads/${id}/exam`, data),
    logActivity: (id, data) => api.post(`/crm/leads/${id}/activities`, data),
    scheduleFollowUp: (id, data) => api.post(`/crm/leads/${id}/follow-ups`, data),
    followUps: (params) => api.get("/crm/follow-ups", { params }),
    completeFollowUp: (id, status, outcome) => api.patch(`/crm/follow-ups/${id}`, { status, outcome }),
    owners: () => api.get("/crm/owners"),

    // Phase 4 — distribution (Admins)
    previewMove: (data) => api.post("/crm/leads/assign/preview", data),
    move: (data) => api.post("/crm/leads/assign", data),
    distribution: () => api.get("/crm/distribution"),

    // Phase 5 — CRM → LMS actions and sales
    studentAccount: (id) => api.post(`/crm/leads/${id}/student-account`),
    assignCourse: (id, data) => api.post(`/crm/leads/${id}/assign-course`, data),
    sendDiscount: (id, data) => api.post(`/crm/leads/${id}/discount-link`, data),
    issueCertificate: (id, data) => api.post(`/crm/leads/${id}/certificate`, data),
    revokeDiscount: (id, reason) => api.post(`/crm/discounts/${id}/revoke`, { reason }),
    discounts: () => api.get("/crm/discounts"),
    assignments: () => api.get("/crm/assignments"),
    certificates: () => api.get("/crm/certificates"),
    sales: (params) => api.get("/crm/sales", { params }),
    settings: () => api.get("/crm/settings"),
    // Phase 8 — WhatsApp and automations
    whatsappThread: (id) => api.get(`/crm/leads/${id}/whatsapp`),
    whatsappSend: (id, data) => api.post(`/crm/leads/${id}/whatsapp`, data),
    whatsappTemplates: () => api.get("/crm/whatsapp/templates"),
    automations: () => api.get("/crm/automations"),
    saveAutomations: (data) => api.put("/crm/automations", data),
    // Phase 6 — reports (Admins)
    reportOverview: (params) => api.get("/crm/reports/overview", { params }),
    exportLeads: (params) => api.get("/crm/reports/leads.csv", { params, responseType: "blob" }),
    reportCalls: (params) => api.get("/crm/reports/calls", { params }),
    reportFollowUps: (params) => api.get("/crm/reports/follow-ups", { params }),
    reportTeam: (params) => api.get("/crm/reports/team", { params }),
    // Call recordings (Super Admins only)
    listRecordings: (params) => api.get("/crm/recordings", { params }),
    recordingLink: (id, params) => api.get(`/crm/recordings/${id}/link`, { params }),
    deleteRecording: (id) => api.delete(`/crm/recordings/${id}`),
    saveSettings: (data) => api.put("/crm/settings", data),
    setRoundRobin: (enabled) => api.put("/crm/distribution/settings", { round_robin_enabled: enabled }),
    savePool: (id, data) => (id ? api.put(`/crm/distribution/pools/${id}`, data) : api.post("/crm/distribution/pools", data)),
    deletePool: (id) => api.delete(`/crm/distribution/pools/${id}`),
    distributeQueue: () => api.post("/crm/distribution/run"),
    report: (params) => api.get("/crm/distribution/report", { params }),
};

export default crmService;
