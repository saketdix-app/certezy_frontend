import { useState } from "react";

import crmService from "@/services/crmService";
import { cn } from "@/lib/utils";
import { inputCls } from "@/lib/crm";
import { ExportButton, Kpi, ReportFilters, ReportTable } from "./reportShared";
import { defaultFilters, downloadCsv, fmtDur, fmtTime, useReport } from "./reportUtils";

const CALL_TYPES = [
    ["", "All calls"],
    ["outgoing", "Outgoing"],
    ["incoming", "Incoming"],
    ["missed", "Missed / declined"],
    ["unanswered", "Not answered (outgoing)"],
    ["connected", "Connected"],
    ["logged", "Logged by hand"],
];
const DURATIONS = [
    ["", "Any duration"],
    ["30", "30 sec or more"],
    ["60", "1 min or more"],
    ["120", "2 min or more"],
    ["300", "5 min or more"],
];

const person = { key: "name", label: "Employee", align: "left", noTotal: true, text: (r) => (r.name ? <span><span className="font-semibold text-slate-800">{r.name}</span>{r.mobile ? <span className="block text-small text-slate-500">{r.mobile}</span> : null}</span> : ""), csv: (r) => `${r.name ?? ""}${r.mobile ? ` (${r.mobile})` : ""}` };

const CALL_COLUMNS = [
    { key: "_sr", label: "Sr." },
    person,
    { key: "total", label: "Total calls", heat: "good" },
    { key: "duration", label: "Total duration", text: (r) => fmtDur(r.duration) },
    { key: "outgoing", label: "Outgoing" },
    { key: "incoming", label: "Incoming" },
    { key: "missed", label: "Missed", hint: "Calls from a lead that rang out or were declined.", heat: "bad", tone: (r) => (r.missed ? "text-red-700 font-semibold" : "") },
    { key: "unanswered", label: "Not answered", hint: "Outgoing calls the lead didn't pick up." },
    { key: "connected", label: "Connected", hint: "Incoming or outgoing calls that lasted more than 0 seconds.", heat: "good" },
    { key: "connected_duration", label: "Conn. duration", text: (r) => fmtDur(r.connected_duration), heat: "good" },
    { key: "avg_connected", label: "Avg. conn. call", hint: "Connected duration ÷ connected calls.", text: (r) => fmtDur(r.avg_connected) },
    { key: "long_calls", label: "2 min+ calls", hint: "Connected calls of 2 minutes or more (real discussions).", heat: "good", tone: () => "font-semibold" },
    { key: "unique_leads", label: "Unique leads", hint: "Different leads called or who called." },
    { key: "unique_connected", label: "Unique conn.", hint: "Different leads actually spoken to.", heat: "good" },
    { key: "working", label: "Working hours", hint: "First to last call of each day, added up.", text: (r) => fmtDur(r.working) },
    { key: "idle", label: "Idle hours", hint: "Working hours minus time on calls.", text: (r) => fmtDur(r.idle) },
    { key: "first_at", label: "First call", noTotal: true, text: (r) => fmtTime(r.first_at), sortValue: (r) => r.first_at ?? "" },
    { key: "last_at", label: "Last call", noTotal: true, text: (r) => fmtTime(r.last_at), sortValue: (r) => r.last_at ?? "" },
];

/** CRM → Reports → Calls: per-person call log summary (Team app call log + calls logged by hand). */
export default function CallReport() {
    const [f, setF] = useState(defaultFilters("today"));
    const [callType, setCallType] = useState("");
    const [minDuration, setMinDuration] = useState("");
    const { data, loading } = useReport(crmService.reportCalls, { ...f, call_type: callType, min_duration: minDuration });
    const rows = data?.rows ?? [];
    const t = data?.totals;

    return (
        <div className="space-y-4">
            <ReportFilters value={f} onChange={setF}>
                <select value={callType} onChange={(e) => setCallType(e.target.value)} className={cn(inputCls, "w-auto py-1.5")} aria-label="Call type">
                    {CALL_TYPES.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                    ))}
                </select>
                <select value={minDuration} onChange={(e) => setMinDuration(e.target.value)} className={cn(inputCls, "w-auto py-1.5")} aria-label="Duration">
                    {DURATIONS.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                    ))}
                </select>
                <ExportButton disabled={!rows.length} onClick={() => downloadCsv(`call-report-${f.from}-to-${f.to}.csv`, CALL_COLUMNS, rows, t)} />
            </ReportFilters>

            {t && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <Kpi label="Total calls" value={t.total} sub={fmtDur(t.duration)} />
                    <Kpi label="Connected" value={t.connected} sub={`${t.total ? Math.round((t.connected / t.total) * 100) : 0}% of calls`} />
                    <Kpi label="2 min+ discussions" value={t.long_calls} tone="text-emerald-700" />
                    <Kpi label="Missed" value={t.missed} tone={t.missed ? "text-red-600" : undefined} />
                    <Kpi label="Talk time" value={fmtDur(t.connected_duration)} sub={`Avg ${fmtDur(t.avg_connected)}`} />
                    <Kpi label="Unique leads" value={t.unique_leads} sub={`${t.unique_connected} spoken to`} />
                </div>
            )}

            <ReportTable columns={CALL_COLUMNS} rows={rows} totals={t} loading={loading} empty="No calls with leads in this period." />
            <p className="text-small text-slate-500">
                Calls come from the CERTEZY Team app (only calls with a lead's number are read) and calls logged by hand on a lead. Times are IST.
            </p>
        </div>
    );
}
