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

// ── Lesson type → icon + label (blue/white chips, one shade per kind) ──
const LESSON_TYPES = {
    video: { icon: PlayCircle, label: "Video", chip: "bg-[#1D4ED8] text-white border-[#1D4ED8]" },
    pdf: { icon: FileDown, label: "PDF", chip: "bg-white text-[#1D4ED8] border-[#93C5FD]" },
    article: { icon: FileText, label: "Reading", chip: "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]" },
    text: { icon: FileText, label: "Reading", chip: "bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]" },
    quiz: { icon: HelpCircle, label: "Quiz", chip: "bg-[#DBEAFE] text-[#1E3A8A] border-[#93C5FD]" },
    link: { icon: Link2, label: "Link", chip: "bg-white text-[#2563EB] border-[#BFDBFE]" },
    embed: { icon: MonitorPlay, label: "Interactive", chip: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]" },
    audio: { icon: Headphones, label: "Audio", chip: "bg-white text-[#1E40AF] border-[#BFDBFE]" },
};
const typeOf = (type) => LESSON_TYPES[type] || LESSON_TYPES.video;

function TypeChip({ type }) {
    const { icon: Icon, label, chip } = typeOf(type);
    return (
        <span
            className={cn(
                "inline-flex items-center justify-center gap-1 w-[92px] shrink-0 rounded-md border px-2 py-1 text-[11px] font-bold uppercase tracking-wide",
                chip
            )}
        >
            <Icon size={12} /> {label}
        </span>
    );
}

// ── Single lesson row ──────────────────────────────────────
function LessonRow({ lesson, index, isEnrolled, onPreview }) {
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
                "flex items-center gap-3 px-4 sm:px-5 py-3 border-t border-[#EEF4FF] first:border-t-0",
                canPreview && "cursor-pointer group transition-colors duration-150 hover:bg-[#F5F9FF]"
            )}
        >
            <span className="w-6 shrink-0 text-right text-[11.5px] font-semibold text-[#94A3B8] tabular-nums">
                {index + 1}
            </span>

            <span className="hidden sm:inline-flex">
                <TypeChip type={lesson.type} />
            </span>

            <span
                className={cn(
                    "flex-1 min-w-0 truncate text-[13.5px] leading-snug",
                    isLocked ? "text-slate-500" : "text-slate-900 font-medium",
                    canPreview && "group-hover:text-[#1D4ED8]"
                )}
            >
                {lesson.title}
            </span>

            {canPreview ? (
                <span className="flex items-center gap-1 shrink-0 rounded-full bg-[#2563EB] px-2.5 py-1 text-[11px] font-bold text-white">
                    <Eye size={11} /> Preview
                </span>
            ) : isLocked ? (
                <Lock size={13} className="shrink-0 text-[#CBD5E1]" aria-label="Locked" />
            ) : null}

            {duration && (
                <span className="w-14 shrink-0 text-right text-[12px] text-slate-400 tabular-nums">
                    {duration}
                </span>
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

    // e.g. "3 videos · 1 PDF · 2 readings"
    const typeSummary = Object.entries(
        lessons.reduce((acc, l) => {
            const label = typeOf(l.type).label;
            acc[label] = (acc[label] || 0) + 1;
            return acc;
        }, {})
    )
        .map(
            ([label, n]) =>
                `${n} ${label === "PDF" ? (n > 1 ? "PDFs" : "PDF") : label.toLowerCase() + (n > 1 && label !== "Audio" ? "s" : "")}`
        )
        .join(" · ");

    return (
        <div
            className={cn(
                "rounded-2xl overflow-hidden bg-white transition-shadow duration-200",
                open
                    ? "border border-[#BFDBFE] shadow-[0_6px_20px_rgba(37,99,235,0.08)]"
                    : "border border-[#E2E8F0]"
            )}
        >
            {/* Section header */}
            <button
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className={cn(
                    "w-full flex items-center gap-4 px-4 sm:px-5 py-4 text-left transition-colors duration-150",
                    open ? "bg-[#EFF6FF]" : "bg-white hover:bg-[#F8FAFF]"
                )}
            >
                <span
                    className={cn(
                        "w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-[13px] font-extrabold",
                        open ? "bg-[#2563EB] text-white" : "bg-[#EFF6FF] text-[#2563EB]"
                    )}
                >
                    {String(index + 1).padStart(2, "0")}
                </span>

                <div className="flex-1 min-w-0">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#60A5FA]">
                        Section {index + 1}
                    </p>
                    <p
                        className={cn(
                            "truncate text-[14.5px] font-bold leading-snug",
                            open ? "text-[#1E3A8A]" : "text-slate-900"
                        )}
                    >
                        {section.title}
                    </p>
                    {(lessons.length > 0 || loading) && (
                        <p className="mt-0.5 text-[12px] text-slate-500 truncate">
                            {loading
                                ? "Loading..."
                                : `${lessons.length} lesson${lessons.length !== 1 ? "s" : ""}${duration ? ` · ${duration}` : ""}${typeSummary ? ` · ${typeSummary}` : ""}`}
                        </p>
                    )}
                </div>

                <span
                    className={cn(
                        "w-8 h-8 shrink-0 rounded-full flex items-center justify-center",
                        open ? "bg-white text-[#2563EB]" : "bg-[#F1F5F9] text-slate-400"
                    )}
                >
                    {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
            </button>

            {/* Lessons list */}
            {open && (
                <div className="bg-white border-t border-[#DBEAFE]">
                    {loading ? (
                        <div className="px-5 py-4 space-y-3">
                            {Array(3)
                                .fill(0)
                                .map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 animate-pulse">
                                        <div className="w-[92px] h-6 rounded-md bg-[#EFF6FF] shrink-0" />
                                        <div className="h-3 bg-[#F1F5F9] rounded-full flex-1" />
                                        <div className="h-3 bg-[#F1F5F9] rounded-full w-10 shrink-0" />
                                    </div>
                                ))}
                        </div>
                    ) : lessons.length > 0 ? (
                        lessons.map((lesson, i) => (
                            <LessonRow
                                key={lesson.id}
                                lesson={lesson}
                                index={i}
                                isEnrolled={isEnrolled}
                                onPreview={onPreview}
                            />
                        ))
                    ) : (
                        <p className="px-5 py-4 text-[13px] italic text-slate-400">No lessons yet</p>
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
