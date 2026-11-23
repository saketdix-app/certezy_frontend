import { useEffect, useState } from "react";

import crmService from "@/services/crmService";

const POLL_MS = 60 * 1000;
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
 * New leads assigned to me that I haven't opened: "(3) CERTEZY" and a red dot
 * on the browser tab, so it shows even while I'm in another tab. Returns the
 * count for the menu dot. Opening a lead clears it (LEADS_SEEN_EVENT).
 */
export function useNewLeads(enabled = true) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!enabled) return undefined;
        let alive = true;
        const load = () =>
            crmService
                .newCount()
                .then(({ data }) => alive && setCount(Number(data?.data?.new_leads ?? 0)))
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
    useEffect(() => {
        if (!enabled) return undefined;
        const strip = (t) => t.replace(/^\(\d+\+?\) /, "");
        const apply = () => {
            const base = strip(document.title);
            window[BASE_TITLE_KEY] = base;
            const want = count > 0 ? `(${count > 99 ? "99+" : count}) ${base}` : base;
            if (document.title !== want) document.title = want;
        };
        apply();
        // Pages change the title as you move around: keep the count in front
        const obs = new MutationObserver(apply);
        const titleEl = document.querySelector("title");
        if (titleEl) obs.observe(titleEl, { childList: true });
        setFaviconDot(count > 0);
        return () => {
            obs.disconnect();
            document.title = strip(document.title);
            setFaviconDot(false);
        };
    }, [count, enabled]);

    return count;
}
