import { useState } from "react";
import { ChevronDown, ChevronUp, Info, CheckCircle2, AlertCircle } from "lucide-react";

// Only "multiple" questions take several answers; "single" and "true_false" take one
const isSingleChoice = (question) => question.type !== "multiple";

export function QuestionRenderer({
    question,
    answer,
    onAnswerChange,
    showExplanation = false,
    isReview = false,
}) {
    const [selectedOptions, setSelectedOptions] = useState(
        answer ? (Array.isArray(answer) ? answer : [answer]) : []
    );

    const handleOptionChange = (optionId, isSelected) => {
        let newSelected;

        if (isSingleChoice(question)) {
            newSelected = isSelected ? [optionId] : [];
        } else {
            newSelected = isSelected
                ? [...selectedOptions, optionId]
                : selectedOptions.filter((id) => id !== optionId);
        }

        setSelectedOptions(newSelected);
        onAnswerChange(question.id, isSingleChoice(question) ? newSelected[0] : newSelected);
    };

    const renderOptions = () => {
        const options = question.options || [];

        return options.map((option, index) => {
            const isSelected = selectedOptions.includes(option.id);
            const isCorrect = showExplanation && option.is_correct;
            const isWrong = showExplanation && isSelected && !option.is_correct;

            return (
                <label
                    key={option.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isReview
                            ? isCorrect
                                ? "bg-green-50 border-green-300"
                                : isWrong
                                  ? "bg-red-50 border-red-300"
                                  : "bg-gray-50 border-gray-200"
                            : isSelected
                              ? "bg-blue-50 border-blue-300"
                              : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                >
                    <input
                        type={isSingleChoice(question) ? "radio" : "checkbox"}
                        name={`question-${question.id}`}
                        value={option.id}
                        checked={isSelected}
                        onChange={(e) => handleOptionChange(option.id, e.target.checked)}
                        disabled={isReview}
                        className="mt-1"
                    />
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                                {String.fromCharCode(65 + index)}.
                            </span>
                            <span className="text-gray-800">{option.option_text}</span>
                        </div>
                        {isReview && isCorrect && (
                            <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                                <CheckCircle2 size={14} />
                                <span>Correct answer</span>
                            </div>
                        )}
                    </div>
                </label>
            );
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Question Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-start gap-3">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 leading-relaxed">
                            {question.question}
                        </h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-medium">
                                {question.type === "true_false"
                                    ? "True / False"
                                    : isSingleChoice(question)
                                      ? "Single Choice"
                                      : "Multiple Choice"}
                            </span>
                            {question.difficulty && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md">
                                    {question.difficulty}
                                </span>
                            )}
                            {question.topic_tag && (
                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md">
                                    {question.topic_tag}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Options */}
            <div className="p-6 space-y-3">{renderOptions()}</div>

            {/* Explanation */}
            {showExplanation && question.explanation && (
                <div className="px-6 pb-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info size={16} className="text-blue-600 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-blue-900 mb-1">Explanation</h4>
                                <p className="text-blue-800 text-sm leading-relaxed">
                                    {question.explanation}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function ExamResults({ results, questions, onRetry, onBackToCourse }) {
    // The API scores every question in the test: score is a percentage,
    // obtained_marks / total_marks the counts, pass mark is the test's own.
    const percentage = Math.round(Number(results.score) || 0);
    const totalQuestions = results.total_marks ?? questions.length;
    const correctCount = results.obtained_marks ?? 0;
    const passMark = results.pass_percentage ?? 70;
    const passed = results.is_passed ?? percentage >= passMark;
    const reviewByQuestion = new Map((results.review ?? []).map((r) => [r.question_id, r]));

    const getGradeColor = (percentage) => {
        if (percentage >= 90) return "text-green-600";
        if (percentage >= 70) return "text-blue-600";
        if (percentage >= 50) return "text-yellow-600";
        return "text-red-600";
    };

    const getGradeLabel = (percentage) => {
        if (percentage >= 90) return "Excellent";
        if (percentage >= 70) return "Good";
        if (percentage >= 50) return "Average";
        return "Needs Improvement";
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Results Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                <div
                    className={`px-6 py-8 text-center ${
                        passed
                            ? "bg-gradient-to-r from-green-50 to-emerald-50"
                            : "bg-gradient-to-r from-red-50 to-pink-50"
                    }`}
                >
                    <div
                        className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                            passed ? "bg-green-100" : "bg-red-100"
                        }`}
                    >
                        {passed ? (
                            <CheckCircle2 size={40} className="text-green-600" />
                        ) : (
                            <AlertCircle size={40} className="text-red-600" />
                        )}
                    </div>
                    <h2 className={`text-3xl font-bold mb-2 ${passed ? "text-green-900" : "text-red-900"}`}>
                        {passed ? "Congratulations!" : "Exam Failed"}
                    </h2>
                    <p className={`text-lg mb-6 ${passed ? "text-green-700" : "text-red-700"}`}>
                        {passed ? "You have passed the exam!" : "You did not meet the passing criteria."}{" "}
                        <span className="whitespace-nowrap">(Pass mark: {passMark}%)</span>
                    </p>

                    {/* Score Display */}
                    <div className="flex items-center justify-center gap-8 mb-6">
                        <div className="text-center">
                            <div className={`text-4xl font-bold ${getGradeColor(percentage)}`}>
                                {percentage}%
                            </div>
                            <div className="text-sm text-gray-600 mt-1">Score</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                                {correctCount}/{totalQuestions}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">Correct</div>
                        </div>
                        <div className="text-center">
                            <div className={`text-lg font-semibold ${getGradeColor(percentage)}`}>
                                {getGradeLabel(percentage)}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">Grade</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Question Review */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Question Review</h3>
                </div>
                <div className="divide-y divide-gray-200">
                    {questions.map((question, index) => {
                        const review = reviewByQuestion.get(question.id);
                        const userAnswer = review?.selected_opts ?? [];
                        const correctOptions = review?.correct_opts ?? [];
                        const isCorrect = !!review?.is_correct;
                        const skipped = userAnswer.length === 0;

                        return (
                            <div key={question.id} className="p-6">
                                <div className="flex items-start gap-3">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            isCorrect
                                                ? "bg-green-100 text-green-600"
                                                : "bg-red-100 text-red-600"
                                        }`}
                                    >
                                        {isCorrect ? "✓" : "✗"}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-medium text-gray-900">
                                                Question {index + 1}
                                            </span>
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-medium ${
                                                    isCorrect
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-red-100 text-red-700"
                                                }`}
                                            >
                                                {isCorrect
                                                    ? "Correct"
                                                    : skipped
                                                      ? "Not answered"
                                                      : "Incorrect"}
                                            </span>
                                        </div>
                                        <p className="text-gray-800 mb-3">{question.question}</p>

                                        {/* Options */}
                                        <div className="space-y-2">
                                            {question.options?.map((option) => {
                                                const isSelected = userAnswer.includes(option.id);
                                                const isCorrectOption = correctOptions.includes(option.id);

                                                return (
                                                    <div
                                                        key={option.id}
                                                        className={`flex items-center gap-2 p-2 rounded ${
                                                            isCorrectOption
                                                                ? "bg-green-50 border border-green-200"
                                                                : isSelected && !isCorrectOption
                                                                  ? "bg-red-50 border border-red-200"
                                                                  : "bg-gray-50"
                                                        }`}
                                                    >
                                                        <span className="text-sm font-medium">
                                                            {String.fromCharCode(
                                                                65 + question.options.indexOf(option)
                                                            )}
                                                            .
                                                        </span>
                                                        <span className="text-sm">{option.option_text}</span>
                                                        {isSelected && (
                                                            <span className="ml-auto text-xs font-medium text-gray-500">
                                                                Your answer
                                                            </span>
                                                        )}
                                                        {isCorrectOption && (
                                                            <CheckCircle2
                                                                size={14}
                                                                className={`text-green-600 ${isSelected ? "" : "ml-auto"}`}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {question.explanation && (
                                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                                                <div className="flex items-start gap-2">
                                                    <Info size={14} className="text-blue-600 mt-0.5" />
                                                    <div>
                                                        <span className="font-medium text-blue-900 text-sm">
                                                            Explanation:{" "}
                                                        </span>
                                                        <span className="text-blue-800 text-sm">
                                                            {question.explanation}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mt-6">
                {!passed && onRetry && (
                    <button
                        onClick={onRetry}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Retry Exam
                    </button>
                )}
                <button
                    onClick={onBackToCourse}
                    className={`px-6 py-3 rounded-lg transition-colors font-medium ${
                        passed && !onRetry
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                >
                    Back to Course
                </button>
            </div>
        </div>
    );
}
