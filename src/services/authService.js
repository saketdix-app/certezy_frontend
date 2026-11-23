import api from "./api";
import { API_BASE_URL } from "@/config/app";

/**
 * authService.js
 *
 * Base URL (VITE_API_BASE_URL) already includes /api/v1,
 * so paths here start at /auth/...
 */

const authService = {
    // Local auth
    register: (data) => api.post("/auth/register", data),
    login: (data) => api.post("/auth/login", data),
    // Two-step sign-in: { challenge, code } → session; resend a new code
    verifyLogin: (data) => api.post("/auth/login/verify", data),
    resendLoginCode: (challenge) => api.post("/auth/login/resend", { challenge }),
    // Account security: turn two-step sign-in on (emailed code) or off (password)
    twoFactorSetup: () => api.post("/auth/2fa/setup"),
    twoFactorEnable: (data) => api.post("/auth/2fa/enable", data),
    twoFactorDisable: (password) => api.post("/auth/2fa/disable", { password }),
    // "Still here": someone is using the page (idle sign-out)
    activity: () => api.post("/auth/activity"),
    refresh: () => api.post("/auth/refresh"),
    logout: () => api.post("/auth/logout"),
    changePassword: (data) => api.post("/auth/change-password", data),
    updateProfile: (data) => api.put("/auth/profile", data),
    me: () => api.get("/auth/me"),

    // OAuth — browser redirect
    googleLogin: () => window.location.assign(`${API_BASE_URL}/auth/google`),
    githubLogin: () => window.location.assign(`${API_BASE_URL}/auth/github`),

    // Admin
    getAllUsers: (params = {}) => api.get("/auth/users/all", { params }),
    getUserById: (id) => api.get(`/auth/users/${id}`),
    updateUserStatus: (id, data) => api.put(`/auth/users/${id}/status`, data),
    // Delete (restorable for 30 days) / restore — admins only
    deleteUser: (id) => api.delete(`/auth/users/${id}`),
    restoreUser: (id) => api.post(`/auth/users/${id}/restore`),
    // Erase a deleted user now instead of after 30 days — cannot be undone
    eraseUser: (id, confirm_email) => api.post(`/auth/users/${id}/erase`, { confirm_email }),
};

export default authService;
