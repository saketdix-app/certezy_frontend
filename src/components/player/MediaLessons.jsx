import { ExternalLink, Headphones, Link2, ClipboardList, FileText, PlayCircle } from "lucide-react";
import { getVideoEmbedUrl, getEmbedUrl, isHttpUrl, hostnameOf } from "@/lib/media";

/**
 * Lesson renderers for the course player, one per lesson type:
 *   VideoLesson  — YouTube / Vimeo / Loom / Drive in an iframe, any other URL in <video>
 *   EmbedLesson  — Google Slides/Docs, Figma, CodePen, any iframe-able page
 *   LinkLesson   — external resource card that opens in a new tab
 *   AudioLesson  — <audio> player
 *   QuizLesson   — jumps to the linked practice test
 * All of them are responsive (16:9 frames scale with width; phones get full width).
 */

const panel =
    "rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center bg-white/[0.04] border border-white/[0.08]";
const primaryBtn =
    "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#3282B8] hover:bg-[#2a6fa0] text-white transition-colors w-full sm:w-auto";

function Unavailable({ icon: Icon = FileText, text = "This lesson's content isn't available yet." }) {
    return (
        <div className="flex flex-col items-center justify-center text-center px-6 py-20">
            <Icon size={48} className="mb-3 text-white/20" />
            <p className="text-white/50 text-[14px]">{text}</p>
        </div>
    );
}

export function VideoLesson({ lesson, videoRef, onTimeUpdate, onEnded }) {
    const src = (lesson.content || "").trim();
    if (!src) return <Unavailable icon={PlayCircle} text="This video isn't available yet." />;

    const embed = getVideoEmbedUrl(src);
    if (embed) {
        return (
            <iframe
                key={lesson.id}
                src={embed}
                title={lesson.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
            />
        );
    }

    return (
        <video
            ref={videoRef}
            key={lesson.id}
            src={src}
            controls
            playsInline
            controlsList="nodownload"
            className="w-full h-full outline-none"
            onTimeUpdate={onTimeUpdate}
            onEnded={onEnded}
        />
    );
}

export function EmbedLesson({ lesson }) {
    const src = getEmbedUrl(lesson.content);
    if (!src) return <Unavailable />;
    return (
        <div className="p-3 sm:p-6 flex flex-col gap-3">
            <div className="w-full rounded-xl overflow-hidden bg-white" style={{ aspectRatio: "16/9" }}>
                <iframe
                    key={lesson.id}
                    src={src}
                    title={lesson.title}
                    className="w-full h-full border-0"
                    allow="fullscreen; clipboard-write"
                    allowFullScreen
                    loading="lazy"
                />
            </div>
            <a
                href={lesson.content}
                target="_blank"
                rel="noreferrer"
                className="self-start inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-white/60 hover:text-white"
            >
                <ExternalLink size={13} /> Open in a new tab
            </a>
        </div>
    );
}

export function LinkLesson({ lesson }) {
    const url = (lesson.content || "").trim();
    if (!isHttpUrl(url)) return <Unavailable icon={Link2} text="This link isn't available yet." />;
    return (
        <div className="p-4 sm:p-8">
            <div className={panel}>
                <div className="w-16 h-16 rounded-2xl bg-sky-500/15 flex items-center justify-center mb-4">
                    <Link2 size={30} className="text-sky-400" />
                </div>
                <p className="text-white font-bold text-[16px] mb-1">{lesson.title}</p>
                <p className="text-[12.5px] mb-6 text-white/45 break-all">{hostnameOf(url)}</p>
                <a href={url} target="_blank" rel="noreferrer" className={primaryBtn}>
                    <ExternalLink size={16} /> Open resource
                </a>
                <p className="text-[12px] text-white/40 mt-4">
                    Opens in a new tab. Come back here to mark it complete.
                </p>
            </div>
        </div>
    );
}

export function AudioLesson({ lesson, onEnded }) {
    const src = (lesson.content || "").trim();
    if (!src) return <Unavailable icon={Headphones} text="This audio isn't available yet." />;
    return (
        <div className="p-4 sm:p-8">
            <div className={panel}>
                <div className="w-16 h-16 rounded-2xl bg-violet-500/15 flex items-center justify-center mb-4">
                    <Headphones size={30} className="text-violet-300" />
                </div>
                <p className="text-white font-bold text-[16px] mb-5">{lesson.title}</p>
                <audio
                    key={lesson.id}
                    src={src}
                    controls
                    preload="metadata"
                    className="w-full max-w-xl"
                    onEnded={onEnded}
                />
            </div>
        </div>
    );
}

/** content holds the quiz (test) id or its exact title */
export function QuizLesson({ lesson, exams = [], onStart }) {
    const ref = String(lesson.content || "").trim();
    const exam = exams.find((e) => String(e.id) === ref) || exams.find((e) => e.title?.trim() === ref);
    return (
        <div className="p-4 sm:p-8">
            <div className={panel}>
                <div className="w-16 h-16 rounded-2xl bg-amber-500/15 flex items-center justify-center mb-4">
                    <ClipboardList size={30} className="text-amber-300" />
                </div>
                <p className="text-white font-bold text-[16px] mb-1">{exam?.title || lesson.title}</p>
                {exam ? (
                    <>
                        <p className="text-[12.5px] mb-6 text-white/50">
                            {[
                                exam.total_questions && `${exam.total_questions} questions`,
                                exam.duration && `${exam.duration} min`,
                                exam.pass_percentage && `pass mark ${exam.pass_percentage}%`,
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                        </p>
                        <button type="button" onClick={() => onStart?.(exam)} className={primaryBtn}>
                            Start quiz
                        </button>
                    </>
                ) : (
                    <p className="text-[13px] text-white/50 mt-2">This quiz isn&apos;t available yet.</p>
                )}
            </div>
        </div>
    );
}
