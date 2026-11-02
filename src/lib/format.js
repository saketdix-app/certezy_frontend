/**
 * format.js — display helpers shared across public, student and admin pages.
 */

import { getCurrency } from "./currency";

const FORMATS = {
    USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }),
    INR: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }),
};

/** $49 / $49.99 / ₹4,999 — whole numbers drop the cents. */
export const formatMoney = (amount, currency = "USD") => {
    const n = Number(amount || 0);
    const f = FORMATS[currency] || FORMATS.USD;
    return Number.isInteger(n) ? f.format(n).replace(/\.00$/, "") : f.format(n);
};

/**
 * Normalised pricing for any course object coming from the API.
 * The API already sends pricing_type / is_discounted / discount_pct; the
 * fallbacks keep older payloads (enrollments, discount pages) working.
 */
export const getPricing = (course = {}, currency = getCurrency()) => {
    const usdPrice = Number(course.price || 0);
    const isFree = course.pricing_type === "free" || usdPrice <= 0;
    // India prices come from the API (price_inr); older payloads without them show USD
    const inr = currency === "INR" && Number(course.price_inr) > 0;
    const cur = inr ? "INR" : "USD";
    const price = inr ? Number(course.price_inr) : usdPrice;
    const original = Number((inr ? course.original_price_inr : course.original_price) || 0);
    const isDiscounted = !isFree && original > price;
    return {
        isFree,
        currency: cur,
        price: isFree ? 0 : price,
        originalPrice: isDiscounted ? original : null,
        isDiscounted,
        discountPct: isDiscounted ? Math.round(((original - price) / original) * 100) : 0,
        label: isFree ? "Free" : formatMoney(price, cur),
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
