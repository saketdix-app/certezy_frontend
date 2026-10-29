import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Clock, BarChart2, BookOpen, Award, Globe, PlayCircle, CheckCircle, Loader2 } from "lucide-react";
import { selectIsLoggedIn } from "@/features/auth/authSlice";
import CourseThumbnail from "@/components/shared/CourseThumbnail";
import PriceTag from "@/components/shared/PriceTag";
import { formatDuration as fmtSeconds, getPricing } from "@/lib/format";

/**
 * CourseEnrollCard.jsx
 *
 * Desktop → sticky right sidebar
 * Mobile  → full width below content
 * Both handled by parent (CourseDetailIndex)
 */

const formatDuration = (seconds) => fmtSeconds(seconds) || "Self-paced";

// Single reusable enroll button — color always #3282B8
function EnrollButton({ onClick, href, children, disabled = false }) {
    const style = {
        width: "100%",
        height: "44px",
        background: "#3282B8",
        color: "#fff",
        border: "none",
        borderRadius: "12px",
        fontSize: "14px",
        fontWeight: 700,
        cursor: "pointer",
        transition: "background 0.15s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        boxShadow: "0 2px 8px rgba(50,130,184,0.30)",
        textDecoration: "none",
    };

    if (href) {
        return (
            <Link
                to={href}
                style={style}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#2a6fa0")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#3282B8")}
            >
                {children}
            </Link>
        );
    }

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{ ...style, opacity: disabled ? 0.7 : 1, cursor: disabled ? "wait" : "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#2a6fa0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#3282B8")}
        >
            {children}
        </button>
    );
}

export default function CourseEnrollCard({ course, isEnrolled = false, onEnroll, enrolling = false }) {
    const isLoggedIn = useSelector(selectIsLoggedIn);
    if (!course) return null;

    const pricing = getPricing(course);
    const { thumbnail, level, language, total_duration, total_lessons, certificate_eligible, preview_video } =
        course;

    const META = [
        { icon: Clock, label: "Duration", value: formatDuration(total_duration) },
        {
            icon: BarChart2,
            label: "Level",
            value: level ? level.charAt(0).toUpperCase() + level.slice(1) : "All levels",
        },
        ...(total_lessons > 0
            ? [{ icon: BookOpen, label: "Lessons", value: `${total_lessons} lessons` }]
            : []),
        { icon: Globe, label: "Language", value: language || "English" },
        ...(certificate_eligible === 1 ? [{ icon: Award, label: "Certificate", value: "Included" }] : []),
    ];

    return (
        <div
            className="bg-white rounded-2xl overflow-hidden lg:sticky lg:top-[86px]"
            style={{ border: "1px solid #EEF2F7", boxShadow: "0 4px 24px rgba(15,23,42,0.08)" }}
        >
            {/* Thumbnail — 16:9, same crop as course cards */}
            <CourseThumbnail
                src={thumbnail}
                title={course.title}
                category={course.category_name}
                categorySlug={course.category_slug}
                loading="eager"
            >
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                {preview_video && (
                    <a
                        href={preview_video}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Watch course preview"
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <span className="w-12 h-12 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm transition-transform hover:scale-105">
                            <PlayCircle size={28} className="text-white" />
                        </span>
                    </a>
                )}
            </CourseThumbnail>

            {/* Body */}
            <div className="p-5">
                {/* Price */}
                <div className="mb-5">
                    <PriceTag course={course} size="lg" />
                </div>

                {/* CTA */}
                {isEnrolled ? (
                    <EnrollButton href={`/student/course/${course.id}/learn`}>
                        <PlayCircle size={16} />
                        Continue Learning
                    </EnrollButton>
                ) : (
                    <EnrollButton onClick={onEnroll} disabled={enrolling}>
                        {enrolling && <Loader2 size={16} className="animate-spin" />}
                        {!isLoggedIn
                            ? pricing.isFree
                                ? "Login to Enroll for Free"
                                : "Login to Enroll"
                            : pricing.isFree
                              ? "Enroll for Free"
                              : "Enroll Now"}
                    </EnrollButton>
                )}

                {/* Guarantee (paid courses only) */}
                {!pricing.isFree && (
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                        <CheckCircle size={12} style={{ color: "#10B981" }} />
                        <p style={{ fontSize: "11.5px", color: "#64748B" }}>30-day money-back guarantee</p>
                    </div>
                )}

                {/* Divider */}
                <div className="my-4" style={{ height: "1px", background: "#F1F5F9" }} />

                {/* Meta list */}
                <div className="space-y-3">
                    {META.map((item) => (
                        <div key={item.label} className="flex items-center gap-3">
                            <item.icon size={14} style={{ color: "#3282B8", flexShrink: 0 }} />
                            <span style={{ fontSize: "12.5px", color: "#64748B", flex: 1 }}>
                                {item.label}
                            </span>
                            <span style={{ fontSize: "12.5px", fontWeight: 600, color: "#0F172A" }}>
                                {item.value}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Certificate badge */}
                {certificate_eligible === 1 && (
                    <>
                        <div className="my-4" style={{ height: "1px", background: "#F1F5F9" }} />
                        <div
                            className="flex items-center gap-2.5 rounded-xl px-3.5 py-3"
                            style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
                        >
                            <Award size={15} style={{ color: "#3282B8", flexShrink: 0 }} />
                            <p style={{ fontSize: "12.5px", fontWeight: 600, color: "#1D4ED8" }}>
                                Certificate of completion included
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
