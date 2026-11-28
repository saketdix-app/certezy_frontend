import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, CalendarClock, ChevronLeft, ChevronRight, GraduationCap, Loader2 } from "lucide-react";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import { CLOSED_STAGES, REASON_STAGES, STAGE_LABEL, apiMessage, fmtDateTime, fmtMoney, inputCls, isOverdue } from "@/lib/crm";
import { STAGE_DOT, btnPrimary, fmtTotals } from "@/lib/newUi";
import { Avatar } from "./newUi";
import { CrmModal } from "./crmShared";
import { TicketInputs } from "./LeadExamSection";
import RedDot from "./RedDot";

const daysSince = (d) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400e3) : null);

/**
 * Pipeline board (new design): one column per stage with its count, ticket
 * total and cards. Drag a card to another column to change its stage.
 */
export default function PipelineBoard({ filters, isAdmin, onOpen, reloadKey }) {
    const [data, setData] = useState(null);
    const [collapsed, setCollapsed] = useState([]);
    const [dragId, setDragId] = useState(null);
    const [over, setOver] = useState(null);
    const [pending, setPending] = useState(null); // { lead, to } waiting for a reason / ticket / exam date
    const [more, setMore] = useState(null); // stage loading more cards
    const key = JSON.stringify(filters);

    const load = useCallback(async () => {
        try {
            const { data: res } = await crmService.pipeline(JSON.parse(key));
            setData(res.data);
        } catch (err) {
            toast.error(apiMessage(err, "Could not load the board"));
            setData({ columns: [] });
        }
    }, [key]);
    useEffect(() => {
        load();
    }, [load, reloadKey]);

    const loadMore = async (col) => {
        setMore(col.stage);
        try {
            const { data: res } = await crmService.pipeline({ ...JSON.parse(key), stage: col.stage, offset: col.leads.length });
            const extra = res.data.columns[0]?.leads ?? [];
            setData((d) => ({
                ...d,
                columns: d.columns.map((c) => (c.stage === col.stage ? { ...c, leads: [...c.leads, ...extra] } : c)),
            }));
        } catch (err) {
            toast.error(apiMessage(err, "Could not load more"));
        } finally {
            setMore(null);
        }
    };

    const findLead = (id) => data?.columns.flatMap((c) => c.leads).find((l) => l.id === id);

    const move = async (lead, to, reason, extra) => {
        // Show it in the new column straight away; the reload puts it right
        setData((d) => ({
            ...d,
            columns: d.columns.map((c) =>
                c.stage === lead.stage
                    ? { ...c, count: c.count - 1, leads: c.leads.filter((l) => l.id !== lead.id) }
                    : c.stage === to
                      ? { ...c, count: c.count + 1, leads: [{ ...lead, stage: to }, ...c.leads] }
                      : c
            ),
        }));
        try {
            await crmService.changeStage(lead.id, to, reason, extra);
            toast.success(`${lead.name} moved to ${STAGE_LABEL[to]}`);
        } catch (err) {
            toast.error(apiMessage(err, "Could not move the lead"));
        }
        load();
    };

    const drop = (to) => {
        const lead = findLead(dragId);
        setDragId(null);
        setOver(null);
        if (!lead || lead.stage === to) return;
        if (to === "course_done")
            return toast("Course Done is set by marking the payment as done on the lead.", { icon: "ℹ️" });
        const needsInput =
            REASON_STAGES.includes(to) || CLOSED_STAGES.includes(lead.stage) || to === "application" || (to === "exam_scheduled" && !lead.exam_scheduled_at);
        if (needsInput) setPending({ lead, to });
        else move(lead, to);
    };

    if (!data)
        return (
            <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-slate-500" />
            </div>
        );

    return (
        <>
            <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 [scrollbar-width:thin]">
                <div className="flex min-w-max items-stretch gap-3">
                    {data.columns.map((col) => {
                        const isCollapsed = collapsed.includes(col.stage);
                        return (
                            <section
                                key={col.stage}
                                aria-label={STAGE_LABEL[col.stage]}
                                onDragOver={(e) => {
                                    if (dragId == null) return;
                                    e.preventDefault();
                                    setOver(col.stage);
                                }}
                                onDragLeave={() => setOver((o) => (o === col.stage ? null : o))}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    drop(col.stage);
                                }}
                                className={cn(
                                    "flex flex-col rounded-xl border bg-slate-50/70 transition-colors",
                                    isCollapsed ? "w-12" : "w-[272px]",
                                    over === col.stage ? "border-action bg-action-soft/60" : "border-slate-200"
                                )}
                            >
                                <header
                                    className={cn(
                                        "flex items-center gap-2 border-b border-slate-200 px-3 py-2.5",
                                        isCollapsed && "flex-col border-b-0 px-0"
                                    )}
                                >
                                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STAGE_DOT[col.stage] }} aria-hidden="true" />
                                    <h2
                                        className={cn(
                                            "min-w-0 flex-1 truncate text-label font-bold uppercase tracking-wide text-slate-700",
                                            isCollapsed && "[writing-mode:vertical-rl]"
                                        )}
                                    >
                                        {STAGE_LABEL[col.stage]}
                                    </h2>
                                    <span className="rounded-full bg-surface px-2 py-0.5 text-label font-bold text-slate-600">{col.count}</span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCollapsed((c) => (c.includes(col.stage) ? c.filter((s) => s !== col.stage) : [...c, col.stage]))
                                        }
                                        aria-label={isCollapsed ? `Expand ${STAGE_LABEL[col.stage]}` : `Collapse ${STAGE_LABEL[col.stage]}`}
                                        className="rounded border border-slate-200 bg-surface p-0.5 text-slate-500 hover:text-slate-800"
                                    >
                                        {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
                                    </button>
                                </header>
                                {!isCollapsed && (
                                    <>
                                        <ul className="flex max-h-[62vh] min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2 [scrollbar-width:thin]">
                                            {col.leads.map((l) => (
                                                <BoardCard
                                                    key={l.id}
                                                    lead={l}
                                                    isAdmin={isAdmin}
                                                    dragging={dragId === l.id}
                                                    onOpen={() => onOpen(l.id)}
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.effectAllowed = "move";
                                                        e.dataTransfer.setData("text/plain", String(l.id));
                                                        setDragId(l.id);
                                                    }}
                                                    onDragEnd={() => {
                                                        setDragId(null);
                                                        setOver(null);
                                                    }}
                                                />
                                            ))}
                                            {!col.leads.length && (
                                                <li className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-small text-slate-500">
                                                    No leads
                                                </li>
                                            )}
                                            {col.leads.length < col.count && (
                                                <li>
                                                    <button
                                                        type="button"
                                                        disabled={more === col.stage}
                                                        onClick={() => loadMore(col)}
                                                        className="w-full rounded-lg border border-slate-200 bg-surface py-1.5 text-small font-semibold text-action hover:border-action disabled:opacity-60"
                                                    >
                                                        {more === col.stage ? "Loading…" : `Show more (${col.count - col.leads.length} left)`}
                                                    </button>
                                                </li>
                                            )}
                                        </ul>
                                        {data.money_visible && (
                                            <footer className="border-t border-slate-200 px-3 py-2 text-center text-small text-slate-600">
                                                Total: <b className="font-bold text-slate-800 tabular-nums">{fmtTotals(col.totals)}</b>
                                            </footer>
                                        )}
                                    </>
                                )}
                            </section>
                        );
                    })}
                </div>
            </div>
            {pending && (
                <MoveDialog
                    lead={pending.lead}
                    to={pending.to}
                    onClose={() => setPending(null)}
                    onMove={(reason, extra) => {
                        move(pending.lead, pending.to, reason, extra);
                        setPending(null);
                    }}
                />
            )}
        </>
    );
}

