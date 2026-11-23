/** Small red dot (menus, lead names). */
export default function RedDot({ label = "New", className = "" }) {
    return (
        <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-red-600 ring-2 ring-white ${className}`} role="img" aria-label={label} title={label} />
    );
}

/** Red number badge, like Gmail's "Chat 1" (new leads on the menu). */
export function CountBadge({ count, label, className = "" }) {
    if (!count) return null;
    return (
        <span
            className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-extrabold leading-none text-white ring-2 ring-white ${className}`}
            role="status"
            aria-label={label ?? `${count} new`}
            title={label ?? `${count} new`}
        >
            {count > 99 ? "99+" : count}
        </span>
    );
}
