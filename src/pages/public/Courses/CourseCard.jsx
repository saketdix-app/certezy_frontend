import { Link } from "react-router-dom";
import { Clock, Users, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import CourseThumbnail from "@/components/shared/CourseThumbnail";
import StarRating from "@/components/shared/StarRating";
import PriceTag from "@/components/shared/PriceTag";
import { formatCount, formatDuration, getPricing } from "@/lib/format";

/**
 * CourseCard — used on the catalogue, home page and anywhere a course grid
 * appears. Thumbnails are always 16:9 and cropped to fit, so mixed uploads
 * line up; rating shows half stars; price shows Free / discounted / paid.
 */

const LEVEL_STYLES = {
    beginner: "bg-emerald-50 text-emerald-700 border-emerald-200",
    intermediate: "bg-blue-50 text-blue-700 border-blue-200",
    advanced: "bg-violet-50 text-violet-700 border-violet-200",
};
const LEVEL_DOTS = { beginner: "bg-emerald-500", intermediate: "bg-blue-500", advanced: "bg-violet-500" };

function getCourseBadge({ enrolled_count = 0, created_at }, pricing) {
    if (pricing.isDiscounted && pricing.discountPct >= 10) {
        return { label: `${pricing.discountPct}% off`, style: "bg-rose-500 text-white" };
    }
    if (enrolled_count >= 100) return { label: "Bestseller", style: "bg-amber-400 text-amber-900" };
    if (created_at && (Date.now() - new Date(created_at).getTime()) / 86_400_000 <= 30) {
        return { label: "New", style: "bg-emerald-500 text-white" };
    }
    return null;
}

export default function CourseCard({ course }) {
    const {
        id,
        title = "",
        slug,
        thumbnail,
        level,
        category_name,
        category_slug,
        rating_avg = 0,
        rating_count = 0,
        enrolled_count = 0,
        total_duration = 0,
        certificate_eligible,
        instructor_name,
    } = course;

    const pricing = getPricing(course);
    const duration = formatDuration(total_duration);
    const badge = getCourseBadge(course, pricing);

    return (
        <Link
            to={`/courses/${slug || id}`}
            className="group bg-white rounded-2xl overflow-hidden flex flex-col border border-[#EEF2F7] shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-[3px] hover:border-blue-100 hover:shadow-[0_12px_32px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
            {/* ── Thumbnail (16:9, cropped to fit) ─────────────── */}
            <CourseThumbnail
                src={thumbnail}
                title={title}
                categorySlug={category_slug}
                zoomOnHover
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
                {badge && (
                    <span
                        className={cn(
                            "absolute top-3 left-3 text-[10.5px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full",
                            badge.style
                        )}
                    >
                        {badge.label}
                    </span>
                )}
                {certificate_eligible === 1 && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-semibold text-white px-2 py-0.5 rounded-full bg-[rgba(50,130,184,0.85)] backdrop-blur-sm">
                        <Award size={10} /> Certificate
                    </span>
                )}
                {category_name && (
                    <span className="absolute bottom-3 left-3 max-w-[85%] truncate text-[10.5px] font-bold uppercase tracking-wider text-white px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm">
                        {category_name}
                    </span>
                )}
            </CourseThumbnail>

            {/* ── Content ──────────────────────────────────────── */}
            <div className="p-4 flex flex-col flex-1">
                <h3 className="line-clamp-2 text-[14px] font-bold text-slate-900 leading-snug mb-1.5 group-hover:text-primary transition-colors">
                    {title}
                </h3>

                {instructor_name && (
                    <p className="text-[11.5px] text-slate-400 truncate mb-2.5">{instructor_name}</p>
                )}

                <StarRating value={rating_avg} count={rating_count} size={12} showValue className="mb-3" />

                <div className="flex-1" />

                {LEVEL_STYLES[level] && (
                    <div className="mb-3">
                        <span
                            className={cn(
                                "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border capitalize",
                                LEVEL_STYLES[level]
                            )}
                        >
                            <span className={cn("w-1.5 h-1.5 rounded-full", LEVEL_DOTS[level])} />
                            {level}
                        </span>
                    </div>
                )}

                <div className="h-px bg-slate-100 mb-3" />

                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 text-slate-400 text-[12px] min-w-0">
                        {duration && (
                            <span className="inline-flex items-center gap-1">
                                <Clock size={12} /> {duration}
                            </span>
                        )}
                        {enrolled_count > 0 && (
                            <span className="inline-flex items-center gap-1 truncate">
                                <Users size={12} /> {formatCount(enrolled_count)}
                            </span>
                        )}
                        {!duration && !enrolled_count && <span>Self-paced</span>}
                    </div>
                    <PriceTag course={course} size="sm" className="justify-end text-right" />
                </div>
            </div>
        </Link>
    );
}
