import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, Info, Loader2, Users } from "lucide-react";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import { inputCls } from "@/lib/crm";
import { PERIODS } from "./reportUtils";

/** Shared pieces of CRM → Reports: period picker (IST days), people filter, sortable table, CSV. */

/** Period + people filter; calls onChange({ from, to, user_ids }). */
export function ReportFilters({ value, onChange, children }) {
    const [owners, setOwners] = useState([]);
    useEffect(() => {
        crmService
            .owners()
            .then(({ data: res }) => setOwners((res.data ?? []).filter((o) => o.role === "consultant")))
            .catch(() => {});
    }, []);
    const set = (patch) => onChange({ ...value, ...patch });
    const chosen = value.user_ids ? value.user_ids.split(",").map(Number) : [];
    const toggle = (id) => {
        const next = chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id];
        set({ user_ids: next.join("") ? next.join(",") : "" });
    };
    return (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-surface p-3">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Period">
                {PERIODS.map(([key, label, range]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => {
                            const [from, to] = range();
                            set({ period: key, from, to });
                        }}
                        aria-pressed={value.period === key}
                        className={cn(
                            "rounded-full border px-3 py-1.5 text-small font-semibold",
                            value.period === key ? "border-action bg-action text-white" : "border-slate-200 text-slate-600 hover:border-action"
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <span className="inline-flex items-center gap-1.5">
                <input type="date" value={value.from} max={value.to} onChange={(e) => set({ period: "custom", from: e.target.value })} className={cn(inputCls, "w-auto py-1.5")} aria-label="From date" />
                <span className="text-slate-400">–</span>
                <input type="date" value={value.to} min={value.from} onChange={(e) => set({ period: "custom", to: e.target.value })} className={cn(inputCls, "w-auto py-1.5")} aria-label="To date" />
            </span>
            <details className="relative">
                <summary className={cn("inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border px-3 py-1.5 text-small font-semibold [&::-webkit-details-marker]:hidden", chosen.length ? "border-action bg-action-soft text-action-soft-ink" : "border-slate-200 text-slate-700")}>
                    <Users size={14} aria-hidden="true" /> {chosen.length ? `${chosen.length} consultant${chosen.length > 1 ? "s" : ""}` : "All consultants"}
                </summary>
                <div className="absolute left-0 z-30 mt-1 max-h-72 w-60 overflow-auto rounded-xl border border-slate-200 bg-surface p-2 shadow-lg">
                    {chosen.length > 0 && (
                        <button type="button" onClick={() => set({ user_ids: "" })} className="mb-1 w-full rounded-md px-2 py-1 text-left text-small font-semibold text-action hover:bg-slate-50">
                            Show everyone
                        </button>
                    )}
                    {owners.map((o) => (
                        <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-ui text-slate-700 hover:bg-slate-50">
                            <input type="checkbox" checked={chosen.includes(o.id)} onChange={() => toggle(o.id)} className="accent-action" />
                            {o.name}
                        </label>
                    ))}
                    {!owners.length && <p className="px-2 py-1 text-small text-slate-500">No consultants yet.</p>}
                </div>
            </details>
            {children}
        </div>
    );
}

export function ExportButton({ onClick, disabled }) {
    return (
        <button type="button" onClick={onClick} disabled={disabled} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-small font-semibold text-slate-700 hover:border-action disabled:opacity-50">
            <Download size={14} aria-hidden="true" /> Export CSV
        </button>
    );
}

/** Small "i" with an explanation on hover / focus. */
export function Hint({ text }) {
    return (
        <span className="group relative ml-1 inline-flex align-middle" tabIndex={0} aria-label={text}>
            <Info size={12} className="text-slate-400" aria-hidden="true" />
            <span role="tooltip" className="pointer-events-none absolute left-1/2 top-5 z-30 hidden w-56 -translate-x-1/2 whitespace-normal rounded-md bg-slate-900 px-2 py-1.5 text-left text-label font-normal normal-case text-white shadow-lg group-hover:block group-focus:block">
                {text}
            </span>
        </span>
    );
}

/**
 * Cell colours for a quick read in meetings (theme colours, light and dark):
 *  • "good" — more is better: green near the column's top (70%+), yellow in
 *    the middle (35–70%), red at the bottom (under 35%, including 0).
 *  • "pct"  — a percentage, more is better: green 70%+, yellow 40–69%, red under 40%.
 *  • "bad"  — more is worse (missed, overdue…): 0 is green; the rest red, deeper as it grows.
 *  • "load" — workload, neither good nor bad (leads received, follow-ups due): blue, deeper as it grows.
 * A column where everyone has 0 isn't coloured.
 */
const TINT = {
    green: "var(--color-emerald-500)",
    yellow: "var(--color-amber-400)",
    red: "var(--color-red-500)",
    blue: "var(--color-action)",
};
const mix = (color, pct) => `color-mix(in srgb, ${color} ${Math.round(pct)}%, transparent)`;
function heatColor(kind, value, max) {
    const v = Number(value) || 0;
    if (!kind || kind === true) kind = "load";
    if (kind === "pct") return mix(v >= 70 ? TINT.green : v >= 40 ? TINT.yellow : TINT.red, v >= 70 ? 26 : v >= 40 ? 32 : 20);
    if (!(max > 0)) return undefined;
    const share = v / max;
    if (kind === "good") return share >= 0.7 ? mix(TINT.green, 18 + share * 14) : share >= 0.35 ? mix(TINT.yellow, 30) : mix(TINT.red, 16 + (0.35 - share) * 20);
    if (kind === "bad") return v === 0 ? mix(TINT.green, 14) : mix(TINT.red, 16 + share * 22);
    return v ? mix(TINT.blue, 8 + share * 30) : undefined;
}

/** What the colours mean, under a coloured table. */
function Swatch({ c, children }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: mix(c, 40) }} aria-hidden="true" />
            {children}
        </span>
    );
}
export function HeatLegend() {
    return (
        <p className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 text-label text-slate-500">
            <Swatch c={TINT.green}>Top of the team</Swatch>
            <Swatch c={TINT.yellow}>Middle</Swatch>
            <Swatch c={TINT.red}>Low, or a problem (missed, overdue)</Swatch>
            <Swatch c={TINT.blue}>Workload (more or less, not good or bad)</Swatch>
        </p>
    );
}