function BoardCard({ lead: l, isAdmin, dragging, onOpen, onDragStart, onDragEnd }) {
    const quiet = daysSince(l.last_activity_at ?? l.created_at);
    return (
        <li
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={cn(
                "cursor-grab rounded-lg border bg-surface p-3 shadow-sm transition hover:border-action hover:shadow-md active:cursor-grabbing",
                l.payment_alert ? "border-red-300 ring-1 ring-red-200" : "border-slate-200",
                dragging && "opacity-40"
            )}
        >
            <button type="button" onClick={onOpen} className="block w-full text-left">
                <span className="flex items-start gap-1.5 text-ui font-bold leading-snug text-action hover:underline">
                    {l.is_new && <RedDot label="New lead — not opened yet" className="mt-1.5" />}
                    <span className="line-clamp-2">{l.name}</span>
                </span>
                {l.course_title && (
                    <span className="mt-1 flex items-center gap-1 text-small text-slate-600">
                        <GraduationCap size={12} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">{l.course_title}</span>
                    </span>
                )}
                {l.ticket_size != null && (
                    <span className="mt-1 block text-small text-slate-700">
                        <b className="font-semibold">Ticket:</b> {fmtMoney(l.ticket_size, l.ticket_currency)}
                    </span>
                )}
                {l.stage === "exam_scheduled" && l.exam_scheduled_at && (
                    <span className="mt-0.5 block text-small text-slate-700">
                        <b className="font-semibold">Exam:</b> {fmtDateTime(l.exam_scheduled_at)}
                    </span>
                )}
            </button>
            <div className="mt-2 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                    {isAdmin &&
                        (l.owner_name ? (
                            <span title={l.owner_name} className="flex min-w-0 items-center gap-1.5">
                                <Avatar name={l.owner_name} size={20} />
                                <span className="truncate text-label text-slate-500">{l.owner_name}</span>
                            </span>
                        ) : (
                            <span className="text-label font-semibold text-amber-700">Unassigned</span>
                        ))}
                </span>
                {l.next_follow_up_at && (
                    <span
                        className={cn(
                            "inline-flex shrink-0 items-center gap-1 text-label",
                            isOverdue(l.next_follow_up_at) ? "font-bold text-red-600" : "text-slate-500"
                        )}
                        title="Next follow-up"
                    >
                        <CalendarClock size={11} aria-hidden="true" /> {fmtDateTime(l.next_follow_up_at)}
                    </span>
                )}
            </div>
            <p className="mt-1.5 text-label text-slate-500">
                {l.payment_alert ? (
                    <span className="inline-flex items-center gap-1 font-bold text-red-700">
                        <AlertTriangle size={11} aria-hidden="true" /> Exam done, payment due
                    </span>
                ) : quiet == null || quiet < 1 ? (
                    "Activity today"
                ) : (
                    <span className={cn(quiet >= 7 && "font-semibold text-amber-700")}>
                        No activity for {quiet} day{quiet === 1 ? "" : "s"}
                    </span>
                )}
            </p>
        </li>
    );
}

