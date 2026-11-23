/** Small red dot (menus, lead names). */
export default function RedDot({ label = "New", className = "" }) {
    return (
        <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-red-600 ring-2 ring-white ${className}`} role="img" aria-label={label} title={label} />
    );
}
