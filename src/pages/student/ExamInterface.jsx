import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    ChevronRight,
    PlayCircle,
    FileText,
    Clock,
    AlertCircle,
    Flag,
    Send,
} from "lucide-react";
import toast from "react-hot-toast";

import testService from "@/services/testService";
import { showCertificateEarned } from "@/components/shared/CertificateEarnedToast";
import { ExamResults } from "@/components/exam/QuestionRenderer";
import { SubmitExamModal } from "@/components/exam/ExamComponents";
import {
    ExamTopBar,
    ExamBottomBar,
    SimulationQuestion,
    ReviewScreen,
} from "@/components/exam/ExamSimulation";
import { useExamClock, isAnswered } from "@/lib/exam";

export default function ExamInterface() {
    const { courseId, testId } = useParams();
    const navigate = useNavigate();

    // Exam state
    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [flaggedQuestions, setFlaggedQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [attemptId, setAttemptId] = useState(null);

    // UI state
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState(null);
    const [, setTimeLeft] = useState(0);

    useEffect(() => {
        loadExam();
    }, [testId]);

    const loadExam = async () => {
        try {
            setLoading(true);

            // Start exam attempt first to get attempt_id and questions
            const attemptRes = await testService.startAttempt(testId);
            const attemptData = attemptRes.data?.data;

            if (!attemptData) {
                throw new Error("Failed to start exam attempt");
            }

            // Set attempt ID and timer from attempt response
            setAttemptId(attemptData.attempt_id);
            setTimeLeft(attemptData.test.duration * 60); // duration in minutes to seconds

            // Set exam details from attempt response
            setExam(attemptData.test);

            // Set questions from attempt response
            setQuestions(attemptData.questions || []);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load exam");
            navigate(`/student/course/${courseId}/learn`);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionId, answer) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: answer,
        }));
    };

    const handleToggleFlag = (questionId) => {
        setFlaggedQuestions((prev) =>
            prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId]
        );
    };

    const handleSubmitExam = async () => {
        try {
            setSubmitting(true);

            // Convert answers to required API format
            const formattedAnswers = Object.entries(answers).map(([questionId, selectedOpts]) => ({
                question_id: parseInt(questionId),
                selected_opts: Array.isArray(selectedOpts) ? selectedOpts : [selectedOpts],
            }));

            const submitData = {
                attempt_id: attemptId,
                answers: formattedAnswers,
            };

            const resultRes = await testService.submitExam(submitData);
            const resultData = resultRes.data?.data;

            setResults(resultData);
            setShowResults(true);
            toast.success("Exam submitted successfully!");
            showCertificateEarned(resultData?.certificate, navigate, {
                reissued: resultData?.certificate_reissued,
            });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to submit exam");
        } finally {
            setSubmitting(false);
            setShowSubmitModal(false);
        }
    };

    const handleTimeUp = () => {
        toast.error("Time's up! Submitting your exam...");
        handleSubmitExam();
    };

    const handleRetry = () => {
        // Reset state and reload exam
        setAnswers({});
        setFlaggedQuestions([]);
        setCurrentQuestionIndex(0);
        setShowResults(false);
        setResults(null);
        loadExam();
    };

    const handleBackToCourse = () => {
        navigate(`/student/course/${courseId}/learn`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading exam...</p>
                </div>
            </div>
        );
    }

    if (showResults && results) {
        return (
            <div
                className="min-h-screen bg-gray-50"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
                <ExamResults
                    results={results}
                    questions={questions}
                    onRetry={handleRetry}
                    onBackToCourse={handleBackToCourse}
                />
            </div>
        );
    }

    return (
        <ExamScreen
            key={attemptId}
            exam={exam}
            questions={questions}
            answers={answers}
            flaggedQuestions={flaggedQuestions}
            currentQuestionIndex={currentQuestionIndex}
            setCurrentQuestionIndex={setCurrentQuestionIndex}
            onAnswerChange={handleAnswerChange}
            onToggleFlag={handleToggleFlag}
            onTimeUp={handleTimeUp}
            showSubmitModal={showSubmitModal}
            setShowSubmitModal={setShowSubmitModal}
            onSubmit={handleSubmitExam}
            submitting={submitting}
        />
    );
}

// ─── Exam screen (Pearson VUE-style) ──────────────────────────────────────────
function ExamScreen({
    exam,
    questions,
    answers,
    flaggedQuestions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    onAnswerChange,
    onToggleFlag,
    onTimeUp,
    showSubmitModal,
    setShowSubmitModal,
    onSubmit,
    submitting,
}) {
    const [reviewing, setReviewing] = useState(false);
    const minutes = Number(exam.duration ?? exam.duration_minutes) || 0;
    const secondsLeft = useExamClock(minutes, onTimeUp);

    const currentQuestion = questions[currentQuestionIndex];
    const unansweredCount = questions.filter((q) => !isAnswered(answers[q.id])).length;
    const isLast = currentQuestionIndex === questions.length - 1;

    if (!currentQuestion) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F4F4F4] text-[15px] text-[#444]">
                This exam has no questions yet.
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-white">
            <ExamTopBar
                title={exam.title}
                secondsLeft={secondsLeft}
                hasTimer={minutes > 0}
                current={currentQuestionIndex + 1}
                total={questions.length}
            />

            <main className="flex-1 overflow-y-auto bg-[#F4F4F4]">
                <div className="min-h-full bg-white mx-0 sm:mx-3 px-5 sm:px-10 py-7 sm:py-9 shadow-[0_0_0_1px_#E3E3E3]">
                    <SimulationQuestion
                        key={currentQuestion.id}
                        question={currentQuestion}
                        answer={answers[currentQuestion.id]}
                        onAnswerChange={onAnswerChange}
                    />
                </div>
            </main>

            <ExamBottomBar
                flagged={flaggedQuestions.includes(currentQuestion.id)}
                onToggleFlag={() => onToggleFlag(currentQuestion.id)}
                isFirst={currentQuestionIndex === 0}
                isLast={isLast}
                onPrevious={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                onNext={() => (isLast ? setReviewing(true) : setCurrentQuestionIndex((i) => i + 1))}
                onNavigator={() => setReviewing(true)}
            />

            {reviewing && (
                <ReviewScreen
                    questions={questions}
                    answers={answers}
                    flagged={flaggedQuestions}
                    onJump={(i) => {
                        setCurrentQuestionIndex(i);
                        setReviewing(false);
                    }}
                    onClose={() => setReviewing(false)}
                    onEndExam={() => setShowSubmitModal(true)}
                />
            )}

            <SubmitExamModal
                isOpen={showSubmitModal}
                onClose={() => setShowSubmitModal(false)}
                onSubmit={onSubmit}
                unansweredCount={unansweredCount}
                flaggedCount={flaggedQuestions.length}
                isSubmitting={submitting}
            />
        </div>
    );
}
