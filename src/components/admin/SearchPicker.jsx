import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

const inputCls =
    "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13.5px] text-slate-800 outline-none focus:border-[#3282B8] focus:bg-white transition-colors";

/**
 * SearchPicker — a text box that searches as you type and shows matches below.
 *
 * <SearchPicker
 *     placeholder="Search students…"
 *     load={(query) => Promise<items[]>}      // each item needs an `id`
 *     renderItem={(item) => <span>{item.name}</span>}
 *     onSelect={(item) => …}
 *     emptyText="No matches"
 * />
 */
// ─── Searchable picker (type to search, click or Enter to choose) ─────────────

export default function SearchPicker({
    placeholder,
    icon: Icon = Search,
    load,
    renderItem,
    onSelect,
    emptyText,
}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [loadedFor, setLoadedFor] = useState(null);
    const [active, setActive] = useState(0);
    const boxRef = useRef(null);
    const q = useDebounce(query.trim(), 300);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        load(q)
            .then((list) => !cancelled && (setItems(list), setActive(0)))
            .catch(() => !cancelled && setItems([]))
            .finally(() => !cancelled && setLoadedFor(q));
        return () => {
            cancelled = true;
        };
    }, [q, open, load]);

    useEffect(() => {
        const close = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    const loading = loadedFor !== q;

    const choose = (item) => {
        onSelect(item);
        setQuery("");
        setOpen(false);
    };

    return (
        <div ref={boxRef} className="relative">
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
                type="text"
                role="combobox"
                aria-expanded={open}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setOpen(true);
                        setActive((a) => Math.min(a + 1, items.length - 1));
                    } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setActive((a) => Math.max(a - 1, 0));
                    } else if (e.key === "Enter") {
                        // never submits the form; picks the highlighted match
                        e.preventDefault();
                        if (!loading && items[active]) choose(items[active]);
                    } else if (e.key === "Escape") {
                        setOpen(false);
                    }
                }}
                placeholder={placeholder}
                className={cn(inputCls, "pl-10 pr-9")}
            />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            {open && (
                <ul
                    role="listbox"
                    className="absolute z-30 mt-1.5 w-full max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1"
                >
                    {loading && items.length === 0 ? (
                        <li className="px-4 py-3 text-[13px] text-slate-400 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Searching…
                        </li>
                    ) : items.length === 0 ? (
                        <li className="px-4 py-3 text-[13px] text-slate-400">{emptyText}</li>
                    ) : (
                        items.map((item, i) => (
                            <li
                                key={item.id}
                                role="option"
                                aria-selected={i === active}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    choose(item);
                                }}
                                onMouseEnter={() => setActive(i)}
                                className={cn("px-3 py-2 cursor-pointer", i === active && "bg-[#EBF4FF]")}
                            >
                                {renderItem(item)}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}
