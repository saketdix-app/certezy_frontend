import { useEffect, useState } from "react";

/**
 * portalTheme.js — Light / Dark / System for the admin and consultant
 * portals. The choice is remembered per browser; the effective theme is set
 * as <html data-portal-theme="dark"> while a portal layout is on screen and
 * removed when it isn't (the public site stays light).
 */
const KEY = "certezy.portalTheme";
const MODES = ["light", "dark", "system"];

const read = () => {
    try {
        const v = localStorage.getItem(KEY);
        return MODES.includes(v) ? v : "light";
    } catch {
        return "light";
    }
};

export function usePortalTheme() {
    const [mode, setModeState] = useState(read);

    useEffect(() => {
        const root = document.documentElement;
        const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
        const apply = () => {
            const dark = mode === "dark" || (mode === "system" && mq?.matches);
            root.dataset.portalTheme = dark ? "dark" : "light";
        };
        apply();
        mq?.addEventListener?.("change", apply);
        return () => {
            mq?.removeEventListener?.("change", apply);
            delete root.dataset.portalTheme;
        };
    }, [mode]);

    const setMode = (m) => {
        setModeState(m);
        try {
            localStorage.setItem(KEY, m);
        } catch {
            /* not remembered — fine */
        }
    };
    return [mode, setMode];
}
