/**
 * currency.js — which currency the visitor sees and pays in.
 *
 *   India (time zone Asia/Kolkata) → INR: rupee prices, Razorpay
 *   everywhere else                → USD: dollar prices, PayPal
 *
 * A visitor can switch; the choice is remembered on this device. The server
 * always decides the amount charged (Razorpay = course's rupee price,
 * PayPal = dollar price).
 */
import { useSyncExternalStore } from "react";

const KEY = "certezy_currency";
export const CURRENCIES = ["INR", "USD"];

export const isIndiaVisitor = () => {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        return tz === "Asia/Kolkata" || tz === "Asia/Calcutta";
    } catch {
        return false;
    }
};

const read = () => {
    try {
        const saved = localStorage.getItem(KEY);
        if (CURRENCIES.includes(saved)) return saved;
    } catch {
        /* storage unavailable */
    }
    return isIndiaVisitor() ? "INR" : "USD";
};

let current = read();
const listeners = new Set();

export const getCurrency = () => current;

export const setCurrency = (currency) => {
    if (!CURRENCIES.includes(currency) || currency === current) return;
    current = currency;
    try {
        localStorage.setItem(KEY, currency);
    } catch {
        /* ignore */
    }
    listeners.forEach((l) => l());
};

const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

/** React hook: current currency, re-renders when it changes. */
export const useCurrency = () => useSyncExternalStore(subscribe, getCurrency, getCurrency);

/** True for a plausible international number in E.164 form (8–15 digits), or empty. */
export const isValidPhone = (e164) => !e164 || /^\+[1-9]\d{7,14}$/.test(e164);
