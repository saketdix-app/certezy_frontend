import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Inbox, Loader2, Pencil, Plus, Shuffle, Trash2 } from "lucide-react";

import crmService from "@/services/crmService";
import courseService from "@/services/courseService";
import { cn } from "@/lib/utils";
import { CrmModal } from "@/components/crm/crmShared";
import { SOURCES, SOURCE_LABEL, apiMessage, inputCls } from "@/lib/crm";

/**
 * Admin → Distribution (2.0 phase 4, PRD §6.3): Round Robin switch, the
 * unassigned queue, routing pools and a per-consultant distribution report.
 * Consultant pause / leave / limits are set on Team → Lead settings.
 */

const STATE = {
    null: ["Receiving", "bg-emerald-50 text-emerald-700"],
    paused: ["Paused", "bg-amber-50 text-amber-700"],
    on_leave: ["On leave", "bg-slate-100 text-slate-600"],
    daily_limit: ["Daily limit reached", "bg-orange-50 text-orange-700"],
    open_limit: ["Open-lead limit reached", "bg-orange-50 text-orange-700"],
    inactive: ["Inactive", "bg-slate-100 text-slate-500"],
};
const RANGES = [
    [7, "Last 7 days"],
    [30, "Last 30 days"],
    [90, "Last 90 days"],
];

function Switch({ checked, onChange, label, disabled }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-action" : "bg-slate-300")}
        >
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
        </button>
    );
}

