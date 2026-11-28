import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    CalendarClock,
    ChevronLeft,
    ChevronRight,
    Mail,
    MessageCircle,
    MessageSquareText,
    Phone,
    Search,
    StickyNote,
    X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import crmService from "@/services/crmService";
import { STAGE_LABEL, STAGES, ageOf, apiMessage, fmtDateTime, inputCls, isOverdue } from "@/lib/crm";
import { StageBadge } from "./crmShared";
import LeadDetailPanel from "./LeadDetailPanel";
import MoveLeadsModal from "./MoveLeadsModal";

/** Solid colour per stage for the progress bar (same hues as the stage badges). */
const STAGE_BAR = {
    backlog: "bg-stone-300",
    new: "bg-sky-400",
    no_response: "bg-orange-400",
    attempting_contact: "bg-indigo-400",
    in_conversation: "bg-violet-400",
    on_hold: "bg-amber-300",
    application: "bg-brand-500",
    exam_scheduled: "bg-amber-500",
    course_done: "bg-emerald-500",
    not_interested: "bg-slate-300",
    junk: "bg-red-300",
};

/** How the latest discussion happened. */
const DISCUSSION = {
    note: [StickyNote, "Note"],
    call: [Phone, "Call"],
    message: [MessageSquareText, "Message"],
    email: [Mail, "Email"],
    whatsapp: [MessageCircle, "WhatsApp"],
    whatsapp_api: [MessageCircle, "WhatsApp sent"],
    whatsapp_in: [MessageCircle, "WhatsApp from client"],
    follow_up_done: [CalendarClock, "Follow-up done"],
};

const CONTACT_FILTERS = [
    ["", "Any discussion"],
    ["recent", "Talked in last 7 days"],
    ["quiet", "No discussion for 7+ days"],
    ["never", "Never discussed"],
];
const SORTS = [
    ["", "Next follow-up first"],
    ["recent_discussion", "Latest discussion first"],
    ["quiet_first", "Longest without discussion"],
];

function StatusPill({ c }) {
    if (!c.is_active)
        return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-label font-semibold text-slate-600">Deactivated</span>;
    if (c.on_leave)
        return (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-label font-semibold text-amber-800">
                On leave{c.on_leave_until ? ` until ${new Date(c.on_leave_until).toLocaleDateString("en-US", { day: "numeric", month: "short" })}` : ""}
            </span>
        );
    return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-label font-semibold text-emerald-700">Active</span>;
}

function StageBar({ stages, total, className }) {
    if (!total) return <div className={cn("h-2 rounded-full bg-slate-100", className)} />;
    return (
        <div className={cn("flex h-2 overflow-hidden rounded-full bg-slate-100", className)}>
            {STAGES.map(([key]) =>
                stages[key] ? (
                    <span
                        key={key}
                        className={STAGE_BAR[key]}
                        style={{ width: `${(stages[key] / total) * 100}%` }}
                        title={`${STAGE_LABEL[key]}: ${stages[key]}`}
                    />
                ) : null
            )}
        </div>
    );
}

/** Columns of the consultants table; `get` is what sorting uses. */
const COLUMNS = [
    { key: "name", label: "Consultant", get: (c) => c.name?.toLowerCase() ?? "" },
    { key: "total", label: "Leads", get: (c) => c.total, num: true },
    { key: "pipeline", label: "Pipeline" },
    { key: "overdue", label: "Overdue", get: (c) => c.overdue, num: true, tone: "text-red-600", hint: "Open leads with a follow-up in the past" },
    { key: "quiet_7d", label: "Quiet 7d+", get: (c) => c.quiet_7d, num: true, tone: "text-amber-600", hint: "Open leads with no client discussion for 7+ days" },
    { key: "discussed_7d", label: "Talked 7d", get: (c) => c.discussed_7d, num: true, hint: "Leads with a client discussion in the last 7 days" },
    { key: "course_done", label: "Course Done", get: (c) => c.stages.course_done, num: true, hint: "Course Done leads and share of all leads" },
    { key: "payment_alerts", label: "Pay due", get: (c) => c.payment_alerts, num: true, tone: "text-red-600", hint: "Exam done, payment due" },
    { key: "last", label: "Last discussion", get: (c) => (c.last_discussion_at ? new Date(c.last_discussion_at).getTime() : 0), num: true },
];
const STATUS_FILTERS = [
    ["", "All statuses"],
    ["active", "Active"],
    ["leave", "On leave"],
    ["inactive", "Deactivated"],
];
const PAGE_SIZE = 20;
/** Needs attention: overdue follow-ups, quiet leads or payment due after the exam. */
const attention = (c) => c.overdue * 3 + c.payment_alerts * 3 + c.quiet_7d;

