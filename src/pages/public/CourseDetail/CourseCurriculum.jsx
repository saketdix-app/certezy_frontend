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
    video: { icon: PlayCircle, label: "Video", chip: "bg-[#275382] text-white border-[#275382]" },
    pdf: { icon: FileDown, label: "PDF", chip: "bg-white text-[#275382] border-[#86B0D4]" },
    article: { icon: FileText, label: "Reading", chip: "bg-[#EAF2F9] text-[#275382] border-[#C9DCEC]" },
    text: { icon: FileText, label: "Reading", chip: "bg-[#EAF2F9] text-[#275382] border-[#C9DCEC]" },
    quiz: { icon: HelpCircle, label: "Quiz", chip: "bg-[#D6E5F2] text-[#1E3F5E] border-[#86B0D4]" },
    link: { icon: Link2, label: "Link", chip: "bg-white text-[#2F6496] border-[#C9DCEC]" },
    embed: { icon: MonitorPlay, label: "Interactive", chip: "bg-[#EAF2F9] text-[#275382] border-[#C9DCEC]" },
    audio: { icon: Headphones, label: "Audio", chip: "bg-white text-[#275382] border-[#C9DCEC]" },
};
const typeOf = (type) => LESSON_TYPES[type] || LESSON_TYPES.video;

function TypeChip({ type }) {
    const { icon: Icon, label, chip } = typeOf(type);
    return (
        <span
            className={cn(
                "inline-flex items-center justify-center gap-1 w-[92px] shrink-0 rounded-md border px-2 py-1 text-label font-bold uppercase tracking-wide",
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
                canPreview && "cursor-pointer group transition-colors duration-150 hover:bg-[#F3F8FC]"
            )}
        >
            <span className="w-6 shrink-0 text-right text-label font-semibold text-slate-500 tabular-nums">
                {index + 1}
            </span>

            <span className="hidden sm:inline-flex">
                <TypeChip type={lesson.type} />
            </span>

            <span
                className={cn(
                    "flex-1 min-w-0 truncate text-ui leading-snug",
                    isLocked ? "text-slate-500" : "text-slate-900 font-medium",
                    canPreview && "group-hover:text-[#275382]"
                )}
            >
                {lesson.title}
            </span>

            {canPreview ? (
                <span className="flex items-center gap-1 shrink-0 rounded-full bg-[#2F6496] px-2.5 py-1 text-label font-bold text-white">
                    <Eye size={11} /> Preview
                </span>
            ) : isLocked ? (
                <Lock size={13} className="shrink-0 text-[#CBD5E1]" aria-label="Locked" />
            ) : null}

            {duration && (
                <span className="w-14 shrink-0 text-right text-small text-slate-500 tabular-nums">
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
                    ? "border border-[#C9DCEC] shadow-[0_6px_20px_rgba(47,100,150,0.08)]"
                    : "border border-[#E2E8F0]"
            )}
        >
            {/* Section header */}
            <button
                onClick={() => setOpen(!open)}
                aria-expanded={open}
                className={cn(
                    "w-full flex items-center gap-4 px-4 sm:px-5 py-4 text-left transition-colors duration-150",
                    open ? "bg-[#EAF2F9]" : "bg-white hover:bg-[#F4F8FC]"
                )}
            >
                <span
                    className={cn(
                        "w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-ui font-extrabold",
                        open ? "bg-[#2F6496] text-white" : "bg-[#EAF2F9] text-[#2F6496]"
                    )}
                >
                    {String(index + 1).padStart(2, "0")}
                </span>

                <div className="flex-1 min-w-0">
                    <p className="text-label font-bold uppercase tracking-[0.12em] text-action">
                        Section {index + 1}
                    </p>
                    <p
                        className={cn(
                            "truncate text-body font-bold leading-snug",
                            open ? "text-[#1E3F5E]" : "text-slate-900"
                        )}
                    >
                        {section.title}
                    </p>
                    {(lessons.length > 0 || loading) && (
                        <p className="mt-0.5 text-small text-slate-600 truncate">
                            {loading
                                ? "Loading..."
                                : `${lessons.length} lesson${lessons.length !== 1 ? "s" : ""}${duration ? ` · ${duration}` : ""}${typeSummary ? ` · ${typeSummary}` : ""}`}
                        </p>
                    )}
                </div>

                <span
                    className={cn(
                        "w-8 h-8 shrink-0 rounded-full flex items-center justify-center",
                        open ? "bg-white text-action" : "bg-[#F1F5F9] text-slate-500"
                    )}
                >
                    {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
            </button>

            {/* Lessons list */}
            {open && (
                <div className="bg-white border-t border-[#D6E5F2]">
                    {loading ? (
                        <div className="px-5 py-4 space-y-3">
                            {Array(3)
                                .fill(0)
                                .map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 animate-pulse">
                                        <div className="w-[92px] h-6 rounded-md bg-[#EAF2F9] shrink-0" />
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
                        <p className="px-5 py-4 text-ui italic text-slate-400">No lessons yet</p>
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
            <p style={{ fontSize: "13.5px", color: "#94A3B8", fontStyle: "italic", padding: "8px 0" }}>
                Curriculum not available yet.
            </p>
        );
    }

    const length = formatDuration(totalDuration);

    return (
        <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <p className="text-ui text-slate-500">
                    {sections.length} sections
                    {totalLessons > 0 && ` • ${totalLessons} lessons`}
                    {length && ` • ${length} total length`}
                </p>
                <button
                    type="button"
                    onClick={() => setExpandAll((v) => !v)}
                    className="text-ui font-bold text-primary hover:underline"
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
