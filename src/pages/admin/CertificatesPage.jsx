import { useState, useEffect, useCallback } from "react";
import {
    Search,
    Plus,
    Award,
    X,
    Loader2,
    ExternalLink,
    FileDown,
    Copy,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Users,
    BookOpen,
    CheckCircle2,
    AlertTriangle,
    RotateCw,
} from "lucide-react";
import toast from "react-hot-toast";

import certificateService from "@/services/certificateService";
import courseService from "@/services/courseService";
import authService from "@/services/authService";
import enrollmentService from "@/services/enrollmentService";
import SearchPicker from "@/components/admin/SearchPicker";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";

const PER_PAGE = 10;

const inputCls =
    "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13.5px] text-slate-800 outline-none focus:border-[#3282B8] focus:bg-white transition-colors";

const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const todayIso = () => new Date().toISOString().slice(0, 10);
// Date columns come back as ISO strings at UTC midnight → 'YYYY-MM-DD'
const dayIso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const fmtDay = (d) =>
    d
        ? new Date(d).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
          })
        : "—";

/** Same checks as the server: start ≤ end ≤ issue date ≤ today. */
const datesError = ({ trainingStart, trainingEnd, issueDate }) => {
    const today = todayIso();
    if (!trainingStart || !trainingEnd) return "Enter the training start and end dates";
    if (trainingStart > trainingEnd) return "Training start must be on or before the end date";
    if (trainingEnd > today) return "Training end date can't be in the future";
    if (issueDate && issueDate > today) return "Issue date can't be in the future";
    if (issueDate && issueDate < trainingEnd) return "Issue date can't be before the training ended";
    return null;
};

/** Training start / end + issue date, shared by Issue and Regenerate. */
function CertificateDates({ value, onChange }) {
    const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
    const today = todayIso();
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
                <span className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">
                    Training start
                </span>
                <input
                    type="date"
                    value={value.trainingStart}
                    max={value.trainingEnd || today}
                    onChange={set("trainingStart")}
                    className={inputCls}
                />
            </label>
            <label className="block">
                <span className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">Training end</span>
                <input
                    type="date"
                    value={value.trainingEnd}
                    min={value.trainingStart || undefined}
                    max={today}
                    onChange={set("trainingEnd")}
                    className={inputCls}
                />
            </label>
            <label className="block">
                <span className="block text-[12.5px] font-semibold text-slate-700 mb-1.5">Issue date</span>
                <input
                    type="date"
                    value={value.issueDate}
                    min={value.trainingEnd || undefined}
                    max={today}
                    onChange={set("issueDate")}
                    className={inputCls}
                />
            </label>
            <p className="sm:col-span-3 -mt-1 text-[11.5px] text-slate-500">
                Printed on the certificate as “Training period: start – end”.
            </p>
        </div>
    );
}

const copy = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        toast.success("Link copied");
    } catch {
        toast.error("Could not copy the link");
    }
};

