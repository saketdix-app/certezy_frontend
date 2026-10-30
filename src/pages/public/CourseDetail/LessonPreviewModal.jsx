import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { X, Loader2, Eye } from "lucide-react";
import lessonService from "@/services/lessonService";
import PdfLesson from "@/components/player/PdfLesson";
import { VideoLesson, EmbedLesson, LinkLesson, AudioLesson } from "@/components/player/MediaLessons";

/**
 * LessonPreviewModal — plays a free preview lesson on the public course page.
 *
 * The section list only carries lesson metadata, so the content is read from
 * the public free-lessons endpoint (which only ever returns is_free lessons).
 */

// Free lessons per course, shared by every Preview click on the page
const freeLessonsCache = new Map();
const loadFreeLessons = (courseId) => {
    if (!freeLessonsCache.has(courseId)) {
        const request = lessonService
            .getFreeByCourseId(courseId)
            .then((res) => res.data?.data?.lessons ?? [])
            .catch((err) => {
                freeLessonsCache.delete(courseId); // let the next click retry
                throw err;
            });
        freeLessonsCache.set(courseId, request);
    }
    return freeLessonsCache.get(courseId);
};

function TextPreview({ content }) {
    if (!content) return <p className="p-8 text-center text-slate-500 text-[14px]">No content available.</p>;
    const isHtml = /^\s*<[a-z!]/i.test(content);
    return (
        <div className="max-h-[70vh] overflow-y-auto bg-white p-5 sm:p-8">
            {isHtml ? (
                <div
                    className="lesson-html max-w-none text-[15px] leading-relaxed text-gray-800"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
                />
            ) : (
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800">{content}</p>
            )}
        </div>
    );
}

function LessonBody({ lesson }) {
    switch (lesson.type) {
        case "video":
            return (
                <div className="w-full bg-black" style={{ aspectRatio: "16/9" }}>
                    <VideoLesson lesson={lesson} />
                </div>
            );
        case "pdf":
            return (
                <div className="w-full bg-[#0a1628]" style={{ height: "70vh" }}>
                    <PdfLesson lesson={lesson} />
                </div>
            );
        case "embed":
            return (
                <div className="w-full bg-[#0a1628]">
                    <EmbedLesson lesson={lesson} />
                </div>
            );
        case "link":
            return (
                <div className="w-full bg-[#0a1628]">
                    <LinkLesson lesson={lesson} />
                </div>
            );
        case "audio":
            return (
                <div className="w-full bg-[#0a1628]">
                    <AudioLesson lesson={lesson} />
                </div>
            );
        default:
            return <TextPreview content={lesson.content} />;
    }
}

export default function LessonPreviewModal({ lesson, courseId, onClose }) {
    const [state, setState] = useState({ id: null, full: null, error: null });

    useEffect(() => {
        let alive = true;
        loadFreeLessons(courseId)
            .then((lessons) => {
                if (!alive) return;
                const full = lessons.find((l) => l.id === lesson.id);
                setState({
                    id: lesson.id,
                    full: full ? { ...lesson, ...full } : null,
                    error: full ? null : "This lesson isn't available as a free preview.",
                });
            })
            .catch(
                () => alive && setState({ id: lesson.id, full: null, error: "Could not load the preview." })
            );
        return () => {
            alive = false;
        };
    }, [courseId, lesson]);

    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = overflow;
        };
    }, [onClose]);

    const loading = state.id !== lesson.id;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-6"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`Preview: ${lesson.title}`}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl overflow-hidden rounded-2xl bg-[#0F172A] shadow-2xl"
            >
                <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-white/10">
                    <span className="flex items-center gap-1 shrink-0 rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-semibold text-blue-300">
                        <Eye size={11} /> Free preview
                    </span>
                    <h3 className="flex-1 min-w-0 truncate text-[14px] font-semibold text-white">
                        {lesson.title}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
                        aria-label="Close preview"
                    >
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-24 text-white/60 text-[14px]">
                        <Loader2 size={18} className="animate-spin" /> Loading preview…
                    </div>
                ) : state.error ? (
                    <p className="py-20 px-6 text-center text-white/60 text-[14px]">{state.error}</p>
                ) : (
                    <LessonBody lesson={state.full} />
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-white/10">
                    <p className="text-[12.5px] text-white/50">Enjoying it? Enrol to unlock every lesson.</p>
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            document
                                .getElementById("course-enroll")
                                ?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                        className="rounded-lg bg-primary px-3.5 py-1.5 text-[12.5px] font-bold text-white hover:opacity-90"
                    >
                        View enrollment options
                    </button>
                </div>
            </div>
        </div>
    );
}
