import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
    ArrowRight,
    CalendarClock,
    CheckCircle2,
    Loader2,
    Mail,
    MessageCircle,
    MessageSquareText,
    Phone,
    Shuffle,
    StickyNote,
    X,
    XCircle,
    Trash2,
} from "lucide-react";

import crmService from "@/services/crmService";
import courseService from "@/services/courseService";
import LeadStudentActions from "./LeadStudentActions";
import LeadWhatsApp from "./LeadWhatsApp";
import LeadExamSection, { TicketInputs } from "./LeadExamSection";
import { cn } from "@/lib/utils";
import { StageBadge } from "./crmShared";
import MessageComposer from "./MessageComposer";
import { whatsappNumberOf } from "@/lib/leadMessages";
import { LEADS_SEEN_EVENT } from "@/lib/newLeads";
import { CLOSED_STAGES, ENROLLMENT_LABEL, FOLLOW_UP_TYPES, REASON_STAGES, SOURCE_LABEL, STAGE_LABEL, answerEntries, EXAM_RESULT_LABEL, apiMessage, fmtDate, fmtDateTime, fmtMoney, formLabel, inputCls, isOverdue } from "@/lib/crm";

/** Any course, or none — change it whenever the lead's interest changes. */
function CourseSelect({ lead, disabled, onChange }) {
    const [courses, setCourses] = useState(null);
    useEffect(() => {
        courseService
            .getAll({ limit: 100 })
            .then(({ data: res }) => setCourses(Array.isArray(res?.data) ? res.data : []))
            .catch(() => setCourses([]));
    }, []);
    const value = lead.course_id ? String(lead.course_id) : "";
    return (
        <select
            value={value}
            disabled={disabled || !courses}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            aria-label="Course"
            className={cn(inputCls, "py-1 text-ui")}
        >
            <option value="">No course</option>
            {/* keep the current one listed even if it's unpublished / not in the first page */}
            {value && !courses?.some((c) => String(c.id) === value) && <option value={value}>{lead.course_title ?? `Course #${value}`}</option>}
            {(courses ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                    {c.title}
                </option>
            ))}
        </select>
    );
}

const FIELD_LABEL = {
    course_id: "course",
    preferred_schedule: "schedule",
    ticket_size: "ticket size",
    ticket_currency: "ticket currency",
};

const ACTIVITY_TEXT = {
    created: () => "Lead created",
    assignment: () => "Lead assigned",
    updated: (m) => `Details updated (${(m?.fields ?? []).map((f) => FIELD_LABEL[f] ?? f).join(", ")})`,
    status_change: (m) =>
        `${STAGE_LABEL[m?.from] ?? m?.from} → ${STAGE_LABEL[m?.to] ?? m?.to}${m?.automation || m?.automatic ? " (automatic)" : ""}${
            m?.ticket_size ? ` · ticket size ${fmtMoney(m.ticket_size, m.ticket_currency)}` : ""
        }`,
    exam_coordinator: (m) => (m?.to ? "Exam coordinator assigned" : "Exam coordinator removed"),
    exam_rescheduled: (m) =>
        `Exam rescheduled${m?.previous_at ? ` from ${fmtDateTime(m.previous_at)}` : ""} to ${fmtDateTime(m?.scheduled_at)}`,
    exam_cancelled: (m) => `Exam cancelled${m?.scheduled_at ? ` (was scheduled for ${fmtDateTime(m.scheduled_at)})` : ""}`,
    application_update: (m) => (m?.submitted ? `Application submitted${m?.submitted_at ? ` on ${fmtDate(m.submitted_at)}` : ""}` : "Application marked not submitted"),
    payment_done: (m) => `Payment Done${m?.paid_at ? ` on ${fmtDate(m.paid_at)}` : ""}${m?.reference ? ` · ${m.reference}` : ""}`,
    payment_due: () => "Payment set back to Payment Due",
    exam_scheduled: (m) => `Exam scheduled for ${fmtDateTime(m?.scheduled_at)}`,
    exam_completed: (m) =>
        `Exam done${m?.completed_at ? ` on ${fmtDate(m.completed_at)}` : ""}${m?.automatic ? " (exam time passed)" : ""}${
            m?.result ? ` · ${EXAM_RESULT_LABEL[m.result]}` : ""
        }`,
    exam_cleared: () => "Exam reset to not scheduled",
    note: () => "Note",
    call: () => "Call",
    message: () => "Message",
    email: () => "Email",
    whatsapp: () => "WhatsApp",
    follow_up_scheduled: (m) => `Follow-up scheduled (${m?.type ?? "call"}) for ${fmtDateTime(m?.due_at)}`,
    follow_up_done: () => "Follow-up done",
    follow_up_missed: () => "Follow-up missed",
    follow_up_cancelled: () => "Follow-up cancelled",
    student_account: (m) => (m?.existing ? "Linked to existing student account" : "Student account created"),
    course_assigned: () => "Course assigned",
    discount_sent: (m) => `Discount link sent (${m?.discount_pct ?? "?"}% off)`,
    discount_revoked: () => "Discount link withdrawn",
    certificate_issued: (m) => `Certificate issued (${m?.certificate_no ?? ""})`,
    sale: (m) => `Sale: ${m?.currency ?? ""} ${Number(m?.amount ?? 0).toFixed(2)}`,
    whatsapp_in: () => "WhatsApp received",
    checkout_abandoned: (m) => `Started checkout for ${m?.course ?? "a course"} but didn't pay`,
    repeat_enquiry: (m) =>
        `Enquired again via ${formLabel(m?.form) ?? SOURCE_LABEL[m?.source] ?? m?.source ?? "a form"}${m?.campaign ? ` (${m.campaign})` : ""}`,
};

