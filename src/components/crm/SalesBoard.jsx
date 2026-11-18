import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import { SOURCE_LABEL, apiMessage, fmtDateTime, inputCls } from "@/lib/crm";

const RANGES = [
    [7, "Last 7 days"],
    [30, "Last 30 days"],
    [90, "Last 90 days"],
    [365, "Last 12 months"],
];
const STATES = [
    ["success", "Paid", "text-emerald-700"],
    ["pending", "Pending", "text-amber-700"],
    ["failed", "Failed", "text-red-600"],
    ["refunded", "Refunded", "text-slate-600"],
    ["cancelled", "Abandoned", "text-slate-500"],
];
const money = (obj) =>
    Object.entries(obj ?? {}).length
        ? Object.entries(obj)
              .map(([cur, v]) => new Intl.NumberFormat(cur === "INR" ? "en-IN" : "en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(v))
              .join(" + ")
        : "—";

function Card({ label, value, sub }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-surface px-4 py-3">
            <p className="text-[12px] font-semibold text-slate-500">{label}</p>
            <p className="mt-1 text-[22px] font-extrabold text-slate-900">{value}</p>
            {sub && <p className="text-[12px] text-slate-500">{sub}</p>}
        </div>
    );
}

/**
 * Sales (2.0 phase 5, PRD §4.4): paid sales credited to the lead owner at the
 * time of payment. Consultants see their own; Admins everyone, or one owner.
 */
export default function SalesBoard({ isAdmin }) {
    const [days, setDays] = useState(30);
    const [ownerId, setOwnerId] = useState("");
    const [owners, setOwners] = useState([]);
    const [data, setData] = useState(null);
    const [limit, setLimit] = useState(null);

    const load = useCallback(
        () =>
            crmService
                .sales({ from: new Date(Date.now() - days * 86400e3).toISOString().slice(0, 10), owner_id: ownerId || undefined })
                .then(({ data: res }) => setData(res.data))
                .catch((err) => toast.error(apiMessage(err, "Could not load sales"))),
        [days, ownerId]
    );
    useEffect(() => {
        load();
    }, [load]);
    useEffect(() => {
        if (!isAdmin) return;
        crmService.owners().then(({ data: res }) => setOwners((res.data ?? []).filter((o) => o.role === "consultant"))).catch(() => {});
        crmService.settings().then(({ data: res }) => setLimit(res.data.max_discount_pct)).catch(() => {});
    }, [isAdmin]);

    const saveLimit = async () => {
        try {
            await crmService.saveSettings({ max_discount_pct: Number(limit) });
            toast.success("Discount limit saved");
        } catch (err) {
            toast.error(apiMessage(err, "Could not save"));
        }
    };

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">Sales</h1>
                    <p className="mt-1 text-[13px] text-slate-500">
                        A sale counts when payment is confirmed, for whoever owned the lead at that moment. Sent discount links aren't sales.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {isAdmin && (
                        <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={cn(inputCls, "w-auto")} aria-label="Consultant">
                            <option value="">All consultants</option>
                            {owners.map((o) => (
                                <option key={o.id} value={o.id}>
                                    {o.name}
                                </option>
                            ))}
                        </select>
                    )}
                    <select value={days} onChange={(e) => setDays(Number(e.target.value))} className={cn(inputCls, "w-auto")} aria-label="Period">
                        {RANGES.map(([v, l]) => (
                            <option key={v} value={v}>
                                {l}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {!data ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="animate-spin text-slate-500" />
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <Card label="Sales" value={data.sales} />
                        <Card label="Revenue (net)" value={money(data.revenue)} sub={`Gross ${money(data.gross)}`} />
                        <Card label="Conversion" value={`${data.conversion.rate}%`} sub={`${data.conversion.converted} of ${data.conversion.leads} new leads`} />
                        <Card label="Discount links" value={`${data.discount_links.redeemed} / ${data.discount_links.generated}`} sub={`redeemed · ${money(data.discount_links.revenue)}`} />
                    </div>

                    <section className="rounded-xl border border-slate-200 bg-surface p-4">
                        <h2 className="mb-2 text-[15px] font-bold text-slate-900">Payments by status</h2>
                        <div className="flex flex-wrap gap-x-6 gap-y-1">
                            {STATES.map(([k, l, tone]) => (
                                <p key={k} className="text-[13px] text-slate-600">
                                    {l}: <b className={tone}>{data.payment_states[k] ?? 0}</b>
                                </p>
                            ))}
                        </div>
                        <p className="mt-2 text-[12px] text-slate-500">Abandoned = checkout started but not paid within 24 hours.</p>
                    </section>

                    <div className="grid gap-5 lg:grid-cols-2">
                        <section className="rounded-xl border border-slate-200 bg-surface p-4">
                            <h2 className="mb-2 text-[15px] font-bold text-slate-900">Course mix</h2>
                            {!data.by_course.length ? (
                                <p className="text-[13px] text-slate-500">No sales in this period.</p>
                            ) : (
                                <ul className="space-y-1.5 text-[13px]">
                                    {data.by_course.map((r, i) => (
                                        <li key={i} className="flex justify-between gap-3">
                                            <span className="truncate">{r.title ?? "—"}</span>
                                            <span className="shrink-0 text-slate-600">
                                                {r.sales} · {money({ [r.currency]: r.amount })}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                        <section className="rounded-xl border border-slate-200 bg-surface p-4">
                            <h2 className="mb-2 text-[15px] font-bold text-slate-900">{isAdmin && !ownerId ? "By consultant" : "By lead source"}</h2>
                            <ul className="space-y-1.5 text-[13px]">
                                {(isAdmin && !ownerId ? data.by_consultant : data.by_source).map((r, i) => (
                                    <li key={i} className="flex justify-between gap-3">
                                        <span>{isAdmin && !ownerId ? r.name ?? "Unassigned lead" : SOURCE_LABEL[r.source] ?? r.source}</span>
                                        <span className="text-slate-600">
                                            {r.sales} · {money({ [r.currency]: r.amount })}
                                        </span>
                                    </li>
                                ))}
                                {!(isAdmin && !ownerId ? data.by_consultant : data.by_source).length && <li className="text-slate-500">No sales in this period.</li>}
                            </ul>
                        </section>
                    </div>

                    <section className="rounded-xl border border-slate-200 bg-surface p-4">
                        <h2 className="mb-2 text-[15px] font-bold text-slate-900">Discount links</h2>
                        <p className="text-[13px] text-slate-600">
                            Sent {data.discount_links.generated} · opened {data.discount_links.clicked} · paid {data.discount_links.redeemed} · expired{" "}
                            {data.discount_links.expired} · withdrawn {data.discount_links.revoked}
                        </p>
                    </section>

                    <section className="overflow-x-auto rounded-xl border border-slate-200 bg-surface">
                        <h2 className="px-4 pt-3 text-[15px] font-bold text-slate-900">Recent sales</h2>
                        <table className="mt-2 w-full min-w-[640px] text-left text-[13px]">
                            <thead className="bg-slate-50 text-[11.5px] uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-2">When</th>
                                    <th className="px-4 py-2">Lead</th>
                                    <th className="px-4 py-2">Course</th>
                                    <th className="px-4 py-2 text-right">Paid</th>
                                    {isAdmin && <th className="px-4 py-2">Credited to</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {!data.recent.length && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                                            No sales yet in this period.
                                        </td>
                                    </tr>
                                )}
                                {data.recent.map((s) => (
                                    <tr key={s.id}>
                                        <td className="px-4 py-2 text-slate-500">{fmtDateTime(s.created_at)}</td>
                                        <td className="px-4 py-2">{s.lead_name}</td>
                                        <td className="px-4 py-2">{s.course_title}</td>
                                        <td className="px-4 py-2 text-right font-semibold">
                                            {money({ [s.currency]: Number(s.amount) })}
                                            {s.discount_link_id && <span className="ml-1 text-[11px] font-normal text-slate-500">(discount)</span>}
                                        </td>
                                        {isAdmin && <td className="px-4 py-2">{s.credited_to ?? "—"}</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {isAdmin && limit != null && (
                        <section className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-surface p-4">
                            <p className="text-[13px] text-slate-700">
                                <b>Largest discount</b> Consultants and Sub-Admins can send without an Admin:
                            </p>
                            <input type="number" min="1" max="100" value={limit} onChange={(e) => setLimit(e.target.value)} className={cn(inputCls, "w-24")} aria-label="Max discount percent" />
                            <span className="text-[13px] text-slate-600">%</span>
                            <button type="button" onClick={saveLimit} className="rounded-lg bg-action px-3 py-1.5 text-[12.5px] font-bold text-white">
                                Save
                            </button>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
