import { cn } from "@/lib/utils";
import { getPricing, formatMoney } from "@/lib/format";
import { useCurrency } from "@/lib/currency";

/**
 * PriceTag — Free / $149 / $149 ~~$199~~ 25% off, in three sizes.
 *
 * <PriceTag course={course} />               card size
 * <PriceTag course={course} size="lg" />     enroll card
 */
const SIZES = {
    sm: { price: "text-ui", original: "text-small", badge: "text-label px-1.5 py-0.5" },
    md: { price: "text-body", original: "text-small", badge: "text-label px-2 py-0.5" },
    lg: { price: "text-h1 tracking-tight", original: "text-body", badge: "text-small px-2.5 py-1" },
};

export default function PriceTag({ course, size = "md", className }) {
    const currency = useCurrency(); // ₹ in India, $ elsewhere (switchable)
    const p = getPricing(course, currency);
    const s = SIZES[size] || SIZES.md;

    if (p.isFree) {
        return (
            <span className={cn("font-extrabold text-emerald-700 leading-none", s.price, className)}>
                Free
            </span>
        );
    }

    return (
        <span className={cn("inline-flex items-baseline flex-wrap gap-x-2 gap-y-1", className)}>
            <span
                className={cn(
                    "font-extrabold text-primary leading-none",
                    size === "lg" && "text-slate-900",
                    s.price
                )}
            >
                {formatMoney(p.price, p.currency)}
            </span>
            {p.isDiscounted && (
                <>
                    <span className={cn("text-slate-400 line-through leading-none", s.original)}>
                        {formatMoney(p.originalPrice, p.currency)}
                    </span>
                    <span
                        className={cn("font-bold rounded-full bg-rose-50 text-rose-600 self-center", s.badge)}
                    >
                        {p.discountPct}% off
                    </span>
                </>
            )}
        </span>
    );
}
