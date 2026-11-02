/**
 * currency.js — which currency the visitor sees and pays in.
 *
 *   India (by IP)  → INR: rupee prices, Razorpay
 *   everywhere else → USD: dollar prices, PayPal
 *
 * The region comes from the server (GET /geo looks up the visitor's IP), and the
 * server enforces it when creating payment orders — it can't be changed in the
 * browser. Until /geo answers, the device time zone is used as a first guess.
 */
import { useSyncExternalStore } from "react";
import api from "@/services/api";

export const isIndiaVisitor = () => {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        return tz === "Asia/Kolkata" || tz === "Asia/Calcutta";
    } catch {
        return false;
    }
};

let current = isIndiaVisitor() ? "INR" : "USD";
const listeners = new Set();

const set = (currency) => {
    if (currency === current) return;
    current = currency;
    listeners.forEach((l) => l());
};

// Ask the server once per page load
let requested = false;
const loadRegion = () => {
    if (requested) return;
    requested = true;
    api.get("/geo")
        .then((res) => {
            const currency = res.data?.data?.currency;
            if (currency === "INR" || currency === "USD") set(currency);
        })
        .catch(() => {
            /* keep the time-zone guess; payments are still checked by the server */
        });
};

export const getCurrency = () => current;

const subscribe = (listener) => {
    loadRegion();
    listeners.add(listener);
    return () => listeners.delete(listener);
};

/** React hook: current currency (server-decided), re-renders when it's known. */
export const useCurrency = () => useSyncExternalStore(subscribe, getCurrency, getCurrency);

/** True for a plausible international number in E.164 form (8–15 digits), or empty. */
export const isValidPhone = (e164) => !e164 || /^\+[1-9]\d{7,14}$/.test(e164);
