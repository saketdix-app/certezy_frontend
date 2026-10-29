import { cn } from "@/lib/utils";
import { getPricing, formatMoney } from "@/lib/format";

/**
 * PriceTag — Free / $149 / $149 ~~$199~~ 25% off, in three sizes.
 *
 * <PriceTag course={course} />               card size
 * <PriceTag course={course} size="lg" />     enroll card
 */
const SIZES = {
    sm: { price: "text-[14px]", original: "text-[12px]", badge: "text-[10px] px-1.5 py-0.5" },
    md: { price: "text-[16px]", original: "text-[12.5px]", badge: "text-[10.5px] px-2 py-0.5" },
    lg: { price: "text-[32px] tracking-tight", original: "text-[16px]", badge: "text-[12px] px-2.5 py-1" },
};

export default function PriceTag({ course, size = "md", className }) {
    const p = getPricing(course);
    const s = SIZES[size] || SIZES.md;

    if (p.isFree) {
        return (
            <span className={cn("font-extrabold text-emerald-600 leading-none", s.price, className)}>
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
                {formatMoney(p.price)}
            </span>
            {p.isDiscounted && (
                <>
                    <span className={cn("text-slate-400 line-through leading-none", s.original)}>
                        {formatMoney(p.originalPrice)}
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
