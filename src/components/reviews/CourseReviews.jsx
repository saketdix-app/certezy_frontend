import { useCallback, useEffect, useState } from "react";
import { Star, Clock, Pencil, Loader2, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import reviewService from "@/services/reviewService";
import StarRating, { RatingInput } from "@/components/shared/StarRating";
import { REVIEW_SOURCES, describeSource } from "@/lib/reviewSources";

/**
 * CourseReviews — the whole "Student Reviews" block of a course page.
 *
 *  - Summary: average (half-star precision), total ratings, 5→1 distribution
 *    bars that double as filters
 *  - Your review: enrolled students rate / edit; a review awaiting approval
 *    is shown to its author with a "pending" note
 *  - List: newest first, paginated with "Show more"
 *
 * Everything comes from one API call (stats are computed server-side over all
 * approved reviews, not just the page that's loaded).
 */

const PAGE_SIZE = 5;

export default function CourseReviews({ courseId, isEnrolled = false, onStatsChange }) {
    const [data, setData] = useState({ rating_avg: 0, rating_count: 0, distribution: {}, reviews: [] });
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [starFilter, setStarFilter] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [myReview, setMyReview] = useState(null);

    const load = useCallback(
        async (nextPage = 1) => {
            if (!courseId) return;
            nextPage === 1 ? setLoading(true) : setLoadingMore(true);
            try {
                const { data: res } = await reviewService.getCourseReviews(courseId, {
                    page: nextPage,
                    limit: PAGE_SIZE,
                    ...(starFilter && { rating: starFilter }),
                });
                const d = res?.data || {};
                setData((prev) => ({
                    ...d,
                    reviews: nextPage === 1 ? d.reviews || [] : [...prev.reviews, ...(d.reviews || [])],
                }));
                setPage(nextPage);
                setHasMore(nextPage < (d.pagination?.totalPages || 1));
                if (nextPage === 1 && !starFilter) onStatsChange?.(d);
            } catch {
                if (nextPage === 1)
                    setData({ rating_avg: 0, rating_count: 0, distribution: {}, reviews: [] });
            } finally {
                setLoading(false);
                setLoadingMore(false);
            }
        },
        [courseId, starFilter, onStatsChange]
    );

    const loadMine = useCallback(async () => {
        if (!courseId || !isEnrolled) return;
        try {
            const { data: res } = await reviewService.getMyReview(courseId);
            setMyReview(res?.data?.review || null);
        } catch {
            setMyReview(null);
        }
    }, [courseId, isEnrolled]);

    useEffect(() => {
        load(1);
    }, [load]);

    useEffect(() => {
        loadMine();
    }, [loadMine]);

    const handleSaved = (review) => {
        setMyReview(review);
        setStarFilter(null);
        load(1);
    };

    return (
        <div className="space-y-6">
            <RatingSummary
                data={data}
                loading={loading}
                activeStar={starFilter}
                onStarClick={(star) => setStarFilter((cur) => (cur === star ? null : star))}
            />

            {isEnrolled && <MyReviewForm courseId={courseId} existing={myReview} onSaved={handleSaved} />}

            {starFilter && (
                <div className="flex items-center gap-2 text-[13px] text-slate-500">
                    Showing {starFilter}-star reviews
                    <button
                        onClick={() => setStarFilter(null)}
                        className="font-semibold text-primary hover:underline"
                    >
                        Show all
                    </button>
                </div>
            )}

            <ReviewList reviews={data.reviews} loading={loading} filtered={!!starFilter} />

            {hasMore && !loading && (
                <div className="text-center">
                    <button
                        onClick={() => load(page + 1)}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-700 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                    >
                        {loadingMore && <Loader2 size={14} className="animate-spin" />}
                        Show more reviews
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Summary ─────────────────────────────────────────────────────────────────
function RatingSummary({ data, loading, activeStar, onStarClick }) {
    const total = Number(data.rating_count || 0);

    if (loading) {
        return <div className="h-[132px] rounded-xl bg-slate-100 animate-pulse" />;
    }

    return (
        <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
            <div className="flex sm:flex-col items-center gap-3 sm:gap-1 sm:w-[150px] shrink-0 sm:text-center">
                <div className="text-[44px] font-extrabold text-slate-900 leading-none tracking-tight">
                    {total ? Number(data.rating_avg).toFixed(1) : "–"}
                </div>
                <div className="flex flex-col sm:items-center gap-1">
                    <StarRating value={data.rating_avg} size={16} />
                    <span className="text-[12.5px] text-slate-500">
                        {total
                            ? `${total.toLocaleString()} rating${total === 1 ? "" : "s"}`
                            : "No ratings yet"}
                    </span>
                </div>
            </div>

            <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                    const count = Number(data.distribution?.[star] || 0);
                    const pct = total ? Math.round((count / total) * 100) : 0;
                    const isActive = activeStar === star;
                    return (
                        <button
                            key={star}
                            type="button"
                            disabled={!count}
                            onClick={() => onStarClick(star)}
                            aria-pressed={isActive}
                            className={cn(
                                "w-full flex items-center gap-3 rounded-lg px-1.5 py-1 transition-colors disabled:cursor-default",
                                count && "hover:bg-slate-50",
                                isActive && "bg-amber-50"
                            )}
                        >
                            <span className="flex items-center gap-1 w-9 shrink-0 text-[12.5px] font-semibold text-slate-600">
                                {star} <Star size={11} className="fill-amber-400 text-amber-400" />
                            </span>
                            <span className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                <span
                                    className="block h-full rounded-full bg-amber-400 transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                />
                            </span>
                            <span className="w-10 shrink-0 text-right text-[12px] text-slate-500">
                                {pct}%
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Your review ─────────────────────────────────────────────────────────────
function MyReviewForm({ courseId, existing, onSaved }) {
    const [editing, setEditing] = useState(false);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setRating(existing?.rating || 0);
        setComment(existing?.comment || "");
    }, [existing]);

    const submit = async (e) => {
        e.preventDefault();
        if (!rating) {
            toast.error("Please choose a star rating");
            return;
        }
        setSaving(true);
        try {
            const payload = { rating, comment: comment.trim() || null };
            const { data } = existing
                ? await reviewService.updateMyReview(courseId, payload)
                : await reviewService.createReview({ course_id: courseId, ...payload });
            toast.success(data?.message || "Thanks for your review!");
            setEditing(false);
            onSaved?.(data?.data?.review);
        } catch (err) {
            toast.error(
                err.response?.data?.errors?.[0] || err.response?.data?.message || "Could not save review"
            );
        } finally {
            setSaving(false);
        }
    };

    // Already reviewed and not editing → compact summary card
    if (existing && !editing) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Your review
                    </p>
                    <StarRating value={existing.rating} size={14} />
                    {existing.comment && (
                        <p className="mt-1.5 text-[13.5px] text-slate-600 line-clamp-2">{existing.comment}</p>
                    )}
                    {!existing.is_approved && (
                        <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                            <Clock size={12} /> Awaiting approval — visible to others once approved
                        </p>
                    )}
                </div>
                <button
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 hover:border-primary hover:text-primary transition-colors"
                >
                    <Pencil size={13} /> Edit
                </button>
            </div>
        );
    }

    if (!existing && !editing) {
        return (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="flex-1 text-[13.5px] text-slate-600">
                    You&apos;re enrolled in this course — how would you rate it?
                </p>
                <button
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-hover transition-colors"
                >
                    <Star size={15} /> Rate this course
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
            <div className="text-center">
                <p className="text-[14px] font-semibold text-slate-800 mb-2">
                    {existing ? "Update your rating" : "Rate this course"}
                </p>
                <RatingInput value={rating} onChange={setRating} disabled={saving} />
            </div>
            <div>
                <label
                    htmlFor="review-comment"
                    className="block text-[13px] font-medium text-slate-600 mb-1.5"
                >
                    Your review <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                    id="review-comment"
                    rows={4}
                    maxLength={1000}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What did you like? What could be better?"
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-[14px] text-slate-700 bg-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
                />
                <p className="text-right text-[11.5px] text-slate-400 mt-1">{comment.length}/1000</p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-100"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saving || !rating}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {existing ? "Save changes" : "Submit review"}
                </button>
            </div>
        </form>
    );
}

// ─── List ────────────────────────────────────────────────────────────────────
function ReviewList({ reviews, loading, filtered }) {
    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2].map((i) => (
                    <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
                ))}
            </div>
        );
    }

    if (!reviews.length) {
        return (
            <div className="text-center py-8">
                <div className="w-14 h-14 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="text-primary" size={22} />
                </div>
                <p className="text-[15px] font-semibold text-slate-800">
                    {filtered ? "No reviews with this rating" : "No written reviews yet"}
                </p>
                {!filtered && (
                    <p className="text-[13px] text-slate-500 mt-1">
                        Enrolled students can be the first to share.
                    </p>
                )}
            </div>
        );
    }

    return (
        <ul className="divide-y divide-slate-100">
            {reviews.map((r) => (
                <li key={r.id} className="py-4 first:pt-0">
                    <div className="flex items-start gap-3">
                        {r.student_avatar ? (
                            <img
                                src={r.student_avatar}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover shrink-0"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-primary-light text-primary text-[13px] font-bold flex items-center justify-center shrink-0">
                                {(r.student_name || "S").slice(0, 2).toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="font-semibold text-[14px] text-slate-800">
                                    {r.student_name || "Student"}
                                </span>
                                <StarRating value={r.rating} size={12} />
                                <span className="text-[12px] text-slate-400">
                                    {formatDate(r.review_date || r.created_at)}
                                </span>
                            </div>
                            <SourceBadge review={r} />
                            {r.comment && (
                                <p className="mt-1.5 text-[14px] text-slate-600 leading-relaxed whitespace-pre-line break-words">
                                    {r.comment}
                                </p>
                            )}
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}

// Shows where a review came from: on-site reviews are "Verified learner";
// reviews entered by the Certezy team carry their source (classroom batch, …)
function SourceBadge({ review }) {
    const src = REVIEW_SOURCES[review.source] || REVIEW_SOURCES.platform;
    return (
        <span
            className={cn(
                "mt-1 inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold truncate",
                src.cls
            )}
            title={
                review.source && review.source !== "platform"
                    ? "Collected by the Certezy team outside this website"
                    : "Written by a learner enrolled on Certezy"
            }
        >
            {describeSource(review)}
        </span>
    );
}
