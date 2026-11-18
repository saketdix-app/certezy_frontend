/**
 * CRM (2.0 lead pipeline) constants and helpers shared by the consultant
 * workspace and Admin → Leads. Components live in components/crm.
 */

/** Pipeline stages (PRD §4.2), in order, with their colours. */
export const STAGES = [
    ["new", "New Leads", "bg-sky-50 text-sky-700 border-sky-200"],
    ["attempting_contact", "Attempting Contact", "bg-indigo-50 text-indigo-700 border-indigo-200"],
    ["in_conversation", "In Conversation", "bg-violet-50 text-violet-700 border-violet-200"],
    ["on_hold", "On Hold", "bg-amber-50 text-amber-700 border-amber-200"],
    ["application", "Application", "bg-blue-50 text-blue-700 border-blue-200"],
    ["course_done", "Course Done", "bg-emerald-50 text-emerald-700 border-emerald-200"],
    ["not_interested", "Not Interested", "bg-slate-100 text-slate-600 border-slate-200"],
    ["junk", "Junk Lead", "bg-red-50 text-red-700 border-red-200"],
];
export const STAGE_LABEL = Object.fromEntries(STAGES.map(([k, l]) => [k, l]));
export const STAGE_CLASS = Object.fromEntries(STAGES.map(([k, , c]) => [k, c]));
// Moving into these needs a reason (server enforces the same)
export const REASON_STAGES = ["not_interested", "junk", "on_hold"];
export const CLOSED_STAGES = ["not_interested", "junk"];

export const SOURCES = [
    ["manual", "Manual"],
    ["website", "Website"],
    ["meta", "Meta"],
    ["linkedin", "LinkedIn"],
    ["referral", "Referral"],
    ["whatsapp", "WhatsApp"],
    ["other", "Other"],
];
export const SOURCE_LABEL = Object.fromEntries(SOURCES);

export const FOLLOW_UP_TYPES = [
    ["call", "Call"],
    ["whatsapp", "WhatsApp"],
    ["email", "Email"],
    ["meeting", "Meeting"],
    ["demo", "Demo"],
    ["other", "Other"],
];

export const ENROLLMENT_LABEL = {
    none: "Not enrolled",
    application: "Application",
    payment_pending: "Payment pending",
    enrolled: "Enrolled",
};

/** "+91 98765 43210" → "+91 98•••• •210" on lead cards; full number on the lead itself. */
export const maskPhone = (phone) => {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6) return phone;
    return `${phone.slice(0, Math.max(0, phone.length - 7)).trim()}••••${digits.slice(-3)}`;
};

export const waLink = (phone) => `https://wa.me/${String(phone ?? "").replace(/\D/g, "")}`;

export const fmtDateTime = (d) =>
    d
        ? new Date(d).toLocaleString("en-US", {
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
          })
        : "—";

/** "3d", "5h", "just now" since a date. */
export const ageOf = (d) => {
    if (!d) return "";
    const mins = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
    if (mins < 60) return mins < 2 ? "just now" : `${mins}m`;
    const h = Math.round(mins / 60);
    return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
};

export const isOverdue = (d) => d && new Date(d).getTime() < Date.now();

export const apiMessage = (err, fallback) => err?.response?.data?.message || fallback;

export const inputCls =
    "w-full rounded-lg border border-slate-200 bg-surface px-3 py-2 text-[14px] outline-none focus:border-action";

