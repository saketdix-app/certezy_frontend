import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Our named text sizes (index.css --text-*). Without this, tailwind-merge
// takes e.g. "text-ui" for a colour and drops it next to "text-slate-900".
const twMerge = extendTailwindMerge({
    extend: { theme: { text: ["label", "small", "ui", "body", "h3", "h2", "h1", "display"] } },
});

/**
 * cn() — Tailwind class merger utility
 *
 * shadcn/ui ka default helper.
 * Conflicting Tailwind classes ko smartly merge karta hai.
 *
 * Usage:
 *   cn("px-4 py-2", isActive && "bg-primary", className)
 *   cn("text-ui", error && "text-red-500")
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
