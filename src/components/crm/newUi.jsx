import { cn } from "@/lib/utils";

// Avatar colours: CERTEZY blues with a few warm accents, all readable with white text
const AVATAR = ["#2f6496", "#0f766e", "#7c3aed", "#b45309", "#be123c", "#15803d", "#1d4ed8", "#9333ea", "#c2410c", "#0e7490"];

const initials = (name = "") =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("") || "?";

const colourOf = (name = "") => {
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return AVATAR[h % AVATAR.length];
};

/** Round initials badge in a colour fixed per name. */
export function Avatar({ name, size = 28, className }) {
    return (
        <span
            aria-hidden="true"
            className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white", className)}
            style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: colourOf(name) }}
        >
            {initials(name)}
        </span>
    );
}

/** Big rounded white panel used across the new screens. */
export function Card({ className, children, ...rest }) {
    return (
        <div className={cn("rounded-xl border border-slate-200 bg-surface", className)} {...rest}>
            {children}
        </div>
    );
}

/** Header row of a new-design page: title, record count and actions on the right. */
export function PageHeader({ title, count, sub, children }) {
    return (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
                <h1 className="text-h2 font-extrabold tracking-tight text-slate-900">{title}</h1>
                {(count != null || sub) && (
                    <p className="mt-0.5 text-small text-slate-500">
                        {count != null && `${count.toLocaleString("en-IN")} records`}
                        {count != null && sub && " · "}
                        {sub}
                    </p>
                )}
            </div>
            {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
        </div>
    );
}
