import { formatDuration } from "@/lib/format";
import CourseThumbnail from "@/components/shared/CourseThumbnail";
import { Clock, BarChart2, BookOpen, Award, CheckCircle2 } from "lucide-react";
import { SectionTitle } from "./PaymentMethod";

// total_duration is in seconds
const fmtDuration = (seconds) => formatDuration(seconds) || "Self-paced";

export default function OrderSummary({ course, paymentAmount, paymentCurrency, currency = "USD" }) {
    // Format price using backend values
    const formatPrice = (amount, currency) => {
        if (amount == null || !currency) {
            return currency === "INR" ? "₹..." : "$...";
        }

        return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
            style: "currency",
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    // With a discount link: list price, the discount, and the discounted total
    const inr = currency === "INR" && Number(course?.price_inr) > 0;
    const cur = inr ? "INR" : "USD";
    const base = inr ? course?.price_inr : course?.price;
    const offer = inr ? course?.discount_price_inr : course?.discount_price;
    const hasDiscount = offer != null && Number(offer) < Number(base);
    const listPrice = base != null ? formatPrice(Number(base), cur) : "—";
    const saving = hasDiscount ? formatPrice(Number(base) - Number(offer), cur) : null;
    const displayPrice = paymentAmount
        ? formatPrice(paymentAmount, paymentCurrency)
        : base != null
          ? formatPrice(Number(hasDiscount ? offer : base), cur)
          : "—";

    const meta = [
        {
            icon: BarChart2,
            label: course.level ? course.level.charAt(0).toUpperCase() + course.level.slice(1) : "All levels",
        },
        { icon: Clock, label: fmtDuration(course.total_duration) },
        { icon: BookOpen, label: `${course.total_lessons || 0} lessons` },
        ...(course.certificate_eligible === 1 ? [{ icon: Award, label: "Certificate included" }] : []),
    ];

    return (
        <div className="w-full lg:w-[320px] shrink-0 bg-white rounded-2xl overflow-hidden border border-[#EEF2F7]">
            {/* Thumbnail */}
            <CourseThumbnail
                src={course.thumbnail}
                title={course.title}
                category={course.category_name}
                categorySlug={course.category_slug}
                loading="eager"
            />

            <div className="p-5 space-y-4">
                <SectionTitle title="Order Summary" />

                <p className="text-[14px] font-bold text-slate-900 leading-snug">{course.title}</p>

                <div className="space-y-2">
                    {meta.map(({ icon: Icon, label }) => (
                        <div key={label} className="flex items-center gap-2.5">
                            <Icon size={13} className="text-[#3282B8] shrink-0" />
                            <span className="text-[12.5px] text-slate-500">{label}</span>
                        </div>
                    ))}
                </div>

                <div className="h-px bg-slate-100" />

                {/* Price */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[13px] text-slate-500">Course price</span>
                        <span
                            className={`text-[13px] font-semibold ${hasDiscount ? "text-slate-400 line-through" : "text-slate-900"}`}
                        >
                            {hasDiscount ? listPrice : displayPrice}
                        </span>
                    </div>
                    {hasDiscount && (
                        <div className="flex items-center justify-between">
                            <span className="text-[13px] font-semibold text-emerald-700">
                                Your special offer
                            </span>
                            <span className="text-[13px] font-bold text-emerald-700">−{saving}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-[14px] font-bold text-slate-900">Total</span>
                        <span className="text-[18px] font-extrabold text-slate-900">{displayPrice}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    <span className="text-[11.5px] text-slate-500">30-day money-back guarantee</span>
                </div>
            </div>
        </div>
    );
}
