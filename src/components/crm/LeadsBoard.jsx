import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "@/features/auth/authSlice";
import { ExamStatusBadge } from "./LeadExamSection";
import toast from "react-hot-toast";
import { CalendarClock, Columns3, LayoutGrid, List, Loader2, Plus, Search, Shuffle } from "lucide-react";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import AddLeadModal from "./AddLeadModal";
import LeadDetailPanel from "./LeadDetailPanel";
import MoveLeadsModal from "./MoveLeadsModal";
import { StageBadge } from "./crmShared";
import { EXAM_RESULT_LABEL, EXAM_STATUS, SOURCES, SOURCE_LABEL, STAGES, ageOf, fmtMoney, apiMessage, fmtDateTime, formLabel, inputCls, isOverdue, maskPhone } from "@/lib/crm";

// ── List view: columns people can show or hide (remembered per browser) ──
const COLUMNS = [
    { key: "phone", label: "Phone", cell: (l) => maskPhone(l.phone) || "—" },
    { key: "email", label: "Email", cell: (l) => l.email || "—" },
    { key: "stage", label: "Status", cell: (l) => <StageBadge stage={l.stage} /> },
    { key: "course", label: "Course", cell: (l) => l.course_title || <span className="text-slate-500">No course</span> },
    { key: "source", label: "Source", cell: (l) => SOURCE_LABEL[l.source] ?? l.source },
    { key: "owner", label: "Owner", admin: true, cell: (l) => l.owner_name ?? <span className="text-amber-700">Unassigned</span> },
    { key: "added", label: "Added", cell: (l) => <span title={fmtDateTime(l.created_at)}>{ageOf(l.created_at)} ago</span> },
    {
        key: "follow_up",
        label: "Next follow-up",
        cell: (l) =>
            l.next_follow_up_at ? (
                <span className={cn(isOverdue(l.next_follow_up_at) && "font-semibold text-red-600")}>{fmtDateTime(l.next_follow_up_at)}</span>
            ) : (
                "—"
            ),
    },
    { key: "stage_changed", label: "Status changed", cell: (l) => <span title={fmtDateTime(l.stage_changed_at)}>{ageOf(l.stage_changed_at)} ago</span> },
    {
        key: "enquiry",
        label: "Enquiry",
        cell: (l) =>
            l.preferred_time || l.enquiry_message ? (
                <span className="block w-[240px] whitespace-normal">
                    {l.preferred_time && (
                        <span className="mr-1.5 inline-block rounded bg-action-soft px-1.5 py-0.5 text-label font-semibold text-action-soft-ink">
                            Call: {l.preferred_time}
                        </span>
                    )}
                    {l.enquiry_message && (
                        <span className="line-clamp-2 text-slate-700" title={l.enquiry_message}>
                            {l.enquiry_message}
                        </span>
                    )}
                </span>
            ) : (
                "—"
            ),
    },
    { key: "form", label: "Form", cell: (l) => formLabel(l.form) ?? "—" },
    {
        key: "exam",
        label: "Exam",
        cell: (l) => (
            <span className="inline-flex flex-col items-start gap-0.5">
                <ExamStatusBadge status={l.exam_status} />
                {l.exam_status === "scheduled" && l.exam_scheduled_at && (
                    <span className="text-label text-slate-500">{fmtDateTime(l.exam_scheduled_at)}</span>
                )}
                {l.exam_status === "completed" && l.exam_result && (
                    <span className="text-label text-slate-500">{EXAM_RESULT_LABEL[l.exam_result]}</span>
                )}
            </span>
        ),
    },
    { key: "exam_coordinator", label: "Exam coordinator", cell: (l) => l.exam_coordinator_name ?? <span className="text-slate-500">—</span> },
    {
        key: "ticket",
        label: "Ticket size",
        cell: (l) => (l.ticket_size != null ? <span className="font-semibold tabular-nums">{fmtMoney(l.ticket_size, l.ticket_currency)}</span> : "—"),
    },
    { key: "enrolled", label: "Enrolled", cell: (l) => (l.enrolled ? <span className="font-semibold text-emerald-700">Yes</span> : "—") },
];
const DEFAULT_COLUMNS = ["phone", "email", "stage", "course", "source", "enquiry", "exam", "ticket", "owner", "added", "follow_up"];
// Columns added later, switched on once for people who already saved a choice
const NEW_COLUMNS = [
    ["enquiry", "crm.leads.columns.enquiry"],
    ["exam", "crm.leads.columns.exam"],
    ["ticket", "crm.leads.columns.ticket"],
];

