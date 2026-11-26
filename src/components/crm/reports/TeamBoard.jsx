import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Trophy } from "lucide-react";

import crmService from "@/services/crmService";
import { ExportButton, Kpi, ReportFilters, ReportTable } from "./reportShared";
import { defaultFilters, downloadCsv, fmtDay, fmtDur, useReport } from "./reportUtils";

const person = { key: "name", label: "Consultant", align: "left", noTotal: true, text: (r) => (r.name ? <span className="font-semibold text-slate-800">{r.name}</span> : ""), csv: (r) => r.name ?? "" };

const COLUMNS = [
    { key: "_sr", label: "#" },
    person,
    { key: "leads", label: "Leads received", heat: true },
    { key: "first_contacts", label: "First contacts", hint: "Leads contacted for the first time in this period.", heat: true },
    { key: "calls", label: "Calls", heat: true },
    { key: "connected", label: "Connected", heat: true },
    { key: "long_calls", label: "2 min+ calls", heat: true },
    { key: "talk", label: "Talk time", text: (r) => fmtDur(r.talk), heat: true },
    { key: "fu_done", label: "Follow-ups done", heat: true },
    { key: "fu_missed", label: "Follow-ups missed", tone: (r) => (r.fu_missed ? "text-red-600 font-semibold" : "") },
    { key: "applications", label: "Applications", hint: "Applications submitted in this period.", heat: true },
    { key: "exams_scheduled", label: "Exams scheduled", hint: "Exams scheduled to take place in this period.", heat: true },
    { key: "exams_done", label: "Exams done", heat: true },
    { key: "exams_passed", label: "Passed", heat: true },
    { key: "payments", label: "Payments done", heat: true },
    { key: "closed_lost", label: "Not interested / junk", hint: "Leads closed as Not Interested or Junk in this period." },
    { key: "open_now", label: "Open now", hint: "Right now: their leads not closed or done." },
];

const LEADERS = [
    ["first_contacts", "Most leads contacted"],
    ["long_calls", "Most 2 min+ calls"],
    ["exams_done", "Most exams done"],
    ["payments", "Most payments"],
];

/** Leads per day (bars) with connected calls (line). */
function Trend({ series }) {
    if (!series?.length) return null;
    const max = Math.max(1, ...series.map((s) => Math.max(s.leads, s.connected)));
    const W = 100 / series.length;
    const line = series.map((s, i) => `${i * W + W / 2},${100 - (s.connected / max) * 92}`).join(" ");
    return (
        <section className="rounded-xl border border-slate-200 bg-surface p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-body font-bold text-slate-900">Day by day</h3>
                <p className="flex gap-4 text-small text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-100" /> Leads received</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-action" /> Connected calls</span>
                </p>
            </div>
            <div className="relative h-40" role="img" aria-label={series.map((s) => `${s.day}: ${s.leads} leads, ${s.connected} connected calls`).join("; ")}>
                <div className="absolute inset-0 flex items-end gap-[3px]">
                    {series.map((s) => (
                        <div key={s.day} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
                            <div className="w-full rounded-t bg-brand-100" style={{ height: `${(s.leads / max) * 92}%` }} />
                            <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-label text-white group-hover:block">
                                {fmtDay(s.day)}: {s.leads} leads, {s.connected} connected
                            </span>
                        </div>
                    ))}
                </div>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                    <polyline points={line} fill="none" stroke="var(--color-action)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                </svg>
            </div>
            <div className="mt-1 flex justify-between text-label text-slate-500">
                <span>{fmtDay(series[0].day)}</span>
                <span>{fmtDay(series[series.length - 1].day)}</span>
            </div>
        </section>
    );
}

/** CRM → Reports → Team board: everyone's numbers on one screen, for the daily meeting. */
export default function TeamBoard() {
    const [f, setF] = useState(defaultFilters("week"));
    const { data, loading } = useReport(crmService.reportTeam, f);
    const rows = data?.rows ?? [];
    const t = data?.totals;
    const box = useRef(null);
    const [full, setFull] = useState(false);
    useEffect(() => {
        const on = () => setFull(document.fullscreenElement === box.current);
        document.addEventListener("fullscreenchange", on);
        return () => document.removeEventListener("fullscreenchange", on);
    }, []);
    const present = () => (document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen?.());

    return (
        <div ref={box} className={full ? "h-full space-y-4 overflow-auto bg-slate-50 p-6" : "space-y-4"}>
            {full ? (
                <div className="flex items-center justify-between">
                    <h2 className="text-h2 font-extrabold text-slate-900">
                        Team board · {data ? (data.period.from === data.period.to ? fmtDay(data.period.from) : `${fmtDay(data.period.from)} – ${fmtDay(data.period.to)}`) : ""}
                    </h2>
                    <button type="button" onClick={present} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 py-1.5 text-small font-semibold text-slate-700">
                        <Minimize2 size={14} aria-hidden="true" /> Exit
                    </button>
                </div>
            ) : (
                <ReportFilters value={f} onChange={setF}>
                    <button type="button" onClick={present} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-action px-3 py-1.5 text-small font-semibold text-white hover:bg-action-hover">
                        <Maximize2 size={14} aria-hidden="true" /> Present
                    </button>
                    <ExportButton disabled={!rows.length} onClick={() => downloadCsv(`team-board-${f.from}-to-${f.to}.csv`, COLUMNS, rows, t)} />
                </ReportFilters>
            )}

            {t && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                    <Kpi label="Leads received" value={t.leads} />
                    <Kpi label="First contacts" value={t.first_contacts} />
                    <Kpi label="Connected calls" value={t.connected} sub={`${t.calls} calls`} />
                    <Kpi label="Talk time" value={fmtDur(t.talk)} />
                    <Kpi label="Follow-ups done" value={t.fu_done} sub={t.fu_missed ? `${t.fu_missed} missed` : undefined} />
                    <Kpi label="Applications" value={t.applications} />
                    <Kpi label="Exams done" value={t.exams_done} sub={`${t.exams_passed} passed · ${t.exams_scheduled} scheduled`} tone="text-emerald-700" />
                    <Kpi label="Payments done" value={t.payments} tone="text-emerald-700" />
                </div>
            )}

            {rows.length > 1 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {LEADERS.map(([k, label]) => {
                        const top = [...rows].sort((a, b) => b[k] - a[k])[0];
                        return (
                            <div key={k} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-surface px-4 py-3">
                                <Trophy size={22} className={top?.[k] ? "text-amber-500" : "text-slate-300"} aria-hidden="true" />
                                <div className="min-w-0">
                                    <p className="text-small font-semibold text-slate-500">{label}</p>
                                    <p className="truncate font-bold text-slate-900">{top?.[k] ? `${top.name} · ${top[k]}` : "—"}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ReportTable columns={COLUMNS} rows={rows} totals={t} loading={loading} initialSort={{ key: "first_contacts", dir: "desc" }} />
            <Trend series={data?.series} />
        </div>
    );
}
