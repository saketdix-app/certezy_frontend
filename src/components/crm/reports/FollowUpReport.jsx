import { useState } from "react";

import crmService from "@/services/crmService";
import { ExportButton, Kpi, ReportFilters, ReportTable } from "./reportShared";
import { defaultFilters, downloadCsv, fmtMin, useReport } from "./reportUtils";

const person = { key: "name", label: "Consultant", align: "left", noTotal: true, text: (r) => (r.name ? <span className="font-semibold text-slate-800">{r.name}</span> : ""), csv: (r) => r.name ?? "" };
const bad = (k) => (r) => (r[k] ? "text-red-600 font-semibold" : "");

const COLUMNS = [
    { key: "_sr", label: "Sr." },
    person,
    { key: "assigned", label: "Assigned", hint: "Leads assigned to them in this period.", heat: true },
    { key: "contacted", label: "Contacted", hint: "Assigned leads with a call, WhatsApp, email or done follow-up since they were assigned." },
    { key: "contacted_pct", label: "Contacted %", text: (r) => `${r.contacted_pct}%`, tone: (r) => (r.assigned && r.contacted_pct < 50 ? "text-red-600 font-semibold" : "text-emerald-700 font-semibold") },
    { key: "connected", label: "Spoke to", hint: "Assigned leads with a connected call (call log)." },
    { key: "not_contacted", label: "Not contacted", tone: bad("not_contacted") },
    { key: "not_opened", label: "Not opened", hint: "Still has the red dot: the consultant hasn't opened the lead.", tone: bad("not_opened") },
    { key: "first_contact_min", label: "Avg. first contact", hint: "Time from assignment to first contact.", noTotal: true, text: (r) => fmtMin(r.first_contact_min), sortValue: (r) => r.first_contact_min ?? 1e9 },
    { key: "fu_due", label: "Follow-ups due", hint: "Follow-ups scheduled for this period.", heat: true },
    { key: "fu_done", label: "Done", tone: () => "text-emerald-700 font-semibold" },
    { key: "fu_on_time", label: "On time", hint: "Done within an hour of the due time." },
    { key: "fu_missed", label: "Missed", hint: "Marked missed, or still pending after the due time.", tone: bad("fu_missed") },
    { key: "fu_upcoming", label: "Upcoming" },
    { key: "fu_done_pct", label: "Done %", hint: "Done ÷ follow-ups that were due (not counting upcoming or cancelled).", text: (r) => `${r.fu_done_pct}%` },
    { key: "calls", label: "Calls logged" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "emails", label: "Emails" },
    { key: "notes", label: "Notes" },
    { key: "leads_worked", label: "Leads worked", hint: "Different leads they called / messaged in the period." },
    { key: "open_now", label: "Open now", hint: "Right now: their leads not closed or done." },
    { key: "quiet_7d", label: "Quiet 7d+", hint: "Right now: open leads with no call, WhatsApp or email in the last 7 days.", tone: bad("quiet_7d") },
    { key: "overdue_now", label: "Overdue now", hint: "Right now: leads whose next follow-up is past due.", tone: bad("overdue_now") },
];

/** CRM → Reports → Assigned vs follow-up: what each consultant did with the leads they got. */
export default function FollowUpReport() {
    const [f, setF] = useState(defaultFilters("week"));
    const { data, loading } = useReport(crmService.reportFollowUps, f);
    const rows = data?.rows ?? [];
    const t = data?.totals;
    return (
        <div className="space-y-4">
            <ReportFilters value={f} onChange={setF}>
                <ExportButton disabled={!rows.length} onClick={() => downloadCsv(`assigned-vs-follow-up-${f.from}-to-${f.to}.csv`, COLUMNS, rows, t)} />
            </ReportFilters>
            {t && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <Kpi label="Leads assigned" value={t.assigned} />
                    <Kpi label="Contacted" value={`${t.contacted_pct}%`} sub={`${t.contacted} of ${t.assigned}`} tone={t.assigned && t.contacted_pct < 50 ? "text-red-600" : "text-emerald-700"} />
                    <Kpi label="Not contacted yet" value={t.not_contacted} tone={t.not_contacted ? "text-red-600" : undefined} />
                    <Kpi label="Follow-ups done" value={`${t.fu_done} / ${t.fu_due}`} sub={`${t.fu_done_pct}% done`} />
                    <Kpi label="Follow-ups missed" value={t.fu_missed} tone={t.fu_missed ? "text-red-600" : undefined} />
                    <Kpi label="Quiet 7+ days (now)" value={t.quiet_7d} sub={`of ${t.open_now} open leads`} />
                </div>
            )}
            <ReportTable columns={COLUMNS} rows={rows} totals={t} loading={loading} />
        </div>
    );
}