// Browser storage can be blocked (private mode); the page still works without it
const readPref = (key, fallback) => {
    try {
        const v = JSON.parse(localStorage.getItem(key));
        return v ?? fallback;
    } catch {
        return fallback;
    }
};
const writePref = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* not saved — fine */
    }
};

/**
 * Lead list with the eight status tabs (PRD §4.1–4.3). Consultants get their
 * own leads; Admins get everyone's, plus an owner filter.
 */
export default function LeadsBoard({ isAdmin }) {
    const isCoordinator = useSelector(selectUser)?.role === "exam_coordinator";
    // Deep links from notifications: ?lead=123 opens it, ?owner=unassigned filters
    const [params] = useSearchParams();
    const [stage, setStage] = useState("");
    const [search, setSearch] = useState("");
    const [source, setSource] = useState("");
    const [ownerId, setOwnerId] = useState(isAdmin ? (params.get("owner") ?? "") : "");
    const [selected, setSelected] = useState([]);
    const [moving, setMoving] = useState(null); // lead ids
    const [panelKey, setPanelKey] = useState(0);
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [exam, setExam] = useState("");
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [owners, setOwners] = useState([]);
    const [openId, setOpenId] = useState(Number(params.get("lead")) || null);
    const [adding, setAdding] = useState(false);
    const [view, setViewState] = useState(() => (readPref("crm.leads.view", "list") === "cards" ? "cards" : "list"));
    const [columns, setColumnsState] = useState(() => {
        const saved = readPref("crm.leads.columns", DEFAULT_COLUMNS);
        let cols = Array.isArray(saved) ? saved.filter((k) => COLUMNS.some((c) => c.key === k)) : DEFAULT_COLUMNS;
        for (const [key, flag] of NEW_COLUMNS) {
            if (readPref(flag, false)) continue;
            if (!cols.includes(key)) cols = COLUMNS.filter((c) => c.key === key || cols.includes(c.key)).map((c) => c.key);
            writePref(flag, true);
            writePref("crm.leads.columns", cols);
        }
        return cols;
    });
    const setView = (v) => {
        setViewState(v);
        writePref("crm.leads.view", v);
    };
    const toggleColumn = (key) =>
        setColumnsState((cols) => {
            const next = cols.includes(key) ? cols.filter((k) => k !== key) : COLUMNS.filter((c) => c.key === key || cols.includes(c.key)).map((c) => c.key);
            writePref("crm.leads.columns", next);
            return next;
        });
    const shownColumns = COLUMNS.filter((c) => columns.includes(c.key) && (!c.admin || isAdmin));

    // Filters as the API takes them (the list, and "select all matching")
    const filters = () => ({
        stage: stage || undefined,
        search: search.trim() || undefined,
        source: source || undefined,
        owner_id: ownerId || undefined,
        follow_up: overdueOnly ? "overdue" : undefined,
        exam: exam || undefined,
    });
    const [selectingAll, setSelectingAll] = useState(false);
    const selectAllMatching = async () => {
        setSelectingAll(true);
        try {
            const { data: res } = await crmService.list({ ...filters(), ids_only: 1 });
            setSelected(res.data.ids);
            if (res.data.capped) toast(`Selected the first ${res.data.ids.length} of ${res.data.total}. Move these, then select again.`);
        } catch (err) {
            toast.error(apiMessage(err, "Could not select the leads"));
        } finally {
            setSelectingAll(false);
        }
    };

    const load = useCallback(async () => {
        try {
            const { data: res } = await crmService.list({
                stage: stage || undefined,
                search: search.trim() || undefined,
                source: source || undefined,
                owner_id: ownerId || undefined,
                follow_up: overdueOnly ? "overdue" : undefined,
                exam: exam || undefined,
                page,
                limit: 25,
            });
            setData(res.data);
        } catch (err) {
            toast.error(apiMessage(err, "Could not load leads"));
            setData({ leads: [], counts: {}, pagination: { totalPages: 1 } });
        }
    }, [stage, search, source, ownerId, overdueOnly, exam, page]);

    useEffect(() => {
        const t = setTimeout(load, search ? 300 : 0);
        return () => clearTimeout(t);
    }, [load, search]);

    useEffect(() => {
        if (isAdmin)
            crmService
                .owners()
                .then(({ data: res }) => setOwners(res.data ?? []))
                .catch(() => {});
    }, [isAdmin]);

    const counts = data?.counts ?? {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const resetPage = (fn) => (v) => {
        fn(v);
        setPage(1);
        setSelected([]);
    };
    const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-h2 font-extrabold tracking-tight text-slate-900">
                        {isAdmin ? "Leads" : isCoordinator ? "Exam Students" : "My Leads"}
                    </h1>
                    <p className="mt-1 text-ui text-slate-500">
                        {isAdmin
                            ? "Every lead across the team. Open a lead to call, log notes, update its status or schedule a follow-up."
                            : isCoordinator
                              ? "Students assigned to you for the exam. Open one to schedule the exam, mark it completed and then mark Course Done."
                              : "Leads assigned to you. Open a lead to call, log notes, update its status or schedule a follow-up."}
                    </p>
                </div>
                {!isCoordinator && (
                    <button
                        type="button"
                        onClick={() => setAdding(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-action px-4 py-2.5 text-ui font-bold text-white hover:bg-action-hover"
                    >
                        <Plus size={16} aria-hidden="true" /> Add lead
                    </button>
                )}
            </div>

            {/* Status tabs */}
            <div className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist">
                {[["", "All", total], ...STAGES.map(([k, l]) => [k, l, counts[k] ?? 0])].map(([k, l, n]) => (
                    <button
                        key={k || "all"}
                        role="tab"
                        aria-selected={stage === k}
                        onClick={() => resetPage(setStage)(k)}
                        className={cn(
                            "shrink-0 rounded-full border px-3 py-1.5 text-small font-semibold",
                            stage === k ? "border-action bg-action-soft text-action-soft-ink" : "border-slate-200 bg-surface text-slate-600"
                        )}
                    >
                        {l} <span className="ml-0.5 text-slate-500">{n}</span>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-72">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                    <input
                        value={search}
                        onChange={(e) => resetPage(setSearch)(e.target.value)}
                        placeholder="Search name, phone or email"
                        aria-label="Search leads"
                        className={cn(inputCls, "pl-9")}
                    />
                </div>
                <select value={source} onChange={(e) => resetPage(setSource)(e.target.value)} className={cn(inputCls, "w-auto")} aria-label="Source">
                    <option value="">All sources</option>
                    {SOURCES.map(([v, l]) => (
                        <option key={v} value={v}>
                            {l}
                        </option>
                    ))}
                </select>
                {isAdmin && (
                    <select value={ownerId} onChange={(e) => resetPage(setOwnerId)(e.target.value)} className={cn(inputCls, "w-auto")} aria-label="Owner">
                        <option value="">All owners</option>
                        <option value="unassigned">Unassigned</option>
                        {owners.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.name}
                            </option>
                        ))}
                    </select>
                )}
                <select value={exam} onChange={(e) => resetPage(setExam)(e.target.value)} className={cn(inputCls, "w-auto")} aria-label="Exam">
                    <option value="">Any exam status</option>
                    {Object.entries(EXAM_STATUS).map(([v, [l]]) => (
                        <option key={v} value={v}>
                            Exam: {l}
                        </option>
                    ))}
                </select>
                {!isCoordinator && (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ui text-slate-700">
                        <input type="checkbox" checked={overdueOnly} onChange={(e) => resetPage(setOverdueOnly)(e.target.checked)} className="accent-action" />
                        Overdue follow-ups
                    </label>
                )}
                <div className="ml-auto flex items-center gap-2">
                    {view === "list" && (
                        <details className="relative">
                            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ui font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
                                <Columns3 size={14} aria-hidden="true" /> Columns
                            </summary>
                            <div className="absolute right-0 z-30 mt-1 w-52 rounded-xl border border-slate-200 bg-surface p-2 shadow-lg">
                                <p className="px-2 pb-1 text-label font-semibold uppercase tracking-wide text-slate-500">Show in the list</p>
                                <p className="flex items-center gap-2 px-2 py-1 text-ui text-slate-500">
                                    <input type="checkbox" checked disabled className="accent-action" /> Name (always)
                                </p>
                                {COLUMNS.filter((c) => !c.admin || isAdmin).map((c) => (
                                    <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-ui text-slate-700 hover:bg-slate-50">
                                        <input type="checkbox" checked={columns.includes(c.key)} onChange={() => toggleColumn(c.key)} className="accent-action" />
                                        {c.label}
                                    </label>
                                ))}
                            </div>
                        </details>
                    )}
                    <div className="inline-flex rounded-lg border border-slate-200 bg-surface p-0.5" role="group" aria-label="View">
                        {[
                            ["list", "List", List],
                            ["cards", "Cards", LayoutGrid],
                        ].map(([v, label, Icon]) => (
                            <button
                                key={v}
                                type="button"
                                aria-pressed={view === v}
                                onClick={() => setView(v)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-small font-semibold",
                                    view === v ? "bg-action-soft text-action-soft-ink" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <Icon size={14} aria-hidden="true" /> {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {isAdmin && selected.length > 0 && (
                <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-action bg-action-soft px-4 py-2.5">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ui font-semibold text-action-soft-ink">
                        {selected.length} selected
                        {data?.pagination?.total > selected.length && (
                            <button
                                type="button"
                                disabled={selectingAll}
                                onClick={selectAllMatching}
                                className="text-small font-semibold text-action underline-offset-2 hover:underline disabled:opacity-60"
                            >
                                {selectingAll ? "Selecting…" : `Select all ${data.pagination.total} matching leads`}
                            </button>
                        )}
                    </p>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setSelected([])} className="rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-small font-semibold">
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={() => setMoving(selected)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-action px-3 py-1.5 text-small font-bold text-white"
                        >
                            <Shuffle size={13} aria-hidden="true" /> Assign / transfer
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            {!data ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="animate-spin text-slate-500" />
                </div>
            ) : !data.leads.length ? (
                <p className="rounded-xl border border-dashed border-slate-300 py-12 text-center text-ui text-slate-500">
                    {total ? "No leads match these filters." : "No leads yet. Add your first lead to get started."}
                </p>
            ) : view === "list" ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-surface">
                    <table className="w-full min-w-[640px] text-left text-ui">
                        <thead className="bg-slate-50 text-label uppercase tracking-wide text-slate-500">
                            <tr>
                                {isAdmin && (
                                    <th className="w-10 px-3 py-2.5">
                                        <input
                                            type="checkbox"
                                            aria-label="Select all on this page"
                                            checked={data.leads.every((l) => selected.includes(l.id))}
                                            onChange={(e) =>
                                                setSelected((sel) =>
                                                    e.target.checked
                                                        ? [...new Set([...sel, ...data.leads.map((l) => l.id)])]
                                                        : sel.filter((id) => !data.leads.some((l) => l.id === id))
                                                )
                                            }
                                            className="h-4 w-4 accent-action"
                                        />
                                    </th>
                                )}
                                <th className="px-3 py-2.5">Name</th>
                                {shownColumns.map((c) => (
                                    <th key={c.key} className="whitespace-nowrap px-3 py-2.5">
                                        {c.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.leads.map((l) => (
                                <tr
                                    key={l.id}
                                    onClick={() => setOpenId(l.id)}
                                    className={cn("cursor-pointer hover:bg-slate-50", selected.includes(l.id) && "bg-action-soft")}
                                >
                                    {isAdmin && (
                                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selected.includes(l.id)}
                                                onChange={() => toggle(l.id)}
                                                aria-label={`Select ${l.name}`}
                                                className="h-4 w-4 accent-action"
                                            />
                                        </td>
                                    )}
                                    <td className="max-w-[220px] px-3 py-2.5">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenId(l.id);
                                            }}
                                            className="block max-w-full truncate text-left font-semibold text-slate-900 hover:text-action"
                                        >
                                            {l.name}
                                        </button>
                                    </td>
                                    {shownColumns.map((c) => (
                                        <td key={c.key} className="max-w-[240px] truncate whitespace-nowrap px-3 py-2.5 text-slate-600">
                                            {c.cell(l)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <ul className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                    {data.leads.map((l) => (
                        <li key={l.id} className="relative">
                            {isAdmin && (
                                <input
                                    type="checkbox"
                                    checked={selected.includes(l.id)}
                                    onChange={() => toggle(l.id)}
                                    aria-label={`Select ${l.name}`}
                                    className="absolute left-3 top-[18px] z-10 h-4 w-4 accent-action"
                                />
                            )}
                            <button
                                type="button"
                                onClick={() => setOpenId(l.id)}
                                className={cn(
                                    "block w-full rounded-xl border bg-surface p-4 text-left transition-colors hover:border-action",
                                    isAdmin && "pl-9",
                                    selected.includes(l.id) ? "border-action" : "border-slate-200"
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="truncate text-body font-bold text-slate-900">{l.name}</p>
                                    <StageBadge stage={l.stage} />
                                </div>
                                <p className="mt-0.5 truncate text-small text-slate-500">
                                    {maskPhone(l.phone) || l.email}
                                    {l.course_title && ` · ${l.course_title}`}
                                </p>
                                {(l.preferred_time || l.enquiry_message) && (
                                    <p className="mt-1.5 line-clamp-2 text-small text-slate-700">
                                        {l.preferred_time && <span className="font-semibold text-action-soft-ink">Call: {l.preferred_time}. </span>}
                                        {l.enquiry_message}
                                    </p>
                                )}
                                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-slate-500">
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{SOURCE_LABEL[l.source] ?? l.source}</span>
                                    <span>{ageOf(l.created_at)} old</span>
                                    {l.next_follow_up_at && (
                                        <span className={cn("inline-flex items-center gap-1", isOverdue(l.next_follow_up_at) && "font-semibold text-red-600")}>
                                            <CalendarClock size={12} aria-hidden="true" /> {fmtDateTime(l.next_follow_up_at)}
                                        </span>
                                    )}
                                    {l.enrolled && <span className="font-semibold text-emerald-700">Enrolled</span>}
                                    {l.exam_status && l.exam_status !== "not_scheduled" && <ExamStatusBadge status={l.exam_status} />}
                                    {l.ticket_size != null && <span className="font-semibold text-slate-700">{fmtMoney(l.ticket_size, l.ticket_currency)}</span>}
                                    {isAdmin && <span className="ml-auto">{l.owner_name ?? "Unassigned"}</span>}
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {data?.pagination?.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-end gap-2 text-ui">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border bg-surface px-3 py-1.5 disabled:opacity-40">
                        Previous
                    </button>
                    <span>
                        Page {page} of {data.pagination.totalPages}
                    </span>
                    <button
                        disabled={page >= data.pagination.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded-lg border bg-surface px-3 py-1.5 disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            )}

            {adding && (
                <AddLeadModal
                    isAdmin={isAdmin}
                    onClose={() => setAdding(false)}
                    onCreated={(lead) => {
                        load();
                        setOpenId(lead.id);
                    }}
                    onOpenLead={setOpenId}
                />
            )}
            {openId && (
                <LeadDetailPanel
                    key={`${openId}-${panelKey}`}
                    leadId={openId}
                    isAdmin={isAdmin}
                    onClose={() => setOpenId(null)}
                    onChanged={load}
                    onMove={(id) => setMoving([id])}
                />
            )}
            {moving && (
                <MoveLeadsModal
                    leadIds={moving}
                    onClose={() => setMoving(null)}
                    onDone={() => {
                        setSelected([]);
                        load();
                        setPanelKey((k) => k + 1); // reload the open lead
                    }}
                />
            )}
        </div>
    );
}
