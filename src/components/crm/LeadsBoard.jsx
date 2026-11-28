import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "@/features/auth/authSlice";
import { ExamStatusBadge, PaymentBadge } from "./LeadExamSection";
import courseService from "@/services/courseService";
import toast from "react-hot-toast";
import {
    AlertTriangle,
    ArrowDownWideNarrow,
    ArrowUpNarrowWide,
    CalendarClock,
    CalendarRange,
    ChevronDown,
    Columns3,
    KanbanSquare,
    LayoutGrid,
    List,
    Loader2,
    Plus,
    Search,
    Shuffle,
    SlidersHorizontal,
    X,
    Trash2,
    Play,
    Upload,
} from "lucide-react";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import AddLeadModal from "./AddLeadModal";
import LeadDetailPanel from "./LeadDetailPanel";
import DeleteLeadsModal from "./DeleteLeadsModal";
import { LEADS_SEEN_EVENT } from "@/lib/newLeads";
import RedDot from "./RedDot";
import ImportLeadsModal from "./ImportLeadsModal";
import MoveLeadsModal from "./MoveLeadsModal";
import { StageBadge } from "./crmShared";
import PipelineBoard from "./PipelineBoard";
import { Avatar, Card } from "./newUi";
import { btnOutline, btnPrimary } from "@/lib/newUi";
import { useNewUi } from "@/lib/uiVersion";
import {
    EXAM_RESULT_LABEL,
    EXAM_STATUS,
    PAYMENT_STATUS,
    SOURCES,
    SOURCE_LABEL,
    STAGES,
    WORKFLOW_STAGES,
    ageOf,
    fmtDate,
    fmtMoney,
    apiMessage,
    fmtDateTime,
    formLabel,
    inputCls,
    isOverdue,
    maskPhone,
} from "@/lib/crm";

// ── List view: columns people can show or hide (remembered per browser) ──
const COLUMNS = [
    { key: "phone", label: "Phone", cell: (l) => maskPhone(l.phone) || "—" },
    { key: "email", label: "Email", cell: (l) => l.email || "—" },
    { key: "stage", label: "Status", cell: (l) => <StageBadge stage={l.stage} /> },
    {
        key: "course",
        label: "Course",
        cell: (l) => l.course_title || <span className="text-slate-500">No course</span>,
    },
    { key: "source", label: "Source", cell: (l) => SOURCE_LABEL[l.source] ?? l.source },
    {
        key: "owner",
        label: "Owner",
        admin: true,
        cell: (l) => l.owner_name ?? <span className="text-amber-700">Unassigned</span>,
    },
    {
        key: "added",
        label: "Added",
        cell: (l) => <span title={fmtDateTime(l.created_at)}>{ageOf(l.created_at)} ago</span>,
    },
    {
        key: "follow_up",
        label: "Next follow-up",
        cell: (l) =>
            l.next_follow_up_at ? (
                <span className={cn(isOverdue(l.next_follow_up_at) && "font-semibold text-red-600")}>
                    {fmtDateTime(l.next_follow_up_at)}
                </span>
            ) : (
                "—"
            ),
    },
    {
        key: "stage_changed",
        label: "Status changed",
        cell: (l) => <span title={fmtDateTime(l.stage_changed_at)}>{ageOf(l.stage_changed_at)} ago</span>,
    },
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
                {["scheduled", "rescheduled"].includes(l.exam_status) && l.exam_scheduled_at && (
                    <span className="text-label text-slate-500">{fmtDateTime(l.exam_scheduled_at)}</span>
                )}
                {l.exam_done && (
                    <span className="text-label font-semibold text-emerald-700">
                        Done{l.exam_result && ` · ${EXAM_RESULT_LABEL[l.exam_result]}`}
                    </span>
                )}
            </span>
        ),
    },
    {
        key: "exam_coordinator",
        label: "Exam coordinator",
        cell: (l) => l.exam_coordinator_name ?? <span className="text-slate-500">—</span>,
    },
    {
        key: "ticket",
        label: "Ticket size",
        cell: (l) =>
            l.ticket_size != null ? (
                <span className="font-semibold tabular-nums">
                    {fmtMoney(l.ticket_size, l.ticket_currency)}
                </span>
            ) : (
                "—"
            ),
    },
    {
        key: "enrolled",
        label: "Enrolled",
        cell: (l) => (l.enrolled ? <span className="font-semibold text-emerald-700">Yes</span> : "—"),
    },
];
// ── Exam workflow columns (Application / Exam Scheduled / Course Done tabs) ──
const WORKFLOW_COLUMNS = [
    {
        key: "consultant",
        label: "Consultant",
        cell: (l) => l.owner_name ?? <span className="text-amber-700">Unassigned</span>,
    },
    {
        key: "app_submitted",
        label: "Application",
        cell: (l) =>
            l.application_submitted ? (
                <span className="font-semibold text-emerald-700">
                    Submitted
                    {l.application_submitted_at && (
                        <span className="font-normal text-slate-500">
                            {" "}
                            · {fmtDate(l.application_submitted_at)}
                        </span>
                    )}
                </span>
            ) : (
                <span className="text-slate-500">Not submitted</span>
            ),
    },
    {
        key: "exam_date",
        label: "Exam date & time",
        cell: (l) =>
            l.exam_scheduled_at ? (
                <span className="font-semibold text-slate-800">{fmtDateTime(l.exam_scheduled_at)}</span>
            ) : (
                "—"
            ),
    },
    { key: "exam_state", label: "Exam status", cell: (l) => <ExamStatusBadge status={l.exam_status} /> },
    {
        key: "exam_done",
        label: "Exam done",
        cell: (l) =>
            l.exam_done ? (
                <span className="font-semibold text-emerald-700">
                    Yes
                    {l.exam_completed_at && (
                        <span className="font-normal text-slate-500"> · {fmtDate(l.exam_completed_at)}</span>
                    )}
                    {l.exam_result && (
                        <span className="font-normal text-slate-500">
                            {" "}
                            · {EXAM_RESULT_LABEL[l.exam_result]}
                        </span>
                    )}
                </span>
            ) : (
                <span className="text-slate-500">No</span>
            ),
    },
    { key: "payment", label: "Payment", cell: (l) => <PaymentBadge status={l.payment_status ?? "due"} /> },
    {
        key: "payment_details",
        label: "Payment details",
        cell: (l) =>
            l.payment_status === "done" ? (
                <span>
                    <b className="font-semibold text-slate-800">
                        {l.payment_done_at ? fmtDate(l.payment_done_at) : "Paid"}
                    </b>
                    {l.payment_reference && <span className="text-slate-500"> · {l.payment_reference}</span>}
                </span>
            ) : (
                "—"
            ),
    },
];
const ALL_COLUMNS = [...COLUMNS, ...WORKFLOW_COLUMNS];
const TAB_COLUMNS = {
    application: [
        "phone",
        "course",
        "consultant",
        "exam_coordinator",
        "ticket",
        "app_submitted",
        "stage_changed",
    ],
    exam_scheduled: [
        "course",
        "consultant",
        "exam_coordinator",
        "exam_date",
        "exam_state",
        "exam_done",
        "payment",
        "ticket",
    ],
    course_done: ["course", "consultant", "exam_coordinator", "ticket", "exam_done", "payment_details"],
};

