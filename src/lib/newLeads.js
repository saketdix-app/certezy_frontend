import { useEffect, useState } from "react";

import crmService from "@/services/crmService";

const POLL_MS = 20 * 1000;
const FLASH_MS = 1500;
export const LEADS_SEEN_EVENT = "crm:leads-seen";
const BASE_TITLE_KEY = "__certezyBaseTitle";

/** Draw the site icon with a red dot (shown on the browser tab while there are new leads). */
const setFaviconDot = (on) => {
    const links = [...document.querySelectorAll('link[rel~="icon"]')];
    if (!links.length) return;
    links.forEach((l) => {
        if (!l.dataset.original) l.dataset.original = l.href;
    });
    if (!on) {
        links.forEach((l) => (l.href = l.dataset.original));
        return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0, 64, 64);
        g.beginPath();
        g.arc(48, 16, 15, 0, Math.PI * 2);
        g.fillStyle = "#DC2626";
        g.fill();
        g.lineWidth = 4;
        g.strokeStyle = "#FFFFFF";
        g.stroke();
        const url = c.toDataURL("image/png");
        links.forEach((l) => (l.href = url));
    };
    img.src = links.find((l) => l.dataset.original?.endsWith(".png"))?.dataset.original ?? links[0].dataset.original;
};

/**
 * New leads assigned to me that I haven't opened — like Gmail's "X messaged you":
 *  • tab in the background: the title alternates between
 *    "🔔 New lead assigned: Asha Rao" (or "🔔 3 new leads assigned") and the page title;
 *  • tab in front: "(3) New leads · CERTEZY";
 *  • a red dot on the tab icon.
 * It stays until the consultant opens the lead (LEADS_SEEN_EVENT). Returns the
 * count for the menu dot.
 */
export function useNewLeads(enabled = true) {
    const [count, setCount] = useState(0);
    const [latest, setLatest] = useState(null);

    useEffect(() => {
        if (!enabled) return undefined;
        let alive = true;
        const load = () =>
            crmService
                .newCount()
                .then(({ data }) => {
                    if (!alive) return;
                    setCount(Number(data?.data?.new_leads ?? 0));
                    setLatest(data?.data?.latest ?? null);
                })
                .catch(() => {});
        load();
        const t = setInterval(load, POLL_MS);
        window.addEventListener(LEADS_SEEN_EVENT, load);
        window.addEventListener("focus", load);
        return () => {
            alive = false;
            clearInterval(t);
            window.removeEventListener(LEADS_SEEN_EVENT, load);
            window.removeEventListener("focus", load);
        };
    }, [enabled]);

    // Tab title + icon
    const name = latest?.name ?? null;
    useEffect(() => {
        if (!enabled) return undefined;
        const VISIBLE_PREFIX = /^\(\d+\+?\) New leads? · /;
        let written = null; // the last title we set (so our own changes aren't taken as the page's)
        let flip = false;
        const pageTitle = () => {
            const t = document.title;
            if (t.startsWith("🔔 ")) return window[BASE_TITLE_KEY] ?? "CERTEZY";
            return t.replace(VISIBLE_PREFIX, "");
        };
        const render = () => {
            const base = pageTitle();
            window[BASE_TITLE_KEY] = base;
            let want = base;
            if (count > 0) {
                const shown = count > 99 ? "99+" : count;
                const alert = count === 1 ? `🔔 New lead assigned${name ? `: ${name}` : ""}` : `🔔 ${shown} new leads assigned`;
                if (document.hidden) {
                    flip = !flip;
                    want = flip ? alert : base;
                } else want = `(${shown}) New lead${count === 1 ? "" : "s"} · ${base}`;
            }
            if (document.title !== want) {
                written = want;
                document.title = want;
            }
        };
        render();
        const flash = count > 0 ? setInterval(render, FLASH_MS) : null;
        const onVisibility = () => render();
        document.addEventListener("visibilitychange", onVisibility);
        // Pages change the title as you move around: keep the notice on top
        const obs = new MutationObserver(() => {
            if (document.title !== written) render();
        });
        const titleEl = document.querySelector("title");
        if (titleEl) obs.observe(titleEl, { childList: true, characterData: true, subtree: true });
        setFaviconDot(count > 0);
        return () => {
            if (flash) clearInterval(flash);
            document.removeEventListener("visibilitychange", onVisibility);
            obs.disconnect();
            document.title = pageTitle();
            setFaviconDot(false);
        };
    }, [count, name, enabled]);

    return count;
}
