import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    ChevronLeft,
    ChevronDown,
    ChevronRight,
    PlayCircle,
    CheckCircle2,
    Lock,
    BookOpen,
    Clock,
    FileText,
    Menu,
    X,
    AlertCircle,
    Award,
    FileDown,
    Link2,
    MonitorPlay,
    Headphones,
    ClipboardList,
} from "lucide-react";

import sectionService from "@/services/sectionService";
import lessonService from "@/services/lessonService";
import progressService from "@/services/progressService";
import enrollmentService from "@/services/enrollmentService";
import testService from "@/services/testService";
import certificateService from "@/services/certificateService";
import { showCertificateEarned } from "@/components/shared/CertificateEarnedToast";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { EnhancedTextLesson } from "@/components/player/EnhancedTextLesson";
import PdfLesson from "@/components/player/PdfLesson";
import {
    VideoLesson,
    EmbedLesson,
    LinkLesson,
    AudioLesson,
    QuizLesson,
} from "@/components/player/MediaLessons";
import Logo from "@/components/shared/Logo";

// ─── Constants ────────────────────────────────────────────────────────────────
const PROGRESS_SYNC_INTERVAL = 15; // seconds — har 15s mein progress save
const AUTO_COMPLETE_THRESHOLD = 0.9; // 90% dekha toh complete

