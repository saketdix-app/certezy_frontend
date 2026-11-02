import { useState } from "react";
import { formatClock, isAnswered } from "@/lib/exam";
import { Clock, ListOrdered, Flag, ChevronLeft, ChevronRight, LayoutGrid, X, Check } from "lucide-react";
import Logo from "@/components/shared/Logo";
import { cn } from "@/lib/utils";

/**
 * ExamSimulation — full-screen exam pieces in the Certezy theme
 * (navy bars like the site header, brand blue #3282B8, Plus Jakarta Sans):
 * top bar (logo · title · time remaining · "n of N"), question card with
 * answer cards, bottom bar with Flag for review · Previous · Navigator · Next,
 * and a Review screen. Flow mirrors real certification exams.
 */

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
const NAVY = "#0F2545";
const BLUE = "#3282B8";

export function ExamTopBar({ title, secondsLeft, current, total, hasTimer }) {
    const warning = hasTimer && secondsLeft <= 300;
    return (
        <header className="shrink-0 text-white" style={{ background: NAVY, fontFamily: FONT }}>
            <div className="flex items-center justify-between gap-4 px-4 sm:px-6 h-16">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <Logo variant="light" height={24} className="hidden sm:inline-flex" />
                    <span className="hidden sm:block w-px h-7 bg-white/20" aria-hidden="true" />
                    <h1 className="text-[15px] sm:text-[17px] font-bold leading-tight truncate">{title}</h1>
                </div>
                <div className="shrink-0 flex items-center gap-2 sm:gap-3 text-[13px] sm:text-[14px]">
                    {hasTimer && (
                        <span
                            className={cn(
                                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold tabular-nums",
                                warning ? "bg-[#F59E0B] text-[#0F2545]" : "bg-white/10"
                            )}
                            title="Time remaining"
                        >
                            <Clock size={15} aria-hidden="true" />
                            <span className="sr-only">Time remaining</span>
                            {formatClock(secondsLeft)}
                        </span>
                    )}
                    <span className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 tabular-nums">
                        <ListOrdered size={15} aria-hidden="true" />
                        {current} of {total}
                    </span>
                </div>
            </div>
            {/* Progress through the questions */}
            <div className="h-1 bg-white/10">
                <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${total ? (current / total) * 100 : 0}%`, background: BLUE }}
                />
            </div>
        </header>
    );
}

/** Question body — answer contract matches QuestionRenderer: single → id, multiple → [ids]. */
export function SimulationQuestion({ question, answer, onAnswerChange, number }) {
    const single = question.type !== "multiple";
    const selected = Array.isArray(answer) ? answer : isAnswered(answer) ? [answer] : [];

    const toggle = (optionId) => {
        if (single) {
            onAnswerChange(question.id, optionId);
            return;
        }
        const next = selected.includes(optionId)
            ? selected.filter((id) => id !== optionId)
            : [...selected, optionId];
        onAnswerChange(question.id, next);
    };

    return (
        <div style={{ fontFamily: FONT }}>
            {number != null && (
                <p className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: BLUE }}>
                    Question {number}
                </p>
            )}
            <p className="text-[17px] sm:text-[18px] font-semibold leading-[1.6] text-[#0F172A] whitespace-pre-line">
                {question.question}
            </p>
            <p className="mt-1.5 text-[13px] text-[#64748B]">
                {single ? "Select one answer." : "Select all that apply."}
            </p>

            <fieldset className="mt-6 space-y-3" aria-label="Answer options">
                {question.options?.map((option, i) => {
                    const checked = selected.includes(option.id);
                    const letter = String.fromCharCode(65 + i);
                    return (
                        <label
                            key={option.id}
                            className={cn(
                                "flex items-start gap-3.5 rounded-xl border-2 px-4 py-3.5 cursor-pointer transition-colors",
                                checked
                                    ? "border-[#3282B8] bg-[#EBF4FB]"
                                    : "border-[#E2E8F0] bg-white hover:border-[#BFDBFE] hover:bg-[#F8FAFC]"
                            )}
                        >
                            <input
                                type={single ? "radio" : "checkbox"}
                                name={`q-${question.id}`}
                                checked={checked}
                                onChange={() => toggle(option.id)}
                                className="sr-only peer"
                            />
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "mt-px w-7 h-7 shrink-0 flex items-center justify-center text-[13px] font-bold border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#3282B8]/40",
                                    single ? "rounded-full" : "rounded-md",
                                    checked
                                        ? "border-[#3282B8] bg-[#3282B8] text-white"
                                        : "border-[#CBD5E1] text-[#64748B] bg-white"
                                )}
                            >
                                {checked && !single ? <Check size={15} strokeWidth={3} /> : letter}
                            </span>
                            <span className="text-[15px] sm:text-[16px] leading-[1.55] text-[#1E293B] pt-0.5">
                                <span className="sr-only">{letter}. </span>
                                {option.option_text}
                            </span>
                        </label>
                    );
                })}
            </fieldset>
        </div>
    );
}

function BarButton({ onClick, disabled, children, active = false, primary = false, label }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={active || undefined}
            className={cn(
                "flex items-center gap-1.5 h-10 px-3.5 sm:px-4 rounded-lg text-[13.5px] sm:text-[14px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                primary
                    ? "bg-[#3282B8] text-white hover:bg-[#2A6FA0]"
                    : active
                      ? "bg-[#F59E0B]/20 text-[#FCD34D]"
                      : "text-white/90 hover:bg-white/10"
            )}
        >
            {children}
        </button>
    );
}

export function ExamBottomBar({ flagged, onToggleFlag, onPrevious, onNext, onNavigator, isFirst, isLast }) {
    return (
        <footer
            className="shrink-0 h-16 px-3 sm:px-6 text-white flex items-center justify-between gap-2"
            style={{ background: NAVY, fontFamily: FONT }}
        >
            <BarButton onClick={onToggleFlag} active={flagged} label="Flag for review">
                <Flag size={16} className={flagged ? "fill-[#FCD34D] text-[#FCD34D]" : ""} />
                <span className="hidden sm:inline">{flagged ? "Flagged for review" : "Flag for review"}</span>
            </BarButton>
            <div className="flex items-center gap-1.5 sm:gap-2">
                <BarButton onClick={onPrevious} disabled={isFirst} label="Previous question">
                    <ChevronLeft size={18} /> <span className="hidden sm:inline">Previous</span>
                </BarButton>
                <BarButton onClick={onNavigator} label="Open question navigator">
                    <LayoutGrid size={16} /> <span className="hidden sm:inline">Navigator</span>
                </BarButton>
                <BarButton onClick={onNext} primary label={isLast ? "Review answers" : "Next question"}>
                    {isLast ? "Review" : "Next"} <ChevronRight size={18} />
                </BarButton>
            </div>
        </footer>
    );
}

/** Review screen: every question with status, filters, jump-to, and End Exam. */
export function ReviewScreen({ questions, answers, flagged, onJump, onClose, onEndExam }) {
    const [filter, setFilter] = useState("all");
    const rows = questions
        .map((q, i) => ({ q, i, answered: isAnswered(answers[q.id]), flagged: flagged.includes(q.id) }))
        .filter((r) => (filter === "incomplete" ? !r.answered : filter === "flagged" ? r.flagged : true));
    const incomplete = questions.filter((q) => !isAnswered(answers[q.id])).length;

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col bg-[#F1F5F9]"
            style={{ fontFamily: FONT }}
            role="dialog"
            aria-modal="true"
            aria-label="Review answers"
        >
            <header
                className="shrink-0 h-16 text-white flex items-center justify-between px-4 sm:px-6"
                style={{ background: NAVY }}
            >
                <div className="flex items-center gap-3 sm:gap-4">
                    <Logo variant="light" height={24} className="hidden sm:inline-flex" />
                    <span className="hidden sm:block w-px h-7 bg-white/20" aria-hidden="true" />
                    <h2 className="text-[16px] sm:text-[17px] font-bold">Review your answers</h2>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Back to the exam"
                    className="p-2 rounded-lg hover:bg-white/10"
                >
                    <X size={20} />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
                <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-7">
                    <p className="text-[14.5px] text-[#334155]">
                        Select a question to go back to it, or choose <strong>End exam</strong> to submit.{" "}
                        {incomplete > 0 && (
                            <>
                                You have <strong className="text-[#B91C1C]">{incomplete}</strong> unanswered
                                question{incomplete > 1 ? "s" : ""}.
                            </>
                        )}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2 text-[13.5px]">
                        {[
                            ["all", `All (${questions.length})`],
                            ["incomplete", `Unanswered (${incomplete})`],
                            ["flagged", `Flagged (${flagged.length})`],
                        ].map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setFilter(key)}
                                aria-pressed={filter === key}
                                className={cn(
                                    "rounded-lg border px-3.5 py-1.5 font-semibold transition-colors",
                                    filter === key
                                        ? "border-[#3282B8] bg-[#3282B8] text-white"
                                        : "border-[#CBD5E1] bg-white text-[#3282B8] hover:bg-[#EBF4FB]"
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {rows.length === 0 ? (
                        <p className="py-8 text-[14px] text-[#64748B]">No questions in this list.</p>
                    ) : (
                        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
                            {rows.map(({ q, i, answered, flagged: isFlagged }) => (
                                <button
                                    key={q.id}
                                    type="button"
                                    onClick={() => onJump(i)}
                                    title={`Question ${i + 1}: ${answered ? "answered" : "unanswered"}${isFlagged ? ", flagged" : ""}`}
                                    className={cn(
                                        "relative h-12 rounded-lg border-2 text-[14px] font-bold transition-colors",
                                        answered
                                            ? "border-[#3282B8] bg-[#EBF4FB] text-[#1E5F8C] hover:bg-[#DBEAFE]"
                                            : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#BFDBFE]"
                                    )}
                                >
                                    {i + 1}
                                    {isFlagged && (
                                        <Flag
                                            size={12}
                                            className="absolute top-1 right-1 fill-[#F59E0B] text-[#F59E0B]"
                                            aria-label="Flagged"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-4 text-[12px] text-[#64748B]">
                        <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded border-2 border-[#3282B8] bg-[#EBF4FB]" />
                            Answered
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded border-2 border-[#E2E8F0] bg-white" />
                            Unanswered
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Flag size={12} className="fill-[#F59E0B] text-[#F59E0B]" /> Flagged
                        </span>
                    </div>
                </div>
            </div>

            <footer
                className="shrink-0 h-16 px-3 sm:px-6 text-white flex items-center justify-end gap-2"
                style={{ background: NAVY }}
            >
                <BarButton onClick={onClose} label="Back to the exam">
                    <ChevronLeft size={18} /> Back to exam
                </BarButton>
                <BarButton onClick={onEndExam} primary label="End exam and submit">
                    End exam
                </BarButton>
            </footer>
        </div>
    );
}
