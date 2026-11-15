import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";

import crmService from "@/services/crmService";
import LeadStudentActions from "./LeadStudentActions";
import LeadWhatsApp from "./LeadWhatsApp";
import { cn } from "@/lib/utils";
import { StageBadge } from "./crmShared";
import { CLOSED_STAGES, ENROLLMENT_LABEL, FOLLOW_UP_TYPES, REASON_STAGES, SOURCE_LABEL, STAGE_LABEL, apiMessage, fmtDateTime, inputCls, isOverdue, waLink } from "@/lib/crm";

const ACTIVITY_TEXT = {
    created: () => "Lead created",
    assignment: () => "Lead assigned",
    updated: (m) => `Details updated (${(m?.fields ?? []).join(", ")})`,
    status_change: (m) => `${STAGE_LABEL[m?.from] ?? m?.from} → ${STAGE_LABEL[m?.to] ?? m?.to}${m?.automation ? " (automatic)" : ""}`,
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
    repeat_enquiry: (m) => `Enquired again via ${m?.source ?? "a form"}${m?.campaign ? ` (${m.campaign})` : ""}`,
};

const QUICK_LOG = [
    ["call", "Log call", Phone],
    ["message", "Log message", MessageSquareText],
    ["note", "Add note", StickyNote],
];