const QUICK_LOG = [
    ["call", "Log call", Phone],
    ["message", "Log message", MessageSquareText],
    ["note", "Add note", StickyNote],
];

/** Slide-over panel: everything about one lead, and the actions allowed on it. */
export default function LeadDetailPanel({ leadId, onClose, onChanged, isAdmin, onMove, onDelete }) {
    const [lead, setLead] = useState(null);
    const [stageTarget, setStageTarget] = useState(null);
    const [reason, setReason] = useState("");
    const [logType, setLogType] = useState(null);
    const [logText, setLogText] = useState("");
    const [showFollowUp, setShowFollowUp] = useState(false);
    const [fu, setFu] = useState({ due_at: "", type: "call", note: "" });
    const [busy, setBusy] = useState(false);
    const [ticket, setTicket] = useState({ amount: "", currency: "INR" });
    const [examAt, setExamAt] = useState("");
    const [compose, setCompose] = useState(null); // "whatsapp" | "email"
    const [waEdit, setWaEdit] = useState(null); // editing the WhatsApp number

    // Keep the latest close handler without reloading the lead when it changes
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);
    const announced = useRef(null);
    const load = useCallback(
        () =>
            crmService
                .get(leadId)
                .then(({ data }) => {
                    setLead(data.data);
                    // First open: the "new lead" red dot goes (tab, menu, list) — once per lead
                    if (announced.current !== leadId) {
                        announced.current = leadId;
                        window.dispatchEvent(new Event(LEADS_SEEN_EVENT));
                    }
                })
                .catch((err) => {
                    toast.error(apiMessage(err, "Could not open this lead"));
                    onCloseRef.current?.();
                }),
        [leadId]
    );
    useEffect(() => {
        load();
    }, [load]);

    // Run an action, refresh the panel and the list behind it
    const run = async (fn, okMessage) => {
        setBusy(true);
        try {
            const { data } = await fn();
            setLead(data.data);
            onChanged?.();
            if (okMessage) toast.success(okMessage);
            return true;
        } catch (err) {
            toast.error(apiMessage(err, "That didn't work. Please try again."));
            return false;
        } finally {
            setBusy(false);
        }
    };

    const moveStage = async () => {
        const needsReason = REASON_STAGES.includes(stageTarget) || CLOSED_STAGES.includes(lead.stage);
        if (needsReason && !reason.trim()) return toast.error("Add a reason");
        const toApplication = stageTarget === "application";
        if (toApplication && !(Number(ticket.amount) > 0)) return toast.error("Enter the ticket size");
        if (stageTarget === "exam_scheduled" && !examAt && !lead.exam_scheduled_at) return toast.error("Choose the exam date and time");
        const extra = toApplication
            ? { ticket_size: Number(ticket.amount), ticket_currency: ticket.currency }
            : stageTarget === "exam_scheduled" && examAt
              ? { exam_scheduled_at: new Date(examAt).toISOString() }
              : undefined;
        if (await run(() => crmService.changeStage(lead.id, stageTarget, reason.trim() || undefined, extra), `Moved to ${STAGE_LABEL[stageTarget]}`)) {
            setStageTarget(null);
            setReason("");
        }
    };

    const saveLog = async () => {
        if (!logText.trim()) return toast.error("Write something first");
        if (await run(() => crmService.logActivity(lead.id, { type: logType, body: logText.trim() }), "Saved")) {
            setLogType(null);
            setLogText("");
        }
    };

    const saveFollowUp = async () => {
        if (!fu.due_at) return toast.error("Pick a date and time");
        const ok = await run(
            () =>
                crmService.scheduleFollowUp(lead.id, {
                    due_at: new Date(fu.due_at).toISOString(),
                    type: fu.type,
                    note: fu.note.trim() || undefined,
                }),
            "Follow-up scheduled"
        );
        if (ok) {
            setShowFollowUp(false);
            setFu({ due_at: "", type: "call", note: "" });
        }
    };

    // What this person may do (from the API; older servers send nothing → full access)
    const access = { edit: true, follow_ups: true, student_actions: true, ...(lead?.access ?? {}) };

    return (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Lead details"
                className="flex h-full w-full max-w-[560px] flex-col bg-surface shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {!lead ? (
                    <div className="flex flex-1 items-center justify-center">
                        <Loader2 className="animate-spin text-slate-500" />
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                            <div className="min-w-0">
                                <h2 className="truncate text-h3 font-extrabold text-slate-900">{lead.name}</h2>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-small text-slate-500">
                                    <StageBadge stage={lead.stage} />
                                    <span>Lead #{lead.id}</span>
                                    <span>· {SOURCE_LABEL[lead.source] ?? lead.source}</span>
                                </div>
                            </div>
                            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                            {/* Contact + quick actions */}
                            <section>
                                <div className="flex flex-wrap gap-2">
                                    {lead.phone && (
                                        <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#2F6496] px-3 py-2 text-ui font-bold text-white hover:bg-[#275382]">
                                            <Phone size={14} aria-hidden="true" /> Call
                                        </a>
                                    )}
                                    {whatsappNumberOf(lead) && (
                                        <button
                                            type="button"
                                            onClick={() => setCompose("whatsapp")}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F7A42] px-3 py-2 text-ui font-bold text-white hover:bg-[#0c6636]"
                                        >
                                            <MessageCircle size={14} aria-hidden="true" /> WhatsApp
                                        </button>
                                    )}
                                    {isAdmin && onMove && (
                                        <button
                                            type="button"
                                            onClick={() => onMove(lead.id)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-ui font-bold text-slate-700"
                                        >
                                            <Shuffle size={14} aria-hidden="true" /> {lead.owner_id ? "Transfer" : "Assign"}
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            type="button"
                                            onClick={() => onDelete(lead.id)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-ui font-bold text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 size={14} aria-hidden="true" /> Delete
                                        </button>
                                    )}
                                    {lead.email && (
                                        <button
                                            type="button"
                                            onClick={() => setCompose("email")}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#B45309] px-3 py-2 text-ui font-bold text-white hover:bg-[#92400e]"
                                        >
                                            <Mail size={14} aria-hidden="true" /> Email
                                        </button>
                                    )}
                                </div>
                                <dl className="mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-ui">
                                    <dt className="text-slate-500">Phone</dt>
                                    <dd className="text-slate-900">
                                        {lead.phone || "—"}
                                        {lead.phone && !access.edit_phone && <span className="ml-1.5 text-small text-slate-400">(from lead source)</span>}
                                    </dd>
                                    <dt className="text-slate-500">WhatsApp</dt>
                                    <dd className="text-slate-900">
                                        {waEdit !== null ? (
                                            <span className="flex flex-wrap items-center gap-1.5">
                                                <input
                                                    value={waEdit}
                                                    onChange={(e) => setWaEdit(e.target.value)}
                                                    placeholder="+91 98765 43210"
                                                    aria-label="WhatsApp number"
                                                    autoFocus
                                                    className={cn(inputCls, "w-44 py-1")}
                                                />
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={async () => {
                                                        if (await run(() => crmService.update(lead.id, { whatsapp_number: waEdit.trim() || null }), "WhatsApp number saved")) setWaEdit(null);
                                                    }}
                                                    className="rounded-lg bg-action px-2.5 py-1 text-small font-bold text-white disabled:opacity-60"
                                                >
                                                    Save
                                                </button>
                                                <button type="button" onClick={() => setWaEdit(null)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-small font-semibold">
                                                    Cancel
                                                </button>
                                            </span>
                                        ) : (
                                            <span className="flex flex-wrap items-center gap-2">
                                                {lead.whatsapp_number || <span className="text-slate-500">{lead.phone ? "Same as phone" : "—"}</span>}
                                                {access.edit && (
                                                    <button type="button" onClick={() => setWaEdit(lead.whatsapp_number ?? "")} className="text-small font-semibold text-action hover:underline">
                                                        {lead.whatsapp_number ? "Change" : "Add WhatsApp number"}
                                                    </button>
                                                )}
                                            </span>
                                        )}
                                    </dd>
                                    <dt className="text-slate-500">Email</dt>
                                    <dd className="break-all text-slate-900">{lead.email || "—"}</dd>
                                    <dt className="text-slate-500">Course</dt>
                                    <dd className="text-slate-900">
                                        <CourseSelect
                                            lead={lead}
                                            disabled={busy || !access.edit}
                                            onChange={(course_id) => run(() => crmService.update(lead.id, { course_id }), course_id ? "Course updated" : "Course removed")}
                                        />
                                    </dd>
                                    {lead.preferred_schedule && (
                                        <>
                                            <dt className="text-slate-500">Schedule</dt>
                                            <dd className="text-slate-900">{lead.preferred_schedule}</dd>
                                        </>
                                    )}
                                    <dt className="text-slate-500">Owner</dt>
                                    <dd className="text-slate-900">{lead.owner_name || "Unassigned"}</dd>

                                    <dt className="text-slate-500">Added</dt>
                                    <dd className="text-slate-900">{fmtDateTime(lead.created_at)}</dd>
                                    {lead.source_meta?.campaign && (
                                        <>
                                            <dt className="text-slate-500">Campaign</dt>
                                            <dd className="text-slate-900">{lead.source_meta.campaign}</dd>
                                        </>
                                    )}
                                    {formLabel(lead.source_meta?.form_name ?? lead.source_meta?.form) && (
                                        <>
                                            <dt className="text-slate-500">Form</dt>
                                            <dd className="text-slate-900">
                                                {formLabel(lead.source_meta.form_name ?? lead.source_meta.form)}
                                                {typeof lead.source_meta.page === "string" && lead.source_meta.page.startsWith("/") && (
                                                    <span className="text-slate-500"> · {lead.source_meta.page}</span>
                                                )}
                                            </dd>
                                        </>
                                    )}
                                    <dt className="text-slate-500">Student</dt>
                                    <dd className="text-slate-900">
                                        {lead.user_id ? (
                                            <>
                                                {ENROLLMENT_LABEL[lead.enrollment_status] ?? lead.enrollment_status}
                                                {lead.course_completed && " · Course completed"}
                                            </>
                                        ) : (
                                            <span className="text-slate-500">No account yet (linked automatically by email)</span>
                                        )}
                                    </dd>
                                    {lead.disposition_reason && (
                                        <>
                                            <dt className="text-slate-500">Reason</dt>
                                            <dd className="text-slate-900">{lead.disposition_reason}</dd>
                                        </>
                                    )}
                                </dl>
                                {answerEntries(lead.source_meta?.answers).length > 0 && (
                                    <div className="mt-4 rounded-lg border border-action/20 bg-action-soft/50 p-3">
                                        <h3 className="mb-2 text-label font-bold uppercase tracking-wide text-action-soft-ink">What they told us</h3>
                                        <dl className="space-y-2 text-ui">
                                            {answerEntries(lead.source_meta.answers).map(([label, value]) => (
                                                <div key={label}>
                                                    <dt className="text-small font-semibold text-slate-500">{label}</dt>
                                                    <dd className="whitespace-pre-wrap break-words text-slate-900">{value}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </div>
                                )}
                            </section>

                            {/* Status (Exam Coordinators: only Course Done, from the Exam section) */}
                            <section>
                                <h3 className="mb-2 text-ui font-bold uppercase tracking-wide text-slate-500">Update status</h3>
                                {lead.allowed_next_stages?.length ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {lead.allowed_next_stages.map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => {
                                                    setStageTarget(s);
                                                    setReason("");
                                                    if (s === "application") setTicket({ amount: lead.ticket_size ?? "", currency: lead.ticket_currency ?? "INR" });
                                                }}
                                                className={cn(
                                                    "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-small font-semibold",
                                                    stageTarget === s ? "border-action bg-action-soft text-action-soft-ink" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                                )}
                                            >
                                                <ArrowRight size={12} aria-hidden="true" /> {STAGE_LABEL[s]}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-ui text-slate-500">
                                        {!access.edit && lead.stage !== "course_done"
                                              ? "The consultant manages the status. Scheduling the exam moves it to Exam Scheduled; Payment Done moves it to Course Done."
                                              : lead.stage === "course_done"
                                                ? "Course Done. Set the payment back to Payment Due to reopen it."
                                                : "No further status changes."}
                                    </p>
                                )}
                                {stageTarget && (
                                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                        {(REASON_STAGES.includes(stageTarget) || CLOSED_STAGES.includes(lead.stage)) && (
                                            <input
                                                value={reason}
                                                onChange={(e) => setReason(e.target.value)}
                                                placeholder={CLOSED_STAGES.includes(lead.stage) ? "Why reopen?" : "Reason (required)"}
                                                className={cn(inputCls, "mb-2")}
                                                autoFocus
                                            />
                                        )}
                                        {stageTarget === "application" && (
                                            <div className="mb-2">
                                                <p className="mb-1.5 text-small font-semibold text-slate-600">Ticket size (required)</p>
                                                <TicketInputs
                                                    amount={ticket.amount}
                                                    currency={ticket.currency}
                                                    onAmount={(amount) => setTicket((t) => ({ ...t, amount }))}
                                                    onCurrency={(currency) => setTicket((t) => ({ ...t, currency }))}
                                                    autoFocus
                                                />
                                            </div>
                                        )}
                                        {stageTarget === "exam_scheduled" && (
                                            <label className="mb-2 block text-small font-semibold text-slate-600">
                                                Exam date and time {lead.exam_scheduled_at ? "(optional, keeps the current one)" : "(required)"}
                                                <input type="datetime-local" value={examAt} onChange={(e) => setExamAt(e.target.value)} className={cn(inputCls, "mt-1")} />
                                            </label>
                                        )}
                                        <div className="flex justify-end gap-2">
                                            <button type="button" onClick={() => setStageTarget(null)} className="rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-small font-semibold">
                                                Cancel
                                            </button>
                                            <button type="button" disabled={busy} onClick={moveStage} className="rounded-lg bg-action px-3 py-1.5 text-small font-bold text-white disabled:opacity-60">
                                                Move to {STAGE_LABEL[stageTarget]}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Log activity + follow-up */}
                            <section>
                                <h3 className="mb-2 text-ui font-bold uppercase tracking-wide text-slate-500">Log & schedule</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {QUICK_LOG.map(([type, label, Icon]) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setLogType(logType === type ? null : type)}
                                            className={cn(
                                                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-small font-semibold",
                                                logType === type ? "border-action bg-action-soft text-action-soft-ink" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                            )}
                                        >
                                            <Icon size={13} aria-hidden="true" /> {label}
                                        </button>
                                    ))}
                                    {access.follow_ups && !CLOSED_STAGES.includes(lead.stage) && (
                                        <button
                                            type="button"
                                            onClick={() => setShowFollowUp((v) => !v)}
                                            className={cn(
                                                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-small font-semibold",
                                                showFollowUp ? "border-action bg-action-soft text-action-soft-ink" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                            )}
                                        >
                                            <CalendarClock size={13} aria-hidden="true" /> Schedule follow-up
                                        </button>
                                    )}
                                </div>
                                {logType && (
                                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                        <textarea
                                            value={logText}
                                            onChange={(e) => setLogText(e.target.value)}
                                            rows={3}
                                            placeholder={logType === "call" ? "What happened on the call?" : "Write a note…"}
                                            className={inputCls}
                                            autoFocus
                                        />
                                        <div className="mt-2 flex justify-end">
                                            <button type="button" disabled={busy} onClick={saveLog} className="rounded-lg bg-action px-3 py-1.5 text-small font-bold text-white disabled:opacity-60">
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {showFollowUp && (
                                    <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                        <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
                                            <input
                                                type="datetime-local"
                                                value={fu.due_at}
                                                onChange={(e) => setFu((f) => ({ ...f, due_at: e.target.value }))}
                                                className={inputCls}
                                                aria-label="Follow-up date and time"
                                            />
                                            <select value={fu.type} onChange={(e) => setFu((f) => ({ ...f, type: e.target.value }))} className={inputCls} aria-label="Follow-up type">
                                                {FOLLOW_UP_TYPES.map(([v, l]) => (
                                                    <option key={v} value={v}>
                                                        {l}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <input value={fu.note} onChange={(e) => setFu((f) => ({ ...f, note: e.target.value }))} placeholder="Note (optional)" className={inputCls} />
                                        <div className="flex justify-end">
                                            <button type="button" disabled={busy} onClick={saveFollowUp} className="rounded-lg bg-action px-3 py-1.5 text-small font-bold text-white disabled:opacity-60">
                                                Schedule
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>

                            <LeadExamSection lead={lead} busy={busy} run={run} />

                            {lead.phone && <LeadWhatsApp leadId={lead.id} onSent={onChanged} />}

                            {access.student_actions && (
                                <LeadStudentActions key={`${lead.id}-${lead.course_id ?? "none"}`} lead={lead} isAdmin={isAdmin} onLeadChanged={(l) => {
                                    setLead(l);
                                    onChanged?.();
                                }} />
                            )}

                            {/* Follow-ups */}
                            {lead.follow_ups?.length > 0 && (
                                <section>
                                    <h3 className="mb-2 text-ui font-bold uppercase tracking-wide text-slate-500">Follow-ups</h3>
                                    <ul className="space-y-1.5">
                                        {lead.follow_ups.map((f) => (
                                            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-ui">
                                                <span>
                                                    <b className="capitalize">{f.type}</b> · {fmtDateTime(f.due_at)}
                                                    {f.status === "pending" && isOverdue(f.due_at) && <span className="ml-1.5 font-semibold text-red-600">Overdue</span>}
                                                    {f.status !== "pending" && <span className="ml-1.5 capitalize text-slate-500">· {f.status}</span>}
                                                    {f.note && <span className="block text-small text-slate-500">{f.note}</span>}
                                                </span>
                                                {f.status === "pending" && access.follow_ups && (
                                                    <span className="flex gap-1">
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => run(() => crmService.completeFollowUp(f.id, "done"), "Marked done")}
                                                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-small font-semibold text-emerald-700"
                                                        >
                                                            <CheckCircle2 size={12} aria-hidden="true" /> Done
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => run(() => crmService.completeFollowUp(f.id, "missed"), "Marked missed")}
                                                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-small font-semibold text-slate-600"
                                                        >
                                                            <XCircle size={12} aria-hidden="true" /> Missed
                                                        </button>
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {/* Timeline */}
                            <section>
                                <h3 className="mb-2 text-ui font-bold uppercase tracking-wide text-slate-500">Activity</h3>
                                <ol className="relative space-y-3 border-l border-slate-200 pl-4">
                                    {lead.activities.map((a) => (
                                        <li key={a.id} className="text-ui">
                                            <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-slate-300" aria-hidden="true" />
                                            <p className="font-semibold text-slate-800">{(ACTIVITY_TEXT[a.type] ?? (() => a.type))(a.meta)}</p>
                                            {a.body && <p className="whitespace-pre-wrap text-slate-600">{a.body}</p>}
                                            {a.type === "repeat_enquiry" &&
                                                answerEntries(a.meta?.answers).map(([label, value]) => (
                                                    <p key={label} className="whitespace-pre-wrap break-words text-slate-600">
                                                        <span className="font-semibold text-slate-700">{label}:</span> {value}
                                                    </p>
                                                ))}
                                            <p className="text-label text-slate-500">
                                                {a.actor_name ?? "System"} · {fmtDateTime(a.created_at)}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        </div>
                    </>
                )}
            </aside>
            {compose && <MessageComposer lead={lead} channel={compose} onClose={() => setCompose(null)} />}
        </div>
    );
}
