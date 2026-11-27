import api from "./api";

/** Admin → Backups (Super Admins only). */
const backupService = {
    overview: () => api.get("/admin/backups"),
    runNow: () => api.post("/admin/backups/run"),
    downloadLink: (id) => api.get(`/admin/backups/${id}/download`),
};

export default backupService;
