import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    AlertTriangle,
    CalendarClock,
    ChevronLeft,
    ChevronRight,
    Mail,
    MessageCircle,
    MessageSquareText,
    Phone,
    Search,
    StickyNote,
    UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import crmService from "@/services/crmService";
import { STAGE_LABEL, STAGES, ageOf, apiMessage, fmtDateTime, inputCls, isOverdue } from "@/lib/crm";
import { StageBadge } from "./crmShared";
import LeadDetailPanel from "./LeadDetailPanel";
import MoveLeadsModal from "./MoveLeadsModal";

/** Solid colour per stage for the progress bar (same hues as the stage badges). */
const STAGE_BAR = {
    new: "bg-sky-400",
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

function Metric({ label, value, tone }) {
    return (
        <div className="min-w-0">
            <p className={cn("text-h3 font-extrabold leading-tight text-slate-900", value > 0 && tone)}>{value}</p>
            <p className="truncate text-small text-slate-500">{label}</p>
        </div>
    );
}

function ConsultantCard({ c, active, onSelect }) {
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={active}
            className={cn(
                "w-full rounded-2xl border bg-surface p-4 text-left transition hover:border-brand-300 hover:shadow-sm",
                active ? "border-action ring-2 ring-action/25" : "border-slate-200"
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-ui font-bold text-brand-700">
                        {c.name?.[0]?.toUpperCase() ?? <UserRound size={16} />}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-ui font-bold text-slate-900">{c.name}</p>
                        <p className="text-small text-slate-500">
                            {c.total} lead{c.total === 1 ? "" : "s"} · {c.open} open
                        </p>
                    </div>
                </div>
                <StatusPill c={c} />
            </div>

            <StageBar stages={c.stages} total={c.total} className="mt-3" />

            <div className="mt-3 grid grid-cols-4 gap-2">
                <Metric label="Overdue" value={c.overdue} tone="text-red-600" />
                <Metric label="Quiet 7d+" value={c.quiet_7d} tone="text-amber-600" />
                <Metric label="Talked 7d" value={c.discussed_7d} />
                <Metric label="Course Done" value={c.stages.course_done} tone="text-emerald-600" />
            </div>

            <p className="mt-3 border-t border-slate-100 pt-2 text-small text-slate-500">
                {c.last_discussion_at ? `Last client discussion ${ageOf(c.last_discussion_at)} ago` : "No client discussion logged yet"}
                {c.payment_alerts > 0 && (
                    <span className="ml-2 font-semibold text-red-600">· {c.payment_alerts} payment due after exam</span>
                )}
            </p>
        </button>
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
function ConsultantLeads({ consultant, onOpen, reloadKey }) {
    const [stage, setStage] = useState("");
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
    }, [consultant.id, stage, contact, sort, query, page, reloadKey]);

    const reset = (fn) => (v) => {
        fn(v);
        setPage(1);
    };
    const counts = data?.counts ?? {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const pg = data?.pagination;

    return (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-surface" aria-label={`${consultant.name}'s leads`}>
            <header className="border-b border-slate-100 p-4">
                <h2 className="text-h3 font-bold text-slate-900">{consultant.name}&rsquo;s leads</h2>
                <p className="text-small text-slate-500">
                    Open a lead to see its full discussion with the client, follow-ups and progress.
                </p>

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

/** Admin → CRM → By consultant: each consultant's leads, their progress and the client discussion. */
export default function ConsultantProgressBoard() {
    const [params, setParams] = useSearchParams();
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [openId, setOpenId] = useState(null);
    const [moving, setMoving] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [panelKey, setPanelKey] = useState(0);
    const [showInactive, setShowInactive] = useState(false);

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

    const list = useMemo(
        () => (data?.consultants ?? []).filter((c) => showInactive || c.is_active || c.total > 0),
        [data, showInactive]
    );
    const hiddenCount = (data?.consultants?.length ?? 0) - list.length;
    const selectedId = Number(params.get("consultant")) || list[0]?.id;
    const selected = list.find((c) => c.id === selectedId) ?? list[0];

    const team = useMemo(() => {
        const t = { total: 0, open: 0, overdue: 0, quiet_7d: 0, discussed_7d: 0, done: 0 };
        for (const c of data?.consultants ?? []) {
            t.total += c.total;
            t.open += c.open;
            t.overdue += c.overdue;
            t.quiet_7d += c.quiet_7d;
            t.discussed_7d += c.discussed_7d;
            t.done += c.stages.course_done;
        }
        return t;
    }, [data]);

    return (
        <div>
            <h1 className="text-h2 font-extrabold tracking-tight text-slate-900">Leads by consultant</h1>
            <p className="mt-1 mb-4 text-ui text-slate-500">
                Every consultant&rsquo;s leads, where they are in the pipeline and the latest discussion with each client.
            </p>

            {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-ui text-red-700">{error}</p>}
            {!data && !error && <p className="text-ui text-slate-500">Loading…</p>}

            {data && (
                <>
                    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {[
                            ["Leads with consultants", team.total],
                            ["Open", team.open],
                            ["Overdue follow-ups", team.overdue, "text-red-600"],
                            ["No discussion 7d+", team.quiet_7d, "text-amber-600"],
                            ["Talked to in 7 days", team.discussed_7d],
                            ["Unassigned leads", data.unassigned, "text-amber-600"],
                        ].map(([label, value, tone]) => (
                            <div key={label} className="rounded-xl border border-slate-200 bg-surface p-3">
                                <p className={cn("text-h2 font-extrabold text-slate-900", value > 0 && tone)}>{value}</p>
                                <p className="text-small text-slate-500">{label}</p>
                            </div>
                        ))}
                    </div>

                    {list.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-ui text-slate-500">
                            No consultants yet. Add one in Admin → Team.
                        </p>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {list.map((c) => (
                                <ConsultantCard
                                    key={c.id}
                                    c={c}
                                    active={selected?.id === c.id}
                                    onSelect={() => setParams({ consultant: String(c.id) }, { replace: true })}
                                />
                            ))}
                        </div>
                    )}
                    {hiddenCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowInactive((v) => !v)}
                            className="mt-2 text-small font-semibold text-action hover:underline"
                        >
                            {showInactive ? "Hide" : "Show"} {hiddenCount} deactivated consultant{hiddenCount === 1 ? "" : "s"} with no leads
                        </button>
                    )}

                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-small text-slate-500" aria-label="Stage colours">
                        {STAGES.map(([k, l]) => (
                            <span key={k} className="inline-flex items-center gap-1.5">
                                <span className={cn("h-2.5 w-2.5 rounded-full", STAGE_BAR[k])} /> {l}
                            </span>
                        ))}
                    </div>

                    {selected && <ConsultantLeads key={selected.id} consultant={selected} onOpen={setOpenId} reloadKey={reloadKey} />}
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
