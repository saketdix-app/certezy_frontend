import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    Search,
    Gift,
    Loader2,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Trash2,
    UserRound,
    X,
} from "lucide-react";
import toast from "react-hot-toast";

import authService from "@/services/authService";
import enrollmentService from "@/services/enrollmentService";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

const PER_PAGE = 15;

const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const apiError = (err, fallback) =>
    err?.response?.data?.message || err?.response?.data?.errors?.[0] || fallback;

function Avatar({ name }) {
    return (
        <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-extrabold shrink-0"
            style={{ background: "linear-gradient(135deg, #3282B8, #0a1628)" }}
        >
            {name?.charAt(0).toUpperCase() || "?"}
        </div>
    );
}

function Card({ className, children }) {
    return (
        <div
            className={cn("bg-white rounded-2xl border border-slate-100", className)}
            style={{ boxShadow: "0 1px 8px rgba(15,23,42,0.05)" }}
        >
            {children}
        </div>
    );
}

// ── Left: student list ──────────────────────────────────────────────────────
function StudentList({ selectedId, onSelect }) {
    const [search, setSearch] = useState("");
    const debounced = useDebounce(search, 350);
    const [pageState, setPageState] = useState({ query: "", page: 1 });
    // A new search always starts at page 1
    const page = pageState.query === debounced ? pageState.page : 1;
    const setPage = (updater) =>
        setPageState({ query: debounced, page: typeof updater === "function" ? updater(page) : updater });

    const requestKey = `${debounced}|${page}`;
    const [result, setResult] = useState({ key: null, users: [], pagination: { total: 0, totalPages: 1 } });
    const loading = result.key !== requestKey;
    const { users, pagination } = result;

    useEffect(() => {
        let cancelled = false;
        authService
            .getAllUsers({ role: "student", page, limit: PER_PAGE, ...(debounced && { search: debounced }) })
            .then(({ data }) => {
                if (cancelled) return;
                setResult({
                    key: requestKey,
                    users: Array.isArray(data?.data) ? data.data : [],
                    pagination: data?.pagination || { total: 0, totalPages: 1 },
                });
            })
            .catch((err) => {
                if (cancelled) return;
                toast.error(apiError(err, "Failed to load users"));
                setResult({ key: requestKey, users: [], pagination: { total: 0, totalPages: 1 } });
            });
        return () => {
            cancelled = true;
        };
    }, [page, debounced, requestKey]);

    return (
        <Card className="flex flex-col min-h-[520px]">
            <div className="p-4 border-b border-slate-100">
                <p className="text-[13px] font-bold text-slate-900 mb-3">
                    Registered students{" "}
                    <span className="text-slate-400 font-semibold">({pagination.total ?? 0})</span>
                </p>
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] outline-none focus:border-primary focus:bg-white"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-primary" size={22} />
                    </div>
                ) : users.length === 0 ? (
                    <p className="text-center text-[13px] text-slate-400 py-12">No students found</p>
                ) : (
                    users.map((u) => (
                        <button
                            key={u.id}
                            onClick={() => onSelect(u)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-50 transition-colors",
                                selectedId === u.id ? "bg-blue-50" : "hover:bg-slate-50"
                            )}
                        >
                            <Avatar name={u.name} />
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-bold text-slate-900 truncate">{u.name}</p>
                                <p className="text-[11.5px] text-slate-400 truncate">{u.email}</p>
                            </div>
                            {!u.is_active && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                    Blocked
                                </span>
                            )}
                        </button>
                    ))
                )}
            </div>

            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
                        aria-label="Previous page"
                    >
                        <ChevronLeft size={15} />
                    </button>
                    <span className="text-[12px] text-slate-500">
                        Page {page} of {pagination.totalPages}
                    </span>
                    <button
                        disabled={page >= pagination.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
                        aria-label="Next page"
                    >
                        <ChevronRight size={15} />
                    </button>
                </div>
            )}
        </Card>
    );
}

