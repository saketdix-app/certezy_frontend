import { useEffect, useMemo, useState } from "react";
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Gift,
    Loader2,
    Search,
    Users,
    X,
    XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import authService from "@/services/authService";
import enrollmentService from "@/services/enrollmentService";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

const PER_PAGE = 15;
const MAX_STUDENTS = 200;
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

const apiError = (err, fallback) =>
    err?.response?.data?.message || err?.response?.data?.errors?.[0] || fallback;
/** Emails from pasted text: commas, semicolons, spaces or new lines between them. */
const parseEmails = (text) => [
    ...new Set(
        text
            .split(/[\s,;]+/)
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
    ),
];

function Card({ className, children }) {
    return (
        <div
            className={cn("rounded-2xl border border-slate-100 bg-surface", className)}
            style={{ boxShadow: "0 1px 8px rgba(15,23,42,0.05)" }}
        >
            {children}
        </div>
    );
}

function Step({ n, title, hint }) {
    return (
        <div className="mb-3 flex items-start gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-action text-small font-bold text-white">
                {n}
            </span>
            <div>
                <p className="text-ui font-extrabold text-slate-900">{title}</p>
                {hint && <p className="text-small text-slate-500">{hint}</p>}
            </div>
        </div>
    );
}

// ── Step 1: pick students (tick from the list, or paste emails) ─────────────
function StudentPicker({ picked, setPicked, pasted, setPasted }) {
    const [tab, setTab] = useState("list");
    const [search, setSearch] = useState("");
    const debounced = useDebounce(search, 350);
    const [pageState, setPageState] = useState({ query: "", page: 1 });
    const page = pageState.query === debounced ? pageState.page : 1;
    const setPage = (p) => setPageState({ query: debounced, page: p });
    const key = `${debounced}|${page}`;
    const [res, setRes] = useState({ key: null, users: [], pagination: { total: 0, totalPages: 1 } });
    const loading = res.key !== key;

    useEffect(() => {
        let live = true;
        authService
            .getAllUsers({ page, limit: PER_PAGE, ...(debounced && { search: debounced }) })
            .then(
                ({ data }) =>
                    live &&
                    setRes({
                        key,
                        users: Array.isArray(data?.data) ? data.data : [],
                        pagination: data?.pagination || { total: 0, totalPages: 1 },
                    })
            )
            .catch((err) => {
                if (!live) return;
                toast.error(apiError(err, "Failed to load students"));
                setRes({ key, users: [], pagination: { total: 0, totalPages: 1 } });
            });
        return () => {
            live = false;
        };
    }, [page, debounced, key]);

    const toggle = (u) =>
        setPicked((m) => {
            const next = new Map(m);
            if (next.has(u.id)) next.delete(u.id);
            else next.set(u.id, { id: u.id, name: u.name, email: u.email });
            return next;
        });
    // "Everyone on this page" means students; staff can still be ticked one by one
    const selectable = res.users.filter((u) => u.is_active && u.role === "student");
    const allOnPage = selectable.length > 0 && selectable.every((u) => picked.has(u.id));
    const togglePage = () =>
        setPicked((m) => {
            const next = new Map(m);
            for (const u of selectable)
                allOnPage ? next.delete(u.id) : next.set(u.id, { id: u.id, name: u.name, email: u.email });
            return next;
        });
    const emails = parseEmails(pasted);
    const bad = emails.filter((e) => !EMAIL_RE.test(e));

    return (
        <Card className="flex min-h-[560px] flex-col">
            <div className="border-b border-slate-100 p-4">
                <Step
                    n={1}
                    title="Choose students"
                    hint="Tick them in the list, paste their emails, or both."
                />
                <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
                    {[
                        ["list", "From the list", Users],
                        ["paste", "Paste emails", ClipboardList],
                    ].map(([k, l, Icon]) => (
                        <button
                            key={k}
                            type="button"
                            role="tab"
                            aria-selected={tab === k}
                            onClick={() => setTab(k)}
                            className={cn(
                                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-small font-bold",
                                tab === k ? "bg-surface text-slate-900 shadow-sm" : "text-slate-500"
                            )}
                        >
                            <Icon size={14} aria-hidden="true" /> {l}
                        </button>
                    ))}
                </div>
            </div>

            {tab === "list" ? (
                <>
                    <div className="space-y-2 p-4 pb-2">
                        <div className="relative">
                            <Search
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                            />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Search ${res.pagination.total ?? ""} students by name or email`}
                                aria-label="Search students"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-ui outline-none focus:border-action focus:bg-surface"
                            />
                        </div>
                        <label className="flex cursor-pointer items-center gap-2 px-1 text-small font-semibold text-slate-600">
                            <input
                                type="checkbox"
                                className="h-4 w-4 accent-action"
                                checked={allOnPage}
                                onChange={togglePage}
                                disabled={!selectable.length}
                            />
                            Select all students on this page
                        </label>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="animate-spin text-action" size={22} />
                            </div>
                        ) : res.users.length === 0 ? (
                            <p className="py-12 text-center text-ui text-slate-500">No students found</p>
                        ) : (
                            res.users.map((u) => (
                                <label
                                    key={u.id}
                                    className={cn(
                                        "flex items-center gap-3 border-b border-slate-50 px-4 py-2.5",
                                        u.is_active
                                            ? "cursor-pointer hover:bg-slate-50"
                                            : "cursor-not-allowed opacity-50",
                                        picked.has(u.id) && "bg-blue-50"
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 accent-action"
                                        disabled={!u.is_active}
                                        checked={picked.has(u.id)}
                                        onChange={() => toggle(u)}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-ui font-bold text-slate-900">{u.name}</p>
                                        <p className="truncate text-label text-slate-500">{u.email}</p>
                                    </div>
                                    {!u.is_active ? (
                                        <span className="rounded bg-red-50 px-1.5 py-0.5 text-label font-bold text-red-600">
                                            Blocked
                                        </span>
                                    ) : (
                                        u.role !== "student" && (
                                            <span className="rounded bg-action-soft px-1.5 py-0.5 text-label font-bold text-action">
                                                Staff
                                            </span>
                                        )
                                    )}
                                </label>
                            ))
                        )}
                    </div>
                    {res.pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                            <button
                                type="button"
                                disabled={page <= 1}
                                onClick={() => setPage(page - 1)}
                                className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
                                aria-label="Previous page"
                            >
                                <ChevronLeft size={15} />
                            </button>
                            <span className="text-small text-slate-500">
                                Page {page} of {res.pagination.totalPages}
                            </span>
                            <button
                                type="button"
                                disabled={page >= res.pagination.totalPages}
                                onClick={() => setPage(page + 1)}
                                className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
                                aria-label="Next page"
                            >
                                <ChevronRight size={15} />
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-1 flex-col p-4">
                    <textarea
                        value={pasted}
                        onChange={(e) => setPasted(e.target.value)}
                        rows={12}
                        placeholder={
                            "One email per line, or separated by commas\n\nasha@company.com\nravi@company.com"
                        }
                        aria-label="Student emails"
                        className="w-full flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-small outline-none focus:border-action focus:bg-surface"
                    />
                    <p className="mt-2 text-small text-slate-500">
                        {emails.length - bad.length} email{emails.length - bad.length === 1 ? "" : "s"}
                        {bad.length > 0 && (
                            <span className="text-red-600">
                                {" "}
                                · {bad.length} not valid: {bad.slice(0, 3).join(", ")}
                                {bad.length > 3 ? "…" : ""}
                            </span>
                        )}
                        . Each must belong to a registered student; any that don&apos;t are listed after you
                        assign.
                    </p>
                </div>
            )}

            {picked.size > 0 && (
                <div className="border-t border-slate-100 p-3">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-small font-bold text-slate-700">{picked.size} ticked</p>
                        <button
                            type="button"
                            onClick={() => setPicked(new Map())}
                            className="text-small font-semibold text-action hover:underline"
                        >
                            Clear
                        </button>
                    </div>
                    <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                        {[...picked.values()].map((u) => (
                            <span
                                key={u.id}
                                className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-0.5 pl-2.5 pr-1 text-label font-semibold text-slate-700"
                            >
                                {u.name}
                                <button
                                    type="button"
                                    onClick={() => toggle(u)}
                                    aria-label={`Remove ${u.name}`}
                                    className="rounded-full p-0.5 hover:bg-blue-100"
                                >
                                    <X size={11} />
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
}

// ── Step 2: pick courses ─────────────────────────────────────────────────────
function CoursePicker({ courses, loading, selected, setSelected }) {
    const [search, setSearch] = useState("");
    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? courses.filter((c) => c.title.toLowerCase().includes(q)) : courses;
    }, [courses, search]);
    const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    return (
        <div>
            <Step
                n={2}
                title="Choose courses"
                hint="One course or several: every chosen student gets all of them, free (₹0)."
            />
            <div className="relative mb-2">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search courses"
                    aria-label="Search courses"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-ui outline-none focus:border-action focus:bg-surface"
                />
            </div>
            <div className="max-h-[260px] overflow-y-auto rounded-xl border border-slate-100">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="animate-spin text-action" size={20} />
                    </div>
                ) : visible.length === 0 ? (
                    <p className="py-8 text-center text-ui text-slate-500">No courses found</p>
                ) : (
                    visible.map((c) => (
                        <label
                            key={c.id}
                            className={cn(
                                "flex cursor-pointer items-center gap-3 border-b border-slate-50 px-3.5 py-2.5 last:border-0 hover:bg-slate-50",
                                selected.includes(c.id) && "bg-blue-50"
                            )}
                        >
                            <input
                                type="checkbox"
                                className="h-4 w-4 accent-action"
                                checked={selected.includes(c.id)}
                                onChange={() => toggle(c.id)}
                            />
                            <p className="min-w-0 flex-1 truncate text-ui font-semibold text-slate-800">
                                {c.title}
                            </p>
                            {c.status === "draft" && <span className="text-label text-slate-500">Draft</span>}
                        </label>
                    ))
                )}
            </div>
        </div>
    );
}

// ── Results after assigning ──────────────────────────────────────────────────
function Results({ result, courseTitle, onDone }) {
    const { totals, results } = result;
    const ok = results.filter((r) => !r.error);
    const failed = results.filter((r) => r.error);
    return (
        <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-body font-extrabold text-slate-900">Done</h2>
                    <p className="text-ui text-slate-600">
                        <strong className="text-emerald-700">{totals.assigned}</strong> course access
                        {totals.assigned === 1 ? "" : "es"} given to {totals.students} student
                        {totals.students === 1 ? "" : "s"}
                        {totals.skipped > 0 && <> · {totals.skipped} already had the course</>}
                        {totals.failed > 0 && (
                            <>
                                {" "}
                                ·{" "}
                                <span className="font-semibold text-red-600">
                                    {totals.failed} couldn&apos;t be assigned
                                </span>
                            </>
                        )}
                        . Each student got an email listing their new courses.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onDone}
                    className="rounded-xl bg-action px-4 py-2 text-ui font-bold text-white hover:bg-action-hover"
                >
                    Assign more
                </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-ui">
                    <thead className="bg-slate-50 text-small text-slate-500">
                        <tr>
                            <th className="px-3 py-2 font-semibold">Student</th>
                            <th className="px-3 py-2 font-semibold">Result</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {[...failed, ...ok].map((r, i) => (
                            <tr key={r.user?.id ?? r.email ?? i} className="align-top">
                                <td className="px-3 py-2.5">
                                    <p className="font-bold text-slate-900">{r.user?.name ?? r.email}</p>
                                    {r.user?.email && (
                                        <p className="text-label text-slate-500">{r.user.email}</p>
                                    )}
                                </td>
                                <td className="px-3 py-2.5">
                                    {r.error ? (
                                        <span className="inline-flex items-center gap-1.5 font-semibold text-red-600">
                                            <XCircle size={14} aria-hidden="true" /> {r.error}
                                        </span>
                                    ) : (
                                        <div className="space-y-0.5">
                                            {r.assigned.map((a) => (
                                                <p
                                                    key={a.course_id}
                                                    className="flex items-center gap-1.5 text-emerald-700"
                                                >
                                                    <CheckCircle2 size={14} aria-hidden="true" />{" "}
                                                    {courseTitle(a.course_id)}
                                                </p>
                                            ))}
                                            {r.skipped.map((s) => (
                                                <p key={s.course_id} className="text-slate-500">
                                                    {courseTitle(s.course_id)}: {s.reason.toLowerCase()}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

/** Admin → Assign Courses → Many students: the same courses to many students at once. */
export default function BulkAssignCourses() {
    const [picked, setPicked] = useState(() => new Map());
    const [pasted, setPasted] = useState("");
    const [courses, setCourses] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [selected, setSelected] = useState([]);
    const [note, setNote] = useState("");
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        enrollmentService
            .getAssignableCourses()
            .then(({ data }) => setCourses(data?.data?.courses || []))
            .catch((err) => toast.error(apiError(err, "Failed to load courses")))
            .finally(() => setLoadingCourses(false));
    }, []);

    const emails = parseEmails(pasted).filter((e) => EMAIL_RE.test(e));
    const pickedEmails = new Set([...picked.values()].map((u) => u.email?.toLowerCase()));
    const extraEmails = emails.filter((e) => !pickedEmails.has(e));
    const studentCount = picked.size + extraEmails.length;
    const courseTitle = (id) => courses.find((c) => c.id === id)?.title ?? `Course #${id}`;
    const tooMany = studentCount > MAX_STUDENTS;
    const ready = studentCount > 0 && selected.length > 0 && !tooMany;

    const assign = async () => {
        const total = studentCount * selected.length;
        const names = selected.length === 1 ? `“${courseTitle(selected[0])}”` : `${selected.length} courses`;
        if (
            !window.confirm(
                `Give ${names} free (₹0) to ${studentCount} student${studentCount === 1 ? "" : "s"}? That's up to ${total} course access${total === 1 ? "" : "es"}; anyone who already has a course is skipped.`
            )
        )
            return;
        setSaving(true);
        try {
            const { data } = await enrollmentService.assignCoursesBulk({
                userIds: [...picked.keys()],
                emails: extraEmails,
                courseIds: selected,
                note: note.trim() || undefined,
            });
            setResult(data.data);
            toast.success(data.message);
        } catch (err) {
            toast.error(apiError(err, "Failed to assign courses"));
        } finally {
            setSaving(false);
        }
    };
    const reset = () => {
        setResult(null);
        setPicked(new Map());
        setPasted("");
        setSelected([]);
        setNote("");
    };

    if (result) return <Results result={result} courseTitle={courseTitle} onDone={reset} />;

    return (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[380px_1fr]">
            <StudentPicker picked={picked} setPicked={setPicked} pasted={pasted} setPasted={setPasted} />
            <Card className="space-y-5 p-5">
                <CoursePicker
                    courses={courses}
                    loading={loadingCourses}
                    selected={selected}
                    setSelected={setSelected}
                />
                <div>
                    <Step
                        n={3}
                        title="Add a note and assign"
                        hint="The note shows on each student's course in their record (e.g. corporate batch, scholarship)."
                    />
                    <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={255}
                        placeholder="Note (optional)"
                        aria-label="Note"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-ui outline-none focus:border-action focus:bg-surface"
                    />
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-ui text-slate-700">
                        <strong>{selected.length}</strong> course{selected.length === 1 ? "" : "s"} →{" "}
                        <strong>{studentCount}</strong> student{studentCount === 1 ? "" : "s"}
                        {selected.length > 0 && studentCount > 0 && (
                            <span className="text-slate-500">
                                {" "}
                                · up to {selected.length * studentCount} course accesses
                            </span>
                        )}
                    </p>
                    {tooMany && (
                        <p className="mt-1 text-small font-semibold text-red-600">
                            Assign to at most {MAX_STUDENTS} students at a time.
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={assign}
                        disabled={!ready || saving}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-action py-3 text-ui font-bold text-white transition-colors hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
                        {ready
                            ? `Assign free to ${studentCount} student${studentCount === 1 ? "" : "s"}`
                            : !studentCount
                              ? "Choose students"
                              : !selected.length
                                ? "Choose courses"
                                : "Too many students"}
                    </button>
                </div>
            </Card>
        </div>
    );
}
