import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
    ["light", "Light", Sun],
    ["dark", "Dark", Moon],
    ["system", "Match my device", Monitor],
];

/** Light / Dark / System switch for the portal headers. */
export default function ThemeToggle({ mode, onChange }) {
    return (
        <div role="group" aria-label="Theme" className="inline-flex rounded-lg border border-slate-200 bg-surface p-0.5">
            {OPTIONS.map(([value, label, Icon]) => (
                <button
                    key={value}
                    type="button"
                    aria-pressed={mode === value}
                    aria-label={label}
                    title={label}
                    onClick={() => onChange(value)}
                    className={cn(
                        "rounded-md p-1.5 transition-colors",
                        mode === value ? "bg-action-soft text-action-soft-ink" : "text-slate-500 hover:text-slate-800"
                    )}
                >
                    <Icon size={15} aria-hidden="true" />
                </button>
            ))}
        </div>
    );
}
