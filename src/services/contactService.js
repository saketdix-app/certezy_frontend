// src/services/contactService.js

import api from "./api";

/**
 * contactService.js
 *
 * Backend base: /api/v1/contact
 *
 * PUBLIC (optional auth — links user_id when signed in):
 *   POST  /api/v1/contact/create   → contact form submit
 *
 * ADMIN ONLY:
 *   GET   /api/v1/contact          → all contacts (paginated, filter by status)
 *   GET   /api/v1/contact/:id      → single contact
 *   PUT   /api/v1/contact/:id/status → status update (new → read → resolved)
 */

// ── Offline-safe enquiry submission ──────────────────────────
// The contact form always shows a confirmation. If the API call fails (server
// down, network blip), the enquiry is kept in this browser and re-sent on the
// next page load, so leads aren't silently lost.
const QUEUE_KEY = "certezy:pendingEnquiries";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const readQueue = () => {
    try {
        const items = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
        return Array.isArray(items) ? items : [];
    } catch {
        return [];
    }
};

const writeQueue = (items) => {
    try {
        if (items.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
        else localStorage.removeItem(QUEUE_KEY);
    } catch {
        // Storage unavailable (private mode / blocked) — nothing more we can do
    }
};

// Only "your data is invalid" responses are final. Everything else — network
// errors, 5xx, and 404s from a misconfigured proxy — is retried later.
const NON_RETRYABLE = [400, 413, 422];
const isRetryable = (err) => !NON_RETRYABLE.includes(err?.response?.status);

const contactService = {
    // Public
    submit: (data) => api.post("/contact/create", data),

    /**
     * Submit an enquiry without ever throwing.
     * @returns {Promise<"sent"|"queued"|"rejected">}
     */
    async submitEnquiry(data) {
        try {
            await contactService.submit(data);
            return "sent";
        } catch (err) {
            if (!isRetryable(err)) {
                console.warn("[contact] enquiry rejected:", err?.response?.data?.message);
                return "rejected";
            }
            writeQueue([...readQueue(), { data, attempts: 1, createdAt: Date.now() }]);
            console.warn("[contact] enquiry queued for retry:", err?.message);
            return "queued";
        }
    },

    /** Re-send enquiries that failed earlier. Safe to call on every app start. */
    async flushPendingEnquiries() {
        const queue = readQueue();
        if (!queue.length) return;

        const remaining = [];
        for (const item of queue) {
            if (Date.now() - item.createdAt > MAX_AGE_MS || item.attempts >= MAX_ATTEMPTS) continue;
            try {
                await contactService.submit(item.data);
            } catch (err) {
                if (isRetryable(err)) remaining.push({ ...item, attempts: item.attempts + 1 });
            }
        }
        writeQueue(remaining);
    },

    // Admin only
    getAll: (params) => api.get("/contact", { params }), // ?status=new&page=1&limit=20
    getById: (id) => api.get(`/contact/${id}`),
    updateStatus: (id, status) => api.put(`/contact/${id}/status`, { status }),
};

export default contactService;
