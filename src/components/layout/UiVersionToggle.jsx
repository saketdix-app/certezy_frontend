import { Sparkles, Undo2 } from "lucide-react";
import { setUiVersion, useUiVersion } from "@/lib/uiVersion";
import { cn } from "@/lib/utils";

/** Header switch between the new CRM design and the classic one. */
export default function UiVersionToggle({ className }) {
    const v = useUiVersion();
    const isNew = v === "new";
    return (
        <button
            type="button"
            onClick={() => setUiVersion(isNew ? "classic" : "new")}
            title={isNew ? "Go back to the classic design" : "Try the new design"}
            className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-small font-semibold transition-colors",
                isNew
                    ? "border-slate-200 bg-surface text-slate-600 hover:border-action hover:text-action"
                    : "border-action bg-action-soft text-action-soft-ink hover:bg-action hover:text-white",
                className
            )}
        >
            {isNew ? <Undo2 size={14} aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
            <span className="hidden sm:inline">{isNew ? "Classic design" : "Try new design"}</span>
        </button>
    );
}
