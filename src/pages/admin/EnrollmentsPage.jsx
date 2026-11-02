import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Search,
    Users,
    CheckCircle2,
    PlayCircle,
    CircleDashed,
    Moon,
    ChevronLeft,
    ChevronRight,
    Download,
    Calendar,
    Globe2,
    X,
    Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

import enrollmentService from "@/services/enrollmentService";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const PER_PAGE = 10;

const STATUS = {
    completed: { label: "Completed", bg: "#EBF4FF", color: "#3282B8", bar: "#3282B8" },
    in_progress: { label: "In progress", bg: "#F0FDF4", color: "#16A34A", bar: "#22C55E" },
    not_started: { label: "Not started", bg: "#F8FAFC", color: "#64748B", bar: "#CBD5E1" },
};

const SOURCES = [
    ["", "All sources"],
    ["purchase", "Paid"],
    ["free", "Free course"],
    ["admin", "Assigned by admin"],
];

const EMPTY_FILTERS = { search: "", course_id: "", country: "", status: "", source: "", from: "", to: "" };

let regionNames;
try {
    regionNames = new Intl.DisplayNames(["en"], { type: "region" });
} catch {
    regionNames = null;
}

const countryName = (code) => {
    if (!code || code === "unknown") return "Unknown";
    try {
        return regionNames?.of(code) ?? code;
    } catch {
        return code;
    }
};

// "IN" → 🇮🇳
const flag = (code) =>
    code && code.length === 2
        ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))
        : "🌐";

const formatDate = (value) =>
    value
        ? new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
        : "—";

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

