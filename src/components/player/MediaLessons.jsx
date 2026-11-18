import { ArrowRight, CheckCircle2, ClipboardList, Clock, ExternalLink, FileText, Headphones, Link2, ListChecks, PlayCircle, Target } from "lucide-react";
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
    "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-ui font-semibold bg-action hover:bg-action-hover text-white transition-colors w-full sm:w-auto";

function Unavailable({ icon: Icon = FileText, text = "This lesson's content isn't available yet." }) {
    return (
        <div className="flex flex-col items-center justify-center text-center px-6 py-20">
            <Icon size={48} className="mb-3 text-white/20" />
            <p className="text-white/50 text-ui">{text}</p>
        </div>
    );
}

// startAt (seconds): resume point — YouTube via ?start=, uploaded videos via currentTime
export function VideoLesson({ lesson, videoRef, onTimeUpdate, onEnded, startAt = 0 }) {
    const src = (lesson.content || "").trim();
    if (!src) return <Unavailable icon={PlayCircle} text="This video isn't available yet." />;

    let embed = getVideoEmbedUrl(src);
    if (embed && startAt > 5 && /youtube/.test(embed)) {
        embed += `${embed.includes("?") ? "&" : "?"}start=${Math.floor(startAt)}`;
    }
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
            onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                // resume unless it was almost finished
                if (startAt > 5 && startAt < (v.duration || Infinity) - 10) v.currentTime = startAt;
            }}
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
                className="self-start inline-flex items-center gap-1.5 text-small font-semibold text-white/60 hover:text-white"
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
                <p className="text-white font-bold text-body mb-1">{lesson.title}</p>
                <p className="text-small mb-6 text-white/45 break-all">{hostnameOf(url)}</p>
                <a href={url} target="_blank" rel="noreferrer" className={primaryBtn}>
                    <ExternalLink size={16} /> Open resource
                </a>
                <p className="text-small text-white/40 mt-4">
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
                <p className="text-white font-bold text-body mb-5">{lesson.title}</p>
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

/** content holds the quiz (test) id or its exact title. Light card, same words for every quiz. */
export function QuizLesson({ lesson, exams = [], onStart, passedExamIds }) {
    const ref = String(lesson.content || "").trim();
    const exam = exams.find((e) => String(e.id) === ref) || exams.find((e) => e.title?.trim() === ref);
    const passed = Boolean(exam && passedExamIds?.has?.(exam.id));
    const questions = exam?.total_questions ?? exam?.questions_count;
    const minutes = exam?.duration ?? exam?.duration_minutes;
    const facts = exam
        ? [
              questions && { icon: ListChecks, text: `${questions} questions` },
              minutes && { icon: Clock, text: `${minutes} minutes` },
              exam.pass_percentage && { icon: Target, text: `Pass mark ${exam.pass_percentage}%` },
          ].filter(Boolean)
        : [];

    return (
        <div className="rounded-[24px] border border-slate-200 bg-gradient-to-b from-brand-50/70 to-white px-5 py-8 text-center sm:px-10 sm:py-10">
            <div
                className={
                    passed
                        ? "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"
                        : "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm ring-1 ring-brand-100"
                }
            >
                {passed ? <CheckCircle2 size={28} /> : <ClipboardList size={28} />}
            </div>

            {exam ? (
                <>
                    <h2 className="text-h3 font-extrabold text-slate-900">
                        {passed ? "You passed this quiz" : "Ready to test what you've learned?"}
                    </h2>
                    <p className="mx-auto mt-1.5 max-w-md text-ui leading-relaxed text-slate-600">
                        {passed
                            ? "Nice work. You can take it again any time to refresh what you know."
                            : "Answer each question, then submit to see your score. The timer starts when you begin."}
                    </p>

                    {facts.length > 0 && (
                        <ul className="mt-5 flex flex-wrap items-center justify-center gap-2">
                            {facts.map(({ icon: Icon, text }) => (
                                <li
                                    key={text}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-small font-medium text-slate-700"
                                >
                                    <Icon size={14} className="text-slate-500" aria-hidden="true" />
                                    {text}
                                </li>
                            ))}
                        </ul>
                    )}

                    <button
                        type="button"
                        onClick={() => onStart?.(exam)}
                        className={
                            passed
                                ? // after passing, moving on is the main step — this one steps back
                                  "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-ui font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 sm:w-auto"
                                : "mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-7 py-3 text-body font-bold text-white shadow-[0_8px_20px_-6px_rgba(35,106,158,0.55)] transition-all hover:-translate-y-px hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:w-auto"
                        }
                    >
                        {passed ? "Take it again" : "Start quiz"}
                        <ArrowRight size={18} aria-hidden="true" />
                    </button>
                </>
            ) : (
                <>
                    <h2 className="text-h3 font-extrabold text-slate-900">Quiz coming soon</h2>
                    <p className="mt-1.5 text-ui text-slate-600">This quiz isn&apos;t available yet.</p>
                </>
            )}
        </div>
    );
}
