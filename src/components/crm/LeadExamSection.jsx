import { useEffect, useState } from "react";
import { CalendarCheck2, CheckCircle2, GraduationCap, Pencil, UserRound } from "lucide-react";

import crmService from "@/services/crmService";
import { EXAM_RESULT_LABEL, EXAM_STATUS, TICKET_CURRENCIES, fmtDate, fmtDateTime, fmtMoney, inputCls } from "@/lib/crm";
import { cn } from "@/lib/utils";

// <input type="datetime-local"> value for a date (local time)
const toLocalInput = (d) => {
    if (!d) return "";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const todayInput = () => toLocalInput(new Date()).slice(0, 10);

export function ExamStatusBadge({ status, className }) {
    const [label, cls] = EXAM_STATUS[status] ?? EXAM_STATUS.not_scheduled;
    return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-label font-semibold", cls, className)}>{label}</span>;
}

/** Ticket size (INR / USD) — set when the lead moves to Application; owner or Admin can change it. */
export function TicketSizeField({ lead, canEdit, busy, run }) {
    const [editing, setEditing] = useState(false);
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState("INR");
    const start = () => {
        setAmount(lead.ticket_size ?? "");
        setCurrency(lead.ticket_currency ?? "INR");
        setEditing(true);
    };
    const save = async () => {
        const value = amount === "" ? null : Number(amount);
        if (value !== null && !(value > 0)) return;
        if (
            await run(
                () => crmService.update(lead.id, { ticket_size: value, ticket_currency: value === null ? null : currency }),
                value === null ? "Ticket size removed" : "Ticket size saved"
            )
        ) {
            setEditing(false);
        }
    };

    if (editing) {
        return (
            <div className="flex flex-wrap items-center gap-1.5">
                <TicketInputs amount={amount} currency={currency} onAmount={setAmount} onCurrency={setCurrency} />
                <button type="button" disabled={busy} onClick={save} className="rounded-lg bg-action px-2.5 py-1.5 text-small font-bold text-white disabled:opacity-60">
                    Save
                </button>
                <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-small font-semibold text-slate-600">
                    Cancel
                </button>
            </div>
        );
    }
    return (
        <span className="inline-flex items-center gap-2">
            {lead.ticket_size != null ? (
                <b className="font-semibold">{fmtMoney(lead.ticket_size, lead.ticket_currency)}</b>
            ) : (
                <span className="text-slate-500">Not set</span>
            )}
            {canEdit && (
                <button type="button" onClick={start} className="inline-flex items-center gap-1 text-small font-semibold text-action hover:underline">
                    <Pencil size={12} aria-hidden="true" /> {lead.ticket_size != null ? "Edit" : "Add"}
                </button>
            )}
        </span>
    );
}

/** Amount + INR/USD, shared by the stage change and the edit field. */
export function TicketInputs({ amount, currency, onAmount, onCurrency, autoFocus }) {
    return (
        <div className="flex items-stretch gap-1.5">
            <select
                value={currency}
                onChange={(e) => onCurrency(e.target.value)}
                aria-label="Ticket currency"
                className={cn(inputCls, "w-[84px] shrink-0")}
            >
                {TICKET_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                        {c === "INR" ? "₹ INR" : "$ USD"}
                    </option>
                ))}
            </select>
            <input
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => onAmount(e.target.value)}
                placeholder="Ticket size"
                aria-label="Ticket size"
                className={cn(inputCls, "w-[150px]")}
                autoFocus={autoFocus}
            />
        </div>
    );
}

/**
 * Exam on a lead: the coordinator (assigned by the consultant or an Admin),
 * schedule → completed (with an optional result), then Course Done.
 */