const LESSON_ICONS = {
    video: PlayCircle,
    pdf: FileDown,
    link: Link2,
    embed: MonitorPlay,
    audio: Headphones,
    quiz: ClipboardList,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDuration(seconds) {
    if (!seconds) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CoursePlayerPage() {
    const { courseId } = useParams();
    const navigate = useNavigate();

    // ── Data state ─────────────────────────────────────────────────────────────
    const [sections, setSections] = useState([]); // [{...section, lessons:[]}]
    const [progressMap, setProgressMap] = useState({}); // { lesson_id: { is_completed, watch_time } }
    const [currentLesson, setCurrentLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [courseExams, setCourseExams] = useState([]); // Exams for this course

    // ── UI state ───────────────────────────────────────────────────────────────
    // Lesson list starts open on desktop, closed on phones/tablets (it overlays there)
    const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
    const [expandedSections, setExpandedSections] = useState({});

    // ── Video / progress refs ──────────────────────────────────────────────────
    const videoRef = useRef(null);
    const watchTimeRef = useRef(0); // seconds watched this session
    const watchTimesRef = useRef({}); // saved position per lesson { lesson_id: seconds } — for resuming
    const lastSyncRef = useRef(0); // last time we synced to backend
    const completedRef = useRef({}); // local completed set (avoid re-renders)

    // ─── Fetch all data ────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchAll = async () => {
            try {
                setLoading(true);

                // 1. Check enrollment
                const enrRes = await enrollmentService.checkEnrollment(courseId);
                const enrolled = enrRes.data?.data?.enrolled ?? false;
                setIsEnrolled(enrolled);

                if (!enrolled) {
                    setLoading(false);
                    return;
                }

                // 2. Fetch sections
                const secRes = await sectionService.getByCourseId(courseId);
                const rawSections = secRes.data?.data?.sections ?? [];

                // 3. Fetch lessons for ALL sections in parallel
                const sectionsWithLessons = await Promise.all(
                    rawSections.map(async (sec) => {
                        const lesRes = await lessonService.getBySectionId(sec.id);
                        return {
                            ...sec,
                            lessons: lesRes.data?.data?.lessons ?? [],
                        };
                    })
                );

                setSections(sectionsWithLessons);

                // 4. Expand first section by default
                if (sectionsWithLessons.length > 0) {
                    setExpandedSections({ [sectionsWithLessons[0].id]: true });
                }

                // 5. Fetch progress
                const progRes = await progressService.getCourseProgress(courseId);
                const progList = progRes.data?.data?.progress ?? [];
                const map = {};
                progList.forEach((p) => {
                    map[p.lesson_id] = p;
                });
                setProgressMap(map);
                completedRef.current = map;
                watchTimesRef.current = Object.fromEntries(
                    progList.map((p) => [p.lesson_id, p.watch_time || 0])
                );

                // 6. Fetch exams for this course
                try {
                    const examRes = await testService.getByCourseId(courseId);
                    setCourseExams(examRes.data?.data?.tests ?? []);
                } catch (examErr) {
                    console.warn("No exams found for this course:", examErr);
                    setCourseExams([]);
                }

                // 7. Resume where the student left off: the lesson opened most recently
                // (or the next unfinished one after it, if that one is done)
                const allLessons = sectionsWithLessons.flatMap((s) => s.lessons);
                if (allLessons.length > 0) {
                    const lastOpened = progList
                        .filter((p) => p.last_watched)
                        .sort((a, b) => new Date(b.last_watched) - new Date(a.last_watched))[0];
                    const lastIdx = lastOpened
                        ? allLessons.findIndex((l) => l.id === lastOpened.lesson_id)
                        : -1;
                    const isDone = (l) => !!map[l.id]?.is_completed;
                    const lesson =
                        (lastIdx >= 0 && !isDone(allLessons[lastIdx]) && allLessons[lastIdx]) ||
                        (lastIdx >= 0 && allLessons.slice(lastIdx + 1).find((l) => !isDone(l))) ||
                        allLessons.find((l) => !isDone(l)) ||
                        allLessons[lastIdx >= 0 ? lastIdx : 0];
                    watchTimeRef.current = map[lesson.id]?.watch_time ?? 0;
                    const fullLesson = await lessonService.getById(lesson.id);
                    setCurrentLesson(fullLesson.data?.data?.lesson ?? lesson);

                    // Expand that lesson's section
                    setExpandedSections((prev) => ({
                        ...prev,
                        [lesson.section_id]: true,
                    }));
                }
            } catch (err) {
                setError(err.response?.data?.message || "Failed to load course");
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [courseId]);

    // ── Progress sync ──────────────────────────────────────────────────────────
    const syncProgress = useCallback(
        async (markComplete = false) => {
            if (!currentLesson) return;

            const is_completed = markComplete || !!completedRef.current[currentLesson.id]?.is_completed;

            try {
                const res = await progressService.updateLessonProgress({
                    lesson_id: currentLesson.id,
                    is_completed: is_completed ? 1 : 0,
                    watch_time: Math.floor(watchTimeRef.current),
                });
                watchTimesRef.current[currentLesson.id] = Math.max(
                    watchTimesRef.current[currentLesson.id] || 0,
                    Math.floor(watchTimeRef.current)
                );
                // Last lesson done → the API issues the certificate automatically
                showCertificateEarned(res.data?.data?.certificate, navigate);

                if (is_completed) {
                    completedRef.current = {
                        ...completedRef.current,
                        [currentLesson.id]: { is_completed: 1 },
                    };
                    setProgressMap((prev) => ({
                        ...prev,
                        [currentLesson.id]: { ...prev[currentLesson.id], is_completed: 1 },
                    }));
                }
            } catch (err) {
                console.error("Progress sync failed:", err);
            }
        },
        [currentLesson, navigate]
    );

    // ── Open a lesson ──────────────────────────────────────────────────────────
    const openLesson = useCallback(
        async (lesson) => {
            // Save current video progress before switching
            await syncProgress(false);

            // Resume from the saved position of the lesson being opened
            watchTimeRef.current = watchTimesRef.current[lesson.id] || 0;
            lastSyncRef.current = watchTimeRef.current;

            // Fetch full lesson (with content/video URL)
            try {
                const res = await lessonService.getById(lesson.id);
                setCurrentLesson(res.data?.data?.lesson ?? lesson);
            } catch {
                setCurrentLesson(lesson);
            }

            // Remember it as the last lesson opened, so the next visit resumes here
            // (completion and watch time are never lowered by the server)
            progressService
                .updateLessonProgress({
                    lesson_id: lesson.id,
                    is_completed: completedRef.current[lesson.id]?.is_completed ? 1 : 0,
                    watch_time: Math.floor(watchTimeRef.current),
                })
                .catch(() => {});
        },
        // syncProgress changes with the current lesson, so the save above runs
        // for the lesson being left (it used to be stuck on the first one)
        [syncProgress]
    );

    // ── Video event handlers ───────────────────────────────────────────────────
    const handleTimeUpdate = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        watchTimeRef.current = video.currentTime;

        // Auto-complete at 90%
        const ratio = video.currentTime / video.duration;
        if (ratio >= AUTO_COMPLETE_THRESHOLD && !completedRef.current[currentLesson?.id]?.is_completed) {
            syncProgress(true);
        }

        // Periodic sync every N seconds
        if (video.currentTime - lastSyncRef.current >= PROGRESS_SYNC_INTERVAL) {
            lastSyncRef.current = video.currentTime;
            syncProgress(false);
        }
    }, [currentLesson, syncProgress]);

    // ── Next / Prev lesson ─────────────────────────────────────────────────────
    const allLessons = sections.flatMap((s) => s.lessons);
    const currentIdx = allLessons.findIndex((l) => l.id === currentLesson?.id);

    const isLastLesson = currentIdx === allLessons.length - 1;
    const nextLesson = isLastLesson ? null : allLessons[currentIdx + 1];
    // Set when the next lesson starts a new section
    const nextSectionIndex =
        nextLesson && nextLesson.section_id !== currentLesson?.section_id
            ? sections.findIndex((s) => s.id === nextLesson.section_id)
            : -1;
    const nextSection =
        nextSectionIndex >= 0 ? { ...sections[nextSectionIndex], index: nextSectionIndex } : null;
    const currentDone = !!progressMap[currentLesson?.id]?.is_completed;

    // "Next" finishes the current lesson first (quizzes complete by passing their test),
    // then opens the next one. On the last lesson it finishes the course: if earlier
    // lessons are still open it jumps to the first of them.
    const goToNextLesson = useCallback(async () => {
        if (!currentLesson) return;
        if (currentLesson.type !== "quiz" && !completedRef.current[currentLesson.id]?.is_completed) {
            await syncProgress(true);
        }
        if (currentIdx < allLessons.length - 1) {
            await openLesson(allLessons[currentIdx + 1]);
            return;
        }
        const remaining = allLessons.filter((l) => !completedRef.current[l.id]?.is_completed);
        if (remaining.length === 0) {
            toast.success("Course complete — well done! 🎉");
        } else {
            toast(`${remaining.length} lesson${remaining.length > 1 ? "s" : ""} left to complete the course`);
            await openLesson(remaining[0]);
            setExpandedSections((prev) => ({ ...prev, [remaining[0].section_id]: true }));
        }
    }, [currentLesson, currentIdx, allLessons, openLesson, syncProgress]);

    const handleVideoEnded = useCallback(() => {
        // Marks the lesson complete and moves on
        goToNextLesson();
    }, [goToNextLesson]);

    const goToPrevLesson = useCallback(async () => {
        if (currentIdx > 0) {
            await openLesson(allLessons[currentIdx - 1]);
        }
    }, [currentIdx, allLessons, openLesson]);

    // ── Manual complete ────────────────────────────────────────────────────────
    const markLessonComplete = () => syncProgress(true);

    // ── Save on leaving the page ───────────────────────────────────────────────
    // Only on unmount: running this on every lesson change re-saved the lesson
    // just left (with watch time 0) after the new one was opened, which made the
    // old lesson look like the last one visited.
    const syncProgressRef = useRef(syncProgress);
    useEffect(() => {
        syncProgressRef.current = syncProgress;
    }, [syncProgress]);
    useEffect(() => () => syncProgressRef.current(false), []);

    // ─── Guards ────────────────────────────────────────────────────────────────
    if (loading) return <PlayerSkeleton />;

    if (!isEnrolled) return <NotEnrolledState courseId={courseId} navigate={navigate} />;

    if (error)
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
                <div className="text-center px-6">
                    <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
                    <p className="text-white font-semibold mb-3">{error}</p>
                    <button
                        onClick={() => navigate("/student/my-courses")}
                        className="px-4 py-2 rounded-xl bg-[#3282B8] text-white text-sm font-bold"
                    >
                        ← My Courses
                    </button>
                </div>
            </div>
        );

    // ── Total + completed count ────────────────────────────────────────────────
    const totalLessons = allLessons.length;
    const completedLessons = Object.values(progressMap).filter((p) => p.is_completed).length;
    const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const getCertificate = async () => {
        try {
            const res = await certificateService.claim(courseId);
            const cert = res.data?.data?.certificate;
            if (cert?.pdf_url) window.open(cert.pdf_url, "_blank", "noopener");
            else navigate("/student/certificates");
        } catch (err) {
            toast.error(err.response?.data?.message || "Certificate is not available yet");
        }
    };

    return (
        <div
            className="h-screen flex flex-col overflow-hidden"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#0F172A" }}
        >
            {/* ── Top Bar ─────────────────────────────────────────────────── */}
            <TopBar
                courseId={courseId}
                navigate={navigate}
                progressPct={progressPct}
                completedLessons={completedLessons}
                totalLessons={totalLessons}
                onGetCertificate={progressPct >= 100 ? getCertificate : null}
                sidebarOpen={sidebarOpen}
                onToggleSidebar={() => setSidebarOpen((p) => !p)}
            />

            {/* ── Body ────────────────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">
                {/* ── Video + controls ────────────────────────────────────── */}
                <main className="flex-1 flex flex-col overflow-y-auto bg-[#F1F5F9]">
                    {currentLesson ? (
                        <>
                            {/* Lesson area — 16:9 frame for video; everything else sizes to its content */}
                            <div
                                className={
                                    currentLesson.type === "video"
                                        ? "w-full shrink-0 bg-black"
                                        : ["text", "article"].includes(currentLesson.type)
                                          ? "w-full shrink-0 bg-[#F1F5F9]"
                                          : "w-full shrink-0 bg-[#0a1628]"
                                }
                                style={
                                    currentLesson.type === "video"
                                        ? { aspectRatio: "16/9", maxHeight: "calc(100vh - 200px)" }
                                        : undefined
                                }
                            >
                                {currentLesson.type === "pdf" ? (
                                    <PdfLesson lesson={currentLesson} />
                                ) : currentLesson.type === "video" ? (
                                    <VideoLesson
                                        lesson={currentLesson}
                                        startAt={watchTimesRef.current[currentLesson.id] || 0}
                                        videoRef={videoRef}
                                        onTimeUpdate={handleTimeUpdate}
                                        onEnded={handleVideoEnded}
                                    />
                                ) : currentLesson.type === "embed" ? (
                                    <EmbedLesson lesson={currentLesson} />
                                ) : currentLesson.type === "link" ? (
                                    <LinkLesson lesson={currentLesson} />
                                ) : currentLesson.type === "audio" ? (
                                    <AudioLesson lesson={currentLesson} onEnded={markLessonComplete} />
                                ) : currentLesson.type === "quiz" ? (
                                    <QuizLesson
                                        lesson={currentLesson}
                                        exams={courseExams}
                                        onStart={(exam) =>
                                            navigate(`/student/course/${courseId}/exam/${exam.id}`)
                                        }
                                    />
                                ) : (
                                    // Text / article lesson content area
                                    <div className="w-full h-full bg-[#F1F5F9] overflow-y-auto">
                                        {currentLesson.content ? (
                                            <div className="p-4 sm:p-6">
                                                {/* Complete + Next live in the lesson panel below */}
                                                <EnhancedTextLesson lesson={currentLesson} />
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center py-20">
                                                <div className="text-center">
                                                    <FileText
                                                        size={48}
                                                        className="mx-auto mb-3 text-white/20"
                                                    />
                                                    <p className="text-white/40 text-[14px]">
                                                        No content available
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Lesson info + nav */}
                            <div className="bg-white border-t border-[#E2E8F0] flex-1">
                                <div className="px-5 py-5 max-w-4xl w-full mx-auto">
                                    {/* Title row */}
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div>
                                            <p
                                                style={{
                                                    fontSize: "11px",
                                                    fontWeight: 700,
                                                    color: "#2563EB",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.08em",
                                                    marginBottom: "6px",
                                                }}
                                            >
                                                Lesson {currentIdx + 1} of {totalLessons}
                                            </p>
                                            <h1
                                                style={{
                                                    fontSize: "20px",
                                                    fontWeight: 800,
                                                    color: "#0F172A",
                                                    lineHeight: 1.3,
                                                }}
                                            >
                                                {currentLesson.title}
                                            </h1>
                                        </div>

                                        {/* Mark complete */}
                                        {!progressMap[currentLesson.id]?.is_completed ? (
                                            <button
                                                onClick={markLessonComplete}
                                                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors"
                                                style={{
                                                    background: "#2563EB",
                                                    color: "#fff",
                                                    fontSize: "13px",
                                                    fontWeight: 700,
                                                    boxShadow: "0 6px 16px rgba(37,99,235,0.25)",
                                                }}
                                            >
                                                <CheckCircle2 size={15} />
                                                Mark Complete
                                            </button>
                                        ) : (
                                            <div
                                                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl"
                                                style={{
                                                    background: "#EFF6FF",
                                                    border: "1px solid #BFDBFE",
                                                    color: "#1D4ED8",
                                                    fontSize: "13px",
                                                    fontWeight: 700,
                                                }}
                                            >
                                                <CheckCircle2 size={15} />
                                                Completed
                                            </div>
                                        )}
                                    </div>

                                    {/* Duration */}
                                    {currentLesson.duration > 0 && (
                                        <div className="flex items-center gap-1.5 mb-5">
                                            <Clock size={13} style={{ color: "#64748B" }} />
                                            <span style={{ fontSize: "12.5px", color: "#64748B" }}>
                                                {fmtDuration(currentLesson.duration)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Up next — names the next lesson, and its section when a new one starts */}
                                    {nextLesson && (
                                        <p
                                            className="pt-4 mb-3 truncate"
                                            style={{
                                                borderTop: "1px solid #E2E8F0",
                                                fontSize: "12.5px",
                                                color: "#64748B",
                                            }}
                                        >
                                            <span style={{ color: "#2563EB", fontWeight: 700 }}>
                                                {nextSection ? "Next section" : "Up next"}:
                                            </span>{" "}
                                            {nextSection && (
                                                <span style={{ color: "#0F172A", fontWeight: 600 }}>
                                                    Section {nextSection.index + 1}: {nextSection.title}{" "}
                                                    ·{" "}
                                                </span>
                                            )}
                                            {nextLesson.title}
                                        </p>
                                    )}

                                    {/* Prev / Next buttons — every lesson type */}
                                    <div
                                        className={`flex items-center justify-between ${nextLesson ? "" : "pt-4"}`}
                                        style={nextLesson ? undefined : { borderTop: "1px solid #E2E8F0" }}
                                    >
                                        <button
                                            onClick={goToPrevLesson}
                                            disabled={currentIdx === 0}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all disabled:opacity-30"
                                            style={{
                                                background: "#fff",
                                                border: "1px solid #CBD5E1",
                                                color: "#334155",
                                                fontSize: "13px",
                                                fontWeight: 600,
                                            }}
                                        >
                                            <ChevronLeft size={16} />
                                            Previous
                                        </button>

                                        <button
                                            onClick={goToNextLesson}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all disabled:opacity-30"
                                            style={{
                                                background: isLastLesson ? "#1D4ED8" : "#2563EB",
                                                color: "#fff",
                                                fontSize: "13px",
                                                fontWeight: 700,
                                            }}
                                        >
                                            {isLastLesson
                                                ? "Finish Course"
                                                : nextSection
                                                  ? currentDone || currentLesson.type === "quiz"
                                                      ? "Next Section"
                                                      : "Complete & Next Section"
                                                  : currentDone || currentLesson.type === "quiz"
                                                    ? "Next Lesson"
                                                    : "Complete & Next"}
                                            {isLastLesson ? <Award size={16} /> : <ChevronRight size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <BookOpen
                                    size={48}
                                    style={{ color: "rgba(255,255,255,0.15)" }}
                                    className="mx-auto mb-4"
                                />
                                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "15px" }}>
                                    No lessons available
                                </p>
                            </div>
                        </div>
                    )}
                </main>

                {/* ── Sidebar ─────────────────────────────────────────────── */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                        aria-hidden="true"
                    />
                )}
                {sidebarOpen && (
                    <CourseSidebar
                        sections={sections}
                        currentLesson={currentLesson}
                        progressMap={progressMap}
                        expandedSections={expandedSections}
                        onToggleSection={(id) =>
                            setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }))
                        }
                        onSelectLesson={(lesson) => {
                            openLesson(lesson);
                            if (!window.matchMedia("(min-width: 1024px)").matches) setSidebarOpen(false);
                        }}
                        courseExams={courseExams}
                        courseId={courseId}
                        navigate={navigate}
                    />
                )}
            </div>
        </div>
    );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────
function TopBar({
    navigate,
    progressPct,
    completedLessons,
    totalLessons,
    onGetCertificate,
    sidebarOpen,
    onToggleSidebar,
}) {
    return (
        <div
            className="h-[60px] flex items-center px-4 gap-4 shrink-0"
            style={{
                background: "#0a1628",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}
        >
            {/* Back */}
            <button
                onClick={() => navigate("/student/my-courses")}
                className="flex items-center gap-1.5 shrink-0"
                style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px", fontWeight: 600 }}
            >
                <ChevronLeft size={16} />
                <span className="hidden sm:block">My Courses</span>
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 no-underline shrink-0">
                <Logo variant="light" height={26} />
            </Link>

            {/* Progress bar — center */}
            <div className="flex-1 flex items-center gap-3 max-w-sm mx-auto">
                <div
                    className="flex-1 h-1.5 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.1)" }}
                >
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${progressPct}%`,
                            background: "linear-gradient(90deg, #3282B8, #60A5FA)",
                        }}
                    />
                </div>
                <span
                    style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.55)",
                        whiteSpace: "nowrap",
                    }}
                >
                    {completedLessons}/{totalLessons}
                </span>
            </div>

            {onGetCertificate && (
                <button
                    onClick={onGetCertificate}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 text-amber-950 hover:bg-amber-300 transition-colors"
                    style={{ fontSize: "12px", fontWeight: 700 }}
                >
                    <Award size={14} />
                    <span className="hidden sm:block">Get certificate</span>
                </button>
            )}

            {/* Sidebar toggle */}
            <button
                onClick={onToggleSidebar}
                className={`${onGetCertificate ? "" : "ml-auto "}flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors`}
                style={{
                    background: sidebarOpen ? "rgba(50,130,184,0.2)" : "rgba(255,255,255,0.06)",
                    color: sidebarOpen ? "#3282B8" : "rgba(255,255,255,0.55)",
                    fontSize: "12px",
                    fontWeight: 600,
                }}
            >
                {sidebarOpen ? <X size={15} /> : <Menu size={15} />}
                <span className="hidden sm:block">Course Content</span>
            </button>
        </div>
    );
}

// ─── Course Sidebar ───────────────────────────────────────────────────────────
function CourseSidebar({
    sections,
    currentLesson,
    progressMap,
    expandedSections,
    onToggleSection,
    onSelectLesson,
    courseExams,
    courseId,
    navigate,
}) {
    const totalLessons = sections.reduce((a, s) => a + s.lessons.length, 0);
    const totalDone = sections.reduce(
        (a, s) => a + s.lessons.filter((l) => progressMap[l.id]?.is_completed).length,
        0
    );
    const pct = totalLessons ? Math.round((totalDone / totalLessons) * 100) : 0;

    return (
        <aside className="fixed inset-y-0 right-0 z-40 w-[86vw] max-w-[360px] lg:static lg:z-auto lg:w-[320px] lg:max-w-none xl:w-[350px] shrink-0 flex flex-col overflow-hidden bg-white border-l border-[#E2E8F0] shadow-[-8px_0_24px_rgba(15,23,42,0.06)] lg:shadow-none">
            {/* Header + overall progress */}
            <div className="px-5 pt-5 pb-4 shrink-0 border-b border-[#E2E8F0]">
                <p className="text-[15px] font-extrabold text-slate-900">Course Content</p>
                <p className="mt-0.5 text-[12px] text-slate-500">
                    {sections.length} sections · {totalLessons} lessons · {totalDone} completed
                </p>
                <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 rounded-full bg-[#DBEAFE] overflow-hidden">
                        <div
                            className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <span className="text-[12px] font-bold text-[#2563EB] tabular-nums">{pct}%</span>
                </div>
            </div>

            {/* Sections list */}
            <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
                {sections.map((section, sIdx) => {
                    const isExpanded = !!expandedSections[section.id];
                    const secCompleted = section.lessons.filter(
                        (l) => progressMap[l.id]?.is_completed
                    ).length;
                    const hasActive = section.lessons.some((l) => l.id === currentLesson?.id);
                    const secDone = section.lessons.length > 0 && secCompleted === section.lessons.length;

                    return (
                        <div key={section.id} className="border-b border-[#E2E8F0] bg-white">
                            {/* Section header */}
                            <button
                                onClick={() => onToggleSection(section.id)}
                                aria-expanded={isExpanded}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
                                    isExpanded ? "bg-[#EFF6FF]" : "hover:bg-[#F8FAFF]"
                                )}
                            >
                                <span
                                    className={cn(
                                        "w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[12px] font-extrabold",
                                        secDone
                                            ? "bg-[#2563EB] text-white"
                                            : hasActive || isExpanded
                                              ? "bg-white text-[#2563EB] ring-1 ring-[#BFDBFE]"
                                              : "bg-[#F1F5F9] text-slate-500"
                                    )}
                                >
                                    {secDone ? <CheckCircle2 size={15} /> : String(sIdx + 1).padStart(2, "0")}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="truncate text-[13px] font-bold leading-snug text-slate-900">
                                        {section.title}
                                    </p>
                                    <p className="mt-0.5 text-[11.5px] text-slate-500">
                                        {secCompleted}/{section.lessons.length} completed
                                    </p>
                                </div>
                                <ChevronDown
                                    size={16}
                                    className={cn(
                                        "shrink-0 transition-transform duration-200",
                                        isExpanded ? "rotate-180 text-[#2563EB]" : "text-slate-400"
                                    )}
                                />
                            </button>

                            {/* Lessons */}
                            {isExpanded && (
                                <div className="py-1.5">
                                    {section.lessons.map((lesson, lIdx) => {
                                        const isActive = currentLesson?.id === lesson.id;
                                        const isCompleted = !!progressMap[lesson.id]?.is_completed;
                                        const TypeIcon = LESSON_ICONS[lesson.type] || FileText;

                                        return (
                                            <button
                                                key={lesson.id}
                                                onClick={() => onSelectLesson(lesson)}
                                                aria-current={isActive ? "true" : undefined}
                                                className={cn(
                                                    "group w-[calc(100%-16px)] mx-2 my-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                                                    isActive
                                                        ? "bg-[#2563EB] shadow-[0_6px_16px_rgba(37,99,235,0.28)]"
                                                        : "hover:bg-[#EFF6FF]"
                                                )}
                                            >
                                                {/* Status */}
                                                <span className="shrink-0 w-6 h-6 flex items-center justify-center">
                                                    {isCompleted ? (
                                                        <CheckCircle2
                                                            size={18}
                                                            className={
                                                                isActive ? "text-white" : "text-[#2563EB]"
                                                            }
                                                        />
                                                    ) : isActive ? (
                                                        <PlayCircle size={18} className="text-white" />
                                                    ) : (
                                                        <span className="w-[18px] h-[18px] rounded-full border-2 border-[#CBD5E1] group-hover:border-[#93C5FD] flex items-center justify-center text-[9px] font-bold text-slate-400">
                                                            {lIdx + 1}
                                                        </span>
                                                    )}
                                                </span>

                                                {/* Title + meta */}
                                                <span className="flex-1 min-w-0">
                                                    <span
                                                        className={cn(
                                                            "block truncate text-[13px] leading-snug",
                                                            isActive
                                                                ? "font-bold text-white"
                                                                : isCompleted
                                                                  ? "font-medium text-slate-500"
                                                                  : "font-medium text-slate-800"
                                                        )}
                                                    >
                                                        {lesson.title}
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            "mt-0.5 flex items-center gap-1.5 text-[11px]",
                                                            isActive ? "text-blue-100" : "text-slate-400"
                                                        )}
                                                    >
                                                        <TypeIcon size={11} />
                                                        <span className="capitalize">
                                                            {lesson.type === "text" ||
                                                            lesson.type === "article"
                                                                ? "Reading"
                                                                : lesson.type === "pdf"
                                                                  ? "PDF"
                                                                  : lesson.type}
                                                        </span>
                                                        {lesson.duration > 0 && (
                                                            <span>· {fmtDuration(lesson.duration)}</span>
                                                        )}
                                                        {lesson.is_free === 1 && (
                                                            <span
                                                                className={cn(
                                                                    "rounded px-1.5 py-px text-[9px] font-bold",
                                                                    isActive
                                                                        ? "bg-white/20 text-white"
                                                                        : "bg-[#DBEAFE] text-[#1D4ED8]"
                                                                )}
                                                            >
                                                                FREE
                                                            </span>
                                                        )}
                                                    </span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Exams */}
            {courseExams.length > 0 && (
                <div className="shrink-0 border-t border-[#E2E8F0] bg-white">
                    <div className="px-5 pt-4 pb-2">
                        <p className="text-[13.5px] font-extrabold text-slate-900">Course Exams</p>
                        <p className="mt-0.5 text-[11.5px] text-slate-500">
                            {courseExams.length} exam{courseExams.length > 1 ? "s" : ""} available
                        </p>
                    </div>
                    <div className="px-3 pb-4 space-y-1.5">
                        {courseExams.map((exam) => (
                            <button
                                key={exam.id}
                                onClick={() => navigate(`/student/course/${courseId}/exam/${exam.id}`)}
                                className="w-full flex items-center gap-3 rounded-xl border border-[#DBEAFE] bg-[#F5F9FF] px-3 py-2.5 text-left transition-colors hover:border-[#93C5FD] hover:bg-[#EFF6FF]"
                            >
                                <span className="w-8 h-8 shrink-0 rounded-lg bg-[#2563EB] flex items-center justify-center">
                                    <Award size={16} className="text-white" />
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="block truncate text-[13px] font-semibold text-slate-900">
                                        {exam.title}
                                    </span>
                                    <span className="mt-0.5 block text-[11px] text-slate-500">
                                        {exam.duration ?? exam.duration_minutes} min ·{" "}
                                        {exam.total_questions ?? exam.questions_count ?? 0} questions
                                    </span>
                                </span>
                                <ChevronRight size={15} className="shrink-0 text-[#2563EB]" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </aside>
    );
}

// ─── Not Enrolled ─────────────────────────────────────────────────────────────
function NotEnrolledState({ navigate }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
            <div className="text-center px-6">
                <Lock size={48} style={{ color: "rgba(255,255,255,0.2)" }} className="mx-auto mb-4" />
                <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#fff", marginBottom: "8px" }}>
                    You're not enrolled
                </h2>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", marginBottom: "24px" }}>
                    Enroll in this course to access the lessons.
                </p>
                <div className="flex items-center gap-3 justify-center">
                    <button
                        onClick={() => navigate("/courses")}
                        className="px-5 py-2.5 rounded-xl text-white font-bold text-sm"
                        style={{ background: "#3282B8" }}
                    >
                        View Course
                    </button>
                    <button
                        onClick={() => navigate("/student/my-courses")}
                        className="px-5 py-2.5 rounded-xl font-bold text-sm"
                        style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
                    >
                        My Courses
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function PlayerSkeleton() {
    return (
        <div className="h-screen flex flex-col bg-[#0F172A] animate-pulse">
            <div
                className="h-[60px] bg-[#0a1628]"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
            />
            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 bg-black" style={{ aspectRatio: "16/9" }} />
                <div
                    className="w-[300px] bg-[#0a1628]"
                    style={{ borderLeft: "1px solid rgba(255,255,255,0.08)" }}
                >
                    <div className="p-5 space-y-4">
                        {Array(6)
                            .fill(0)
                            .map((_, i) => (
                                <div
                                    key={i}
                                    className="h-10 rounded-xl"
                                    style={{ background: "rgba(255,255,255,0.05)" }}
                                />
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
