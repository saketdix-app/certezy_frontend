import { useEffect, useState } from "react";
import {
    AlertTriangle,
    CalendarCheck2,
    CheckCircle2,
    ClipboardCheck,
    IndianRupee,
    Pencil,
    UserRound,
} from "lucide-react";

import crmService from "@/services/crmService";
import {
    EXAM_RESULT_LABEL,
    EXAM_STATUS,
    PAYMENT_STATUS,
    TICKET_CURRENCIES,
    fmtDate,
    fmtDateTime,
    fmtMoney,
    inputCls,
} from "@/lib/crm";
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
// A day picked in a date input → noon local (never shifts a day across time zones), never in the future
const dayToIso = (day) => {
    const d = new Date(`${day}T12:00:00`);
    return (d > new Date() ? new Date() : d).toISOString();
};

function Badge({ map, value, className }) {
    const [label, cls] = map[value] ?? Object.values(map)[0];
    return (
        <span
            className={cn(
                "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-label font-semibold",
                cls,
                className
            )}
        >
            {label}
        </span>
    );
}
export const ExamStatusBadge = ({ status, className }) => (
    <Badge map={EXAM_STATUS} value={status} className={className} />
);
export const PaymentBadge = ({ status, className }) => (
    <Badge map={PAYMENT_STATUS} value={status} className={className} />
);