/**
 * Sortable table with a totals row. columns: { key, label, hint, text(row), tone(row), heat, align, noTotal }.
 * heat: "good" | "pct" | "bad" | "load" (see heatColor).
 */
export function ReportTable({ columns, rows, totals, loading, empty = "No data for this period.", initialSort }) {
    const [sort, setSort] = useState(initialSort ?? null);
    const sorted = useMemo(() => {
        if (!sort) return rows;
        const col = columns.find((c) => c.key === sort.key);
        const val = (r) => (col?.sortValue ? col.sortValue(r) : r[sort.key]);
        return [...rows].sort((a, b) => {
            const x = val(a);
            const y = val(b);
            const d = typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""));
            return sort.dir === "asc" ? d : -d;
        });
    }, [rows, sort, columns]);
    const max = useMemo(() => Object.fromEntries(columns.filter((c) => c.heat).map((c) => [c.key, Math.max(0, ...rows.map((r) => Number(r[c.key]) || 0))])), [columns, rows]);
    const coloured = columns.some((c) => c.heat) && rows.length > 0;
    const click = (key) => setSort((s) => (s?.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));

    return (
        <div className="relative overflow-x-auto rounded-xl border border-slate-200 bg-surface">
            {loading && (
                <div className="absolute inset-0 z-10 flex items-start justify-center bg-surface/60 pt-10">
                    <Loader2 className="animate-spin text-action" aria-label="Loading" />
                </div>
            )}
            <table className="w-full min-w-max text-ui">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-small text-slate-600">
                        {columns.map((c) => (
                            <th key={c.key} scope="col" className={cn("px-3 py-2.5 font-semibold", c.align === "left" ? "text-left" : "text-center")} aria-sort={sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
                                {c.key === "_sr" ? (
                                    c.label
                                ) : (
                                    <button type="button" onClick={() => click(c.key)} className="inline-flex items-center gap-1 font-semibold hover:text-action">
                                        {c.label}
                                        {sort?.key === c.key && (sort.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                                    </button>
                                )}
                                {c.hint && <Hint text={c.hint} />}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((r, i) => (
                        <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                            {columns.map((c) => {
                                const v = c.key === "_sr" ? i + 1 : c.text ? c.text(r) : r[c.key];
                                const bg = c.heat ? heatColor(c.heat, r[c.key], max[c.key]) : undefined;
                                return (
                                    <td
                                        key={c.key}
                                        className={cn("px-3 py-2.5 tabular-nums", c.align === "left" ? "text-left" : "text-center", c.tone?.(r))}
                                        style={bg ? { backgroundColor: bg } : undefined}
                                    >
                                        {v}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    {!rows.length && !loading && (
                        <tr>
                            <td colSpan={columns.length} className="px-3 py-10 text-center text-slate-500">
                                {empty}
                            </td>
                        </tr>
                    )}
                </tbody>
                {totals && rows.length > 1 && (
                    <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-800">
                            {columns.map((c, i) => (
                                <td key={c.key} className={cn("px-3 py-2.5 tabular-nums", c.align === "left" ? "text-left" : "text-center")}>
                                    {i === 0 ? "Total" : c.key === "_sr" || c.noTotal ? "" : c.text ? c.text(totals) : totals[c.key]}
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                )}
            </table>
            {coloured && <HeatLegend />}
        </div>
    );
}

export function Kpi({ label, value, sub, tone }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-surface px-4 py-3">
            <p className="text-small font-semibold text-slate-500">{label}</p>
            <p className={cn("mt-1 text-h2 font-extrabold tabular-nums text-slate-900", tone)}>{value}</p>
            {sub && <p className="text-small text-slate-500">{sub}</p>}
        </div>
    );
}