// Advanced filters (all optional); which ones show depends on the tab
const EMPTY_ADV = {
    owner_id: "",
    exam_coordinator_id: "",
    course_id: "",
    currency: "",
    ticket_min: "",
    ticket_max: "",
    app_submitted: "",
    app_from: "",
    app_to: "",
    exam: "",
    exam_done: "",
    exam_from: "",
    exam_to: "",
    payment: "",
    paid_from: "",
    paid_to: "",
    alert: "",
    added: "",
    from: "",
    to: "",
};

// Quick "lead added" ranges; Custom shows two IST dates
const ADDED_RANGES = [
    ["", "Any time"],
    ["1d", "1 day"],
    ["3d", "3 days"],
    ["7d", "1 week"],
    ["custom", "Custom"],
];

const DEFAULT_COLUMNS = [
    "phone",
    "email",
    "stage",
    "course",
    "source",
    "enquiry",
    "exam",
    "ticket",
    "owner",
    "added",
    "follow_up",
];
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
    const me = useSelector(selectUser);
    const isCoordinator = me?.role === "exam_coordinator";
    const isSuperAdmin = me?.role === "super_admin";
    // Sub-Admins assign only with "Lead assignment" (Team → Permissions)
    const canAssign = me?.role !== "sub_admin" || Boolean(me?.permissions?.can_assign_leads);
    const [deleting, setDeleting] = useState(null); // lead ids
    // Backlog → Attempting Contact in one click
    const [starting, setStarting] = useState(null);
    const [adv, setAdv] = useState(EMPTY_ADV);
    const [showAdv, setShowAdv] = useState(false);
    const [coordinators, setCoordinators] = useState([]);
    const [courses, setCourses] = useState([]);
    // Deep links from notifications: ?lead=123 opens it, ?owner=unassigned filters
    const [params] = useSearchParams();
    // Exam Coordinators work three tabs: Application, Exam Scheduled, Course Done
    const [stage, setStage] = useState(isCoordinator ? "application" : "");
    const [search, setSearch] = useState("");
    const [source, setSource] = useState("");
    const [ownerId, setOwnerId] = useState(isAdmin ? (params.get("owner") ?? "") : "");
    const [selected, setSelected] = useState([]);
    const [moving, setMoving] = useState(null); // lead ids
    const [panelKey, setPanelKey] = useState(0);
    const [overdueOnly, setOverdueOnly] = useState(false);
    // Only my leads I haven't opened yet (red dot)
    const [newOnly, setNewOnly] = useState(false);
    // Sort arrow: "" = the tab's usual order, else newest / oldest added first
    const [sort, setSort] = useState("");
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [owners, setOwners] = useState([]);
    const [openId, setOpenId] = useState(Number(params.get("lead")) || null);
    const [adding, setAdding] = useState(false);
    const [importing, setImporting] = useState(false);
    const [view, setViewState] = useState(() =>
        readPref("crm.leads.view", "list") === "cards" ? "cards" : "list"
    );
    const [columns, setColumnsState] = useState(() => {
        const saved = readPref("crm.leads.columns", DEFAULT_COLUMNS);
        let cols = Array.isArray(saved)
            ? saved.filter((k) => COLUMNS.some((c) => c.key === k))
            : DEFAULT_COLUMNS;
        for (const [key, flag] of NEW_COLUMNS) {
            if (readPref(flag, false)) continue;
            if (!cols.includes(key))
                cols = COLUMNS.filter((c) => c.key === key || cols.includes(c.key)).map((c) => c.key);
            writePref(flag, true);
            writePref("crm.leads.columns", cols);
        }
        return cols;
    });
    const setView = (v) => {
        setViewState(v);
        writePref("crm.leads.view", v);
    };
    // New design: List or Board (pipeline), and rows per page
    const newUi = useNewUi();
    const [view2, setView2State] = useState(() => (readPref("crm.leads.view2", "list") === "board" ? "board" : "list"));
    const setView2 = (v) => {
        setView2State(v);
        writePref("crm.leads.view2", v);
    };
    const [perPage, setPerPageState] = useState(() => {
        const n = Number(readPref("crm.leads.perPage", 25));
        return [25, 50, 100].includes(n) ? n : 25;
    });
    const setPerPage = (n) => {
        setPerPageState(n);
        writePref("crm.leads.perPage", n);
        setPage(1);
    };
    const pageSize = newUi ? perPage : 25;
    const toggleColumn = (key) =>
        setColumnsState((cols) => {
            const next = cols.includes(key)
                ? cols.filter((k) => k !== key)
                : COLUMNS.filter((c) => c.key === key || cols.includes(c.key)).map((c) => c.key);
            writePref("crm.leads.columns", next);
            return next;
        });
    const workflowTab = WORKFLOW_STAGES.includes(stage);
    const shownColumns = workflowTab
        ? TAB_COLUMNS[stage].map((k) => ALL_COLUMNS.find((c) => c.key === k)).filter(Boolean)
        : COLUMNS.filter((c) => columns.includes(c.key) && (!c.admin || isAdmin));
    // The "lead added" range sits in the toolbar, so it isn't counted on the Advanced filters button
    const RANGE_KEYS = ["added", "from", "to"];
    const advCount = Object.entries(adv).filter(([k, v]) => v && !RANGE_KEYS.includes(k)).length;
    const setA = (k) => (e) => {
        const v = e.target.type === "checkbox" ? (e.target.checked ? "1" : "") : e.target.value;
        setAdv((a) => ({ ...a, [k]: v }));
        setPage(1);
        setSelected([]);
    };
    const advParams = Object.fromEntries(
        Object.entries(adv).filter(([k, v]) => v !== "" && !(k === "added" && v === "custom"))
    );
    // One range at a time: a quick range clears the custom dates, Custom clears the quick range
    const [customRange, setCustomRange] = useState(false);
    const pickAdded = (v) => {
        setCustomRange(v === "custom");
        setAdv((a) => ({
            ...a,
            added: v === "custom" ? "" : v,
            ...(v === "custom" ? {} : { from: "", to: "" }),
        }));
        setPage(1);
        setSelected([]);
    };
    const addedPick = customRange || adv.from || adv.to ? "custom" : adv.added;

    // Filters as the API takes them (the list, and "select all matching")
    const filters = () => ({
        stage: stage || undefined,
        search: search.trim() || undefined,
        source: source || undefined,
        owner_id: ownerId || undefined,
        follow_up: overdueOnly ? "overdue" : undefined,
        new: newOnly ? "1" : undefined,
        sort: sort || undefined,
        ...advParams,
    });
    const [selectingAll, setSelectingAll] = useState(false);
    const selectAllMatching = async () => {
        setSelectingAll(true);
        try {
            const { data: res } = await crmService.list({ ...filters(), ids_only: 1 });
            setSelected(res.data.ids);
            if (res.data.capped)
                toast(
                    `Selected the first ${res.data.ids.length} of ${res.data.total}. Move these, then select again.`
                );
        } catch (err) {
            toast.error(apiMessage(err, "Could not select the leads"));
        } finally {
            setSelectingAll(false);
        }
    };

    const advKey = JSON.stringify(advParams);
    const load = useCallback(async () => {
        try {
            const { data: res } = await crmService.list({
                stage: stage || undefined,
                search: search.trim() || undefined,
                source: source || undefined,
                owner_id: ownerId || undefined,
                follow_up: overdueOnly ? "overdue" : undefined,
                new: newOnly ? "1" : undefined,
                sort: sort || undefined,
                ...JSON.parse(advKey),
                page,
                limit: pageSize,
            });
            setData(res.data);
        } catch (err) {
            toast.error(apiMessage(err, "Could not load leads"));
            setData({ leads: [], counts: {}, pagination: { totalPages: 1 } });
        }
    }, [stage, search, source, ownerId, overdueOnly, newOnly, sort, advKey, page, pageSize]);

    const startLead = async (e, l) => {
        e.stopPropagation();
        setStarting(l.id);
        try {
            await crmService.changeStage(l.id, "attempting_contact");
            toast.success(`${l.name} moved to Attempting Contact`);
            load();
        } catch (err) {
            toast.error(apiMessage(err, "Could not move the lead"));
        } finally {
            setStarting(null);
        }
    };

    // A lead was opened (its red dot is gone): refresh the list
    useEffect(() => {
        window.addEventListener(LEADS_SEEN_EVENT, load);
        return () => window.removeEventListener(LEADS_SEEN_EVENT, load);
    }, [load]);
    useEffect(() => {
        const t = setTimeout(load, search ? 300 : 0);
        return () => clearTimeout(t);
    }, [load, search]);

    useEffect(() => {
        // Consultant list: Admins and coordinators; coordinator list: Admins and consultants
        if (isAdmin || isCoordinator)
            crmService
                .owners()
                .then(({ data: res }) => setOwners(res.data ?? []))
                .catch(() => {});
        if (!isCoordinator)
            crmService
                .examCoordinators()
                .then(({ data: res }) => setCoordinators(res.data ?? []))
                .catch(() => {});
        courseService
            .getAll({ limit: 100 })
            .then(({ data: res }) =>
                setCourses(Array.isArray(res?.data) ? res.data : (res?.data?.courses ?? []))
            )
            .catch(() => {});
    }, [isAdmin, isCoordinator]);

    const counts = data?.counts ?? {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    // "All" leaves out the Backlog (it has its own tab); a search still includes it
    const allCount = search.trim() ? total : total - (counts.backlog ?? 0);
    const resetPage = (fn) => (v) => {
        fn(v);
        setPage(1);
        setSelected([]);
    };
    const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));


    const modals = (
        <>
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
                    onMove={canAssign ? (id) => setMoving([id]) : undefined}
                    onDelete={isSuperAdmin ? (id) => setDeleting([id]) : undefined}
                />
            )}
            {importing && (
                <ImportLeadsModal
                    isManager={Boolean(isAdmin)}
                    canAssign={canAssign}
                    owners={owners}
                    courses={courses}
                    onClose={() => setImporting(false)}
                    onDone={load}
                />
            )}
            {deleting && (
                <DeleteLeadsModal
                    leadIds={deleting}
                    names={(data?.leads ?? []).filter((l) => deleting.includes(l.id)).map((l) => l.name)}
                    onClose={() => setDeleting(null)}
                    onDeleted={(ids) => {
                        setSelected((sel) => sel.filter((x) => !ids.includes(x)));
                        if (ids.includes(openId)) setOpenId(null);
                        load();
                    }}
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
        </>
    );

    if (newUi) {
        const board = view2 === "board";
        const totalPages = data?.pagination?.totalPages ?? 1;
        const tabs = isCoordinator
            ? STAGES.filter(([k]) => WORKFLOW_STAGES.includes(k)).map(([k, l]) => [k, l, counts[k] ?? 0])
            : [["", "All leads", allCount], ...STAGES.map(([k, l]) => [k, l, counts[k] ?? 0])];
        const linkSelect =
            "cursor-pointer appearance-none bg-transparent pr-4 text-ui font-semibold text-action outline-none hover:underline";
        const chip = (on, tone = "action") =>
            cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-small font-semibold",
                on
                    ? tone === "red"
                        ? "border-red-300 bg-red-50 text-red-700"
                        : "border-action bg-action-soft text-action-soft-ink"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
            );
        return (
            <div>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-h2 font-extrabold tracking-tight text-slate-900">
                            {isAdmin ? "Leads" : isCoordinator ? "Exam Students" : "My Leads"}
                        </h1>
                        <p className="mt-0.5 text-small text-slate-500">
                            {data ? `${(board ? total - (counts.backlog ?? 0) : data.pagination?.total ?? 0).toLocaleString("en-IN")} records` : "Loading…"}
                        </p>
                    </div>
                    {!isCoordinator && (
                        <div className="flex flex-wrap gap-2">
                            {(me?.role !== "sub_admin" || me?.permissions?.can_import_leads) && (
                                <button type="button" onClick={() => setImporting(true)} className={btnOutline}>
                                    <Upload size={15} aria-hidden="true" /> Import
                                </button>
                            )}
                            <button type="button" onClick={() => setAdding(true)} className={btnPrimary}>
                                <Plus size={15} aria-hidden="true" /> Add lead
                            </button>
                        </div>
                    )}
                </div>

                <Card className="overflow-hidden">
                    {/* Views: stage tabs (list) and the List / Board switch */}
                    <div className="flex items-end justify-between gap-2 border-b border-slate-200 bg-slate-50 pl-2 pr-3 pt-2">
                        <div className="flex min-w-0 gap-0.5 overflow-x-auto [scrollbar-width:thin]" role="tablist">
                            {board ? (
                                <span className="rounded-t-lg border border-b-0 border-slate-200 bg-surface px-4 py-2 text-ui font-bold text-slate-900">
                                    Pipeline
                                </span>
                            ) : (
                                tabs.map(([k, l, n]) => (
                                    <button
                                        key={k || "all"}
                                        role="tab"
                                        aria-selected={stage === k}
                                        onClick={() => resetPage(setStage)(k)}
                                        className={cn(
                                            "shrink-0 whitespace-nowrap rounded-t-lg border border-b-0 px-3.5 py-2 text-ui",
                                            stage === k
                                                ? "border-slate-200 bg-surface font-bold text-slate-900 shadow-[inset_0_2px_0_var(--color-action)]"
                                                : "border-transparent font-semibold text-slate-600 hover:bg-surface/60 hover:text-slate-900"
                                        )}
                                    >
                                        {l} <span className="ml-1 text-small font-semibold text-slate-500">{n}</span>
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="mb-1.5 inline-flex shrink-0 rounded-lg border border-slate-200 bg-surface p-0.5" role="group" aria-label="View">
                            {[
                                ["list", "List", List],
                                ["board", "Board", KanbanSquare],
                            ].map(([v, label, Icon]) => (
                                <button
                                    key={v}
                                    type="button"
                                    aria-pressed={view2 === v}
                                    onClick={() => setView2(v)}
                                    title={v === "board" ? "Pipeline board: drag leads between stages" : "List"}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-small font-semibold",
                                        view2 === v ? "bg-action text-white" : "text-slate-600 hover:text-slate-900"
                                    )}
                                >
                                    <Icon size={14} aria-hidden="true" /> {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Filters as links */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-200 px-4 py-2.5">
                        {isAdmin && (
                            <label className="relative inline-flex items-center">
                                <select value={ownerId} onChange={(e) => resetPage(setOwnerId)(e.target.value)} className={linkSelect} aria-label="Lead owner">
                                    <option value="">Lead owner: anyone</option>
                                    <option value="unassigned">Unassigned</option>
                                    {owners.map((o) => (
                                        <option key={o.id} value={o.id}>
                                            {o.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={13} className="pointer-events-none absolute right-0 text-action" aria-hidden="true" />
                            </label>
                        )}
                        <label className="relative inline-flex items-center">
                            <select value={source} onChange={(e) => resetPage(setSource)(e.target.value)} className={linkSelect} aria-label="Source">
                                <option value="">Source: any</option>
                                {SOURCES.map(([v, l]) => (
                                    <option key={v} value={v}>
                                        {l}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={13} className="pointer-events-none absolute right-0 text-action" aria-hidden="true" />
                        </label>
                        <label className="relative inline-flex items-center">
                            <select value={addedPick} onChange={(e) => pickAdded(e.target.value)} className={linkSelect} aria-label="Lead added">
                                {ADDED_RANGES.map(([v, label]) => (
                                    <option key={v || "any"} value={v}>
                                        {v ? `Added: ${label}` : "Added: any time"}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={13} className="pointer-events-none absolute right-0 text-action" aria-hidden="true" />
                        </label>
                        {addedPick === "custom" && (
                            <span className="inline-flex items-center gap-1.5">
                                <input type="date" value={adv.from} max={adv.to || undefined} onChange={setA("from")} aria-label="Lead added from" className={cn(inputCls, "w-auto py-1")} />
                                <span className="text-slate-400">–</span>
                                <input type="date" value={adv.to} min={adv.from || undefined} onChange={setA("to")} aria-label="Lead added to" className={cn(inputCls, "w-auto py-1")} />
                            </span>
                        )}
                        {!isCoordinator && (
                            <label className={chip(overdueOnly)}>
                                <input type="checkbox" checked={overdueOnly} onChange={(e) => resetPage(setOverdueOnly)(e.target.checked)} className="sr-only" />
                                <CalendarClock size={13} aria-hidden="true" /> Overdue follow-ups
                            </label>
                        )}
                        {!isCoordinator && (
                            <label className={chip(newOnly, "red")}>
                                <input type="checkbox" checked={newOnly} onChange={(e) => resetPage(setNewOnly)(e.target.checked)} className="sr-only" />
                                <RedDot label="" /> Not opened yet
                            </label>
                        )}
                        {stage === "exam_scheduled" && !board && (
                            <label className={chip(adv.alert === "1", "red")}>
                                <input type="checkbox" checked={adv.alert === "1"} onChange={setA("alert")} className="sr-only" />
                                <AlertTriangle size={13} aria-hidden="true" /> Exam done, payment due
                            </label>
                        )}
                        <button
                            type="button"
                            onClick={() => setShowAdv((v) => !v)}
                            aria-expanded={showAdv}
                            className="inline-flex items-center gap-1.5 text-ui font-semibold text-action hover:underline"
                        >
                            <SlidersHorizontal size={14} aria-hidden="true" /> Advanced filters{advCount ? ` (${advCount})` : ""}
                        </button>
                    </div>

                    {showAdv && (
                        <div className="border-b border-slate-200 px-4 pt-4">
                            <AdvancedFilters
                                adv={adv}
                                setA={setA}
                                stage={board ? "" : stage}
                                owners={owners.filter((o) => o.role === "consultant")}
                                coordinators={coordinators}
                                courses={courses}
                                showOwner={isAdmin || isCoordinator}
                                showCoordinator={!isCoordinator}
                                onClear={() => {
                                    setAdv((a) => ({ ...EMPTY_ADV, added: a.added, from: a.from, to: a.to }));
                                    setPage(1);
                                }}
                                onClose={() => setShowAdv(false)}
                            />
                        </div>
                    )}

                    {/* Search and columns */}
                    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                        <div className="relative w-full sm:w-72">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                            <input
                                value={search}
                                onChange={(e) => resetPage(setSearch)(e.target.value)}
                                placeholder="Search name, phone, email"
                                aria-label="Search leads"
                                className={cn(inputCls, "py-1.5 pl-9")}
                            />
                        </div>
                        {!board && (
                            <div className="ml-auto flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => resetPage(setSort)(sort === "oldest" ? "newest" : "oldest")}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-ui font-semibold text-slate-700 hover:border-action"
                                >
                                    {sort === "oldest" ? <ArrowUpNarrowWide size={14} aria-hidden="true" /> : <ArrowDownWideNarrow size={14} aria-hidden="true" />}
                                    {sort === "oldest" ? "Oldest first" : sort === "newest" || !workflowTab ? "Newest first" : "Sort by added"}
                                </button>
                                {!workflowTab && (
                                    <details className="relative">
                                        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-ui font-semibold text-slate-700 hover:border-action [&::-webkit-details-marker]:hidden">
                                            <Columns3 size={14} aria-hidden="true" /> Edit columns
                                        </summary>
                                        <div className="absolute right-0 z-30 mt-1 w-52 rounded-xl border border-slate-200 bg-surface p-2 shadow-lg">
                                            {COLUMNS.filter((c) => !c.admin || isAdmin).map((c) => (
                                                <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-ui text-slate-700 hover:bg-slate-50">
                                                    <input type="checkbox" checked={columns.includes(c.key)} onChange={() => toggleColumn(c.key)} className="accent-action" />
                                                    {c.label}
                                                </label>
                                            ))}
                                        </div>
                                    </details>
                                )}
                            </div>
                        )}
                    </div>

                    {isAdmin && selected.length > 0 && !board && (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-y border-action/30 bg-action-soft px-4 py-2">
                            <p className="flex flex-wrap items-center gap-x-3 text-ui font-semibold text-action-soft-ink">
                                {selected.length} selected
                                {data?.pagination?.total > selected.length && (
                                    <button type="button" disabled={selectingAll} onClick={selectAllMatching} className="text-small font-semibold text-action hover:underline disabled:opacity-60">
                                        {selectingAll ? "Selecting…" : `Select all ${data.pagination.total} matching`}
                                    </button>
                                )}
                            </p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setSelected([])} className="rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-small font-semibold">
                                    Clear
                                </button>
                                {canAssign && (
                                    <button type="button" onClick={() => setMoving(selected)} className="inline-flex items-center gap-1.5 rounded-lg bg-action px-3 py-1.5 text-small font-bold text-white">
                                        <Shuffle size={13} aria-hidden="true" /> Assign / transfer
                                    </button>
                                )}
                                {isSuperAdmin && (
                                    <button type="button" onClick={() => setDeleting(selected)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-surface px-3 py-1.5 text-small font-bold text-red-700 hover:bg-red-50">
                                        <Trash2 size={13} aria-hidden="true" /> Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {board ? (
                        <div className="border-t border-slate-200 p-3">
                            <PipelineBoard
                                filters={{ ...filters(), stage: undefined, sort: undefined }}
                                isAdmin={isAdmin}
                                onOpen={setOpenId}
                                reloadKey={data}
                            />
                        </div>
                    ) : !data ? (
                        <div className="flex justify-center border-t border-slate-200 py-16">
                            <Loader2 className="animate-spin text-slate-500" />
                        </div>
                    ) : !data.leads.length ? (
                        <p className="border-t border-slate-200 py-14 text-center text-ui text-slate-500">
                            {total ? "No leads match these filters." : "No leads yet. Add your first lead to get started."}
                        </p>
                    ) : (
                        <div className="max-h-[70vh] overflow-auto border-t border-slate-200">
                            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-ui">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 text-label font-bold uppercase tracking-wide text-slate-600">
                                        {isAdmin && (
                                            <th className="w-10 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
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
                                        <th className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-3 py-2.5">Name</th>
                                        {shownColumns.map((c) => (
                                            <th key={c.key} className="whitespace-nowrap border-b border-r border-slate-200 bg-slate-50 px-3 py-2.5 last:border-r-0">
                                                {c.key === "added" ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => resetPage(setSort)(sort === "oldest" ? "newest" : "oldest")}
                                                        className="inline-flex items-center gap-1 uppercase hover:text-action"
                                                        aria-label="Sort by when the lead was added"
                                                    >
                                                        {c.label}
                                                        {sort === "oldest" ? <ArrowUpNarrowWide size={12} aria-hidden="true" /> : <ArrowDownWideNarrow size={12} aria-hidden="true" />}
                                                    </button>
                                                ) : (
                                                    c.label
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.leads.map((l) => (
                                        <tr
                                            key={l.id}
                                            onClick={() => setOpenId(l.id)}
                                            className={cn(
                                                "group cursor-pointer [&>td]:border-b [&>td]:border-slate-100",
                                                l.payment_alert
                                                    ? "bg-red-50 shadow-[inset_4px_0_0_#dc2626] hover:bg-red-100"
                                                    : selected.includes(l.id)
                                                      ? "bg-action-soft"
                                                      : "hover:bg-action-soft/50"
                                            )}
                                            title={l.payment_alert ? "Exam done, payment due" : undefined}
                                        >
                                            {isAdmin && (
                                                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                                                    <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggle(l.id)} aria-label={`Select ${l.name}`} className="h-4 w-4 accent-action" />
                                                </td>
                                            )}
                                            <td className="sticky left-0 max-w-[260px] border-r !border-r-slate-100 bg-inherit px-3 py-2">
                                                <span className="flex items-center gap-2.5">
                                                    <Avatar name={l.name} size={28} />
                                                    <span className="min-w-0">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenId(l.id);
                                                            }}
                                                            className="flex max-w-full items-center gap-1.5 truncate text-left font-bold text-action hover:underline"
                                                        >
                                                            {l.is_new && <RedDot label="New lead — not opened yet" />}
                                                            <span className="truncate">{l.name}</span>
                                                        </button>
                                                        {l.payment_alert && (
                                                            <span className="inline-flex items-center gap-1 text-label font-bold text-red-700">
                                                                <AlertTriangle size={11} aria-hidden="true" /> Payment due
                                                            </span>
                                                        )}
                                                        {l.stage === "backlog" && !isCoordinator && (
                                                            <StartButton busy={starting === l.id} onClick={(e) => startLead(e, l)} />
                                                        )}
                                                    </span>
                                                </span>
                                            </td>
                                            {shownColumns.map((c) => (
                                                <td key={c.key} className="max-w-[240px] truncate whitespace-nowrap px-3 py-2 text-slate-700">
                                                    {c.key === "owner" && l.owner_name ? (
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Avatar name={l.owner_name} size={20} /> {l.owner_name}
                                                        </span>
                                                    ) : (
                                                        c.cell(l)
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Numbered pages and rows per page */}
                    {!board && data?.leads?.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-1 border-t border-slate-200 px-4 py-2.5 text-ui">
                            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 font-semibold text-action disabled:text-slate-400">
                                ‹ Prev
                            </button>
                            {pageList(page, totalPages).map((p, i) =>
                                p === "…" ? (
                                    <span key={`gap${i}`} className="px-1 text-slate-400">
                                        …
                                    </span>
                                ) : (
                                    <button
                                        key={p}
                                        type="button"
                                        aria-current={p === page ? "page" : undefined}
                                        onClick={() => setPage(p)}
                                        className={cn(
                                            "min-w-8 rounded-md px-2 py-1 font-semibold",
                                            p === page ? "border border-action bg-action-soft text-action-soft-ink" : "text-action hover:bg-action-soft"
                                        )}
                                    >
                                        {p}
                                    </button>
                                )
                            )}
                            <button
                                type="button"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => p + 1)}
                                className="px-2 py-1 font-semibold text-action disabled:text-slate-400"
                            >
                                Next ›
                            </button>
                            <label className="relative ml-3 inline-flex items-center">
                                <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} className={linkSelect} aria-label="Rows per page">
                                    {[25, 50, 100].map((n) => (
                                        <option key={n} value={n}>
                                            {n} per page
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={13} className="pointer-events-none absolute right-0 text-action" aria-hidden="true" />
                            </label>
                        </div>
                    )}
                </Card>
                {modals}
            </div>
        );
    }

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
                              ? "Students assigned to you for the exam: Application, Exam Scheduled (schedule, mark done, payment) and Course Done."
                              : "Leads assigned to you. Open a lead to call, log notes, update its status or schedule a follow-up."}
                    </p>
                </div>
                {!isCoordinator && (
                    <div className="flex flex-wrap gap-2">
                        {(me?.role !== "sub_admin" || me?.permissions?.can_import_leads) && (
                            <button
                                type="button"
                                onClick={() => setImporting(true)}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-surface px-4 py-2.5 text-ui font-bold text-slate-700 hover:border-action hover:text-action"
                            >
                                <Upload size={16} aria-hidden="true" /> Import CSV
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setAdding(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-action px-4 py-2.5 text-ui font-bold text-white hover:bg-action-hover"
                        >
                            <Plus size={16} aria-hidden="true" /> Add lead
                        </button>
                    </div>
                )}
            </div>

            {/* Status tabs */}
            <div
                className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:thin] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
                role="tablist"
            >
                {(isCoordinator
                    ? STAGES.filter(([k]) => WORKFLOW_STAGES.includes(k)).map(([k, l]) => [
                          k,
                          l,
                          counts[k] ?? 0,
                      ])
                    : [["", "All Leads", allCount], ...STAGES.map(([k, l]) => [k, l, counts[k] ?? 0])]
                ).map(([k, l, n]) => (
                    <button
                        key={k || "all"}
                        role="tab"
                        aria-selected={stage === k}
                        onClick={() => resetPage(setStage)(k)}
                        className={cn(
                            "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-small font-semibold",
                            stage === k
                                ? "border-action bg-action-soft text-action-soft-ink"
                                : "border-slate-200 bg-surface text-slate-600"
                        )}
                    >
                        {l} <span className="ml-0.5 text-slate-500">{n}</span>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative w-full sm:w-auto sm:min-w-[220px] sm:flex-1">
                    <Search
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                        aria-hidden="true"
                    />
                    <input
                        value={search}
                        onChange={(e) => resetPage(setSearch)(e.target.value)}
                        placeholder="Search name, phone or email"
                        aria-label="Search leads"
                        className={cn(inputCls, "pl-9")}
                    />
                </div>
                <select
                    value={source}
                    onChange={(e) => resetPage(setSource)(e.target.value)}
                    className={cn(inputCls, "w-auto")}
                    aria-label="Source"
                >
                    <option value="">All sources</option>
                    {SOURCES.map(([v, l]) => (
                        <option key={v} value={v}>
                            {l}
                        </option>
                    ))}
                </select>
                <div
                    className="inline-flex flex-wrap items-center rounded-lg border border-slate-200 bg-surface p-0.5"
                    role="group"
                    aria-label="Lead added"
                >
                    <CalendarRange size={14} className="mx-1.5 text-slate-500" aria-hidden="true" />
                    {ADDED_RANGES.map(([v, label]) => (
                        <button
                            key={v || "any"}
                            type="button"
                            onClick={() => pickAdded(v)}
                            aria-pressed={addedPick === v}
                            className={cn(
                                "rounded-md px-2.5 py-1.5 text-ui font-semibold",
                                addedPick === v ? "bg-action text-white" : "text-slate-700 hover:bg-slate-50"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {addedPick === "custom" && (
                    <span className="inline-flex items-center gap-1.5">
                        <input
                            type="date"
                            value={adv.from}
                            max={adv.to || undefined}
                            onChange={setA("from")}
                            aria-label="Lead added from"
                            className={cn(inputCls, "w-auto")}
                        />
                        <span className="text-slate-400">–</span>
                        <input
                            type="date"
                            value={adv.to}
                            min={adv.from || undefined}
                            onChange={setA("to")}
                            aria-label="Lead added to"
                            className={cn(inputCls, "w-auto")}
                        />
                    </span>
                )}
                <button
                    type="button"
                    onClick={() => resetPage(setSort)(sort === "oldest" ? "newest" : "oldest")}
                    title="Change the order"
                    aria-label={
                        sort === "oldest"
                            ? "Oldest leads first. Switch to newest first"
                            : "Newest leads first. Switch to oldest first"
                    }
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-ui font-semibold",
                        sort
                            ? "border-action bg-action-soft text-action-soft-ink"
                            : "border-slate-200 bg-surface text-slate-700"
                    )}
                >
                    {sort === "oldest" ? (
                        <ArrowUpNarrowWide size={15} aria-hidden="true" />
                    ) : (
                        <ArrowDownWideNarrow size={15} aria-hidden="true" />
                    )}
                    {sort === "oldest"
                        ? "Oldest first"
                        : sort === "newest" || !workflowTab
                          ? "Newest first"
                          : "Sort by added"}
                </button>
                {isAdmin && (
                    <select
                        value={ownerId}
                        onChange={(e) => resetPage(setOwnerId)(e.target.value)}
                        className={cn(inputCls, "w-auto")}
                        aria-label="Owner"
                    >
                        <option value="">All owners</option>
                        <option value="unassigned">Unassigned</option>
                        {owners.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.name}
                            </option>
                        ))}
                    </select>
                )}
                <button
                    type="button"
                    onClick={() => setShowAdv((v) => !v)}
                    aria-expanded={showAdv}
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-ui font-semibold",
                        showAdv || advCount
                            ? "border-action bg-action-soft text-action-soft-ink"
                            : "border-slate-200 bg-surface text-slate-700"
                    )}
                >
                    <SlidersHorizontal size={14} aria-hidden="true" /> Advanced filters
                    {advCount ? ` (${advCount})` : ""}
                </button>
                {stage === "exam_scheduled" && (
                    <label
                        className={cn(
                            "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-ui font-semibold",
                            adv.alert
                                ? "border-red-300 bg-red-50 text-red-700"
                                : "border-slate-200 bg-surface text-slate-700"
                        )}
                    >
                        <input
                            type="checkbox"
                            checked={adv.alert === "1"}
                            onChange={setA("alert")}
                            className="accent-red-600"
                        />
                        <AlertTriangle size={14} aria-hidden="true" /> Exam done, payment due
                    </label>
                )}
                {!isCoordinator && (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ui text-slate-700">
                        <input
                            type="checkbox"
                            checked={overdueOnly}
                            onChange={(e) => resetPage(setOverdueOnly)(e.target.checked)}
                            className="accent-action"
                        />
                        Overdue follow-ups
                    </label>
                )}
                {!isCoordinator && (
                    <label
                        className={cn(
                            "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-ui",
                            newOnly
                                ? "border-red-300 bg-red-50 font-semibold text-red-700"
                                : "border-slate-200 bg-surface text-slate-700"
                        )}
                    >
                        <input
                            type="checkbox"
                            checked={newOnly}
                            onChange={(e) => resetPage(setNewOnly)(e.target.checked)}
                            className="accent-red-600"
                        />
                        <RedDot label="" /> New (not opened)
                    </label>
                )}
                <div className="ml-auto flex items-center gap-2">
                    {view === "list" && !workflowTab && (
                        <details className="relative">
                            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ui font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
                                <Columns3 size={14} aria-hidden="true" /> Columns
                            </summary>
                            <div className="absolute right-0 z-30 mt-1 w-52 rounded-xl border border-slate-200 bg-surface p-2 shadow-lg">
                                <p className="px-2 pb-1 text-label font-semibold uppercase tracking-wide text-slate-500">
                                    Show in the list
                                </p>
                                <p className="flex items-center gap-2 px-2 py-1 text-ui text-slate-500">
                                    <input type="checkbox" checked disabled className="accent-action" /> Name
                                    (always)
                                </p>
                                {COLUMNS.filter((c) => !c.admin || isAdmin).map((c) => (
                                    <label
                                        key={c.key}
                                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-ui text-slate-700 hover:bg-slate-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={columns.includes(c.key)}
                                            onChange={() => toggleColumn(c.key)}
                                            className="accent-action"
                                        />
                                        {c.label}
                                    </label>
                                ))}
                            </div>
                        </details>
                    )}
                    <div
                        className="inline-flex rounded-lg border border-slate-200 bg-surface p-0.5"
                        role="group"
                        aria-label="View"
                    >
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
                                    view === v
                                        ? "bg-action-soft text-action-soft-ink"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <Icon size={14} aria-hidden="true" /> {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {showAdv && (
                <AdvancedFilters
                    adv={adv}
                    setA={setA}
                    stage={stage}
                    owners={owners.filter((o) => o.role === "consultant")}
                    coordinators={coordinators}
                    courses={courses}
                    showOwner={isAdmin || isCoordinator}
                    showCoordinator={!isCoordinator}
                    onClear={() => {
                        setAdv((a) => ({ ...EMPTY_ADV, added: a.added, from: a.from, to: a.to }));
                        setPage(1);
                    }}
                    onClose={() => setShowAdv(false)}
                />
            )}

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
                                {selectingAll
                                    ? "Selecting…"
                                    : `Select all ${data.pagination.total} matching leads`}
                            </button>
                        )}
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setSelected([])}
                            className="rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-small font-semibold"
                        >
                            Clear
                        </button>
                        {canAssign && (
                            <button
                                type="button"
                                onClick={() => setMoving(selected)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-action px-3 py-1.5 text-small font-bold text-white"
                            >
                                <Shuffle size={13} aria-hidden="true" /> Assign / transfer
                            </button>
                        )}
                        {isSuperAdmin && (
                            <button
                                type="button"
                                onClick={() => setDeleting(selected)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-surface px-3 py-1.5 text-small font-bold text-red-700 hover:bg-red-50"
                            >
                                <Trash2 size={13} aria-hidden="true" /> Delete
                            </button>
                        )}
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
                    {total
                        ? "No leads match these filters."
                        : "No leads yet. Add your first lead to get started."}
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
                                                        ? [
                                                              ...new Set([
                                                                  ...sel,
                                                                  ...data.leads.map((l) => l.id),
                                                              ]),
                                                          ]
                                                        : sel.filter(
                                                              (id) => !data.leads.some((l) => l.id === id)
                                                          )
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
                                    className={cn(
                                        "cursor-pointer",
                                        l.payment_alert
                                            ? "bg-red-100 text-red-950 shadow-[inset_5px_0_0_#dc2626] hover:bg-red-200 [&_td]:!text-red-900"
                                            : "hover:bg-slate-50",
                                        selected.includes(l.id) && !l.payment_alert && "bg-action-soft"
                                    )}
                                    title={l.payment_alert ? "Exam done, payment due" : undefined}
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
                                            {l.is_new && (
                                                <RedDot
                                                    label="New lead — not opened yet"
                                                    className="mr-1.5 align-middle"
                                                />
                                            )}
                                            {l.name}
                                        </button>
                                        {l.payment_alert && (
                                            <span className="mt-0.5 inline-flex items-center gap-1 text-label font-bold text-red-700">
                                                <AlertTriangle size={11} aria-hidden="true" /> Payment due
                                            </span>
                                        )}
                                        {l.stage === "backlog" && !isCoordinator && (
                                            <StartButton
                                                busy={starting === l.id}
                                                onClick={(e) => startLead(e, l)}
                                            />
                                        )}
                                    </td>
                                    {shownColumns.map((c) => (
                                        <td
                                            key={c.key}
                                            className="max-w-[240px] truncate whitespace-nowrap px-3 py-2.5 text-slate-600"
                                        >
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
                                    "block w-full rounded-xl border p-4 text-left transition-colors hover:border-action",
                                    isAdmin && "pl-9",
                                    l.payment_alert
                                        ? "border-red-500 bg-red-100 ring-2 ring-red-400"
                                        : "bg-surface",
                                    !l.payment_alert &&
                                        (selected.includes(l.id) ? "border-action" : "border-slate-200")
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="flex min-w-0 items-center gap-1.5 truncate text-body font-bold text-slate-900">
                                        {l.is_new && <RedDot label="New lead — not opened yet" />}
                                        <span className="truncate">{l.name}</span>
                                    </p>
                                    <StageBadge stage={l.stage} />
                                </div>
                                {l.stage === "backlog" && !isCoordinator && (
                                    <StartButton busy={starting === l.id} onClick={(e) => startLead(e, l)} />
                                )}
                                <p className="mt-0.5 truncate text-small text-slate-500">
                                    {maskPhone(l.phone) || l.email}
                                    {l.course_title && ` · ${l.course_title}`}
                                </p>
                                {(l.preferred_time || l.enquiry_message) && (
                                    <p className="mt-1.5 line-clamp-2 text-small text-slate-700">
                                        {l.preferred_time && (
                                            <span className="font-semibold text-action-soft-ink">
                                                Call: {l.preferred_time}.{" "}
                                            </span>
                                        )}
                                        {l.enquiry_message}
                                    </p>
                                )}
                                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-slate-500">
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">
                                        {SOURCE_LABEL[l.source] ?? l.source}
                                    </span>
                                    <span>{ageOf(l.created_at)} old</span>
                                    {l.next_follow_up_at && (
                                        <span
                                            className={cn(
                                                "inline-flex items-center gap-1",
                                                isOverdue(l.next_follow_up_at) && "font-semibold text-red-600"
                                            )}
                                        >
                                            <CalendarClock size={12} aria-hidden="true" />{" "}
                                            {fmtDateTime(l.next_follow_up_at)}
                                        </span>
                                    )}
                                    {l.enrolled && (
                                        <span className="font-semibold text-emerald-700">Enrolled</span>
                                    )}
                                    {l.exam_status && l.exam_status !== "not_scheduled" && (
                                        <ExamStatusBadge status={l.exam_status} />
                                    )}
                                    {WORKFLOW_STAGES.includes(l.stage) &&
                                        (l.exam_done || l.payment_status === "done") && (
                                            <PaymentBadge status={l.payment_status} />
                                        )}
                                    {l.payment_alert && (
                                        <span className="inline-flex items-center gap-1 font-bold text-red-700">
                                            <AlertTriangle size={12} aria-hidden="true" /> Exam done, payment
                                            due
                                        </span>
                                    )}
                                    {l.ticket_size != null && (
                                        <span className="font-semibold text-slate-700">
                                            {fmtMoney(l.ticket_size, l.ticket_currency)}
                                        </span>
                                    )}
                                    {isAdmin && (
                                        <span className="ml-auto">{l.owner_name ?? "Unassigned"}</span>
                                    )}
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {data?.pagination?.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-end gap-2 text-ui">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="rounded-lg border bg-surface px-3 py-1.5 disabled:opacity-40"
                    >
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

            {modals}
        </div>
    );
}

/** 1 … 4 5 6 … 20: the page numbers to show around the current one. */
function pageList(page, total) {
    const keep = new Set([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
    const out = [];
    let last = 0;
    for (const p of [...keep].sort((a, b) => a - b)) {
        if (p - last > 1) out.push("…");
        out.push(p);
        last = p;
    }
    return out;
}

/** Backlog lead: start working it (→ Attempting Contact). */
function StartButton({ busy, onClick }) {
    return (
        <button
            type="button"
            disabled={busy}
            onClick={onClick}
            className="mt-1 inline-flex items-center gap-1 rounded-md border border-action/40 bg-action-soft px-2 py-0.5 text-label font-bold text-action-soft-ink hover:bg-action hover:text-white disabled:opacity-60"
        >
            {busy ? (
                <Loader2 size={11} className="animate-spin" aria-hidden="true" />
            ) : (
                <Play size={11} aria-hidden="true" />
            )}{" "}
            Start: Attempting Contact
        </button>
    );
}

const sel = cn(inputCls, "py-1.5");

function Field({ label, children, className }) {
    return (
        <label className={cn("block min-w-0 text-small font-semibold text-slate-600", className)}>
            {label}
            <span className="mt-1 block">{children}</span>
        </label>
    );
}

/** Two dates side by side: takes two grid columns so the date pickers never overlap the next field. */
function Range({ label, from, to, adv, setA }) {
    return (
        <Field label={label} className="sm:col-span-2">
            <span className="flex items-center gap-1.5">
                <input
                    type="date"
                    value={adv[from]}
                    onChange={setA(from)}
                    aria-label={`${label} from`}
                    className={cn(sel, "min-w-0 flex-1")}
                />
                <span className="text-slate-400">–</span>
                <input
                    type="date"
                    value={adv[to]}
                    onChange={setA(to)}
                    aria-label={`${label} to`}
                    className={cn(sel, "min-w-0 flex-1")}
                />
            </span>
        </Field>
    );
}

/** Advanced filters: shared ones, plus the fields of the current workflow tab. */
function AdvancedFilters({
    adv,
    setA,
    stage,
    owners,
    coordinators,
    courses,
    showOwner,
    showCoordinator,
    onClear,
    onClose,
}) {
    const all = !stage || !WORKFLOW_STAGES.includes(stage);
    return (
        <section
            className="mb-4 rounded-xl border border-slate-200 bg-surface p-4"
            aria-label="Advanced filters"
        >
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-ui font-bold text-slate-800">Advanced filters</h2>
                <span className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onClear}
                        className="text-small font-semibold text-action hover:underline"
                    >
                        Clear all
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close filters"
                        className="text-slate-500 hover:text-slate-700"
                    >
                        <X size={16} />
                    </button>
                </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {showOwner && (
                    <Field label="Consultant">
                        <select value={adv.owner_id} onChange={setA("owner_id")} className={sel}>
                            <option value="">Anyone</option>
                            {owners.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}
                {showCoordinator && (
                    <Field label="Exam coordinator">
                        <select
                            value={adv.exam_coordinator_id}
                            onChange={setA("exam_coordinator_id")}
                            className={sel}
                        >
                            <option value="">Anyone</option>
                            <option value="none">Not assigned</option>
                            {coordinators.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}
                <Field label="Course">
                    <select value={adv.course_id} onChange={setA("course_id")} className={sel}>
                        <option value="">Any course</option>
                        {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.title}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Ticket size">
                    <span className="flex items-center gap-1.5">
                        <select
                            value={adv.currency}
                            onChange={setA("currency")}
                            aria-label="Ticket currency"
                            className={cn(sel, "w-[84px] shrink-0")}
                        >
                            <option value="">Any</option>
                            <option value="INR">₹ INR</option>
                            <option value="USD">$ USD</option>
                        </select>
                        <input
                            type="number"
                            min="0"
                            value={adv.ticket_min}
                            onChange={setA("ticket_min")}
                            placeholder="Min"
                            aria-label="Minimum ticket size"
                            className={cn(sel, "min-w-0 flex-1")}
                        />
                        <input
                            type="number"
                            min="0"
                            value={adv.ticket_max}
                            onChange={setA("ticket_max")}
                            placeholder="Max"
                            aria-label="Maximum ticket size"
                            className={cn(sel, "min-w-0 flex-1")}
                        />
                    </span>
                </Field>

                {(all || stage === "application") && (
                    <>
                        <Field label="Application submitted">
                            <select
                                value={adv.app_submitted}
                                onChange={setA("app_submitted")}
                                className={sel}
                            >
                                <option value="">Any</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </Field>
                        <Range label="Submitted between" from="app_from" to="app_to" adv={adv} setA={setA} />
                    </>
                )}
                {(all || stage === "exam_scheduled") && (
                    <>
                        <Field label="Exam status">
                            <select value={adv.exam} onChange={setA("exam")} className={sel}>
                                <option value="">Any</option>
                                {Object.entries(EXAM_STATUS).map(([v, [l]]) => (
                                    <option key={v} value={v}>
                                        {l}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Range
                            label="Exam date between"
                            from="exam_from"
                            to="exam_to"
                            adv={adv}
                            setA={setA}
                        />
                    </>
                )}
                {(all || stage !== "application") && (
                    <Field label="Exam done">
                        <select value={adv.exam_done} onChange={setA("exam_done")} className={sel}>
                            <option value="">Any</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </Field>
                )}
                {(all || stage !== "application") && (
                    <Field label="Payment status">
                        <select value={adv.payment} onChange={setA("payment")} className={sel}>
                            <option value="">Any</option>
                            {Object.entries(PAYMENT_STATUS).map(([v, [l]]) => (
                                <option key={v} value={v}>
                                    {l}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}
                {(all || stage === "course_done") && (
                    <Range label="Paid between" from="paid_from" to="paid_to" adv={adv} setA={setA} />
                )}
            </div>
        </section>
    );
}
