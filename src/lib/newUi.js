import { fmtMoney } from "@/lib/crm";

/** Stage colour dots (board columns, pills). */
export const STAGE_DOT = {
    backlog: "#a8a29e",
    new: "#0ea5e9",
    attempting_contact: "#6366f1",
    in_conversation: "#8b5cf6",
    application: "#2f6496",
    exam_scheduled: "#d97706",
    course_done: "#059669",
    no_response: "#ea580c",
    on_hold: "#ca8a04",
    not_interested: "#94a3b8",
    junk: "#dc2626",
};

/** "₹70,000 + $500" from [{ currency, amount }] */
export const fmtTotals = (totals) =>
    (totals ?? [])
        .filter((t) => t.amount)
        .sort((a, b) => (a.currency === "INR" ? -1 : b.currency === "INR" ? 1 : 0))
        .map((t) => fmtMoney(t.amount, t.currency))
        .join(" + ") || "—";

export const btnPrimary =
    "inline-flex items-center gap-1.5 rounded-lg bg-action px-3.5 py-2 text-ui font-bold text-white hover:bg-action-hover disabled:opacity-60";
export const btnOutline =
    "inline-flex items-center gap-1.5 rounded-lg border border-action/40 bg-surface px-3.5 py-2 text-ui font-bold text-action hover:border-action hover:bg-action-soft disabled:opacity-60";
export const btnGhost =
    "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-ui font-semibold text-action hover:bg-action-soft";
