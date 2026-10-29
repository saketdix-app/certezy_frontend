import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * StarRating — read-only stars with fractional fill (4.5 shows four and a half).
 *
 * <StarRating value={4.6} size={14} />
 * <StarRating value={4.6} count={1234} showValue />            → ★★★★½ 4.6 (1,234)
 * <StarRating value={4.6} tone="dark" />                        → for dark backgrounds
 */
export default function StarRating({
    value = 0,
    count,
    size = 14,
    showValue = false,
    tone = "light",
    className,
    emptyLabel = "New",
}) {
    const rating = Math.max(0, Math.min(5, Number(value) || 0));
    const empty = tone === "dark" ? "text-white/25 fill-white/25" : "text-slate-200 fill-slate-200";
    const valueColor = tone === "dark" ? "text-white" : "text-slate-900";
    const countColor = tone === "dark" ? "text-white/50" : "text-slate-400";

    return (
        <div
            className={cn("inline-flex items-center gap-1.5", className)}
            role="img"
            aria-label={rating > 0 ? `Rated ${rating.toFixed(1)} out of 5` : "Not rated yet"}
        >
            <div className="flex items-center gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => {
                    const fill = Math.max(0, Math.min(1, rating - i)); // 0..1 for this star
                    return (
                        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
                            <Star size={size} className={cn("absolute inset-0", empty)} />
                            {fill > 0 && (
                                <span
                                    className="absolute inset-0 overflow-hidden"
                                    style={{ width: `${fill * 100}%` }}
                                >
                                    <Star size={size} className="text-amber-400 fill-amber-400" />
                                </span>
                            )}
                        </span>
                    );
                })}
            </div>
            {showValue && (
                <span className={cn("font-bold leading-none", valueColor)} style={{ fontSize: size * 0.95 }}>
                    {rating > 0 ? rating.toFixed(1) : emptyLabel}
                </span>
            )}
            {count > 0 && (
                <span className={cn("leading-none", countColor)} style={{ fontSize: size * 0.85 }}>
                    ({Number(count).toLocaleString()})
                </span>
            )}
        </div>
    );
}

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

/** RatingInput — accessible 1–5 star picker (keyboard: arrow keys / 1–5). */
export function RatingInput({ value = 0, onChange, size = 28, disabled = false }) {
    const [hover, setHover] = useState(0);
    const shown = hover || value;

    const onKeyDown = (e) => {
        if (disabled) return;
        if (["ArrowRight", "ArrowUp"].includes(e.key)) onChange(Math.min(5, (value || 0) + 1));
        else if (["ArrowLeft", "ArrowDown"].includes(e.key)) onChange(Math.max(1, (value || 1) - 1));
        else if (/^[1-5]$/.test(e.key)) onChange(Number(e.key));
        else return;
        e.preventDefault();
    };

    return (
        <div className="flex flex-col items-center gap-1.5">
            <div
                role="radiogroup"
                aria-label="Your rating"
                tabIndex={disabled ? -1 : 0}
                onKeyDown={onKeyDown}
                className="flex items-center gap-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                onMouseLeave={() => setHover(0)}
            >
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        role="radio"
                        aria-checked={value === star}
                        aria-label={`${star} star${star > 1 ? "s" : ""} — ${LABELS[star]}`}
                        tabIndex={-1}
                        disabled={disabled}
                        onClick={() => onChange(star)}
                        onMouseEnter={() => setHover(star)}
                        className="p-1 transition-transform hover:scale-110 disabled:cursor-not-allowed"
                    >
                        <Star
                            size={size}
                            className={
                                star <= shown
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-300 fill-transparent"
                            }
                        />
                    </button>
                ))}
            </div>
            <span className="text-[12.5px] font-semibold text-slate-500 h-4">{LABELS[shown]}</span>
        </div>
    );
}
