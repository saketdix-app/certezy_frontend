import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/** Clamps long content to `maxHeight` px with a fade and a Show more / Show less toggle. */
export default function ShowMore({ children, maxHeight = 220 }) {
    const ref = useRef(null);
    const [open, setOpen] = useState(false);
    const [overflows, setOverflows] = useState(false);

    useLayoutEffect(() => {
        if (ref.current) setOverflows(ref.current.scrollHeight > maxHeight + 24);
    }, [children, maxHeight]);

    return (
        <div>
            <div
                ref={ref}
                className="relative overflow-hidden transition-[max-height] duration-300"
                style={{ maxHeight: open || !overflows ? "none" : maxHeight }}
            >
                {children}
                {overflows && !open && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
                )}
            </div>
            {overflows && (
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className="mt-2 flex items-center gap-1 text-[13px] font-bold text-primary hover:underline"
                >
                    {open ? "Show less" : "Show more"}
                    {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
            )}
        </div>
    );
}
