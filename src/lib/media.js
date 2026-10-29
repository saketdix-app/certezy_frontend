/**
 * media.js — recognise lesson media URLs and turn them into embeddable players.
 */

const isUrl = (value) => /^https?:\/\//i.test((value || "").trim());

/** YouTube / Vimeo / Loom / Google Drive share links → iframe embed URL, else null. */
export function getVideoEmbedUrl(raw) {
    const url = (raw || "").trim();
    if (!isUrl(url)) return null;

    let u;
    try {
        u = new URL(url);
    } catch {
        return null;
    }
    const host = u.hostname.replace(/^www\.|^m\./, "");

    // YouTube: watch?v=, youtu.be/, shorts/, embed/, live/
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}?rel=0`;
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
        const id = u.searchParams.get("v") || u.pathname.match(/\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1];
        if (id) return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
    }

    // Vimeo: vimeo.com/123456789[/hash] or player.vimeo.com/video/123
    if (host === "vimeo.com" || host === "player.vimeo.com") {
        const [, id, hash] = u.pathname.match(/(?:\/video)?\/(\d+)(?:\/([a-z0-9]+))?/i) || [];
        if (id) return `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ""}`;
    }

    // Loom share → embed
    if (host === "loom.com") {
        const id = u.pathname.match(/\/(?:share|embed)\/([a-z0-9]+)/i)?.[1];
        if (id) return `https://www.loom.com/embed/${id}`;
    }

    // Google Drive file → preview
    if (host === "drive.google.com") {
        const id = u.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || u.searchParams.get("id");
        if (id) return `https://drive.google.com/file/d/${id}/preview`;
    }

    return null;
}

/** Generic embed URL for "embed" lessons (Google Docs/Slides, Figma, CodePen…). */
export function getEmbedUrl(raw) {
    const url = (raw || "").trim();
    if (!isUrl(url)) return null;
    const video = getVideoEmbedUrl(url);
    if (video) return video;

    try {
        const u = new URL(url);
        // Google Docs / Slides / Sheets: use their embed-friendly views
        if (u.hostname === "docs.google.com") {
            if (/\/presentation\//.test(u.pathname))
                return url.replace(/\/(edit|view|pub)(\?.*)?$/, "/embed");
            if (/\/(document|spreadsheets)\//.test(u.pathname))
                return url.replace(/\/edit(\?.*)?$/, "/preview");
        }
        if (u.hostname.endsWith("figma.com") && !u.pathname.startsWith("/embed")) {
            return `https://www.figma.com/embed?embed_host=certezy&url=${encodeURIComponent(url)}`;
        }
    } catch {
        return null;
    }
    return url;
}

export const isHttpUrl = isUrl;

export const hostnameOf = (raw) => {
    try {
        return new URL(raw).hostname.replace(/^www\./, "");
    } catch {
        return "";
    }
};
