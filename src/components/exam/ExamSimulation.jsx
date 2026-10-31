import { useState } from "react";
import { formatClock, isAnswered } from "@/lib/exam";
import { Clock, ListOrdered, Flag, ChevronLeft, ChevronRight, LayoutGrid, X } from "lucide-react";

/**
 * ExamSimulation — Pearson VUE / OnVUE-style exam screen pieces:
 * blue title bar (title · time remaining · "n of N"), plain white question
 * area with square checkboxes / round radios, blue bottom bar with
 * Flag for Review · Previous · Navigator · Next, and a Review screen.
 */

const VUE_FONT = "Arial, 'Helvetica Neue', Helvetica, sans-serif";
const BAR = "linear-gradient(180deg, #2B6CC4 0%, #1F56A8 100%)";

export function ExamTopBar({ title, secondsLeft, current, total, hasTimer }) {
    const warning = hasTimer && secondsLeft <= 300;
    return (
        <header
            className="shrink-0 text-white shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
            style={{ background: BAR, fontFamily: VUE_FONT }}
        >
            <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-2.5">
                <h1 className="text-[18px] sm:text-[20px] font-normal leading-tight pt-0.5 truncate">
                    {title}
                </h1>
                <div className="shrink-0 text-right text-[13px] sm:text-[14px] leading-snug">
                    {hasTimer && (
                        <p
                            className={`flex items-center justify-end gap-1.5 ${warning ? "text-[#FFE08A] font-bold" : ""}`}
                        >
                            <Clock size={15} aria-hidden="true" />
                            <span>
                                Time Remaining{" "}
                                <span className="tabular-nums">{formatClock(secondsLeft)}</span>
                            </span>
                        </p>
                    )}
                    <p className="flex items-center justify-end gap-1.5 mt-0.5">
                        <ListOrdered size={15} aria-hidden="true" />
                        <span className="tabular-nums">
                            {current} of {total}
                        </span>
                    </p>
                </div>
            </div>
        </header>
    );
}

/** Question body — answer contract matches QuestionRenderer: single → id, multiple → [ids]. */
export function SimulationQuestion({ question, answer, onAnswerChange }) {
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
        <div className="max-w-[980px]" style={{ fontFamily: VUE_FONT }}>
            <p className="text-[17px] leading-[1.6] text-[#1A1A1A] whitespace-pre-line">
                {question.question}
            </p>
            <p className="mt-1 text-[14px] italic text-[#555]">
                {single ? "(Select one.)" : "(Select all that apply.)"}
            </p>

            <fieldset className="mt-6 space-y-1" aria-label="Answer options">
                {question.options?.map((option, i) => {
                    const checked = selected.includes(option.id);
                    return (
                        <label
                            key={option.id}
                            className={`flex items-start gap-3.5 rounded px-3 py-2.5 cursor-pointer transition-colors ${
                                checked ? "bg-[#E6EEFA]" : "hover:bg-[#F2F5FA]"
                            }`}
                        >
                            <input
                                type={single ? "radio" : "checkbox"}
                                name={`q-${question.id}`}
                                checked={checked}
                                onChange={() => toggle(option.id)}
                                className={`mt-[3px] h-[17px] w-[17px] shrink-0 cursor-pointer accent-[#1F56A8] ${single ? "" : "rounded-[2px]"}`}
                            />
                            <span className="text-[16px] leading-[1.55] text-[#1A1A1A]">
                                <span className="sr-only">{String.fromCharCode(65 + i)}. </span>
                                {option.option_text}
                            </span>
                        </label>
                    );
                })}
            </fieldset>
        </div>
    );
}

function BarButton({ onClick, disabled, children, active = false, label }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={active || undefined}
            className={`flex items-center gap-1.5 h-full px-4 sm:px-5 text-[14px] sm:text-[15px] border-l border-white/25 first:border-l-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                active ? "bg-white/20 font-bold" : "hover:bg-white/10"
            }`}
        >
            {children}
        </button>
    );
}