/** Yes / No pill pair. */
function YesNo({ value, onChange, disabled, label }) {
    return (
        <div
            className="inline-flex rounded-lg border border-slate-200 p-0.5"
            role="radiogroup"
            aria-label={label}
        >
            {[
                [true, "Yes"],
                [false, "No"],
            ].map(([v, l]) => (
                <button
                    key={l}
                    type="button"
                    role="radio"
                    aria-checked={value === v}
                    disabled={disabled}
                    onClick={() => onChange(v)}
                    className={cn(
                        "rounded-md px-3 py-1 text-small font-semibold disabled:cursor-not-allowed",
                        value === v
                            ? v
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-600 text-white"
                            : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    {l}
                </button>
            ))}
        </div>
    );
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
                () =>
                    crmService.update(lead.id, {
                        ticket_size: value,
                        ticket_currency: value === null ? null : currency,
                    }),
                value === null ? "Ticket size removed" : "Ticket size saved"
            )
        ) {
            setEditing(false);
        }
    };

    if (editing) {
        return (
            <div className="flex flex-wrap items-center gap-1.5">
                <TicketInputs
                    amount={amount}
                    currency={currency}
                    onAmount={setAmount}
                    onCurrency={setCurrency}
                />
                <button
                    type="button"
                    disabled={busy}
                    onClick={save}
                    className="rounded-lg bg-action px-2.5 py-1.5 text-small font-bold text-white disabled:opacity-60"
                >
                    Save
                </button>
                <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-small font-semibold text-slate-600"
                >
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
                <button
                    type="button"
                    onClick={start}
                    className="inline-flex items-center gap-1 text-small font-semibold text-action hover:underline"
                >
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

function Block({ icon: Icon, title, badge, children, tone }) {
    return (
        <div
            className={cn(
                "rounded-xl border p-3",
                tone === "alert" ? "border-red-300 bg-red-50/60" : "border-slate-200"
            )}
        >
            <div className="mb-2.5 flex items-center justify-between gap-2">
                <h4 className="flex items-center gap-1.5 text-ui font-bold text-slate-800">
                    <Icon size={15} aria-hidden="true" className="text-slate-500" /> {title}
                </h4>
                {badge}
            </div>
            {children}
        </div>
    );
}

const Row = ({ label, children }) => (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1">
        <span className="text-small text-slate-500">{label}</span>
        <span className="text-ui text-slate-900">{children}</span>
    </div>
);

/**
 * The exam workflow on a lead:
 *   Application  — exam coordinator, ticket size, application submitted (consultant / Admin)
 *   Exam         — date & time, Scheduled / Rescheduled / Cancelled, Exam Done (anyone with access)
 *   Payment      — Payment Due / Done; Done moves the lead to Course Done (anyone with access)
 * Exam done + payment due shows a red alert.
 */
export default function LeadExamSection({ lead, busy, run }) {
    const access = lead.access ?? {};
    const [coordinators, setCoordinators] = useState(null);
    const [examForm, setExamForm] = useState(null); // { status, when, done, doneOn, result, note }
    const [payForm, setPayForm] = useState(null); // { paidOn, reference }
    const [appDate, setAppDate] = useState(null); // editing the submission date

    useEffect(() => {
        if (!access.assign_exam_coordinator) return;
        crmService
            .examCoordinators()
            .then(({ data }) => setCoordinators(data.data ?? []))
            .catch(() => setCoordinators([]));
    }, [access.assign_exam_coordinator]);

    const status = lead.exam_status ?? "not_scheduled";
    const inWorkflow = ["application", "exam_scheduled", "course_done"].includes(lead.stage);
    const showExam = inWorkflow || status !== "not_scheduled" || lead.exam_done;

    const openExam = () =>
        setExamForm({
            status: status === "not_scheduled" ? "scheduled" : status,
            when: toLocalInput(lead.exam_scheduled_at),
            done: Boolean(lead.exam_done),
            doneOn: lead.exam_completed_at ? toLocalInput(lead.exam_completed_at).slice(0, 10) : todayInput(),
            result: lead.exam_result ?? "",
            note: lead.exam_note ?? "",
        });
    const setE = (k, v) =>
        setExamForm((f) => {
            const next = { ...f, [k]: v };
            // Changing the date of an exam that already had one → Rescheduled
            if (
                k === "when" &&
                lead.exam_scheduled_at &&
                v &&
                v !== toLocalInput(lead.exam_scheduled_at) &&
                f.status === "scheduled"
            )
                next.status = "rescheduled";
            if (k === "status" && v === "cancelled") next.done = false;
            return next;
        });
    const saveExam = async () => {
        const f = examForm;
        if (f.status !== "cancelled" && !f.when) return;
        const body = {
            status: f.status,
            ...(f.when && { scheduled_at: new Date(f.when).toISOString() }),
            exam_done: f.done,
            ...(f.done && { completed_at: dayToIso(f.doneOn || todayInput()), result: f.result || null }),
            note: f.note.trim() || null,
        };
        const moving = lead.stage === "application" && ["scheduled", "rescheduled"].includes(f.status);
        if (
            await run(
                () => crmService.updateExam(lead.id, body),
                moving ? "Exam scheduled — moved to Exam Scheduled" : "Exam updated"
            )
        )
            setExamForm(null);
    };

    const savePayment = async (done) => {
        const body = done
            ? {
                  status: "done",
                  paid_at: dayToIso(payForm?.paidOn || todayInput()),
                  reference: payForm?.reference?.trim() || null,
              }
            : { status: "due" };
        if (
            await run(
                () => crmService.updatePayment(lead.id, body),
                done ? "Payment done — moved to Course Done" : "Payment set back to due"
            )
        )
            setPayForm(null);
    };

    // Early leads with nothing set yet: the section appears once the lead reaches Application
    const started =
        inWorkflow ||
        lead.exam_coordinator_id ||
        lead.ticket_size != null ||
        status !== "not_scheduled" ||
        lead.payment_status === "done";
    if (!started) return null;

    return (
        <section className="space-y-2.5">
            <h3 className="text-ui font-bold uppercase tracking-wide text-slate-500">
                Application, exam &amp; payment
            </h3>

            {lead.payment_alert && (
                <p
                    className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2.5 text-ui font-semibold text-red-800"
                    role="alert"
                >
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    Exam done but payment is still due. Collect the payment, then mark Payment Done.
                </p>
            )}

            {/* ── Application ── */}
            <Block
                icon={ClipboardCheck}
                title="Application"
                badge={
                    <span
                        className={cn(
                            "rounded-full px-2 py-0.5 text-label font-semibold",
                            lead.application_submitted
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                        )}
                    >
                        {lead.application_submitted ? "Submitted" : "Not submitted"}
                    </span>
                }
            >
                <Row
                    label={
                        <span className="inline-flex items-center gap-1.5">
                            <UserRound size={13} aria-hidden="true" /> Exam coordinator
                        </span>
                    }
                >
                    {access.assign_exam_coordinator ? (
                        <select
                            value={lead.exam_coordinator_id ?? ""}
                            disabled={busy || !coordinators}
                            onChange={(e) =>
                                run(
                                    () =>
                                        crmService.setExamCoordinator(
                                            lead.id,
                                            e.target.value ? Number(e.target.value) : null
                                        ),
                                    e.target.value ? "Exam coordinator assigned" : "Exam coordinator removed"
                                )
                            }
                            aria-label="Exam coordinator"
                            className={cn(inputCls, "w-auto min-w-[190px] py-1")}
                        >
                            <option value="">Not assigned</option>
                            {lead.exam_coordinator_id &&
                                !coordinators?.some((c) => c.id === lead.exam_coordinator_id) && (
                                    <option value={lead.exam_coordinator_id}>
                                        {lead.exam_coordinator_name ?? "Current coordinator"}
                                    </option>
                                )}
                            {(coordinators ?? []).map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                    {c.open_exams ? ` (${c.open_exams} open)` : ""}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <b className="font-semibold">{lead.exam_coordinator_name ?? "Not assigned"}</b>
                    )}
                </Row>
                <Row label="Ticket size">
                    <TicketSizeField lead={lead} canEdit={access.edit} busy={busy} run={run} />
                </Row>
                <Row label="Application submitted">
                    {access.update_application ? (
                        <span className="flex flex-wrap items-center justify-end gap-2">
                            <YesNo
                                label="Application submitted"
                                value={Boolean(lead.application_submitted)}
                                disabled={busy}
                                onChange={(v) => {
                                    if (v === Boolean(lead.application_submitted)) return;
                                    if (v) setAppDate(todayInput());
                                    else
                                        run(
                                            () => crmService.updateApplication(lead.id, { submitted: false }),
                                            "Marked not submitted"
                                        );
                                }}
                            />
                            {lead.application_submitted && appDate === null && (
                                <button
                                    type="button"
                                    onClick={() => setAppDate(lead.application_submitted_at ?? todayInput())}
                                    className="text-small font-semibold text-action hover:underline"
                                >
                                    {lead.application_submitted_at
                                        ? fmtDate(lead.application_submitted_at)
                                        : "Add date"}
                                </button>
                            )}
                        </span>
                    ) : lead.application_submitted ? (
                        <b className="font-semibold">
                            Yes
                            {lead.application_submitted_at && `, ${fmtDate(lead.application_submitted_at)}`}
                        </b>
                    ) : (
                        <span className="text-slate-500">No</span>
                    )}
                </Row>
                {appDate !== null && (
                    <div className="mt-1 flex flex-wrap items-end justify-end gap-2 rounded-lg bg-slate-50 p-2">
                        <label className="text-small font-semibold text-slate-600">
                            Submission date
                            <input
                                type="date"
                                value={String(appDate).slice(0, 10)}
                                max={todayInput()}
                                onChange={(e) => setAppDate(e.target.value)}
                                className={cn(inputCls, "mt-1 w-auto")}
                            />
                        </label>
                        <button
                            type="button"
                            onClick={() => setAppDate(null)}
                            className="rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-small font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={busy || !appDate}
                            onClick={async () => {
                                if (
                                    await run(
                                        () =>
                                            crmService.updateApplication(lead.id, {
                                                submitted: true,
                                                submitted_at: dayToIso(String(appDate).slice(0, 10)),
                                            }),
                                        "Application submitted"
                                    )
                                )
                                    setAppDate(null);
                            }}
                            className="rounded-lg bg-action px-3 py-1.5 text-small font-bold text-white disabled:opacity-60"
                        >
                            Save
                        </button>
                    </div>
                )}
            </Block>

            {/* ── Exam ── */}
            {showExam && (
                <Block icon={CalendarCheck2} title="Exam" badge={<ExamStatusBadge status={status} />}>
                    {!examForm ? (
                        <>
                            <Row label="Date & time">
                                {lead.exam_scheduled_at ? (
                                    <b className="font-semibold">{fmtDateTime(lead.exam_scheduled_at)}</b>
                                ) : (
                                    <span className="text-slate-500">Not set</span>
                                )}
                            </Row>
                            <Row label="Exam done">
                                {lead.exam_done ? (
                                    <b className="font-semibold text-emerald-700">
                                        Yes{lead.exam_completed_at && `, ${fmtDate(lead.exam_completed_at)}`}
                                        {lead.exam_result && ` · ${EXAM_RESULT_LABEL[lead.exam_result]}`}
                                    </b>
                                ) : (
                                    <span className="text-slate-500">No</span>
                                )}
                            </Row>
                            {lead.exam_note && (
                                <p className="pt-1 text-small text-slate-600">{lead.exam_note}</p>
                            )}
                            {access.update_exam && lead.stage !== "course_done" && (
                                <button
                                    type="button"
                                    onClick={openExam}
                                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-small font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    <Pencil size={13} aria-hidden="true" />{" "}
                                    {status === "not_scheduled" ? "Schedule exam" : "Update exam"}
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="space-y-2.5">
                            <div
                                className="flex flex-wrap gap-1.5"
                                role="radiogroup"
                                aria-label="Exam status"
                            >
                                {["scheduled", "rescheduled", "cancelled"].map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        role="radio"
                                        aria-checked={examForm.status === v}
                                        onClick={() => setE("status", v)}
                                        className={cn(
                                            "rounded-full border px-3 py-1 text-small font-semibold",
                                            examForm.status === v
                                                ? "border-action bg-action-soft text-action-soft-ink"
                                                : "border-slate-200 text-slate-600"
                                        )}
                                    >
                                        {EXAM_STATUS[v][0]}
                                    </button>
                                ))}
                            </div>
                            <label className="block text-small font-semibold text-slate-600">
                                Exam date and time
                                <input
                                    type="datetime-local"
                                    value={examForm.when}
                                    onChange={(e) => setE("when", e.target.value)}
                                    className={cn(inputCls, "mt-1")}
                                />
                            </label>
                            {examForm.status !== "cancelled" && (
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-small font-semibold text-slate-600">Exam done</span>
                                    <YesNo
                                        label="Exam done"
                                        value={examForm.done}
                                        onChange={(v) => setE("done", v)}
                                    />
                                </div>
                            )}
                            {examForm.done && (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <label className="block text-small font-semibold text-slate-600">
                                        Taken on
                                        <input
                                            type="date"
                                            value={examForm.doneOn}
                                            max={todayInput()}
                                            onChange={(e) => setE("doneOn", e.target.value)}
                                            className={cn(inputCls, "mt-1")}
                                        />
                                    </label>
                                    <label className="block text-small font-semibold text-slate-600">
                                        Result (optional)
                                        <select
                                            value={examForm.result}
                                            onChange={(e) => setE("result", e.target.value)}
                                            className={cn(inputCls, "mt-1")}
                                        >
                                            <option value="">Not known</option>
                                            <option value="passed">Passed</option>
                                            <option value="failed">Not passed</option>
                                        </select>
                                    </label>
                                </div>
                            )}
                            <input
                                value={examForm.note}
                                onChange={(e) => setE("note", e.target.value)}
                                placeholder="Note (optional)"
                                maxLength={255}
                                className={inputCls}
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setExamForm(null)}
                                    className="rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-small font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={busy || (examForm.status !== "cancelled" && !examForm.when)}
                                    onClick={saveExam}
                                    className="rounded-lg bg-action px-3 py-1.5 text-small font-bold text-white disabled:opacity-60"
                                >
                                    Save exam
                                </button>
                            </div>
                        </div>
                    )}
                </Block>
            )}

            {/* ── Payment ── */}
            {showExam && (
                <Block
                    icon={IndianRupee}
                    title="Payment"
                    badge={<PaymentBadge status={lead.payment_status ?? "due"} />}
                    tone={lead.payment_alert ? "alert" : undefined}
                >
                    {lead.payment_status === "done" ? (
                        <>
                            <Row label="Paid on">
                                <b className="font-semibold">
                                    {lead.payment_done_at ? fmtDate(lead.payment_done_at) : "—"}
                                </b>
                            </Row>
                            {lead.payment_reference && <Row label="Reference">{lead.payment_reference}</Row>}
                            {access.update_payment && (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => savePayment(false)}
                                    className="mt-2 text-small font-semibold text-slate-500 hover:text-slate-700 hover:underline"
                                >
                                    Set back to Payment Due
                                </button>
                            )}
                        </>
                    ) : access.update_payment ? (
                        payForm ? (
                            <div className="space-y-2">
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <label className="block text-small font-semibold text-slate-600">
                                        Paid on
                                        <input
                                            type="date"
                                            value={payForm.paidOn}
                                            max={todayInput()}
                                            onChange={(e) =>
                                                setPayForm((f) => ({ ...f, paidOn: e.target.value }))
                                            }
                                            className={cn(inputCls, "mt-1")}
                                        />
                                    </label>
                                    <label className="block text-small font-semibold text-slate-600">
                                        Reference (optional)
                                        <input
                                            value={payForm.reference}
                                            onChange={(e) =>
                                                setPayForm((f) => ({ ...f, reference: e.target.value }))
                                            }
                                            placeholder="UPI / invoice no."
                                            maxLength={255}
                                            className={cn(inputCls, "mt-1")}
                                        />
                                    </label>
                                </div>
                                <p className="text-small text-slate-500">
                                    Saving moves this lead to Course Done.
                                </p>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPayForm(null)}
                                        className="rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-small font-semibold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busy || !payForm.paidOn}
                                        onClick={() => savePayment(true)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-small font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                                    >
                                        <CheckCircle2 size={14} aria-hidden="true" /> Mark Payment Done
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-small text-slate-600">
                                    Payment Done moves the lead to Course Done.
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setPayForm({ paidOn: todayInput(), reference: "" })}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-small font-bold text-emerald-700 hover:bg-emerald-100"
                                >
                                    <CheckCircle2 size={14} aria-hidden="true" /> Payment Done
                                </button>
                            </div>
                        )
                    ) : (
                        <span className="text-small text-slate-600">Payment is due.</span>
                    )}
                </Block>
            )}
        </section>
    );
}
