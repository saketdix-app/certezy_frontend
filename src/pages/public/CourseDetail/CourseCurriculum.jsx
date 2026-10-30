import { useState, useEffect } from "react";
import {
    ChevronDown,
    ChevronUp,
    PlayCircle,
    FileText,
    FileDown,
    HelpCircle,
    Lock,
    Eye,
    Link2,
    MonitorPlay,
    Headphones,
} from "lucide-react";
import lessonService from "@/services/lessonService";
import { cn } from "@/lib/utils";
import LessonPreviewModal from "./LessonPreviewModal";
import { formatDuration } from "@/lib/format"; // seconds → "1h 30m"

/**
 * CourseCurriculum.jsx
 * Accordion — sections + lazy-loaded lessons per section
 */

// ── Lesson type icon ───────────────────────────────────────
function LessonIcon({ type, isLocked }) {
    if (isLocked) return <Lock size={13} style={{ color: "#CBD5E1", flexShrink: 0 }} />;
    const map = {
        video: <PlayCircle size={13} style={{ color: "#2563EB", flexShrink: 0 }} />,
        article: <FileText size={13} style={{ color: "#10B981", flexShrink: 0 }} />,
        text: <FileText size={13} style={{ color: "#10B981", flexShrink: 0 }} />,
        pdf: <FileDown size={13} style={{ color: "#DC2626", flexShrink: 0 }} />,
        quiz: <HelpCircle size={13} style={{ color: "#F59E0B", flexShrink: 0 }} />,
        link: <Link2 size={13} style={{ color: "#0EA5E9", flexShrink: 0 }} />,
        embed: <MonitorPlay size={13} style={{ color: "#14B8A6", flexShrink: 0 }} />,
        audio: <Headphones size={13} style={{ color: "#A855F7", flexShrink: 0 }} />,
    };
    return map[type] || map.video;
}

// ── Single lesson row ──────────────────────────────────────
function LessonRow({ lesson, isEnrolled, onPreview }) {
    const isLocked = !lesson.is_free && !isEnrolled;
    const duration = formatDuration(lesson.duration);
    // Visitors can open free lessons right here; enrolled students use the player
    const canPreview = lesson.is_free === 1 && !isEnrolled && onPreview;

    return (
        <div
            {...(canPreview && {
                role: "button",
                tabIndex: 0,
                onClick: () => onPreview(lesson),
                onKeyDown: (e) =>
                    (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPreview(lesson)),
                "aria-label": `Preview lesson: ${lesson.title}`,
            })}
            className={cn(
                "flex items-center gap-3 px-5 py-3",
                "border-b last:border-0",
                !isLocked && "cursor-pointer group transition-colors duration-150 hover:bg-[#F8FAFF]"
            )}
            style={{ borderColor: "#F1F5F9" }}
        >
            <LessonIcon type={lesson.type} isLocked={isLocked} />

            <span
                className={cn(
                    "flex-1 leading-snug",
                    !isLocked && "group-hover:text-primary transition-colors duration-150"
                )}
                style={{
                    fontSize: "13px",
                    fontWeight: isLocked ? 400 : 500,
                    color: isLocked ? "#94A3B8" : "#0F172A",
                }}
            >
                {lesson.title}
            </span>

            {/* Free preview badge */}
            {lesson.is_free === 1 && !isEnrolled && (
                <span
                    className="flex items-center gap-1 shrink-0"
                    style={{
                        fontSize: "10.5px",
                        fontWeight: 600,
                        color: "#2563EB",
                        background: "#EFF6FF",
                        padding: "2px 8px",
                        borderRadius: "20px",
                        border: "1px solid #BFDBFE",
                    }}
                >
                    <Eye size={10} /> Preview
                </span>
            )}

            {/* Duration */}
            {duration && (
                <span style={{ fontSize: "11.5px", color: "#94A3B8", flexShrink: 0 }}>{duration}</span>
            )}
        </div>
    );
}

