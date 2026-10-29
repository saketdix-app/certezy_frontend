// src/pages/admin/ReviewsManagementPage.jsx
//
// Admin → Reviews
//   - Moderate student reviews written on the site (approve / reject / delete)
//   - Add genuine reviews collected elsewhere (classroom batches, corporate
//     training, other platforms, feedback forms). They are shown publicly with
//     their source and count toward the course rating like any other review.
//   - Bulk-add many at once from Admin → Bulk Import → Reviews.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    Search,
    CheckCircle,
    XCircle,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Star,
    BookOpen,
    Calendar,
    Plus,
    Pencil,
    X,
    Loader2,
    FileUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import reviewService from "@/services/reviewService";
import courseService from "@/services/courseService";
import StarRating, { RatingInput } from "@/components/shared/StarRating";
import { REVIEW_SOURCES, ADMIN_REVIEW_SOURCES } from "@/lib/reviewSources";
import { useDebounce } from "@/hooks/useDebounce";

const PER_PAGE = 10;
const STATUS_OPTIONS = [
    { value: "", label: "All statuses" },
    { value: "1", label: "Approved" },
    { value: "0", label: "Pending" },
];
const SOURCE_OPTIONS = [
    { value: "", label: "All sources" },
    { value: "platform", label: "Written on site" },
    { value: "admin", label: "Added by admin" },
];

const fieldCls =
    "w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-[13.5px] text-slate-700 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all";

const apiError = (err, fallback) =>
    err.response?.data?.errors?.[0] || err.response?.data?.message || err.message || fallback;

export default function ReviewsManagementPage() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 350);
    const [status, setStatus] = useState("");
    const [source, setSource] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
    const [editing, setEditing] = useState(null); // null | {} (new) | review
    const [courses, setCourses] = useState([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await reviewService.getAllReviews({
                page,
                limit: PER_PAGE,
                ...(status && { is_approved: status }),
                ...(source && { source }),
                ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
            });
            setReviews(Array.isArray(data?.data) ? data.data : []);
            setPagination({
                total: data?.pagination?.total || 0,
                totalPages: data?.pagination?.totalPages || 1,
            });
        } catch (err) {
            toast.error(apiError(err, "Failed to load reviews"));
        } finally {
            setLoading(false);
        }
    }, [page, status, source, debouncedSearch]);

    useEffect(() => {
        load();
    }, [load]);

    // Reset to page 1 whenever a filter changes
    useEffect(() => {
        setPage(1);
    }, [status, source, debouncedSearch]);

    // Courses for the "Add review" form (published + drafts)
    useEffect(() => {
        Promise.all(
            ["published", "draft"].map((st) =>
                courseService
                    .getAll({ status: st, limit: 100, sortBy: "title", sortOrder: "ASC" })
                    .then(({ data }) => data?.data || [])
                    .catch(() => [])
            )
        ).then(([pub, draft]) => setCourses([...pub, ...draft]));
    }, []);

    const setApproval = async (review, is_approved) => {
        try {
            await reviewService.updateReviewApproval(review.id, { is_approved });
            toast.success(is_approved ? "Review approved" : "Review hidden");
            load();
        } catch (err) {
            toast.error(apiError(err, "Could not update review"));
        }
    };

    const remove = async (review) => {
        if (!window.confirm(`Delete the review by ${review.student_name}? This cannot be undone.`)) return;
        try {
            await reviewService.deleteReview(review.id);
            toast.success("Review deleted");
            load();
        } catch (err) {
            toast.error(apiError(err, "Could not delete review"));
        }
    };

    const from = pagination.total ? (page - 1) * PER_PAGE + 1 : 0;
    const to = Math.min(page * PER_PAGE, pagination.total);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <h1 className="text-[20px] sm:text-[22px] font-extrabold text-slate-900">Reviews</h1>
                    <p className="text-[13px] text-slate-500 mt-1">
                        Moderate student reviews and add genuine reviews collected from classroom batches,
                        corporate training or other platforms.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link
                        to="/admin/import"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 hover:border-primary hover:text-primary"
                    >
                        <FileUp size={15} /> Import CSV
                    </Link>
                    <button
                        type="button"
                        onClick={() => setEditing({})}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-hover"
                    >
                        <Plus size={15} /> Add review
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="search"
                        placeholder="Search reviewer, course or comment…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={cn(fieldCls, "pl-9")}
                    />
                </div>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={cn(fieldCls, "md:w-44")}
                >
                    {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
                <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className={cn(fieldCls, "md:w-48")}
                >
                    {SOURCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-7 h-7 text-primary animate-spin" />
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-16 px-4">
                        <div className="w-14 h-14 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-3">
                            <Star className="text-primary" size={22} />
                        </div>
                        <p className="text-[15px] font-semibold text-slate-800">No reviews found</p>
                        <p className="text-[13px] text-slate-500 mt-1">
                            {search || status || source
                                ? "Try different filters."
                                : "Student reviews appear here. You can also add reviews you've collected."}
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {reviews.map((r) => (
                            <ReviewRow
                                key={r.id}
                                review={r}
                                onApprove={() => setApproval(r, 1)}
                                onHide={() => setApproval(r, 0)}
                                onEdit={() => setEditing(r)}
                                onDelete={() => remove(r)}
                            />
                        ))}
                    </ul>
                )}
            </div>

            {/* Pagination */}
            {!loading && pagination.total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-[13px] text-slate-500">
                        Showing {from}–{to} of {pagination.total}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPage((p) => p - 1)}
                            disabled={page <= 1}
                            aria-label="Previous page"
                            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-[13px] font-semibold text-slate-700">
                            Page {page} of {pagination.totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={page >= pagination.totalPages}
                            aria-label="Next page"
                            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {editing && (
                <ReviewFormModal
                    review={editing}
                    courses={courses}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        load();
                    }}
                />
            )}
        </div>
    );
}

