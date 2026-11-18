import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { CalendarCheck2, Loader2 } from "lucide-react";
import { useSelector } from "react-redux";
import { selectUser } from "@/features/auth/authSlice";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import LeadDetailPanel from "./LeadDetailPanel";
import { FollowUpList } from "./FollowUpsBoard";
import { apiMessage, fmtDateTime, fmtMoney } from "@/lib/crm";

const KPIS = [
    ["open_leads", "Open leads"],
    ["new_leads", "New leads"],
    ["follow_ups_today", "Follow-ups today"],
    ["overdue_follow_ups", "Overdue follow-ups", "text-red-600"],
    ["in_conversation", "In conversation"],
    ["applications", "Applications"],
    ["enrolled_students", "Enrolled students"],
    ["course_done", "Course done"],
];

const EXAM_KPIS = [
    ["scheduled", "Exams scheduled"],
    ["next_7_days", "Exams in the next 7 days"],
    ["completed_this_month", "Exams completed this month"],
    ["awaiting_course_done", "Awaiting Course Done", "text-amber-700"],
];

function Kpi({ label, value, tone }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-surface px-4 py-3">
            <p className="text-small font-semibold text-slate-500">{label}</p>
            <p className={cn("mt-1 text-h2 font-extrabold text-slate-900", value > 0 && tone)}>{value}</p>
        </div>
    );
}

/** Scheduled exams, soonest first. */
function UpcomingExams({ items, onOpen, showOwner }) {
    if (!items?.length) return <p className="py-6 text-center text-ui text-slate-500">No exams scheduled.</p>;
    return (
        <ul className="divide-y divide-slate-100">
            {items.map((x) => (
                <li key={x.id}>
                    <button type="button" onClick={() => onOpen(x.id)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-slate-50">
                        <span className="min-w-0">
                            <span className="block truncate text-ui font-semibold text-slate-900">{x.name}</span>
                            <span className="block truncate text-small text-slate-500">
                                {[x.course_title, showOwner ? x.owner_name && `Consultant: ${x.owner_name}` : x.exam_coordinator_name && `Coordinator: ${x.exam_coordinator_name}`]
                                    .filter(Boolean)
                                    .join(" · ") || "—"}
                            </span>
                        </span>
                        <span className="shrink-0 text-small font-semibold text-slate-700">{x.exam_scheduled_at ? fmtDateTime(x.exam_scheduled_at) : "Date not set"}</span>
                    </button>
                </li>
            ))}
        </ul>
    );
}

/** Today's workload at a glance (PRD §4.1 KPI row + tasks). */
export default function CrmOverview({ name, leadsPath }) {
    const isCoordinator = useSelector(selectUser)?.role === "exam_coordinator";
    const [data, setData] = useState(null);
    const [openId, setOpenId] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(
        () =>
            crmService
                .dashboard()
                .then(({ data: res }) => setData(res.data))
                .catch((err) => toast.error(apiMessage(err, "Could not load your dashboard"))),
        []
    );
    useEffect(() => {
        load();
    }, [load]);

    const complete = async (id, status) => {
        setBusyId(id);
        try {
            await crmService.completeFollowUp(id, status);
            load();
        } catch (err) {
            toast.error(apiMessage(err, "Could not update the follow-up"));
        } finally {
            setBusyId(null);
        }
    };

    if (!data) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-slate-500" />
            </div>
        );
    }

    const exams = data.exams ?? {};
    const panel = openId && <LeadDetailPanel leadId={openId} onClose={() => setOpenId(null)} onChanged={load} />;

    // Exam Coordinators: their exams only
    if (isCoordinator) {
        return (
            <div>
                <h1 className="text-h2 font-extrabold tracking-tight text-slate-900">Hi {name?.split(" ")[0]}, here are your exams</h1>
                <p className="mt-1 mb-5 text-ui text-slate-500">Students assigned to you for the exam.</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {EXAM_KPIS.map(([k, label, tone]) => (
                        <Kpi key={k} label={label} value={exams[k] ?? 0} tone={tone} />
                    ))}
                </div>
                <section className="mt-6 rounded-xl border border-slate-200 bg-surface px-4 pt-3">
                    <h2 className="flex items-center gap-2 text-body font-bold text-slate-900">
                        <CalendarCheck2 size={17} aria-hidden="true" /> Upcoming exams
                    </h2>
                    <UpcomingExams items={exams.upcoming} onOpen={setOpenId} showOwner />
                </section>
                <p className="mt-5 text-ui text-slate-500">
                    {exams.completed ?? 0} exams completed in total, {exams.passed ?? 0} passed.{" "}
                    <Link to={leadsPath} className="font-semibold text-action">
                        Go to my exam students →
                    </Link>
                </p>
                {panel}
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-h2 font-extrabold tracking-tight text-slate-900">Hi {name?.split(" ")[0]}, here's today</h1>
            <p className="mt-1 mb-5 text-ui text-slate-500">Your pipeline and the follow-ups due today.</p>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {KPIS.map(([k, label, tone]) => (
                    <Kpi key={k} label={label} value={data.kpis[k]} tone={tone} />
                ))}
            </div>

            {/* Exams + open application value */}
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                {EXAM_KPIS.map(([k, label, tone]) => (
                    <Kpi key={k} label={label} value={exams[k] ?? 0} tone={tone} />
                ))}
            </div>
            {data.pipeline?.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-slate-200 bg-surface px-4 py-3 text-ui">
                    <span className="font-semibold text-slate-500">Open applications (ticket size)</span>
                    {data.pipeline.map((p) => (
                        <span key={p.currency} className="text-slate-900">
                            <b className="text-body font-extrabold">{fmtMoney(p.amount, p.currency)}</b>{" "}
                            <span className="text-small text-slate-500">
                                from {p.leads} lead{p.leads === 1 ? "" : "s"}
                            </span>
                        </span>
                    ))}
                </div>
            )}

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
                <section className="rounded-xl border border-slate-200 bg-surface px-4 pt-3">
                    <h2 className="text-body font-bold text-slate-900">Due today</h2>
                    <FollowUpList items={data.today} onOpen={setOpenId} onDone={complete} busyId={busyId} />
                </section>
                <section className="rounded-xl border border-slate-200 bg-surface px-4 pt-3">
                    <h2 className="text-body font-bold text-slate-900">Overdue</h2>
                    <FollowUpList items={data.overdue} onOpen={setOpenId} onDone={complete} busyId={busyId} />
                </section>
            </div>

            {exams.upcoming?.length > 0 && (
                <section className="mt-5 rounded-xl border border-slate-200 bg-surface px-4 pt-3">
                    <h2 className="flex items-center gap-2 text-body font-bold text-slate-900">
                        <CalendarCheck2 size={17} aria-hidden="true" /> Upcoming exams
                    </h2>
                    <UpcomingExams items={exams.upcoming} onOpen={setOpenId} />
                </section>
            )}

            <p className="mt-5 text-ui text-slate-500">
                <Link to={leadsPath} className="font-semibold text-action">
                    Go to my leads →
                </Link>
            </p>
            {panel}
        </div>
    );
}