// ── Right top: course picker ────────────────────────────────────────────────
function AssignPanel({ user, enrolledIds, onAssigned }) {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState([]);
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        enrollmentService
            .getAssignableCourses()
            .then(({ data }) => setCourses(data?.data?.courses || []))
            .catch((err) => toast.error(apiError(err, "Failed to load courses")))
            .finally(() => setLoading(false));
    }, []);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? courses.filter((c) => c.title.toLowerCase().includes(q)) : courses;
    }, [courses, search]);

    const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    const assign = async () => {
        if (!selected.length) return;
        setSaving(true);
        try {
            const { data } = await enrollmentService.assignCourses({
                userId: user.id,
                courseIds: selected,
                note: note.trim() || undefined,
            });
            const { assigned = [], skipped = [] } = data?.data || {};
            if (assigned.length) toast.success(data.message);
            if (skipped.length) {
                const titles = skipped
                    .map((s) => courses.find((c) => c.id === s.course_id)?.title || `#${s.course_id}`)
                    .join(", ");
                toast(`Skipped (${skipped[0].reason.toLowerCase()}): ${titles}`, { icon: "ℹ️" });
            }
            setSelected([]);
            setNote("");
            onAssigned();
        } catch (err) {
            toast.error(apiError(err, "Failed to assign courses"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="p-5">
            <div className="flex items-center gap-2 mb-1">
                <Gift size={17} className="text-primary" />
                <h2 className="text-[15px] font-extrabold text-slate-900">Assign free courses</h2>
            </div>
            <p className="text-[12.5px] text-slate-500 mb-4">
                Selected courses are added at ₹0 with no payment and appear instantly in {user.name}&apos;s My
                Courses.
            </p>

            <div className="relative mb-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search courses"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] outline-none focus:border-primary focus:bg-white"
                />
            </div>

            <div className="border border-slate-100 rounded-xl max-h-[260px] overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-primary" size={20} />
                    </div>
                ) : visible.length === 0 ? (
                    <p className="text-center text-[13px] text-slate-400 py-8">No courses found</p>
                ) : (
                    visible.map((c) => {
                        const enrolled = enrolledIds.has(c.id);
                        const checked = selected.includes(c.id);
                        return (
                            <label
                                key={c.id}
                                className={cn(
                                    "flex items-center gap-3 px-3.5 py-2.5 border-b border-slate-50 last:border-0",
                                    enrolled
                                        ? "opacity-60 cursor-not-allowed"
                                        : "cursor-pointer hover:bg-slate-50",
                                    checked && "bg-blue-50"
                                )}
                            >
                                <input
                                    type="checkbox"
                                    className="accent-[#3282B8] w-4 h-4"
                                    disabled={enrolled}
                                    checked={checked || enrolled}
                                    onChange={() => toggle(c.id)}
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-semibold text-slate-800 truncate">
                                        {c.title}
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                        {c.status === "draft" ? "Draft · " : ""}
                                        <span className="line-through">
                                            {Number(c.price) > 0 ? `$${c.price}` : ""}
                                        </span>
                                        {Number(c.price) > 0 ? " → " : ""}
                                        <span className="text-green-600 font-semibold">Free (₹0)</span>
                                    </p>
                                </div>
                                {enrolled && (
                                    <span className="text-[10.5px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                        Enrolled
                                    </span>
                                )}
                            </label>
                        );
                    })
                )}
            </div>

            <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={255}
                placeholder="Note (optional) — e.g. scholarship, corporate batch, support goodwill"
                className="w-full mt-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13px] outline-none focus:border-primary focus:bg-white"
            />

            <button
                onClick={assign}
                disabled={!selected.length || saving}
                className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-[13.5px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
                {selected.length
                    ? `Assign ${selected.length} course${selected.length > 1 ? "s" : ""} free`
                    : "Select courses to assign"}
            </button>
        </Card>
    );
}