export function ExamBottomBar({ flagged, onToggleFlag, onPrevious, onNext, onNavigator, isFirst, isLast }) {
    return (
        <footer
            className="shrink-0 h-12 text-white flex items-stretch justify-between"
            style={{ background: BAR, fontFamily: VUE_FONT }}
        >
            <div className="flex items-stretch">
                <BarButton onClick={onToggleFlag} active={flagged} label="Flag for review">
                    <Flag size={16} className={flagged ? "fill-[#FFD24D] text-[#FFD24D]" : ""} />
                    <span className="hidden sm:inline">
                        {flagged ? "Flagged for Review" : "Flag for Review"}
                    </span>
                </BarButton>
            </div>
            <div className="flex items-stretch">
                <BarButton onClick={onPrevious} disabled={isFirst} label="Previous question">
                    <ChevronLeft size={18} /> <span className="underline underline-offset-2">Previous</span>
                </BarButton>
                <BarButton onClick={onNavigator} label="Open question navigator">
                    <LayoutGrid size={16} />{" "}
                    <span className="hidden sm:inline underline underline-offset-2">Navigator</span>
                </BarButton>
                <BarButton onClick={onNext} label={isLast ? "Review answers" : "Next question"}>
                    <span className="underline underline-offset-2">{isLast ? "Review" : "Next"}</span>{" "}
                    <ChevronRight size={18} />
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
            className="fixed inset-0 z-50 flex flex-col bg-[#F4F4F4]"
            style={{ fontFamily: VUE_FONT }}
            role="dialog"
            aria-modal="true"
            aria-label="Review answers"
        >
            <header
                className="shrink-0 text-white flex items-center justify-between px-5 sm:px-6 py-3"
                style={{ background: BAR }}
            >
                <h2 className="text-[18px] sm:text-[20px]">Review Screen</h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Back to the exam"
                    className="p-1.5 rounded hover:bg-white/10"
                >
                    <X size={20} />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6">
                <p className="text-[15px] text-[#333] max-w-3xl">
                    Below is a summary of your answers. Select a question to go back to it, or choose{" "}
                    <strong>End Exam</strong> to submit.{" "}
                    {incomplete > 0 && (
                        <>
                            You have <strong>{incomplete}</strong> incomplete question
                            {incomplete > 1 ? "s" : ""}.
                        </>
                    )}
                </p>

                <div className="mt-5 flex flex-wrap gap-2 text-[14px]">
                    {[
                        ["all", `Review All (${questions.length})`],
                        ["incomplete", `Review Incomplete (${incomplete})`],
                        ["flagged", `Review Flagged (${flagged.length})`],
                    ].map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setFilter(key)}
                            className={`rounded border px-3 py-1.5 transition-colors ${
                                filter === key
                                    ? "border-[#1F56A8] bg-[#1F56A8] text-white"
                                    : "border-[#B8C4D6] bg-white text-[#1F56A8] hover:bg-[#EEF3FB]"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 border-t border-[#D5D5D5]">
                    {rows.length === 0 && (
                        <p className="py-6 text-[14px] text-[#666]">No questions in this list.</p>
                    )}
                    {rows.map(({ q, i, answered, flagged: isFlagged }) => (
                        <button
                            key={q.id}
                            type="button"
                            onClick={() => onJump(i)}
                            className="flex items-center gap-3 border-b border-[#E2E2E2] py-2.5 px-1 text-left hover:bg-white"
                        >
                            <Flag
                                size={14}
                                className={isFlagged ? "fill-[#E5A800] text-[#E5A800]" : "text-transparent"}
                                aria-label={isFlagged ? "Flagged" : undefined}
                            />
                            <span className="w-24 shrink-0 text-[14px] text-[#1F56A8] underline underline-offset-2">
                                Question {i + 1}
                            </span>
                            <span
                                className={`text-[13px] ${answered ? "text-[#2E7D32]" : "font-bold text-[#B3261E]"}`}
                            >
                                {answered ? "Complete" : "Incomplete"}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <footer
                className="shrink-0 h-12 text-white flex items-stretch justify-end"
                style={{ background: BAR }}
            >
                <BarButton onClick={onClose} label="Back to the exam">
                    <ChevronLeft size={18} />{" "}
                    <span className="underline underline-offset-2">Back to Exam</span>
                </BarButton>
                <BarButton onClick={onEndExam} label="End exam and submit">
                    <span className="font-bold underline underline-offset-2">End Exam</span>
                </BarButton>
            </footer>
        </div>
    );
}