/** What a move needs: a reason, the ticket size, or the exam date. */
function MoveDialog({ lead, to, onClose, onMove }) {
    const [reason, setReason] = useState("");
    const [ticket, setTicket] = useState({ amount: lead.ticket_size ?? "", currency: lead.ticket_currency ?? "INR" });
    const [examAt, setExamAt] = useState("");
    const needsReason = REASON_STAGES.includes(to) || CLOSED_STAGES.includes(lead.stage);
    const submit = (e) => {
        e.preventDefault();
        if (needsReason && !reason.trim()) return toast.error("Add a reason");
        if (to === "application" && !(Number(ticket.amount) > 0)) return toast.error("Enter the ticket size");
        if (to === "exam_scheduled" && !examAt) return toast.error("Choose the exam date and time");
        const extra =
            to === "application"
                ? { ticket_size: Number(ticket.amount), ticket_currency: ticket.currency }
                : to === "exam_scheduled"
                  ? { exam_scheduled_at: new Date(examAt).toISOString() }
                  : undefined;
        onMove(reason.trim() || undefined, extra);
    };
    return (
        <CrmModal title={`Move ${lead.name} to ${STAGE_LABEL[to]}`} onClose={onClose}>
            <form onSubmit={submit} className="space-y-3">
                {needsReason && (
                    <label className="block text-small font-semibold text-slate-600">
                        {CLOSED_STAGES.includes(lead.stage) ? "Why reopen?" : "Reason"}
                        <input value={reason} onChange={(e) => setReason(e.target.value)} className={cn(inputCls, "mt-1")} autoFocus />
                    </label>
                )}
                {to === "application" && (
                    <div>
                        <p className="mb-1 text-small font-semibold text-slate-600">Ticket size</p>
                        <TicketInputs
                            amount={ticket.amount}
                            currency={ticket.currency}
                            onAmount={(amount) => setTicket((t) => ({ ...t, amount }))}
                            onCurrency={(currency) => setTicket((t) => ({ ...t, currency }))}
                            autoFocus={!needsReason}
                        />
                    </div>
                )}
                {to === "exam_scheduled" && (
                    <label className="block text-small font-semibold text-slate-600">
                        Exam date and time
                        <input type="datetime-local" value={examAt} onChange={(e) => setExamAt(e.target.value)} className={cn(inputCls, "mt-1")} />
                    </label>
                )}
                <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-ui font-semibold">
                        Cancel
                    </button>
                    <button type="submit" className={btnPrimary}>
                        Move to {STAGE_LABEL[to]}
                    </button>
                </div>
            </form>
        </CrmModal>
    );
}