/** Slide-over panel: everything about one lead, and the actions allowed on it. */
export default function LeadDetailPanel({ leadId, onClose, onChanged, isAdmin, onMove }) {
    const [lead, setLead] = useState(null);
    const [stageTarget, setStageTarget] = useState(null);
    const [reason, setReason] = useState("");
    const [logType, setLogType] = useState(null);
    const [logText, setLogText] = useState("");
    const [showFollowUp, setShowFollowUp] = useState(false);
    const [fu, setFu] = useState({ due_at: "", type: "call", note: "" });
    const [busy, setBusy] = useState(false);

    const load = useCallback(
        () =>
            crmService
                .get(leadId)
                .then(({ data }) => setLead(data.data))
                .catch((err) => {
                    toast.error(apiMessage(err, "Could not open this lead"));
                    onClose();
                }),
        [leadId, onClose]
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
        if (await run(() => crmService.changeStage(lead.id, stageTarget, reason.trim() || undefined), `Moved to ${STAGE_LABEL[stageTarget]}`)) {
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

    return (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Lead details"
                className="flex h-full w-full max-w-[560px] flex-col bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {!lead ? (
                    <div className="flex flex-1 items-center justify-center">
                        <Loader2 className="animate-spin text-slate-400" />
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                            <div className="min-w-0">
                                <h2 className="truncate text-[18px] font-extrabold text-slate-900">{lead.name}</h2>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-slate-500">
                                    <StageBadge stage={lead.stage} />
                                    <span>Lead #{lead.id}</span>
                                    <span>· {SOURCE_LABEL[lead.source] ?? lead.source}</span>
                                </div>
                            </div>
                            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
                            {/* Contact + quick actions */}
                            <section>
                                <div className="flex flex-wrap gap-2">
                                    {lead.phone && (
                                        <>
                                            <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#3282B8] px-3 py-2 text-[13px] font-bold text-white">
                                                <Phone size={14} aria-hidden="true" /> Call
                                            </a>
                                            <a href={waLink(lead.phone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] font-bold text-emerald-700">
                                                <MessageCircle size={14} aria-hidden="true" /> WhatsApp
                                            </a>
                                        </>
                                    )}
                                    {isAdmin && onMove && (
                                        <button
                                            type="button"
                                            onClick={() => onMove(lead.id)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-bold text-slate-700"
                                        >
                                            <Shuffle size={14} aria-hidden="true" /> {lead.owner_id ? "Transfer" : "Assign"}
                                        </button>
                                    )}
                                    {lead.email && (
                                        <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-bold text-slate-700">
                                            <Mail size={14} aria-hidden="true" /> Email
                                        </a>
                                    )}
                                </div>
                                <dl className="mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[13.5px]">
                                    <dt className="text-slate-500">Phone</dt>
                                    <dd className="text-slate-900">{lead.phone || "—"}</dd>
                                    <dt className="text-slate-500">Email</dt>
                                    <dd className="break-all text-slate-900">{lead.email || "—"}</dd>
                                    <dt className="text-slate-500">Course</dt>
                                    <dd className="text-slate-900">{lead.course_title || "Not sure yet"}</dd>
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
                            </section>

                            {/* Status */}
                            <section>
                                <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-slate-500">Update status</h3>
                                {lead.allowed_next_stages?.length ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {lead.allowed_next_stages.map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => {
                                                    setStageTarget(s);
                                                    setReason("");
                                                }}
                                                className={cn(
                                                    "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold",
                                                    stageTarget === s ? "border-[#3282B8] bg-[#EBF4FF] text-[#1A5F8A]" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                                )}
                                            >
                                                <ArrowRight size={12} aria-hidden="true" /> {STAGE_LABEL[s]}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[13px] text-slate-500">
                                        {CLOSED_STAGES.includes(lead.stage)
                                            ? "Closed. Only an Admin can reopen it."
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
                                        {stageTarget === "course_done" && (
                                            <p className="mb-2 text-[12px] text-slate-500">
                                                Only allowed once the student has completed the course (all lessons and every exam).
                                            </p>
                                        )}
                                        <div className="flex justify-end gap-2">
                                            <button type="button" onClick={() => setStageTarget(null)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold">
                                                Cancel
                                            </button>
                                            <button type="button" disabled={busy} onClick={moveStage} className="rounded-lg bg-[#3282B8] px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-60">
                                                Move to {STAGE_LABEL[stageTarget]}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Log activity + follow-up */}
                            <section>
                                <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-slate-500">Log & schedule</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {QUICK_LOG.map(([type, label, Icon]) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setLogType(logType === type ? null : type)}
                                            className={cn(
                                                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold",
                                                logType === type ? "border-[#3282B8] bg-[#EBF4FF] text-[#1A5F8A]" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                            )}
                                        >
                                            <Icon size={13} aria-hidden="true" /> {label}
                                        </button>
                                    ))}
                                    {!CLOSED_STAGES.includes(lead.stage) && (
                                        <button
                                            type="button"
                                            onClick={() => setShowFollowUp((v) => !v)}
                                            className={cn(
                                                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold",
                                                showFollowUp ? "border-[#3282B8] bg-[#EBF4FF] text-[#1A5F8A]" : "border-slate-200 text-slate-700 hover:bg-slate-50"
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
                                            <button type="button" disabled={busy} onClick={saveLog} className="rounded-lg bg-[#3282B8] px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-60">
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
                                            <button type="button" disabled={busy} onClick={saveFollowUp} className="rounded-lg bg-[#3282B8] px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-60">
                                                Schedule
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {lead.phone && <LeadWhatsApp leadId={lead.id} onSent={onChanged} />}

                            <LeadStudentActions key={lead.id} lead={lead} isAdmin={isAdmin} onLeadChanged={(l) => {
                                setLead(l);
                                onChanged?.();
                            }} />

                            {/* Follow-ups */}
                            {lead.follow_ups?.length > 0 && (
                                <section>
                                    <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-slate-500">Follow-ups</h3>
                                    <ul className="space-y-1.5">
                                        {lead.follow_ups.map((f) => (
                                            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[13px]">
                                                <span>
                                                    <b className="capitalize">{f.type}</b> · {fmtDateTime(f.due_at)}
                                                    {f.status === "pending" && isOverdue(f.due_at) && <span className="ml-1.5 font-semibold text-red-600">Overdue</span>}
                                                    {f.status !== "pending" && <span className="ml-1.5 capitalize text-slate-500">· {f.status}</span>}
                                                    {f.note && <span className="block text-[12px] text-slate-500">{f.note}</span>}
                                                </span>
                                                {f.status === "pending" && (
                                                    <span className="flex gap-1">
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => run(() => crmService.completeFollowUp(f.id, "done"), "Marked done")}
                                                            className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-1 text-[12px] font-semibold text-emerald-700"
                                                        >
                                                            <CheckCircle2 size={12} aria-hidden="true" /> Done
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => run(() => crmService.completeFollowUp(f.id, "missed"), "Marked missed")}
                                                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[12px] font-semibold text-slate-600"
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
                                <h3 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-slate-500">Activity</h3>
                                <ol className="relative space-y-3 border-l border-slate-200 pl-4">
                                    {lead.activities.map((a) => (
                                        <li key={a.id} className="text-[13px]">
                                            <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-slate-300" aria-hidden="true" />
                                            <p className="font-semibold text-slate-800">{(ACTIVITY_TEXT[a.type] ?? (() => a.type))(a.meta)}</p>
                                            {a.body && <p className="whitespace-pre-wrap text-slate-600">{a.body}</p>}
                                            <p className="text-[11.5px] text-slate-400">
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
        </div>
    );
}