export default function LeadExamSection({ lead, busy, run }) {
    const access = lead.access ?? {};
    const [coordinators, setCoordinators] = useState(null);
    const [form, setForm] = useState(null); // null | "schedule" | "complete"
    const [when, setWhen] = useState("");
    const [result, setResult] = useState("");
    const [note, setNote] = useState("");

    useEffect(() => {
        if (!access.assign_exam_coordinator) return;
        crmService
            .examCoordinators()
            .then(({ data }) => setCoordinators(data.data ?? []))
            .catch(() => setCoordinators([]));
    }, [access.assign_exam_coordinator]);

    const open = (kind) => {
        setForm(kind);
        setNote(lead.exam_note ?? "");
        if (kind === "schedule") setWhen(toLocalInput(lead.exam_scheduled_at));
        else {
            setWhen(lead.exam_completed_at ? toLocalInput(lead.exam_completed_at).slice(0, 10) : todayInput());
            setResult(lead.exam_result ?? "");
        }
    };

    const save = async () => {
        if (!when) return;
        const body =
            form === "schedule"
                ? { status: "scheduled", scheduled_at: new Date(when).toISOString(), note: note.trim() || null }
                : {
                      status: "completed",
                      // the day it was taken (noon local, so time zones never move it a day)
                      completed_at: new Date(`${when}T12:00:00`) > new Date() ? new Date().toISOString() : new Date(`${when}T12:00:00`).toISOString(),
                      result: result || null,
                      note: note.trim() || null,
                  };
        if (await run(() => crmService.updateExam(lead.id, body), form === "schedule" ? "Exam scheduled" : "Exam marked completed")) {
            setForm(null);
        }
    };

    const status = lead.exam_status ?? "not_scheduled";

    return (
        <section>
            <h3 className="mb-2 text-ui font-bold uppercase tracking-wide text-slate-500">Exam</h3>
            <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                {/* Coordinator */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-ui text-slate-500">
                        <UserRound size={14} aria-hidden="true" /> Exam coordinator
                    </span>
                    {access.assign_exam_coordinator ? (
                        <select
                            value={lead.exam_coordinator_id ?? ""}
                            disabled={busy || !coordinators}
                            onChange={(e) =>
                                run(
                                    () => crmService.setExamCoordinator(lead.id, e.target.value ? Number(e.target.value) : null),
                                    e.target.value ? "Exam coordinator assigned" : "Exam coordinator removed"
                                )
                            }
                            aria-label="Exam coordinator"
                            className={cn(inputCls, "w-auto min-w-[200px] py-1")}
                        >
                            <option value="">Not assigned</option>
                            {lead.exam_coordinator_id && !coordinators?.some((c) => c.id === lead.exam_coordinator_id) && (
                                <option value={lead.exam_coordinator_id}>{lead.exam_coordinator_name ?? "Current coordinator"}</option>
                            )}
                            {(coordinators ?? []).map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                    {c.open_exams ? ` (${c.open_exams} open)` : ""}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <span className="text-ui font-semibold text-slate-900">{lead.exam_coordinator_name ?? "Not assigned"}</span>
                    )}
                </div>
                {access.assign_exam_coordinator && coordinators?.length === 0 && (
                    <p className="text-small text-slate-500">No exam coordinators yet. An Admin can add one in Admin → Team.</p>
                )}

                {/* Status */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <span className="flex flex-wrap items-center gap-2 text-ui">
                        <ExamStatusBadge status={status} />
                        {status === "scheduled" && (
                            <span className="text-slate-700">
                                {lead.exam_scheduled_at ? fmtDateTime(lead.exam_scheduled_at) : "Date not set"}
                            </span>
                        )}
                        {status === "completed" && (
                            <span className="text-slate-700">
                                {fmtDate(lead.exam_completed_at)}
                                {lead.exam_result && <b className="ml-1.5">· {EXAM_RESULT_LABEL[lead.exam_result]}</b>}
                            </span>
                        )}
                    </span>
                    {!form && (
                        <span className="flex flex-wrap gap-1.5">
                            {status !== "completed" && (
                                <button
                                    type="button"
                                    onClick={() => open("schedule")}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-small font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <CalendarCheck2 size={13} aria-hidden="true" /> {status === "scheduled" ? "Change date" : "Schedule exam"}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => open("complete")}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-small font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                                <CheckCircle2 size={13} aria-hidden="true" /> {status === "completed" ? "Edit result" : "Mark exam completed"}
                            </button>
                        </span>
                    )}
                </div>
                {lead.exam_note && !form && <p className="text-small text-slate-600">{lead.exam_note}</p>}

                {form && (
                    <div className="space-y-2 rounded-lg bg-slate-50 p-3">
                        <label className="block text-small font-semibold text-slate-600">
                            {form === "schedule" ? "Exam date and time" : "Exam taken on"}
                            <input
                                type={form === "schedule" ? "datetime-local" : "date"}
                                value={when}
                                max={form === "complete" ? todayInput() : undefined}
                                onChange={(e) => setWhen(e.target.value)}
                                className={cn(inputCls, "mt-1")}
                                autoFocus
                            />
                        </label>
                        {form === "complete" && (
                            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Result">
                                {[
                                    ["", "Result not known"],
                                    ["passed", "Passed"],
                                    ["failed", "Not passed"],
                                ].map(([v, l]) => (
                                    <button
                                        key={v || "none"}
                                        type="button"
                                        role="radio"
                                        aria-checked={result === v}
                                        onClick={() => setResult(v)}
                                        className={cn(
                                            "rounded-full border px-3 py-1 text-small font-semibold",
                                            result === v ? "border-action bg-action-soft text-action-soft-ink" : "border-slate-200 bg-surface text-slate-600"
                                        )}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                        )}
                        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" maxLength={255} className={inputCls} />
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-small font-semibold">
                                Cancel
                            </button>
                            <button type="button" disabled={busy || !when} onClick={save} className="rounded-lg bg-action px-3 py-1.5 text-small font-bold text-white disabled:opacity-60">
                                {form === "schedule" ? "Save date" : "Save"}
                            </button>
                        </div>
                    </div>
                )}

                {/* After the exam: Course Done */}
                {access.course_done && !form && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                        <span className="text-small font-medium text-emerald-800">Exam completed. You can mark the course as done.</span>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => run(() => crmService.changeStage(lead.id, "course_done"), "Marked Course Done")}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-small font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                            <GraduationCap size={14} aria-hidden="true" /> Mark Course Done
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