// Only filters that are set, for the API
const activeParams = (filters) => Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""));

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EnrollmentsPage() {
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [searchInput, setSearchInput] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState(null);

    const setFilter = (key, value) => {
        setFilters((f) => ({ ...f, [key]: value }));
        setCurrentPage(1);
    };

    // Search after typing stops
    useEffect(() => {
        const t = setTimeout(() => {
            setFilters((f) => (f.search === searchInput.trim() ? f : { ...f, search: searchInput.trim() }));
            setCurrentPage(1);
        }, 350);
        return () => clearTimeout(t);
    }, [searchInput]);

    // ── Load enrollments ───────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await enrollmentService.getAllEnrollments({
                ...activeParams(filters),
                page: currentPage,
                limit: PER_PAGE,
            });
            setEnrollments(data?.data ?? []);
            setTotalCount(data?.pagination?.total ?? 0);
        } catch {
            toast.error("Could not load enrollments");
        } finally {
            setLoading(false);
        }
    }, [currentPage, filters]);

    // ── Load stats (same filters except status, so every card keeps its count) ─
    const { status: _status, ...statsFilters } = filters;
    const statsKey = JSON.stringify(activeParams(statsFilters));
    const loadStats = useCallback(async () => {
        try {
            const { data } = await enrollmentService.getEnrollmentStats(JSON.parse(statsKey));
            setStats(data?.data ?? null);
        } catch {
            setStats(null);
        }
    }, [statsKey]);

    useEffect(() => {
        load();
    }, [load]);
    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await enrollmentService.exportEnrollments(activeParams(filters));
            const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = `enrollments-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success("Export downloaded");
        } catch {
            toast.error("Export failed. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    const clearFilters = () => {
        setFilters(EMPTY_FILTERS);
        setSearchInput("");
        setCurrentPage(1);
    };

    const totals = stats?.totals ?? {};
    const totalPages = Math.ceil(totalCount / PER_PAGE);
    const hasFilters = Object.values(filters).some((v) => v !== "");
    const courses = stats?.by_course ?? [];

    const statusCards = [
        {
            key: "",
            label: "Enrollments",
            value: totals.total,
            icon: Users,
            bg: "#EBF4FF",
            color: "#3282B8",
        },
        {
            key: "completed",
            label: "Completed",
            value: totals.completed,
            icon: CheckCircle2,
            bg: "#EBF4FF",
            color: "#3282B8",
        },
        {
            key: "in_progress",
            label: "In progress",
            value: totals.in_progress,
            icon: PlayCircle,
            bg: "#F0FDF4",
            color: "#16A34A",
        },
        {
            key: "not_started",
            label: "Not started",
            value: totals.not_started,
            icon: CircleDashed,
            bg: "#F8FAFC",
            color: "#64748B",
        },
        {
            key: "inactive",
            label: `Idle ${stats?.inactive_days ?? 14}+ days`,
            value: totals.inactive,
            icon: Moon,
            bg: "#FFFBEB",
            color: "#D97706",
        },
    ];

    return (
        <div className="space-y-5 px-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-[26px] font-extrabold text-slate-900 tracking-tight">Enrollments</h1>
                    <p className="text-[13.5px] text-slate-500 mt-0.5">
                        Track who enrolled, where they are from and how far they have got.
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                    {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    Export CSV{hasFilters ? " (filtered)" : ""}
                </button>
            </div>

            {/* Status cards — click to filter */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {statusCards.map(({ key, label, value, icon: Icon, bg, color }) => {
                    const active = filters.status === key;
                    return (
                        <button
                            key={label}
                            type="button"
                            onClick={() => setFilter("status", key)}
                            aria-pressed={active}
                            className={cn(
                                "text-left bg-white rounded-2xl border p-4 transition-all",
                                active
                                    ? "border-[#3282B8] ring-2 ring-[#3282B8]/15"
                                    : "border-slate-100 hover:border-slate-200"
                            )}
                            style={{ boxShadow: "0 1px 8px rgba(15,23,42,0.05)" }}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: bg }}
                                >
                                    <Icon size={18} style={{ color }} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider leading-tight">
                                        {label}
                                    </p>
                                    <p className="text-[24px] font-extrabold text-slate-900 leading-none mt-0.5">
                                        {value ?? "—"}
                                    </p>
                                </div>
                            </div>
                            {key && totals.total ? (
                                <p className="text-[11.5px] text-slate-400 mt-2">
                                    {pct(value, totals.total)}% of all
                                </p>
                            ) : key === "" && stats ? (
                                <p className="text-[11.5px] text-slate-400 mt-2">
                                    {totals.students} students · {totals.this_month} this month
                                </p>
                            ) : null}
                        </button>
                    );
                })}
            </div>

            {/* Country + course breakdown */}
            {stats && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Breakdown
                        title="Students by country"
                        icon={Globe2}
                        rows={(stats.by_country ?? []).map((r) => ({
                            id: r.country,
                            label: `${flag(r.country === "unknown" ? null : r.country)} ${countryName(r.country)}`,
                            ...r,
                        }))}
                        selected={filters.country}
                        onSelect={(id) => setFilter("country", filters.country === id ? "" : id)}
                        note="Country is saved from the student's IP address when they sign in."
                    />
                    <Breakdown
                        title="Enrollments by course"
                        icon={Users}
                        rows={courses.map((r) => ({ id: String(r.course_id), label: r.course_title, ...r }))}
                        selected={filters.course_id}
                        onSelect={(id) => setFilter("course_id", filters.course_id === id ? "" : id)}
                    />
                </div>
            )}

            {/* Filters */}
            <div
                className="bg-white rounded-2xl border border-slate-100 p-4"
                style={{ boxShadow: "0 1px 8px rgba(15,23,42,0.05)" }}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="relative sm:col-span-2">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            size={16}
                        />
                        <input
                            type="search"
                            placeholder="Search name, email, mobile or course…"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className={cn(inputCls, "pl-10")}
                        />
                    </div>
                    <select
                        value={filters.course_id}
                        onChange={(e) => setFilter("course_id", e.target.value)}
                        className={inputCls}
                        aria-label="Course"
                    >
                        <option value="">All courses</option>
                        {courses.map((c) => (
                            <option key={c.course_id} value={c.course_id}>
                                {c.course_title}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filters.country}
                        onChange={(e) => setFilter("country", e.target.value)}
                        className={inputCls}
                        aria-label="Country"
                    >
                        <option value="">All countries</option>
                        {(stats?.by_country ?? []).map((c) => (
                            <option key={c.country} value={c.country}>
                                {countryName(c.country)} ({c.students})
                            </option>
                        ))}
                    </select>
                    <select
                        value={filters.source}
                        onChange={(e) => setFilter("source", e.target.value)}
                        className={inputCls}
                        aria-label="Source"
                    >
                        {SOURCES.map(([v, l]) => (
                            <option key={v} value={v}>
                                {l}
                            </option>
                        ))}
                    </select>
                    <div className="flex items-center gap-1.5 sm:col-span-2">
                        <input
                            type="date"
                            value={filters.from}
                            max={filters.to || undefined}
                            onChange={(e) => setFilter("from", e.target.value)}
                            className={cn(inputCls, "px-2")}
                            aria-label="Enrolled from"
                            title="Enrolled from"
                        />
                        <input
                            type="date"
                            value={filters.to}
                            min={filters.from || undefined}
                            onChange={(e) => setFilter("to", e.target.value)}
                            className={cn(inputCls, "px-2")}
                            aria-label="Enrolled to"
                            title="Enrolled to"
                        />
                    </div>
                </div>
                {hasFilters && (
                    <div className="flex items-center justify-between mt-3 text-[12.5px]">
                        <span className="text-slate-500">
                            {totalCount} matching enrollment{totalCount === 1 ? "" : "s"}
                        </span>
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1 font-semibold text-[#3282B8] hover:underline"
                        >
                            <X size={13} /> Clear filters
                        </button>
                    </div>
                )}
            </div>

            {/* Enrollments Table */}
            <div
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
                style={{ boxShadow: "0 1px 8px rgba(15,23,42,0.05)" }}
            >
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3282B8]" />
                    </div>
                ) : enrollments.length === 0 ? (
                    <div className="text-center py-20">
                        <Users className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-lg font-semibold text-slate-900">No enrollments found</p>
                        <p className="text-sm text-slate-600 mt-1">Try changing your search or filters.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[860px]">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        {[
                                            "Student",
                                            "Country",
                                            "Course",
                                            "Enrolled",
                                            "Progress",
                                            "Last activity",
                                            "Status",
                                        ].map((h) => (
                                            <th
                                                key={h}
                                                className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-600"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {enrollments.map((e) => {
                                        const st = STATUS[e.status] ?? STATUS.not_started;
                                        return (
                                            <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-semibold shrink-0">
                                                            {e.student_name?.charAt(0)?.toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-slate-900 truncate">
                                                                {e.student_name}
                                                            </p>
                                                            <p className="text-xs text-slate-500 truncate">
                                                                {e.student_email}
                                                            </p>
                                                            {e.student_mobile && (
                                                                <p className="text-xs text-slate-400">
                                                                    {e.student_mobile}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-sm text-slate-700 whitespace-nowrap">
                                                    {e.student_country
                                                        ? `${flag(e.student_country)} ${countryName(e.student_country)}`
                                                        : "—"}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <p className="text-sm font-semibold text-slate-900">
                                                        {e.course_title}
                                                    </p>
                                                    <p className="text-xs text-slate-500 capitalize">
                                                        {e.source === "purchase"
                                                            ? `Paid${e.payment_id ? ` · payment #${e.payment_id}` : ""}`
                                                            : e.source === "admin"
                                                              ? "Assigned by admin"
                                                              : e.source}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2 text-slate-600 whitespace-nowrap">
                                                        <Calendar size={14} />
                                                        <span className="text-sm">
                                                            {formatDate(e.enrolled_at)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 w-[160px]">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                                                            <div
                                                                className="h-2 rounded-full"
                                                                style={{
                                                                    width: `${Math.min(100, e.progress ?? 0)}%`,
                                                                    background: st.bar,
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-semibold text-slate-600 w-9 text-right">
                                                            {e.progress ?? 0}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                                                    {formatDate(e.last_activity)}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span
                                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
                                                        style={{ background: st.bg, color: st.color }}
                                                    >
                                                        {st.label}
                                                    </span>
                                                    {e.is_inactive && (
                                                        <span className="block mt-1 text-[11px] font-semibold text-amber-600">
                                                            Idle 14+ days
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                                <p className="text-sm text-slate-600">
                                    Showing {(currentPage - 1) * PER_PAGE + 1}–
                                    {Math.min(currentPage * PER_PAGE, totalCount)} of {totalCount}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        aria-label="Previous page"
                                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="px-3 py-1 text-sm text-slate-600">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        aria-label="Next page"
                                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

const inputCls =
    "w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-800 outline-none focus:border-[#3282B8] focus:bg-white transition-colors";

// ─── Breakdown: stacked bar per row (completed / in progress / not started) ──

function Breakdown({ title, icon: Icon, rows, selected, onSelect, note }) {
    const [showAll, setShowAll] = useState(false);
    const max = useMemo(() => Math.max(1, ...rows.map((r) => r.enrollments)), [rows]);
    const visible = showAll ? rows : rows.slice(0, 8);

    return (
        <div
            className="bg-white rounded-2xl border border-slate-100 p-5"
            style={{ boxShadow: "0 1px 8px rgba(15,23,42,0.05)" }}
        >
            <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="flex items-center gap-2 text-[14px] font-bold text-slate-900">
                    <Icon size={16} className="text-[#3282B8]" /> {title}
                </h2>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    {Object.values(STATUS).map((s) => (
                        <span key={s.label} className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.bar }} />
                            {s.label}
                        </span>
                    ))}
                </div>
            </div>

            {rows.length === 0 ? (
                <p className="text-[13px] text-slate-400 py-6 text-center">No data yet</p>
            ) : (
                <ul className="space-y-2">
                    {visible.map((r) => {
                        const active = selected === r.id;
                        return (
                            <li key={r.id}>
                                <button
                                    type="button"
                                    onClick={() => onSelect(r.id)}
                                    aria-pressed={active}
                                    title={`${r.completed} completed · ${r.in_progress} in progress · ${r.not_started} not started`}
                                    className={cn(
                                        "w-full text-left rounded-lg px-2 py-1.5 transition-colors",
                                        active ? "bg-[#EBF4FF]" : "hover:bg-slate-50"
                                    )}
                                >
                                    <div className="flex items-center justify-between text-[12.5px] mb-1">
                                        <span className="font-semibold text-slate-700 truncate pr-2">
                                            {r.label}
                                        </span>
                                        <span className="text-slate-500 shrink-0">
                                            <b className="text-slate-900">{r.enrollments}</b>
                                            {r.students != null && r.students !== r.enrollments
                                                ? ` · ${r.students} students`
                                                : ""}
                                        </span>
                                    </div>
                                    <div
                                        className="flex h-2.5 rounded-full overflow-hidden bg-slate-100"
                                        style={{ width: `${Math.max(4, (r.enrollments / max) * 100)}%` }}
                                    >
                                        {["completed", "in_progress", "not_started"].map((k) =>
                                            r[k] ? (
                                                <span
                                                    key={k}
                                                    style={{
                                                        width: `${(r[k] / r.enrollments) * 100}%`,
                                                        background: STATUS[k].bar,
                                                    }}
                                                />
                                            ) : null
                                        )}
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className="flex items-center justify-between mt-3">
                {note ? <p className="text-[11px] text-slate-400">{note}</p> : <span />}
                {rows.length > 8 && (
                    <button
                        type="button"
                        onClick={() => setShowAll((v) => !v)}
                        className="text-[12px] font-semibold text-[#3282B8] hover:underline shrink-0"
                    >
                        {showAll ? "Show less" : `Show all ${rows.length}`}
                    </button>
                )}
            </div>
        </div>
    );
}
