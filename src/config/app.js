/**
 * Application-wide configuration.
 * Values come from Vite env vars (see .env.example) with safe defaults.
 */

const trimSlash = (value) => (value || "").replace(/\/$/, "");

// Brand and contact details are fixed in code on purpose: a stale VITE_* value
// in a server .env must not be able to change (or misspell) them on the live site.
export const APP_NAME = "Certezy";
export const APP_URL = trimSlash(import.meta.env.VITE_APP_URL || window.location.origin);
export const API_BASE_URL = trimSlash(import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1");

export const SUPPORT_EMAIL = "contact@certezy.com";

const telHref = (number) => `tel:+${number.replace(/\D/g, "")}`;

/** Support phone lines, shown in the footer and on the contact page. */
export const SUPPORT_PHONES = [
    { region: "IN", label: "India", number: "+91 98935 96975" },
    { region: "US", label: "US (toll-free)", number: "+1 (866) 558-9561" },
].map((p) => ({ ...p, href: telHref(p.number) }));

/** Primary number (US toll-free) for places with room for only one. */
const PRIMARY_PHONE = SUPPORT_PHONES.find((p) => p.region === "US");
export const SUPPORT_PHONE = PRIMARY_PHONE.number;
export const SUPPORT_PHONE_HREF = PRIMARY_PHONE.href;

export const SOCIAL_LINKS = {
    linkedin: "https://www.linkedin.com/company/certezy-world/posts/",
    instagram: "https://www.instagram.com/certezy/",
    facebook: "https://www.facebook.com/p/Certezy-61564538833499/",
};

// Route constants — single place to change paths
export const ROUTES = {
    HOME: "/",
    COURSES: "/courses",
    ABOUT: "/about",
    CONTACT: "/contact-us",
    LOGIN: "/login",
    REGISTER: "/register",
    OAUTH_CALLBACK: "/oauth/callback",
    CHECKOUT: "/checkout",
    STUDENT_DASHBOARD: "/student/dashboard",
    STUDENT_PROFILE: "/student/profile",
    ADMIN_DASHBOARD: "/admin/dashboard",
    PRIVACY: "/privacy-policy",
    TERMS: "/terms-of-service",
};

export const AUTH_PATHS = [ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.OAUTH_CALLBACK];
export const PROTECTED_PREFIXES = ["/student", "/admin", ROUTES.CHECKOUT];

export const ADMIN_ROLES = ["admin", "sub_admin"];

/** Default landing page for a signed-in user, by role. */
export const homeForRole = (role) =>
    ADMIN_ROLES.includes(role) ? ROUTES.ADMIN_DASHBOARD : ROUTES.STUDENT_DASHBOARD;

/** Only allow in-app relative redirects (prevents open-redirect via ?redirect=). */
export const safeRedirect = (value) => {
    if (!value) return null;
    const decoded = decodeURIComponent(value);
    return decoded.startsWith("/") && !decoded.startsWith("//") ? decoded : null;
};
