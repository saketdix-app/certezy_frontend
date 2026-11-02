import { useCurrency, setCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

/** ₹ / $ toggle — India sees rupees by default, everyone else dollars. */
export default function CurrencySwitch({ className }) {
    const currency = useCurrency();
    return (
        <div
            role="group"
            aria-label="Currency"
            className={cn(
                "flex items-center rounded-full bg-[#F5F7FA] p-0.5 text-[12px] font-bold",
                className
            )}
        >
            {[
                ["INR", "₹ INR"],
                ["USD", "$ USD"],
            ].map(([code, label]) => (
                <button
                    key={code}
                    type="button"
                    onClick={() => setCurrency(code)}
                    aria-pressed={currency === code}
                    className={cn(
                        "rounded-full px-2.5 py-1 transition-colors",
                        currency === code
                            ? "bg-white text-primary shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
