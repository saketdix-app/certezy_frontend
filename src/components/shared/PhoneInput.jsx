import { useState } from "react";
import { isIndiaVisitor } from "@/lib/currency";
import { cn } from "@/lib/utils";

/**
 * PhoneInput — country code + digits-only number, stored as E.164 ("+919876543210").
 *
 * <PhoneInput value={form.mobile} onChange={(e164) => setForm({ ...form, mobile: e164 })} />
 *
 * "Other" lets any country code be typed in.
 */
const COUNTRIES = [
    ["IN", "India", "91"],
    ["US", "United States", "1"],
    ["CA", "Canada", "1"],
    ["GB", "United Kingdom", "44"],
    ["AE", "United Arab Emirates", "971"],
    ["SA", "Saudi Arabia", "966"],
    ["QA", "Qatar", "974"],
    ["KW", "Kuwait", "965"],
    ["OM", "Oman", "968"],
    ["BH", "Bahrain", "973"],
    ["SG", "Singapore", "65"],
    ["MY", "Malaysia", "60"],
    ["AU", "Australia", "61"],
    ["NZ", "New Zealand", "64"],
    ["IE", "Ireland", "353"],
    ["DE", "Germany", "49"],
    ["FR", "France", "33"],
    ["NL", "Netherlands", "31"],
    ["IT", "Italy", "39"],
    ["ES", "Spain", "34"],
    ["CH", "Switzerland", "41"],
    ["SE", "Sweden", "46"],
    ["ZA", "South Africa", "27"],
    ["NG", "Nigeria", "234"],
    ["KE", "Kenya", "254"],
    ["PK", "Pakistan", "92"],
    ["BD", "Bangladesh", "880"],
    ["NP", "Nepal", "977"],
    ["LK", "Sri Lanka", "94"],
    ["PH", "Philippines", "63"],
    ["ID", "Indonesia", "62"],
    ["JP", "Japan", "81"],
    ["HK", "Hong Kong", "852"],
    ["BR", "Brazil", "55"],
    ["MX", "Mexico", "52"],
];

// Longest matching code first ("+971…" is UAE, not "+97…")
const BY_CODE_LENGTH = [...COUNTRIES].sort((a, b) => b[2].length - a[2].length);

const parse = (value) => {
    const digits = String(value || "").replace(/[^\d+]/g, "");
    if (digits.startsWith("+")) {
        const rest = digits.slice(1);
        const match = BY_CODE_LENGTH.find(([, , code]) => rest.startsWith(code));
        if (match) return { iso: match[0], code: match[2], number: rest.slice(match[2].length) };
        return { iso: "OTHER", code: rest.slice(0, 3), number: rest.slice(3) };
    }
    const fallback = isIndiaVisitor() ? COUNTRIES[0] : COUNTRIES[1];
    // Old free-text values (e.g. "h3iu4h3") start empty rather than as stray digits
    const local = digits.replace(/\D/g, "");
    const plausible = local.length >= 6 && /^[\d\s()+-]+$/.test(String(value || ""));
    return { iso: fallback[0], code: fallback[2], number: plausible ? local : "" };
};

export default function PhoneInput({ value, onChange, className = "", inputClassName = "" }) {
    const [state, setState] = useState(() => parse(value));

    const emit = (next) => {
        setState(next);
        onChange?.(next.number ? `+${next.code}${next.number}` : "");
    };

    return (
        <div className={cn("flex gap-2", className)}>
            <select
                aria-label="Country code"
                value={state.iso}
                onChange={(e) => {
                    const iso = e.target.value;
                    const c = COUNTRIES.find(([i]) => i === iso);
                    emit({ ...state, iso, code: c ? c[2] : state.code });
                }}
                className={cn(inputClassName, "w-[132px] shrink-0 cursor-pointer")}
            >
                {COUNTRIES.map(([iso, name, code]) => (
                    <option key={iso} value={iso}>
                        {iso} +{code} — {name}
                    </option>
                ))}
                <option value="OTHER">Other…</option>
            </select>

            {state.iso === "OTHER" && (
                <div className={cn(inputClassName, "w-[78px] shrink-0 flex items-center gap-0.5")}>
                    <span className="text-slate-400">+</span>
                    <input
                        aria-label="Country code number"
                        inputMode="numeric"
                        value={state.code}
                        onChange={(e) =>
                            emit({ ...state, code: e.target.value.replace(/\D/g, "").slice(0, 4) })
                        }
                        className="w-full bg-transparent outline-none"
                        placeholder="code"
                    />
                </div>
            )}

            <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                aria-label="Mobile number"
                value={state.number}
                onChange={(e) => emit({ ...state, number: e.target.value.replace(/\D/g, "").slice(0, 14) })}
                className={cn(inputClassName, "flex-1 min-w-0")}
                placeholder={state.iso === "IN" ? "98765 43210" : "Mobile number"}
            />
        </div>
    );
}