// ─── One review ──────────────────────────────────────────────────────────────
function ReviewRow({ review: r, onApprove, onHide, onEdit, onDelete }) {
    const isAdminEntered = r.source && r.source !== "platform";
    const src = REVIEW_SOURCES[r.source] || REVIEW_SOURCES.platform;

    return (
        <li className="p-4 sm:px-5 flex flex-col lg:flex-row lg:items-start gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary-light text-primary text-[12px] font-bold flex items-center justify-center shrink-0">
                    {(r.student_name || "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="text-[14px] font-semibold text-slate-800">{r.student_name}</span>
                        <StarRating value={r.rating} size={12} />
                        <span
                            className={cn(
                                "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                                r.is_approved
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700"
                            )}
                        >
                            {r.is_approved ? "Approved" : "Pending"}
                        </span>
                        <span
                            className={cn(
                                "text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                                src.cls
                            )}
                        >
                            {isAdminEntered ? src.label : "Written on site"}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[12px] text-slate-500">
                        <span className="inline-flex items-center gap-1 min-w-0">
                            <BookOpen size={12} className="shrink-0" />
                            <span className="truncate max-w-[260px]">{r.course_title}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Calendar size={12} /> {formatDate(r.review_date || r.created_at)}
                        </span>
                        {isAdminEntered && r.source_note && (
                            <span className="truncate">· {r.source_note}</span>
                        )}
                        {isAdminEntered && r.created_by_name && <span>· added by {r.created_by_name}</span>}
                    </div>
                    {r.comment && (
                        <p className="mt-2 text-[13.5px] text-slate-600 leading-relaxed whitespace-pre-line break-words line-clamp-4">
                            {r.comment}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1.5 lg:pt-0.5 pl-12 lg:pl-0 shrink-0">
                {r.is_approved ? (
                    <IconBtn
                        title="Hide (unapprove)"
                        onClick={onHide}
                        className="text-amber-600 bg-amber-50 hover:bg-amber-100"
                    >
                        <XCircle size={15} />
                    </IconBtn>
                ) : (
                    <IconBtn
                        title="Approve"
                        onClick={onApprove}
                        className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100"
                    >
                        <CheckCircle size={15} />
                    </IconBtn>
                )}
                {isAdminEntered && (
                    <IconBtn
                        title="Edit"
                        onClick={onEdit}
                        className="text-primary bg-primary-light hover:bg-blue-100"
                    >
                        <Pencil size={15} />
                    </IconBtn>
                )}
                <IconBtn
                    title="Delete"
                    onClick={onDelete}
                    className="text-rose-600 bg-rose-50 hover:bg-rose-100"
                >
                    <Trash2 size={15} />
                </IconBtn>
            </div>
        </li>
    );
}

function IconBtn({ title, onClick, className, children }) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={onClick}
            className={cn("p-2 rounded-lg transition-colors", className)}
        >
            {children}
        </button>
    );
}

// ─── Add / edit modal ────────────────────────────────────────────────────────
const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

function ReviewFormModal({ review, courses, onClose, onSaved }) {
    const isEdit = !!review.id;
    const [form, setForm] = useState({
        course_id: review.course_id || "",
        reviewer_name: review.reviewer_name || review.student_name || "",
        rating: review.rating || 0,
        comment: review.comment || "",
        source: review.source && review.source !== "platform" ? review.source : "classroom",
        source_note: review.source_note || "",
        reviewed_at: toDateInput(review.reviewed_at),
        is_approved: review.id ? Number(review.is_approved) : 1,
    });
    const [confirmed, setConfirmed] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    // Close on Escape
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const submit = async (e) => {
        e.preventDefault();
        if (!form.course_id) return toast.error("Choose a course");
        if (form.reviewer_name.trim().length < 2) return toast.error("Enter the reviewer's name");
        if (!form.rating) return toast.error("Choose a star rating");
        if (!confirmed) return toast.error("Please confirm this is a genuine review");

        const payload = {
            course_id: Number(form.course_id),
            reviewer_name: form.reviewer_name.trim(),
            rating: form.rating,
            comment: form.comment.trim() || null,
            source: form.source,
            source_note: form.source_note.trim() || null,
            reviewed_at: form.reviewed_at || null,
            is_approved: form.is_approved ? 1 : 0,
        };

        setSaving(true);
        try {
            if (isEdit) await reviewService.updateAdminReview(review.id, payload);
            else await reviewService.createAdminReview({ ...payload, confirm_genuine: true });
            toast.success(isEdit ? "Review updated" : "Review added");
            onSaved();
        } catch (err) {
            toast.error(apiError(err, "Could not save review"));
        } finally {
            setSaving(false);
        }
    };

    const notePlaceholder = {
        classroom: "e.g. PMP weekend batch, Pune — Mar 2025",
        corporate: "e.g. Acme Corp cloud upskilling cohort",
        other_platform: "e.g. Udemy, Google Reviews, Trustpilot",
        feedback_form: "e.g. Post-course feedback form",
    }[form.source];

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-0 sm:p-4">
            <form
                onSubmit={submit}
                role="dialog"
                aria-modal="true"
                aria-labelledby="review-form-title"
                className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl"
            >
                <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h2 id="review-form-title" className="text-[16px] font-extrabold text-slate-900">
                        {isEdit ? "Edit review" : "Add a review"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <p className="text-[12.5px] text-slate-500 -mt-1">
                        For reviews learners gave outside this website. They appear on the course page with
                        their source and count toward its rating.
                    </p>

                    <Field label="Course">
                        <select
                            value={form.course_id}
                            onChange={(e) => set("course_id", e.target.value)}
                            className={fieldCls}
                        >
                            <option value="">Choose a course…</option>
                            {courses.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.title}
                                    {c.status === "draft" ? " (draft)" : ""}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Reviewer name">
                            <input
                                value={form.reviewer_name}
                                onChange={(e) => set("reviewer_name", e.target.value)}
                                maxLength={100}
                                placeholder='e.g. "Priya S."'
                                className={fieldCls}
                            />
                        </Field>
                        <Field label="Review date">
                            <input
                                type="date"
                                value={form.reviewed_at}
                                max={new Date().toISOString().slice(0, 10)}
                                onChange={(e) => set("reviewed_at", e.target.value)}
                                className={fieldCls}
                            />
                        </Field>
                    </div>

                    <div className="py-1">
                        <RatingInput value={form.rating} onChange={(v) => set("rating", v)} size={26} />
                    </div>

                    <Field label="Review (exactly as the learner wrote it)">
                        <textarea
                            rows={4}
                            maxLength={2000}
                            value={form.comment}
                            onChange={(e) => set("comment", e.target.value)}
                            className={cn(fieldCls, "resize-y")}
                        />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Source">
                            <select
                                value={form.source}
                                onChange={(e) => set("source", e.target.value)}
                                className={fieldCls}
                            >
                                {ADMIN_REVIEW_SOURCES.map((s) => (
                                    <option key={s} value={s}>
                                        {REVIEW_SOURCES[s].label}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field
                            label={
                                form.source === "other_platform"
                                    ? "Platform name"
                                    : "Source detail (optional)"
                            }
                        >
                            <input
                                value={form.source_note}
                                onChange={(e) => set("source_note", e.target.value)}
                                maxLength={255}
                                placeholder={notePlaceholder}
                                className={fieldCls}
                            />
                        </Field>
                    </div>

                    <label className="flex items-center gap-2 text-[13px] text-slate-600">
                        <input
                            type="checkbox"
                            checked={!!form.is_approved}
                            onChange={(e) => set("is_approved", e.target.checked ? 1 : 0)}
                            className="w-4 h-4 accent-[#3282B8]"
                        />
                        Show on the course page now
                    </label>

                    {!isEdit && (
                        <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] text-amber-900">
                            <input
                                type="checkbox"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                                className="w-4 h-4 mt-0.5 accent-[#3282B8] shrink-0"
                            />
                            <span>
                                I confirm this is a genuine review given by a real learner, and the rating and
                                words are unchanged.
                            </span>
                        </label>
                    )}
                </div>

                <div className="sticky bottom-0 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-4 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-100"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving || !confirmed}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving && <Loader2 size={14} className="animate-spin" />}
                        {isEdit ? "Save changes" : "Add review"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <label className="block">
            <span className="block text-[12.5px] font-semibold text-slate-600 mb-1.5">{label}</span>
            {children}
        </label>
    );
}
