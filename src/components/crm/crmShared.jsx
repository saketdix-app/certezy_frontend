import { cn } from "@/lib/utils";
import { STAGE_CLASS, STAGE_LABEL } from "@/lib/crm";

export function StageBadge({ stage, className }) {
    return (
        <span
            className={cn(
                "inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11.5px] font-semibold",
                STAGE_CLASS[stage],
                className
            )}
        >
            {STAGE_LABEL[stage] ?? stage}
        </span>
    );
}

export function CrmModal({ title, onClose, children, wide }) {
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={cn(
                    "max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6",
                    wide ? "sm:max-w-2xl" : "sm:max-w-md"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 flex items-start justify-between gap-3">
                    <h2 className="text-[17px] font-bold text-slate-900">{title}</h2>
                    <button type="button" onClick={onClose} aria-label="Close" className="px-1 text-[20px] leading-none text-slate-500 hover:text-slate-600">
                        ×
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
