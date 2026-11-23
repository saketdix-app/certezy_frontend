import api from "./api";

/** In-app notifications (2.0): GET /notifications → { items, unread }; PUT /notifications/read(?id=) */
const notificationService = {
    // background poll: doesn't count as activity for idle sign-out
    list: () => api.get("/notifications", { background: true }),
    markRead: (id) => api.put("/notifications/read", null, { params: id ? { id } : {} }),
};

export default notificationService;