// ── Single section ─────────────────────────────────────────
function SectionRow({ section, index, isEnrolled, onPreview, expandAll }) {
    const [open, setOpen] = useState(index === 0);

    // "Expand all / Collapse all" overrides each section's own toggle
    useEffect(() => {
        if (expandAll !== null) setOpen(expandAll);
    }, [expandAll]);
    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || lessons.length > 0) return;
        const fetch = async () => {
            try {
                setLoading(true);
                const { data } = await lessonService.getBySectionId(section.id);
                setLessons(data.data.lessons);
            } catch {
                // silent
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [open]);

    const totalDuration = lessons.reduce((s, l) => s + (l.duration || 0), 0);
    const duration = formatDuration(totalDuration);

    return (
        <div
            className="rounded-xl overflow-hidden transition-all duration-200"
            style={{
                border: open ? "1px solid #BFDBFE" : "1px solid #EEF2F7",
            }}
        >
            {/* Section header */}
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors duration-150"
                style={{ background: open ? "#EFF6FF" : "#F8FAFC" }}
                onMouseEnter={(e) => {
                    if (!open) e.currentTarget.style.background = "#F1F5F9";
                }}
                onMouseLeave={(e) => {
                    if (!open) e.currentTarget.style.background = "#F8FAFC";
                }}
            >
                {/* Section number */}
                <span
                    style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        color: open ? "#2563EB" : "#94A3B8",
                        width: "24px",
                        flexShrink: 0,
                        letterSpacing: "0.02em",
                    }}
                >
                    {String(index + 1).padStart(2, "0")}
                </span>

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                    <p
                        style={{
                            fontSize: "13.5px",
                            fontWeight: 700,
                            color: open ? "#1D4ED8" : "#0F172A",
                            lineHeight: 1.3,
                        }}
                        className="truncate"
                    >
                        {section.title}
                    </p>
                    {(lessons.length > 0 || loading) && (
                        <p style={{ fontSize: "11.5px", color: "#94A3B8", marginTop: "3px" }}>
                            {loading
                                ? "Loading..."
                                : `${lessons.length} lesson${lessons.length !== 1 ? "s" : ""}${duration ? ` · ${duration}` : ""}`}
                        </p>
                    )}
                </div>

                {/* Chevron */}
                {open ? (
                    <ChevronUp size={15} style={{ color: "#2563EB", flexShrink: 0 }} />
                ) : (
                    <ChevronDown size={15} style={{ color: "#94A3B8", flexShrink: 0 }} />
                )}
            </button>

            {/* Lessons list */}
            {open && (
                <div style={{ background: "#fff" }}>
                    {loading ? (
                        // Skeleton
                        <div className="px-5 py-4 space-y-3">
                            {Array(3)
                                .fill(0)
                                .map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 animate-pulse">
                                        <div className="w-3.5 h-3.5 rounded-full bg-[#F1F5F9] shrink-0" />
                                        <div className="h-3 bg-[#F1F5F9] rounded-full flex-1" />
                                        <div className="h-3 bg-[#F1F5F9] rounded-full w-10 shrink-0" />
                                    </div>
                                ))}
                        </div>
                    ) : lessons.length > 0 ? (
                        lessons.map((lesson) => (
                            <LessonRow
                                key={lesson.id}
                                lesson={lesson}
                                isEnrolled={isEnrolled}
                                onPreview={onPreview}
                            />
                        ))
                    ) : (
                        <p
                            style={{
                                padding: "16px 20px",
                                fontSize: "13px",
                                color: "#94A3B8",
                                fontStyle: "italic",
                            }}
                        >
                            No lessons yet
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main export ────────────────────────────────────────────
export default function CourseCurriculum({
    sections = [],
    courseId,
    isEnrolled = false,
    totalLessons,
    totalDuration,
}) {
    const [previewing, setPreviewing] = useState(null);
    const [expandAll, setExpandAll] = useState(null); // null = each section decides

    if (sections.length === 0) {
        return (
            <p style={{ fontSize: "13px", color: "#94A3B8", fontStyle: "italic", padding: "8px 0" }}>
                Curriculum not available yet.
            </p>
        );
    }

    const length = formatDuration(totalDuration);

    return (
        <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <p className="text-[13px] text-slate-500">
                    {sections.length} sections
                    {totalLessons > 0 && ` • ${totalLessons} lessons`}
                    {length && ` • ${length} total length`}
                </p>
                <button
                    type="button"
                    onClick={() => setExpandAll((v) => !v)}
                    className="text-[13px] font-bold text-primary hover:underline"
                >
                    {expandAll ? "Collapse all sections" : "Expand all sections"}
                </button>
            </div>
            {sections.map((section, index) => (
                <SectionRow
                    key={section.id}
                    section={section}
                    index={index}
                    isEnrolled={isEnrolled}
                    onPreview={courseId ? setPreviewing : null}
                    expandAll={expandAll}
                />
            ))}
            {previewing && (
                <LessonPreviewModal
                    lesson={previewing}
                    courseId={courseId}
                    onClose={() => setPreviewing(null)}
                />
            )}
        </div>
    );
}
