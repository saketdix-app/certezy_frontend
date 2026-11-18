import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import LeadDetailPanel from "./LeadDetailPanel";
import { FollowUpList } from "./FollowUpsBoard";
import { apiMessage } from "@/lib/crm";

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

/** Today's workload at a glance (PRD §4.1 KPI row + tasks). */
export default function CrmOverview({ name, leadsPath }) {
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

    return (
        <div>
            <h1 className="text-h2 font-extrabold tracking-tight text-slate-900">Hi {name?.split(" ")[0]}, here's today</h1>
            <p className="mt-1 mb-5 text-ui text-slate-500">Your pipeline and the follow-ups due today.</p>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {KPIS.map(([k, label, tone]) => (
                    <div key={k} className="rounded-xl border border-slate-200 bg-surface px-4 py-3">
                        <p className="text-small font-semibold text-slate-500">{label}</p>
                        <p className={cn("mt-1 text-h2 font-extrabold text-slate-900", data.kpis[k] > 0 && tone)}>{data.kpis[k]}</p>
                    </div>
                ))}
            </div>

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

            <p className="mt-5 text-ui text-slate-500">
                Sales and revenue tracking is coming in a later update.{" "}
                <Link to={leadsPath} className="font-semibold text-action">
                    Go to my leads →
                </Link>
            </p>
            {openId && <LeadDetailPanel leadId={openId} onClose={() => setOpenId(null)} onChanged={load} />}
        </div>
    );
}
