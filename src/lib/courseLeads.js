/**
 * courseLeads.js — helpers for the course page's lead capture.
 */

/** PMI's partner badge only belongs on PMI certification courses (PMP®, CAPM®, PMI-ACP®…). */
export const isPmiCourse = (course) => /\b(pmp|capm|pmi|pmbok)\b/i.test(`${course?.title ?? ""} ${course?.slug ?? ""}`);

/** FAQs come back as JSON (array or string); anything else → []. */
export const parseFaqs = (raw) => {
    try {
        const v = typeof raw === "string" ? JSON.parse(raw) : raw;
        return Array.isArray(v) ? v.filter((f) => f?.q && f?.a) : [];
    } catch {
        return [];
    }
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Open the syllabus in a clean printable window (Print → Save as PDF). */
export const printSyllabus = (courseTitle, sections) => {
    const w = window.open("", "_blank", "width=820,height=900");
    if (!w) return false;
    const body = sections
        .map(
            (s, i) =>
                `<h2>${i + 1}. ${esc(s.title)}</h2><ol>${s.lessons.map((l) => `<li>${esc(l)}</li>`).join("")}</ol>`
        )
        .join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(courseTitle)} — Syllabus | CERTEZY</title>
<style>body{font-family:"Plus Jakarta Sans",Arial,sans-serif;color:#0f172a;max-width:720px;margin:32px auto;padding:0 24px;line-height:1.55}
header{border-bottom:2px solid #236a9e;padding-bottom:12px;margin-bottom:20px}p.brand{color:#236a9e;font-weight:700;letter-spacing:.06em;font-size:12px;margin:0}
h1{font-size:24px;margin:6px 0 0}h2{font-size:15px;color:#1b5582;margin:20px 0 6px}ol{margin:0;padding-left:22px;color:#334155;font-size:13.5px}
footer{margin-top:28px;font-size:12px;color:#5e6e85;border-top:1px solid #e2e8f0;padding-top:10px}</style></head>
<body><header><p class="brand">CERTEZY · COURSE SYLLABUS</p><h1>${esc(courseTitle)}</h1></header>${body}
<footer>CERTEZY E-LEARNING PVT LTD · certezy.com</footer><script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
    return true;
};