function SortHeader({ col, sort, onSort }) {
    if (!col.get) return <th className="px-3 py-2.5">{col.label}</th>;
    const active = sort.key === col.key;
    return (
        <th className={cn("px-3 py-2.5", col.num && "text-right")} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
            <button
                type="button"
                onClick={() => onSort(col.key)}
                title={col.hint}
                className={cn("inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-800", active && "text-slate-900")}
            >
                {col.label}
                {active ? (sort.dir === "asc" ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />) : <ArrowUpDown size={12} className="opacity-40" aria-hidden="true" />}
            </button>
        </th>
    );
}

function Num({ value, tone }) {
    return <span className={cn("tabular-nums", value > 0 ? tone || "text-slate-800" : "text-slate-400")}>{value}</span>;
}

/** The board's numbers a consultant's lead list can be narrowed to (`show` in the URL). */
const FOCUS = {
    overdue: "Overdue follow-ups",
    quiet: "No discussion for 7+ days",
    talked: "Talked in last 7 days",
    pay_due: "Exam done, payment due",
    course_done: "Course Done",
};

/** A board number: click it to see exactly those leads of that consultant. */
function NumLink({ value, tone, onClick, label }) {
    if (!(value > 0)) return <Num value={value} tone={tone} />;
    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            title={`Show these ${value} leads`}
            aria-label={label}
            className="rounded px-1 underline decoration-dotted underline-offset-4 hover:bg-white hover:decoration-solid focus-visible:outline focus-visible:outline-2 focus-visible:outline-action"
        >
            <Num value={value} tone={tone} />
        </button>
    );
}