function PoolModal({ pool, consultants, onClose, onSaved }) {
    const isDefault = pool?.is_default;
    const [form, setForm] = useState({
        name: pool?.name ?? "",
        enabled: pool?.enabled ?? true,
        course_ids: pool?.rules?.course_ids ?? [],
        sources: pool?.rules?.sources ?? [],
        campaigns: (pool?.rules?.campaigns ?? []).join(", "),
        member_ids: pool?.members?.map((m) => m.id) ?? [],
    });
    const [courses, setCourses] = useState([]);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        courseService
            .getAll({ limit: 100 })
            .then(({ data }) => setCourses(data?.data ?? []))
            .catch(() => {});
    }, []);
    const toggleIn = (key, v) =>
        setForm((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));

    const save = async (e) => {
        e.preventDefault();
        if (form.name.trim().length < 2) return toast.error("Name the pool");
        const campaigns = form.campaigns.split(",").map((c) => c.trim()).filter(Boolean);
        if (!isDefault && !form.course_ids.length && !form.sources.length && !campaigns.length) {
            return toast.error("Add at least one rule: course, source or campaign");
        }
        if (!isDefault && !form.member_ids.length) return toast.error("Add at least one consultant");
        setBusy(true);
        try {
            await crmService.savePool(pool?.id, {
                name: form.name.trim(),
                enabled: form.enabled,
                ...(!isDefault && {
                    rules: { course_ids: form.course_ids, sources: form.sources, campaigns },
                    member_ids: form.member_ids,
                }),
            });
            toast.success("Pool saved");
            onSaved();
            onClose();
        } catch (err) {
            toast.error(apiMessage(err, "Could not save the pool"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <CrmModal title={pool ? `Edit pool — ${pool.name}` : "New routing pool"} onClose={onClose} wide>
            <form onSubmit={save} className="space-y-4">
                <label className="block">
                    <span className="mb-1 block text-[13px] font-semibold text-slate-700">Name</span>
                    <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="PMP team" className={inputCls} />
                </label>
                {isDefault ? (
                    <p className="text-[13px] text-slate-500">
                        The default pool takes every lead no other pool matches, and rotates through all active consultants.
                        Pause someone, or set their limits, on Team → Lead settings.
                    </p>
                ) : (
                    <>
                        <fieldset>
                            <legend className="mb-1 text-[13px] font-semibold text-slate-700">Leads for these courses</legend>
                            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                                {courses.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => toggleIn("course_ids", c.id)}
                                        className={cn(
                                            "rounded-full border px-2.5 py-1 text-[12px]",
                                            form.course_ids.includes(c.id) ? "border-action bg-action-soft text-action-soft-ink" : "border-slate-200 text-slate-600"
                                        )}
                                    >
                                        {c.title}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend className="mb-1 text-[13px] font-semibold text-slate-700">From these sources</legend>
                            <div className="flex flex-wrap gap-1.5">
                                {SOURCES.map(([v, l]) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => toggleIn("sources", v)}
                                        className={cn(
                                            "rounded-full border px-2.5 py-1 text-[12px]",
                                            form.sources.includes(v) ? "border-action bg-action-soft text-action-soft-ink" : "border-slate-200 text-slate-600"
                                        )}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </fieldset>
                        <label className="block">
                            <span className="mb-1 block text-[13px] font-semibold text-slate-700">Campaigns (comma-separated, optional)</span>
                            <input value={form.campaigns} onChange={(e) => setForm((f) => ({ ...f, campaigns: e.target.value }))} placeholder="PMP Nov, Diwali offer" className={inputCls} />
                        </label>
                        <p className="text-[12px] text-slate-500">A lead joins this pool when it matches every rule you set. Unmatched leads go to the default pool.</p>
                        <fieldset>
                            <legend className="mb-1 text-[13px] font-semibold text-slate-700">Consultants, in turn order</legend>
                            <div className="grid gap-1.5 sm:grid-cols-2">
                                {consultants.map((c) => {
                                    const pos = form.member_ids.indexOf(c.id);
                                    return (
                                        <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[13px]">
                                            <input type="checkbox" checked={pos >= 0} onChange={() => toggleIn("member_ids", c.id)} className="accent-action" />
                                            <span className="flex-1">{c.name}</span>
                                            {pos >= 0 && <span className="text-[11.5px] text-slate-500">#{pos + 1}</span>}
                                        </label>
                                    );
                                })}
                            </div>
                        </fieldset>
                    </>
                )}
                <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                    <span className="text-[13.5px] font-semibold text-slate-800">Pool on</span>
                    <Switch checked={form.enabled} onChange={(v) => setForm((f) => ({ ...f, enabled: v }))} label="Pool on" />
                </label>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-[13.5px] font-semibold text-slate-700">
                        Cancel
                    </button>
                    <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-[13.5px] font-bold text-white disabled:opacity-60">
                        {busy && <Loader2 size={15} className="animate-spin" />}
                        Save pool
                    </button>
                </div>
            </form>
        </CrmModal>
    );
}

export default function DistributionPage() {
    const [cfg, setCfg] = useState(null);
    const [report, setReport] = useState(null);
    const [days, setDays] = useState(30);
    const [editing, setEditing] = useState(null); // pool | "new"
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const [{ data: d }, { data: r }] = await Promise.all([
                crmService.distribution(),
                crmService.report({ from: new Date(Date.now() - days * 86400e3).toISOString().slice(0, 10) }),
            ]);
            setCfg(d.data);
            setReport(r.data);
        } catch (err) {
            toast.error(apiMessage(err, "Could not load distribution settings"));
        }
    }, [days]);
    useEffect(() => {
        load();
    }, [load]);

    const act = async (fn, ok) => {
        setBusy(true);
        try {
            const { data } = await fn();
            toast.success(data?.message || ok);
            await load();
        } catch (err) {
            toast.error(apiMessage(err, "That didn't work. Please try again."));
        } finally {
            setBusy(false);
        }
    };

    if (!cfg || !report) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-slate-500" />
            </div>
        );
    }
    const consultants = report.consultants.filter((c) => c.state !== "inactive");

    return (
        <div className="mx-auto max-w-[1300px] space-y-6">
            <div>
                <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">Lead distribution</h1>
                <p className="mt-1 text-[13px] text-slate-500">
                    Round Robin gives new leads to eligible consultants in turn. Pause someone or set their limits on{" "}
                    <Link to="/admin/team" className="font-semibold text-action">Team → Lead settings</Link>.
                </p>
            </div>

            {/* Switch + queue */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
                    <div>
                        <p className="text-[15px] font-bold text-slate-900">Round Robin</p>
                        <p className="mt-1 text-[13px] text-slate-500">
                            {cfg.round_robin_enabled
                                ? "On — new leads are assigned automatically."
                                : "Off — new leads wait in the unassigned queue."}
                        </p>
                    </div>
                    <Switch
                        checked={cfg.round_robin_enabled}
                        disabled={busy}
                        label="Round Robin"
                        onChange={(v) => act(() => crmService.setRoundRobin(v), v ? "Round Robin is on" : "Round Robin is off")}
                    />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-3">
                        <Inbox size={22} className="text-slate-500" aria-hidden="true" />
                        <div>
                            <p className="text-[15px] font-bold text-slate-900">
                                {report.unassigned} lead{report.unassigned === 1 ? "" : "s"} waiting
                            </p>
                            <Link to="/admin/leads?owner=unassigned" className="text-[13px] font-semibold text-action">
                                Review the unassigned queue →
                            </Link>
                        </div>
                    </div>
                    <button
                        type="button"
                        disabled={busy || !report.unassigned || !cfg.round_robin_enabled}
                        onClick={() => act(() => crmService.distributeQueue(), "Done")}
                        title={!cfg.round_robin_enabled ? "Turn Round Robin on first" : undefined}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-action px-3 py-2 text-[13px] font-bold text-white disabled:opacity-50"
                    >
                        <Shuffle size={14} aria-hidden="true" /> Distribute now
                    </button>
                </div>
            </div>

            {/* Pools */}
            <section>
                <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-[16px] font-bold text-slate-900">Routing pools</h2>
                    <button type="button" onClick={() => setEditing("new")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-slate-700">
                        <Plus size={14} aria-hidden="true" /> New pool
                    </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    {cfg.pools.map((p) => (
                        <div key={p.id} className={cn("rounded-xl border bg-white p-4", p.enabled ? "border-slate-200" : "border-dashed border-slate-300 opacity-75")}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-bold text-slate-900">
                                        {p.name} {p.is_default && <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">Default</span>}
                                    </p>
                                    <p className="mt-0.5 text-[12.5px] text-slate-500">
                                        {p.is_default
                                            ? "Every lead no other pool matches"
                                            : [
                                                  p.rules?.course_ids?.length && `${p.rules.course_ids.length} course(s)`,
                                                  p.rules?.sources?.length && p.rules.sources.map((s) => SOURCE_LABEL[s]).join(", "),
                                                  p.rules?.campaigns?.length && `campaign: ${p.rules.campaigns.join(", ")}`,
                                              ]
                                                  .filter(Boolean)
                                                  .join(" · ")}
                                    </p>
                                </div>
                                <Switch
                                    checked={p.enabled}
                                    disabled={busy}
                                    label={`${p.name} on`}
                                    onChange={(v) => act(() => crmService.savePool(p.id, { enabled: v }), v ? "Pool on" : "Pool off")}
                                />
                            </div>
                            <p className="mt-2 text-[12.5px] text-slate-600">
                                {p.members.length ? p.members.map((m) => m.name).join(" → ") : "No consultants"}
                            </p>
                            {p.next_up && <p className="mt-0.5 text-[12px] text-slate-500">Last assigned: {p.next_up}</p>}
                            <div className="mt-3 flex gap-1.5">
                                <button type="button" onClick={() => setEditing(p)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-slate-700">
                                    <Pencil size={12} aria-hidden="true" /> Edit
                                </button>
                                {!p.is_default && (
                                    <button
                                        type="button"
                                        onClick={() => window.confirm(`Delete the pool "${p.name}"?`) && act(() => crmService.deletePool(p.id), "Pool deleted")}
                                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1 text-[12px] font-semibold text-red-600"
                                    >
                                        <Trash2 size={12} aria-hidden="true" /> Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Report */}
            <section>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-[16px] font-bold text-slate-900">Distribution by consultant</h2>
                    <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={cn(inputCls, "w-auto")} aria-label="Period">
                        {RANGES.map(([v, l]) => (
                            <option key={v} value={v}>
                                {l}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full min-w-[820px] text-left text-[13px]">
                        <thead className="bg-slate-50 text-[11.5px] uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-2.5">Consultant</th>
                                <th className="px-4 py-2.5">Now</th>
                                <th className="px-4 py-2.5 text-right">Round Robin</th>
                                <th className="px-4 py-2.5 text-right">Manual</th>
                                <th className="px-4 py-2.5 text-right">Transfers in / out</th>
                                <th className="px-4 py-2.5 text-right">Today / limit</th>
                                <th className="px-4 py-2.5 text-right">Open / limit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!consultants.length && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                                        No consultants yet — add them on the Team page.
                                    </td>
                                </tr>
                            )}
                            {consultants.map((c) => (
                                <tr key={c.id}>
                                    <td className="px-4 py-2.5 font-semibold text-slate-900">{c.name}</td>
                                    <td className="px-4 py-2.5">
                                        <span className={cn("rounded-md px-2 py-0.5 text-[11.5px] font-semibold", STATE[c.state]?.[1])}>{STATE[c.state]?.[0]}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right">{c.round_robin}</td>
                                    <td className="px-4 py-2.5 text-right">{c.manual}</td>
                                    <td className="px-4 py-2.5 text-right">
                                        {c.transfers_in} / {c.transfers_out}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        {c.today} / {c.daily_limit ?? "—"}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        {c.open_leads} / {c.open_limit ?? "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {editing && (
                <PoolModal
                    pool={editing === "new" ? null : editing}
                    consultants={consultants}
                    onClose={() => setEditing(null)}
                    onSaved={load}
                />
            )}
        </div>
    );
}
