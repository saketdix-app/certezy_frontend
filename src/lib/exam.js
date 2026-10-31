/**
 * exam.js — helpers for the exam screen (ExamSimulation / ExamInterface).
 */
import { useEffect, useRef, useState } from "react";

export const isAnswered = (answer) =>
    Array.isArray(answer) ? answer.length > 0 : answer !== undefined && answer !== null && answer !== "";

export const formatClock = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? `${h}:` : ""}${String(m).padStart(h > 0 ? 2 : 1, "0")}:${String(sec).padStart(2, "0")}`;
};

/** Countdown from `minutes`; calls onTimeUp once at 0. */
export function useExamClock(minutes, onTimeUp) {
    const [left, setLeft] = useState(() => Math.max(0, Math.round((Number(minutes) || 0) * 60)));
    const fired = useRef(false);
    const onTimeUpRef = useRef(onTimeUp);
    useEffect(() => {
        onTimeUpRef.current = onTimeUp;
    }, [onTimeUp]);

    useEffect(() => {
        if (!minutes) return;
        const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(t);
    }, [minutes]);

    useEffect(() => {
        if (minutes && left === 0 && !fired.current) {
            fired.current = true;
            onTimeUpRef.current?.();
        }
    }, [left, minutes]);

    return left;
}