export default function CertificatesPage() {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [page, setPage] = useState(1);
    const [issueOpen, setIssueOpen] = useState(false);
    const [revokeTarget, setRevokeTarget] = useState(null);
    const [regenTarget, setRegenTarget] = useState(null);
    const [revoking, setRevoking] = useState(false);
    const search = useDebounce(searchInput.trim(), 300);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await certificateService.getAllAdmin({
                page,
                limit: PER_PAGE,
                search: search || undefined,
            });
            setRows(data?.data ?? []);
            setTotal(data?.pagination?.total ?? 0);
        } catch {
            toast.error("Could not load certificates");
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        load();
    }, [load]);

    const handleRevoke = async () => {
        setRevoking(true);
        try {
            const { data } = await certificateService.revoke(revokeTarget.id);
            toast.success(data?.message || "Certificate revoked");
            setRevokeTarget(null);
            load();
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not revoke the certificate");
        } finally {
            setRevoking(false);
        }
    };

    const totalPages = Math.ceil(total / PER_PAGE);

    return (
        <div className="space-y-5 px-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-[24px] font-extrabold text-slate-900 tracking-tight">Certificates</h1>
                    <p className="text-[13.5px] text-slate-500 mt-0.5">
                        Certificates are issued automatically when a student completes a course. You can also
                        issue one yourself.
                    </p>
                </div>
                <button
                    onClick={() => setIssueOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#3282B8] hover:bg-[#2a6fa0] shrink-0"
                >
                    <Plus size={15} /> Issue certificate
                </button>
            </div>

            <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => {
                        setSearchInput(e.target.value);
                        setPage(1);
                    }}
                    placeholder="Search by student, email, course or certificate number…"
                    className={cn(inputCls, "pl-10 bg-white")}
                />
            </div>

            <div
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
                style={{ boxShadow: "0 1px 8px rgba(15,23,42,0.05)" }}
            >
                {loading && rows.length === 0 ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-[#3282B8]" />
                    </div>
                ) : rows.length === 0 ? (
                    <div className="text-center py-16">
                        <Award className="mx-auto text-slate-300 mb-3" size={40} />
                        <p className="text-[15px] font-semibold text-slate-800">No certificates found</p>
                        <p className="text-[13px] text-slate-500 mt-1">
                            {search ? "Try a different search." : "Issued certificates will appear here."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px]">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    {[
                                        "Student",
                                        "Course",
                                        "Certificate no.",
                                        "Training period",
                                        "Issued",
                                        "",
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-600"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-semibold text-slate-900">
                                                {c.student_name}
                                            </p>
                                            <p className="text-xs text-slate-500">{c.student_email}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-800 max-w-[260px]">
                                            <p className="truncate">{c.course_title}</p>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-[12.5px] text-slate-700 whitespace-nowrap">
                                            {c.certificate_no}
                                        </td>
                                        <td className="px-4 py-3 text-[12.5px] text-slate-600 whitespace-nowrap">
                                            {c.training_start
                                                ? `${fmtDay(c.training_start)} – ${fmtDay(c.training_end)}`
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                                            {fmtDate(c.issued_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <a
                                                    href={`/verify/${encodeURIComponent(c.certificate_no)}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    title="Open verification page"
                                                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => copy(c.verify_url)}
                                                    title="Copy verification link"
                                                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                                {c.pdf_url && (
                                                    <a
                                                        href={c.pdf_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        title="Download PDF"
                                                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                                                    >
                                                        <FileDown size={14} />
                                                    </a>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setRegenTarget(c)}
                                                    title="Regenerate with corrected dates"
                                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-[#3282B8] hover:bg-[#EBF4FF]"
                                                >
                                                    <RotateCw size={13} /> Regenerate
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRevokeTarget(c)}
                                                    title="Revoke certificate"
                                                    className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                        <p className="text-sm text-slate-600">
                            {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(page - 1)}
                                disabled={page === 1}
                                aria-label="Previous page"
                                className="p-2 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-50"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm text-slate-600">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={page === totalPages}
                                aria-label="Next page"
                                className="p-2 rounded-lg border border-slate-200 text-slate-500 disabled:opacity-50"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {issueOpen && (
                <IssueCertificateModal
                    onClose={() => setIssueOpen(false)}
                    onIssued={() => {
                        setIssueOpen(false);
                        setPage(1);
                        load();
                    }}
                />
            )}

            {regenTarget && (
                <RegenerateModal
                    cert={regenTarget}
                    onClose={() => setRegenTarget(null)}
                    onDone={() => {
                        setRegenTarget(null);
                        load();
                    }}
                />
            )}

            {revokeTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
                        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={24} className="text-red-500" />
                        </div>
                        <h3 className="text-[17px] font-extrabold text-slate-900 mb-2">
                            Revoke this certificate?
                        </h3>
                        <p className="text-[13px] text-slate-500 mb-5">
                            {revokeTarget.student_name} · {revokeTarget.course_title}. Number{" "}
                            <span className="font-mono">{revokeTarget.certificate_no}</span> will no longer
                            verify. This can&apos;t be undone (you can issue a new one later).
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setRevokeTarget(null)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRevoke}
                                disabled={revoking}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60"
                            >
                                {revoking ? <Loader2 size={15} className="animate-spin" /> : "Revoke"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Issue: search a student and a course ─────────────────────────────────────

function IssueCertificateModal({ onClose, onIssued }) {
    const [student, setStudent] = useState(null);
    const [course, setCourse] = useState(null);
    const [dates, setDates] = useState({ trainingStart: "", trainingEnd: todayIso(), issueDate: todayIso() });
    const [enrollments, setEnrollments] = useState(null); // the student's courses
    const [busy, setBusy] = useState(false);
    // Set after the server says this student already has one for the course
    const [exists, setExists] = useState(null);
    const [replace, setReplace] = useState(false);

    const loadStudents = useCallback(async (search) => {
        const { data } = await authService.getAllUsers({
            role: "student",
            search: search || undefined,
            limit: 30,
        });
        return data?.data ?? [];
    }, []);

    const loadCourses = useCallback(async (search) => {
        const { data } = await courseService.getAll({ search: search || undefined, limit: 30 });
        return (data?.data ?? []).filter(
            (c) => c.certificate_eligible !== 0 && c.certificate_eligible !== false
        );
    }, []);

    const chooseStudent = (s) => {
        setStudent(s);
        setEnrollments(null);
        enrollmentService
            .getUserEnrollments(s.id)
            .then(({ data }) => setEnrollments(data?.data?.enrollments ?? []))
            .catch(() => setEnrollments([]));
    };

    const enrollment = course && enrollments ? enrollments.find((e) => e.course_id === course.id) : null;
    const startFromEnrollment = enrollment?.enrolled_at ? dayIso(enrollment.enrolled_at) : "";

    // Default the training start to the day they enrolled (still editable)
    useEffect(() => {
        if (startFromEnrollment)
            setDates((d) => (d.trainingStart ? d : { ...d, trainingStart: startFromEnrollment }));
    }, [startFromEnrollment]);

    const resetExists = () => {
        setExists(null);
        setReplace(false);
    };

    const submit = async () => {
        if (!student || !course) return toast.error("Choose a student and a course");
        const problem = datesError(dates);
        if (problem) return toast.error(problem);
        setBusy(true);
        try {
            const { data } = await certificateService.issue({
                user_id: student.id,
                course_id: course.id,
                issue_date: dates.issueDate,
                training_start: dates.trainingStart,
                training_end: dates.trainingEnd,
                replace: replace || undefined,
            });
            const no = data?.data?.certificate?.certificate_no;
            toast.success(
                replace
                    ? `Certificate ${no ?? ""} replaced for ${student.name}`
                    : `Certificate issued to ${student.name}`
            );
            onIssued();
        } catch (err) {
            const message = err.response?.data?.message || "Could not issue the certificate";
            if (err.response?.status === 409) setExists(message);
            else toast.error(message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-[17px] font-extrabold text-slate-900 flex items-center gap-2">
                        <Award size={18} className="text-[#3282B8]" /> Issue certificate
                    </h3>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">Student</label>
                        {student ? (
                            <Chosen
                                title={student.name}
                                subtitle={student.email}
                                onClear={() => {
                                    setStudent(null);
                                    setEnrollments(null);
                                    resetExists();
                                }}
                            />
                        ) : (
                            <SearchPicker
                                placeholder="Search student by name or email…"
                                icon={Users}
                                load={loadStudents}
                                onSelect={chooseStudent}
                                emptyText="No students match"
                                renderItem={(s) => (
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-medium text-slate-800 truncate">
                                            {s.name}
                                        </p>
                                        <p className="text-[12px] text-slate-500 truncate">{s.email}</p>
                                    </div>
                                )}
                            />
                        )}
                    </div>

                    <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-2">Course</label>
                        {course ? (
                            <Chosen
                                title={course.title}
                                subtitle={`Course ID ${course.id}`}
                                onClear={() => {
                                    setCourse(null);
                                    resetExists();
                                }}
                            />
                        ) : (
                            <SearchPicker
                                placeholder="Search courses by title…"
                                icon={BookOpen}
                                load={loadCourses}
                                onSelect={setCourse}
                                emptyText="No courses with a certificate match"
                                renderItem={(c) => (
                                    <p className="text-[13px] font-medium text-slate-800 truncate">
                                        {c.title}
                                    </p>
                                )}
                            />
                        )}
                        {student && course && enrollments && (
                            <p
                                className={cn(
                                    "mt-2 text-[12px] flex items-center gap-1.5",
                                    enrollment ? "text-green-700" : "text-amber-700"
                                )}
                            >
                                {enrollment ? (
                                    <>
                                        <CheckCircle2 size={13} /> Enrolled · {enrollment.progress ?? 0}%
                                        complete
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle size={13} /> Not enrolled in this course — the
                                        certificate will still be issued
                                    </>
                                )}
                            </p>
                        )}
                    </div>

                    <CertificateDates value={dates} onChange={setDates} />

                    {exists && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[12.5px] text-amber-900 space-y-2">
                            <p className="flex items-start gap-2">
                                <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {exists}
                            </p>
                            <label className="flex items-center gap-2 font-semibold cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={replace}
                                    onChange={(e) => setReplace(e.target.checked)}
                                    className="w-4 h-4 accent-[#3282B8]"
                                />
                                Replace existing certificate (same number, new dates and PDF)
                            </label>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={submit}
                        disabled={busy || !student || !course || (exists && !replace)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#3282B8] hover:bg-[#2a6fa0] disabled:opacity-50"
                    >
                        {busy ? <Loader2 size={15} className="animate-spin" /> : <Award size={15} />}
                        {replace ? "Replace certificate" : "Issue certificate"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Regenerate: correct the dates, overwrite the PDF (number unchanged) ──────

function RegenerateModal({ cert, onClose, onDone }) {
    const [dates, setDates] = useState({
        trainingStart: dayIso(cert.training_start),
        trainingEnd: dayIso(cert.training_end) || todayIso(),
        issueDate: dayIso(cert.issued_at) || todayIso(),
    });
    const [busy, setBusy] = useState(false);

    const save = async () => {
        const problem = datesError(dates);
        if (problem) return toast.error(problem);
        setBusy(true);
        try {
            const { data } = await certificateService.regenerate(cert.id, {
                training_start: dates.trainingStart,
                training_end: dates.trainingEnd,
                issue_date: dates.issueDate,
            });
            toast.success(data?.message || "Certificate regenerated");
            onDone();
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not regenerate the certificate");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-[17px] font-extrabold text-slate-900 flex items-center gap-2">
                        <RotateCw size={17} className="text-[#3282B8]" /> Regenerate certificate
                    </h3>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-[13px]">
                        <p className="font-semibold text-slate-900">{cert.student_name}</p>
                        <p className="text-slate-600">{cert.course_title}</p>
                        <p className="text-slate-500 font-mono text-[12px] mt-1">{cert.certificate_no}</p>
                    </div>
                    <CertificateDates value={dates} onChange={setDates} />
                    <p className="text-[12px] text-slate-500">
                        The old PDF is replaced. The certificate number and verification link stay the same,
                        so links already shared keep working.
                    </p>
                </div>
                <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={save}
                        disabled={busy}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#3282B8] hover:bg-[#2a6fa0] disabled:opacity-50"
                    >
                        {busy ? <Loader2 size={15} className="animate-spin" /> : <RotateCw size={15} />}
                        Regenerate
                    </button>
                </div>
            </div>
        </div>
    );
}

function Chosen({ title, subtitle, onClear }) {
    return (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">{title}</p>
                <p className="text-slate-500 text-xs truncate">{subtitle}</p>
            </div>
            <button
                type="button"
                onClick={onClear}
                aria-label="Change"
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
                <X size={16} />
            </button>
        </div>
    );
}