// ── Right bottom: the user's courses ────────────────────────────────────────
function UserCourses({ user, enrollments, loading, onRevoke }) {
    const [confirm, setConfirm] = useState(null);
    const [busy, setBusy] = useState(false);

    const revoke = async () => {
        setBusy(true);
        try {
            await onRevoke(confirm);
            setConfirm(null);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Card>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-primary" />
                    <h2 className="text-[15px] font-extrabold text-slate-900">{user.name}&apos;s courses</h2>
                </div>
                <span className="text-[12px] text-slate-400">{enrollments.length} total</span>
            </div>

            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-primary" size={20} />
                </div>
            ) : enrollments.length === 0 ? (
                <p className="text-center text-[13px] text-slate-400 py-10">No courses yet</p>
            ) : (
                <div className="divide-y divide-slate-50">
                    {enrollments.map((e) => {
                        const free = e.source === "admin";
                        return (
                            <div key={e.id} className="flex items-center gap-3 px-5 py-3.5">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-bold text-slate-900 truncate">
                                        {e.course_title}
                                    </p>
                                    <p className="text-[11.5px] text-slate-400 mt-0.5">
                                        {free ? (
                                            <>
                                                <span className="font-semibold text-green-700">
                                                    Free · ₹0
                                                </span>{" "}
                                                · assigned by {e.assigned_by_name || "admin"} on{" "}
                                                {fmtDate(e.enrolled_at)}
                                                {e.note ? ` · “${e.note}”` : ""}
                                            </>
                                        ) : (
                                            <>
                                                <span className="font-semibold text-slate-600">
                                                    Purchased
                                                </span>{" "}
                                                on {fmtDate(e.enrolled_at)}
                                            </>
                                        )}
                                    </p>
                                </div>
                                <div className="w-24 hidden sm:block">
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary"
                                            style={{ width: `${Math.min(e.progress || 0, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-[10.5px] text-slate-400 mt-1 text-right">
                                        {Math.round(e.progress || 0)}% done
                                    </p>
                                </div>
                                {free ? (
                                    <button
                                        onClick={() => setConfirm(e)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-[12px] font-bold text-red-600 bg-red-50 hover:bg-red-100"
                                    >
                                        <Trash2 size={13} /> Revoke
                                    </button>
                                ) : (
                                    <span
                                        className="text-[11px] text-slate-400 w-[74px] text-center"
                                        title="Paid enrollments are removed through a refund"
                                    >
                                        Paid
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {confirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onClick={() => !busy && setConfirm(null)}
                >
                    <div
                        className="bg-white rounded-2xl p-6 w-full max-w-sm"
                        onClick={(ev) => ev.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <h3 className="text-[16px] font-extrabold text-slate-900">Revoke access?</h3>
                            <button onClick={() => setConfirm(null)} aria-label="Close">
                                <X size={16} className="text-slate-400" />
                            </button>
                        </div>
                        <p className="text-[13px] text-slate-600 mb-5">
                            {user.name} will lose access to <strong>{confirm.course_title}</strong>. Their
                            lesson progress is kept if you assign it again later.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={revoke}
                                disabled={busy}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[13px] font-bold disabled:opacity-60"
                            >
                                {busy ? "Revoking…" : "Revoke access"}
                            </button>
                            <button
                                onClick={() => setConfirm(null)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function AssignCoursesPage() {
    const [params, setParams] = useSearchParams();
    const [user, setUser] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [loadingEnr, setLoadingEnr] = useState(false);

    const loadEnrollments = useCallback(async (userId) => {
        setLoadingEnr(true);
        try {
            const { data } = await enrollmentService.getUserEnrollments(userId);
            setEnrollments(data?.data?.enrollments || []);
        } catch (err) {
            toast.error(apiError(err, "Failed to load the user's courses"));
            setEnrollments([]);
        } finally {
            setLoadingEnr(false);
        }
    }, []);

    // Deep link: /admin/assign-courses?user=12 (from the Users page)
    const userParam = params.get("user");
    useEffect(() => {
        if (!userParam || Number(userParam) === user?.id) return;
        authService
            .getUserById(userParam)
            .then(({ data }) => setUser(data?.data?.user || null))
            .catch(() => toast.error("User not found"));
    }, [userParam, user?.id]);

    useEffect(() => {
        if (user?.id) loadEnrollments(user.id);
    }, [user?.id, loadEnrollments]);

    const selectUser = (u) => {
        setUser(u);
        setParams({ user: String(u.id) }, { replace: true });
    };

    const handleRevoke = async (enrollment) => {
        try {
            await enrollmentService.revokeEnrollment(enrollment.id);
            toast.success(`Access to ${enrollment.course_title} revoked`);
            loadEnrollments(user.id);
        } catch (err) {
            toast.error(apiError(err, "Failed to revoke access"));
        }
    };

    const enrolledIds = useMemo(() => new Set(enrollments.map((e) => e.course_id)), [enrollments]);

    return (
        <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
            <div className="mb-6">
                <h1 className="text-[22px] font-extrabold text-slate-900 tracking-tight">
                    Assign Free Courses
                </h1>
                <p className="text-[13px] text-slate-500 mt-1">
                    Give any registered student free access to a course — no payment needed.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
                <StudentList selectedId={user?.id} onSelect={selectUser} />

                {user ? (
                    <div className="space-y-5 min-w-0">
                        <Card className="flex items-center gap-3 px-5 py-4">
                            <Avatar name={user.name} />
                            <div className="min-w-0">
                                <p className="text-[14px] font-extrabold text-slate-900 truncate">
                                    {user.name}
                                </p>
                                <p className="text-[12px] text-slate-400 truncate">{user.email}</p>
                            </div>
                            {user.role !== "student" && (
                                <span className="ml-auto text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">
                                    Not a student account
                                </span>
                            )}
                        </Card>
                        <AssignPanel
                            key={user.id}
                            user={user}
                            enrolledIds={enrolledIds}
                            onAssigned={() => loadEnrollments(user.id)}
                        />
                        <UserCourses
                            user={user}
                            enrollments={enrollments}
                            loading={loadingEnr}
                            onRevoke={handleRevoke}
                        />
                    </div>
                ) : (
                    <Card className="flex flex-col items-center justify-center text-center min-h-[520px] p-8">
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                            <UserRound size={26} className="text-primary" />
                        </div>
                        <p className="text-[15px] font-extrabold text-slate-900 mb-1">Select a student</p>
                        <p className="text-[13px] text-slate-500 max-w-xs">
                            Search for a registered user on the left to see their courses and assign new ones
                            for free.
                        </p>
                    </Card>
                )}
            </div>
        </div>
    );
}
