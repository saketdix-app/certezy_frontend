import { useState } from "react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/format";

/**
 * CourseThumbnail — one consistent course image everywhere (cards, detail,
 * checkout, dashboards, admin tables).
 *
 *  - Fixed aspect ratio box (16:9 by default) so cards never jump or stretch
 *  - `fit="cover"` crops to fill; `fit="contain"` shows the whole image over a
 *    blurred copy of itself (good for logos / badges / odd-sized uploads)
 *  - Broken or missing image → category gradient with course initials
 *
 * <CourseThumbnail src={c.thumbnail} title={c.title} category={c.category_name} categorySlug={c.category_slug} />
 * <CourseThumbnail src={...} className="w-16" ratio="1/1" compact />   → small square for tables
 */

const CATEGORY_GRADIENTS = {
    "cloud-computing": ["#0EA5E9", "#0369A1"],
    "cyber-security": ["#EF4444", "#991B1B"],
    devops: ["#8B5CF6", "#5B21B6"],
    "data-science": ["#10B981", "#065F46"],
    "project-management": ["#F59E0B", "#92400E"],
    networking: ["#3B82F6", "#1E3A8A"],
    "it-service-management": ["#EC4899", "#9D174D"],
    "software-development": ["#14B8A6", "#134E4A"],
};
const DEFAULT_GRADIENT = ["#3282B8", "#0a1628"];

export default function CourseThumbnail({
    src,
    title = "",
    category,
    categorySlug,
    ratio = "16/9",
    fit = "cover",
    compact = false,
    zoomOnHover = false,
    className,
    imgClassName,
    children,
    loading = "lazy",
}) {
    const [failed, setFailed] = useState(false);
    const showImage = src && !failed;
    const [from, to] = CATEGORY_GRADIENTS[categorySlug] || DEFAULT_GRADIENT;

    return (
        <div
            className={cn("relative overflow-hidden bg-slate-100 shrink-0", className)}
            style={{ aspectRatio: ratio }}
        >
            {showImage ? (
                <>
                    {fit === "contain" && (
                        <img
                            src={src}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60"
                        />
                    )}
                    <img
                        src={src}
                        alt={title}
                        loading={loading}
                        decoding="async"
                        onError={() => setFailed(true)}
                        className={cn(
                            "absolute inset-0 w-full h-full",
                            fit === "contain" ? "object-contain" : "object-cover object-center",
                            zoomOnHover && "transition-transform duration-500 group-hover:scale-105",
                            imgClassName
                        )}
                    />
                </>
            ) : (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center text-center px-2"
                    style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
                    aria-label={title}
                >
                    <div
                        className="absolute inset-0 opacity-[0.07]"
                        style={{
                            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
                            backgroundSize: "18px 18px",
                        }}
                    />
                    <span
                        className={cn(
                            "relative font-extrabold text-white/90 tracking-tight",
                            compact ? "text-[13px]" : "text-[30px]"
                        )}
                    >
                        {getInitials(title) || "C"}
                    </span>
                    {!compact && category && (
                        <span className="relative mt-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white/60 line-clamp-1">
                            {category}
                        </span>
                    )}
                </div>
            )}
            {children}
        </div>
    );
}
