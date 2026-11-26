import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { BarChart3, Download, LayoutDashboard, ListChecks, Loader2, PhoneCall } from "lucide-react";
import CallReport from "@/components/crm/reports/CallReport";
import FollowUpReport from "@/components/crm/reports/FollowUpReport";
import TeamBoard from "@/components/crm/reports/TeamBoard";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import { SOURCE_LABEL, STAGE_LABEL, apiMessage, inputCls } from "@/lib/crm";

/**
 * Admin → CRM Reports (2.0 phase 6, PRD §9.1). Lead volume and conversion,
 * consultants, lead ageing and speed, LMS outcomes and operations, for any
 * period, plus a lead export (audited — it contains personal data).
 */

const PRESETS = [
    [7, "7 days"],
    [30, "30 days"],
    [90, "90 days"],
    [365, "12 months"],
];
const dayStr = (d) => new Date(d).toISOString().slice(0, 10);
const money = (obj) =>
    obj && Object.entries(obj).filter(([, v]) => v).length
        ? Object.entries(obj)
              .filter(([, v]) => v)
              .map(([cur, v]) => new Intl.NumberFormat(cur === "INR" ? "en-IN" : "en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(v))
              .join(" + ")
        : "—";

function Kpi({ label, value, sub, tone }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-surface px-4 py-3">
            <p className="text-small font-semibold text-slate-500">{label}</p>
            <p className={cn("mt-1 text-h2 font-extrabold text-slate-900", tone)}>{value}</p>
            {sub && <p className="text-small text-slate-500">{sub}</p>}
        </div>
    );
}

function Panel({ title, children, className }) {
    return (
        <section className={cn("rounded-xl border border-slate-200 bg-surface p-4", className)}>
            <h2 className="mb-3 text-body font-bold text-slate-900">{title}</h2>
            {children}
        </section>
    );
}

/** Leads per period (bar) with converted leads (darker part). */
function VolumeChart({ series }) {
    if (!series.length) return <p className="py-8 text-center text-ui text-slate-500">No leads in this period.</p>;
    const max = Math.max(...series.map((s) => s.leads), 1);
    const label = (p) => (p.length === 7 ? p : p.slice(5));
    return (
        <div>
            <div className="flex h-44 items-end gap-[3px]" role="img" aria-label={`Leads per period: ${series.map((s) => `${s.period} ${s.leads}`).join(", ")}`}>
                {series.map((s) => (
                    <div key={s.period} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
                        <div className="flex w-full flex-col justify-end rounded-t bg-brand-100" style={{ height: `${(s.leads / max) * 100}%` }}>
                            <div className="w-full rounded-t bg-action" style={{ height: s.leads ? `${(s.converted / s.leads) * 100}%` : 0 }} />
                        </div>
                        <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-label text-white group-hover:block">
                            {s.period}: {s.leads} leads, {s.converted} converted
                        </span>
                    </div>
                ))}
            </div>
            <div className="mt-1 flex justify-between text-label text-slate-500">
                <span>{label(series[0].period)}</span>
                <span>{label(series[series.length - 1].period)}</span>
            </div>
            <p className="mt-2 flex gap-4 text-small text-slate-500">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-100" /> Leads</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-action" /> Converted (paid)</span>
            </p>
        </div>
    );
}

/** Rows with a proportional bar, count and conversion rate. */
function Breakdown({ rows, labelOf }) {
    if (!rows.length) return <p className="text-ui text-slate-500">No leads in this period.</p>;
    const max = Math.max(...rows.map((r) => r.leads), 1);
    return (
        <ul className="space-y-2">
            {rows.map((r) => (
                <li key={r.key ?? "none"} className="text-ui">
                    <div className="flex justify-between gap-3">
                        <span className="truncate text-slate-800">{labelOf(r.key)}</span>
                        <span className="shrink-0 text-slate-600">
                            {r.leads} · <b className="text-slate-900">{r.rate}%</b>
                        </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-action" style={{ width: `${(r.leads / max) * 100}%` }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

function OverviewReport() {
    const [from, setFrom] = useState(dayStr(Date.now() - 29 * 86400e3));
    const [to, setTo] = useState(dayStr(Date.now()));
    const [group, setGroup] = useState("day");
    const [data, setData] = useState(null);
    const [exporting, setExporting] = useState(false);

    const load = useCallback(() => {
        crmService
            .reportOverview({ from, to, group })
            .then(({ data: res }) => setData(res.data))
            .catch((err) => toast.error(apiMessage(err, "Could not load reports")));
    }, [from, to, group]);
    useEffect(() => {
        load();
    }, [load]);

    const preset = (days) => {
        setFrom(dayStr(Date.now() - (days - 1) * 86400e3));
        setTo(dayStr(Date.now()));
        setGroup(days > 120 ? "month" : days > 31 ? "week" : "day");
    };

    const exportCsv = async () => {
        setExporting(true);
        try {
            const res = await crmService.exportLeads({ from, to });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = `certezy-leads-${from}-to-${to}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("Could not export leads");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="mx-auto max-w-[1300px] space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-h2 font-extrabold tracking-tight text-slate-900">CRM reports</h1>
                    <p className="mt-1 text-ui text-slate-500">
                        Converted = the lead ended in a confirmed payment. Days follow {data?.period.timezone ?? "the business timezone"}.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {PRESETS.map(([d, l]) => (
                        <button key={d} type="button" onClick={() => preset(d)} className="rounded-full border border-slate-200 bg-surface px-3 py-1.5 text-small font-semibold text-slate-600 hover:border-action">
                            {l}
                        </button>
                    ))}
                    <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={cn(inputCls, "w-auto")} aria-label="From" />
                    <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={cn(inputCls, "w-auto")} aria-label="To" />
                    <select value={group} onChange={(e) => setGroup(e.target.value)} className={cn(inputCls, "w-auto")} aria-label="Group by">
                        <option value="day">By day</option>
                        <option value="week">By week</option>
                        <option value="month">By month</option>
                    </select>
                    <button
                        type="button"
                        onClick={exportCsv}
                        disabled={exporting}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-ui font-semibold text-slate-700 disabled:opacity-60"
                    >
                        {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} aria-hidden="true" />} Export leads (CSV)
                    </button>
                </div>
            </div>

            {!data ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-slate-500" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                        <Kpi label="New leads" value={data.totals.leads} />
                        <Kpi label="Conversion" value={`${data.totals.conversion_rate}%`} sub={`${data.totals.converted} paid`} />
                        <Kpi
                            label="Avg. time to first contact"
                            value={data.first_contact.avg_hours == null ? "—" : `${data.first_contact.avg_hours} h`}
                            sub={`${data.first_contact.within_1h_pct}% within 1 h`}
                        />
                        <Kpi label="Untouched new leads" value={data.ageing.untouched_new} tone={data.ageing.untouched_new ? "text-amber-600" : ""} />
                        <Kpi label="Unassigned" value={data.operations.unassigned} tone={data.operations.unassigned ? "text-amber-600" : ""} />
                        <Kpi label="Overdue follow-ups" value={data.operations.overdue_follow_ups} tone={data.operations.overdue_follow_ups ? "text-red-600" : ""} />
                    </div>

                    {data.money_visible && (
                        <Panel title="Revenue by ticket size (paid or Course Done, in this period)">
                            {data.ticket_revenue?.length ? (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {data.ticket_revenue.map((t) => (
                                        <Kpi
                                            key={t.currency}
                                            label={t.currency === "INR" ? "₹ INR" : "$ USD"}
                                            value={money({ [t.currency]: t.amount })}
                                            sub={`${t.leads} lead${t.leads === 1 ? "" : "s"} · ${t.paid_leads} paid · ${t.course_done_leads} Course Done`}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-ui text-slate-500">No lead with a ticket size was paid or reached Course Done in this period.</p>
                            )}
                            <p className="mt-2 text-small text-slate-500">
                                Counts each lead's ticket size once, on the day it was paid or reached Course Done (whichever came first).
                            </p>
                        </Panel>
                    )}

                    <Panel title={`Lead volume by ${data.period.group}`}>
                        <VolumeChart series={data.series} />
                    </Panel>

                    <div className="grid gap-5 lg:grid-cols-3">
                        <Panel title="By source">
                            <Breakdown rows={data.by_source} labelOf={(k) => SOURCE_LABEL[k] ?? k ?? "Unknown"} />
                        </Panel>
                        <Panel title="By campaign">
                            <Breakdown rows={data.by_campaign} labelOf={(k) => k ?? "No campaign"} />
                        </Panel>
                        <Panel title="By course">
                            <Breakdown rows={data.by_course} labelOf={(k) => k ?? "Not sure yet"} />
                        </Panel>
                    </div>

                    <Panel title="Leads by status (created in this period)">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
                            {data.by_status.map((s) => (
                                <div key={s.key} className="rounded-lg bg-slate-50 px-3 py-2">
                                    <p className="text-label font-semibold text-slate-500">{STAGE_LABEL[s.key]}</p>
                                    <p className="text-h3 font-extrabold text-slate-900">{s.leads}</p>
                                </div>
                            ))}
                        </div>
                    </Panel>

                    <Panel title="Consultants" className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-left text-ui">
                            <thead className="text-label uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="py-2 pr-3">Consultant</th>
                                    <th className="py-2 pr-3 text-right">Leads</th>
                                    <th className="py-2 pr-3 text-right">Contact attempts</th>
                                    <th className="py-2 pr-3 text-right">Follow-ups done / missed</th>
                                    <th className="py-2 pr-3 text-right">Overdue now</th>
                                    <th className="py-2 pr-3 text-right">Applications</th>
                                    {data.money_visible && <th className="py-2 pr-3 text-right">Ticket size</th>}
                                    <th className="py-2 pr-3 text-right">Converted</th>
                                    {data.money_visible && <th className="py-2 pr-3 text-right">Revenue</th>}
                                    {data.money_visible && <th className="py-2 pr-3 text-right">Ticket revenue</th>}
                                    <th className="py-2 text-right">1st contact</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {!data.consultants.length && (
                                    <tr>
                                        <td colSpan={12} className="py-6 text-center text-slate-500">No consultants yet.</td>
                                    </tr>
                                )}
                                {data.consultants.map((c) => (
                                    <tr key={c.id} className={cn(!c.active && "text-slate-500")}>
                                        <td className="py-2 pr-3 font-semibold">{c.name}{!c.active && " (inactive)"}</td>
                                        <td className="py-2 pr-3 text-right">{c.leads}</td>
                                        <td className="py-2 pr-3 text-right">{c.contact_attempts}</td>
                                        <td className="py-2 pr-3 text-right">{c.follow_ups_done} / {c.follow_ups_missed}</td>
                                        <td className={cn("py-2 pr-3 text-right", c.follow_ups_overdue > 0 && "font-semibold text-red-600")}>{c.follow_ups_overdue}</td>
                                        <td className="py-2 pr-3 text-right">{c.applications}</td>
                                        {data.money_visible && <td className="py-2 pr-3 text-right">{money(c.ticket_size)}</td>}
                                        <td className="py-2 pr-3 text-right">{c.conversions} <span className="text-slate-500">({c.conversion_rate}%)</span></td>
                                        {data.money_visible && <td className="py-2 pr-3 text-right">{money(c.revenue)}</td>}
                                        {data.money_visible && <td className="py-2 pr-3 text-right">{money(c.ticket_revenue)}</td>}
                                        <td className="py-2 text-right">{c.avg_first_contact_hours == null ? "—" : `${c.avg_first_contact_hours} h`}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Panel>

                    {data.exams && (
                        <Panel title="Exams" className="overflow-x-auto">
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                                <Kpi label="Scheduled now" value={data.exams.scheduled_now} sub={data.exams.scheduled_overdue ? `${data.exams.scheduled_overdue} past their date` : undefined} tone={data.exams.scheduled_overdue ? "text-amber-600" : ""} />
                                <Kpi label="Completed in period" value={data.exams.completed} />
                                <Kpi label="Passed" value={data.exams.passed} sub={data.exams.passed + data.exams.failed ? `${data.exams.pass_rate}% of known results` : undefined} />
                                <Kpi label="Exam done, payment due" value={data.exams.payment_alerts} tone={data.exams.payment_alerts ? "text-red-600" : ""} />
                                <Kpi label="Payments done in period" value={data.exams.payments_done} />
                                <Kpi label="Applications submitted" value={data.exams.applications_submitted} sub={`${data.exams.applications_not_submitted} not yet`} />
                                <Kpi label="Applications without coordinator" value={data.exams.applications_without_coordinator} tone={data.exams.applications_without_coordinator ? "text-amber-600" : ""} />
                                {data.money_visible && (
                                    <Kpi label="Open applications" value={money(Object.fromEntries((data.pipeline ?? []).map((x) => [x.currency, x.amount])))} sub={`${(data.pipeline ?? []).reduce((n, x) => n + x.leads, 0)} with a ticket size`} />
                                )}
                            </div>
                            <table className="mt-4 w-full min-w-[640px] text-left text-ui">
                                <thead className="text-label uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="py-2 pr-3">Exam coordinator</th>
                                        <th className="py-2 pr-3 text-right">Students</th>
                                        <th className="py-2 pr-3 text-right">Applications</th>
                                        <th className="py-2 pr-3 text-right">Scheduled now</th>
                                        <th className="py-2 pr-3 text-right">Completed in period</th>
                                        <th className="py-2 pr-3 text-right">Passed</th>
                                        <th className="py-2 pr-3 text-right">Payment due after exam</th>
                                        <th className="py-2 text-right">Course Done</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {!data.exams.coordinators.length && (
                                        <tr>
                                            <td colSpan={8} className="py-6 text-center text-slate-500">No exam coordinators yet. Add one in Admin → Team.</td>
                                        </tr>
                                    )}
                                    {data.exams.coordinators.map((c) => (
                                        <tr key={c.id} className={cn(!c.active && "text-slate-500")}>
                                            <td className="py-2 pr-3 font-semibold">{c.name}{!c.active && " (inactive)"}</td>
                                            <td className="py-2 pr-3 text-right">{c.assigned}</td>
                                            <td className="py-2 pr-3 text-right">{c.applications}</td>
                                            <td className="py-2 pr-3 text-right">{c.scheduled}</td>
                                            <td className="py-2 pr-3 text-right">{c.completed}</td>
                                            <td className="py-2 pr-3 text-right">{c.passed}</td>
                                            <td className={cn("py-2 pr-3 text-right", c.payment_alerts > 0 && "font-semibold text-red-600")}>{c.payment_alerts}</td>
                                            <td className="py-2 text-right">{c.course_done}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Panel>
                    )}

                    <div className="grid gap-5 lg:grid-cols-2">
                        <Panel title="Open leads by age">
                            {(() => {
                                const max = Math.max(...data.ageing.buckets.map((b) => b.count), 1);
                                return (
                                    <ul className="space-y-2 text-ui">
                                        {data.ageing.buckets.map((b, i) => (
                                            <li key={b.label} className="grid grid-cols-[96px_1fr_40px] items-center gap-3">
                                                <span className="text-slate-600">{b.label}</span>
                                                <div className="h-2.5 rounded-full bg-slate-100">
                                                    <div className={cn("h-2.5 rounded-full", i >= 4 ? "bg-amber-500" : "bg-action")} style={{ width: `${(b.count / max) * 100}%` }} />
                                                </div>
                                                <span className="text-right font-semibold text-slate-900">{b.count}</span>
                                            </li>
                                        ))}
                                    </ul>
                                );
                            })()}
                            <p className="mt-3 text-small text-slate-500">
                                First contact: {data.first_contact.within_1h_pct}% within 1 hour, {data.first_contact.within_24h_pct}% within 24 hours ({data.first_contact.contacted} contacted).
                            </p>
                        </Panel>
                        <Panel title="Students and operations">
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-ui">
                                <dt className="text-slate-500">Enrollments</dt>
                                <dd className="text-right font-semibold">{data.lms.enrollments}</dd>
                                <dt className="text-slate-500">Free course assignments</dt>
                                <dd className="text-right font-semibold">{data.lms.assignments} <span className="font-normal text-slate-500">({data.lms.assignments_from_leads} from leads)</span></dd>
                                <dt className="text-slate-500">Certificates issued</dt>
                                <dd className="text-right font-semibold">{data.lms.certificates} {data.lms.certificate_overrides > 0 && <span className="font-normal text-amber-700">({data.lms.certificate_overrides} override)</span>}</dd>
                                <dt className="text-slate-500">Leads → Course Done</dt>
                                <dd className="text-right font-semibold">{data.lms.course_done}</dd>
                                <dt className="text-slate-500">Discount links paid</dt>
                                <dd className="text-right font-semibold">{data.discount_links.redeemed} / {data.discount_links.generated} <span className="font-normal text-slate-500">({data.discount_links.redemption_rate}%)</span></dd>
                                {data.money_visible && (
                                    <>
                                        <dt className="text-slate-500">Revenue from discount links</dt>
                                        <dd className="text-right font-semibold">{money(data.discount_links.revenue)}</dd>
                                    </>
                                )}
                                <dt className="text-slate-500">Transfers</dt>
                                <dd className="text-right font-semibold">{data.operations.transfers}</dd>
                                <dt className="text-slate-500">Round Robin balance</dt>
                                <dd className="text-right font-semibold">
                                    {data.operations.round_robin_balance.min}–{data.operations.round_robin_balance.max}{" "}
                                    <span className="font-normal text-slate-500">leads per consultant</span>
                                </dd>
                            </dl>
                        </Panel>
                    </div>
                </>
            )}
        </div>
    );
}

const TABS = [
    ["team", "Team board", LayoutDashboard, TeamBoard],
    ["calls", "Call report", PhoneCall, CallReport],
    ["follow-ups", "Assigned vs follow-up", ListChecks, FollowUpReport],
    ["overview", "Overview", BarChart3, OverviewReport],
];

/** Admin → CRM Reports: team board, calls, assigned vs follow-up, and the overview. */
export default function CrmReportsPage() {
    const [params, setParams] = useSearchParams();
    const tab = TABS.find(([k]) => k === params.get("tab")) ?? TABS[0];
    const Body = tab[3];
    return (
        <div className="mx-auto max-w-[1400px] space-y-5">
            <nav className="flex flex-wrap gap-1 border-b border-slate-200" aria-label="Reports">
                {TABS.map(([k, label, Icon]) => (
                    <button
                        key={k}
                        type="button"
                        onClick={() => setParams({ tab: k }, { replace: true })}
                        aria-current={tab[0] === k ? "page" : undefined}
                        className={cn(
                            "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-ui font-semibold",
                            tab[0] === k ? "border-action text-action" : "border-transparent text-slate-500 hover:text-slate-800"
                        )}
                    >
                        <Icon size={15} aria-hidden="true" /> {label}
                    </button>
                ))}
            </nav>
            <Body />
        </div>
    );
}
