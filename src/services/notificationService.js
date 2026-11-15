import api from "./api";

/** In-app notifications (2.0): GET /notifications → { items, unread }; PUT /notifications/read(?id=) */
const notificationService = {
    list: () => api.get("/notifications"),
    markRead: (id) => api.put("/notifications/read", null, { params: id ? { id } : {} }),
};

export default notificationService;