function ConsultantTable({ rows, selectedId, onSelect, sort, onSort }) {
    return (
        <>
            {/* Desktop / tablet: one row per consultant */}
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[920px] text-left text-ui">
                    <thead className="bg-slate-50 text-label uppercase tracking-wide text-slate-500">
                        <tr>
                            {COLUMNS.map((col) => (
                                <SortHeader key={col.key} col={col} sort={sort} onSort={onSort} />
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map((c) => (
                            <tr
                                key={c.id}
                                onClick={() => onSelect(c.id)}
                                aria-selected={selectedId === c.id}
                                className={cn(
                                    "cursor-pointer hover:bg-brand-50/60",
                                    selectedId === c.id && "bg-brand-50 shadow-[inset_4px_0_0_var(--color-action)]"
                                )}
                            >
                                <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-small font-bold text-brand-700">
                                            {c.name?.[0]?.toUpperCase() ?? "?"}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-slate-900">{c.name}</p>
                                            <StatusPill c={c} />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                    <p className="font-semibold tabular-nums text-slate-900">{c.total}</p>
                                    <p className="text-small text-slate-500">{c.open} open</p>
                                </td>
                                <td className="w-40 px-3 py-2.5">
                                    <StageBar stages={c.stages} total={c.total} />
                                </td>
                                <td className="px-3 py-2.5 text-right font-semibold">
                                    <NumLink value={c.overdue} tone="text-red-600" onClick={() => onSelect(c.id, "overdue")} label={`${c.name}: ${c.overdue} overdue follow-ups`} />
                                </td>
                                <td className="px-3 py-2.5 text-right font-semibold">
                                    <NumLink value={c.quiet_7d} tone="text-amber-600" onClick={() => onSelect(c.id, "quiet")} label={`${c.name}: ${c.quiet_7d} leads quiet for 7+ days`} />
                                </td>
                                <td className="px-3 py-2.5 text-right font-semibold">
                                    <NumLink value={c.discussed_7d} onClick={() => onSelect(c.id, "talked")} label={`${c.name}: ${c.discussed_7d} leads talked to in 7 days`} />
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                    <span className="font-semibold">
                                        <NumLink value={c.stages.course_done} tone="text-emerald-600" onClick={() => onSelect(c.id, "course_done")} label={`${c.name}: ${c.stages.course_done} Course Done leads`} />
                                    </span>
                                    <span className="block text-small text-slate-500">{c.conversion}%</span>
                                </td>
                                <td className="px-3 py-2.5 text-right font-semibold">
                                    <NumLink value={c.payment_alerts} tone="text-red-600" onClick={() => onSelect(c.id, "pay_due")} label={`${c.name}: ${c.payment_alerts} payments due`} />
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5 text-right text-small text-slate-600">
                                    {c.last_discussion_at ? `${ageOf(c.last_discussion_at)} ago` : <span className="text-slate-400">Never</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile: compact rows */}
            <ul className="divide-y divide-slate-100 md:hidden">
                {rows.map((c) => (
                    <li key={c.id}>
                        <button
                            type="button"
                            onClick={() => onSelect(c.id)}
                            className={cn("w-full px-4 py-3 text-left", selectedId === c.id && "bg-brand-50")}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <p className="truncate font-semibold text-slate-900">{c.name}</p>
                                <StatusPill c={c} />
                            </div>
                            <StageBar stages={c.stages} total={c.total} className="mt-2" />
                            <p className="mt-1.5 text-small text-slate-500">
                                {c.total} leads · <span className={cn(c.overdue > 0 && "font-semibold text-red-600")}>{c.overdue} overdue</span> ·{" "}
                                <span className={cn(c.quiet_7d > 0 && "font-semibold text-amber-600")}>{c.quiet_7d} quiet 7d+</span> · {c.stages.course_done} done
                                {c.payment_alerts > 0 && <span className="font-semibold text-red-600"> · {c.payment_alerts} pay due</span>}
                            </p>
                        </button>
                    </li>
                ))}
            </ul>
        </>
    );
}

function LastDiscussion({ lead }) {
    if (!lead.last_discussion_at)
        return <span className="text-small italic text-slate-400">No discussion yet</span>;
    const [Icon, label] = DISCUSSION[lead.last_discussion_type] ?? [StickyNote, "Note"];
    return (
        <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-small font-semibold text-slate-600">
                <Icon size={13} aria-hidden="true" className="shrink-0 text-brand-600" />
                {label}
                <span className="font-normal text-slate-400">
                    · {lead.last_discussion_by ? `${lead.last_discussion_by} · ` : ""}
                    {ageOf(lead.last_discussion_at)} ago
                </span>
            </p>
            {lead.last_discussion && <p className="mt-0.5 line-clamp-2 text-ui text-slate-700">{lead.last_discussion}</p>}
        </div>
    );
}

/** Leads of one consultant: stage tabs, discussion filter, latest discussion per lead. */
function ConsultantLeads({ consultant, consultants, onSwitch, prevId, nextId, onOpen, reloadKey, show }) {
    // Opened from a board number: Course Done is a stage tab; the others are a focus filter
    const [stage, setStage] = useState(show === "course_done" ? "course_done" : "");
    const [focus, setFocus] = useState(FOCUS[show] && show !== "course_done" ? show : "");
    const [contact, setContact] = useState("");
    const [sort, setSort] = useState("");
    const [search, setSearch] = useState("");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const t = setTimeout(() => setQuery(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        let live = true;
        crmService
            .list({
                owner_id: consultant.id,
                stage: stage || undefined,
                contact: contact || undefined,
                focus: focus || undefined,
                sort: sort || undefined,
                search: query || undefined,
                page,
                limit: 25,
            })
            .then(({ data: res }) => {
                if (!live) return;
                setError("");
                setData(res.data);
            })
            .catch((err) => live && setError(apiMessage(err, "Could not load leads")));
        return () => {
            live = false;
        };
    }, [consultant.id, stage, contact, focus, sort, query, page, reloadKey]);

    const reset = (fn) => (v) => {
        fn(v);
        setPage(1);
    };
    const counts = data?.counts ?? {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const pg = data?.pagination;

    return (
        <section
            id="consultant-leads"
            className="mt-6 scroll-mt-4 rounded-2xl border border-slate-200 bg-surface"
            aria-label={`${consultant.name}'s leads`}
        >
            <header className="border-b border-slate-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="flex flex-wrap items-center gap-2 text-h3 font-bold text-slate-900">
                            {consultant.name}&rsquo;s leads <StatusPill c={consultant} />
                        </h2>
                        <p className="text-small text-slate-500">
                            {consultant.total} leads · {consultant.open} open · {consultant.overdue} overdue · {consultant.quiet_7d} quiet 7d+.
                            Open a lead to see the full discussion with the client.
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            disabled={!prevId}
                            onClick={() => onSwitch(prevId)}
                            aria-label="Previous consultant"
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-brand-300 disabled:opacity-40"
                        >
                            <ChevronLeft size={16} aria-hidden="true" />
                        </button>
                        <select
                            value={consultant.id}
                            onChange={(e) => onSwitch(Number(e.target.value))}
                            aria-label="Switch consultant"
                            className={cn(inputCls, "w-48 py-1.5")}
                        >
                            {consultants.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.total})
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            disabled={!nextId}
                            onClick={() => onSwitch(nextId)}
                            aria-label="Next consultant"
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-brand-300 disabled:opacity-40"
                        >
                            <ChevronRight size={16} aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onSwitch(null)}
                            aria-label="Close"
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-brand-300"
                        >
                            <X size={16} aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {focus && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-ui text-slate-700">
                        <span>
                            Showing only: <strong className="text-slate-900">{FOCUS[focus]}</strong>
                            {data && (
                                <span className="text-slate-500">
                                    {" "}
                                    · {data.pagination?.total ?? data.leads.length}{" "}
                                    {(data.pagination?.total ?? data.leads.length) === 1 ? "lead" : "leads"}
                                </span>
                            )}
                        </span>
                        <button
                            type="button"
                            onClick={() => reset(setFocus)("")}
                            className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-200 bg-surface px-2 py-1 text-small font-semibold text-slate-600 hover:border-brand-300"
                        >
                            <X size={13} aria-hidden="true" /> Show all leads
                        </button>
                    </div>
                )}

                <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Stage">
                    {[["", "All"], ...STAGES.map(([k, l]) => [k, l])].map(([k, l]) => (
                        <button
                            key={k || "all"}
                            type="button"
                            role="tab"
                            aria-selected={stage === k}
                            onClick={() => reset(setStage)(k)}
                            className={cn(
                                "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-small font-semibold",
                                stage === k
                                    ? "border-action bg-action text-white"
                                    : "border-slate-200 bg-surface text-slate-600 hover:border-brand-300"
                            )}
                        >
                            {l} <span className={stage === k ? "text-white/80" : "text-slate-400"}>{k ? counts[k] ?? 0 : total}</span>
                        </button>
                    ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    <label className="relative min-w-[200px] flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                            value={search}
                            onChange={(e) => reset(setSearch)(e.target.value)}
                            placeholder="Search name, email or phone"
                            aria-label="Search leads"
                            className={cn(inputCls, "pl-8")}
                        />
                    </label>
                    <select
                        value={contact}
                        onChange={(e) => reset(setContact)(e.target.value)}
                        aria-label="Client discussion"
                        className={cn(inputCls, "w-auto")}
                    >
                        {CONTACT_FILTERS.map(([v, l]) => (
                            <option key={v} value={v}>
                                {l}
                            </option>
                        ))}
                    </select>
                    <select value={sort} onChange={(e) => reset(setSort)(e.target.value)} aria-label="Sort" className={cn(inputCls, "w-auto")}>
                        {SORTS.map(([v, l]) => (
                            <option key={v} value={v}>
                                {l}
                            </option>
                        ))}
                    </select>
                </div>
            </header>

            {error && <p className="p-4 text-ui text-red-600">{error}</p>}
            {!data && !error && <p className="p-6 text-center text-ui text-slate-500">Loading leads…</p>}
            {data && data.leads.length === 0 && <p className="p-6 text-center text-ui text-slate-500">No leads match.</p>}

            {data && data.leads.length > 0 && (
                <>
                    {/* Desktop: table */}
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-left text-ui">
                            <thead className="bg-slate-50 text-label uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-2.5">Lead</th>
                                    <th className="px-3 py-2.5">Stage</th>
                                    <th className="px-3 py-2.5">Next follow-up</th>
                                    <th className="w-[42%] px-3 py-2.5">Latest discussion with client</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.leads.map((l) => (
                                    <tr
                                        key={l.id}
                                        onClick={() => onOpen(l.id)}
                                        className={cn(
                                            "cursor-pointer align-top hover:bg-brand-50/60",
                                            l.payment_alert && "bg-red-50 hover:bg-red-100"
                                        )}
                                    >
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-slate-900">{l.name}</p>
                                            <p className="text-small text-slate-500">{l.course_title || "No course"}</p>
                                        </td>
                                        <td className="px-3 py-3">
                                            <StageBadge stage={l.stage} />
                                            <p className="mt-1 text-small text-slate-400">
                                                {l.stage_changed_at ? `${ageOf(l.stage_changed_at)} in stage` : `Added ${ageOf(l.created_at)} ago`}
                                            </p>
                                            {l.payment_alert && (
                                                <p className="mt-1 flex items-center gap-1 text-small font-semibold text-red-700">
                                                    <AlertTriangle size={12} aria-hidden="true" /> Exam done, payment due
                                                </p>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3">
                                            {l.next_follow_up_at ? (
                                                <span className={cn(isOverdue(l.next_follow_up_at) ? "font-semibold text-red-600" : "text-slate-700")}>
                                                    {fmtDateTime(l.next_follow_up_at)}
                                                    {isOverdue(l.next_follow_up_at) && <span className="block text-small">Overdue</span>}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">None</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            <LastDiscussion lead={l} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile: cards */}
                    <ul className="divide-y divide-slate-100 md:hidden">
                        {data.leads.map((l) => (
                            <li key={l.id}>
                                <button
                                    type="button"
                                    onClick={() => onOpen(l.id)}
                                    className={cn("w-full p-4 text-left", l.payment_alert && "bg-red-50")}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="font-semibold text-slate-900">{l.name}</p>
                                        <StageBadge stage={l.stage} />
                                    </div>
                                    <p className="text-small text-slate-500">
                                        {l.course_title || "No course"}
                                        {l.next_follow_up_at && (
                                            <span className={cn(isOverdue(l.next_follow_up_at) && "font-semibold text-red-600")}>
                                                {" "}
                                                · Follow-up {fmtDateTime(l.next_follow_up_at)}
                                            </span>
                                        )}
                                    </p>
                                    <div className="mt-2">
                                        <LastDiscussion lead={l} />
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>

                    {pg && pg.totalPages > 1 && (
                        <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-small text-slate-500">
                            <span>
                                {pg.total} lead{pg.total === 1 ? "" : "s"} · page {pg.page} of {pg.totalPages}
                            </span>
                            <span className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={pg.page <= 1}
                                    onClick={() => setPage((p) => p - 1)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold disabled:opacity-40"
                                >
                                    <ChevronLeft size={14} aria-hidden="true" /> Prev
                                </button>
                                <button
                                    type="button"
                                    disabled={pg.page >= pg.totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold disabled:opacity-40"
                                >
                                    Next <ChevronRight size={14} aria-hidden="true" />
                                </button>
                            </span>
                        </footer>
                    )}
                </>
            )}
        </section>
    );
}

/** Admin → CRM → By consultant: every consultant in one table; pick one to work their leads. */
export default function ConsultantProgressBoard() {
    const [params, setParams] = useSearchParams();
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [openId, setOpenId] = useState(null);
    const [moving, setMoving] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [panelKey, setPanelKey] = useState(0);
    const [find, setFind] = useState("");
    const [status, setStatus] = useState("");
    const [attentionOnly, setAttentionOnly] = useState(false);
    const [hideEmpty, setHideEmpty] = useState(true);
    const [sort, setSort] = useState({ key: "attention", dir: "desc" });
    const [page, setPage] = useState(1);

    const load = useCallback(() => {
        crmService
            .consultantProgress()
            .then(({ data: res }) => setData(res.data))
            .catch((err) => setError(apiMessage(err, "Could not load the team")));
    }, []);
    useEffect(load, [load]);

    const changed = () => {
        load();
        setReloadKey((k) => k + 1);
    };
    const resetPage = (fn) => (v) => {
        fn(v);
        setPage(1);
    };
    const onSort = (key) => {
        setSort((s) => ({ key, dir: s.key === key ? (s.dir === "asc" ? "desc" : "asc") : key === "name" ? "asc" : "desc" }));
        setPage(1);
    };

    const all = useMemo(() => data?.consultants ?? [], [data]);
    const rows = useMemo(() => {
        const q = find.trim().toLowerCase();
        const list = all.filter(
            (c) =>
                (!q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)) &&
                (!status ||
                    (status === "active" && c.is_active && !c.on_leave) ||
                    (status === "leave" && c.on_leave) ||
                    (status === "inactive" && !c.is_active)) &&
                (!attentionOnly || attention(c) > 0) &&
                (!hideEmpty || c.total > 0 || c.is_active)
        );
        const col = COLUMNS.find((x) => x.key === sort.key);
        const get = col?.get ?? attention;
        const dir = sort.dir === "asc" ? 1 : -1;
        return [...list].sort((a, b) => {
            const x = get(a);
            const y = get(b);
            if (x < y) return -dir;
            if (x > y) return dir;
            return (a.name ?? "").localeCompare(b.name ?? "");
        });
    }, [all, find, status, attentionOnly, hideEmpty, sort]);

    const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const current = Math.min(page, pages);
    const pageRows = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
    const selectedId = Number(params.get("consultant")) || null;
    const selected = all.find((c) => c.id === selectedId) ?? null;
    const show = params.get("show") || "";
    const select = (id, focusOn) => {
        setParams(id ? { consultant: String(id), ...(FOCUS[focusOn] && { show: focusOn }) } : {}, { replace: true });
        if (id) setTimeout(() => document.getElementById("consultant-leads")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    };
    // Previous / next consultant in the current order, for working through the team
    const idx = selected ? rows.findIndex((c) => c.id === selected.id) : -1;

    const team = useMemo(() => {
        const t = { total: 0, open: 0, overdue: 0, quiet_7d: 0, discussed_7d: 0, needs: 0 };
        for (const c of all) {
            t.total += c.total;
            t.open += c.open;
            t.overdue += c.overdue;
            t.quiet_7d += c.quiet_7d;
            t.discussed_7d += c.discussed_7d;
            if (attention(c) > 0) t.needs += 1;
        }
        return t;
    }, [all]);

    return (
        <div>
            <h1 className="text-h2 font-extrabold tracking-tight text-slate-900">Leads by consultant</h1>
            <p className="mt-1 mb-4 text-ui text-slate-500">
                Find a consultant, see how their leads are moving, then open their leads and the discussion with each client.
            </p>

            {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-ui text-red-700">{error}</p>}
            {!data && !error && <p className="text-ui text-slate-500">Loading…</p>}

            {data && (
                <>
                    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {[
                            ["Consultants", all.filter((c) => c.is_active).length],
                            ["Need attention", team.needs, "text-amber-600"],
                            ["Open leads", team.open],
                            ["Overdue follow-ups", team.overdue, "text-red-600"],
                            ["No discussion 7d+", team.quiet_7d, "text-amber-600"],
                            ["Unassigned leads", data.unassigned, "text-amber-600"],
                        ].map(([label, value, tone]) => (
                            <div key={label} className="rounded-xl border border-slate-200 bg-surface p-3">
                                <p className={cn("text-h2 font-extrabold text-slate-900", value > 0 && tone)}>{value}</p>
                                <p className="text-small text-slate-500">{label}</p>
                            </div>
                        ))}
                    </div>

                    <section className="rounded-2xl border border-slate-200 bg-surface" aria-label="Consultants">
                        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
                            <label className="relative min-w-[200px] flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                <input
                                    value={find}
                                    onChange={(e) => resetPage(setFind)(e.target.value)}
                                    placeholder={`Search ${all.length} consultants by name or email`}
                                    aria-label="Search consultants"
                                    className={cn(inputCls, "pl-8")}
                                />
                            </label>
                            <select value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} aria-label="Status" className={cn(inputCls, "w-auto")}>
                                {STATUS_FILTERS.map(([v, l]) => (
                                    <option key={v} value={v}>
                                        {l}
                                    </option>
                                ))}
                            </select>
                            <label
                                className={cn(
                                    "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-ui font-semibold",
                                    attentionOnly ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-200 bg-surface text-slate-700"
                                )}
                            >
                                <input
                                    type="checkbox"
                                    checked={attentionOnly}
                                    onChange={(e) => resetPage(setAttentionOnly)(e.target.checked)}
                                    className="accent-amber-600"
                                />
                                <AlertTriangle size={14} aria-hidden="true" /> Needs attention
                            </label>
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ui text-slate-700">
                                <input type="checkbox" checked={hideEmpty} onChange={(e) => resetPage(setHideEmpty)(e.target.checked)} className="accent-action" />
                                Hide deactivated with no leads
                            </label>
                            {sort.key === "attention" && (
                                <span className="text-small text-slate-500">Sorted by who needs attention most · click a column to sort</span>
                            )}
                        </div>

                        {rows.length === 0 ? (
                            <p className="p-8 text-center text-ui text-slate-500">
                                {all.length === 0 ? "No consultants yet. Add one in Admin → Team." : "No consultants match."}
                            </p>
                        ) : (
                            <ConsultantTable rows={pageRows} selectedId={selected?.id} onSelect={select} sort={sort} onSort={onSort} />
                        )}

                        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-small text-slate-500">
                            <span>
                                {rows.length} of {all.length} consultant{all.length === 1 ? "" : "s"}
                                {pages > 1 && ` · page ${current} of ${pages}`}
                            </span>
                            <span className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Stage colours">
                                {STAGES.map(([k, l]) => (
                                    <span key={k} className="inline-flex items-center gap-1">
                                        <span className={cn("h-2 w-2 rounded-full", STAGE_BAR[k])} /> {l}
                                    </span>
                                ))}
                            </span>
                            {pages > 1 && (
                                <span className="flex gap-2">
                                    <button
                                        type="button"
                                        disabled={current <= 1}
                                        onClick={() => setPage(current - 1)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold disabled:opacity-40"
                                    >
                                        <ChevronLeft size={14} aria-hidden="true" /> Prev
                                    </button>
                                    <button
                                        type="button"
                                        disabled={current >= pages}
                                        onClick={() => setPage(current + 1)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold disabled:opacity-40"
                                    >
                                        Next <ChevronRight size={14} aria-hidden="true" />
                                    </button>
                                </span>
                            )}
                        </footer>
                    </section>

                    {selected ? (
                        <ConsultantLeads
                            key={`${selected.id}:${show}`}
                            show={show}
                            consultant={selected}
                            consultants={all}
                            onSwitch={select}
                            prevId={idx > 0 ? rows[idx - 1].id : null}
                            nextId={idx >= 0 && idx < rows.length - 1 ? rows[idx + 1].id : null}
                            onOpen={setOpenId}
                            reloadKey={reloadKey}
                        />
                    ) : (
                        all.length > 0 && (
                            <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-ui text-slate-500">
                                Click a consultant to see their leads and the latest discussion with each client.
                            </p>
                        )
                    )}
                </>
            )}

            {openId && (
                <LeadDetailPanel
                    key={`${openId}-${panelKey}`}
                    leadId={openId}
                    isAdmin
                    onClose={() => setOpenId(null)}
                    onChanged={changed}
                    onMove={(id) => setMoving([id])}
                />
            )}
            {moving && (
                <MoveLeadsModal
                    leadIds={moving}
                    onClose={() => setMoving(null)}
                    onDone={() => {
                        changed();
                        setPanelKey((k) => k + 1);
                    }}
                />
            )}
        </div>
    );
}
