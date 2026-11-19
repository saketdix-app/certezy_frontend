import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck2 } from "lucide-react";

import crmService from "@/services/crmService";
import { fmtDateTime, fmtMoney } from "@/lib/crm";
import { cn } from "@/lib/utils";

/**
 * Admin dashboard: exams and open application value across the team
 * (from the CRM dashboard, which gives Admins every lead).
 */
export default function ExamPipelineCard() {
    const [data, setData] = useState(null);
    useEffect(() => {
        crmService
            .dashboard()
            .then(({ data: res }) => setData(res.data))
            .catch(() => setData(false));
    }, []);
    if (!data) return null;

    const exams = data.exams ?? {};
    const stats = [
        ["Exams scheduled", exams.scheduled],
        ["In the next 7 days", exams.next_7_days],
        ["Exams done this month", exams.completed_this_month],
        ["Exam done, payment due", exams.payment_alerts, "text-red-600"],
    ];

    return (
        <section className="rounded-xl border border-slate-200 bg-surface p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-body font-bold text-slate-900">
                    <CalendarCheck2 size={18} aria-hidden="true" /> Exams and applications
                </h2>
                <Link
                    to="/admin/crm-reports"
                    className="text-small font-semibold text-action hover:underline"
                >
                    Full report →
                </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {stats.map(([label, value, tone]) => (
                    <div key={label} className="rounded-lg bg-slate-50 px-3 py-2.5">
                        <p className="text-small font-semibold text-slate-500">{label}</p>
                        <p className={cn("text-h3 font-extrabold text-slate-900", value > 0 && tone)}>
                            {value ?? 0}
                        </p>
                    </div>
                ))}
            </div>
            <div className={cn("mt-4 grid gap-4", data.money_visible ? "md:grid-cols-3" : "md:grid-cols-1")}>
                {data.money_visible && (
                    <div>
                        <p className="mb-1.5 text-small font-semibold text-slate-500">
                            Revenue by ticket size (paid or Course Done)
                        </p>
                        {data.ticket_revenue?.length ? (
                            <ul className="space-y-1 text-ui">
                                {data.ticket_revenue.map((t) => (
                                    <li key={t.currency}>
                                        <b className="text-body font-extrabold text-slate-900">
                                            {fmtMoney(t.amount, t.currency)}
                                        </b>{" "}
                                        <span className="text-small text-slate-500">
                                            {fmtMoney(t.this_month, t.currency)} this month · {t.leads} lead
                                            {t.leads === 1 ? "" : "s"}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-ui text-slate-500">Nothing yet.</p>
                        )}
                    </div>
                )}
                {data.money_visible && (
                    <div>
                        <p className="mb-1.5 text-small font-semibold text-slate-500">
                            Open applications (ticket size)
                        </p>
                        {data.pipeline?.length ? (
                            <ul className="space-y-1 text-ui">
                                {data.pipeline.map((p) => (
                                    <li key={p.currency}>
                                        <b className="text-body font-extrabold text-slate-900">
                                            {fmtMoney(p.amount, p.currency)}
                                        </b>{" "}
                                        <span className="text-small text-slate-500">
                                            from {p.leads} lead{p.leads === 1 ? "" : "s"}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-ui text-slate-500">No ticket sizes recorded yet.</p>
                        )}
                    </div>
                )}
                <div>
                    <p className="mb-1.5 text-small font-semibold text-slate-500">Next exams</p>
                    {exams.upcoming?.length ? (
                        <ul className="space-y-1 text-ui">
                            {exams.upcoming.slice(0, 4).map((x) => (
                                <li key={x.id} className="flex justify-between gap-3">
                                    <Link
                                        to={`/admin/leads?lead=${x.id}`}
                                        className="truncate font-semibold text-slate-900 hover:text-action"
                                    >
                                        {x.name}
                                    </Link>
                                    <span className="shrink-0 text-small text-slate-500">
                                        {x.exam_scheduled_at
                                            ? fmtDateTime(x.exam_scheduled_at)
                                            : "Date not set"}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-ui text-slate-500">No exams scheduled.</p>
                    )}
                </div>
            </div>
        </section>
    );
}
