import { useSyncExternalStore } from "react";

/**
 * CRM design: "new" (default) or "classic" (the earlier screens).
 * Remembered per browser; every open page switches together.
 */
const KEY = "certezy.ui";
const EVENT = "certezy:ui-version";

const read = () => {
    try {
        return localStorage.getItem(KEY) === "classic" ? "classic" : "new";
    } catch {
        return "new";
    }
};

export const setUiVersion = (v) => {
    try {
        localStorage.setItem(KEY, v === "classic" ? "classic" : "new");
    } catch {
        /* not saved — this page still switches */
    }
    window.dispatchEvent(new Event(EVENT));
};

const subscribe = (fn) => {
    window.addEventListener(EVENT, fn);
    window.addEventListener("storage", fn); // other tabs
    return () => {
        window.removeEventListener(EVENT, fn);
        window.removeEventListener("storage", fn);
    };
};

/** "new" | "classic" */
export const useUiVersion = () => useSyncExternalStore(subscribe, read, () => "new");
export const useNewUi = () => useUiVersion() === "new";
