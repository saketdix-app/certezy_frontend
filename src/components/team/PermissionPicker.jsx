import { useEffect, useRef, useState } from "react";
import { ChevronDown, Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { PERMISSION_LABELS } from "./permissionLabels";

const label = (k) => PERMISSION_LABELS[k]?.[0] ?? k;
const hint = (k) => PERMISSION_LABELS[k]?.[1];

function Check({ checked, indeterminate, disabled, onChange, labelText, hintText, strong }) {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
    }, [indeterminate]);
    return (
        <label
            className={cn(
                "flex items-start gap-2.5",
                disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            )}
        >
            <input
                ref={ref}
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-action"
            />
            <span className="min-w-0">
                <span className={cn("block text-ui text-slate-800", strong ? "font-bold" : "font-semibold")}>
                    {labelText}
                </span>
                {hintText && <span className="block text-small text-slate-500">{hintText}</span>}
            </span>
        </label>
    );
}

/**
 * Sub-Admin permissions by menu section → tab → options inside the tab, from
 * the server's catalogue. A section's switch turns its whole section on or
 * off; a tab's options only work while the tab is open.
 */
export default function PermissionPicker({ catalog, keys, value, onChange }) {
    const [openSections, setOpenSections] = useState(() =>
        Object.fromEntries(catalog.map((c) => [c.key, true]))
    );
    const allowed = (k) => keys.includes(k);
    const on = (k) => Boolean(value[k]);

    // Keys a tab controls (open + options), and tabs that need another permission
    const tabKeys = (t) => [t.open, ...(t.options ?? [])].filter((k) => k && allowed(k));
    const sectionKeys = (c) => [
        ...new Set(c.tabs.filter((t) => !t.locked && !t.shared && t.open).flatMap(tabKeys)),
    ];
    const dependents = (k) => catalog.flatMap((c) => c.tabs).filter((t) => t.needs === k);

    const setMany = (changes) => onChange({ ...value, ...changes });
    const setOpen = (t, checked) => {
        const changes = { [t.open]: checked };
        if (!checked) {
            for (const o of t.options ?? []) changes[o] = false;
            // e.g. turning off Leads closes By consultant, Distribution, Sales
            for (const d of dependents(t.open)) for (const k of tabKeys(d)) changes[k] = false;
        }
        setMany(changes);
    };
    const setSection = (c, checked) => {
        const changes = Object.fromEntries(sectionKeys(c).map((k) => [k, checked]));
        if (!checked)
            for (const k of sectionKeys(c))
                for (const d of dependents(k)) for (const dk of tabKeys(d)) changes[dk] = false;
        setMany(changes);
    };

    return (
        <div className="space-y-3">
            {catalog.map((c) => {
                const ks = sectionKeys(c);
                if (!ks.length) return null;
                const count = ks.filter(on).length;
                const expanded = openSections[c.key];
                return (
                    <fieldset key={c.key} className="rounded-xl border border-slate-200">
                        <legend className="sr-only">{c.label}</legend>
                        <div className="flex items-center gap-2 rounded-t-xl bg-slate-50 px-3 py-2.5">
                            <Check
                                strong
                                checked={count === ks.length}
                                indeterminate={count > 0 && count < ks.length}
                                onChange={(v) => setSection(c, v)}
                                labelText={c.label}
                            />
                            <span className="ml-auto text-small text-slate-500">
                                {count} of {ks.length}
                            </span>
                            <button
                                type="button"
                                onClick={() => setOpenSections((s) => ({ ...s, [c.key]: !s[c.key] }))}
                                aria-expanded={expanded}
                                aria-label={`${expanded ? "Hide" : "Show"} ${c.label} tabs`}
                                className="rounded p-1 text-slate-500 hover:bg-slate-200"
                            >
                                <ChevronDown
                                    size={16}
                                    className={cn("transition-transform", expanded ? "rotate-180" : "")}
                                />
                            </button>
                        </div>
                        {expanded && (
                            <ul className="divide-y divide-slate-100">
                                {c.tabs.map((t) => {
                                    if (t.locked)
                                        return (
                                            <li
                                                key={t.label}
                                                className="flex items-center gap-2 px-3 py-2 text-small text-slate-500"
                                            >
                                                <Lock size={13} aria-hidden="true" /> {t.label} — {t.locked}
                                            </li>
                                        );
                                    if (t.shared)
                                        return (
                                            <li key={t.label} className="px-3 py-2 text-small text-slate-500">
                                                {t.label} — comes with “{label(t.open).replace(/^Open /, "")}”
                                            </li>
                                        );
                                    if (!allowed(t.open)) return null;
                                    const blockedBy = t.needs && !on(t.needs) ? t.needs : null;
                                    return (
                                        <li key={t.label} className="px-3 py-2.5">
                                            <Check
                                                checked={on(t.open)}
                                                disabled={Boolean(blockedBy)}
                                                onChange={(v) => setOpen(t, v)}
                                                labelText={label(t.open)}
                                                hintText={
                                                    blockedBy
                                                        ? `Turn on “${label(blockedBy).replace(/^Open /, "")}” first`
                                                        : (t.note ?? hint(t.open))
                                                }
                                            />
                                            {(t.options ?? []).filter(allowed).length > 0 && (
                                                <div className="ml-6 mt-2 space-y-2 border-l-2 border-slate-100 pl-3">
                                                    {(t.options ?? []).filter(allowed).map((o) => (
                                                        <Check
                                                            key={o}
                                                            checked={on(o)}
                                                            disabled={!on(t.open)}
                                                            onChange={(v) => setMany({ [o]: v })}
                                                            labelText={label(o)}
                                                            hintText={hint(o)}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </fieldset>
                );
            })}
        </div>
    );
}
