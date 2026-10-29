/**
 * format.js — display helpers shared across public, student and admin pages.
 */

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

/** $49 / $49.99 — whole numbers drop the cents. */
export const formatMoney = (amount) => {
    const n = Number(amount || 0);
    return Number.isInteger(n) ? usd.format(n).replace(/\.00$/, "") : usd.format(n);
};

/**
 * Normalised pricing for any course object coming from the API.
 * The API already sends pricing_type / is_discounted / discount_pct; the
 * fallbacks keep older payloads (enrollments, discount pages) working.
 */
export const getPricing = (course = {}) => {
    const price = Number(course.price || 0);
    const isFree = course.pricing_type === "free" || price <= 0;
    const original = Number(course.original_price || 0);
    const isDiscounted = !isFree && original > price;
    return {
        isFree,
        price: isFree ? 0 : price,
        originalPrice: isDiscounted ? original : null,
        isDiscounted,
        discountPct: isDiscounted ? Math.round(((original - price) / original) * 100) : 0,
        label: isFree ? "Free" : formatMoney(price),
    };
};

/** 950 → "950", 1200 → "1.2K", 10400 → "10K", 1250000 → "1.3M" */
export const formatCount = (n) => {
    const v = Number(n || 0);
    if (v < 1000) return String(v);
    if (v < 1_000_000) return `${(v / 1000).toFixed(v < 10_000 ? 1 : 0).replace(/\.0$/, "")}K`;
    return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
};

/**
 * Lesson and course durations are stored in SECONDS (lessons.duration,
 * courses.total_duration). 5400 → "1h 30m", 600 → "10m", 0 → null.
 */
export const formatDuration = (seconds) => {
    const total = Math.round(Number(seconds || 0) / 60);
    if (!total) return Number(seconds) > 0 ? "< 1m" : null;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h > 0 ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
};

export const formatDate = (value, opts = { year: "numeric", month: "short", day: "numeric" }) =>
    value ? new Date(value).toLocaleDateString("en-US", opts) : "";

/** Course title → initials for placeholder thumbnails ("AWS Solutions Architect" → "AS"). */
export const getInitials = (title = "") =>
    title
        .split(/\s+/)
        .filter((w) => /^[A-Za-z0-9]/.test(w))
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join("");
