import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import { STAGE_LABEL, apiMessage, fmtDateTime, fmtMoney, inputCls } from "@/lib/crm";
import { fmtTotals } from "@/lib/newUi";
import { Card, PageHeader } from "./newUi";
import { StageBadge } from "./crmShared";

// Activity types in the fixed chart-colour order (--chart-1…5, light and dark in index.css)
const ACT_TYPES = [
    ["call", "Calls"],
    ["whatsapp", "WhatsApp"],
    ["message", "Messages"],
    ["email", "Emails"],
    ["note", "Notes"],
];
const PIPE_STAGES = ["new", "attempting_contact", "in_conversation", "application", "exam_scheduled", "no_response", "on_hold"];
const monthLabel = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
const inr = (n) => fmtMoney(n, "INR");

/** Sales dashboard (new design): KPI strip, won by month, pipeline, activity and forecast. */
export default function SalesDashboard({ isAdmin }) {
    const [months, setMonths] = useState(12);
    const [ownerId, setOwnerId] = useState("");
    const [owners, setOwners] = useState([]);
    const [d, setD] = useState(null);

    useEffect(() => {
        if (!isAdmin) return;
        crmService
            .owners()
            .then(({ data: res }) => setOwners((res.data ?? []).filter((o) => o.role === "consultant")))
            .catch(() => {});
    }, [isAdmin]);
    useEffect(() => {
        let live = true;
        crmService
            .salesDashboard({ months, owner_id: ownerId || undefined })
            .then(({ data: res }) => live && setD(res.data))
            .catch((err) => {
                toast.error(apiMessage(err, "Could not load the dashboard"));
                if (live) setD(null);
            });
        return () => {
            live = false;
        };
    }, [months, ownerId]);

    const money = d?.money_visible;
    const k = d?.kpis;
    const both = (t) => [t?.INR ? inr(t.INR) : null, t?.USD ? fmtMoney(t.USD, "USD") : null].filter(Boolean).join(" + ") || inr(0);

    return (
        <div>
            <PageHeader title="Sales dashboard" sub={isAdmin ? (ownerId ? "One consultant" : "Whole team") : "Your leads"} />
            {/* Filters in one row above the charts */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className={cn(inputCls, "w-auto py-1.5")} aria-label="Date range">
                    {[3, 6, 12].map((m) => (
                        <option key={m} value={m}>
                            Last {m} months
                        </option>
                    ))}
                </select>
                {isAdmin && (
                    <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={cn(inputCls, "w-auto py-1.5")} aria-label="Consultant">
                        <option value="">All consultants</option>
                        {owners.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.name}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {!d ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-slate-500" />
                </div>
            ) : (
                <div className="space-y-4">
                    <Card className="grid grid-cols-2 divide-slate-200 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
                        <Kpi label={`Won (last ${months} months)`} value={money ? both(k.won) : k.won_deals.toLocaleString("en-IN")} hint={money ? `${k.won_deals} deals` : "deals paid or Course Done"} />
                        <Kpi label="Open pipeline" value={money ? both(k.open_pipeline) : k.open_leads.toLocaleString("en-IN")} hint={money ? "ticket size of open leads" : "open leads"} />
                        <Kpi label="Open leads" value={k.open_leads.toLocaleString("en-IN")} hint="not won, lost or in Backlog" />
                        <Kpi label="Win rate" value={k.win_rate == null ? "—" : `${k.win_rate}%`} hint={`of ${k.closed} closed in range`} />
                        <Kpi label="Avg. days to close" value={k.avg_days_to_close ?? "—"} hint="added → paid" />
                    </Card>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Panel title="Won by month" tags={[`Last ${months} months`, "Deals won", ...(money ? ["Hover for ₹ / $"] : [])]}>
                            <MonthBars rows={d.won_by_month} money={money} />
                        </Panel>
                        <Panel title="Pipeline by stage" tags={["Open stages", "Leads"]}>
                            <StageBars rows={d.by_stage.filter((s) => PIPE_STAGES.includes(s.stage))} money={money} />
                        </Panel>
                        <Panel title="Activity by consultant" tags={["Last 30 days", "Logged by person"]}>
                            <ActivityBars reps={d.activity_by_rep} />
                        </Panel>
                        <Panel title="Exam & payment forecast" tags={["Application + Exam Scheduled"]}>
                            <Forecast rows={d.forecast} money={money} />
                        </Panel>
                    </div>
                </div>
            )}
        </div>
    );
}

function Kpi({ label, value, hint }) {
    return (
        <div className="border-b border-slate-200 p-4 lg:border-b-0">
            <p className="text-label font-bold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-h2 font-extrabold tabular-nums text-slate-900">{value}</p>
            <p className="text-label text-slate-500">{hint}</p>
        </div>
    );
}

function Panel({ title, tags, children }) {
    return (
        <Card className="p-4">
            <h2 className="text-body font-bold text-slate-900">{title}</h2>
            <div className="mb-3 mt-1 flex flex-wrap gap-1.5">
                {tags.map((t) => (
                    <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-label font-bold uppercase tracking-wide text-slate-600">
                        {t}
                    </span>
                ))}
            </div>
            {children}
        </Card>
    );
}

/** Vertical bars, one series: deals won per month (amounts in the tooltip; INR and USD don't add up). */
function MonthBars({ rows, money }) {
    const [hover, setHover] = useState(null);
    const val = (r) => r.deals;
    const top = Math.max(...rows.map(val));
    const max = Math.max(2, top + (top % 2)); // even, so the middle line is a whole number
    const ticks = [max, max / 2, 0];
    const fmt = (n) => n;
    return (
        <div>
            <div className="relative flex h-48 gap-2">
                <div className="flex w-12 shrink-0 flex-col justify-between text-right text-label tabular-nums text-slate-500">
                    {ticks.map((t, i) => (
                        <span key={i}>{fmt(t)}</span>
                    ))}
                </div>
                <div className="relative flex flex-1 items-end gap-[2px] border-b border-slate-300">
                    {[0, 50].map((p) => (
                        <span key={p} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-200" style={{ top: `${p}%` }} aria-hidden="true" />
                    ))}
                    {rows.map((r) => (
                        <div
                            key={r.month}
                            className="relative flex h-full flex-1 items-end"
                            onMouseEnter={() => setHover(r.month)}
                            onMouseLeave={() => setHover(null)}
                        >
                            <div
                                className={cn("w-full max-w-10 mx-auto rounded-t-[4px] transition-opacity", hover && hover !== r.month && "opacity-50")}
                                style={{ height: `${(val(r) / max) * 100}%`, minHeight: val(r) ? 2 : 0, background: "var(--chart-1)" }}
                            />
                            {hover === r.month && (
                                <div className="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-surface px-2.5 py-1.5 text-small shadow-lg">
                                    <p className="font-bold text-slate-900">{monthLabel(r.month)}</p>
                                    <p className="text-slate-700">
                                        {r.deals} deal{r.deals === 1 ? "" : "s"}
                                        {money && ` · ${inr(r.INR)}${r.USD ? ` + ${fmtMoney(r.USD, "USD")}` : ""}`}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <div className="ml-14 mt-1 flex gap-[2px] text-label text-slate-500">
                {rows.map((r, i) => (
                    <span key={r.month} className="flex-1 text-center">
                        {rows.length <= 6 || i % 2 === rows.length % 2 ? monthLabel(r.month) : ""}
                    </span>
                ))}
            </div>
        </div>
    );
}

/** Horizontal bars per stage: lead count, with the ticket total for Super Admins. */
function StageBars({ rows, money }) {
    const max = Math.max(1, ...rows.map((r) => r.count));
    return (
        <ul className="space-y-2.5">
            {rows.map((r) => (
                <li key={r.stage} className="grid grid-cols-[130px_1fr] items-center gap-3" title={`${STAGE_LABEL[r.stage]}: ${r.count} leads${money ? ` · ${fmtTotals(r.totals)}` : ""}`}>
                    <span className="truncate text-small text-slate-700">{STAGE_LABEL[r.stage]}</span>
                    <span className="flex items-center gap-2">
                        <span className="h-3.5 rounded-r-[4px]" style={{ width: `${Math.max(r.count ? 1.5 : 0, (r.count / max) * 80)}%`, background: "var(--chart-1)" }} />
                        <span className="whitespace-nowrap text-small tabular-nums text-slate-700">
                            <b className="font-bold text-slate-900">{r.count.toLocaleString("en-IN")}</b>
                            {money && r.totals?.length > 0 && <span className="text-slate-500"> · {fmtTotals(r.totals)}</span>}
                        </span>
                    </span>
                </li>
            ))}
        </ul>
    );
}

/** Stacked horizontal bars: what each consultant logged, by type. */
function ActivityBars({ reps }) {
    if (!reps.length) return <p className="py-8 text-center text-ui text-slate-500">Nothing logged in the last 30 days.</p>;
    const max = Math.max(1, ...reps.map((r) => r.total));
    return (
        <div>
            <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1" aria-label="Legend">
                {ACT_TYPES.map(([t, label], i) => (
                    <span key={t} className="inline-flex items-center gap-1.5 text-small text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: `var(--chart-${i + 1})` }} aria-hidden="true" /> {label}
                    </span>
                ))}
            </div>
            <ul className="space-y-2.5">
                {reps.map((r) => (
                    <li key={r.id} className="grid grid-cols-[110px_1fr] items-center gap-3">
                        <span className="truncate text-small text-slate-700">{r.name}</span>
                        <span className="flex items-center gap-2">
                            <span className="flex h-3.5 gap-[2px]" style={{ width: `${(r.total / max) * 80}%` }}>
                                {ACT_TYPES.filter(([t]) => r[t]).map(([t, label]) => (
                                    <span
                                        key={t}
                                        title={`${r.name}: ${r[t]} ${label.toLowerCase()}`}
                                        className="h-full first:rounded-l-[2px] last:rounded-r-[4px]"
                                        style={{ flexGrow: r[t], background: `var(--chart-${ACT_TYPES.findIndex(([x]) => x === t) + 1})` }}
                                    />
                                ))}
                            </span>
                            <b className="text-small font-bold tabular-nums text-slate-900">{r.total}</b>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Forecast({ rows, money }) {
    if (!rows.length) return <p className="py-8 text-center text-ui text-slate-500">No leads in Application or Exam Scheduled.</p>;
    return (
        <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-small">
                <thead className="sticky top-0 bg-slate-50 text-label font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                        <th className="px-3 py-2">Lead</th>
                        <th className="px-3 py-2">Stage</th>
                        <th className="px-3 py-2">Exam</th>
                        {money && <th className="px-3 py-2 text-right">Ticket</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => (
                        <tr key={r.id} className={cn(r.payment_alert && "bg-red-50")}>
                            <td className="max-w-[180px] px-3 py-2">
                                <p className="truncate font-semibold text-slate-900">{r.name}</p>
                                <p className="truncate text-label text-slate-500">{r.owner_name ?? "Unassigned"}</p>
                            </td>
                            <td className="px-3 py-2">
                                <StageBadge stage={r.stage} />
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.exam_scheduled_at ? fmtDateTime(r.exam_scheduled_at) : "—"}</td>
                            {money && <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">{fmtMoney(r.ticket_size, r.ticket_currency) ?? "—"}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
